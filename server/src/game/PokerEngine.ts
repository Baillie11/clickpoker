import { Card, Player, PokerTable } from '../../../shared/types';

export class PokerEngine {
  private static suits: Card['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades'];
  private static ranks: Card['rank'][] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  static createDeck(): Card[] {
    const deck: Card[] = [];
    for (const suit of this.suits) {
      for (const rank of this.ranks) {
        deck.push({ suit, rank });
      }
    }
    return this.shuffleDeck(deck);
  }

  static shuffleDeck(deck: Card[]): Card[] {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  static dealHoleCards(deck: Card[], players: Player[]): { deck: Card[], players: Player[] } {
    const newDeck = [...deck];
    const newPlayers = players.map(player => ({
      ...player,
      holeCards: [] as Card[]
    }));

    // Deal 2 cards to each active player
    for (let cardNum = 0; cardNum < 2; cardNum++) {
      for (const player of newPlayers) {
        if (player.isActive && !player.isFolded) {
          const card = newDeck.pop();
          if (card) {
            player.holeCards.push(card);
          }
        }
      }
    }

    return { deck: newDeck, players: newPlayers };
  }

  static dealCommunityCards(deck: Card[], count: number): { deck: Card[], cards: Card[] } {
    const newDeck = [...deck];
    const cards: Card[] = [];
    
    for (let i = 0; i < count; i++) {
      const card = newDeck.pop();
      if (card) {
        cards.push(card);
      }
    }

    return { deck: newDeck, cards };
  }

  static getNextActivePlayer(players: Player[], currentPosition: number): number {
    const activePlayers = players.filter(p => p.isActive && !p.isFolded);
    if (activePlayers.length <= 1) return -1;

    let nextPosition = (currentPosition + 1) % players.length;
    let attempts = 0;
    
    while (attempts < players.length) {
      const player = players[nextPosition];
      if (player && player.isActive && !player.isFolded && !player.isAllIn) {
        return nextPosition;
      }
      nextPosition = (nextPosition + 1) % players.length;
      attempts++;
    }
    
    // If all remaining players are all-in, return -1 to trigger showdown
    const nonAllInPlayers = activePlayers.filter(p => !p.isAllIn);
    if (nonAllInPlayers.length === 0) {
      return -1;
    }
    
    return -1;
  }

  static calculatePot(players: Player[]): number {
    return players.reduce((pot, player) => pot + player.currentBet, 0);
  }

  static getHandStrength(holeCards: Card[], communityCards: Card[]): number {
    const handRank = this.evaluateHand(holeCards, communityCards);
    return handRank.rank + (handRank.tiebreaker / 1000000); // Convert to 0-1 scale with tiebreakers
  }

  static evaluateHand(holeCards: Card[], communityCards: Card[]): { rank: number, tiebreaker: number, description: string } {
    const allCards = [...holeCards, ...communityCards];
    
    if (allCards.length < 5) {
      // Pre-flop or incomplete board - use high card value
      const highCard = this.getHighCardValue(holeCards);
      return { rank: 0, tiebreaker: highCard * 14, description: 'High Card' };
    }

    // Get all possible 5-card combinations from 7 cards
    const combinations = this.getCombinations(allCards, 5);
    let bestHand = { rank: 0, tiebreaker: 0, description: 'High Card' };

    for (const combo of combinations) {
      const handRank = this.evaluateFiveCardHand(combo);
      if (handRank.rank > bestHand.rank || 
          (handRank.rank === bestHand.rank && handRank.tiebreaker > bestHand.tiebreaker)) {
        bestHand = handRank;
      }
    }

    return bestHand;
  }

  private static evaluateFiveCardHand(cards: Card[]): { rank: number, tiebreaker: number, description: string } {
    const ranks = cards.map(card => this.getCardRankValue(card.rank)).sort((a, b) => b - a);
    const suits = cards.map(card => card.suit);
    const rankCounts = this.getRankCounts(ranks);
    const isFlush = suits.every(suit => suit === suits[0]);
    const isStraight = this.isStraight(ranks);
    const rankName = (val: number) => {
      const map: { [key: number]: string } = {14:'Ace',13:'King',12:'Queen',11:'Jack',10:'Ten',9:'Nine',8:'Eight',7:'Seven',6:'Six',5:'Five',4:'Four',3:'Three',2:'Two'};
      return map[val] || val.toString();
    };

    // Royal Flush
    if (isFlush && isStraight && ranks[0] === 14) {
      return { rank: 9, tiebreaker: 0, description: 'Royal Flush' };
    }

    // Straight Flush
    if (isFlush && isStraight) {
      return { rank: 8, tiebreaker: ranks[0], description: `Straight Flush, ${rankName(ranks[0])} High` };
    }

    // Four of a Kind
    if (rankCounts.some(count => count === 4)) {
      const fourKind = ranks.find(rank => ranks.filter(r => r === rank).length === 4)!;
      const kicker = ranks.find(rank => rank !== fourKind)!;
      return { rank: 7, tiebreaker: fourKind * 100 + kicker, description: `Four of a Kind, ${rankName(fourKind)}s` };
    }

    // Full House
    if (rankCounts.some(count => count === 3) && rankCounts.some(count => count === 2)) {
      const threeKind = ranks.find(rank => ranks.filter(r => r === rank).length === 3)!;
      const pair = ranks.find(rank => ranks.filter(r => r === rank).length === 2)!;
      return { rank: 6, tiebreaker: threeKind * 100 + pair, description: `Full House, ${rankName(threeKind)}s over ${rankName(pair)}s` };
    }

    // Flush
    if (isFlush) {
      const tiebreaker = ranks.reduce((sum, rank, index) => sum + rank * Math.pow(100, 4 - index), 0);
      return { rank: 5, tiebreaker, description: `Flush, ${rankName(ranks[0])} High` };
    }

    // Straight
    if (isStraight) {
      return { rank: 4, tiebreaker: ranks[0], description: `Straight, ${rankName(ranks[0])} High` };
    }

    // Three of a Kind
    if (rankCounts.some(count => count === 3)) {
      const threeKind = ranks.find(rank => ranks.filter(r => r === rank).length === 3)!;
      return { rank: 3, tiebreaker: threeKind * 10000, description: `Three of a Kind, ${rankName(threeKind)}s` };
    }

    // Two Pair
    const pairs = ranks.filter((rank, index, arr) => arr.filter(r => r === rank).length === 2);
    if (pairs.length >= 4) { // Two pairs (each pair counted twice)
      const uniquePairs = [...new Set(pairs)].sort((a, b) => b - a);
      const kicker = ranks.find(rank => !uniquePairs.includes(rank))!;
      return { rank: 2, tiebreaker: uniquePairs[0] * 10000 + uniquePairs[1] * 100 + kicker, description: `Two Pair, ${rankName(uniquePairs[0])}s and ${rankName(uniquePairs[1])}s` };
    }

    // One Pair
    if (rankCounts.some(count => count === 2)) {
      const pair = ranks.find(rank => ranks.filter(r => r === rank).length === 2)!;
      return { rank: 1, tiebreaker: pair * 1000000, description: `Pair of ${rankName(pair)}s` };
    }

    // High Card
    const tiebreaker = ranks.reduce((sum, rank, index) => sum + rank * Math.pow(100, 4 - index), 0);
    return { rank: 0, tiebreaker, description: `High Card, ${rankName(ranks[0])}` };
  }

  private static getCombinations<T>(arr: T[], r: number): T[][] {
    if (r > arr.length) return [];
    if (r === 1) return arr.map(item => [item]);
    
    const combinations: T[][] = [];
    for (let i = 0; i <= arr.length - r; i++) {
      const rest = this.getCombinations(arr.slice(i + 1), r - 1);
      for (const combo of rest) {
        combinations.push([arr[i], ...combo]);
      }
    }
    return combinations;
  }

  private static getCardRankValue(rank: Card['rank']): number {
    const rankValues: { [key: string]: number } = {
      'A': 14, 'K': 13, 'Q': 12, 'J': 11, '10': 10,
      '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2
    };
    return rankValues[rank] || 2;
  }

  private static getRankCounts(ranks: number[]): number[] {
    const counts: { [key: number]: number } = {};
    ranks.forEach(rank => counts[rank] = (counts[rank] || 0) + 1);
    return Object.values(counts);
  }

  private static isStraight(ranks: number[]): boolean {
    const uniqueRanks = [...new Set(ranks)].sort((a, b) => b - a);
    if (uniqueRanks.length !== 5) return false;
    
    // Check for regular straight
    for (let i = 0; i < 4; i++) {
      if (uniqueRanks[i] - uniqueRanks[i + 1] !== 1) {
        // Check for A-2-3-4-5 (wheel) straight
        if (i === 0 && uniqueRanks[0] === 14 && uniqueRanks[1] === 5 && uniqueRanks[2] === 4 && uniqueRanks[3] === 3 && uniqueRanks[4] === 2) {
          return true;
        }
        return false;
      }
    }
    return true;
  }

  private static getHighCardValue(cards: Card[]): number {
    const rankValues: { [key: string]: number } = {
      'A': 14, 'K': 13, 'Q': 12, 'J': 11, '10': 10,
      '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2
    };

    const highestCard = Math.max(...cards.map(card => rankValues[card.rank] || 2));
    return highestCard / 14; // Normalize to 0-1
  }

  static isRoundComplete(players: Player[], currentBet: number): boolean {
    const activePlayers = players.filter(p => p.isActive && !p.isFolded);
    
    // If only one player left, round is complete
    if (activePlayers.length <= 1) return true;
    
    // Check if all active players have acted and matched the current bet
    for (const player of activePlayers) {
      if (!player.hasActed || (player.currentBet < currentBet && !player.isAllIn)) {
        return false;
      }
    }
    
    return true;
  }

  static resetPlayerActions(players: Player[]): Player[] {
    return players.map(player => ({
      ...player,
      hasActed: false
    }));
  }

  static moveDealer(dealerPosition: number, players: Player[]): number {
    const activePlayers = players.filter(p => p.isActive);
    if (activePlayers.length < 2) return dealerPosition;
    
    let newDealer = (dealerPosition + 1) % players.length;
    while (!players[newDealer]?.isActive && newDealer !== dealerPosition) {
      newDealer = (newDealer + 1) % players.length;
    }
    
    return newDealer;
  }

  static getNextPlayerWithChips(players: Player[], currentPosition: number): number {
    let nextPosition = (currentPosition + 1) % players.length;
    let attempts = 0;
    while (attempts < players.length) {
      const player = players[nextPosition];
      if (player && player.chips > 0) {
        return nextPosition;
      }
      nextPosition = (nextPosition + 1) % players.length;
      attempts++;
    }
    return -1;
  }

  static getSmallBlindPosition(dealerPosition: number, players: Player[]): number {
    const eligiblePlayers = players.filter(p => p.chips > 0);
    if (eligiblePlayers.length === 2) return dealerPosition; // Heads-up: dealer is SB
    return this.getNextPlayerWithChips(players, dealerPosition);
  }

  static getBigBlindPosition(dealerPosition: number, players: Player[]): number {
    const eligiblePlayers = players.filter(p => p.chips > 0);
    if (eligiblePlayers.length === 2) {
      return this.getNextPlayerWithChips(players, dealerPosition);
    }
    const smallBlindPos = this.getSmallBlindPosition(dealerPosition, players);
    return this.getNextPlayerWithChips(players, smallBlindPos);
  }
}
