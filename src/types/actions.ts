import type { Timestamp } from 'firebase/firestore';

// ─── Action Types ─────────────────────────────────────────────────────
export type ActionType = 'ability' | 'vote' | 'nominate';
export type ActionStatus = 'pending' | 'resolved';

// ─── Action Result (storyteller response) ─────────────────────────────
export interface ActionResult {
  message?: string;
  data?: Record<string, unknown>;
  resolvedBy: string; // hostId
  resolvedAt: Timestamp | Date;
}

// ─── Game Action Document ─────────────────────────────────────────────
export interface GameAction {
  id: string;
  playerId: string;
  playerName: string;
  actionType: ActionType;
  targetId?: string;
  targetName?: string;
  secondTargetId?: string;   // Fortune Teller second pick
  secondTargetName?: string;
  status: ActionStatus;
  result?: ActionResult;
  createdAt: Timestamp | Date;
}

// ─── Action submission payload ────────────────────────────────────────
export interface SubmitActionPayload {
  playerId: string;
  playerName: string;
  actionType: ActionType;
  targetId?: string;
  targetName?: string;
  secondTargetId?: string;
  secondTargetName?: string;
}
