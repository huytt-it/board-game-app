import type { Timestamp } from 'firebase/firestore';

// ─── Game Type Registry ───────────────────────────────────────────────
export type GameType = 'clock-tower' | 'werewolf' | 'avalon';

// ─── Room Status ──────────────────────────────────────────────────────
export type RoomStatus = 'lobby' | 'day' | 'night' | 'voting' | 'end';

// ─── Room Configuration (generic, extended per game) ──────────────────
export interface RoomConfig {
  maxPlayers: number;
  [key: string]: unknown;
}

// ─── Game State (stored in room doc for real-time sync) ───────────────
export interface RoomGameState {
  dayCount: number;
  nominations?: Record<string, string | null>; // playerId -> targetId
  votingTarget?: string | null;        // playerId being voted on
  votingTargetName?: string | null;    // display name
  votes: Record<string, boolean>; // playerId → agree/disagree
  rolesAssigned: boolean;
  winner?: 'good' | 'evil' | null; // which team won
}

// ─── Room Document ────────────────────────────────────────────────────
export interface Room {
  id: string;
  hostId: string;
  gameType: GameType;
  status: RoomStatus;
  roomCode: string;
  config: RoomConfig;
  gameState?: RoomGameState;
  createdAt: Timestamp | Date;
}

// ─── Room creation payload (without auto-generated fields) ────────────
export interface CreateRoomPayload {
  hostId: string;
  gameType: GameType;
  config: RoomConfig;
}
