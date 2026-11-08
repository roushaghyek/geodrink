import { TempUnit, toCelsius } from './scoring';

/** Keep digits and at most one leading minus. */
export function sanitizeTemperatureGuess(text: string): string {
  let filtered = text.replace(/[^0-9-]/g, '');
  if (filtered.includes('-')) {
    const digits = filtered.replace(/-/g, '');
    filtered = filtered.startsWith('-') ? `-${digits}` : digits;
  }
  return filtered.slice(0, 4);
}

export function toggleMinusInGuess(guess: string): string {
  return guess.startsWith('-') ? guess.substring(1) : `-${guess}`;
}

export function isCompleteTemperatureGuess(guess: string): boolean {
  return guess.length > 0 && guess !== '-';
}

/** Parse what the player typed (in their unit) into °C, or null if incomplete. */
export function parseGuessToCelsius(guess: string, unit: TempUnit): number | null {
  if (!isCompleteTemperatureGuess(guess)) return null;
  const value = Number(guess);
  return Number.isFinite(value) ? toCelsius(value, unit) : null;
}
