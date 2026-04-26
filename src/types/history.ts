import type { Timestamp } from 'firebase/firestore';

// ─── History Event Types ───────────────────────────────────────────────
export type GameHistoryEventType =
  | 'phase_change'    // Night/Day transition
  | 'night_action'    // Resolved night ability (host approved + sent info)
  | 'night_death'     // Someone died at night
  | 'execution'       // Someone executed by town vote
  | 'ability_used'    // Day ability used (Slayer, etc.)
  | 'state_change'    // Player state changed (poisoned, protected, master…)
  | 'host_decision'   // Host approved or rejected a pending action
  | 'note';           // Storyteller free-form note

// ─── Result state tags ─────────────────────────────────────────────────
// Attached to events to describe the outcome
export type ResultState =
  | 'poisoned'         // Poisoner: target is now poisoned
  | 'poison_cleared'   // Poisoner: previous victim's poison removed
  | 'protected'        // Monk: target is protected tonight
  | 'master_assigned'  // Butler: master chosen
  | 'killed'           // Slayer / Imp: target died
  | 'miss'             // Slayer: target was not the Demon
  | 'executed'         // Vote: majority agreed → executed
  | 'pardoned'         // Vote: host cancelled / no majority
  | 'approved'         // Host approved a request
  | 'rejected';        // Host rejected a request

export interface GameHistoryEvent {
  id: string;
  type: GameHistoryEventType;
  dayCount: number;
  phase: 'night' | 'day';
  emoji: string;
  title: string;
  detail?: string;
  // Participants
  actorName?: string;
  actorRole?: string;
  targetName?: string;
  targetRole?: string;
  secondTargetName?: string;
  secondTargetRole?: string;
  // Outcome
  resultState?: ResultState;
  // Message sent to the player
  messageSent?: string;
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
  secondTargetName?: string;
  secondTargetRole?: string;
  resultState?: ResultState;
  messageSent?: string;
}
