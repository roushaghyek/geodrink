import assert from 'node:assert/strict';
import { createDeck } from '../engine/deck';
import { DEFAULT_PENALTY_SETTINGS, penaltyPoints, rankRound } from '../engine/penalty';
import { seededRandom } from '../engine/random';
import { FORFEITS } from '../data/forfeits';
import { test } from './harness';

const defaults = DEFAULT_PENALTY_SETTINGS;

test('penalty: 1 point per 5° off, rounded up, minimum 1 for any miss', () => {
  assert.equal(penaltyPoints(0, defaults), 0);
  assert.equal(penaltyPoints(0.4, defaults), 1);
  assert.equal(penaltyPoints(4, defaults), 1);
  assert.equal(penaltyPoints(5, defaults), 1);
  assert.equal(penaltyPoints(5.1, defaults), 2);
  assert.equal(penaltyPoints(10, defaults), 2);
  assert.equal(penaltyPoints(11, defaults), 3);
});

test('penalty: capped per round, and the cap itself is bounded', () => {
  assert.equal(penaltyPoints(40, defaults), 3);
  assert.equal(penaltyPoints(40, { degreesPerPoint: 5, capPerRound: 1 }), 1);
  assert.equal(penaltyPoints(40, { degreesPerPoint: 3, capPerRound: 99 }), 5);
  assert.equal(penaltyPoints(7, { degreesPerPoint: 3, capPerRound: 5 }), 3);
  assert.equal(penaltyPoints(7, { degreesPerPoint: 0, capPerRound: 5 }), 2);
});

test('penalty: furthest player takes it; ties for furthest all take it', () => {
  const ranked = rankRound(
    [
      { playerIndex: 0, guessC: 20 },
      { playerIndex: 1, guessC: 10 },
      { playerIndex: 2, guessC: 32 },
      { playerIndex: 3, guessC: 21 },
    ],
    22,
    defaults
  );
  assert.deepEqual(ranked.map(r => r.playerIndex), [3, 0, 2, 1]);
  assert.deepEqual(ranked.map(r => r.rank), [1, 2, 3, 4]);
  assert.deepEqual(ranked.map(r => r.penalty), [0, 0, 0, 3]);

  const tied = rankRound([{ playerIndex: 0, guessC: 12 }, { playerIndex: 1, guessC: 20 }, { playerIndex: 2, guessC: 32 }], 22, defaults);
  assert.deepEqual(tied.filter(r => r.isFurthest).map(r => r.playerIndex).sort(), [0, 2]);
  assert.deepEqual(tied.map(r => r.rank), [1, 2, 2]);
});

test('penalty: nobody loses when the whole table ties', () => {
  const ranked = rankRound([{ playerIndex: 0, guessC: 18 }, { playerIndex: 1, guessC: 26 }], 22, defaults);
  assert.equal(ranked.every(r => !r.isFurthest && r.penalty === 0), true);
});

test('forfeit deck: about 40 cards, every card dealt once before any repeat', () => {
  assert.ok(FORFEITS.length >= 38 && FORFEITS.length <= 45);
  assert.equal(new Set(FORFEITS).size, FORFEITS.length);
  const deck = createDeck(FORFEITS, seededRandom(7));
  const firstPass = FORFEITS.map(() => deck.draw());
  assert.equal(new Set(firstPass).size, FORFEITS.length);
  const next = deck.draw();
  assert.notEqual(next, firstPass[firstPass.length - 1]);
});

test('forfeit deck: copy stays party-safe (no drinking or risky content)', () => {
  const banned = /drink|shot|chug|sip|beer|alcohol|booze|kiss|strip|naked|undress/i;
  FORFEITS.forEach(card => assert.equal(banned.test(card), false, card));
});
