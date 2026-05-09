export type ActionType = 'ability' | 'vote' | 'nominate';
export type ActionStatus = 'pending' | 'resolved';

export interface ActionResult {
  message?: string;
  data?: Record<string, unknown>;
  resolvedBy: string;
  resolvedAt: string | Date;
}

export interface GameAction {
  id: string;
  playerId: string;
  playerName: string;
  actionType: ActionType;
  targetId?: string;
  targetName?: string;
  secondTargetId?: string;
  secondTargetName?: string;
  status: ActionStatus;
  result?: ActionResult;
  createdAt: string | Date;
}

export interface SubmitActionPayload {
  playerId: string;
  playerName: string;
  actionType: ActionType;
  targetId?: string;
  targetName?: string;
  secondTargetId?: string;
  secondTargetName?: string;
}
