import { PokerTable, Player, Card } from '../../../shared/types';
import { PokerEngine } from './PokerEngine';
import { AIPlayer } from './AIPlayer';
import { HandLogger } from './HandLogger';
import { v4 as uuidv4 } from 'uuid';

export class GameManager {
  private table: PokerTable;
  private deck: Card[] = [];
  private gameActive: boolean = false;
  private actionTimer?: NodeJS.Timeout;
  private socketHandler?: any; // Will be set by SocketHandler
  private handLogger: HandLogger;
  private actionCount: number = 0; // Prevent infinite loops
  private showdownPlayers: Player[] = []; // Track players in showdown

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
    
    // Initialize hand logger
    this.handLogger = new HandLogger();
    console.log(`[GameManager] Hand logger initialized. Log file: ${this.handLogger.getLogFilePath()}`);
  }

  addPlayer(userId: string, username: string, profileImage?: string): boolean {
    if (this.table.players.length >= 6) {
      return false; // Table is full
    }

    // Assign real player to position 3 (top-center seat)
    let position = 3;
    
    // Check if position 3 is already occupied
    const existingPlayer = this.table.players.find(p => p.position === position);
    if (existingPlayer) {
      // If position 3 is taken, find first available seat
      const occupiedPositions = this.table.players.map(p => p.position);
      let fallbackPosition = 0;
      while (occupiedPositions.includes(fallbackPosition) && fallbackPosition < 6) {
        fallbackPosition++;
      }
      position = fallbackPosition;
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
      isAllIn: false,
      avatarUrl: profileImage ? `http://localhost:5000${profileImage}` : undefined
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

  sitOutPlayer(userId: string): boolean {
    const player = this.table.players.find(p => p.userId === userId);
    if (!player) return false;

    // Mark player as sitting out (temporarily inactive)
    player.isActive = false;
    player.isFolded = true; // Fold their current hand if they have one
    
    console.log(`[GameManager] Player ${player.username} is sitting out`);
    
    // If it's their turn, move to next player
    if (this.table.currentPlayerPosition === player.position) {
      this.moveToNextPlayer();
    }
    
    // If game is running and too few active players, pause the game
    if (this.table.players.filter(p => p.isActive && !p.isAI).length < 1) {
      this.gameActive = false;
      this.clearActionTimer();
    }

    return true;
  }

  returnPlayerToTable(userId: string): boolean {
    const player = this.table.players.find(p => p.userId === userId);
    if (!player) return false;

    // Mark player as active again
    player.isActive = true;
    player.isFolded = false; // Reset folded status for next hand
    
    console.log(`[GameManager] Player ${player.username} is returning to table`);
    
    // If game was paused due to lack of players, restart it
    if (!this.gameActive && this.table.players.filter(p => p.isActive && !p.isAI).length >= 1) {
      this.gameActive = true;
      this.startNewHand();
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
    
    // Get blind positions for logging and for client
    const smallBlindPos = PokerEngine.getSmallBlindPosition(this.table.dealerPosition, this.table.players);
    const bigBlindPos = PokerEngine.getBigBlindPosition(this.table.dealerPosition, this.table.players);
    this.table.smallBlindPosition = smallBlindPos;
    this.table.bigBlindPosition = bigBlindPos;

    // Deal hole cards
    const { deck, players } = PokerEngine.dealHoleCards(this.deck, this.table.players);
    this.deck = deck;
    this.table.players = players;

    // Calculate initial pot from blinds
    this.table.pot = this.table.players.reduce((pot, player) => pot + player.currentBet, 0);
    
    // Start hand logging
    this.handLogger.startNewHand(this.table, this.table.dealerPosition, smallBlindPos, bigBlindPos);

    // Set first player to act (after big blind)
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
      if (smallBlindPlayer.chips === 0) {
        smallBlindPlayer.isAllIn = true;
      }
    }

    // Post big blind
    const bigBlindPlayer = this.table.players[bigBlindPos];
    if (bigBlindPlayer) {
      const bbAmount = Math.min(this.table.bigBlind, bigBlindPlayer.chips);
      bigBlindPlayer.chips -= bbAmount;
      bigBlindPlayer.currentBet = bbAmount;
      this.table.currentBet = bbAmount; // Current bet is set to big blind amount
      if (bigBlindPlayer.chips === 0) {
        bigBlindPlayer.isAllIn = true;
      }
    }

    console.log(`[GameManager] Posted blinds: SB=$${smallBlindPlayer?.currentBet || 0}, BB=$${bigBlindPlayer?.currentBet || 0}`);
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
    
    // Update pot calculation after any betting action
    this.table.pot = this.table.players.reduce((pot, p) => pot + p.currentBet, 0);
    
    // Log the action (only if not in showdown phase)
    if (this.table.gamePhase !== 'showdown') {
      this.handLogger.logAction(player, action, amount, this.table.gamePhase as 'preflop' | 'flop' | 'turn' | 'river', this.table);
    }
    
    console.log(`[GameManager] Player ${player.username} ${action}${amount ? ` $${amount}` : ''}. Current bet: $${player.currentBet}, Chips: $${player.chips}, Pot: $${this.table.pot}`);
    
    // Broadcast playerAction event for AI players (real players already get this from socket handler)
    if (player.isAI && this.socketHandler) {
      this.socketHandler.broadcastPlayerAction(player.userId || player.id, action, amount);
    }
    
    // Broadcast updated game state after action
    this.broadcastGameState();
  }

  private moveToNextPlayer(): void {
    console.log('[GameManager] Moving to next player...');
    
    // Check if only one player is left (everyone else folded)
    const activePlayers = this.table.players.filter(p => p.isActive && !p.isFolded);
    if (activePlayers.length <= 1) {
      console.log('[GameManager] Only one player left, going to showdown');
      this.showdown();
      return;
    }
    
    // Check if all remaining players are all-in (no chips left to act with)
    const allAllIn = activePlayers.every(p => p.isAllIn || p.chips === 0);
    if (allAllIn) {
      console.log('[GameManager] All remaining players are all-in, advancing phase');
      if (this.table.gamePhase === 'river') {
        this.showdown();
      } else {
        this.moveToNextPhase();
      }
      return;
    }
    
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
    
    // Reset action count for new phase
    this.actionCount = 0;
    
    // Check if only one player is left (everyone else folded)
    const activePlayers = this.table.players.filter(p => p.isActive && !p.isFolded);
    if (activePlayers.length <= 1) {
      console.log('[GameManager] Only one player left, going to showdown');
      this.showdown();
      return;
    }
    
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
    
    // Log community cards
    this.handLogger.logCommunityCards(cards, 'flop');
    
    // Add current bets to pot and reset for new round
    this.collectBetsIntoPot();
  }

  private dealTurn(): void {
    const { deck, cards } = PokerEngine.dealCommunityCards(this.deck, 1);
    this.deck = deck;
    this.table.communityCards.push(...cards);
    this.table.gamePhase = 'turn';
    
    // Log community cards
    this.handLogger.logCommunityCards(cards, 'turn');
    
    // Add current bets to pot and reset for new round
    this.collectBetsIntoPot();
  }

  private dealRiver(): void {
    const { deck, cards } = PokerEngine.dealCommunityCards(this.deck, 1);
    this.deck = deck;
    this.table.communityCards.push(...cards);
    this.table.gamePhase = 'river';
    
    // Log community cards
    this.handLogger.logCommunityCards(cards, 'river');
    
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
    
    const activePlayers = this.table.players.filter(p => !p.isFolded && p.isActive);
    let winner: Player;
    let winnerHand: { rank: number, tiebreaker: number, description: string };
    
    if (activePlayers.length === 1) {
      // Only one player left, they win
      // Don't collect bets again - pot already contains all bets
      winner = activePlayers[0];
      winnerHand = { rank: 0, tiebreaker: 0, description: 'Won by default' };
      this.showdownPlayers = []; // No showdown to show cards for
    } else {
      // Multiple players in showdown - collect final bets into pot
      this.collectBetsIntoPot();
      
      // Store showdown players for card revelation
      this.showdownPlayers = [...activePlayers];
      
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
    
    // Log hand completion
    this.handLogger.finishHand(
      winner.id,
      winner.username,
      winnerHand.description,
      this.table.pot,
      this.table
    );
    
    // Broadcast game state with winner information
    this.broadcastGameState();

    // Start new hand after 6 seconds (allowing time to see winner)
    setTimeout(() => {
      // AI chip reload logic
      if (this.socketHandler) {
        this.table.players.forEach(player => {
          if (player.isAI && player.chips === 0) {
            player.chips = 1000;
            this.socketHandler.broadcastPlayerAnnouncement(
              `${player.username} has reloaded with $1000 chips!`
            );
          }
        });
      }
      // Clear winner info and showdown players before new hand
      this.table.lastWinner = undefined;
      this.showdownPlayers = [];
      this.startNewHand();
    }, 6000);
  }

  private processPlayerAction(): void {
    this.clearActionTimer();
    
    // Safety check to prevent infinite loops
    this.actionCount++;
    if (this.actionCount > 100) {
      console.log('[GameManager] Too many actions, forcing next phase to prevent infinite loop');
      this.actionCount = 0;
      this.moveToNextPhase();
      return;
    }
    
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
      const thinkingTime = AIPlayer.getThinkingTime(currentPlayer);
      
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
      // Show cards if:
      // 1. It's the requesting player
      // 2. Training mode is enabled
      // 3. Player is in showdown (2+ players reached showdown)
      const shouldShowCards = player.userId === userId || 
                             this.table.isTrainingMode || 
                             this.showdownPlayers.some(sp => sp.id === player.id);
      
      if (shouldShowCards) {
        return player; // Show all cards
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
    // Must be a whole number
    if (amount !== Math.floor(amount)) {
      return false;
    }
    
    // Can't raise more than player has
    if (amount > player.chips + player.currentBet) {
      return false;
    }
    
    // Check if this is an all-in
    const isAllIn = amount === player.chips + player.currentBet;
    
    // If going all-in, always allow (even if below minimum raise)
    if (isAllIn) {
      console.log(`[GameManager] ${player.username} going all-in with $${amount}`);
      return true;
    }
    
    // Otherwise, must meet minimum raise requirement
    const minRaise = this.table.currentBet + this.table.bigBlind;
    if (amount < minRaise) {
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
