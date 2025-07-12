import React, { useState, useEffect } from 'react';
import { PokerTheme, themeManager } from '../utils/ThemeManager';
import './ThemeSelector.css';

interface ThemeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ isOpen, onClose }) => {
  const [currentTheme, setCurrentTheme] = useState<PokerTheme>(themeManager.getCurrentTheme());
  const [themes] = useState<PokerTheme[]>(themeManager.getAllThemes());

  useEffect(() => {
    // Load saved theme on mount
    themeManager.loadSavedTheme();
    setCurrentTheme(themeManager.getCurrentTheme());
  }, []);

  const handleThemeChange = (themeId: string) => {
    if (themeManager.setTheme(themeId)) {
      setCurrentTheme(themeManager.getCurrentTheme());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="theme-selector-overlay" onClick={onClose}>
      <div className="theme-selector-modal" onClick={(e) => e.stopPropagation()}>
        <div className="theme-selector-header">
          <h3>Choose Your Table Theme</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="theme-grid">
          {themes.map((theme) => (
            <div
              key={theme.id}
              className={`theme-card ${currentTheme.id === theme.id ? 'selected' : ''}`}
              onClick={() => handleThemeChange(theme.id)}
            >
              <div className="theme-preview" style={{
                background: theme.colors.background,
                border: `3px solid ${theme.colors.tableRail}`,
              }}>
                <div 
                  className="mini-table" 
                  style={{ 
                    background: theme.colors.tableFelt,
                    border: `2px solid ${theme.colors.tableRail}`,
                  }}
                >
                  <div className="mini-cards">
                    <div 
                      className="mini-card" 
                      style={{ 
                        background: theme.colors.cardBackground,
                        boxShadow: theme.effects.cardShadow 
                      }}
                    />
                    <div 
                      className="mini-card" 
                      style={{ 
                        background: theme.colors.cardBackground,
                        boxShadow: theme.effects.cardShadow 
                      }}
                    />
                  </div>
                  <div className="mini-chips">
                    <div 
                      className="mini-chip" 
                      style={{ background: theme.colors.chipColors.white }}
                    />
                    <div 
                      className="mini-chip" 
                      style={{ background: theme.colors.chipColors.red }}
                    />
                    <div 
                      className="mini-chip" 
                      style={{ background: theme.colors.chipColors.green }}
                    />
                    <div 
                      className="mini-chip" 
                      style={{ background: theme.colors.chipColors.black }}
                    />
                  </div>
                </div>
              </div>
              
              <div className="theme-info">
                <h4 style={{ color: theme.colors.text.accent }}>{theme.name}</h4>
                <p style={{ color: theme.colors.text.secondary }}>{theme.description}</p>
              </div>
              
              {currentTheme.id === theme.id && (
                <div className="selected-indicator" style={{ color: theme.effects.glowColor }}>
                  ✓ Active
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="theme-selector-footer">
          <p>Your theme preference will be saved automatically</p>
        </div>
      </div>
    </div>
  );
};

export default ThemeSelector;
