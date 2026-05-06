import type { Timestamp } from 'firebase/firestore';

// ─── Game Type Registry ───────────────────────────────────────────────
export type GameType = 'clock-tower' | 'werewolf' | 'avalon' | 'sheriff' | 'shadowhunter';

// ─── Room Status ──────────────────────────────────────────────────────
export type RoomStatus = 'lobby' | 'day' | 'night' | 'voting' | 'end';

export interface RoleConfig {
  mandatoryRoles: string[];
  excludedRoles: string[];
  teamCounts?: Record<string, number>;
}

// ─── Room Configuration (generic, extended per game) ──────────────────
export interface RoomConfig {
  maxPlayers: number;
  roleConfig?: RoleConfig;
  [key: string]: unknown;
}

// ─── Game State — generic minimum shared by all games ─────────────────
// Each game stores its full state here via `as unknown as GameSpecificState`.
// Only these two fields are guaranteed to exist across all games.
export interface RoomGameState {
  rolesAssigned: boolean;
  winner?: string | null;
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
  gameState?: RoomGameState;
  createdAt: Timestamp | Date;
}

// ─── Room creation payload ────────────────────────────────────────────
export interface CreateRoomPayload {
  hostId: string;
  gameType: GameType;
  config: RoomConfig;
  initialGameState?: Record<string, unknown>;
}
