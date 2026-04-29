import type { BaseGameData } from '@/types/player';

export enum AvalonRole {
  Merlin = 'Merlin',
  Percival = 'Percival',
  LoyalServant = 'Loyal Servant',
  Mordred = 'Mordred',
  Morgana = 'Morgana',
  Oberon = 'Oberon',
  Assassin = 'Assassin',
  Minion = 'Minion of Mordred',
}

export type AvalonTeam = 'good' | 'evil';

export type AvalonPhase =
  | 'lineup-preview'
  | 'role-reveal'
  | 'night-evils'
  | 'night-merlin'
  | 'night-percival'
  | 'team-build'
  | 'team-vote'
  | 'team-vote-result'
  | 'quest-play'
  | 'quest-result'
  | 'discussion'
  | 'lady-of-lake'
  | 'assassinate'
  | 'end';

export type QuestResult = 'success' | 'fail';
export type TeamVote = 'approve' | 'reject';
export type QuestCard = 'success' | 'fail';

export interface AvalonQuestRecord {
  result: QuestResult | null;
  failCount: number;
  teamSize: number;
  leaderId: string | null;
  teamIds: string[];
  approveCount?: number;
  rejectCount?: number;
}

export interface AvalonGameData extends BaseGameData {
  role: AvalonRole;
  team: AvalonTeam;
  // null = đã reset / chưa chơi (giai đoạn quest-play). undefined = chưa từng có giá trị.
  questCard?: QuestCard | null;
}

export interface AvalonGameState {
  rolesAssigned: boolean;
  phase: AvalonPhase;
  currentQuest: number;
  currentLeaderId: string | null;
  proposedTeam: string[];
  voteRejectStreak: number;
  quests: AvalonQuestRecord[];
  teamVotes: Record<string, TeamVote>;
  questPlayedBy: string[];
  ladyHolderId: string | null;
  ladyHistory: string[];
  ladyTargetId: string | null;
  merlinTargetId: string | null;
  winner: AvalonTeam | null;
  roleAcks: Record<string, boolean>;
  phaseStartedAt: number;
  roleLineup: AvalonRole[];
  leadersUsed: string[];
  lastTeamVoteResult: 'approved' | 'rejected' | null;
  ladyShownCard: 'good' | 'evil' | null;
  seatOrder: string[];
  assassinChoiceId: string | null;
}

export const PHASE_TIMEOUTS_MS: Record<AvalonPhase, number> = {
  'lineup-preview': 60_000,
  'role-reveal': 120_000,
  'night-evils': 45_000,
  'night-merlin': 45_000,
  'night-percival': 45_000,
  'team-build': 60_000,
  'team-vote': 30_000,
  'team-vote-result': 8_000,
  'quest-play': 120_000,
  'quest-result': 8_000,
  'discussion': 600_000,
  'lady-of-lake': 60_000,
  'assassinate': 180_000,
  'end': 0,
};

export interface AvalonRoomConfig {
  optionalRoles: AvalonRole[];
  useLadyOfLake: boolean;
}
