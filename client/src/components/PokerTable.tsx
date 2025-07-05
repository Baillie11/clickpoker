import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { themeManager } from '../utils/ThemeManager';
import { soundManager } from '../utils/SoundManager';
import ThemeSelector from './ThemeSelector';
import './PokerTable.css';

const PokerTable: React.FC = () => {
  const { user, logout } = useAuth();
  const [isThemeSelectorOpen, setIsThemeSelectorOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    // Initialize theme and sound settings
    themeManager.loadSavedTheme();
    soundManager.setEnabled(soundEnabled);
    
    // Play welcome sound
    setTimeout(() => {
      soundManager.play('buttonClick');
    }, 500);
  }, []);

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

  return (
    <div className="poker-table-container">
      <div className="header">
        <div className="user-info">
          <div className="user-welcome">
            <span>Welcome, {user?.fullName} (@{user?.username})</span>
            <div className="connection-status">Connected to Click Poker</div>
          </div>
          <div className="header-buttons">
            <button onClick={toggleSound} className="profile-button">
              {soundEnabled ? '🔊' : '🔇'} Sound {soundEnabled ? 'On' : 'Off'}
            </button>
            <button onClick={openThemeSelector} className="profile-button">
              🎨 Themes
            </button>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="poker-table">
        <div className="table-surface">
          <h2>6-Seat Poker Table</h2>
          <p>Phase 1 - Basic Implementation</p>
          
          <div className="seats-container">
            {[0, 1, 2, 3, 4, 5].map((seatIndex) => (
              <div key={seatIndex} className={`seat seat-${seatIndex}`}>
                <div className="player-spot">
                  {seatIndex === 0 ? (
                    <div className="player-info">
                      <div className="player-name">{user?.username}</div>
                      <div className="player-chips">$1000</div>
                    </div>
                  ) : (
                    <div className="empty-seat">
                      <span>Empty Seat</span>
                      <small>AI will join soon</small>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="table-info">
            <div className="pot">Pot: $0</div>
            <div className="blinds">Blinds: $10/$20</div>
          </div>

          <div className="coming-soon">
            <h3>Coming Soon:</h3>
            <ul>
              <li>✅ User Authentication</li>
              <li>🔄 AI Players</li>
              <li>🔄 Card Dealing</li>
              <li>🔄 Betting Actions</li>
              <li>🔄 Game Logic</li>
            </ul>
          </div>
        </div>
      </div>
      
      <ThemeSelector 
        isOpen={isThemeSelectorOpen} 
        onClose={closeThemeSelector} 
      />
    </div>
  );
};

export default PokerTable;
