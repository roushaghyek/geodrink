import assert from 'node:assert/strict';
import {
  bandEmoji,
  bandLabel,
  degreesOff,
  evaluateGuess,
  formatDegreesOff,
  formatTemp,
  scoreBand,
  scroobyMood,
} from '../engine/scoring';
import {
  isCompleteTemperatureGuess,
  parseGuessToCelsius,
  sanitizeTemperatureGuess,
  toggleMinusInGuess,
} from '../engine/guess-input';
import { test } from './harness';

test('scoring: degrees off is absolute and symmetric', () => {
  assert.equal(degreesOff(18, 21), 3);
  assert.equal(degreesOff(24, 21), 3);
  assert.equal(degreesOff(-5, -5), 0);
  assert.equal(degreesOff(-3, 4), 7);
});

test('scoring: °F guesses are scored in °C against the temperature as shown', () => {
  // 21°C is shown as 70°F; typing 70 is a perfect guess.
  assert.equal(evaluateGuess(70, 'F', 21).offC, 0);
  // 79°F vs shown 70°F = 9°F = 5°C off, too hot.
  const hot = evaluateGuess(79, 'F', 21);
  assert.equal(hot.offC, 5);
  assert.equal(hot.direction, 1);
  assert.equal(evaluateGuess(18, 'C', 21).offC, 3);
  assert.equal(evaluateGuess(18, 'C', 21).direction, -1);
});

test('scoring: bands use °C thresholds 1 / 3 / 6 inclusive', () => {
  assert.equal(scoreBand(0), 'green');
  assert.equal(scoreBand(1), 'green');
  assert.equal(scoreBand(1.01), 'yellow');
  assert.equal(scoreBand(3), 'yellow');
  assert.equal(scoreBand(6), 'orange');
  assert.equal(scoreBand(6.5), 'red');
  assert.equal(bandEmoji('green'), '🟩');
  assert.equal(bandEmoji('red'), '🟥');
  assert.equal(bandLabel('yellow', 'C'), 'within 3°C');
  assert.equal(bandLabel('yellow', 'F'), 'within 5°F');
  assert.equal(bandLabel('red', 'C'), 'more than 6°C off');
});

test('scoring: Scrooby reacts to close, too hot, too cold and way off', () => {
  assert.equal(scroobyMood(20, 21), 'happy');
  assert.equal(scroobyMood(24, 21), 'happy');
  assert.equal(scroobyMood(26, 21), 'sweating');
  assert.equal(scroobyMood(15, 21), 'shivering');
  assert.equal(scroobyMood(35, 21), 'sad');
  assert.equal(scroobyMood(5, 21), 'sad');
});

test('scoring: display helpers format in the player unit', () => {
  assert.equal(formatTemp(21, 'C'), '21°C');
  assert.equal(formatTemp(21, 'F'), '70°F');
  assert.equal(formatDegreesOff(2.5, 'C'), '2.5°C');
  assert.equal(formatDegreesOff(5, 'F'), '9°F');
  assert.equal(formatDegreesOff(3, 'C'), '3°C');
});

test('guess input: sanitizer, minus toggle and parsing', () => {
  assert.equal(sanitizeTemperatureGuess('1-2a3'), '123');
  assert.equal(sanitizeTemperatureGuess('-1-2'), '-12');
  assert.equal(sanitizeTemperatureGuess('12345'), '1234');
  assert.equal(toggleMinusInGuess('12'), '-12');
  assert.equal(toggleMinusInGuess('-12'), '12');
  assert.equal(isCompleteTemperatureGuess('-'), false);
  assert.equal(isCompleteTemperatureGuess('-1'), true);
  assert.equal(parseGuessToCelsius('-', 'C'), null);
  assert.equal(parseGuessToCelsius('-4', 'C'), -4);
  assert.equal(parseGuessToCelsius('32', 'F'), 0);
});
