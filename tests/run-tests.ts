import assert from 'node:assert/strict';
import { getBalancedRandomCities } from '../utils/city-selection';
import { LANGUAGE_OPTIONS, translate } from '../utils/i18n';
import {
  evaluateTemperatureGuess,
  isCompleteTemperatureGuess,
  sanitizeTemperatureGuess,
  toggleMinusInGuess,
} from '../utils/temperature-guess';
import { parsePartyConfiguration } from '../utils/party-configuration';
import {
  buildHotColdMatchups,
  CityWithTemperature,
  getHotColdAnswer,
  getHotColdRoundCount,
  isCorrectHotColdPick,
} from '../utils/hot-or-cold';

type TestCase = {
  name: string;
  run: () => void;
};

function cityKey(city: { city: string; country: string }): string {
  return `${city.city}|${city.country}`;
}

function timezoneBand(city: { lon: number }): number {
  return Math.round(city.lon / 15);
}

function tempCity(name: string, temperature: number): CityWithTemperature {
  return { city: name, country: 'Testland', lat: 0, lon: 0, continent: 'Test', temperature };
}

const tests: TestCase[] = [
  {
    name: 'hot or cold pairs cities into two-option rounds',
    run: () => {
      const cities = [1, 2, 3, 4, 5].map(n => tempCity(`C${n}`, n));
      const matchups = buildHotColdMatchups(cities, () => 0.1);
      assert.equal(matchups.length, 2);
      assert.deepEqual(matchups.map(m => m.cities.map(c => c.city)), [['C1', 'C2'], ['C3', 'C4']]);
      assert.ok(matchups.every(m => m.question === 'hotter'));
      assert.ok(buildHotColdMatchups(cities, () => 0.9).every(m => m.question === 'colder'));
    },
  },
  {
    name: 'hot or cold scores hotter, colder and tied rounds',
    run: () => {
      const cities: [CityWithTemperature, CityWithTemperature] = [tempCity('Oslo', 2), tempCity('Cairo', 28)];
      const hotter = { cities, question: 'hotter' as const };
      const colder = { cities, question: 'colder' as const };
      assert.equal(getHotColdAnswer(hotter), 1);
      assert.equal(isCorrectHotColdPick(hotter, 1), true);
      assert.equal(isCorrectHotColdPick(hotter, 0), false);
      assert.equal(getHotColdAnswer(colder), 0);
      assert.equal(isCorrectHotColdPick(colder, 0), true);
      assert.equal(isCorrectHotColdPick(colder, 1), false);

      const tie = { cities: [tempCity('A', 10), tempCity('B', 10)] as [CityWithTemperature, CityWithTemperature], question: 'hotter' as const };
      assert.equal(getHotColdAnswer(tie), null);
      assert.equal(isCorrectHotColdPick(tie, 0), true);
      assert.equal(isCorrectHotColdPick(tie, 1), true);
    },
  },
  {
    name: 'hot or cold round count gives every party player equal turns',
    run: () => {
      assert.equal(getHotColdRoundCount('classic'), 10);
      assert.equal(getHotColdRoundCount('party', 3) % 3, 0);
      assert.equal(getBalancedRandomCities(getHotColdRoundCount('party', 8) * 2, 8).length, 80);
    },
  },
  {
    name: 'balanced city selection returns requested count without duplicate cities',
    run: () => {
      const cities = getBalancedRandomCities(80, 8);
      const keys = cities.map(cityKey);

      assert.equal(cities.length, 80);
      assert.equal(new Set(keys).size, keys.length);
    },
  },
  {
    name: 'balanced city selection diversifies each achievable four-player batch',
    run: () => {
      const playerCount = 2;
      const batchSize = playerCount * 4;
      const cities = getBalancedRandomCities(batchSize * 3, playerCount);

      for (let i = 0; i < cities.length; i += batchSize) {
        const batch = cities.slice(i, i + batchSize);
        assert.equal(new Set(batch.map(city => city.country)).size, batch.length);
        assert.equal(new Set(batch.map(timezoneBand)).size, batch.length);
      }
    },
  },
  {
    name: 'balanced city selection caps oversized requests at available data',
    run: () => {
      const cities = getBalancedRandomCities(10_000, 8);
      assert.equal(new Set(cities.map(cityKey)).size, cities.length);
      assert.ok(cities.length < 10_000);
    },
  },
  {
    name: 'temperature input sanitizer keeps one leading minus and digits only',
    run: () => {
      assert.equal(sanitizeTemperatureGuess('12'), '12');
      assert.equal(sanitizeTemperatureGuess('-12'), '-12');
      assert.equal(sanitizeTemperatureGuess('--12'), '-12');
      assert.equal(sanitizeTemperatureGuess('1-2'), '12');
      assert.equal(sanitizeTemperatureGuess('-1a2°C'), '-12');
    },
  },
  {
    name: 'temperature minus toggle and completeness match submit behavior',
    run: () => {
      assert.equal(toggleMinusInGuess(''), '-');
      assert.equal(toggleMinusInGuess('12'), '-12');
      assert.equal(toggleMinusInGuess('-12'), '12');
      assert.equal(isCompleteTemperatureGuess(''), false);
      assert.equal(isCompleteTemperatureGuess('-'), false);
      assert.equal(isCompleteTemperatureGuess('-3'), true);
      assert.equal(isCompleteTemperatureGuess('0'), true);
    },
  },
  {
    name: 'temperature scoring uses Celsius and Fahrenheit tolerances',
    run: () => {
      assert.equal(evaluateTemperatureGuess(21, 20, 'C').isCorrect, true);
      assert.equal(evaluateTemperatureGuess(23, 20, 'C').isCorrect, false);
      assert.equal(evaluateTemperatureGuess(68, 20, 'F').isCorrect, true);
      assert.equal(evaluateTemperatureGuess(75, 20, 'F').isCorrect, false);
    },
  },
  {
    name: 'party configuration accepts a complete player list',
    run: () => {
      assert.deepEqual(
        parsePartyConfiguration('2', JSON.stringify([' Alex ', 'Sam'])),
        { playerCount: 2, names: ['Alex', 'Sam'] }
      );
    },
  },
  {
    name: 'party configuration rejects removed or malformed players safely',
    run: () => {
      assert.equal(parsePartyConfiguration('1', JSON.stringify(['Alex'])), null);
      assert.equal(parsePartyConfiguration('2', JSON.stringify(['Alex'])), null);
      assert.equal(parsePartyConfiguration('2', '{'), null);
      assert.equal(parsePartyConfiguration('2', JSON.stringify(['Alex', ''])), null);
    },
  },
  {
    name: 'translations cover every language option and interpolate values',
    run: () => {
      for (const option of LANGUAGE_OPTIONS) {
        assert.notEqual(translate(option.code, 'submitGuess'), '');
        assert.notEqual(translate(option.code, 'whichIsHotter'), 'whichIsHotter');
        assert.notEqual(translate(option.code, 'whichIsColder'), 'whichIsColder');
        assert.equal(translate(option.code, 'nextRoundProgress', { current: 3, total: 10 }).includes('3'), true);
        assert.equal(translate(option.code, 'nextCityProgress', { current: 2, total: 10 }).includes('2'), true);
        assert.equal(translate(option.code, 'nextCityProgress', { current: 2, total: 10 }).includes('10'), true);
      }
    },
  },
];

let passed = 0;

for (const test of tests) {
  try {
    test.run();
    passed += 1;
    console.log(`ok ${passed} - ${test.name}`);
  } catch (error) {
    console.error(`not ok ${passed + 1} - ${test.name}`);
    throw error;
  }
}

console.log(`\n${passed}/${tests.length} tests passed`);
