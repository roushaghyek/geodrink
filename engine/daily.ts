import type { City } from '../data/cities';
import { DAILY_CITIES_V1 } from '../data/daily-cities';
import { cityKey } from './cities';
import { hashString, seededRandom, shuffle } from './random';
import { bandEmoji, bandLabel, scoreBand, TempUnit } from './scoring';

/**
 * Weathr Daily: every player gets the same city on the same day.
 *
 * The day rolls over at 00:00 UTC (the fixed reference timezone), regardless
 * of the device's timezone. Day 0 is 2026-01-01 UTC; the puzzle number shown
 * to players is index + 1.
 */
export const DAILY_REFERENCE_TIMEZONE = 'UTC';
export const DAILY_EPOCH_MS = Date.UTC(2026, 0, 1);
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Append-only list of pools. To add cities, append a new entry whose
 * `fromDay` is in the future; never edit an existing entry.
 */
export const DAILY_POOLS: readonly { fromDay: number; salt: string; cities: readonly City[] }[] = [
  { fromDay: 0, salt: 'v1', cities: DAILY_CITIES_V1 },
];

export function dailyIndex(at: Date | number = Date.now()): number {
  const time = typeof at === 'number' ? at : at.getTime();
  return Math.floor((time - DAILY_EPOCH_MS) / DAY_MS);
}

export function dailyNumber(index: number): number {
  return index + 1;
}

export function msUntilNextDaily(at: Date | number = Date.now()): number {
  const time = typeof at === 'number' ? at : at.getTime();
  const nextStart = DAILY_EPOCH_MS + (dailyIndex(time) + 1) * DAY_MS;
  return nextStart - time;
}

const orderCache = new Map<string, number[]>();

function cycleOrder(salt: string, cycle: number, size: number): number[] {
  const key = `${salt}:${cycle}:${size}`;
  let order = orderCache.get(key);
  if (!order) {
    const indices = Array.from({ length: size }, (_, i) => i);
    order = shuffle(indices, seededRandom(hashString(`weathr-daily:${salt}:${cycle}`)));
    orderCache.set(key, order);
  }
  return order;
}

/**
 * Deterministic city for a day. Each pass through the pool ("cycle") is a
 * seeded shuffle, so no city repeats until every city has been used once.
 */
export function dailyCity(index: number): City {
  const pool = [...DAILY_POOLS].reverse().find(entry => index >= entry.fromDay) ?? DAILY_POOLS[0];
  const size = pool.cities.length;
  const local = index - pool.fromDay;
  const cycle = Math.floor(local / size);
  const position = ((local % size) + size) % size;
  return pool.cities[cycleOrder(pool.salt, cycle, size)[position]];
}

export interface DailyResult {
  day: number;
  cityKey: string;
  guessC: number;
  actualC: number;
  offC: number;
  /** When the live temperature used for scoring was observed (ms epoch). */
  observedAt: number;
  playedAt: number;
}

export interface DailyHistory {
  results: DailyResult[];
}

export const EMPTY_DAILY_HISTORY: DailyHistory = { results: [] };
const MAX_HISTORY = 400;

export function findDailyResult(history: DailyHistory, day: number): DailyResult | undefined {
  return history.results.find(result => result.day === day);
}

/** One attempt per day: an existing result for that day is never replaced. */
export function addDailyResult(history: DailyHistory, result: DailyResult): DailyHistory {
  if (findDailyResult(history, result.day)) return history;
  const results = [...history.results, result].sort((a, b) => a.day - b.day).slice(-MAX_HISTORY);
  return { results };
}

export function newDailyResult(day: number, city: City, guessC: number, actualC: number, observedAt: number, playedAt = Date.now()): DailyResult {
  return {
    day,
    cityKey: cityKey(city),
    guessC,
    actualC,
    offC: Math.round(Math.abs(guessC - actualC) * 100) / 100,
    observedAt,
    playedAt,
  };
}

export interface DailyStreak {
  current: number;
  best: number;
  played: number;
}

/**
 * Streak = consecutive days played (Wordle-style). A streak stays alive
 * through "today" until the player misses a whole UTC day.
 */
export function dailyStreak(history: DailyHistory, today: number): DailyStreak {
  const days = new Set(history.results.map(result => result.day));
  const anchor = days.has(today) ? today : days.has(today - 1) ? today - 1 : null;

  let current = 0;
  if (anchor !== null) {
    for (let day = anchor; days.has(day); day -= 1) current += 1;
  }

  let best = 0;
  let run = 0;
  let previous: number | null = null;
  for (const day of [...days].sort((a, b) => a - b)) {
    run = previous !== null && day === previous + 1 ? run + 1 : 1;
    best = Math.max(best, run);
    previous = day;
  }

  return { current, best: Math.max(best, current), played: days.size };
}

/** Spoiler-free share text: no city name, no actual temperature. */
export function dailyShareText(result: DailyResult, streak: number, unit: TempUnit): string {
  const band = scoreBand(result.offC);
  return [
    `Weathr Daily #${dailyNumber(result.day)} 🌡️`,
    `${bandEmoji(band)} ${bandLabel(band, unit)}`,
    `🔥 ${streak}-day streak`,
    'weathr.ee',
  ].join('\n');
}
