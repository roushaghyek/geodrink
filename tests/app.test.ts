import assert from 'node:assert/strict';
import { LANGUAGE_OPTIONS, translate } from '../utils/i18n';
import { parsePartyConfiguration } from '../utils/party-configuration';
import { test } from './harness';

test('party configuration accepts a complete player list', () => {
  assert.deepEqual(parsePartyConfiguration('2', JSON.stringify([' Alex ', 'Sam'])), { playerCount: 2, names: ['Alex', 'Sam'] });
});

test('party configuration rejects removed or malformed players safely', () => {
  assert.equal(parsePartyConfiguration('1', JSON.stringify(['Alex'])), null);
  assert.equal(parsePartyConfiguration('2', JSON.stringify(['Alex'])), null);
  assert.equal(parsePartyConfiguration('2', '{'), null);
  assert.equal(parsePartyConfiguration('2', JSON.stringify(['Alex', ''])), null);
});

test('translations cover every language option and interpolate values', () => {
  for (const option of LANGUAGE_OPTIONS) {
    assert.notEqual(translate(option.code, 'submitGuess'), '');
    assert.equal(translate(option.code, 'nextCityProgress', { current: 2, total: 10 }).includes('2'), true);
    assert.equal(translate(option.code, 'nextCityProgress', { current: 2, total: 10 }).includes('10'), true);
  }
});
