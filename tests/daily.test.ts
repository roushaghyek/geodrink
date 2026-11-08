import assert from 'node:assert/strict';
import { cityKey } from '../engine/cities';
import {
  addDailyResult,
  dailyCity,
  dailyIndex,
  dailyNumber,
  dailyShareText,
  dailyStreak,
  DailyHistory,
  DAILY_POOLS,
  EMPTY_DAILY_HISTORY,
  msUntilNextDaily,
  newDailyResult,
} from '../engine/daily';
import { test } from './harness';

test('daily: index rolls over at 00:00 UTC, independent of device timezone', () => {
  assert.equal(dailyIndex(Date.UTC(2026, 0, 1, 0, 0, 0)), 0);
  assert.equal(dailyIndex(Date.UTC(2026, 0, 1, 23, 59, 59)), 0);
  assert.equal(dailyIndex(Date.UTC(2026, 0, 2, 0, 0, 0)), 1);
  // Same instant expressed as Date or number gives the same day.
  const instant = new Date('2026-11-08T23:30:00-08:00');
  assert.equal(dailyIndex(instant), dailyIndex(instant.getTime()));
  assert.equal(dailyIndex(instant), dailyIndex(Date.UTC(2026, 10, 9, 7, 30)));
  assert.equal(msUntilNextDaily(Date.UTC(2026, 0, 1, 23, 0, 0)), 60 * 60 * 1000);
  assert.equal(dailyNumber(0), 1);
});

test('daily: same day gives the same city on every call', () => {
  for (const day of [0, 1, 42, 311, 5000]) {
    assert.deepEqual(dailyCity(day), dailyCity(day));
  }
});

test('daily: pinned cities guard the frozen pool and seed', () => {
  // If this fails, the daily sequence changed for everyone. Don't update the
  // expectation; restore data/daily-cities.ts or the seed instead.
  const pinned = [0, 1, 2, 100, 311].map(day => cityKey(dailyCity(day)));
  assert.deepEqual(pinned, PINNED_DAILY_CITIES);
});

test('daily: no repeats within a cycle; full pool used before any repeat', () => {
  const size = DAILY_POOLS[0].cities.length;
  const firstCycle = Array.from({ length: size }, (_, day) => cityKey(dailyCity(day)));
  assert.equal(new Set(firstCycle).size, size);
  const secondCycle = Array.from({ length: size }, (_, day) => cityKey(dailyCity(day + size)));
  assert.equal(new Set(secondCycle).size, size);
  assert.notDeepEqual(firstCycle, secondCycle);
});

const city = { city: 'Tallinn', country: 'Estonia', lat: 59.437, lon: 24.7536, continent: 'Europe' };

function historyOf(days: number[]): DailyHistory {
  return days.reduce((history, day) => addDailyResult(history, newDailyResult(day, city, 5, 4, 0, 0)), EMPTY_DAILY_HISTORY);
}

test('daily: one attempt per day; a second result for the same day is ignored', () => {
  const first = addDailyResult(EMPTY_DAILY_HISTORY, newDailyResult(10, city, 5, 4, 0));
  const second = addDailyResult(first, newDailyResult(10, city, 30, 4, 0));
  assert.equal(second.results.length, 1);
  assert.equal(second.results[0].guessC, 5);
});

test('daily: streak counts consecutive days and survives until a full day is missed', () => {
  assert.deepEqual(dailyStreak(historyOf([]), 10), { current: 0, best: 0, played: 0 });
  assert.equal(dailyStreak(historyOf([8, 9, 10]), 10).current, 3);
  // Not played yet today: yesterday's streak is still alive.
  assert.equal(dailyStreak(historyOf([8, 9]), 10).current, 2);
  // Missed yesterday: streak reset.
  assert.equal(dailyStreak(historyOf([7, 8]), 10).current, 0);
  const mixed = dailyStreak(historyOf([1, 2, 3, 4, 7, 9, 10]), 10);
  assert.equal(mixed.current, 2);
  assert.equal(mixed.best, 4);
  assert.equal(mixed.played, 7);
});

test('daily: share text has band and streak but no city or answer', () => {
  const result = newDailyResult(311, city, 23, 21, 0);
  const text = dailyShareText(result, 5, 'C');
  assert.equal(text, 'Weathr Daily #312 🌡️\n🟨 within 3°C\n🔥 5-day streak\nweathr.ee');
  assert.equal(text.includes('Tallinn'), false);
  assert.equal(text.includes('21'), false);
  assert.equal(dailyShareText(result, 1, 'F').includes('within 5°F'), true);
});

const PINNED_DAILY_CITIES: string[] = [
  'Ouagadougou|Burkina Faso',
  'Port-au-Prince|Haiti',
  'San Juan|Puerto Rico',
  'Riga|Latvia',
  'Port Louis|Mauritius',
];
