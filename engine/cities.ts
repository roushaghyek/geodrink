import { CITIES, City } from '../data/cities';
import { RandomFn, shuffle } from './random';

export type { City };

export function cityKey(city: Pick<City, 'city' | 'country'>): string {
  return `${city.city}|${city.country}`;
}

function timezoneBand(city: City): number {
  return Math.round(city.lon / 15);
}

function takeBalancedBatch(pool: City[], batchSize: number, usedCityKeys: Set<string>): City[] {
  const batch: City[] = [];
  const usedCountries = new Set<string>();
  const usedTimezoneBands = new Set<number>();

  const priorities = [
    (city: City) => !usedCountries.has(city.country) && !usedTimezoneBands.has(timezoneBand(city)),
    (city: City) => !usedCountries.has(city.country),
    (city: City) => !usedTimezoneBands.has(timezoneBand(city)),
    () => true,
  ];

  for (const canUse of priorities) {
    while (batch.length < batchSize) {
      const next = pool.find(
        city => !usedCityKeys.has(cityKey(city)) && !batch.some(selected => cityKey(selected) === cityKey(city)) && canUse(city)
      );
      if (!next) break;
      batch.push(next);
      usedCountries.add(next.country);
      usedTimezoneBands.add(timezoneBand(next));
    }
  }

  return batch;
}

export interface CityPickOptions {
  /** Batches of this size avoid repeating countries / timezone bands. */
  batchSize?: number;
  /** Cities to leave out (e.g. already played this session). */
  exclude?: Iterable<string>;
  random?: RandomFn;
  pool?: readonly City[];
}

/**
 * Random cities spread across countries and timezones, no duplicates.
 * Returns fewer than `count` only when the pool runs out.
 */
export function pickCities(count: number, options: CityPickOptions = {}): City[] {
  const { batchSize = 4, random = Math.random, pool: source = CITIES } = options;
  const usedCityKeys = new Set<string>(options.exclude ?? []);
  const pool = shuffle(source, random).filter(city => !usedCityKeys.has(cityKey(city)));
  const targetCount = Math.min(count, pool.length);
  const selected: City[] = [];

  while (selected.length < targetCount) {
    const batch = takeBalancedBatch(pool, Math.min(Math.max(1, batchSize), targetCount - selected.length), usedCityKeys);
    if (batch.length === 0) break;
    batch.forEach(city => {
      selected.push(city);
      usedCityKeys.add(cityKey(city));
    });
  }

  return selected;
}

/** Back-compat wrapper for the original API (batch of 4 per player). */
export function getBalancedRandomCities(count: number, playerCount = 1): City[] {
  return pickCities(count, { batchSize: Math.max(1, playerCount * 4) });
}
