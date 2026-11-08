import assert from 'node:assert/strict';
import { LANGUAGE_OPTIONS, translate } from '../utils/i18n';
import { test } from './harness';

test('translations cover every language option and interpolate values', () => {
  for (const option of LANGUAGE_OPTIONS) {
    assert.notEqual(translate(option.code, 'submitGuess'), '');
    assert.equal(translate(option.code, 'nextCityProgress', { current: 2, total: 10 }).includes('2'), true);
    assert.equal(translate(option.code, 'nextCityProgress', { current: 2, total: 10 }).includes('10'), true);
    // Strings added in English first fall back to English, never to the raw key.
    assert.equal(translate(option.code, 'drinkResponsibly').startsWith('Drink responsibly'), true);
  }
});

test('no translation pushes drinking outside the opt-in party copy', () => {
  for (const option of LANGUAGE_OPTIONS) {
    const probe = ['landingSubtitle', 'partyCardSubtitle', 'hotColdCorrect', 'hotColdOver', 'takesForfeit', 'noPenalty'] as const;
    for (const key of probe) {
      assert.equal(/drink|beb|trink|bev|boit|пь/i.test(translate(option.code, key)), false, `${option.code}.${key}`);
    }
  }
});
