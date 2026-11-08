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

export interface RoundGuess {
  playerIndex: number;
  guessC: number;
}

export interface RankedGuess extends RoundGuess {
  offC: number;
  /** 1 = closest. Ties share a rank. */
  rank: number;
  isFurthest: boolean;
  penalty: number;
}

/**
 * Rank everyone by degrees off (closest first). Everyone tied for furthest
 * takes the penalty, unless the whole table tied (nobody lost the round).
 */
export function rankRound(guesses: RoundGuess[], actualC: number, settings: Pick<PenaltySettings, 'degreesPerPoint' | 'capPerRound'>): RankedGuess[] {
  const withOff = guesses.map(guess => ({
    ...guess,
    offC: Math.round(Math.abs(guess.guessC - actualC) * 100) / 100,
  }));
  const sorted = [...withOff].sort((a, b) => a.offC - b.offC || a.playerIndex - b.playerIndex);
  const worst = sorted.length ? sorted[sorted.length - 1].offC : 0;
  const best = sorted.length ? sorted[0].offC : 0;
  const everyoneTied = sorted.length > 1 && worst === best;

  return sorted.map(guess => {
    const rank = sorted.findIndex(other => other.offC === guess.offC) + 1;
    const isFurthest = !everyoneTied && guess.offC === worst && sorted.length > 1;
    return { ...guess, rank, isFurthest, penalty: isFurthest ? penaltyPoints(guess.offC, settings) : 0 };
  });
}
