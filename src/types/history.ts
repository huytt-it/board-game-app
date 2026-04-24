import type { Timestamp } from 'firebase/firestore';

// ─── History Event Types ───────────────────────────────────────────────
export type GameHistoryEventType =
  | 'phase_change'   // Night/Day transition
  | 'night_action'   // Any resolved night action
  | 'night_death'    // Someone died at night
  | 'execution'      // Someone was executed by town vote
  | 'note';          // Storyteller manual note

export interface GameHistoryEvent {
  id: string;
  type: GameHistoryEventType;
  dayCount: number;
  phase: 'night' | 'day';
  emoji: string;
  title: string;
  detail?: string;
  actorName?: string;
  actorRole?: string;
  targetName?: string;
  targetRole?: string;
  createdAt: Timestamp | Date;
}

export interface AddHistoryEventPayload {
  type: GameHistoryEventType;
  dayCount: number;
  phase: 'night' | 'day';
  emoji: string;
  title: string;
  detail?: string;
  actorName?: string;
  actorRole?: string;
  targetName?: string;
  targetRole?: string;
}
