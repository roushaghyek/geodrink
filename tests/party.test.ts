import assert from 'node:assert/strict';
import {
  createPartyState,
  currentPlayer,
  MAX_PLAYERS,
  parsePartyConfig,
  PartyConfig,
  partyReducer,
  PartyState,
  standings,
  turnOrder,
} from '../engine/party';
import { DEFAULT_PENALTY_SETTINGS } from '../engine/penalty';
import { test } from './harness';

const config: PartyConfig = { players: ['Ana', 'Ben', 'Cy'], rounds: 2, unit: 'C', penalty: DEFAULT_PENALTY_SETTINGS };
const cityAt = (tempC: number) => ({
  city: { city: 'Tallinn', country: 'Estonia', lat: 59.437, lon: 24.7536, continent: 'Europe' },
  weather: { tempC, observedAt: 0, fetchedAt: 0 },
});

function playRound(state: PartyState, tempC: number, guessesByPlayer: number[], forfeit = 'Do 10 star jumps.'): PartyState {
  let next = partyReducer(state, { type: 'cityReady', city: cityAt(tempC) });
  for (let i = 0; i < guessesByPlayer.length; i += 1) {
    assert.equal(next.phase, 'handoff');
    next = partyReducer(next, { type: 'startTurn' });
    assert.equal(next.phase, 'guess');
    next = partyReducer(next, { type: 'submitGuess', guess: guessesByPlayer[currentPlayer(next)], forfeit });
  }
  return next;
}

test('party: turn order rotates who goes first each round', () => {
  assert.deepEqual(turnOrder(0, 3), [0, 1, 2]);
  assert.deepEqual(turnOrder(1, 3), [1, 2, 0]);
  assert.deepEqual(turnOrder(4, 3), [1, 2, 0]);
});

test('party: a round hands off between every player, then reveals a ranking', () => {
  let state = createPartyState(config);
  assert.equal(state.phase, 'loading');
  // Actual 20°C: Ana 19 (1 off), Ben 32 (12 off), Cy 25 (5 off)
  state = playRound(state, 20, [19, 32, 25]);
  assert.equal(state.phase, 'reveal');
  const [round] = state.history;
  assert.deepEqual(round.ranked.map(r => r.playerIndex), [0, 2, 1]);
  assert.deepEqual(round.ranked.map(r => r.penalty), [0, 0, 3]);
  assert.equal(round.forfeit, 'Do 10 star jumps.');
});

test('party: guesses are hidden until everyone has guessed', () => {
  let state = partyReducer(createPartyState(config), { type: 'cityReady', city: cityAt(20) });
  state = partyReducer(state, { type: 'startTurn' });
  state = partyReducer(state, { type: 'submitGuess', guess: 10 });
  // Back on the hand-off screen, no reveal, no ranking yet.
  assert.equal(state.phase, 'handoff');
  assert.equal(state.history.length, 0);
  // Submitting while on the hand-off screen is ignored.
  assert.equal(partyReducer(state, { type: 'submitGuess', guess: 99 }), state);
});

test('party: rounds advance to final standings by total degrees off', () => {
  let state = createPartyState(config);
  state = playRound(state, 20, [19, 32, 25]);
  state = partyReducer(state, { type: 'nextRound' });
  assert.equal(state.phase, 'loading');
  assert.equal(state.round, 1);
  state = playRound(state, 10, [4, 10, 10]); // Ana 6 off, Ben 0, Cy 0
  state = partyReducer(state, { type: 'nextRound' });
  assert.equal(state.phase, 'final');
  const table = standings(state);
  assert.deepEqual(table.map(row => [row.name, row.totalOffC, row.penalties]), [
    ['Cy', 5, 0],
    ['Ana', 7, 2],
    ['Ben', 12, 3],
  ]);
});

test('party: weather failure shows an error and can be retried', () => {
  let state = partyReducer(createPartyState(config), { type: 'cityFailed' });
  assert.equal(state.phase, 'error');
  state = partyReducer(state, { type: 'retry' });
  assert.equal(state.phase, 'loading');
});

test('party: config validation enforces 2 to 12 unique, non-empty names', () => {
  const players = (n: number) => Array.from({ length: n }, (_, i) => `P${i}`);
  assert.equal(parsePartyConfig({ players: players(1) }), null);
  assert.ok(parsePartyConfig({ players: players(2) }));
  assert.ok(parsePartyConfig({ players: players(MAX_PLAYERS) }));
  assert.equal(parsePartyConfig({ players: players(MAX_PLAYERS + 1) }), null);
  assert.equal(parsePartyConfig({ players: ['Ana', ' '] }), null);
  assert.equal(parsePartyConfig({ players: ['Ana', 'ana'] }), null);
  assert.equal(parsePartyConfig('nope'), null);
});

test('party: config validation falls back to safe penalty settings', () => {
  const parsed = parsePartyConfig({ players: ['A', 'B'], rounds: 99, penalty: { mode: 'shots', degreesPerPoint: 1, capPerRound: 50 } });
  assert.deepEqual(parsed, { players: ['A', 'B'], rounds: 5, unit: 'C', penalty: DEFAULT_PENALTY_SETTINGS });
  const drinks = parsePartyConfig({ players: ['A', 'B'], unit: 'F', penalty: { mode: 'drinks', degreesPerPoint: 3, capPerRound: 2 } });
  assert.deepEqual(drinks?.penalty, { mode: 'drinks', degreesPerPoint: 3, capPerRound: 2 });
  assert.equal(drinks?.unit, 'F');
});
