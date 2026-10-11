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
  // GĐ8 — optional: a game started before them (or an old room) has none and
  // runs on the defaults.
  /** Durations (ms) the host set, fixed when the game starts (phaseTimeoutMs). */
  timeouts?: Partial<Record<AvalonPhase, number>>;
  /** What happens when the Lady's time runs out before she has looked. */
  ladyTimeoutMode?: LadyTimeoutMode;
  /** How the last Lady turn ended — public, never a team (that stays in ladyShownCard). */
  ladyLastEvent?: LadyEvent | null;
}

// The six phases whose length the host can set (room settings, GĐ8). The two
// 8-second result reviews, the night, the role reveal and the line-up stay fixed.
export type TimedPhase = 'team-build' | 'team-vote' | 'quest-play' | 'discussion' | 'lady-of-lake' | 'assassinate';

/** Seconds: the settings' stepper bounds and step, and the default (= PHASE_TIMEOUTS_MS). */
export const PHASE_SECONDS_LIMITS: Record<TimedPhase, { min: number; max: number; step: number; def: number }> = {
  'team-build': { min: 30, max: 180, step: 15, def: 60 },
  'team-vote': { min: 15, max: 120, step: 15, def: 30 },
  'quest-play': { min: 30, max: 300, step: 30, def: 120 },
  'discussion': { min: 60, max: 1200, step: 60, def: 600 },
  'lady-of-lake': { min: 30, max: 180, step: 15, def: 60 },
  'assassinate': { min: 60, max: 600, step: 60, def: 180 },
};

export const TIMED_PHASES = Object.keys(PHASE_SECONDS_LIMITS) as TimedPhase[];

// The Lady's time runs out before she has looked:
// - 'skip': no look; the token goes to a random player who never held it (default, as before);
// - 'random': the game looks for her (her aim, or a random valid player) and she sees the card;
// - 'wait': the game stops until she looks (the host can skip or look at random for her).
export type LadyTimeoutMode = 'skip' | 'random' | 'wait';

export interface LadyEvent {
  /** Index of the quest that was just played (the Lady turn after it). */
  quest: number;
  holderId: string;
  targetId: string | null;
  how: 'inspected' | 'random' | 'skipped';
  newHolderId: string;
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

/** How long `phase` lasts in this game: the duration fixed when it started,
 *  else the default. The ONLY reader of PHASE_TIMEOUTS_MS. */
export function phaseTimeoutMs(state: Pick<AvalonGameState, 'phase' | 'timeouts'>, phase: AvalonPhase = state.phase): number {
  return state.timeouts?.[phase] ?? PHASE_TIMEOUTS_MS[phase];
}

export interface AvalonRoomConfig {
  optionalRoles: AvalonRole[];
  useLadyOfLake: boolean;
  /** Seconds per adjustable phase; missing = default. */
  phaseSeconds?: Partial<Record<TimedPhase, number>>;
  ladyTimeoutMode?: LadyTimeoutMode;
}
