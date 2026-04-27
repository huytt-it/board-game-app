'use client';

import { useState, useMemo } from 'react';
import type { Player } from '@/types/player';
import { AvalonRole, type AvalonGameState, type AvalonGameData, type AvalonQuestRecord } from './types';
import PlayerPanel from './PlayerPanel';
import RoleReveal from './RoleReveal';
import RoleCard from './RoleCard';
import { QUEST_TEAM_SIZES } from './constants';

type PreviewPhase =
  | 'lineup-preview'
  | 'role-reveal'
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
  | 'team-vote-result-approved'
  | 'team-vote-result-rejected'
  | 'quest-play-on-team'
  | 'quest-play-not-on-team'
  | 'quest-result-success'
  | 'quest-result-fail'
  | 'lady-holder'
  | 'lady-holder-waiting'
  | 'lady-holder-result-good'
  | 'lady-holder-result-evil'
  | 'lady-target-good'
  | 'lady-target-good-sent'
  | 'lady-target-evil-choosing'
  | 'lady-target-evil-shown-good'
  | 'lady-bystander'
  | 'assassinate-as-assassin'
  | 'assassinate-good-bystander'
  | 'assassinate-evil-bystander'
  | 'end-good-quests'
  | 'end-good-missed-merlin'
  | 'end-evil-quests'
  | 'end-evil-merlin'
  | 'end-evil-rejects';

const PHASE_LABELS: Record<PreviewPhase, string> = {
  'lineup-preview': '🎭 Vai trong ván (preview)',
  'role-reveal': '🌙 Lộ vai (Merlin)',
  'night-evils-as-evil': '🗡️ Đêm — Phe Ác (xem đồng đội)',
  'night-evils-as-oberon': '🗡️ Đêm — Oberon đơn độc',
  'night-evils-as-good': '🗡️ Đêm — Phe Thiện chờ',
  'night-merlin-as-merlin': '🧙 Đêm — Merlin nhìn Phe Ác',
  'night-merlin-as-other': '🧙 Đêm — Người khác chờ',
  'night-percival-as-percival': '🛡️ Đêm — Percival nhìn Merlin/Morgana',
  'night-percival-as-other': '🛡️ Đêm — Người khác chờ',
  'team-build-leader': '⚔️ Chọn đội (đang là Leader)',
  'team-build-follower': '⚔️ Chọn đội (chờ Leader)',
  'team-vote-not-voted': '🗳️ Bỏ phiếu (chưa bầu)',
  'team-vote-voted': '🗳️ Bỏ phiếu (đã bầu)',
  'team-vote-result-approved': '📊 KQ phiếu — Đội duyệt',
  'team-vote-result-rejected': '📊 KQ phiếu — Đội từ chối',
  'quest-play-on-team': '🎴 Chơi Quest (trong đội)',
  'quest-play-not-on-team': '🎴 Chơi Quest (ngoài đội)',
  'quest-result-success': '📜 KQ Quest — Thiện thành công',
  'quest-result-fail': '📜 KQ Quest — Ác phá hoại',
  'lady-holder': '🌊 Lady — bạn cầm token (chọn người)',
  'lady-holder-waiting': '🌊 Lady — chờ target chọn lá',
  'lady-holder-result-good': '🌊 Lady — kết quả: target hiện Thiện',
  'lady-holder-result-evil': '🌊 Lady — kết quả: target hiện Ác',
  'lady-target-good': '🌊 Lady — bạn (Thiện) chuẩn bị gửi',
  'lady-target-good-sent': '🌊 Lady — bạn (Thiện) đã gửi',
  'lady-target-evil-choosing': '🌊 Lady — bạn (Ác) chọn lá hiện',
  'lady-target-evil-shown-good': '🌊 Lady — bạn (Ác) đã hiện Thiện (xạo)',
  'lady-bystander': '🌊 Lady — bạn ngoài cuộc',
  'assassinate-as-assassin': '🗡️ Ám sát (bạn là Sát Thủ)',
  'assassinate-good-bystander': '🗡️ Ám sát (Thiện — im lặng)',
  'assassinate-evil-bystander': '🗡️ Ám sát (Ác — hội ý)',
  'end-good-quests': '🏁 Kết thúc — Thiện thắng (3 Quest)',
  'end-good-missed-merlin': '🏁 Kết thúc — Thiện thắng (Sát Thủ trật)',
  'end-evil-quests': '🏁 Kết thúc — Ác thắng (3 Quest fail)',
  'end-evil-merlin': '🏁 Kết thúc — Ác thắng (đoán trúng Merlin)',
  'end-evil-rejects': '🏁 Kết thúc — Ác thắng (5 lần từ chối)',
};

const PHASE_GROUPS: { label: string; items: PreviewPhase[] }[] = [
  { label: 'Trước ván', items: ['lineup-preview'] },
  { label: 'Lộ vai', items: ['role-reveal'] },
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
  { label: 'Bỏ phiếu đội', items: ['team-vote-not-voted', 'team-vote-voted'] },
  { label: 'KQ phiếu đội', items: ['team-vote-result-approved', 'team-vote-result-rejected'] },
  { label: 'Chơi Quest', items: ['quest-play-on-team', 'quest-play-not-on-team'] },
  { label: 'KQ Quest', items: ['quest-result-success', 'quest-result-fail'] },
  {
    label: 'Lady of the Lake',
    items: [
      'lady-holder',
      'lady-holder-waiting',
      'lady-holder-result-good',
      'lady-holder-result-evil',
      'lady-target-good',
      'lady-target-good-sent',
      'lady-target-evil-choosing',
      'lady-target-evil-shown-good',
      'lady-bystander',
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
      'end-good-quests',
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

function buildScene(phase: PreviewPhase): { players: Player[]; state: AvalonGameState; viewerId: string } {
  const players = basePlayers();
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
    phaseStartedAt: Date.now() - 30_000,
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
  };

  switch (phase) {
    case 'lineup-preview':
      return {
        players,
        state: {
          ...base,
          phase: 'lineup-preview',
          roleAcks: { p1: true, p2: true },
          phaseStartedAt: Date.now() - 10_000,
        },
        viewerId: 'p3',
      };

    case 'role-reveal':
      return { players, state: { ...base, phase: 'role-reveal' }, viewerId: 'p1' };

    case 'night-evils-as-evil':
      return {
        players,
        state: {
          ...base,
          phase: 'night-evils',
          roleAcks: { p5: true },
          phaseStartedAt: Date.now() - 10_000,
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
          phaseStartedAt: Date.now() - 8_000,
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
          phaseStartedAt: Date.now() - 12_000,
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
          phaseStartedAt: Date.now() - 5_000,
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
          phaseStartedAt: Date.now() - 5_000,
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
          phaseStartedAt: Date.now() - 5_000,
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
          phaseStartedAt: Date.now() - 5_000,
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

    case 'quest-play-on-team': {
      const ps = players.map((p) =>
        p.id === 'p1' ? makePlayer('p1', 'Alice', AvalonRole.Merlin) : p
      );
      return {
        players: ps,
        state: {
          ...base,
          phase: 'quest-play',
          proposedTeam: ['p1', 'p5'],
          questPlayedBy: [],
        },
        viewerId: 'p1',
      };
    }

    case 'quest-play-not-on-team':
      return {
        players,
        state: {
          ...base,
          phase: 'quest-play',
          proposedTeam: ['p1', 'p5'],
          questPlayedBy: ['p1'],
        },
        viewerId: 'p3',
      };

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

    case 'lady-holder-waiting':
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
          ladyTargetId: 'p7',
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

    case 'lady-target-good':
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

    case 'lady-target-good-sent':
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

    case 'lady-target-evil-choosing':
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
        viewerId: 'p7',
      };

    case 'lady-target-evil-shown-good':
      return {
        players,
        state: {
          ...base,
          phase: 'lady-of-lake',
          currentQuest: 1,
          ladyHolderId: 'p4',
          ladyTargetId: 'p7',
          ladyShownCard: 'good',
        },
        viewerId: 'p7',
      };

    case 'lady-bystander':
      return {
        players,
        state: {
          ...base,
          phase: 'lady-of-lake',
          currentQuest: 1,
          ladyHolderId: 'p4',
          ladyTargetId: 'p7',
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

    case 'end-good-quests': {
      const quests = emptyQuests();
      quests[0].result = 'success';
      quests[1].result = 'fail';
      quests[1].failCount = 1;
      quests[2].result = 'success';
      quests[3].result = 'fail';
      quests[3].failCount = 2;
      quests[4].result = 'success';
      return {
        players,
        state: {
          ...base,
          phase: 'end',
          quests,
          currentQuest: 4,
          winner: 'good',
        },
        viewerId: 'p1',
      };
    }

    case 'end-good-missed-merlin': {
      const quests = emptyQuests();
      quests[0].result = 'success';
      quests[1].result = 'success';
      quests[2].result = 'fail';
      quests[2].failCount = 1;
      quests[3].result = 'success';
      return {
        players,
        state: {
          ...base,
          phase: 'end',
          quests,
          currentQuest: 4,
          winner: 'good',
          merlinTargetId: 'p3',
        },
        viewerId: 'p1',
      };
    }

    case 'end-evil-quests': {
      const quests = emptyQuests();
      quests[0].result = 'fail';
      quests[0].failCount = 1;
      quests[1].result = 'success';
      quests[2].result = 'fail';
      quests[2].failCount = 2;
      quests[3].result = 'fail';
      quests[3].failCount = 2;
      return {
        players,
        state: {
          ...base,
          phase: 'end',
          quests,
          currentQuest: 3,
          winner: 'evil',
        },
        viewerId: 'p1',
      };
    }

    case 'end-evil-merlin': {
      const quests = emptyQuests();
      quests[0].result = 'success';
      quests[1].result = 'success';
      quests[2].result = 'fail';
      quests[2].failCount = 1;
      quests[3].result = 'success';
      return {
        players,
        state: {
          ...base,
          phase: 'end',
          quests,
          currentQuest: 4,
          winner: 'evil',
          merlinTargetId: 'p1',
        },
        viewerId: 'p1',
      };
    }

    case 'end-evil-rejects':
      return {
        players,
        state: {
          ...base,
          phase: 'end',
          winner: 'evil',
          voteRejectStreak: 5,
        },
        viewerId: 'p1',
      };
  }
}

export default function AvalonPreview({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState<PreviewPhase>('team-build-leader');
  const [showRoleCard, setShowRoleCard] = useState(false);

  const { players, state, viewerId } = useMemo(() => buildScene(phase), [phase]);
  const myPlayer = players.find((p) => p.id === viewerId)!;
  const myRole = (myPlayer.gameData as Partial<AvalonGameData>).role!;
  const playerCount = players.length;

  const noop = () => undefined;
  const stub = () => undefined;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 animate-fade-in flex flex-col">
      <header className="shrink-0 border-b border-white/10 bg-slate-950/95 backdrop-blur-md">
        <div className="flex items-center gap-2 px-4 py-3 flex-wrap">
          <button
            onClick={onClose}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-bold text-slate-300 active:bg-white/10"
          >
            ← Đóng
          </button>
          <h2 className="text-sm font-black text-white">👁️ Xem trước UI Avalon</h2>
          <span className="ml-auto rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-black text-amber-300 uppercase tracking-wider">
            Mock data
          </span>
        </div>
        <div className="px-4 pb-3 space-y-2">
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Phase
            </label>
            <select
              value={phase}
              onChange={(e) => setPhase(e.target.value as PreviewPhase)}
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
          <p className="text-[11px] text-slate-500">
            👤 Đang xem dưới góc nhìn của <span className="text-white font-bold">{myPlayer.name}</span>
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {phase === 'role-reveal' ? (
          <RoleReveal myRole={myRole} myPlayerId={viewerId} players={players} onDone={() => setPhase('team-build-follower')} />
        ) : (
          <PlayerPanel
            state={state}
            myPlayer={myPlayer}
            players={players}
            playerCount={playerCount}
            onProposedTeamChange={noop}
            onSubmitTeam={stub}
            onCastVote={noop}
            onPlayQuestCard={noop}
            onLadyInspect={noop}
            onLadyShow={noop}
            onLadyFinish={stub}
            onAssassinate={noop}
            onShowMyRole={() => setShowRoleCard(true)}
            onAckRole={stub}
            onAckDiscussion={stub}
          />
        )}
      </div>

      {showRoleCard && myRole && (
        <RoleCard role={myRole} onClose={() => setShowRoleCard(false)} />
      )}
    </div>
  );
}
