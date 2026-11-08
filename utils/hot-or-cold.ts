import { City } from '../data/cities';

export type HotColdQuestion = 'hotter' | 'colder';
export type HotColdSide = 0 | 1;

export interface CityWithTemperature extends City {
  temperature: number;
}

export interface HotColdMatchup {
  cities: [CityWithTemperature, CityWithTemperature];
  question: HotColdQuestion;
}

export const HOT_COLD_SOLO_ROUNDS = 10;
export const HOT_COLD_PARTY_ROUNDS_PER_PLAYER = 5;

export function getHotColdRoundCount(mode: 'classic' | 'party', playerCount = 1): number {
  return mode === 'party' ? HOT_COLD_PARTY_ROUNDS_PER_PLAYER * playerCount : HOT_COLD_SOLO_ROUNDS;
}

export function randomHotColdQuestion(random: () => number = Math.random): HotColdQuestion {
  return random() < 0.5 ? 'hotter' : 'colder';
}

/**
 * Pair consecutive cities into two-option rounds. Each round gets its own
 * randomly chosen question so players can't settle into always tapping
 * the warmer-looking city.
 */
export function buildHotColdMatchups(
  cities: CityWithTemperature[],
  random: () => number = Math.random
): HotColdMatchup[] {
  const matchups: HotColdMatchup[] = [];
  for (let i = 0; i + 1 < cities.length; i += 2) {
    matchups.push({
      cities: [cities[i], cities[i + 1]],
      question: randomHotColdQuestion(random),
    });
  }
  return matchups;
}

/** Index of the city that answers the question, or null when they're tied. */
export function getHotColdAnswer(matchup: HotColdMatchup): HotColdSide | null {
  const [a, b] = matchup.cities;
  if (a.temperature === b.temperature) return null;
  const firstIsHotter = a.temperature > b.temperature;
  if (matchup.question === 'hotter') return firstIsHotter ? 0 : 1;
  return firstIsHotter ? 1 : 0;
}

/** A tie is a free point: either pick is right. */
export function isCorrectHotColdPick(matchup: HotColdMatchup, picked: HotColdSide): boolean {
  const answer = getHotColdAnswer(matchup);
  return answer === null || answer === picked;
}
