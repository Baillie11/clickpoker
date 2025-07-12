export interface PokerTheme {
  id: string;
  name: string;
  description: string;
  colors: {
    tableFelt: string;
    tableRail: string;
    cardBackground: string;
    chipColors: {
      white: string;
      red: string;
      green: string;
      black: string;
    };
    text: {
      primary: string;
      secondary: string;
      accent: string;
    };
    background: string;
  };
  effects: {
    tableShadow: string;
    cardShadow: string;
    glowColor: string;
  };
}

export class ThemeManager {
  private currentTheme: PokerTheme;
  private themes: Map<string, PokerTheme> = new Map();

  constructor() {
    this.initializeThemes();
    this.currentTheme = this.themes.get('classic')!;
  }

  private initializeThemes(): void {
    const themes: PokerTheme[] = [
      {
        id: 'classic',
        name: 'Classic Green',
        description: 'Traditional casino green felt',
        colors: {
          tableFelt: '#228B22',
          tableRail: '#8B4513',
          cardBackground: '#ffffff',
          chipColors: {
            white: 'linear-gradient(145deg, #ffffff, #e0e0e0)',
            red: 'linear-gradient(145deg, #ff4444, #cc3333)',
            green: 'linear-gradient(145deg, #44ff44, #33cc33)',
            black: 'linear-gradient(145deg, #333333, #111111)'
          },
          text: {
            primary: '#ffffff',
            secondary: '#cccccc',
            accent: '#ffeb3b'
          },
          background: 'linear-gradient(135deg, #1a4a5e 0%, #0f3443 100%)'
        },
        effects: {
          tableShadow: '0 0 20px rgba(0, 0, 0, 0.5)',
          cardShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
          glowColor: '#ffeb3b'
        }
      },
      {
        id: 'royal-blue',
        name: 'Royal Blue',
        description: 'Elegant royal blue with gold accents',
        colors: {
          tableFelt: '#1e3a8a',
          tableRail: '#fbbf24',
          cardBackground: '#ffffff',
          chipColors: {
            white: 'linear-gradient(145deg, #f8fafc, #e2e8f0)',
            red: 'linear-gradient(145deg, #dc2626, #991b1b)',
            green: 'linear-gradient(145deg, #059669, #047857)',
            black: 'linear-gradient(145deg, #1f2937, #111827)'
          },
          text: {
            primary: '#ffffff',
            secondary: '#ddd6fe',
            accent: '#fbbf24'
          },
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)'
        },
        effects: {
          tableShadow: '0 0 30px rgba(251, 191, 36, 0.3)',
          cardShadow: '0 4px 8px rgba(30, 58, 138, 0.4)',
          glowColor: '#fbbf24'
        }
      },
      {
        id: 'casino-red',
        name: 'Casino Red',
        description: 'Bold red with black leather trim',
        colors: {
          tableFelt: '#dc2626',
          tableRail: '#1f2937',
          cardBackground: '#ffffff',
          chipColors: {
            white: 'linear-gradient(145deg, #fef2f2, #fee2e2)',
            red: 'linear-gradient(145deg, #7f1d1d, #450a0a)',
            green: 'linear-gradient(145deg, #14532d, #052e16)',
            black: 'linear-gradient(145deg, #0f0f0f, #000000)'
          },
          text: {
            primary: '#ffffff',
            secondary: '#fecaca',
            accent: '#fbbf24'
          },
          background: 'linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%)'
        },
        effects: {
          tableShadow: '0 0 25px rgba(220, 38, 38, 0.4)',
          cardShadow: '0 3px 6px rgba(31, 41, 55, 0.5)',
          glowColor: '#fbbf24'
        }
      },
      {
        id: 'midnight',
        name: 'Midnight Black',
        description: 'Sleek black with purple accents',
        colors: {
          tableFelt: '#1f2937',
          tableRail: '#4c1d95',
          cardBackground: '#f9fafb',
          chipColors: {
            white: 'linear-gradient(145deg, #f3f4f6, #d1d5db)',
            red: 'linear-gradient(145deg, #b91c1c, #7f1d1d)',
            green: 'linear-gradient(145deg, #16a34a, #15803d)',
            black: 'linear-gradient(145deg, #6366f1, #4338ca)'
          },
          text: {
            primary: '#f3f4f6',
            secondary: '#c4b5fd',
            accent: '#a78bfa'
          },
          background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%)'
        },
        effects: {
          tableShadow: '0 0 35px rgba(167, 139, 250, 0.3)',
          cardShadow: '0 4px 8px rgba(99, 102, 241, 0.3)',
          glowColor: '#a78bfa'
        }
      },
      {
        id: 'emerald',
        name: 'Emerald Elite',
        description: 'Luxurious emerald with gold trim',
        colors: {
          tableFelt: '#065f46',
          tableRail: '#d97706',
          cardBackground: '#ffffff',
          chipColors: {
            white: 'linear-gradient(145deg, #ecfdf5, #d1fae5)',
            red: 'linear-gradient(145deg, #dc2626, #991b1b)',
            green: 'linear-gradient(145deg, #16a34a, #15803d)',
            black: 'linear-gradient(145deg, #292524, #1c1917)'
          },
          text: {
            primary: '#ffffff',
            secondary: '#a7f3d0',
            accent: '#fbbf24'
          },
          background: 'linear-gradient(135deg, #064e3b 0%, #1f2937 100%)'
        },
        effects: {
          tableShadow: '0 0 28px rgba(16, 185, 129, 0.4)',
          cardShadow: '0 3px 6px rgba(6, 95, 70, 0.4)',
          glowColor: '#10b981'
        }
      },
      {
        id: 'neon',
        name: 'Neon Nights',
        description: 'Cyberpunk neon with electric blue',
        colors: {
          tableFelt: '#1a1a2e',
          tableRail: '#16213e',
          cardBackground: '#0f3460',
          chipColors: {
            white: 'linear-gradient(145deg, #00f5ff, #00bcd4)',
            red: 'linear-gradient(145deg, #ff073a, #c2185b)',
            green: 'linear-gradient(145deg, #39ff14, #00e676)',
            black: 'linear-gradient(145deg, #651fff, #3f51b5)'
          },
          text: {
            primary: '#00f5ff',
            secondary: '#bb86fc',
            accent: '#39ff14'
          },
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)'
        },
        effects: {
          tableShadow: '0 0 40px rgba(0, 245, 255, 0.5)',
          cardShadow: '0 0 10px rgba(57, 255, 20, 0.6)',
          glowColor: '#00f5ff'
        }
      }
    ];

    themes.forEach(theme => {
      this.themes.set(theme.id, theme);
    });
  }

  public setTheme(themeId: string): boolean {
    const theme = this.themes.get(themeId);
    if (theme) {
      this.currentTheme = theme;
      this.applyTheme();
      localStorage.setItem('poker-theme', themeId);
      return true;
    }
    return false;
  }

  public getCurrentTheme(): PokerTheme {
    return this.currentTheme;
  }

  public getAllThemes(): PokerTheme[] {
    return Array.from(this.themes.values());
  }

  public applyTheme(): void {
    const theme = this.currentTheme;
    const root = document.documentElement;

    // Apply CSS custom properties
    root.style.setProperty('--table-felt', theme.colors.tableFelt);
    root.style.setProperty('--table-rail', theme.colors.tableRail);
    root.style.setProperty('--card-background', theme.colors.cardBackground);
    
    // Chip colors
    root.style.setProperty('--chip-white', theme.colors.chipColors.white);
    root.style.setProperty('--chip-red', theme.colors.chipColors.red);
    root.style.setProperty('--chip-green', theme.colors.chipColors.green);
    root.style.setProperty('--chip-black', theme.colors.chipColors.black);
    
    // Text colors
    root.style.setProperty('--text-primary', theme.colors.text.primary);
    root.style.setProperty('--text-secondary', theme.colors.text.secondary);
    root.style.setProperty('--text-accent', theme.colors.text.accent);
    
    // Background
    root.style.setProperty('--background', theme.colors.background);
    
    // Effects
    root.style.setProperty('--table-shadow', theme.effects.tableShadow);
    root.style.setProperty('--card-shadow', theme.effects.cardShadow);
    root.style.setProperty('--glow-color', theme.effects.glowColor);
  }

  public loadSavedTheme(): void {
    const savedTheme = localStorage.getItem('poker-theme');
    if (savedTheme && this.themes.has(savedTheme)) {
      this.setTheme(savedTheme);
    } else {
      this.applyTheme(); // Apply default theme
    }
  }
}

// Singleton instance
export const themeManager = new ThemeManager();
