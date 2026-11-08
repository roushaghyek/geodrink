import type { City } from '../data/cities';
import type { CityWeather } from './weather/client';
import { gameTemperature } from './weather/types';

/**
 * Hotter or Colder, chain format: two cities on screen, tap the hotter one.
 * After a correct pick the newer city stays as the left-hand anchor (its
 * temperature already revealed) and a fresh city joins on the right. Keeping
 * the newer city, not always the hotter one, stops the anchor drifting to
 * ever-hotter places and making the game trivially easy.
 *
 * Endless: the run ends on the first wrong pick. Ties always count as right.
 */
export type Side = 0 | 1;

export interface HotColdPair<C extends City = City> {
  left: CityWeather<C>;
  right: CityWeather<C>;
}

export function hotterSide(pair: HotColdPair): Side | null {
  const left = gameTemperature(pair.left.weather);
  const right = gameTemperature(pair.right.weather);
  if (left === right) return null;
  return left > right ? 0 : 1;
}

export function isCorrectPick(pair: HotColdPair, picked: Side): boolean {
  const answer = hotterSide(pair);
  return answer === null || answer === picked;
}

/** The next pair after a correct pick: the newer city stays, the next one joins. */
export function nextPair<C extends City>(pair: HotColdPair<C>, incoming: CityWeather<C>): HotColdPair<C> {
  return { left: pair.right, right: incoming };
}

/** Queue health: how many cities with weather we want ready ahead of play. */
export const PREFETCH_TARGET = 8;
export const PREFETCH_LOW_WATER = 4;

export function needsRefill(queueLength: number): boolean {
  return queueLength < PREFETCH_LOW_WATER;
}

export function updateHighScore(previous: number, run: number): number {
  return Math.max(previous, run);
}
