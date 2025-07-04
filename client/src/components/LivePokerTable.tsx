import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { io, Socket } from 'socket.io-client';
import UserProfile from './UserProfile';
import './PokerTable.css';

// Simplified types for client-side
interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  rank: 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
}

interface Player {
  id: string;
  userId?: string;
  username: string;
  chips: number;
  holeCards: Card[];
  position: number;
  isActive: boolean;
  isAI: boolean;
  currentBet: number;
  hasActed: boolean;
  isFolded: boolean;
  isAllIn: boolean;
}

interface PokerTable {
  id: string;
  players: Player[];
  communityCards: Card[];
  pot: number;
  currentBet: number;
  smallBlind: number;
  bigBlind: number;
  dealerPosition: number;
  currentPlayerPosition: number;
  gamePhase: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  isTrainingMode: boolean;
  lastWinner?: {
    playerId: string;
    username: string;
    winnings: number;
    handDescription?: string;
  };
}

const LivePokerTable: React.FC = () => {
  const { user, token, logout } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [tableState, setTableState] = useState<PokerTable | null>(null);
  const [connected, setConnected] = useState(false);
  const [raiseAmount, setRaiseAmount] = useState('');
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    if (!token) return;

    // Initialize Socket.IO connection
    const newSocket = io('http://localhost:5000', {
      auth: {
        token: token
      }
    });

    newSocket.on('connect', () => {
      console.log('Connected to poker server');
      setConnected(true);
      
      // Join the table automatically
      newSocket.emit('joinTable', 'main-table');
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from poker server');
      setConnected(false);
    });

    newSocket.on('gameStateUpdate', (table: PokerTable) => {
      setTableState(table);
    });

    newSocket.on('playerJoined', (player: Player) => {
      console.log(`${player.username} joined the table`);
    });

    newSocket.on('playerAction', (playerId: string, action: string, amount?: number) => {
      console.log(`Player ${playerId} performed action: ${action}`, amount);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [token]);

  const handleAction = (action: 'fold' | 'call' | 'raise' | 'check', amount?: number) => {
    if (socket && connected) {
      socket.emit('playerAction', action, amount);
      setRaiseAmount('');
    }
  };

  const getCurrentPlayer = (): Player | null => {
    if (!tableState) return null;
    return tableState.players[tableState.currentPlayerPosition] || null;
  };

  const isMyTurn = (): boolean => {
    const currentPlayer = getCurrentPlayer();
    return currentPlayer ? currentPlayer.userId === user?.id : false;
  };

  const getMyPlayer = (): Player | null => {
    if (!tableState) return null;
    return tableState.players.find(p => p.userId === user?.id) || null;
  };

  const formatCard = (card: Card): string => {
    const suitSymbols = {
      hearts: '♥',
      diamonds: '♦',
      clubs: '♣',
      spades: '♠'
    };
    return `${card.rank}${suitSymbols[card.suit]}`;
  };

  const getCardColor = (card: Card): string => {
    return card.suit === 'hearts' || card.suit === 'diamonds' ? 'red' : 'black';
  };

  // Poker chip rendering function
  const renderPokerChips = (amount: number): React.ReactElement[] => {
    const chips: React.ReactElement[] = [];
    let remaining = amount;
    
    // Chip denominations and colors
    const chipTypes = [
      { value: 100, color: 'black', label: '100' },
      { value: 25, color: 'green', label: '25' },
      { value: 5, color: 'red', label: '5' },
      { value: 1, color: 'white', label: '1' }
    ];
    
    chipTypes.forEach(chipType => {
      const count = Math.floor(remaining / chipType.value);
      if (count > 0) {
        // Stack chips (max 5 visible per stack)
        const stacks = Math.ceil(count / 5);
        for (let stack = 0; stack < stacks; stack++) {
          const stackCount = Math.min(5, count - (stack * 5));
          chips.push(
            <div key={`${chipType.value}-${stack}`} className={`poker-chip ${chipType.color}`}>
              <div className="chip-value">{chipType.label}</div>
              {stackCount > 1 && <div className="chip-count">×{stackCount}</div>}
            </div>
          );
        }
        remaining -= count * chipType.value;
      }
    });
    
    return chips;
  };

  // Helper functions for blinds
  const isSmallBlind = (seatIndex: number): boolean => {
    if (!tableState) return false;
    const smallBlindPos = getSmallBlindPosition();
    return smallBlindPos === seatIndex;
  };

  const isBigBlind = (seatIndex: number): boolean => {
    if (!tableState) return false;
    const bigBlindPos = getBigBlindPosition();
    return bigBlindPos === seatIndex;
  };

  const getSmallBlindPosition = (): number => {
    if (!tableState) return -1;
    const activePlayers = tableState.players.filter(p => p.isActive);
    if (activePlayers.length === 2) {
      return tableState.dealerPosition; // Heads-up: dealer is small blind
    }
    // Find next active player after dealer
    let pos = (tableState.dealerPosition + 1) % 6;
    while (pos !== tableState.dealerPosition) {
      const player = tableState.players.find(p => p.position === pos);
      if (player && player.isActive) return pos;
      pos = (pos + 1) % 6;
    }
    return -1;
  };

  const getBigBlindPosition = (): number => {
    if (!tableState) return -1;
    const activePlayers = tableState.players.filter(p => p.isActive);
    if (activePlayers.length === 2) {
      // Heads-up: non-dealer is big blind
      let pos = (tableState.dealerPosition + 1) % 6;
      while (pos !== tableState.dealerPosition) {
        const player = tableState.players.find(p => p.position === pos);
        if (player && player.isActive) return pos;
        pos = (pos + 1) % 6;
      }
    }
    // Find next active player after small blind
    const sbPos = getSmallBlindPosition();
    if (sbPos === -1) return -1;
    let pos = (sbPos + 1) % 6;
    while (pos !== sbPos) {
      const player = tableState.players.find(p => p.position === pos);
      if (player && player.isActive) return pos;
      pos = (pos + 1) % 6;
    }
    return -1;
  };

  if (!connected || !tableState) {
    return (
      <div className="poker-table-container">
        <div className="loading-container">
          <div className="loading-spinner">
            {connected ? 'Joining table...' : 'Connecting to server...'}
          </div>
        </div>
      </div>
    );
  }

  const myPlayer = getMyPlayer();
  const currentPlayer = getCurrentPlayer();
  const callAmount = Math.max(0, tableState.currentBet - (myPlayer?.currentBet || 0));

  // --- Start Player Position Calculation ---
  const TABLE_SURFACE_CONTAINER_WIDTH = 800; // From .table-players CSS
  const TABLE_SURFACE_CONTAINER_HEIGHT = 600; // From .table-players CSS
  const TABLE_WIDTH = 800; // From .table-surface CSS
  const TABLE_HEIGHT = 450; // From .table-surface CSS
  const CARD_WIDTH = 160;  // From .player-info-card CSS
  const CARD_HEIGHT = 90;  // Estimated height for player card

  function getPlayerPositionStyle(seatIndex: number) {
    const angleMap = [
      270, // Seat 0: Bottom-center
      315, // Seat 1: Bottom-right
      0,   // Seat 2: Middle-right
      45,  // Seat 3: Top-right
      135, // Seat 4: Top-left
      180  // Seat 5: Middle-left
    ];
    const angle = angleMap[seatIndex] * (Math.PI / 180); // Convert to radians

    // Center of the container
    const cx = TABLE_SURFACE_CONTAINER_WIDTH / 2;
    const cy = TABLE_SURFACE_CONTAINER_HEIGHT / 2;

    // Radius of the table ellipse
    const rx = TABLE_WIDTH / 2;
    const ry = TABLE_HEIGHT / 2;

    // Calculate position for the center of the card, just outside the table ellipse
    const cardCenterX = cx + (rx + CARD_WIDTH / 2 - 20) * Math.cos(angle);
    const cardCenterY = cy + (ry + CARD_HEIGHT / 2 - 10) * Math.sin(angle);

    // Calculate top-left position for the div
    const left = cardCenterX - CARD_WIDTH / 2;
    const top = cardCenterY - CARD_HEIGHT / 2;

    return {
      position: 'absolute' as const,
      left: `${left}px`,
      top: `${top}px`,
      width: `${CARD_WIDTH}px`,
    };
  }
  // --- End Player Position Calculation ---

  return (
    <div className="poker-table-container">
      <div className="header">
        <div className="user-info">
          <div className="user-welcome">
            <span>Welcome, {user?.fullName} (@{user?.username})</span>
            <span className="connection-status">
              {connected ? '🟢 Connected' : '🔴 Disconnected'}
            </span>
          </div>
          <div className="header-buttons">
            <button onClick={() => setShowProfile(true)} className="profile-button">
              👤 Profile
            </button>
            <button onClick={logout} className="logout-button">
              Logout
            </button>
          </div>
        </div>
      </div>


      <div className="poker-table">
        <div className="table-surface">
          <h2>Live Poker Table</h2>
          <p>Phase: {tableState.gamePhase.toUpperCase()}</p>
          
          {/* Deck Position */}
          <div className="deck-position">
            <div className="deck-stack">
              <div className="deck-card"></div>
              <div className="deck-card"></div>
              <div className="deck-card"></div>
              <div className="deck-card"></div>
              <div className="deck-card"></div>
            </div>
            <div style={{marginTop: '6px', fontSize: '0.6rem', textAlign: 'center'}}>🂠 DECK</div>
          </div>

          {/* Community Cards */}
          <div className="community-cards">
            {tableState.communityCards.map((card, index) => (
              <div 
                key={index} 
                className={`card ${getCardColor(card)} community-card-appear`}
                style={{animationDelay: `${index * 0.2}s`}}
              >
                {formatCard(card)}
              </div>
            ))}
          </div>
          
          {/* Player info positioned around table */}
          <div className="table-players">
            {[0, 1, 2, 3, 4, 5].map((seatIndex) => {
              const player = tableState.players.find(p => p.position === seatIndex);
              const isCurrentPlayer = currentPlayer?.position === seatIndex;
              const isDealer = tableState.dealerPosition === seatIndex;
              const isMe = player?.userId === user?.id;
              
              return (
                <div key={seatIndex} className="player-position" style={getPlayerPositionStyle(seatIndex)}>
                  {player ? (
                    <div className={`player-info-card ${isCurrentPlayer ? 'current-player-card' : ''} ${isMe ? 'my-player-card' : ''}`}>
                      <div className="player-header">
                        <div className="player-name">
                          {player.username}
                          {player.isAI && ' 🤖'}
                          {isDealer && ' 🔴'}
                          {isMe && ' (You)'}
                        </div>
                        <div className="player-chips">${player.chips}</div>
                      </div>
                      
                      {/* Bet chips */}
                      {player.currentBet > 0 && (
                        <div className="bet-chips">
                          <div className="chips-container">
                            {renderPokerChips(player.currentBet)}
                          </div>
                          <div className="bet-amount">${player.currentBet}</div>
                          {/* Show blind indicators */}
                          {isSmallBlind(seatIndex) && (
                            <div className="blind-indicator sb">SB</div>
                          )}
                          {isBigBlind(seatIndex) && (
                            <div className="blind-indicator bb">BB</div>
                          )}
                        </div>
                      )}
                      
                      {player.isFolded && <div className="player-status folded">FOLDED</div>}
                      {player.isAllIn && <div className="player-status all-in">ALL-IN</div>}
                      
                      {/* Show hole cards */}
                      {player.holeCards.length > 0 && (
                        <div className={`hole-cards ${isCurrentPlayer ? 'current-player' : ''}`}>
                          {player.holeCards.map((card, cardIndex) => (
                            <div 
                              key={cardIndex} 
                              className={`card small ${getCardColor(card)} hole-card-appear`}
                              style={{animationDelay: `${cardIndex * 0.1}s`}}
                            >
                              {formatCard(card)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="empty-seat-card">
                      <div className="empty-text">Empty Seat</div>
                    </div>
                  )}
                  
                  {/* Seat marker on table */}
                  <div className={`seat-marker ${isCurrentPlayer ? 'current-player-marker' : ''} ${isDealer ? 'dealer-marker' : ''}`}>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Table Info */}
          <div className="table-info">
            <div className="pot">Pot: ${tableState.pot}</div>
            <div className="blinds">Blinds: ${tableState.smallBlind}/${tableState.bigBlind}</div>
            {tableState.currentBet > 0 && (
              <div className="current-bet">Current Bet: ${tableState.currentBet}</div>
            )}
          </div>

          {/* Action Panel */}
          {isMyTurn() && myPlayer && !myPlayer.isFolded && !myPlayer.isAllIn && (
            <div className="action-panel">
              <h3>Your Turn!</h3>
              <div className="action-buttons">
                <button onClick={() => handleAction('fold')} className="fold-btn">
                  Fold
                </button>
                
                {tableState.currentBet === 0 || callAmount === 0 ? (
                  <button onClick={() => handleAction('check')} className="check-btn">
                    Check
                  </button>
                ) : (
                  <button 
                    onClick={() => handleAction('call')} 
                    className="call-btn"
                    disabled={callAmount > myPlayer.chips}
                  >
                    Call ${callAmount}
                  </button>
                )}
                
                <div className="raise-section">
                  {/* Quick bet buttons */}
                  <div className="quick-bet-buttons">
                    <button 
                      onClick={() => setRaiseAmount((tableState.currentBet + tableState.bigBlind).toString())}
                      className="quick-bet-btn"
                      title="Minimum raise"
                    >
                      Min
                    </button>
                    <button 
                      onClick={() => setRaiseAmount((tableState.currentBet + tableState.bigBlind * 2).toString())}
                      className="quick-bet-btn"
                      title="2x big blind raise"
                    >
                      2x
                    </button>
                    <button 
                      onClick={() => setRaiseAmount((Math.floor(tableState.pot * 0.5) + tableState.currentBet).toString())}
                      className="quick-bet-btn"
                      title="Half pot"
                    >
                      1/2 Pot
                    </button>
                    <button 
                      onClick={() => {
                        const callAmount = tableState.currentBet - (myPlayer?.currentBet || 0);
                        const potBet = tableState.pot + callAmount;
                        setRaiseAmount(potBet.toString());
                      }}
                      className="quick-bet-btn"
                      title="Pot size bet"
                    >
                      Pot
                    </button>
                  </div>
                  
                  <input
                    type="number"
                    value={raiseAmount}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      // Ensure whole numbers only and minimum big blind raise
                      const minRaise = tableState.currentBet + tableState.bigBlind;
                      if (value >= minRaise || e.target.value === '') {
                        setRaiseAmount(e.target.value);
                      }
                    }}
                    placeholder={`Min: $${tableState.currentBet + tableState.bigBlind}`}
                    min={tableState.currentBet + tableState.bigBlind}
                    max={myPlayer.chips + myPlayer.currentBet}
                    step={tableState.smallBlind}
                  />
                  <button 
                    onClick={() => handleAction('raise', parseInt(raiseAmount) || 0)}
                    className="raise-btn"
                    disabled={!raiseAmount || parseInt(raiseAmount) <= tableState.currentBet}
                  >
                    Raise
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Winner Display */}
          {tableState.lastWinner && (
            <div className="winner-display">
              <div className="winner-announcement">
                🎉 <strong>{tableState.lastWinner.username}</strong> wins ${tableState.lastWinner.winnings}! 🎉
              </div>
              {tableState.lastWinner.handDescription && (
                <div className="winner-hand">
                  with {tableState.lastWinner.handDescription}
                </div>
              )}
              <div className="winner-subtitle">
                Next hand starting soon...
              </div>
            </div>
          )}

          {/* Game Status */}
          <div className="game-status">
            {!tableState.lastWinner && currentPlayer && (
              <div>
                Waiting for {currentPlayer.username} to act...
                {currentPlayer.isAI && ' 🤖 thinking...'}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <UserProfile 
        isOpen={showProfile} 
        onClose={() => setShowProfile(false)} 
      />
    </div>
  );
};

export default LivePokerTable;
