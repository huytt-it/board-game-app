import type { Timestamp } from 'firebase/firestore';

// ─── Game Type Registry ───────────────────────────────────────────────
export type GameType = 'clock-tower' | 'werewolf' | 'avalon';

// ─── Room Status ──────────────────────────────────────────────────────
export type RoomStatus = 'lobby' | 'day' | 'night' | 'end';

// ─── Room Configuration (generic, extended per game) ──────────────────
export interface RoomConfig {
  maxPlayers: number;
  [key: string]: unknown;
}

// ─── Room Document ────────────────────────────────────────────────────
export interface Room {
  id: string;
  hostId: string;
  gameType: GameType;
  status: RoomStatus;
  roomCode: string;
  config: RoomConfig;
  createdAt: Timestamp | Date;
}

// ─── Room creation payload (without auto-generated fields) ────────────
export interface CreateRoomPayload {
  hostId: string;
  gameType: GameType;
  config: RoomConfig;
}
