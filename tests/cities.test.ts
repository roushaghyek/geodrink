import assert from 'node:assert/strict';
import { cityKey, getBalancedRandomCities, pickCities } from '../engine/cities';
import { hotterSide, isCorrectPick, nextPair } from '../engine/hot-or-cold';
import { seededRandom } from '../engine/random';
import { test } from './harness';

function timezoneBand(city: { lon: number }): number {
  return Math.round(city.lon / 15);
}

test('cities: balanced selection returns requested count without duplicates', () => {
  const cities = getBalancedRandomCities(80, 8);
  assert.equal(cities.length, 80);
  assert.equal(new Set(cities.map(cityKey)).size, 80);
});

test('cities: each achievable batch is spread across countries and timezones', () => {
  const batchSize = 8;
  const cities = pickCities(batchSize * 3, { batchSize });
  for (let i = 0; i < cities.length; i += batchSize) {
    const batch = cities.slice(i, i + batchSize);
    assert.equal(new Set(batch.map(city => city.country)).size, batch.length);
    assert.equal(new Set(batch.map(timezoneBand)).size, batch.length);
  }
});

test('cities: oversized requests cap at the pool; exclusions are honoured', () => {
  const all = getBalancedRandomCities(10_000, 8);
  assert.ok(all.length < 10_000);
  assert.equal(new Set(all.map(cityKey)).size, all.length);
  const first = pickCities(5, { random: seededRandom(1) });
  const next = pickCities(5, { exclude: first.map(cityKey), random: seededRandom(1) });
  assert.equal(next.some(city => first.map(cityKey).includes(cityKey(city))), false);
});

const cw = (name: string, tempC: number) => ({
  city: { city: name, country: 'X', lat: 0, lon: 0, continent: 'Y' },
  weather: { tempC, observedAt: 0, fetchedAt: 0 },
});

test('hotter or colder: picks, ties and the chain', () => {
  const pair = { left: cw('Oslo', 2.4), right: cw('Cairo', 27.6) };
  assert.equal(hotterSide(pair), 1);
  assert.equal(isCorrectPick(pair, 1), true);
  assert.equal(isCorrectPick(pair, 0), false);
  // 20.4 and 19.6 both show as 20°C: a tie, so either pick is right.
  const tie = { left: cw('A', 20.4), right: cw('B', 19.6) };
  assert.equal(hotterSide(tie), null);
  assert.equal(isCorrectPick(tie, 0) && isCorrectPick(tie, 1), true);
  const chained = nextPair(pair, cw('Lima', 18));
  assert.equal(chained.left.city.city, 'Cairo');
  assert.equal(chained.right.city.city, 'Lima');
});
