import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { io, Socket } from 'socket.io-client';
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
}

const LivePokerTable: React.FC = () => {
  const { user, token, logout } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [tableState, setTableState] = useState<PokerTable | null>(null);
  const [connected, setConnected] = useState(false);
  const [raiseAmount, setRaiseAmount] = useState('');

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
          <span>Welcome, {user?.fullName} (@{user?.username})</span>
          <span className="connection-status">
            {connected ? '🟢 Connected' : '🔴 Disconnected'}
          </span>
          <button onClick={logout} className="logout-button">
            Logout
          </button>
        </div>
      </div>


      <div className="poker-table">
        <div className="table-surface">
          <h2>Live Poker Table</h2>
          <p>Phase: {tableState.gamePhase.toUpperCase()}</p>
          
          {/* Community Cards */}
          <div className="community-cards">
            {tableState.communityCards.map((card, index) => (
              <div key={index} className={`card ${getCardColor(card)}`}>
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
                      
                      {player.currentBet > 0 && (
                        <div className="player-bet">Bet: ${player.currentBet}</div>
                      )}
                      
                      {player.isFolded && <div className="player-status folded">FOLDED</div>}
                      {player.isAllIn && <div className="player-status all-in">ALL-IN</div>}
                      
                      {/* Show hole cards */}
                      {player.holeCards.length > 0 && (
                        <div className="hole-cards">
                          {player.holeCards.map((card, cardIndex) => (
                            <div key={cardIndex} className={`card small ${getCardColor(card)}`}>
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
                  <input
                    type="number"
                    value={raiseAmount}
                    onChange={(e) => setRaiseAmount(e.target.value)}
                    placeholder="Raise amount"
                    min={tableState.currentBet + tableState.bigBlind}
                    max={myPlayer.chips + myPlayer.currentBet}
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

          {/* Game Status */}
          <div className="game-status">
            {currentPlayer && (
              <div>
                Waiting for {currentPlayer.username} to act...
                {currentPlayer.isAI && ' 🤖 thinking...'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LivePokerTable;
