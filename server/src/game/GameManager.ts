import { PokerTable, Player, Card } from '../../../shared/types';
import { PokerEngine } from './PokerEngine';
import { AIPlayer } from './AIPlayer';
import { v4 as uuidv4 } from 'uuid';

export class GameManager {
  private table: PokerTable;
  private deck: Card[] = [];
  private gameActive: boolean = false;
  private actionTimer?: NodeJS.Timeout;
  private socketHandler?: any; // Will be set by SocketHandler

  constructor(tableId?: string) {
    this.table = {
      id: tableId || uuidv4(),
      players: [],
      communityCards: [],
      pot: 0,
      currentBet: 0,
      smallBlind: 10,
      bigBlind: 20,
      dealerPosition: 0,
      currentPlayerPosition: 0,
      gamePhase: 'preflop',
      isTrainingMode: false
    };
  }

  addPlayer(userId: string, username: string): boolean {
    if (this.table.players.length >= 6) {
      return false; // Table is full
    }

    // Find first available seat
    const occupiedPositions = this.table.players.map(p => p.position);
    let position = 0;
    while (occupiedPositions.includes(position) && position < 6) {
      position++;
    }

    const newPlayer: Player = {
      id: uuidv4(),
      userId,
      username,
      chips: 1000,
      holeCards: [],
      position,
      isActive: true,
      isAI: false,
      currentBet: 0,
      hasActed: false,
      isFolded: false,
      isAllIn: false
    };

    this.table.players.push(newPlayer);
    this.fillEmptySeatsWithAI();
    
    // Start game if we have enough players
    if (this.table.players.length >= 2 && !this.gameActive) {
      console.log('[GameManager] Starting new hand...');
      this.startNewHand();
    } else {
      // Broadcast updated player list even if game hasn't started
      this.broadcastGameState();
    }

    return true;
  }

  removePlayer(userId: string): boolean {
    const playerIndex = this.table.players.findIndex(p => p.userId === userId);
    if (playerIndex === -1) return false;

    this.table.players.splice(playerIndex, 1);
    
    // If game is running and too few players, pause the game
    if (this.table.players.filter(p => !p.isAI).length < 1) {
      this.gameActive = false;
      this.clearActionTimer();
    }

    return true;
  }

  private fillEmptySeatsWithAI(): void {
    const currentPlayers = this.table.players.length;
    const maxPlayers = 6;
    
    for (let i = currentPlayers; i < maxPlayers; i++) {
      let position = 0;
      const occupiedPositions = this.table.players.map(p => p.position);
      while (occupiedPositions.includes(position)) {
        position++;
      }
      
      const aiPlayer = AIPlayer.createAIPlayer(position);
      this.table.players.push(aiPlayer);
    }
  }

  startNewHand(): void {
    if (this.table.players.filter(p => p.isActive).length < 2) return;

    this.gameActive = true;
    this.deck = PokerEngine.createDeck();
    
    // Reset all players for new hand
    this.table.players = this.table.players.map(player => ({
      ...player,
      holeCards: [],
      currentBet: 0,
      hasActed: false,
      isFolded: false,
      isAllIn: false,
      isActive: player.chips > 0 // Only active if they have chips
    }));

    this.table.communityCards = [];
    this.table.pot = 0;
    this.table.currentBet = 0;
    this.table.gamePhase = 'preflop';

    // Move dealer button
    this.table.dealerPosition = PokerEngine.moveDealer(this.table.dealerPosition, this.table.players);

    // Post blinds
    this.postBlinds();

    // Deal hole cards
    const { deck, players } = PokerEngine.dealHoleCards(this.deck, this.table.players);
    this.deck = deck;
    this.table.players = players;

    // Set first player to act (after big blind)
    const bigBlindPos = PokerEngine.getBigBlindPosition(this.table.dealerPosition, this.table.players);
    this.table.currentPlayerPosition = PokerEngine.getNextActivePlayer(this.table.players, bigBlindPos);

    // Broadcast initial game state
    this.broadcastGameState();
    
    this.processPlayerAction();
  }

  private postBlinds(): void {
    const smallBlindPos = PokerEngine.getSmallBlindPosition(this.table.dealerPosition, this.table.players);
    const bigBlindPos = PokerEngine.getBigBlindPosition(this.table.dealerPosition, this.table.players);

    // Post small blind
    const smallBlindPlayer = this.table.players[smallBlindPos];
    if (smallBlindPlayer) {
      const sbAmount = Math.min(this.table.smallBlind, smallBlindPlayer.chips);
      smallBlindPlayer.chips -= sbAmount;
      smallBlindPlayer.currentBet = sbAmount;
      this.table.currentBet = sbAmount;
    }

    // Post big blind
    const bigBlindPlayer = this.table.players[bigBlindPos];
    if (bigBlindPlayer) {
      const bbAmount = Math.min(this.table.bigBlind, bigBlindPlayer.chips);
      bigBlindPlayer.chips -= bbAmount;
      bigBlindPlayer.currentBet = bbAmount;
      this.table.currentBet = bbAmount;
    }

    this.table.pot = PokerEngine.calculatePot(this.table.players);
  }

  playerAction(userId: string, action: 'fold' | 'call' | 'raise' | 'check', amount?: number): boolean {
    console.log(`[GameManager] Received action from ${userId}: ${action} ${amount || ''}`);
    const currentPlayer = this.table.players[this.table.currentPlayerPosition];
    
    if (!currentPlayer || currentPlayer.userId !== userId || currentPlayer.hasActed) {
      return false; // Not this player's turn or already acted
    }

    this.clearActionTimer(); // The player acted, so clear the auto-fold timer

    this.processAction(currentPlayer, action, amount);
    this.moveToNextPlayer();
    
    return true;
  }

  private processAction(player: Player, action: 'fold' | 'call' | 'raise' | 'check', amount?: number): void {
    player.hasActed = true;

    switch (action) {
      case 'fold':
        player.isFolded = true;
        break;

      case 'check':
        // Can only check if no current bet
        if (this.table.currentBet === player.currentBet) {
          // Valid check
        } else {
          // Invalid check, treat as fold
          player.isFolded = true;
        }
        break;

      case 'call':
        const callAmount = Math.min(
          this.table.currentBet - player.currentBet,
          player.chips
        );
        player.chips -= callAmount;
        player.currentBet += callAmount;
        if (player.chips === 0) {
          player.isAllIn = true;
        }
        break;

      case 'raise':
        if (amount && this.isValidRaise(amount, player)) {
          // Ensure raise amount is a whole number and meets minimums
          const validatedAmount = this.validateBetAmount(amount);
          const totalBet = Math.min(validatedAmount, player.chips + player.currentBet);
          const additionalBet = totalBet - player.currentBet;
          player.chips -= additionalBet;
          player.currentBet = totalBet;
          this.table.currentBet = totalBet;
          
          // Reset other players' hasActed status for this betting round
          this.table.players.forEach(p => {
            if (p.id !== player.id && !p.isFolded && !p.isAllIn) {
              p.hasActed = false;
            }
          });

          if (player.chips === 0) {
            player.isAllIn = true;
          }
        } else {
          // Invalid raise, treat as call
          this.processAction(player, 'call');
        }
        break;
    }
    
    // Broadcast updated game state after action
    this.broadcastGameState();
  }

  private moveToNextPlayer(): void {
    console.log('[GameManager] Moving to next player...');
    // Check if betting round is complete
    if (PokerEngine.isRoundComplete(this.table.players, this.table.currentBet)) {
      this.moveToNextPhase();
    } else {
      // Move to next active player
      const nextPosition = PokerEngine.getNextActivePlayer(
        this.table.players,
        this.table.currentPlayerPosition
      );
      
      // If no valid next player found, move to next phase
      if (nextPosition === -1) {
        console.log('[GameManager] No valid next player found, moving to next phase');
        this.moveToNextPhase();
      } else {
        this.table.currentPlayerPosition = nextPosition;
        this.processPlayerAction();
      }
    }
  }

  private moveToNextPhase(): void {
    console.log('[GameManager] Moving to next phase...');
    // Reset players for next phase
    this.table.players = PokerEngine.resetPlayerActions(this.table.players);

    switch (this.table.gamePhase) {
      case 'preflop':
        this.dealFlop();
        break;
      case 'flop':
        this.dealTurn();
        break;
      case 'turn':
        this.dealRiver();
        break;
      case 'river':
        this.showdown();
        return;
    }

    // Set first player to act (after dealer)
    this.table.currentPlayerPosition = PokerEngine.getNextActivePlayer(
      this.table.players,
      this.table.dealerPosition
    );
    
    // Broadcast game state after phase change
    this.broadcastGameState();
    
    this.processPlayerAction();
  }

  private dealFlop(): void {
    const { deck, cards } = PokerEngine.dealCommunityCards(this.deck, 3);
    this.deck = deck;
    this.table.communityCards = cards;
    this.table.gamePhase = 'flop';
    
    // Add current bets to pot and reset for new round
    this.collectBetsIntoPot();
  }

  private dealTurn(): void {
    const { deck, cards } = PokerEngine.dealCommunityCards(this.deck, 1);
    this.deck = deck;
    this.table.communityCards.push(...cards);
    this.table.gamePhase = 'turn';
    
    // Add current bets to pot and reset for new round
    this.collectBetsIntoPot();
  }

  private dealRiver(): void {
    const { deck, cards } = PokerEngine.dealCommunityCards(this.deck, 1);
    this.deck = deck;
    this.table.communityCards.push(...cards);
    this.table.gamePhase = 'river';
    
    // Add current bets to pot and reset for new round
    this.collectBetsIntoPot();
  }

  private collectBetsIntoPot(): void {
    // Add all current bets to the pot
    const currentRoundBets = this.table.players.reduce((total, player) => total + player.currentBet, 0);
    this.table.pot += currentRoundBets;
    
    // Reset current bets for new round
    this.table.players.forEach(player => {
      player.currentBet = 0;
    });
    this.table.currentBet = 0;
    
    console.log(`[GameManager] Collected $${currentRoundBets} into pot. Total pot: $${this.table.pot}`);
  }

  private showdown(): void {
    this.table.gamePhase = 'showdown';
    
    // Collect final bets into pot
    this.collectBetsIntoPot();
    
    const activePlayers = this.table.players.filter(p => !p.isFolded && p.isActive);
    let winner: Player;
    let winnerHand: { rank: number, tiebreaker: number, description: string };
    
    if (activePlayers.length === 1) {
      // Only one player left, they win
      winner = activePlayers[0];
      winnerHand = { rank: 0, tiebreaker: 0, description: 'Won by default' };
    } else {
      // Evaluate all hands and find the best one
      const playerHands = activePlayers.map(player => ({
        player,
        hand: PokerEngine.evaluateHand(player.holeCards, this.table.communityCards)
      }));
      
      // Sort by hand rank (highest first), then by tiebreaker
      playerHands.sort((a, b) => {
        if (a.hand.rank !== b.hand.rank) {
          return b.hand.rank - a.hand.rank; // Higher rank wins
        }
        return b.hand.tiebreaker - a.hand.tiebreaker; // Higher tiebreaker wins
      });
      
      winner = playerHands[0].player;
      winnerHand = playerHands[0].hand;
      
      // Log all hands for debugging
      console.log('[GameManager] Showdown results:');
      playerHands.forEach(({ player, hand }, index) => {
        console.log(`  ${index + 1}. ${player.username}: ${hand.description} (Rank: ${hand.rank}, Tiebreaker: ${hand.tiebreaker})`);
      });
    }
    
    // Set winner information
    this.table.lastWinner = {
      playerId: winner.id,
      username: winner.username,
      winnings: this.table.pot,
      handDescription: winnerHand.description
    };
    
    // Give winnings to winner
    winner.chips += this.table.pot;
    
    console.log(`[GameManager] ${winner.username} wins $${this.table.pot} with ${winnerHand.description}!`);
    
    // Broadcast game state with winner information
    this.broadcastGameState();

    // Start new hand after 6 seconds (allowing time to see winner)
    setTimeout(() => {
      // Clear winner info before new hand
      this.table.lastWinner = undefined;
      this.startNewHand();
    }, 6000);
  }

  private processPlayerAction(): void {
    this.clearActionTimer();
    
    // Check if currentPlayerPosition is valid
    if (this.table.currentPlayerPosition < 0 || this.table.currentPlayerPosition >= this.table.players.length) {
      console.log(`[GameManager] Invalid player position: ${this.table.currentPlayerPosition}, moving to next phase`);
      this.moveToNextPhase();
      return;
    }
    
    const currentPlayer = this.table.players[this.table.currentPlayerPosition];
    console.log(`[GameManager] Processing action for player: ${currentPlayer?.username} at position ${this.table.currentPlayerPosition}`);
    if (!currentPlayer || currentPlayer.isFolded || currentPlayer.isAllIn) {
      this.moveToNextPlayer();
      return;
    }

    if (currentPlayer.isAI) {
      // AI player action with thinking delay
      const thinkingTime = AIPlayer.getThinkingTime();
      
      this.actionTimer = setTimeout(() => {
        const decision = AIPlayer.makeDecision(
          currentPlayer,
          this.table.communityCards,
          this.table.currentBet,
          this.table.pot,
          this.table.smallBlind,
          this.table.bigBlind
        );

        this.processAction(currentPlayer, decision.action, decision.amount);
        this.moveToNextPlayer();
      }, thinkingTime);
    } else {
      // Human player - set timeout for action
      this.actionTimer = setTimeout(() => {
        // If human player doesn't act in time, fold them
        this.processAction(currentPlayer, 'fold');
        this.moveToNextPlayer();
      }, 30000); // 30 seconds to act
    }
  }

  private clearActionTimer(): void {
    if (this.actionTimer) {
      clearTimeout(this.actionTimer);
      this.actionTimer = undefined;
    }
  }

  getTableState(): PokerTable {
    return { ...this.table };
  }

  getPlayerView(userId: string): PokerTable {
    // Return table state with hidden information for other players
    const tableView = { ...this.table };
    
    tableView.players = this.table.players.map(player => {
      if (player.userId === userId || this.table.isTrainingMode) {
        return player; // Show all cards to the requesting player or in training mode
      } else {
        return {
          ...player,
          holeCards: [] // Hide other players' hole cards
        };
      }
    });

    return tableView;
  }

  toggleTrainingMode(): void {
    this.table.isTrainingMode = !this.table.isTrainingMode;
  }

  setSocketHandler(socketHandler: any): void {
    this.socketHandler = socketHandler;
  }

  private broadcastGameState(): void {
    if (this.socketHandler) {
      this.socketHandler.broadcastGameState('main-table');
    }
  }

  private isValidRaise(amount: number, player: Player): boolean {
    // Minimum raise must be at least the big blind more than current bet
    const minRaise = this.table.currentBet + this.table.bigBlind;
    
    // Must be a whole number
    if (amount !== Math.floor(amount)) {
      return false;
    }
    
    // Must be at least minimum raise amount
    if (amount < minRaise) {
      return false;
    }
    
    // Can't raise more than player has
    if (amount > player.chips + player.currentBet) {
      return false;
    }
    
    return true;
  }

  private validateBetAmount(amount: number): number {
    // Ensure bet is a whole number
    let validAmount = Math.floor(amount);
    
    // Ensure minimum bet is at least the small blind
    validAmount = Math.max(validAmount, this.table.smallBlind);
    
    return validAmount;
  }
}
