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
    
    return -1;
  }

  static calculatePot(players: Player[]): number {
    return players.reduce((pot, player) => pot + player.currentBet, 0);
  }

  static getHandStrength(holeCards: Card[], communityCards: Card[]): number {
    // Simple hand strength calculation (0-1, higher is better)
    // This is a simplified version - a full implementation would evaluate poker hands
    const allCards = [...holeCards, ...communityCards];
    
    if (allCards.length < 2) return Math.random() * 0.3; // Pre-flop random
    if (allCards.length < 5) return Math.random() * 0.6; // Flop/Turn
    
    // For now, return a random value weighted by high cards
    const highCardValue = this.getHighCardValue(holeCards);
    return Math.min(0.9, highCardValue + Math.random() * 0.3);
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
      hasActed: false,
      currentBet: 0
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

  static getSmallBlindPosition(dealerPosition: number, players: Player[]): number {
    const activePlayers = players.filter(p => p.isActive);
    if (activePlayers.length === 2) return dealerPosition; // Heads-up: dealer is small blind
    
    return this.getNextActivePlayer(players, dealerPosition);
  }

  static getBigBlindPosition(dealerPosition: number, players: Player[]): number {
    const activePlayers = players.filter(p => p.isActive);
    if (activePlayers.length === 2) {
      return this.getNextActivePlayer(players, dealerPosition);
    }
    
    const smallBlindPos = this.getSmallBlindPosition(dealerPosition, players);
    return this.getNextActivePlayer(players, smallBlindPos);
  }
}
