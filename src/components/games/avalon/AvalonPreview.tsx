'use client';

import { useState, useMemo } from 'react';
import { serverNow } from '@/lib/serverClock';
import type { Player } from '@/types/player';
import type { Room } from '@/types/room';
import {
  AvalonRole,
  type AvalonGameState,
  type AvalonGameData,
  type AvalonQuestRecord,
  type QuestCard,
  type TeamVote,
} from './types';
import PlayerPanel from './PlayerPanel';
import RoleReveal from './RoleReveal';
import RoleCard from './RoleCard';
import RolePreviewPopup from './RolePreviewPopup';
import LobbyRoundTable from './LobbyRoundTable';
import AvalonJoinScreen from './AvalonJoinScreen';
import DealingCards from './ui/DealingCards';
import LobbyNotices from './ui/LobbyNotices';
import { useRosterNotices } from './hooks/useRosterChanges';
import { QUEST_TEAM_SIZES } from './constants';
import AvIcon from './assets/AvIcon';
import SceneBackdrop from './scenes/SceneBackdrop';
import SceneTitle from './scenes/SceneTitle';
import { getScene } from './scenes/getScene';
import { getJourney, journeyKey, mulberry32 } from './scenes/journey';
import { LOCATION_IDS, SCENE_IDS, SCENE_NAMES_VI, type LocationId, type SceneId } from './scenes/types';

type PreviewPhase =
  | 'join'
  | 'join-closed'
  | 'lobby'
  | 'dealing'
  | 'lineup-preview'
  | 'role-reveal'
  | 'role-reveal-evil'
  | 'night-evils-as-evil'
  | 'night-evils-as-oberon'
  | 'night-evils-as-good'
  | 'night-merlin-as-merlin'
  | 'night-merlin-as-other'
  | 'night-percival-as-percival'
  | 'night-percival-as-other'
  | 'team-build-leader'
  | 'team-build-follower'
  | 'team-vote-not-voted'
  | 'team-vote-voted'
  | 'team-vote-voted-reject'
  | 'team-vote-result-approved'
  | 'team-vote-result-rejected'
  | 'team-vote-result-rejected-novote'
  | 'team-vote-result-rejected-last'
  | 'quest-play-on-team'
  | 'quest-play-on-team-evil'
  | 'quest-play-played-good'
  | 'quest-play-played-evil'
  | 'quest-play-not-on-team'
  | 'quest-result-success'
  | 'quest-result-fail'
  | 'quest-result-q4-one-fail'
  | 'quest-result-five'
  | 'discussion-pending'
  | 'discussion-mostly-ready'
  | 'discussion-i-acked'
  | 'lady-holder'
  | 'lady-holder-picked'
  | 'lady-holder-result-good'
  | 'lady-holder-result-evil'
  | 'lady-target-aimed'
  | 'lady-target-inspected-good'
  | 'lady-target-inspected-evil'
  | 'lady-bystander-aiming'
  | 'lady-bystander-inspected'
  | 'assassinate-as-assassin'
  | 'assassinate-good-bystander'
  | 'assassinate-evil-bystander'
  | 'end-good-timeout'
  | 'end-good-missed-merlin'
  | 'end-evil-quests'
  | 'end-evil-merlin'
  | 'end-evil-rejects';

const PHASE_LABELS: Record<PreviewPhase, string> = {
  join: 'Trang vào phòng (lời mời)',
  'join-closed': 'Trang vào phòng (ván đang diễn ra)',
  lobby: 'Phòng chờ (lobby) — có nút Người vào / rời',
  dealing: 'Đang chia bài…',
  'lineup-preview': 'Vai trong ván (preview)',
  'role-reveal': 'Lộ vai (Merlin)',
  'role-reveal-evil': 'Lộ vai (Sát Thủ)',
  'night-evils-as-evil': 'Đêm — Phe Quỷ (xem đồng đội)',
  'night-evils-as-oberon': 'Đêm — Oberon đơn độc',
  'night-evils-as-good': 'Đêm — Phe Người chờ',
  'night-merlin-as-merlin': 'Đêm — Merlin nhìn Phe Quỷ',
  'night-merlin-as-other': 'Đêm — Người khác chờ',
  'night-percival-as-percival': 'Đêm — Percival nhìn Merlin/Morgana',
  'night-percival-as-other': 'Đêm — Người khác chờ',
  'team-build-leader': 'Chọn đội (đang là Leader)',
  'team-build-follower': 'Chọn đội (chờ Leader)',
  'team-vote-not-voted': 'Bỏ phiếu (chưa bầu)',
  'team-vote-voted': 'Bỏ phiếu (đã bầu Đồng ý)',
  'team-vote-voted-reject': 'Bỏ phiếu (đã bầu Từ chối)',
  'team-vote-result-approved': 'KQ phiếu — Đội duyệt',
  'team-vote-result-rejected': 'KQ phiếu — Đội từ chối',
  'team-vote-result-rejected-novote': 'KQ phiếu — Từ chối (có người không bầu)',
  'team-vote-result-rejected-last': 'KQ phiếu — Từ chối lần 4 (còn 1 ngọn nến)',
  'quest-play-on-team': 'Chơi Quest (trong đội, Phe Người)',
  'quest-play-on-team-evil': 'Chơi Quest (trong đội, Phe Quỷ)',
  'quest-play-played-good': 'Chơi Quest (đã đặt lá Phe Người)',
  'quest-play-played-evil': 'Chơi Quest (đã đặt lá Phe Quỷ)',
  'quest-play-not-on-team': 'Chơi Quest (ngoài đội)',
  'quest-result-success': 'KQ Quest — Người thành công',
  'quest-result-fail': 'KQ Quest — Quỷ phá hoại',
  'quest-result-q4-one-fail': 'KQ Quest IV — 1 lá Quỷ (cần 2, vẫn thành công)',
  'quest-result-five': 'KQ Quest — lật 5 lá (bàn 8+ người)',
  'discussion-pending': 'Thảo luận — bạn chưa sẵn sàng',
  'discussion-mostly-ready': 'Thảo luận — đa số đã sẵn sàng',
  'discussion-i-acked': 'Thảo luận — bạn đã sẵn sàng (chờ người khác)',
  'lady-holder': 'Lady — bạn cầm token (đang chọn người)',
  'lady-holder-picked': 'Lady — bạn đã chọn người (chưa xác nhận)',
  'lady-holder-result-good': 'Lady — kết quả: người bị soi là Người',
  'lady-holder-result-evil': 'Lady — kết quả: người bị soi là Quỷ',
  'lady-target-aimed': 'Lady — bạn đang bị ngắm',
  'lady-target-inspected-good': 'Lady — bạn đã bị soi (Người)',
  'lady-target-inspected-evil': 'Lady — bạn đã bị soi (Quỷ)',
  'lady-bystander-aiming': 'Lady — ngoài cuộc (đang ngắm)',
  'lady-bystander-inspected': 'Lady — ngoài cuộc (đã soi)',
  'assassinate-as-assassin': 'Ám sát (bạn là Sát Thủ)',
  'assassinate-good-bystander': 'Ám sát (Người — im lặng)',
  'assassinate-evil-bystander': 'Ám sát (Quỷ — hội ý)',
  'end-good-timeout': 'Kết thúc — Người thắng (Sát Thủ hết giờ) · xem: Người',
  'end-good-missed-merlin': 'Kết thúc — Người thắng (Sát Thủ trật) · xem: Sát Thủ',
  'end-evil-quests': 'Kết thúc — Quỷ thắng (3 Quest thất bại) · xem: Quỷ',
  'end-evil-merlin': 'Kết thúc — Quỷ thắng (đâm trúng Merlin) · xem: Merlin',
  'end-evil-rejects': 'Kết thúc — Quỷ thắng (5 lần bị bác) · xem: Người',
};

const PHASE_GROUPS: { label: string; items: PreviewPhase[] }[] = [
  { label: 'Vào phòng', items: ['join', 'join-closed'] },
  { label: 'Phòng chờ', items: ['lobby'] },
  { label: 'Trước ván', items: ['dealing', 'lineup-preview'] },
  { label: 'Lộ vai', items: ['role-reveal', 'role-reveal-evil'] },
  {
    label: 'Đêm (sequenced)',
    items: [
      'night-evils-as-evil',
      'night-evils-as-oberon',
      'night-evils-as-good',
      'night-merlin-as-merlin',
      'night-merlin-as-other',
      'night-percival-as-percival',
      'night-percival-as-other',
    ],
  },
  { label: 'Chọn đội', items: ['team-build-leader', 'team-build-follower'] },
  { label: 'Bỏ phiếu đội', items: ['team-vote-not-voted', 'team-vote-voted', 'team-vote-voted-reject'] },
  {
    label: 'KQ phiếu đội',
    items: [
      'team-vote-result-approved',
      'team-vote-result-rejected',
      'team-vote-result-rejected-novote',
      'team-vote-result-rejected-last',
    ],
  },
  {
    label: 'Chơi Quest',
    items: [
      'quest-play-on-team',
      'quest-play-on-team-evil',
      'quest-play-played-good',
      'quest-play-played-evil',
      'quest-play-not-on-team',
    ],
  },
  { label: 'KQ Quest', items: ['quest-result-success', 'quest-result-fail', 'quest-result-q4-one-fail', 'quest-result-five'] },
  {
    label: 'Thảo luận sau Quest',
    items: ['discussion-pending', 'discussion-mostly-ready', 'discussion-i-acked'],
  },
  {
    label: 'Lady of the Lake',
    items: [
      'lady-holder',
      'lady-holder-picked',
      'lady-holder-result-good',
      'lady-holder-result-evil',
      'lady-target-aimed',
      'lady-target-inspected-good',
      'lady-target-inspected-evil',
      'lady-bystander-aiming',
      'lady-bystander-inspected',
    ],
  },
  {
    label: 'Sát Thủ',
    items: [
      'assassinate-as-assassin',
      'assassinate-good-bystander',
      'assassinate-evil-bystander',
    ],
  },
  {
    label: 'Kết thúc',
    items: [
      'end-good-timeout',
      'end-good-missed-merlin',
      'end-evil-quests',
      'end-evil-merlin',
      'end-evil-rejects',
    ],
  },
];

function makePlayer(
  id: string,
  name: string,
  role: AvalonRole,
  questCard?: 'success' | 'fail'
): Player {
  const team = (
    role === AvalonRole.Merlin ||
    role === AvalonRole.Percival ||
    role === AvalonRole.LoyalServant
      ? 'good'
      : 'evil'
  ) as AvalonGameData['team'];
  return {
    id,
    name,
    isAlive: true,
    isHost: false,
    gameData: { role, team, ...(questCard ? { questCard } : {}) } as AvalonGameData,
    joinedAt: new Date(),
  };
}

function basePlayers(): Player[] {
  return [
    makePlayer('p1', 'Alice', AvalonRole.Merlin),
    makePlayer('p2', 'Bob', AvalonRole.Percival),
    makePlayer('p3', 'Charlie', AvalonRole.LoyalServant),
    makePlayer('p4', 'David', AvalonRole.LoyalServant),
    makePlayer('p5', 'Eve', AvalonRole.Mordred),
    makePlayer('p6', 'Frank', AvalonRole.Assassin),
    makePlayer('p7', 'Grace', AvalonRole.Morgana),
  ];
}

function emptyQuests(): AvalonQuestRecord[] {
  const sizes = QUEST_TEAM_SIZES[7];
  return sizes.map((s) => ({ result: null, failCount: 0, teamSize: s, leaderId: null, teamIds: [] }));
}

// A quest that was played: its approved team (Leader, members, the vote on
// it), result and fail cards — what the end summary reads.
function played(
  q: AvalonQuestRecord,
  leaderId: string,
  teamIds: string[],
  votes: [approve: number, reject: number],
  failCount: number,
  result: 'success' | 'fail' = failCount > 0 ? 'fail' : 'success'
): AvalonQuestRecord {
  return { ...q, leaderId, teamIds, approveCount: votes[0], rejectCount: votes[1], failCount, result };
}

// The end scenes' journeys (7 players; quest IV needs two fail cards).
function goodJourney(): AvalonQuestRecord[] {
  const q = emptyQuests();
  q[0] = played(q[0], 'p1', ['p1', 'p3'], [5, 2], 0);
  q[1] = played(q[1], 'p2', ['p2', 'p5', 'p7'], [4, 3], 1);
  q[2] = played(q[2], 'p3', ['p1', 'p3', 'p4'], [6, 1], 0);
  q[3] = played(q[3], 'p4', ['p1', 'p2', 'p4', 'p6'], [5, 2], 1, 'success');
  return q;
}
function evilJourney(): AvalonQuestRecord[] {
  const q = emptyQuests();
  q[0] = played(q[0], 'p1', ['p1', 'p5'], [4, 3], 1);
  q[1] = played(q[1], 'p2', ['p2', 'p3', 'p4'], [5, 2], 0);
  q[2] = played(q[2], 'p3', ['p3', 'p5', 'p6'], [4, 3], 2);
  q[3] = played(q[3], 'p4', ['p4', 'p5', 'p6', 'p7'], [4, 3], 2);
  return q;
}

// `replay` rebuilds the scene as if the phase had JUST started (phaseStartedAt =
// serverNow()), so entry animations and countdowns can be watched again.
function buildScene(
  phase: PreviewPhase,
  replay: boolean
): { players: Player[]; state: AvalonGameState; viewerId: string } {
  const players = basePlayers();
  // Phase start time `ms` milliseconds in the past — all on the shared server clock.
  const ago = (ms: number) => serverNow() - (replay ? 0 : ms);
  const base: AvalonGameState = {
    rolesAssigned: true,
    phase: 'team-build',
    currentQuest: 0,
    currentLeaderId: 'p1',
    proposedTeam: [],
    voteRejectStreak: 0,
    quests: emptyQuests(),
    teamVotes: {},
    questPlayedBy: [],
    ladyHolderId: 'p4',
    ladyHistory: [],
    ladyTargetId: null,
    merlinTargetId: null,
    winner: null,
    roleAcks: { p1: true, p2: true, p3: true },
    phaseStartedAt: ago(30_000),
    roleLineup: [
      AvalonRole.Merlin,
      AvalonRole.Percival,
      AvalonRole.LoyalServant,
      AvalonRole.LoyalServant,
      AvalonRole.Mordred,
      AvalonRole.Assassin,
      AvalonRole.Morgana,
    ],
    leadersUsed: ['p1'],
    lastTeamVoteResult: null,
    ladyShownCard: null,
    seatOrder: players.map((p) => p.id),
    assassinChoiceId: null,
  };

  switch (phase) {
    case 'join':
    case 'join-closed':
    case 'dealing':
    case 'lobby':
      // Lobby phase doesn't use AvalonGameState; PlayerPanel is bypassed.
      return {
        players,
        state: { ...base, rolesAssigned: false, phase: 'lineup-preview' },
        viewerId: 'p3',
      };

    case 'lineup-preview':
      return {
        players,
        state: {
          ...base,
          phase: 'lineup-preview',
          roleAcks: { p1: true, p2: true },
          phaseStartedAt: ago(10_000),
        },
        viewerId: 'p3',
      };

    case 'role-reveal':
      return { players, state: { ...base, phase: 'role-reveal' }, viewerId: 'p1' };

    case 'role-reveal-evil':
      return { players, state: { ...base, phase: 'role-reveal' }, viewerId: 'p6' };

    case 'night-evils-as-evil':
      return {
        players,
        state: {
          ...base,
          phase: 'night-evils',
          roleAcks: { p5: true },
          phaseStartedAt: ago(10_000),
        },
        viewerId: 'p6',
      };

    case 'night-evils-as-oberon': {
      const oberonPlayers = players.map((p) =>
        p.id === 'p7' ? makePlayer('p7', 'Grace', AvalonRole.Oberon) : p
      );
      return {
        players: oberonPlayers,
        state: {
          ...base,
          phase: 'night-evils',
          roleAcks: { p5: true, p6: true },
          phaseStartedAt: ago(8_000),
        },
        viewerId: 'p7',
      };
    }

    case 'night-evils-as-good':
      return {
        players,
        state: {
          ...base,
          phase: 'night-evils',
          roleAcks: { p5: true, p6: true },
          phaseStartedAt: ago(12_000),
        },
        viewerId: 'p1',
      };

    case 'night-merlin-as-merlin':
      return {
        players,
        state: {
          ...base,
          phase: 'night-merlin',
          roleAcks: {},
          phaseStartedAt: ago(5_000),
        },
        viewerId: 'p1',
      };

    case 'night-merlin-as-other':
      return {
        players,
        state: {
          ...base,
          phase: 'night-merlin',
          roleAcks: {},
          phaseStartedAt: ago(5_000),
        },
        viewerId: 'p2',
      };

    case 'night-percival-as-percival':
      return {
        players,
        state: {
          ...base,
          phase: 'night-percival',
          roleAcks: {},
          phaseStartedAt: ago(5_000),
        },
        viewerId: 'p2',
      };

    case 'night-percival-as-other':
      return {
        players,
        state: {
          ...base,
          phase: 'night-percival',
          roleAcks: {},
          phaseStartedAt: ago(5_000),
        },
        viewerId: 'p3',
      };

    case 'team-build-leader':
      return {
        players,
        state: { ...base, phase: 'team-build', proposedTeam: ['p1'] },
        viewerId: 'p1',
      };

    case 'team-build-follower':
      return {
        players,
        state: { ...base, phase: 'team-build', proposedTeam: ['p1', 'p5'] },
        viewerId: 'p3',
      };

    case 'team-vote-not-voted':
      return {
        players,
        state: {
          ...base,
          phase: 'team-vote',
          proposedTeam: ['p1', 'p5'],
          teamVotes: { p2: 'approve', p4: 'reject' },
          voteRejectStreak: 1,
        },
        viewerId: 'p3',
      };

    case 'team-vote-voted':
      return {
        players,
        state: {
          ...base,
          phase: 'team-vote',
          proposedTeam: ['p1', 'p5'],
          teamVotes: { p1: 'approve', p2: 'approve', p3: 'approve', p4: 'reject' },
          voteRejectStreak: 2,
        },
        viewerId: 'p3',
      };

    case 'team-vote-voted-reject':
      return {
        players,
        state: {
          ...base,
          phase: 'team-vote',
          proposedTeam: ['p1', 'p5'],
          teamVotes: { p1: 'approve', p2: 'approve', p3: 'reject', p4: 'reject' },
          voteRejectStreak: 2,
        },
        viewerId: 'p3',
      };

    // Privacy pairs: the on-team screens of a Good and an Evil player, before
    // and after placing a card, must look alike from a distance (ux-plan 2.9).
    case 'quest-play-on-team-evil':
      return {
        players,
        // Charlie leads, so neither viewer gets the (public) "you are Leader" strip.
        state: { ...base, phase: 'quest-play', currentLeaderId: 'p3', proposedTeam: ['p1', 'p5'], questPlayedBy: [] },
        viewerId: 'p5',
      };

    case 'quest-play-played-good':
    case 'quest-play-played-evil': {
      const good = phase === 'quest-play-played-good';
      const ps = players.map((p) =>
        p.id === 'p1'
          ? makePlayer('p1', 'Alice', AvalonRole.Merlin, good ? 'success' : undefined)
          : p.id === 'p5'
            ? makePlayer('p5', 'Eve', AvalonRole.Mordred, good ? undefined : 'fail')
            : p
      );
      return {
        players: ps,
        state: {
          ...base,
          phase: 'quest-play',
          currentLeaderId: 'p3',
          proposedTeam: ['p1', 'p5'],
          questPlayedBy: [good ? 'p1' : 'p5'],
        },
        viewerId: good ? 'p1' : 'p5',
      };
    }

    case 'quest-play-on-team': {
      const ps = players.map((p) =>
        p.id === 'p1' ? makePlayer('p1', 'Alice', AvalonRole.Merlin) : p
      );
      return {
        players: ps,
        state: {
          ...base,
          phase: 'quest-play',
          currentLeaderId: 'p3',
          proposedTeam: ['p1', 'p5'],
          questPlayedBy: [],
        },
        viewerId: 'p1',
      };
    }

    case 'quest-play-not-on-team':
      return {
        players: players.map((p) => (p.id === 'p1' ? makePlayer('p1', 'Alice', AvalonRole.Merlin, 'success') : p)),
        state: {
          ...base,
          phase: 'quest-play',
          proposedTeam: ['p1', 'p5'],
          questPlayedBy: ['p1'],
        },
        viewerId: 'p3',
      };

    // Lady of the Lake — the holder (p4) picks a target and confirms; the Lady
    // always sees the target's TRUE team and the target never chooses a card.
    case 'lady-holder':
      return {
        players,
        state: {
          ...base,
          phase: 'lady-of-lake',
          currentQuest: 1,
          ladyHolderId: 'p4',
          ladyTargetId: null,
        },
        viewerId: 'p4',
      };

    case 'lady-holder-picked':
      return {
        players,
        state: {
          ...base,
          phase: 'lady-of-lake',
          currentQuest: 1,
          ladyHolderId: 'p4',
          ladyTargetId: 'p7',
          ladyShownCard: null,
        },
        viewerId: 'p4',
      };

    case 'lady-holder-result-good':
      return {
        players,
        state: {
          ...base,
          phase: 'lady-of-lake',
          currentQuest: 1,
          ladyHolderId: 'p4',
          ladyTargetId: 'p3',
          ladyShownCard: 'good',
        },
        viewerId: 'p4',
      };

    case 'lady-holder-result-evil':
      return {
        players,
        state: {
          ...base,
          phase: 'lady-of-lake',
          currentQuest: 1,
          ladyHolderId: 'p4',
          ladyTargetId: 'p7',
          ladyShownCard: 'evil',
        },
        viewerId: 'p4',
      };

    case 'lady-target-aimed':
      return {
        players,
        state: {
          ...base,
          phase: 'lady-of-lake',
          currentQuest: 1,
          ladyHolderId: 'p4',
          ladyTargetId: 'p3',
          ladyShownCard: null,
        },
        viewerId: 'p3',
      };

    case 'lady-target-inspected-good':
      return {
        players,
        state: {
          ...base,
          phase: 'lady-of-lake',
          currentQuest: 1,
          ladyHolderId: 'p4',
          ladyTargetId: 'p3',
          ladyShownCard: 'good',
        },
        viewerId: 'p3',
      };

    case 'lady-target-inspected-evil':
      return {
        players,
        state: {
          ...base,
          phase: 'lady-of-lake',
          currentQuest: 1,
          ladyHolderId: 'p4',
          ladyTargetId: 'p7',
          ladyShownCard: 'evil',
        },
        viewerId: 'p7',
      };

    case 'lady-bystander-aiming':
      return {
        players,
        state: {
          ...base,
          phase: 'lady-of-lake',
          currentQuest: 1,
          ladyHolderId: 'p4',
          ladyTargetId: 'p7',
          ladyShownCard: null,
        },
        viewerId: 'p2',
      };

    case 'lady-bystander-inspected':
      return {
        players,
        state: {
          ...base,
          phase: 'lady-of-lake',
          currentQuest: 1,
          ladyHolderId: 'p4',
          ladyTargetId: 'p7',
          ladyShownCard: 'evil',
        },
        viewerId: 'p2',
      };

    case 'team-vote-result-approved':
      return {
        players,
        state: {
          ...base,
          phase: 'team-vote-result',
          proposedTeam: ['p1', 'p5'],
          teamVotes: { p1: 'approve', p2: 'approve', p3: 'approve', p4: 'reject', p5: 'reject', p6: 'approve', p7: 'reject' },
          lastTeamVoteResult: 'approved',
          voteRejectStreak: 0,
          phaseStartedAt: serverNow(),
        },
        viewerId: 'p3',
      };

    case 'team-vote-result-rejected':
      return {
        players,
        state: {
          ...base,
          phase: 'team-vote-result',
          proposedTeam: ['p1', 'p5'],
          teamVotes: { p1: 'reject', p2: 'approve', p3: 'reject', p4: 'reject', p5: 'approve', p6: 'reject', p7: 'approve' },
          lastTeamVoteResult: 'rejected',
          voteRejectStreak: 2,
          phaseStartedAt: serverNow(),
        },
        viewerId: 'p3',
      };

    case 'team-vote-result-rejected-novote':
      // 3 approve, 2 explicit reject, 2 never voted → counted as reject (4).
      return {
        players,
        state: {
          ...base,
          phase: 'team-vote-result',
          proposedTeam: ['p1', 'p5'],
          teamVotes: { p1: 'approve', p2: 'approve', p3: 'approve', p4: 'reject', p5: 'reject' },
          lastTeamVoteResult: 'rejected',
          voteRejectStreak: 2,
          phaseStartedAt: serverNow(),
        },
        viewerId: 'p3',
      };

    case 'team-vote-result-rejected-last':
      // The 4th rejection in a row: one candle left — the track shakes.
      return {
        players,
        state: {
          ...base,
          phase: 'team-vote-result',
          proposedTeam: ['p1', 'p5'],
          teamVotes: { p1: 'reject', p2: 'approve', p3: 'reject', p4: 'reject', p5: 'approve', p6: 'reject', p7: 'reject' },
          lastTeamVoteResult: 'rejected',
          voteRejectStreak: 4,
          phaseStartedAt: serverNow(),
        },
        viewerId: 'p3',
      };

    case 'quest-result-success': {
      const quests = emptyQuests();
      quests[0] = { ...quests[0], result: 'success', failCount: 0, teamSize: 2, leaderId: 'p1', teamIds: ['p1', 'p3'] };
      return {
        players,
        state: {
          ...base,
          phase: 'quest-result',
          currentQuest: 0,
          quests,
          proposedTeam: ['p1', 'p3'],
          phaseStartedAt: serverNow(),
        },
        viewerId: 'p3',
      };
    }

    case 'quest-result-fail': {
      const quests = emptyQuests();
      quests[2] = { ...quests[2], result: 'fail', failCount: 2, teamSize: 3, leaderId: 'p3', teamIds: ['p1', 'p5', 'p7'] };
      return {
        players,
        state: {
          ...base,
          phase: 'quest-result',
          currentQuest: 2,
          quests,
          proposedTeam: ['p1', 'p5', 'p7'],
          phaseStartedAt: serverNow(),
        },
        viewerId: 'p3',
      };
    }

    case 'quest-result-q4-one-fail': {
      // 7 players: the 4th quest needs two fail cards — one is not enough (storm).
      const quests = emptyQuests();
      quests[0] = { ...quests[0], result: 'success', failCount: 0, teamIds: ['p1', 'p3'] };
      quests[1] = { ...quests[1], result: 'fail', failCount: 1, teamIds: ['p2', 'p5', 'p7'] };
      quests[2] = { ...quests[2], result: 'success', failCount: 0, teamIds: ['p1', 'p2', 'p4'] };
      quests[3] = { ...quests[3], result: 'success', failCount: 1, leaderId: 'p4', teamIds: ['p1', 'p2', 'p4', 'p6'] };
      return {
        players,
        state: {
          ...base,
          phase: 'quest-result',
          currentQuest: 3,
          quests,
          currentLeaderId: 'p4',
          proposedTeam: ['p1', 'p2', 'p4', 'p6'],
          phaseStartedAt: serverNow(),
        },
        viewerId: 'p3',
      };
    }

    case 'quest-result-five': {
      // The longest reveal (5 cards — tables of 8+). Mock: 7 seats, team of 5.
      const quests = emptyQuests();
      quests[4] = { ...quests[4], teamSize: 5, result: 'fail', failCount: 2, leaderId: 'p2', teamIds: ['p1', 'p2', 'p4', 'p5', 'p6'] };
      return {
        players,
        state: {
          ...base,
          phase: 'quest-result',
          currentQuest: 4,
          quests,
          currentLeaderId: 'p2',
          proposedTeam: ['p1', 'p2', 'p4', 'p5', 'p6'],
          phaseStartedAt: serverNow(),
        },
        viewerId: 'p3',
      };
    }

    case 'discussion-pending': {
      // After Q1 (no Lady) — fresh discussion, viewer hasn't acked yet.
      const quests = emptyQuests();
      quests[0] = { ...quests[0], result: 'success', failCount: 0, teamSize: 2, leaderId: 'p1', teamIds: ['p1', 'p3'] };
      return {
        players,
        state: {
          ...base,
          phase: 'discussion',
          currentQuest: 1,
          quests,
          roleAcks: { p2: true },
          phaseStartedAt: ago(60_000),
          proposedTeam: [],
          teamVotes: {},
          questPlayedBy: [],
        },
        viewerId: 'p3',
      };
    }

    case 'discussion-mostly-ready': {
      // After Q2 (Lady just finished, token transferred) — most players ready.
      const quests = emptyQuests();
      quests[0] = { ...quests[0], result: 'success', failCount: 0, teamSize: 2, leaderId: 'p1', teamIds: ['p1', 'p3'] };
      quests[1] = { ...quests[1], result: 'fail', failCount: 1, teamSize: 3, leaderId: 'p2', teamIds: ['p2', 'p5', 'p7'] };
      return {
        players,
        state: {
          ...base,
          phase: 'discussion',
          currentQuest: 2,
          quests,
          roleAcks: { p1: true, p2: true, p4: true, p5: true, p6: true },
          ladyHolderId: 'p7',
          ladyHistory: ['p4'],
          phaseStartedAt: ago(480_000),
          proposedTeam: [],
          teamVotes: {},
          questPlayedBy: [],
        },
        viewerId: 'p3',
      };
    }

    case 'discussion-i-acked': {
      // Viewer already pressed "Sẵn sàng", waiting on others.
      const quests = emptyQuests();
      quests[0] = { ...quests[0], result: 'success', failCount: 0, teamSize: 2, leaderId: 'p1', teamIds: ['p1', 'p3'] };
      return {
        players,
        state: {
          ...base,
          phase: 'discussion',
          currentQuest: 1,
          quests,
          roleAcks: { p2: true, p3: true, p5: true },
          phaseStartedAt: ago(200_000),
          proposedTeam: [],
          teamVotes: {},
          questPlayedBy: [],
        },
        viewerId: 'p3',
      };
    }

    case 'assassinate-as-assassin': {
      const quests = emptyQuests();
      quests[0].result = 'success';
      quests[0].failCount = 0;
      quests[1].result = 'success';
      quests[1].failCount = 0;
      quests[2].result = 'fail';
      quests[2].failCount = 1;
      quests[3].result = 'success';
      quests[3].failCount = 0;
      quests[4].result = 'fail';
      quests[4].failCount = 1;
      return {
        players,
        state: { ...base, phase: 'assassinate', quests, currentQuest: 4 },
        viewerId: 'p6',
      };
    }

    case 'assassinate-good-bystander': {
      const quests = emptyQuests();
      quests[0].result = 'success';
      quests[1].result = 'success';
      quests[2].result = 'fail';
      quests[2].failCount = 1;
      quests[3].result = 'success';
      quests[4].result = 'fail';
      quests[4].failCount = 1;
      return {
        players,
        state: { ...base, phase: 'assassinate', quests, currentQuest: 4 },
        viewerId: 'p1',
      };
    }

    case 'assassinate-evil-bystander': {
      const quests = emptyQuests();
      quests[0].result = 'success';
      quests[1].result = 'success';
      quests[2].result = 'fail';
      quests[2].failCount = 1;
      quests[3].result = 'success';
      quests[4].result = 'fail';
      quests[4].failCount = 1;
      return {
        players,
        state: { ...base, phase: 'assassinate', quests, currentQuest: 4 },
        viewerId: 'p7',
      };
    }

    // The five ways a game ends, each seen by someone else: a Good player
    // who won, the Assassin who missed, Merlin who was found, an Evil player
    // whose side failed three quests, a Good player out-voted five times.
    case 'end-good-timeout':
      return {
        players,
        state: {
          ...base,
          phase: 'end',
          phaseStartedAt: serverNow(),
          quests: goodJourney(),
          currentQuest: 3,
          currentLeaderId: 'p4',
          winner: 'good',
        },
        viewerId: 'p3',
      };

    case 'end-good-missed-merlin':
      return {
        players,
        state: {
          ...base,
          phase: 'end',
          phaseStartedAt: serverNow(),
          quests: goodJourney(),
          currentQuest: 3,
          currentLeaderId: 'p4',
          winner: 'good',
          assassinChoiceId: 'p2',
          merlinTargetId: 'p2',
        },
        viewerId: 'p6',
      };

    case 'end-evil-quests':
      return {
        players,
        state: {
          ...base,
          phase: 'end',
          phaseStartedAt: serverNow(),
          quests: evilJourney(),
          currentQuest: 3,
          currentLeaderId: 'p4',
          winner: 'evil',
        },
        viewerId: 'p5',
      };

    case 'end-evil-merlin':
      return {
        players,
        state: {
          ...base,
          phase: 'end',
          phaseStartedAt: serverNow(),
          quests: goodJourney(),
          currentQuest: 3,
          currentLeaderId: 'p4',
          winner: 'evil',
          assassinChoiceId: 'p1',
          merlinTargetId: 'p1',
        },
        viewerId: 'p1',
      };

    case 'end-evil-rejects': {
      // Quest II never left: five teams in a row were turned down.
      const quests = emptyQuests();
      quests[0] = played(quests[0], 'p1', ['p1', 'p3'], [5, 2], 0);
      return {
        players,
        state: {
          ...base,
          phase: 'end',
          phaseStartedAt: serverNow(),
          quests,
          currentQuest: 1,
          currentLeaderId: 'p7',
          winner: 'evil',
          voteRejectStreak: 5,
          lastTeamVoteResult: 'rejected',
        },
        viewerId: 'p4',
      };
    }
  }
}

// Seat order of mock game #n: game 0 keeps the cast order, the others are a
// seeded shuffle — enough to watch the journey change from game to game.
function mockSeatOrder(ids: string[], gameNo: number): string[] {
  if (gameNo === 0) return ids;
  const rand = mulberry32(gameNo * 7919);
  const out = [...ids];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Local "what happened since the scene was built", so the quest-loop
// transitions can be watched in the Preview: the viewer's own actions (pick,
// vote, play a card, get ready) and "someone else acts" / "next Leader".
// Reset whenever the scene is rebuilt.
interface Sim {
  key: string;
  proposedTeam?: string[];
  votes: Record<string, TeamVote>;
  cards: Record<string, QuestCard>;
  acks: Record<string, boolean>;
  leaderSteps: number;
  /** Lobby: players who walked in / out since the scene was built. */
  lobbyIn: number;
  lobbyOut: string[];
}
const freshSim = (key: string): Sim => ({ key, votes: {}, cards: {}, acks: {}, leaderSteps: 0, lobbyIn: 0, lobbyOut: [] });

// Lobby guests the Preview can walk in ("Người vào").
const GUESTS = ['Henry', 'Ivy', 'Jack', 'Kai', 'Liam', 'Mai'];

// A mock room for the invite screen.
function mockRoom(status: Room['status'], seated: number): Room {
  return {
    id: 'preview',
    roomCode: 'DEMO42',
    status,
    gameType: 'avalon',
    hostId: 'p1',
    config: { maxPlayers: 10, optionalRoles: [], useLadyOfLake: true },
    gameState: {},
    createdAt: new Date(),
    updatedAt: Date.now(),
    playerCount: seated,
  } as unknown as Room;
}

export default function AvalonPreview({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState<PreviewPhase>('team-build-leader');
  const [showRoleCard, setShowRoleCard] = useState(false);
  const [showRolePreview, setShowRolePreview] = useState(false);
  // 0 = scene as first picked; each "Phát lại" press bumps it, which rebuilds the
  // scene with phaseStartedAt = now and remounts the panel so entry animations run again.
  const [replayNonce, setReplayNonce] = useState(0);
  // Backdrop: 'auto' follows getScene for the phase; otherwise one scene, forced.
  const [sceneChoice, setSceneChoice] = useState<'auto' | SceneId>('auto');
  const [forceStorm, setForceStorm] = useState(false);
  const [gameNo, setGameNo] = useState(0);

  const built = useMemo(() => {
    const b = buildScene(phase, replayNonce > 0);
    const seatOrder = mockSeatOrder(b.state.seatOrder, gameNo);
    return { ...b, state: { ...b.state, seatOrder } };
  }, [phase, replayNonce, gameNo]);
  const viewerId = built.viewerId;

  const simKey = `${phase}:${replayNonce}:${gameNo}`;
  const [simState, setSimState] = useState<Sim>(() => freshSim(simKey));
  const sim = simState.key === simKey ? simState : freshSim(simKey);
  const updateSim = (f: (s: Sim) => Sim) => setSimState((cur) => f(cur.key === simKey ? cur : freshSim(simKey)));

  const { players, state } = useMemo(() => {
    const ps = built.players.map((p) =>
      sim.cards[p.id] ? { ...p, gameData: { ...p.gameData, questCard: sim.cards[p.id] } as AvalonGameData } : p
    );
    // Seats on the Preview's table follow the players array.
    const leaderAt = ps.findIndex((p) => p.id === built.state.currentLeaderId);
    const leader =
      sim.leaderSteps && leaderAt >= 0 ? ps[(leaderAt + sim.leaderSteps) % ps.length].id : built.state.currentLeaderId;
    return {
      players: ps,
      state: {
        ...built.state,
        currentLeaderId: leader,
        proposedTeam: sim.proposedTeam ?? built.state.proposedTeam,
        teamVotes: { ...built.state.teamVotes, ...sim.votes },
        roleAcks: { ...built.state.roleAcks, ...sim.acks },
      },
    };
  }, [built, sim]);

  // "Someone else acts": the next player who has not done this phase's thing.
  const others = players.filter((p) => p.id !== viewerId);
  const simulate = (() => {
    if (state.phase === 'team-build') {
      const next = players.find((p) => !state.proposedTeam.includes(p.id));
      const size = state.quests[state.currentQuest]?.teamSize ?? 2;
      if (!next) return null;
      return () =>
        updateSim((s) => {
          const team = s.proposedTeam ?? state.proposedTeam;
          return { ...s, proposedTeam: team.length < size ? [...team, next.id] : [...team.slice(1), next.id] };
        });
    }
    if (state.phase === 'team-vote') {
      const next = others.find((p) => !state.teamVotes[p.id]);
      if (!next) return null;
      return () => updateSim((s) => ({ ...s, votes: { ...s.votes, [next.id]: Object.keys(s.votes).length % 2 ? 'reject' : 'approve' } }));
    }
    if (state.phase === 'quest-play') {
      const next = others.find(
        (p) => state.proposedTeam.includes(p.id) && !(p.gameData as Partial<AvalonGameData>).questCard
      );
      if (!next) return null;
      return () => updateSim((s) => ({ ...s, cards: { ...s.cards, [next.id]: 'success' } }));
    }
    if (state.phase === 'discussion') {
      const next = others.find((p) => !state.roleAcks[p.id]);
      if (!next) return null;
      return () => updateSim((s) => ({ ...s, acks: { ...s.acks, [next.id]: true } }));
    }
    return null;
  })();
  const myPlayer = players.find((p) => p.id === viewerId)!;
  const myRole = (myPlayer.gameData as Partial<AvalonGameData>).role!;
  const playerCount = players.length;

  // Lobby: Alice hosts; "Người vào" seats the next guest, "Người rời" makes
  // the third player leave (the seats after slide round).
  const lobbyPlayers = useMemo(() => {
    const seated = players
      .map((p) => (p.id === 'p1' ? { ...p, isHost: true } : p))
      .concat(GUESTS.slice(0, sim.lobbyIn).map((name, i) => makePlayer(`g${i}`, name, AvalonRole.LoyalServant)));
    return seated.filter((p) => !sim.lobbyOut.includes(p.id));
  }, [players, sim.lobbyIn, sim.lobbyOut]);
  const lobbyNotices = useRosterNotices(lobbyPlayers, phase === 'lobby');
  const canWalkIn = lobbyPlayers.length < 10 && sim.lobbyIn < GUESTS.length;
  const leaver = lobbyPlayers.filter((p) => p.id !== viewerId && !p.isHost)[1];
  // The order people joined in, as the line-up's seats slide from it.
  const joinOrder = useMemo(() => mockSeatOrder(players.map((p) => p.id), gameNo + 101), [players, gameNo]);

  const preGame = phase === 'lobby' || phase === 'join' || phase === 'join-closed' || phase === 'dealing';
  const autoScene = getScene(preGame ? null : state, 'preview', playerCount);
  const sceneId = sceneChoice === 'auto' ? autoScene.id : sceneChoice;
  const storm = forceStorm || (sceneChoice === 'auto' && autoScene.storm);
  const journey = getJourney(state, 'preview');
  // What the title announces: the phase's scene, or the forced one.
  const shownScene =
    sceneChoice === 'auto'
      ? autoScene
      : {
          ...autoScene,
          id: sceneChoice,
          location: (LOCATION_IDS as readonly string[]).includes(sceneChoice) ? (sceneChoice as LocationId) : autoScene.location,
        };

  const noop = () => undefined;
  const stub = () => undefined;
  const onProposedTeamChange = (ids: string[]) => updateSim((s) => ({ ...s, proposedTeam: ids }));
  const onCastVote = (v: TeamVote) => updateSim((s) => ({ ...s, votes: { ...s.votes, [viewerId]: v } }));
  const onPlayQuestCard = (c: QuestCard) => updateSim((s) => ({ ...s, cards: { ...s.cards, [viewerId]: c } }));
  const onAckDiscussion = () => updateSim((s) => ({ ...s, acks: { ...s.acks, [viewerId]: true } }));

  return (
    <div className="avalon-root fixed inset-0 z-50 bg-slate-950 animate-fade-in flex flex-col">
      <SceneBackdrop sceneId={sceneId} storm={storm} gloom={sceneChoice === 'auto' ? autoScene.gloom : 0} />
      {/* Remounted by "Phát lại", so the title of the current scene plays again. */}
      <SceneTitle
        key={replayNonce}
        scene={shownScene}
        startedAt={preGame ? null : state.phaseStartedAt}
        quest={state.currentQuest}
        seedKey={journeyKey(state, 'preview')}
      />
      <header className="shrink-0 border-b border-white/10 bg-(color:--av-bar-bg)">
        <div className="flex items-center gap-2 px-4 py-3 flex-wrap">
          <button
            onClick={onClose}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-bold text-slate-300 active:bg-white/10"
          >
            ← Đóng
          </button>
          <h2 className="text-sm font-black text-white">
            <AvIcon name="preview" /> Xem trước UI Avalon
          </h2>
          <span className="ml-auto rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-black text-amber-300 uppercase tracking-wider">
            Mock data
          </span>
        </div>
        <div className="px-4 pb-3 space-y-2">
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Phase
              </label>
              <select
                value={phase}
                onChange={(e) => {
                  setPhase(e.target.value as PreviewPhase);
                  setReplayNonce(0);
                }}
                style={{ colorScheme: 'dark' }}
                className="w-full mt-1 rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm font-bold text-white outline-none focus:border-purple-500"
              >
                {PHASE_GROUPS.map((g) => (
                  <optgroup
                    key={g.label}
                    label={g.label}
                    style={{ background: '#0f172a', color: '#94a3b8' }}
                  >
                    {g.items.map((p) => (
                      <option
                        key={p}
                        value={p}
                        style={{ background: '#0f172a', color: '#ffffff' }}
                      >
                        {PHASE_LABELS[p]}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <button
              onClick={() => setReplayNonce((n) => n + 1)}
              title="Dựng lại cảnh như vừa bắt đầu để xem lại animation"
              className="shrink-0 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-2 text-sm font-bold text-purple-300 active:bg-purple-500/20"
            >
              ↻ Phát lại
            </button>
          </div>
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Cảnh
              </label>
              <select
                value={sceneChoice}
                onChange={(e) => setSceneChoice(e.target.value as 'auto' | SceneId)}
                style={{ colorScheme: 'dark' }}
                className="w-full mt-1 rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm font-bold text-white outline-none focus:border-purple-500"
              >
                <option value="auto" style={{ background: '#0f172a', color: '#ffffff' }}>
                  Theo phase — {SCENE_NAMES_VI[autoScene.id]}
                  {autoScene.storm ? ' (có bão)' : ''}
                </option>
                {SCENE_IDS.map((id) => (
                  <option key={id} value={id} style={{ background: '#0f172a', color: '#ffffff' }}>
                    {SCENE_NAMES_VI[id]}
                  </option>
                ))}
              </select>
            </div>
            <label className="shrink-0 flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-slate-200">
              <input
                type="checkbox"
                checked={forceStorm}
                onChange={(e) => setForceStorm(e.target.checked)}
                className="accent-purple-500"
              />
              Bão
            </label>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <p className="min-w-0 flex-1">
              Hành trình ván #{gameNo + 1}:{' '}
              <span className="text-slate-200">
                {journey.map((id, i) => (
                  <span key={id} className={i === state.currentQuest ? 'font-black text-white' : ''}>
                    {i > 0 ? ' → ' : ''}
                    {SCENE_NAMES_VI[id]}
                  </span>
                ))}
              </span>
            </p>
            <button
              onClick={() => setGameNo((n) => n + 1)}
              title="Đổi thứ tự ghế (seatOrder) như một ván mới để xem hành trình đổi"
              className="shrink-0 rounded-md border border-white/10 bg-white/5 px-2 py-1 font-bold text-slate-200 active:bg-white/10"
            >
              Ván khác
            </button>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <p className="min-w-0 flex-1">
              Đang xem dưới góc nhìn của <span className="text-white font-bold">{myPlayer.name}</span>
            </p>
            {phase === 'lobby' ? (
              <>
                <button
                  onClick={() => updateSim((s) => ({ ...s, lobbyIn: s.lobbyIn + 1 }))}
                  disabled={!canWalkIn}
                  title="Một người vào phòng (ngồi xuống + thông báo)"
                  className="shrink-0 rounded-md border border-white/10 bg-white/5 px-2 py-1 font-bold text-slate-200 active:bg-white/10 disabled:opacity-40"
                >
                  Người vào
                </button>
                <button
                  onClick={() => leaver && updateSim((s) => ({ ...s, lobbyOut: [...s.lobbyOut, leaver.id] }))}
                  disabled={!leaver}
                  title="Một người rời phòng (mờ đi, các ghế sau trượt lên)"
                  className="shrink-0 rounded-md border border-white/10 bg-white/5 px-2 py-1 font-bold text-slate-200 active:bg-white/10 disabled:opacity-40"
                >
                  Người rời
                </button>
              </>
            ) : (
            <button
              onClick={simulate ?? undefined}
              disabled={!simulate}
              title="Một người chơi khác hành động: được đề cử, bỏ phiếu, đặt lá, sẵn sàng"
              className="shrink-0 rounded-md border border-white/10 bg-white/5 px-2 py-1 font-bold text-slate-200 active:bg-white/10 disabled:opacity-40"
            >
              Người khác làm
            </button>
            )}
            <button
              onClick={() => updateSim((s) => ({ ...s, leaderSteps: s.leaderSteps + 1 }))}
              title="Chuyển Leader sang ghế kế tiếp (vương miện bay)"
              className="shrink-0 rounded-md border border-white/10 bg-white/5 px-2 py-1 font-bold text-slate-200 active:bg-white/10"
            >
              Leader kế
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto" data-preview-scene={sceneId}>
        {phase === 'join' || phase === 'join-closed' ? (
          <AvalonJoinScreen
            room={mockRoom(phase === 'join' ? 'lobby' : 'day', players.length)}
            players={players.map((p) => (p.id === 'p1' ? { ...p, isHost: true } : p))}
            onJoin={async () => setPhase('lobby')}
          />
        ) : phase === 'lobby' ? (
          <div className="p-4">
            <LobbyNotices notices={lobbyNotices} players={lobbyPlayers} />
            <LobbyRoundTable
              players={lobbyPlayers}
              myPlayerId={viewerId}
              roomCode="DEMO42"
              maxPlayers={10}
              minPlayers={5}
              reserveSeats={10}
              onKick={(id) => updateSim((s) => ({ ...s, lobbyOut: [...s.lobbyOut, id] }))}
            />
          </div>
        ) : phase === 'dealing' ? (
          <div className="flex min-h-full items-center justify-center p-4">
            <DealingCards />
          </div>
        ) : phase === 'role-reveal' || phase === 'role-reveal-evil' ? (
          <RoleReveal
            key={`${phase}:${replayNonce}`}
            myRole={myRole}
            myPlayerId={viewerId}
            players={players}
            startedAt={state.phaseStartedAt}
            onDone={() => setPhase('team-build-follower')}
          />
        ) : (
          <PlayerPanel
            key={`${phase}:${replayNonce}`}
            state={state}
            myPlayer={myPlayer}
            players={players}
            playerCount={playerCount}
            onProposedTeamChange={onProposedTeamChange}
            onSubmitTeam={stub}
            onCastVote={onCastVote}
            onPlayQuestCard={onPlayQuestCard}
            onLadyInspect={noop}
            onLadyConfirm={stub}
            onLadyShow={noop}
            onLadyFinish={stub}
            onAssassinate={noop}
            onSetAssassinChoice={noop}
            onShowMyRole={() => setShowRoleCard(true)}
            onShowRolePreview={() => setShowRolePreview(true)}
            onAckRole={stub}
            onAckDiscussion={onAckDiscussion}
            onPlayAgain={stub}
            onLeaveRoom={onClose}
            isHost={true}
            roomId="preview"
            joinOrder={joinOrder}
          />
        )}
      </div>

      {showRoleCard && myRole && (
        <RoleCard role={myRole} onClose={() => setShowRoleCard(false)} />
      )}
      {showRolePreview && (
        <RolePreviewPopup
          state={state}
          myPlayer={myPlayer}
          players={players}
          onClose={() => setShowRolePreview(false)}
        />
      )}
    </div>
  );
}
