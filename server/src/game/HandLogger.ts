import { Player, Card, PokerTable } from '../../../shared/types';
import * as fs from 'fs';
import * as path from 'path';

interface PlayerStartState {
  playerId: string;
  username: string;
  startingChips: number;
  position: number;
  holeCards: Card[];
}

interface PlayerAction {
  playerId: string;
  username: string;
  action: 'fold' | 'call' | 'raise' | 'check' | 'blind';
  amount?: number;
  timestamp: Date;
  phase: 'preflop' | 'flop' | 'turn' | 'river';
  totalChipsAfterAction: number;
  currentBet: number;
}

interface HandResult {
  winnerId: string;
  winnerUsername: string;
  winningHand: string;
  winnings: number;
  finalChips: number;
}

interface HandLog {
  handNumber: number;
  timestamp: Date;
  dealerPosition: number;
  dealerUsername: string;
  smallBlind: {
    position: number;
    username: string;
    amount: number;
  };
  bigBlind: {
    position: number;
    username: string;
    amount: number;
  };
  players: PlayerStartState[];
  communityCards: {
    flop: Card[];
    turn: Card | null;
    river: Card | null;
  };
  actions: PlayerAction[];
  potSize: number;
  result: HandResult;
  playerFinalStates: {
    playerId: string;
    username: string;
    startingChips: number;
    endingChips: number;
    netChange: number;
  }[];
}

export class HandLogger {
  private currentHand: Partial<HandLog> | null = null;
  private handNumber: number = 0;
  private logDirectory: string;
  private logFilePath: string;

  constructor() {
    // Create logs directory if it doesn't exist
    this.logDirectory = path.join(__dirname, '../../logs');
    if (!fs.existsSync(this.logDirectory)) {
      fs.mkdirSync(this.logDirectory, { recursive: true });
    }

    // Create log file with timestamp
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    this.logFilePath = path.join(this.logDirectory, `poker-hands-${dateStr}.log`);
    
    // Initialize log file with header
    this.initializeLogFile();
  }

  private initializeLogFile(): void {
    const header = `
===========================================
     CLICK POKER - HAND HISTORY LOG
===========================================
Session started: ${new Date().toLocaleString()}
===========================================

`;
    fs.writeFileSync(this.logFilePath, header);
  }

  startNewHand(table: PokerTable, dealerPos: number, sbPos: number, bbPos: number): void {
    this.handNumber++;
    
    const dealer = table.players.find(p => p.position === dealerPos);
    const smallBlindPlayer = table.players.find(p => p.position === sbPos);
    const bigBlindPlayer = table.players.find(p => p.position === bbPos);

    this.currentHand = {
      handNumber: this.handNumber,
      timestamp: new Date(),
      dealerPosition: dealerPos,
      dealerUsername: dealer?.username || 'Unknown',
      smallBlind: {
        position: sbPos,
        username: smallBlindPlayer?.username || 'Unknown',
        amount: table.smallBlind
      },
      bigBlind: {
        position: bbPos,
        username: bigBlindPlayer?.username || 'Unknown',
        amount: table.bigBlind
      },
      players: table.players.filter(p => p.isActive).map(player => ({
        playerId: player.id,
        username: player.username,
        startingChips: player.chips + player.currentBet, // Add back any blinds posted
        position: player.position,
        holeCards: [...player.holeCards]
      })),
      communityCards: {
        flop: [],
        turn: null,
        river: null
      },
      actions: [],
      potSize: 0,
      playerFinalStates: []
    };

    // Log blinds as actions
    if (smallBlindPlayer && smallBlindPlayer.currentBet > 0) {
      this.logAction(smallBlindPlayer, 'blind', smallBlindPlayer.currentBet, 'preflop', table);
    }
    if (bigBlindPlayer && bigBlindPlayer.currentBet > 0) {
      this.logAction(bigBlindPlayer, 'blind', bigBlindPlayer.currentBet, 'preflop', table);
    }

    console.log(`[HandLogger] Started hand #${this.handNumber} - Dealer: ${dealer?.username}`);
  }

  logAction(player: Player, action: 'fold' | 'call' | 'raise' | 'check' | 'blind', amount: number | undefined, phase: 'preflop' | 'flop' | 'turn' | 'river', table: PokerTable): void {
    if (!this.currentHand) return;

    const playerAction: PlayerAction = {
      playerId: player.id,
      username: player.username,
      action,
      amount,
      timestamp: new Date(),
      phase,
      totalChipsAfterAction: player.chips,
      currentBet: player.currentBet
    };

    this.currentHand.actions = this.currentHand.actions || [];
    this.currentHand.actions.push(playerAction);
    this.currentHand.potSize = table.pot;

    console.log(`[HandLogger] ${player.username} ${action}${amount ? ` $${amount}` : ''} in ${phase}`);
  }

  logCommunityCards(cards: Card[], phase: 'flop' | 'turn' | 'river'): void {
    if (!this.currentHand) return;

    switch (phase) {
      case 'flop':
        this.currentHand.communityCards!.flop = [...cards];
        break;
      case 'turn':
        this.currentHand.communityCards!.turn = cards[0];
        break;
      case 'river':
        this.currentHand.communityCards!.river = cards[0];
        break;
    }

    console.log(`[HandLogger] ${phase.toUpperCase()}: ${this.formatCards(cards)}`);
  }

  finishHand(winnerId: string, winnerUsername: string, winningHand: string, winnings: number, finalTable: PokerTable): void {
    if (!this.currentHand) return;

    const winner = finalTable.players.find(p => p.id === winnerId);
    
    this.currentHand.result = {
      winnerId,
      winnerUsername,
      winningHand,
      winnings,
      finalChips: winner?.chips || 0
    };

    // Calculate final states for all players
    this.currentHand.playerFinalStates = this.currentHand.players!.map(startPlayer => {
      const finalPlayer = finalTable.players.find(p => p.id === startPlayer.playerId);
      const endingChips = finalPlayer?.chips || 0;
      
      return {
        playerId: startPlayer.playerId,
        username: startPlayer.username,
        startingChips: startPlayer.startingChips,
        endingChips,
        netChange: endingChips - startPlayer.startingChips
      };
    });

    // Write complete hand to log file
    this.writeHandToFile();
    
    console.log(`[HandLogger] Hand #${this.handNumber} completed - Winner: ${winnerUsername} ($${winnings})`);
    
    // Reset for next hand
    this.currentHand = null;
  }

  private writeHandToFile(): void {
    if (!this.currentHand) return;

    const hand = this.currentHand as HandLog;
    let logEntry = `
HAND #${hand.handNumber}
Date: ${hand.timestamp.toLocaleString()}
Dealer: ${hand.dealerUsername} (Position ${hand.dealerPosition})
Small Blind: ${hand.smallBlind.username} (Position ${hand.smallBlind.position}) - $${hand.smallBlind.amount}
Big Blind: ${hand.bigBlind.username} (Position ${hand.bigBlind.position}) - $${hand.bigBlind.amount}

STARTING POSITIONS:
`;

    // Starting positions
    hand.players.forEach(player => {
      const holeCardsStr = this.formatCards(player.holeCards);
      logEntry += `  Position ${player.position}: ${player.username} - $${player.startingChips} [${holeCardsStr}]\n`;
    });

    // Community cards
    logEntry += `\nCOMMUNITY CARDS:\n`;
    if (hand.communityCards.flop.length > 0) {
      logEntry += `  FLOP: ${this.formatCards(hand.communityCards.flop)}\n`;
    }
    if (hand.communityCards.turn) {
      logEntry += `  TURN: ${this.formatCard(hand.communityCards.turn)}\n`;
    }
    if (hand.communityCards.river) {
      logEntry += `  RIVER: ${this.formatCard(hand.communityCards.river)}\n`;
    }

    // Actions by phase
    logEntry += `\nACTIONS:\n`;
    const phases = ['preflop', 'flop', 'turn', 'river'] as const;
    
    phases.forEach(phase => {
      const phaseActions = hand.actions.filter(action => action.phase === phase);
      if (phaseActions.length > 0) {
        logEntry += `  ${phase.toUpperCase()}:\n`;
        phaseActions.forEach(action => {
          const actionStr = action.action === 'blind' ? 
            `posts ${action.action}` : 
            action.action;
          const amountStr = action.amount ? ` $${action.amount}` : '';
          logEntry += `    ${action.username}: ${actionStr}${amountStr} (Chips: $${action.totalChipsAfterAction}, Bet: $${action.currentBet})\n`;
        });
      }
    });

    // Results
    logEntry += `\nRESULTS:\n`;
    logEntry += `  Total Pot: $${hand.potSize}\n`;
    logEntry += `  Winner: ${hand.result.winnerUsername} with ${hand.result.winningHand}\n`;
    logEntry += `  Winnings: $${hand.result.winnings}\n`;

    // Final chip counts
    logEntry += `\nFINAL CHIP COUNTS:\n`;
    hand.playerFinalStates.forEach(player => {
      const changeStr = player.netChange >= 0 ? `+$${player.netChange}` : `-$${Math.abs(player.netChange)}`;
      logEntry += `  ${player.username}: $${player.startingChips} → $${player.endingChips} (${changeStr})\n`;
    });

    logEntry += `\n${'='.repeat(80)}\n`;

    // Append to log file
    fs.appendFileSync(this.logFilePath, logEntry);
  }

  private formatCard(card: Card): string {
    const suitSymbols = {
      hearts: '♥',
      diamonds: '♦',
      clubs: '♣',
      spades: '♠'
    };
    return `${card.rank}${suitSymbols[card.suit]}`;
  }

  private formatCards(cards: Card[]): string {
    return cards.map(card => this.formatCard(card)).join(' ');
  }

  getCurrentHandNumber(): number {
    return this.handNumber;
  }

  getLogFilePath(): string {
    return this.logFilePath;
  }
}
