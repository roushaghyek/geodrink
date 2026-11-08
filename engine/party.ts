import type { CityWeather } from './weather/client';
import { gameTemperature } from './weather/types';
import { CAP_OPTIONS, DEFAULT_PENALTY_SETTINGS, DEGREES_PER_POINT_OPTIONS, PenaltySettings, rankByError, RankedEntry } from './penalty';
import { evaluateGuess, TempUnit } from './scoring';

/**
 * Pass-the-phone Party. Each round: one city, every player guesses privately
 * (a hand-off screen hides earlier guesses), then a reveal ranks everyone by
 * degrees off and the furthest takes the penalty.
 *
 * Pure reducer so the whole flow is testable without a screen.
 */

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 12;
export const ROUND_OPTIONS = [3, 5, 10] as const;
export const DEFAULT_ROUNDS = 5;
export const MAX_NAME_LENGTH = 20;

export interface PartyConfig {
  players: string[];
  rounds: number;
  unit: TempUnit;
  penalty: PenaltySettings;
}

export interface PartyRound {
  city: CityWeather;
  actualC: number;
  /** guess in the party's unit, by player index */
  guesses: number[];
  ranked: RankedEntry[];
  /** Forfeit card drawn for this round (forfeits mode). */
  forfeit?: string;
}

export type PartyPhase = 'loading' | 'handoff' | 'guess' | 'reveal' | 'final' | 'error';

export interface PartyState {
  config: PartyConfig;
  phase: PartyPhase;
  /** 0-based round index. */
  round: number;
  /** Position in this round's turn order. */
  turn: number;
  city: CityWeather | null;
  guesses: (number | null)[];
  history: PartyRound[];
}

export type PartyAction =
  | { type: 'cityReady'; city: CityWeather }
  | { type: 'cityFailed' }
  | { type: 'retry' }
  | { type: 'startTurn' }
  | { type: 'submitGuess'; guess: number; forfeit?: string }
  | { type: 'nextRound' };

/** Rotate who goes first each round so nobody always guesses first. */
export function turnOrder(round: number, playerCount: number): number[] {
  return Array.from({ length: playerCount }, (_, i) => (round + i) % playerCount);
}

export function currentPlayer(state: PartyState): number {
  return turnOrder(state.round, state.config.players.length)[state.turn];
}

export function createPartyState(config: PartyConfig): PartyState {
  return {
    config,
    phase: 'loading',
    round: 0,
    turn: 0,
    city: null,
    guesses: config.players.map(() => null),
    history: [],
  };
}

export function partyReducer(state: PartyState, action: PartyAction): PartyState {
  const playerCount = state.config.players.length;
  switch (action.type) {
    case 'cityReady':
      if (state.phase !== 'loading') return state;
      return { ...state, phase: 'handoff', city: action.city, turn: 0, guesses: state.config.players.map(() => null) };

    case 'cityFailed':
      return state.phase === 'loading' ? { ...state, phase: 'error' } : state;

    case 'retry':
      return state.phase === 'error' ? { ...state, phase: 'loading' } : state;

    case 'startTurn':
      return state.phase === 'handoff' ? { ...state, phase: 'guess' } : state;

    case 'submitGuess': {
      if (state.phase !== 'guess' || !state.city || !Number.isFinite(action.guess)) return state;
      const guesses = [...state.guesses];
      guesses[currentPlayer(state)] = action.guess;
      if (state.turn < playerCount - 1) {
        return { ...state, guesses, turn: state.turn + 1, phase: 'handoff' };
      }
      const actualC = gameTemperature(state.city.weather);
      const complete = guesses as number[];
      const ranked = rankByError(
        complete.map((guess, playerIndex) => ({ playerIndex, offC: evaluateGuess(guess, state.config.unit, actualC).offC })),
        state.config.penalty
      );
      const round: PartyRound = { city: state.city, actualC, guesses: complete, ranked, forfeit: action.forfeit };
      return { ...state, guesses, phase: 'reveal', history: [...state.history, round] };
    }

    case 'nextRound':
      if (state.phase !== 'reveal') return state;
      if (state.round + 1 >= state.config.rounds) return { ...state, phase: 'final' };
      return { ...state, phase: 'loading', round: state.round + 1, turn: 0, city: null, guesses: state.config.players.map(() => null) };

    default:
      return state;
  }
}

export interface Standing {
  playerIndex: number;
  name: string;
  totalOffC: number;
  penalties: number;
  roundsWon: number;
  rank: number;
}

/** Final table: lowest total degrees off wins. */
export function standings(state: Pick<PartyState, 'config' | 'history'>): Standing[] {
  const rows = state.config.players.map((name, playerIndex) => {
    const entries = state.history.map(round => round.ranked.find(entry => entry.playerIndex === playerIndex)!);
    return {
      playerIndex,
      name,
      totalOffC: Math.round(entries.reduce((sum, entry) => sum + entry.offC, 0) * 100) / 100,
      penalties: entries.reduce((sum, entry) => sum + entry.penalty, 0),
      roundsWon: entries.filter(entry => entry.rank === 1).length,
    };
  });
  const sorted = rows.sort((a, b) => a.totalOffC - b.totalOffC || a.playerIndex - b.playerIndex);
  return sorted.map(row => ({ ...row, rank: sorted.findIndex(other => other.totalOffC === row.totalOffC) + 1 }));
}

/**
 * Validate a config from storage or navigation params (untrusted input).
 * Returns null if it can't be played.
 */
export function parsePartyConfig(raw: unknown): PartyConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Partial<PartyConfig>;
  if (!Array.isArray(value.players)) return null;
  const players = value.players.map(name => (typeof name === 'string' ? name.trim().slice(0, MAX_NAME_LENGTH) : ''));
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS || players.some(name => !name)) return null;
  if (new Set(players.map(name => name.toLowerCase())).size !== players.length) return null;

  const rounds = (ROUND_OPTIONS as readonly number[]).includes(Number(value.rounds)) ? Number(value.rounds) : DEFAULT_ROUNDS;
  const unit: TempUnit = value.unit === 'F' ? 'F' : 'C';
  const penalty = value.penalty ?? DEFAULT_PENALTY_SETTINGS;
  return {
    players,
    rounds,
    unit,
    penalty: {
      mode: penalty.mode === 'drinks' ? 'drinks' : 'forfeits',
      degreesPerPoint: (DEGREES_PER_POINT_OPTIONS as readonly number[]).includes(Number(penalty.degreesPerPoint))
        ? Number(penalty.degreesPerPoint)
        : DEFAULT_PENALTY_SETTINGS.degreesPerPoint,
      capPerRound: (CAP_OPTIONS as readonly number[]).includes(Number(penalty.capPerRound)) ? Number(penalty.capPerRound) : DEFAULT_PENALTY_SETTINGS.capPerRound,
    },
  };
}
