
export type DiceValue = 1 | 2 | 3 | 4 | 5 | 6;

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  hue: number;
  createdAt: number;
}

export interface Player {
  id: string;
  name: string;
  dice: DiceValue[];
  cupColor: string;
  isHost: boolean;
  isActive: boolean;
  isEliminated: boolean;
  isAI?: boolean;
  lastAction?: string;
}

export interface Bid {
  playerId: string;
  count: number;
  value: DiceValue;
}

export type GameStatus = 'waiting' | 'bidding' | 'checking' | 'round_end' | 'game_over';

export interface GameState {
  id: string;
  status: GameStatus;
  players: Player[];
  currentTurnIndex: number;
  currentBid?: Bid;
  lastResult?: {
    type: 'dudo' | 'calza';
    callerId: string;
    bidderId: string;
    success: boolean;
    actualCount: number;
    bidValue: number;
  };
  winnerId?: string;
  logs: string[];
  lastUpdated: number;
  isSinglePlayer?: boolean;
  isPalifico?: boolean;
  roundStarterId?: string;
}

export interface Stats {
  mostWins: { name: string; count: number };
  mostLosses: { name: string; count: number };
  bestCalza: { name: string; count: number; bid: string };
}
