import { RandomFn, shuffle } from './random';

/**
 * A shuffled deck that deals every card once before reshuffling, and never
 * deals the same card twice in a row across a reshuffle.
 */
export interface Deck<T> {
  draw: () => T;
  remaining: () => number;
}

export function createDeck<T>(cards: readonly T[], random: RandomFn = Math.random): Deck<T> {
  if (cards.length === 0) throw new Error('Cannot create an empty deck');
  let pile: T[] = shuffle(cards, random);
  let last: T | undefined;

  return {
    draw() {
      if (pile.length === 0) {
        pile = shuffle(cards, random);
        if (cards.length > 1 && pile[pile.length - 1] === last) {
          [pile[0], pile[pile.length - 1]] = [pile[pile.length - 1], pile[0]];
        }
      }
      last = pile.pop()!;
      return last;
    },
    remaining: () => pile.length,
  };
}
