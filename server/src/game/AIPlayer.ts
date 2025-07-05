import { Player, Card } from '../../../shared/types';
import { PokerEngine } from './PokerEngine';

export class AIPlayer {
  static readonly AI_PERSONALITIES = [
    {
      name: 'Cool Hand Luke',
      emoji: '😎',
      difficulty: 'Expert',
      tightness: 0.8,
      aggressiveness: 0.7,
      bluffFrequency: 0.15,
      adaptability: 0.9,
      style: 'Tight-Aggressive',
      description: 'Never shows emotion, plays premium hands aggressively'
    },
    {
      name: 'Bluff Master Bob', 
      emoji: '🔥',
      difficulty: 'Expert',
      tightness: 0.3,
      aggressiveness: 0.9,
      bluffFrequency: 0.4,
      adaptability: 0.7,
      style: 'Loose-Aggressive',
      description: 'Loves to bluff and apply pressure'
    },
    {
      name: 'Calculator Kate',
      emoji: '🤓', 
      difficulty: 'Expert',
      tightness: 0.7,
      aggressiveness: 0.6,
      bluffFrequency: 0.1,
      adaptability: 0.8,
      style: 'Mathematical',
      description: 'Perfect pot odds and probability calculations'
    },
    {
      name: 'Shark Attack Sally',
      emoji: '😈',
      difficulty: 'Expert', 
      tightness: 0.6,
      aggressiveness: 0.8,
      bluffFrequency: 0.25,
      adaptability: 1.0,
      style: 'Adaptive-Aggressive',
      description: 'Reads opponents and adapts strategy'
    },
    {
      name: 'Wild Card Willie',
      emoji: '🎲',
      difficulty: 'Intermediate',
      tightness: 0.2,
      aggressiveness: 0.6,
      bluffFrequency: 0.3,
      adaptability: 0.4,
      style: 'Loose-Unpredictable', 
      description: 'Completely unpredictable loose cannon'
    },
    {
      name: 'Tournament Tom',
      emoji: '🏆',
      difficulty: 'Advanced',
      tightness: 0.7,
      aggressiveness: 0.5,
      bluffFrequency: 0.2,
      adaptability: 0.8,
      style: 'Tournament-Style',
      description: 'Conservative early, aggressive when needed'
    }
  ];

  static createAIPlayer(position: number): Player {
    const personality = this.AI_PERSONALITIES[position % this.AI_PERSONALITIES.length];
    const displayName = `${personality.name} ${personality.emoji}`;
    
    return {
      id: `ai_${position}_${Date.now()}`,
      userId: undefined, // AI players don't have user accounts
      username: displayName,
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
    
    const personality = this.getPersonality(player.username);
    const handStrength = PokerEngine.getHandStrength(player.holeCards, communityCards);
    const callAmount = currentBet - player.currentBet;
    const potOdds = callAmount > 0 ? callAmount / (pot + callAmount) : 0;
    
    // Apply personality-based decision making
    return this.makePersonalityBasedDecision(
      player, personality, handStrength, callAmount, pot, currentBet, bigBlind
    );
  }

  private static getPersonality(playerName: string) {
    // Extract personality from the AI name (removes emoji)
    const cleanName = playerName.replace(/[^\w\s]/gi, '').trim();
    return this.AI_PERSONALITIES.find(p => cleanName.includes(p.name)) || this.AI_PERSONALITIES[0];
  }

  private static makePersonalityBasedDecision(
    player: Player,
    personality: any,
    handStrength: number,
    callAmount: number,
    pot: number,
    currentBet: number,
    bigBlind: number
  ): { action: 'fold' | 'call' | 'raise' | 'check', amount?: number } {
    
    // Personality-based thresholds
    const foldThreshold = personality.tightness * 0.4;
    const raiseThreshold = 0.6 - (personality.aggressiveness * 0.3);
    const bluffChance = personality.bluffFrequency;
    
    // Can't call if not enough chips
    if (callAmount >= player.chips) {
      if (handStrength > (0.7 - personality.aggressiveness * 0.2)) {
        console.log(`[AI] ${player.username}: Going all-in with strong hand!`);
        return { action: 'call', amount: player.chips };
      }
      return { action: 'fold' };
    }
    
    // Special personality behaviors
    switch (personality.style) {
      case 'Mathematical':
        return this.mathematicalDecision(player, handStrength, callAmount, pot, currentBet, bigBlind);
      
      case 'Loose-Aggressive':
        return this.looseAggressiveDecision(player, handStrength, callAmount, pot, currentBet, bigBlind, bluffChance);
      
      case 'Tight-Aggressive':
        return this.tightAggressiveDecision(player, handStrength, callAmount, pot, currentBet, bigBlind);
      
      case 'Adaptive-Aggressive':
        return this.adaptiveDecision(player, handStrength, callAmount, pot, currentBet, bigBlind);
      
      case 'Loose-Unpredictable':
        return this.unpredictableDecision(player, handStrength, callAmount, pot, currentBet, bigBlind);
      
      default:
        return this.defaultDecision(player, personality, handStrength, callAmount, pot, currentBet, bigBlind);
    }
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

  // Calculator Kate - Perfect mathematical decisions
  private static mathematicalDecision(player: Player, handStrength: number, callAmount: number, pot: number, currentBet: number, bigBlind: number) {
    const potOdds = callAmount > 0 ? callAmount / (pot + callAmount) : 0;
    const impliedOdds = handStrength; // Simplified
    
    console.log(`[AI] ${player.username}: Calculating pot odds... ${(potOdds * 100).toFixed(1)}%`);
    
    if (currentBet === 0) {
      return handStrength > 0.6 ? 
        { action: 'raise', amount: currentBet + Math.floor(pot * 0.75) } : 
        { action: 'check' };
    }
    
    if (impliedOdds > potOdds && handStrength > 0.3) {
      return { action: 'call' };
    }
    
    return handStrength > 0.7 ? 
      { action: 'raise', amount: currentBet + bigBlind * 3 } : 
      { action: 'fold' };
  }

  // Bluff Master Bob - Aggressive bluffer
  private static looseAggressiveDecision(player: Player, handStrength: number, callAmount: number, pot: number, currentBet: number, bigBlind: number, bluffChance: number) {
    const isBluffing = Math.random() < bluffChance;
    
    if (isBluffing && callAmount < player.chips * 0.3) {
      console.log(`[AI] ${player.username}: Time to bluff! 🔥`);
      return { action: 'raise', amount: currentBet + Math.floor(pot * 1.2) };
    }
    
    if (currentBet === 0) {
      return handStrength > 0.3 || Math.random() < 0.4 ? 
        { action: 'raise', amount: bigBlind * (2 + Math.floor(Math.random() * 3)) } :
        { action: 'check' };
    }
    
    if (handStrength > 0.3 || isBluffing) {
      return Math.random() < 0.6 ? 
        { action: 'raise', amount: currentBet + bigBlind * 2 } :
        { action: 'call' };
    }
    
    return { action: 'fold' };
  }

  // Cool Hand Luke - Tight-aggressive
  private static tightAggressiveDecision(player: Player, handStrength: number, callAmount: number, pot: number, currentBet: number, bigBlind: number) {
    console.log(`[AI] ${player.username}: Analyzing situation... 😎`);
    
    if (handStrength < 0.5) {
      return { action: 'fold' };
    }
    
    if (currentBet === 0) {
      return handStrength > 0.7 ? 
        { action: 'raise', amount: bigBlind * 3 } :
        { action: 'check' };
    }
    
    if (handStrength > 0.8) {
      return { action: 'raise', amount: currentBet + Math.floor(pot * 0.8) };
    }
    
    return handStrength > 0.6 ? { action: 'call' } : { action: 'fold' };
  }

  // Shark Attack Sally - Adaptive player
  private static adaptiveDecision(player: Player, handStrength: number, callAmount: number, pot: number, currentBet: number, bigBlind: number) {
    // Simulates reading opponents (simplified)
    const tableImage = Math.random(); // 0-1, represents how aggressive table is
    const adjustment = tableImage > 0.6 ? 0.2 : -0.1; // Adapt to table
    
    console.log(`[AI] ${player.username}: Reading the table... 😈`);
    
    const adjustedThreshold = Math.max(0.2, 0.5 + adjustment);
    
    if (currentBet === 0) {
      return handStrength > adjustedThreshold ? 
        { action: 'raise', amount: bigBlind * (2 + Math.floor(tableImage * 3)) } :
        { action: 'check' };
    }
    
    if (handStrength > (0.7 + adjustment)) {
      return { action: 'raise', amount: currentBet + Math.floor(pot * (0.6 + tableImage * 0.4)) };
    }
    
    return handStrength > adjustedThreshold ? { action: 'call' } : { action: 'fold' };
  }

  // Wild Card Willie - Unpredictable
  private static unpredictableDecision(player: Player, handStrength: number, callAmount: number, pot: number, currentBet: number, bigBlind: number) {
    const randomFactor = Math.random();
    
    console.log(`[AI] ${player.username}: Feeling lucky! 🎲`);
    
    // Sometimes makes completely random decisions
    if (randomFactor < 0.2) {
      const actions = ['fold', 'call', 'raise'];
      const randomAction = actions[Math.floor(Math.random() * actions.length)];
      
      if (randomAction === 'raise' && callAmount < player.chips) {
        return { action: 'raise', amount: currentBet + bigBlind * (1 + Math.floor(Math.random() * 5)) };
      }
      return { action: randomAction as 'fold' | 'call' };
    }
    
    // Otherwise uses loose logic
    if (currentBet === 0) {
      return randomFactor > 0.4 ? 
        { action: 'raise', amount: bigBlind * Math.ceil(randomFactor * 4) } :
        { action: 'check' };
    }
    
    if (handStrength > 0.2 && randomFactor > 0.3) {
      return { action: 'call' };
    }
    
    return { action: 'fold' };
  }

  // Default decision for other personalities
  private static defaultDecision(player: Player, personality: any, handStrength: number, callAmount: number, pot: number, currentBet: number, bigBlind: number) {
    const foldThreshold = personality.tightness * 0.4;
    const raiseThreshold = 0.6 - (personality.aggressiveness * 0.3);
    
    if (currentBet === 0) {
      return handStrength > raiseThreshold ? 
        { action: 'raise', amount: bigBlind * 2 } :
        { action: 'check' };
    }
    
    if (handStrength < foldThreshold) {
      return { action: 'fold' };
    }
    
    if (handStrength > raiseThreshold && Math.random() < personality.aggressiveness) {
      return { action: 'raise', amount: currentBet + Math.floor(pot * 0.5) };
    }
    
    return handStrength > 0.4 ? { action: 'call' } : { action: 'fold' };
  }
}
