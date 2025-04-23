import pkg from 'pokersolver';
import _ from 'lodash';

const { Hand } = pkg;

// Full 52-card deck
const SUITS = ['s', 'h', 'd', 'c'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
const FULL_DECK = RANKS.flatMap(rank => SUITS.map(suit => rank + suit));

export const getHandDetails = (hole, board) => {
  try {
    const hand = Hand.solve([...hole, ...board]);
    return {
      handName: hand.name,
      rank: hand.rank,
      descr: hand.descr
    };
  } catch (err) {
    return {
      handName: 'Invalid Hand',
      rank: 0,
      descr: err.message
    };
  }
};

// 🔮 SIMULATION: Estimate win %
export const simulateWinOdds = (hole, board, iterations = 500) => {
  const usedCards = new Set([...hole, ...board]);
  const deck = FULL_DECK.filter(card => !usedCards.has(card));

  let wins = 0;
  let ties = 0;

  for (let i = 0; i < iterations; i++) {
    const oppHole = _.sampleSize(deck, 2);
    const remaining = _.sampleSize(deck.filter(c => !oppHole.includes(c)), 5 - board.length);
    const fullBoard = [...board, ...remaining];

    const playerHand = Hand.solve([...hole, ...fullBoard]);
    const oppHand = Hand.solve([...oppHole, ...fullBoard]);
    const result = Hand.winners([playerHand, oppHand]);

    if (result.length === 1 && result[0] === playerHand) wins++;
    else if (result.length > 1) ties++;
  }

  const winPct = ((wins / iterations) * 100).toFixed(1);
  const tiePct = ((ties / iterations) * 100).toFixed(1);

  return {
    winPercent: winPct,
    tiePercent: tiePct
  };
};
