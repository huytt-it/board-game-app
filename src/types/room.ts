import type { Timestamp } from 'firebase/firestore';

// ─── Game Type Registry ───────────────────────────────────────────────
export type GameType = 'clock-tower' | 'werewolf' | 'avalon';

// ─── Room Status ──────────────────────────────────────────────────────
export type RoomStatus = 'lobby' | 'day' | 'night' | 'voting' | 'end';

export interface RoleConfig {
  mandatoryRoles: string[]; // ClocktowerRole[]
  excludedRoles: string[]; // ClocktowerRole[]
  teamCounts?: Record<string, number>;
}

// ─── Room Configuration (generic, extended per game) ──────────────────
export interface RoomConfig {
  maxPlayers: number;
  roleConfig?: RoleConfig;
  [key: string]: unknown;
}

// ─── Game State (stored in room doc for real-time sync) ───────────────
// Generic fields shared by all games. Game-specific extensions live in each
// game's own GameState type (e.g. ClocktowerGameState in clocktower.ts).
// Clocktower-specific fields are kept here until Avalon requires a clean split.
export interface RoomGameState {
  dayCount: number;
  nominations?: Record<string, string | null>; // playerId -> targetId
  votingTarget?: string | null;
  votingTargetName?: string | null;
  votes: Record<string, boolean>;
  rolesAssigned: boolean;
  winner?: 'good' | 'evil' | null;
  lastExecutedPlayerId?: string | null;  // Undertaker: who was executed last day
  lastExecutedRole?: string | null;      // Undertaker: their true role
  pendingSlayerAction?: { slayerName: string; targetId: string; targetName: string } | null;
  pendingStarpassAction?: {
    impPlayerId: string;
    impPlayerName: string;
    minions: Array<{ id: string; name: string; role: string }>;
  } | null; // Imp self-kill → Minion becomes new Imp
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
