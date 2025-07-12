import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { io, Socket } from 'socket.io-client';
import { themeManager } from '../utils/ThemeManager';
import { soundManager } from '../utils/SoundManager';
import UserProfile from './UserProfile';
import ThemeSelector from './ThemeSelector';
import { PokerTable, Player, Card } from '../../../shared/types';
import './PokerTable.css';

const LivePokerTable: React.FC = () => {
  const { user, token, logout } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [tableState, setTableState] = useState<PokerTable | null>(null);
  const [connected, setConnected] = useState(false);
  const [raiseAmount, setRaiseAmount] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [isThemeSelectorOpen, setIsThemeSelectorOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [showToast, setShowToast] = useState(false);

  const [playerActions, setPlayerActions] = useState<{[playerId: string]: string}>({});
  const [pendingActions, setPendingActions] = useState<Array<{playerId: string, action: string, amount?: number}>>([]);

  useEffect(() => {
    // Initialize theme and sound settings
    themeManager.loadSavedTheme();
    soundManager.setEnabled(soundEnabled);
    
    // Play welcome sound
    setTimeout(() => {
      soundManager.play('buttonClick');
    }, 500);
  }, []);

  // Debug tableState changes and apply pending actions
  useEffect(() => {
    console.log('tableState changed:', tableState ? `ID: ${tableState.id}, Players: ${tableState.players.length}` : 'null');
    
    // Apply pending actions when tableState becomes available
    if (tableState && pendingActions.length > 0) {
      console.log(`Applying ${pendingActions.length} pending actions after tableState update`);
      pendingActions.forEach(pending => {
        const player = tableState.players.find(p => p.userId === pending.playerId || p.id === pending.playerId);
        if (player) {
          const actionText = formatLastAction(pending.action, pending.amount);
          console.log(`Applying pending: ${player.username} -> ${actionText}`);
          setPlayerActions(prev => ({
            ...prev,
            [player.id]: actionText
          }));
        } else {
          console.log(`Player not found for pending action: ${pending.playerId}`);
          console.log(`Available players:`, tableState.players.map(p => `${p.username} (ID: ${p.id}, userId: ${p.userId})`));
        }
      });
      setPendingActions([]); // Clear pending actions after applying
    }
  }, [tableState, pendingActions]);

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
      console.log('Socket connected, socket ID:', newSocket.id);
      setConnected(true);
      
      // Join the table automatically
      newSocket.emit('joinTable', 'main-table');
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from poker server');
      setConnected(false);
    });

    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // Test all socket events to see what's being received
    newSocket.onAny((eventName, ...args) => {
      console.log(`Socket event received: ${eventName}`, args);
    });

    newSocket.on('gameStateUpdate', (table: PokerTable) => {
      console.log('=== gameStateUpdate received ===');
      console.log('Phase:', table.gamePhase, 'Players:', table.players.length, 'Pot:', table.pot, 'Bet:', table.currentBet);
      
      // Log each player's current state
      console.log('=== PLAYER STATE ===');
      table.players.forEach(player => {
        const cards = player.holeCards && player.holeCards.length > 0 
          ? player.holeCards.map(card => `${card.rank}${card.suit === 'hearts' ? '♥' : card.suit === 'diamonds' ? '♦' : card.suit === 'clubs' ? '♣' : '♠'}`).join(' ')
          : 'No cards';
        const currentAction = playerActions[player.id] || 'No action';
        console.log(`${player.username} (${player.isAI ? 'AI' : 'Real'}): Cards: [${cards}] | Action: ${currentAction} | Chips: $${player.chips} | Bet: $${player.currentBet} | Folded: ${player.isFolded} | All-in: ${player.isAllIn}`);
      });
      
      console.log('Player actions:', Object.keys(playerActions).length, 'actions stored');
      if (Object.keys(playerActions).length > 0) {
        console.log('Stored actions:', playerActions);
      }
      
      // Update tableState
      setTableState(table);
      
      // Clear player actions when a new hand starts
      if (tableState && tableState.gamePhase !== 'preflop' && table.gamePhase === 'preflop') {
        console.log('Clearing player actions - new hand started');
        setPlayerActions({});
      }
      
      // AI actions are now handled via playerAction events from the server
      
      // All-in announcements are now handled via playerAction events from the server
      
      // Apply pending actions when tableState is updated
      if (pendingActions.length > 0) {
        console.log(`Applying ${pendingActions.length} pending actions`);
        pendingActions.forEach(pending => {
          const player = table.players.find(p => p.userId === pending.playerId || p.id === pending.playerId);
          if (player) {
            const actionText = formatLastAction(pending.action, pending.amount);
            console.log(`Applying pending: ${player.username} -> ${actionText}`);
            setPlayerActions(prev => ({
              ...prev,
              [player.id]: actionText
            }));
          } else {
            console.log(`Player not found for pending action: ${pending.playerId}`);
            console.log(`Available players:`, table.players.map(p => `${p.username} (ID: ${p.id}, userId: ${p.userId})`));
          }
        });
        setPendingActions([]); // Clear pending actions after applying
      }
    });

    newSocket.on('playerJoined', (player: Player) => {
      console.log(`${player.username} joined the table`);
    });

    newSocket.on('playerAction', (playerId: string, action: string, amount?: number) => {
      console.log(`=== PLAYER ACTION EVENT ===`);
      console.log(`Action: ${action}${amount ? ` $${amount}` : ''} | PlayerId: ${playerId}`);
      
      // Track the player's last action
      const actionText = formatLastAction(action, amount);
      console.log(`Formatted action text: "${actionText}"`);
      
      if (actionText) {
        if (tableState) {
          // Find the player by userId (for real players) or id (for AI players)
          const player = tableState.players.find(p => p.userId === playerId || p.id === playerId);
          if (player) {
            console.log(`Found player: ${player.username} (ID: ${player.id})`);
            console.log(`Setting action: ${player.username} -> ${actionText}`);
            setPlayerActions(prev => {
              const newActions = {
                ...prev,
                [player.id]: actionText
              };
              console.log(`Updated player actions:`, newActions);
              return newActions;
            });
          } else {
            console.log(`Player not found for action: ${playerId}`);
            console.log(`Available players:`, tableState.players.map(p => `${p.username} (ID: ${p.id}, userId: ${p.userId})`));
          }
        } else {
          // Store pending action until tableState is available
          console.log('Storing pending action - no table state yet');
          console.log('Pending action details:', { playerId, action, amount });
          setPendingActions(prev => [...prev, { playerId, action, amount }]);
        }
      } else {
        console.log('No action text generated - skipping');
      }
    });

    newSocket.on('playerAnnouncement', (message: string) => {
      console.log('Player announcement:', message);
      setToastMessage(message);
      setShowToast(true);
      soundManager.play('buttonClick');
      
      // Hide toast after 4 seconds
      setTimeout(() => {
        setShowToast(false);
      }, 4000);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [token]);

  const handleAction = (action: 'fold' | 'call' | 'raise' | 'check', amount?: number) => {
    if (socket && connected) {
      // Play appropriate sound
      switch (action) {
        case 'fold':
          soundManager.play('fold');
          break;
        case 'call':
          soundManager.play('check');
          break;
        case 'raise':
          soundManager.play('raise');
          soundManager.playChipBet(amount || 0);
          break;
        case 'check':
          soundManager.play('check');
          break;
      }
      
      socket.emit('playerAction', action, amount);
      setRaiseAmount('');
    }
  };

  const handleSitOut = () => {
    if (socket && connected) {
      soundManager.play('buttonClick');
      socket.emit('sitOut');
      console.log('Requesting to sit out');
    }
  };

  const handleReturnToTable = () => {
    if (socket && connected) {
      soundManager.play('buttonClick');
      socket.emit('returnToTable');
      console.log('Requesting to return to table');
    }
  };

  const handleLogout = () => {
    soundManager.play('buttonClick');
    logout();
  };

  const openThemeSelector = () => {
    soundManager.play('buttonClick');
    setIsThemeSelectorOpen(true);
  };

  const closeThemeSelector = () => {
    soundManager.play('buttonClick');
    setIsThemeSelectorOpen(false);
  };

  const toggleSound = () => {
    const newSoundState = !soundEnabled;
    setSoundEnabled(newSoundState);
    soundManager.setEnabled(newSoundState);
    if (newSoundState) {
      soundManager.play('buttonClick');
    }
  };

  const getCurrentPlayer = (): Player | null => {
    if (!tableState) return null;
    return tableState.players[tableState.currentPlayerPosition] || null;
  };

  const isMyTurn = (): boolean => {
    const currentPlayer = getCurrentPlayer();
    const myPlayer = getMyPlayer();
    // Check if current player position matches my player position
    return currentPlayer && myPlayer ? currentPlayer.position === myPlayer.position : false;
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

  const formatLastAction = (action: string, amount?: number): string => {
    switch (action) {
      case 'fold':
        return 'Folded';
      case 'check':
        return 'Checked';
      case 'call':
        return amount ? `Called $${amount}` : 'Called';
      case 'raise':
        return amount ? `Bet $${amount}` : 'Raised';
      default:
        return '';
    }
  };


  // Helper functions for blinds
  // Reset all players' folded/active status at the start of each hand
  useEffect(() => {
    if (!tableState) return;
    // If it's the first betting round (preflop), reset all players' folded/active status
    if (tableState.gamePhase === 'preflop') {
      tableState.players.forEach(player => {
        player.isFolded = false;
        player.isActive = true;
      });
    }
  }, [tableState?.id, tableState?.gamePhase]);

  // --- Start Player Position Calculation ---
  const TABLE_SURFACE_CONTAINER_WIDTH = 800; // From .table-players CSS
  const TABLE_SURFACE_CONTAINER_HEIGHT = 600; // From .table-players CSS
  const TABLE_WIDTH = 800; // From .table-surface CSS
  const TABLE_HEIGHT = 450; // From .table-surface CSS
  const CARD_WIDTH = 160;  // From .player-info-card CSS
  const CARD_HEIGHT = 90;  // Estimated height for player card

  // Get players sorted by seat order, starting from dealer and going clockwise
  function getSortedPlayers() {
    if (!tableState) return [];
    const totalPlayers = tableState.players.length;
    const sorted: Player[] = [];
    let pos = tableState.dealerPosition;
    for (let i = 0; i < totalPlayers; i++) {
      sorted.push(tableState.players.find(p => p.position === pos)!);
      pos = (pos + 1) % totalPlayers;
    }
    return sorted;
  }

  // Helper to get the index of the dealer, SB, and BB in the sorted array
  function getBlindIndexes() {
    const sorted = getSortedPlayers();
    const n = sorted.length;
    if (n < 2) return { dealer: 0, sb: 0, bb: 0 };
    if (n === 2) return { dealer: 0, sb: 0, bb: 1 };
    return { dealer: 0, sb: 1, bb: 2 };
  }

  // Margin to place player info cards just outside the table ellipse
  const OUTER_MARGIN = 60;

  function getPlayerPositionStyle(seatIndex: number) {
    const angleMap = [
      270, // Seat 0: Bottom-center
      315, // Seat 1: Bottom-right
      0,   // Seat 2: Middle-right
      90,  // Seat 3: Top-center (real player position)
      135, // Seat 4: Top-left
      180  // Seat 5: Middle-left
    ];
    const angle = angleMap[seatIndex] * (Math.PI / 180); // Convert to radians

    // Center of the container
    const cx = TABLE_SURFACE_CONTAINER_WIDTH / 2;
    const cy = TABLE_SURFACE_CONTAINER_HEIGHT / 2;

    // Radius of the table ellipse + OUTER_MARGIN to push cards outside
    const rx = TABLE_WIDTH / 2 + OUTER_MARGIN;
    const ry = TABLE_HEIGHT / 2 + OUTER_MARGIN;

    // Calculate position for the center of the card, just outside the table ellipse
    const cardCenterX = cx + rx * Math.cos(angle);
    const cardCenterY = cy + ry * Math.sin(angle);

    // Calculate top-left position for the div
    const left = cardCenterX - CARD_WIDTH / 2;
    const top = cardCenterY - CARD_HEIGHT / 2;
    return { left, top };
  }

  // --- End Player Position Calculation ---

  // Calculate action order for preflop betting
  const getActionOrder = (): { [position: number]: number } => {
    if (!tableState || tableState.gamePhase !== 'preflop') return {};
    
    const actionOrder: { [position: number]: number } = {};
    const activePlayers = tableState.players.filter(p => p.isActive);
    
    if (activePlayers.length < 2) return actionOrder;
    
    // Find big blind position
    const bigBlindPos = tableState.bigBlindPosition;
    if (bigBlindPos === undefined || bigBlindPos === -1) return actionOrder;
    
    // Action starts from the first player after big blind
    let currentPos = (bigBlindPos + 1) % 6;
    let actionNumber = 1;
    
    // Go around the table once
    for (let i = 0; i < 6; i++) {
      const player = tableState.players.find(p => p.position === currentPos && p.isActive);
      if (player && currentPos !== tableState.smallBlindPosition && currentPos !== bigBlindPos) {
        actionOrder[currentPos] = actionNumber++;
      }
      currentPos = (currentPos + 1) % 6;
    }
    
    return actionOrder;
  };

  const actionOrder = getActionOrder();

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
  const minRaise = tableState.currentBet + tableState.bigBlind;

  // Debug logging
  const isMyTurnValue = isMyTurn();
  // Only log when it's your turn to reduce noise
  if (isMyTurnValue) {
    console.log('Your turn to act');
  }
  


  return (
    <div className="poker-table-container">
      {/* Toast Notification */}
      {showToast && (
        <div className="toast-notification">
          <div className="toast-content">
            {toastMessage}
          </div>
        </div>
      )}
      
      {/* Options panel at the very top, centered */}
      <div className="table-options-panel">
        {/* Place your options/buttons here, e.g.: */}
        <button onClick={toggleSound} className="profile-button">
          {soundEnabled ? '🔊' : '🔇'} Sound {soundEnabled ? 'On' : 'Off'}
        </button>
        <button onClick={openThemeSelector} className="profile-button">
          🎨 Themes
        </button>
        <button onClick={() => setShowProfile(true)} className="profile-button">
          👤 Profile
        </button>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </div>
      {/* Poker table and players rendering here */}
      <div className="poker-table">
        <div className="table-surface">
          <h2>Live Poker Table</h2>
          <p>Phase: {tableState.gamePhase.toUpperCase()}</p>
          


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
            {[0,1,2,3,4,5].map((seatIndex) => {
              // Find player at this position
              let player = tableState.players.find(p => p.position === seatIndex);
              const isCurrentPlayer = currentPlayer?.position === player?.position;
              const isMe = player?.userId === user?.id;
              if (!player) {
                return (
                  <div key={seatIndex} className="player-position" style={getPlayerPositionStyle(seatIndex)} />
                );
              }
              // Avatar: use initials or emoji if available
              return (
                <div key={seatIndex} className="player-position" style={getPlayerPositionStyle(seatIndex)}>
                  <div className={`player-info-card${isCurrentPlayer ? ' current-player-card' : ''}${isMe ? ' my-player-card' : ''}${player.isAllIn ? ' all-in-player-card' : ''}${player.isFolded ? ' folded-player-card' : ''}`.trim()}>
                    {/* Action Order Number - Display during preflop */}
                    {tableState.gamePhase === 'preflop' && actionOrder[seatIndex] && (
                      <div className="action-order-number">
                        {actionOrder[seatIndex]}
                      </div>
                    )}
                    {/* Dealer/Blind badges inside the info card */}
                    <div className="player-badges">
                      {player.position === tableState.dealerPosition && (
                        <span className="dealer-badge">D</span>
                      )}
                      {player.position === tableState.smallBlindPosition && (
                        <span className="sb-badge">SB</span>
                      )}
                      {player.position === tableState.bigBlindPosition && (
                        <span className="bb-badge">BB</span>
                      )}
                    </div>
                    <div className="player-avatar">
                      {player.avatarUrl ? (
                        <img src={player.avatarUrl} alt="avatar" style={{width:'100%',height:'100%',borderRadius:'50%'}} />
                      ) : (
                        player.username.charAt(0)
                      )}
                    </div>
                    <div className="player-info-details">
                      <span className="player-name">{player.username}</span>
                      <span className="player-chips">${player.chips}</span>
                      {/* Show last action inside the info card */}
                      {playerActions[player.id] && (
                        <span className="player-last-action">
                          {playerActions[player.id]}
                        </span>
                      )}
                    </div>
                    {/* Show hole cards for the real player */}
                    {isMe && player.holeCards && player.holeCards.length > 0 && (
                      <div className="hole-cards">
                        {player.holeCards.map((card, idx) => (
                          <div key={idx} className={`card ${getCardColor(card)} hole-card-appear`}>
                            {formatCard(card)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Dealer Button and Blind indicators removed from outside the card */}
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

          {/* Winner Display */}
          {tableState.lastWinner && (
            <div className="winner-display">
              <div className="winner-announcement">
                🎉 <strong>{tableState.lastWinner.username}</strong> wins ${tableState.lastWinner.winnings}! 🎉
              </div>
              {tableState.lastWinner.handDescription && (
                <div className="winner-hand">
                  {(() => {
                    const desc = tableState.lastWinner.handDescription.trim();
                    if (!desc) return null;
                    const firstChar = desc[0].toLowerCase();
                    const useAn = ['a','e','i','o','u'].includes(firstChar);
                    const article = useAn ? 'An' : 'A';
                    // Capitalize first letter
                    const prettyDesc = desc.charAt(0).toUpperCase() + desc.slice(1);
                    return `with ${article} ${prettyDesc}`;
                  })()}
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
        {/* Action Panel - centered on table */}
        {isMyTurnValue && myPlayer && !myPlayer.isFolded && !myPlayer.isAllIn && myPlayer.isActive && (
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
              {/* All In Button */}
              <button 
                onClick={() => {
                  const allInAmount = myPlayer.chips + myPlayer.currentBet;
                  soundManager.play('allIn');
                  handleAction('raise', allInAmount);
                }}
                className="all-in-btn"
                disabled={myPlayer.chips === 0}
                title={`Bet all remaining chips: $${myPlayer.chips}`}
              >
                All In ${myPlayer.chips > 0 ? `($${myPlayer.chips})` : ''}
              </button>
              <div className="raise-section">
                {/* Quick bet buttons */}
                <div className="quick-bet-buttons">
                  <button 
                    onClick={() => setRaiseAmount((tableState.currentBet + tableState.bigBlind).toString())}
                    className="quick-bet-btn"
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
      </div>
      
      <UserProfile 
        isOpen={showProfile} 
        onClose={() => setShowProfile(false)} 
      />
      
      <ThemeSelector 
        isOpen={isThemeSelectorOpen} 
        onClose={closeThemeSelector} 
      />
    </div>
  );
};

export default LivePokerTable;