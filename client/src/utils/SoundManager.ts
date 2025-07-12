export interface SoundEffect {
  name: string;
  url: string;
  volume: number;
}

export class SoundManager {
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private masterVolume: number = 0.7;
  private enabled: boolean = true;

  // Define our poker sound effects
  private soundEffects: SoundEffect[] = [
    // Card dealing sounds
    { name: 'cardDeal', url: '/sounds/card-deal.mp3', volume: 0.6 },
    { name: 'cardFlip', url: '/sounds/card-flip.mp3', volume: 0.5 },
    { name: 'cardShuffle', url: '/sounds/card-shuffle.mp3', volume: 0.4 },
    
    // Chip sounds
    { name: 'chipDrop', url: '/sounds/chip-drop.mp3', volume: 0.7 },
    { name: 'chipStack', url: '/sounds/chip-stack.mp3', volume: 0.6 },
    { name: 'chipSlide', url: '/sounds/chip-slide.mp3', volume: 0.5 },
    { name: 'allIn', url: '/sounds/all-in.mp3', volume: 0.8 },
    
    // UI sounds
    { name: 'buttonClick', url: '/sounds/button-click.mp3', volume: 0.4 },
    { name: 'fold', url: '/sounds/fold.mp3', volume: 0.6 },
    { name: 'check', url: '/sounds/check.mp3', volume: 0.5 },
    { name: 'raise', url: '/sounds/raise.mp3', volume: 0.7 },
    
    // Winner sounds
    { name: 'winner', url: '/sounds/winner.mp3', volume: 0.8 },
    { name: 'potWin', url: '/sounds/pot-win.mp3', volume: 0.9 },
    
    // Ambient sounds
    { name: 'tableTap', url: '/sounds/table-tap.mp3', volume: 0.3 },
    { name: 'thinking', url: '/sounds/thinking.mp3', volume: 0.4 }
  ];

  constructor() {
    this.loadSounds();
  }

  private async loadSounds(): Promise<void> {
    for (const effect of this.soundEffects) {
      try {
        const audio = new Audio();
        audio.preload = 'auto';
        audio.volume = effect.volume * this.masterVolume;
        
        // For development, we'll create placeholder sounds using Web Audio API
        // In production, you would load actual audio files
        this.createPlaceholderSound(audio, effect.name);
        
        this.sounds.set(effect.name, audio);
      } catch (error) {
        console.warn(`Failed to load sound effect: ${effect.name}`, error);
      }
    }
  }

  private createPlaceholderSound(audio: HTMLAudioElement, soundName: string): void {
    // Create simple procedural sounds for development
    // This uses Web Audio API to generate basic sounds
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    const createTone = (frequency: number, duration: number, type: OscillatorType = 'sine') => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      oscillator.type = type;
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
    };

    // Create different sounds based on the sound name
    audio.addEventListener('play', () => {
      if (!this.enabled) return;
      
      switch (soundName) {
        case 'cardDeal':
          createTone(800, 0.1, 'square');
          break;
        case 'cardFlip':
          createTone(600, 0.15, 'triangle');
          break;
        case 'chipDrop':
          createTone(400, 0.2, 'sine');
          setTimeout(() => createTone(350, 0.1, 'sine'), 50);
          break;
        case 'chipStack':
          for (let i = 0; i < 3; i++) {
            setTimeout(() => createTone(500 + i * 50, 0.1, 'square'), i * 30);
          }
          break;
        case 'buttonClick':
          createTone(1000, 0.05, 'square');
          break;
        case 'winner':
          // Victory fanfare
          setTimeout(() => createTone(523, 0.2), 0);    // C
          setTimeout(() => createTone(659, 0.2), 200);  // E
          setTimeout(() => createTone(784, 0.3), 400);  // G
          break;
        case 'fold':
          createTone(300, 0.3, 'sawtooth');
          break;
        case 'raise':
          createTone(700, 0.1);
          setTimeout(() => createTone(900, 0.1), 100);
          break;
        default:
          createTone(440, 0.1);
      }
    });
  }

  public play(soundName: string, volume?: number): void {
    if (!this.enabled) return;
    
    const sound = this.sounds.get(soundName);
    if (sound) {
      sound.currentTime = 0;
      if (volume !== undefined) {
        sound.volume = volume * this.masterVolume;
      }
      sound.play().catch(error => {
        console.warn(`Failed to play sound: ${soundName}`, error);
      });
    } else {
      console.warn(`Sound not found: ${soundName}`);
    }
  }

  public setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.sounds.forEach((sound, name) => {
      const effect = this.soundEffects.find(e => e.name === name);
      if (effect) {
        sound.volume = effect.volume * this.masterVolume;
      }
    });
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.sounds.forEach(sound => {
        sound.pause();
        sound.currentTime = 0;
      });
    }
  }

  public getMasterVolume(): number {
    return this.masterVolume;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  // Poker-specific sound combinations
  public playCardDeal(delay: number = 0): void {
    setTimeout(() => this.play('cardDeal'), delay);
  }

  public playChipBet(amount: number): void {
    if (amount >= 100) {
      this.play('chipStack');
    } else if (amount >= 50) {
      this.play('chipDrop');
    } else {
      this.play('chipSlide');
    }
  }

  public playWinnerSequence(winnings: number): void {
    this.play('potWin');
    setTimeout(() => {
      if (winnings >= 500) {
        this.play('winner');
      }
    }, 300);
  }
}

// Singleton instance
export const soundManager = new SoundManager();
