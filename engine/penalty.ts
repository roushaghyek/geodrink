/**
 * Party penalties. The player(s) furthest from the live temperature take the
 * penalty; it scales with how far off they were and is capped per round.
 */

export type PenaltyMode = 'forfeits' | 'drinks';

export interface PenaltySettings {
  mode: PenaltyMode;
  /** One penalty point per this many °C off (rounded up). */
  degreesPerPoint: number;
  /** Maximum penalty points for a single round. */
  capPerRound: number;
}

export const DEFAULT_PENALTY_SETTINGS: PenaltySettings = {
  mode: 'forfeits',
  degreesPerPoint: 5,
  capPerRound: 3,
};

export const DEGREES_PER_POINT_OPTIONS = [3, 5, 10] as const;
export const CAP_OPTIONS = [1, 2, 3, 4, 5] as const;
/** Hard ceiling regardless of settings, so a round can never ask for a lot at once. */
export const MAX_CAP = 5;

/**
 * Points for a given error: ceil(off / degreesPerPoint), at least 1 for any
 * miss, capped. A perfect guess (0° off) earns no penalty.
 */
export function penaltyPoints(offCelsius: number, settings: Pick<PenaltySettings, 'degreesPerPoint' | 'capPerRound'>): number {
  if (!(offCelsius > 0)) return 0;
  const per = settings.degreesPerPoint > 0 ? settings.degreesPerPoint : DEFAULT_PENALTY_SETTINGS.degreesPerPoint;
  const cap = Math.min(MAX_CAP, Math.max(1, Math.floor(settings.capPerRound)));
  return Math.min(cap, Math.max(1, Math.ceil(offCelsius / per)));
}

export interface PlayerError {
  playerIndex: number;
  offC: number;
}

export interface RankedEntry extends PlayerError {
  /** 1 = closest. Ties share a rank. */
  rank: number;
  isFurthest: boolean;
  penalty: number;
}

/**
 * Rank everyone by degrees off (closest first). Everyone tied for furthest
 * takes the penalty, unless the whole table tied (nobody lost the round).
 */
export function rankByError(entries: PlayerError[], settings: Pick<PenaltySettings, 'degreesPerPoint' | 'capPerRound'>): RankedEntry[] {
  const sorted = [...entries].sort((a, b) => a.offC - b.offC || a.playerIndex - b.playerIndex);
  const worst = sorted.length ? sorted[sorted.length - 1].offC : 0;
  const best = sorted.length ? sorted[0].offC : 0;
  const everyoneTied = sorted.length > 1 && worst === best;

  return sorted.map(entry => {
    const rank = sorted.findIndex(other => other.offC === entry.offC) + 1;
    const isFurthest = !everyoneTied && sorted.length > 1 && entry.offC === worst;
    return { ...entry, rank, isFurthest, penalty: isFurthest ? penaltyPoints(entry.offC, settings) : 0 };
  });
}

export interface RoundGuess {
  playerIndex: number;
  guessC: number;
}

export type RankedGuess = RankedEntry & RoundGuess;

/** Convenience: rank raw °C guesses against the actual temperature. */
export function rankRound(guesses: RoundGuess[], actualC: number, settings: Pick<PenaltySettings, 'degreesPerPoint' | 'capPerRound'>): RankedGuess[] {
  const byPlayer = new Map(guesses.map(guess => [guess.playerIndex, guess]));
  return rankByError(
    guesses.map(guess => ({ playerIndex: guess.playerIndex, offC: Math.round(Math.abs(guess.guessC - actualC) * 100) / 100 })),
    settings
  ).map(entry => ({ ...entry, guessC: byPlayer.get(entry.playerIndex)!.guessC }));
}
