import type { Timestamp } from 'firebase/firestore';

// ─── Base Player Game Data (extended per game) ────────────────────────
export interface BaseGameData {
  role?: string;
  privateMessage?: string;
  [key: string]: unknown;
}

// ─── Player Document ──────────────────────────────────────────────────
export interface Player {
  id: string;
  name: string;
  isAlive: boolean;
  isHost: boolean;
  gameData: BaseGameData;
  joinedAt: Timestamp | Date;
}

// ─── Player creation payload ──────────────────────────────────────────
export interface CreatePlayerPayload {
  id: string;
  name: string;
  isHost: boolean;
}
