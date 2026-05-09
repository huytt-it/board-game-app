export type GameHistoryEventType =
  | 'phase_change'
  | 'night_action'
  | 'night_death'
  | 'execution'
  | 'ability_used'
  | 'state_change'
  | 'host_decision'
  | 'note';

export type ResultState =
  | 'poisoned'
  | 'poison_cleared'
  | 'protected'
  | 'master_assigned'
  | 'killed'
  | 'miss'
  | 'executed'
  | 'pardoned'
  | 'approved'
  | 'rejected';

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
  secondTargetName?: string;
  secondTargetRole?: string;
  resultState?: ResultState;
  messageSent?: string;
  createdAt: string | Date;
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
