/**
 * Error-based scoring shared by every mode.
 *
 * All maths happens in Celsius so scores are comparable between players who
 * use different display units. Only display helpers know about °F.
 */

export type TempUnit = 'C' | 'F';

export function celsiusToFahrenheit(celsius: number): number {
  return (celsius * 9) / 5 + 32;
}

export function fahrenheitToCelsius(fahrenheit: number): number {
  return ((fahrenheit - 32) * 5) / 9;
}

export function toCelsius(value: number, unit: TempUnit): number {
  return unit === 'F' ? fahrenheitToCelsius(value) : value;
}

/** A temperature as the player sees it: whole degrees in their unit. */
export function toDisplayTemp(celsius: number, unit: TempUnit): number {
  return Math.round(unit === 'F' ? celsiusToFahrenheit(celsius) : celsius);
}

export function formatTemp(celsius: number, unit: TempUnit): string {
  return `${toDisplayTemp(celsius, unit)}°${unit}`;
}

/** Convert a temperature *difference* (not a temperature) between units. */
export function deltaToUnit(deltaCelsius: number, unit: TempUnit): number {
  return unit === 'F' ? (deltaCelsius * 9) / 5 : deltaCelsius;
}

export function roundTo(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** The score: absolute degrees Celsius between the guess and the live temperature. */
export function degreesOff(guessCelsius: number, actualCelsius: number): number {
  return roundTo(Math.abs(guessCelsius - actualCelsius), 2);
}

/** "2.4°C off" / "4.3°F off" — error shown in the player's unit, one decimal. */
export function formatDegreesOff(offCelsius: number, unit: TempUnit): string {
  const value = roundTo(deltaToUnit(offCelsius, unit), 1);
  return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}°${unit}`;
}

export type ScoreBand = 'green' | 'yellow' | 'orange' | 'red';

/** Band thresholds in °C (inclusive upper bounds). */
export const SCORE_BANDS: readonly { band: ScoreBand; maxOffC: number; emoji: string }[] = [
  { band: 'green', maxOffC: 1, emoji: '🟩' },
  { band: 'yellow', maxOffC: 3, emoji: '🟨' },
  { band: 'orange', maxOffC: 6, emoji: '🟧' },
  { band: 'red', maxOffC: Infinity, emoji: '🟥' },
];

export function scoreBand(offCelsius: number): ScoreBand {
  return SCORE_BANDS.find(entry => offCelsius <= entry.maxOffC)!.band;
}

export function bandEmoji(band: ScoreBand): string {
  return SCORE_BANDS.find(entry => entry.band === band)!.emoji;
}

/** "within 3°C" / "within 5°F" / "more than 6°C off" for the share card and UI. */
export function bandLabel(band: ScoreBand, unit: TempUnit): string {
  const index = SCORE_BANDS.findIndex(entry => entry.band === band);
  if (band === 'red') {
    return `more than ${Math.round(deltaToUnit(SCORE_BANDS[index - 1].maxOffC, unit))}°${unit} off`;
  }
  return `within ${Math.round(deltaToUnit(SCORE_BANDS[index].maxOffC, unit))}°${unit}`;
}

export interface GuessEvaluation {
  /** The guess converted to °C. */
  guessC: number;
  /** The score: degrees °C off. */
  offC: number;
  band: ScoreBand;
  mood: ScroobyMood;
  /** Positive = guessed too hot. */
  direction: -1 | 0 | 1;
}

/**
 * Score a guess typed in the player's unit against a whole-degree °C reading.
 * The error is measured against the temperature *as displayed* in that unit,
 * so a °F player who types exactly the number they're shown scores 0.
 */
export function evaluateGuess(guessInUnit: number, unit: TempUnit, actualC: number): GuessEvaluation {
  const shownActual = toDisplayTemp(actualC, unit);
  const actualInUnitAsC = unit === 'F' ? fahrenheitToCelsius(shownActual) : actualC;
  const guessC = toCelsius(guessInUnit, unit);
  const offC = degreesOff(guessC, actualInUnitAsC);
  return {
    guessC,
    offC,
    band: scoreBand(offC),
    mood: scroobyMood(guessC, actualInUnitAsC),
    direction: offC === 0 ? 0 : guessC > actualInUnitAsC ? 1 : -1,
  };
}

export type ScroobyMood = 'happy' | 'sweating' | 'shivering' | 'sad';

/** Within this many °C Scrooby is happy. */
export const CLOSE_GUESS_C = 3;
/** Beyond this many °C Scrooby is just sad, whichever direction you missed. */
export const WAY_OFF_C = 10;

export function scroobyMood(guessCelsius: number, actualCelsius: number): ScroobyMood {
  const off = Math.abs(guessCelsius - actualCelsius);
  if (off <= CLOSE_GUESS_C) return 'happy';
  if (off > WAY_OFF_C) return 'sad';
  return guessCelsius > actualCelsius ? 'sweating' : 'shivering';
}
