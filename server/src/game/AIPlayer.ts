import { Player, Card } from '../../../shared/types';
import { PokerEngine } from './PokerEngine';

export class AIPlayer {
  static readonly AI_NAMES = [
    'Bot_Ace', 'Bot_King', 'Bot_Queen', 'Bot_Jack', 'Bot_Ten',
    'CyberShark', 'PokerBot', 'ChipStack', 'BluffMaster', 'CardCounter'
  ];

  static createAIPlayer(position: number): Player {
    const name = this.AI_NAMES[position % this.AI_NAMES.length];
    
    return {
      id: `ai_${position}_${Date.now()}`,
      userId: undefined, // AI players don't have user accounts
      username: name,
      chips: 1000,
      holeCards: [],
      position,
      isActive: true,
      isAI: true,
      currentBet: 0,
      hasActed: false,
      isFolded: false,
      isAllIn: false
    };
  }

  static makeDecision(
    player: Player,
    communityCards: Card[],
    currentBet: number,
    pot: number,
    smallBlind: number,
    bigBlind: number
  ): { action: 'fold' | 'call' | 'raise' | 'check', amount?: number } {
    
    const handStrength = PokerEngine.getHandStrength(player.holeCards, communityCards);
    const callAmount = currentBet - player.currentBet;
    const potOdds = callAmount > 0 ? callAmount / (pot + callAmount) : 0;
    const chipRatio = player.chips / 1000; // Normalize to starting stack
    
    // AI personality factors (each AI can have different tendencies)
    const aggressiveness = this.getAggressiveness(player.username);
    const tightness = this.getTightness(player.username);
    
    // Decision thresholds based on hand strength and situation
    const foldThreshold = tightness * 0.3;
    const raiseThreshold = 0.7 - (aggressiveness * 0.2);
    
    // Can't call if not enough chips
    if (callAmount >= player.chips) {
      if (handStrength > 0.8) {
        return { action: 'call', amount: player.chips }; // All-in with strong hand
      } else {
        return { action: 'fold' };
      }
    }
    
    // No current bet - can check or raise
    if (currentBet === 0 || callAmount === 0) {
      if (handStrength > raiseThreshold && Math.random() < aggressiveness) {
        const raiseAmount = this.calculateRaiseAmount(pot, bigBlind, player.chips, handStrength);
        return { action: 'raise', amount: raiseAmount };
      }
      return { action: 'check' };
    }
    
    // Fold if hand is too weak
    if (handStrength < foldThreshold) {
      return { action: 'fold' };
    }
    
    // Call if hand is decent and pot odds are good
    if (handStrength > 0.4 && potOdds < 0.5) {
      return { action: 'call' };
    }
    
    // Raise with strong hands
    if (handStrength > raiseThreshold && Math.random() < (aggressiveness + handStrength) / 2) {
      const raiseAmount = this.calculateRaiseAmount(pot, bigBlind, player.chips, handStrength);
      return { action: 'raise', amount: currentBet + raiseAmount };
    }
    
    // Default to call if we reach here
    if (handStrength > 0.3) {
      return { action: 'call' };
    }
    
    return { action: 'fold' };
  }

  private static getAggressiveness(name: string): number {
    // Different AI personalities
    const aggressive = ['BluffMaster', 'CyberShark', 'Bot_Ace'];
    const moderate = ['PokerBot', 'ChipStack', 'Bot_King'];
    
    if (aggressive.includes(name)) return 0.8;
    if (moderate.includes(name)) return 0.5;
    return 0.3; // Conservative
  }

  private static getTightness(name: string): number {
    // How selective the AI is with hands
    const tight = ['CardCounter', 'Bot_Queen', 'ChipStack'];
    const loose = ['BluffMaster', 'Bot_Ten', 'CyberShark'];
    
    if (tight.includes(name)) return 0.8;
    if (loose.includes(name)) return 0.3;
    return 0.5; // Balanced
  }

  private static calculateRaiseAmount(
    pot: number,
    bigBlind: number,
    availableChips: number,
    handStrength: number
  ): number {
    // Base raise size (minimum 2x big blind)
    let raiseSize = Math.max(bigBlind * 2, Math.floor(pot * 0.5));
    
    // Adjust based on hand strength
    if (handStrength > 0.9) {
      raiseSize = Math.min(Math.floor(pot * 1.5), Math.floor(availableChips * 0.3)); // Big raise with monster hands
    } else if (handStrength > 0.7) {
      raiseSize = Math.min(Math.floor(pot * 0.75), Math.floor(availableChips * 0.2)); // Medium raise
    }
    
    // Ensure the raise amount is:
    // 1. At least the big blind
    // 2. A whole number
    // 3. Not more than available chips
    raiseSize = Math.max(bigBlind, Math.floor(raiseSize));
    return Math.min(raiseSize, availableChips);
  }

  static shouldBluff(
    player: Player,
    communityCards: Card[],
    pot: number,
    opponentsCount: number
  ): boolean {
    const aggressiveness = this.getAggressiveness(player.username);
    const bluffFrequency = aggressiveness * 0.3; // Max 30% bluff frequency for most aggressive
    
    // Less likely to bluff against many opponents
    const opponentAdjustment = Math.max(0.1, 1 - (opponentsCount - 1) * 0.2);
    
    // More likely to bluff in later streets with scary boards
    const boardFactor = communityCards.length >= 4 ? 1.2 : 0.8;
    
    return Math.random() < (bluffFrequency * opponentAdjustment * boardFactor);
  }

  static getThinkingTime(): number {
    // Random delay to simulate thinking (0.5-1.5 seconds)
    return 500 + Math.random() * 1000;
  }
}
