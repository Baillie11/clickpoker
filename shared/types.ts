// User Types
export interface User {
  id: string;
  email: string;
  username: string;
  fullName: string;
  profileImage?: string;
  avatarUrl?: string;
  bio?: string;
  city?: string;
  state?: string;
  country?: string;
  timezone?: string;
  favoritePokerVariant?: string;
  experienceLevel?: 'Beginner' | 'Intermediate' | 'Advanced' | 'Professional';
  totalGamesPlayed?: number;
  totalWinnings?: number;
  preferredTableStakes?: string;
  privacyLevel?: 'Public' | 'Friends' | 'Private';
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRegistration {
  email: string;
  username: string;
  fullName: string;
  password: string;
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: Omit<User, 'password'>;
}

export interface ProfileUpdate {
  fullName?: string;
  bio?: string;
  city?: string;
  state?: string;
  country?: string;
  timezone?: string;
  favoritePokerVariant?: string;
  experienceLevel?: 'Beginner' | 'Intermediate' | 'Advanced' | 'Professional';
  preferredTableStakes?: string;
  privacyLevel?: 'Public' | 'Friends' | 'Private';
  profileImage?: string;
  avatarUrl?: string;
}

// Poker Game Types
export interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  rank: 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
}

export interface Player {
  id: string;
  userId?: string; // null for AI players
  username: string;
  chips: number;
  holeCards: Card[];
  position: number; // 0-5 for 6-max table
  isActive: boolean;
  isAI: boolean;
  currentBet: number;
  hasActed: boolean;
  isFolded: boolean;
  isAllIn: boolean;
}

export interface PokerTable {
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

// Socket Events
export interface ServerToClientEvents {
  playerJoined: (player: Player) => void;
  gameStateUpdate: (table: PokerTable) => void;
  playerAction: (playerId: string, action: string, amount?: number) => void;
  newHand: (table: PokerTable) => void;
  gameOver: (winner: Player, winnings: number) => void;
}

export interface ClientToServerEvents {
  joinTable: (tableId: string) => void;
  playerAction: (action: 'fold' | 'call' | 'raise' | 'check', amount?: number) => void;
  leaveTable: () => void;
}
