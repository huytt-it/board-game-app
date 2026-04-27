'use client';

import { useEffect, useState } from 'react';
import type { Player } from '@/types/player';
import { AvalonRole, PHASE_TIMEOUTS_MS, type AvalonGameData, type AvalonGameState, type QuestCard, type TeamVote } from './types';
import {
  ROLE_ICONS,
  ROLE_NAMES_VI,
  ROLE_TEAM,
  TEAM_NAME_VI,
  questNeedsTwoFails,
} from './constants';
import RoundTable from './RoundTable';

interface PlayerPanelProps {
  state: AvalonGameState;
  myPlayer: Player;
  players: Player[];
  playerCount: number;
  onProposedTeamChange: (teamIds: string[]) => void;
  onSubmitTeam: () => void;
  onCastVote: (vote: TeamVote) => void;
  onPlayQuestCard: (card: QuestCard) => void;
  onLadyInspect: (targetId: string) => void;
  onLadyShow: (card: 'good' | 'evil') => void;
  onLadyFinish: () => void;
  onAssassinate: (targetId: string) => void;
  onShowMyRole: () => void;
  onAckRole: () => void;
  onAckDiscussion: () => void;
  onPlayAgain?: () => void;
  onLeaveRoom?: () => void;
  isHost?: boolean;
}

export default function PlayerPanel(props: PlayerPanelProps) {
  const {
    state,
    myPlayer,
    players,
    playerCount,
    onShowMyRole,
  } = props;

  const myData = myPlayer.gameData as Partial<AvalonGameData>;
  const myRole = myData.role;
  const myTeam = myData.team;
  const isLeader = state.currentLeaderId === myPlayer.id;
  const gamePlayers = players;
  const onTeam = state.proposedTeam.includes(myPlayer.id);

  const teamSize = state.quests[state.currentQuest]?.teamSize ?? 0;
  const isGood = myTeam === 'good';

  const showRoundTable = state.phase !== 'lineup-preview' && state.phase !== 'role-reveal';

  // Slim top bar — phase + reject counter + my role chip — kept short so the
  // round table fits in the viewport without scroll on lg+.
  const topBar = (
    <div className="bg-slate-950/95 backdrop-blur-md border-b border-white/10">
      <div className="flex items-center gap-2 px-4 py-2">
        <PhaseChip phase={state.phase} />
        <span className="text-xs text-slate-500 hidden sm:inline">
          Quest {state.currentQuest + 1}/5
        </span>
        {myRole && myTeam && state.phase !== 'lineup-preview' && state.phase !== 'role-reveal' && (
          <button
            onClick={onShowMyRole}
            className={`ml-auto flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-bold active:opacity-75 ${isGood
              ? 'border-blue-500/30 bg-blue-950/40 text-blue-200'
              : 'border-red-500/30 bg-red-950/40 text-red-200'
              }`}
          >
            <span className="text-base">{ROLE_ICONS[myRole]}</span>
            <span className="truncate max-w-[100px]">{ROLE_NAMES_VI[myRole]}</span>
            <span className="text-[10px] opacity-70">ⓘ</span>
          </button>
        )}
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-black ${!(myRole && myTeam) ? 'ml-auto' : ''
            } ${state.voteRejectStreak >= 4
              ? 'bg-red-500/20 text-red-300 border border-red-500/40'
              : state.voteRejectStreak >= 3
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-white/5 text-slate-400 border border-white/10'
            }`}
          title="Số lần Leader bị từ chối liên tiếp"
        >
          👑 {state.voteRejectStreak}/{5}
        </span>
      </div>
      {isLeader && state.phase !== 'role-reveal' && state.phase !== 'end' && (
        <div className="bg-amber-500/10 border-t border-amber-500/30 px-4 py-1 text-center">
          <span className="text-[11px] font-black text-amber-300">👑 Bạn là Leader</span>
        </div>
      )}
    </div>
  );

  // The phase-specific section panel — same content as before, but rendered
  // in a column instead of below the table.
  const phaseSection = (
    <div className="space-y-3">
      {(state.phase === 'team-build' ||
        state.phase === 'team-vote' ||
        state.phase === 'quest-play') &&
        questNeedsTwoFails(playerCount, state.currentQuest) && (
          <div className="rounded-2xl border-2 border-rose-500/50 bg-rose-500/10 p-3 flex items-start gap-3">
            <span className="text-2xl shrink-0 leading-none">⚠️</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-rose-200 uppercase tracking-wider">
                Quest {state.currentQuest + 1} — Luật đặc biệt
              </p>
              <p className="mt-1 text-xs text-slate-200 leading-relaxed">
                Cần <strong className="text-rose-300">≥ 2 lá Phe Quỷ</strong> để Quest này thất bại.
                1 lá Phe Quỷ đơn lẻ vẫn coi như Phe Người thắng Quest.
              </p>
            </div>
          </div>
        )}

      {state.phase === 'lineup-preview' && (
        <LineupPreviewSection
          state={state}
          myPlayer={myPlayer}
          gamePlayers={gamePlayers}
          onAckRole={props.onAckRole}
        />
      )}

      {state.phase === 'role-reveal' && (
        <RoleRevealWaitingSection
          state={state}
          myPlayer={myPlayer}
          gamePlayers={gamePlayers}
          onShowMyRole={onShowMyRole}
        />
      )}

      {state.phase === 'night-evils' && (
        <NightEvilsSection
          state={state}
          myPlayer={myPlayer}
          myRole={myRole}
          myTeam={myTeam}
          gamePlayers={gamePlayers}
          onAckRole={props.onAckRole}
        />
      )}

      {state.phase === 'night-merlin' && (
        <NightMerlinSection
          state={state}
          myPlayer={myPlayer}
          myRole={myRole}
          gamePlayers={gamePlayers}
          onAckRole={props.onAckRole}
        />
      )}

      {state.phase === 'night-percival' && (
        <NightPercivalSection
          state={state}
          myPlayer={myPlayer}
          myRole={myRole}
          gamePlayers={gamePlayers}
          onAckRole={props.onAckRole}
        />
      )}

      {state.phase === 'team-build' && (
        <TeamBuildSection
          isLeader={isLeader}
          state={state}
          gamePlayers={gamePlayers}
          teamSize={teamSize}
          myPlayerId={myPlayer.id}
          onProposedTeamChange={props.onProposedTeamChange}
          onSubmitTeam={props.onSubmitTeam}
        />
      )}

      {state.phase === 'team-vote' && (
        <TeamVoteSection
          state={state}
          myPlayer={myPlayer}
          gamePlayers={gamePlayers}
          onCastVote={props.onCastVote}
        />
      )}

      {state.phase === 'team-vote-result' && (
        <TeamVoteResultSection state={state} gamePlayers={gamePlayers} />
      )}

      {state.phase === 'quest-play' && (
        <QuestPlaySection
          state={state}
          myPlayer={myPlayer}
          myTeam={myTeam}
          onTeam={onTeam}
          gamePlayers={gamePlayers}
          onPlayQuestCard={props.onPlayQuestCard}
        />
      )}

      {state.phase === 'quest-result' && (
        <QuestResultSection state={state} playerCount={playerCount} />
      )}

      {state.phase === 'discussion' && (
        <DiscussionSection
          state={state}
          myPlayer={myPlayer}
          gamePlayers={gamePlayers}
          onAckDiscussion={props.onAckDiscussion}
        />
      )}

      {state.phase === 'lady-of-lake' && (
        <LadySection
          state={state}
          myPlayer={myPlayer}
          myTeam={myTeam}
          gamePlayers={gamePlayers}
          onLadyInspect={props.onLadyInspect}
          onLadyShow={props.onLadyShow}
          onLadyFinish={props.onLadyFinish}
        />
      )}

      {state.phase === 'assassinate' && (
        <AssassinSection
          state={state}
          myPlayer={myPlayer}
          myRole={myRole}
          gamePlayers={gamePlayers}
          onAssassinate={props.onAssassinate}
        />
      )}

      {state.phase === 'end' && (
        <EndSection
          state={state}
          myRole={myRole}
          gamePlayers={gamePlayers}
          onPlayAgain={props.onPlayAgain}
          onLeaveRoom={props.onLeaveRoom}
          isHost={props.isHost}
        />
      )}
    </div>
  );

  return (
    <div
      className={`min-h-dvh ${isGood
        ? 'bg-gradient-to-b from-blue-950/40 via-slate-950 to-slate-950'
        : 'bg-gradient-to-b from-red-950/40 via-slate-950 to-slate-950'
        }`}
    >
      <div className="sticky top-0 z-20">{topBar}</div>

      {/* Desktop / tablet: 3-column fixed-viewport layout — left info, center table (no scroll), right action panel. */}
      <div className="hidden lg:grid lg:grid-cols-[300px_minmax(0,1fr)_340px] xl:grid-cols-[340px_minmax(0,1fr)_380px] gap-4 px-4 max-w-[1500px] mx-auto h-[calc(100dvh-44px)]">
        <aside className="overflow-y-auto py-4 pr-1">
          <PlayerRoster
            gamePlayers={gamePlayers}
            state={state}
            myPlayerId={myPlayer.id}
            showVoteStatus={state.phase === 'team-vote'}
            title="Danh sách người chơi"
            compact
            viewerRole={myRole}
          />
        </aside>

        <main className="flex items-start justify-center py-4 min-w-0 overflow-hidden">
          {showRoundTable ? (
            <div className="w-full flex items-start justify-center">
              <RoundTable
                players={gamePlayers}
                state={state}
                myPlayerId={myPlayer.id}
                viewerRole={myRole}
                playerCount={playerCount}
              />
            </div>
          ) : (
            <div className="w-full max-w-xl overflow-y-auto max-h-full">{phaseSection}</div>
          )}
        </main>

        <aside className="overflow-y-auto py-4 pl-1 space-y-3">
          {showRoundTable && phaseSection}
        </aside>
      </div>

      {/* Mobile / tablet: stacked — table on top, sections below. */}
      <div className="lg:hidden flex flex-col max-w-lg sm:max-w-xl md:max-w-2xl mx-auto w-full">
        <div className="px-4 py-4 pb-safe space-y-4">
          {showRoundTable && (
            <RoundTable
              players={gamePlayers}
              state={state}
              myPlayerId={myPlayer.id}
              viewerRole={myRole}
              playerCount={playerCount}
            />
          )}
          {phaseSection}
        </div>
      </div>
    </div>
  );
}

function DiscussionSection({
  state,
  myPlayer,
  gamePlayers,
  onAckDiscussion,
}: {
  state: AvalonGameState;
  myPlayer: Player;
  gamePlayers: Player[];
  onAckDiscussion: () => void;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const TIMEOUT_MS = PHASE_TIMEOUTS_MS['discussion'];
  const elapsed = now - (state.phaseStartedAt ?? now);
  const remaining = Math.max(0, TIMEOUT_MS - elapsed);
  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  const timeStr = `${mins}:${String(secs).padStart(2, '0')}`;

  const ackedIds = Object.keys(state.roleAcks ?? {});
  const myAcked = ackedIds.includes(myPlayer.id);
  const ackCount = ackedIds.length;
  const total = gamePlayers.length;
  const allAcked = ackCount >= total && total > 0;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/10 p-5 text-center">
        <p className="text-[11px] uppercase font-black text-emerald-300 mb-2 tracking-widest">
          💬 Thảo luận trước Quest {state.currentQuest + 1}
        </p>
        <div className={`text-5xl font-black mb-2 ${remaining < 60_000 ? 'text-amber-300' : 'text-white'}`}>
          {timeStr}
        </div>
        <p className="text-xs text-slate-300">
          Thời gian thảo luận tối đa <strong className="text-white">10 phút</strong>.
          Khi tất cả nhấn <strong className="text-emerald-300">Sẵn sàng</strong>, sẽ vào ngay{' '}
          <strong>Quest {state.currentQuest + 1}</strong>.
        </p>
      </div>

      {!myAcked ? (
        <button
          onClick={onAckDiscussion}
          className="w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 py-4 text-base font-black text-white hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] shadow-lg shadow-emerald-500/30"
        >
          ✓ Tôi sẵn sàng — Bỏ qua thảo luận
        </button>
      ) : (
        <button
          disabled
          className="w-full rounded-2xl border border-emerald-400/40 bg-emerald-500/10 py-4 text-base font-black text-emerald-200"
        >
          ✓ Bạn đã sẵn sàng — Chờ những người còn lại
        </button>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">
            Sẵn sàng kết thúc thảo luận
          </span>
          <span className="text-sm font-black text-white">
            {ackCount} / {total}
          </span>
        </div>
        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
            style={{ width: `${total > 0 ? (ackCount / total) * 100 : 0}%` }}
          />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-1.5">
          {gamePlayers.map((p) => {
            const acked = ackedIds.includes(p.id);
            return (
              <div
                key={p.id}
                className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 ${acked
                  ? 'border-emerald-500/40 bg-emerald-500/10'
                  : 'border-white/10 bg-white/5'
                  }`}
              >
                <span className="text-base shrink-0">{acked ? '✅' : '💬'}</span>
                <span className="text-xs font-bold text-white truncate flex-1">
                  {p.name}
                  {p.id === myPlayer.id && <span className="text-blue-300"> (bạn)</span>}
                </span>
              </div>
            );
          })}
        </div>
        {allAcked && (
          <p className="mt-2 text-[11px] text-emerald-300 text-center font-bold">
            Tất cả sẵn sàng — đang chuyển sang Quest...
          </p>
        )}
      </div>
    </div>
  );
}

function PhaseChip({ phase }: { phase: AvalonGameState['phase'] }) {
  const map: Record<string, { emoji: string; text: string; cls: string }> = {
    'lineup-preview': { emoji: '🎭', text: 'Vai trong ván', cls: 'bg-fuchsia-500/20 text-fuchsia-300' },
    'role-reveal': { emoji: '🌙', text: 'Lộ vai', cls: 'bg-purple-500/20 text-purple-300' },
    'night-evils': { emoji: '🗡️', text: 'Đêm — Phe Quỷ', cls: 'bg-red-500/20 text-red-300' },
    'night-merlin': { emoji: '🧙', text: 'Đêm — Merlin', cls: 'bg-blue-500/20 text-blue-300' },
    'night-percival': { emoji: '🛡️', text: 'Đêm — Percival', cls: 'bg-indigo-500/20 text-indigo-300' },
    'team-build': { emoji: '⚔️', text: 'Chọn đội', cls: 'bg-amber-500/20 text-amber-300' },
    'team-vote': { emoji: '🗳️', text: 'Bỏ phiếu', cls: 'bg-cyan-500/20 text-cyan-300' },
    'team-vote-result': { emoji: '📊', text: 'Kết quả phiếu', cls: 'bg-cyan-500/20 text-cyan-300' },
    'quest-play': { emoji: '🎴', text: 'Chơi Quest', cls: 'bg-purple-500/20 text-purple-300' },
    'quest-result': { emoji: '📜', text: 'Kết quả Quest', cls: 'bg-purple-500/20 text-purple-300' },
    'discussion': { emoji: '💬', text: 'Thảo luận', cls: 'bg-emerald-500/20 text-emerald-300' },
    'lady-of-lake': { emoji: '🌊', text: 'Lady', cls: 'bg-cyan-500/20 text-cyan-300' },
    assassinate: { emoji: '🗡️', text: 'Ám sát', cls: 'bg-red-500/20 text-red-300' },
    end: { emoji: '🏁', text: 'Kết thúc', cls: 'bg-slate-500/20 text-slate-300' },
  };
  const cfg = map[phase] ?? map.end;
  return (
    <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black ${cfg.cls}`}>
      {cfg.emoji} {cfg.text}
    </span>
  );
}

function TokenBadges({
  playerId,
  state,
  inline = false,
}: {
  playerId: string;
  state: AvalonGameState;
  inline?: boolean;
}) {
  const isLeader = state.currentLeaderId === playerId;
  const isLady = state.ladyHolderId === playerId;
  if (!isLeader && !isLady) return null;
  return (
    <div className={`flex gap-1 ${inline ? '' : 'mt-0.5'} flex-wrap`}>
      {isLeader && (
        <span className="rounded-full bg-amber-500/30 border border-amber-400/40 px-1.5 py-0.5 text-[9px] font-black text-amber-200">
          👑 Leader
        </span>
      )}
      {isLady && (
        <span className="rounded-full bg-cyan-500/30 border border-cyan-400/40 px-1.5 py-0.5 text-[9px] font-black text-cyan-200">
          🌊 Lady
        </span>
      )}
    </div>
  );
}

interface RosterMark {
  type:
  | 'leader'
  | 'lady-holder'
  | 'lady-target'
  | 'team-member'
  | 'me'
  | 'was-leader'
  | 'was-lady'
  | 'voted'
  | 'not-voted'
  | 'quest-history'
  | 'evil-ally'
  | 'merlin-sees'
  | 'percival-sees';
  className: string;
  label: string;
  key?: string;
}

function deriveAutoHighlight(state: AvalonGameState): {
  ids: string[];
  emphasis: 'team' | 'lady' | 'none';
} {
  const teamPhases: AvalonGameState['phase'][] = [
    'team-build',
    'team-vote',
    'team-vote-result',
    'quest-play',
    'quest-result',
  ];
  if (teamPhases.includes(state.phase)) {
    return { ids: state.proposedTeam, emphasis: 'team' };
  }
  if (state.phase === 'lady-of-lake') {
    return {
      ids: state.ladyTargetId ? [state.ladyTargetId] : [],
      emphasis: 'lady',
    };
  }
  return { ids: [], emphasis: 'none' };
}

function buildRosterMarks(
  playerId: string,
  state: AvalonGameState,
  myPlayerId: string,
  options: {
    showProposedTeam?: boolean;
    showLadyTarget?: boolean;
    showVoteStatus?: boolean;
  } = {}
): RosterMark[] {
  const marks: RosterMark[] = [];
  if (state.currentLeaderId === playerId) {
    marks.push({
      type: 'leader',
      className: 'bg-amber-500/30 border border-amber-400/50 text-amber-100',
      label: '👑 Leader',
    });
  }
  if (state.ladyHolderId === playerId) {
    marks.push({
      type: 'lady-holder',
      className: 'bg-cyan-500/30 border border-cyan-400/50 text-cyan-100',
      label: '🌊 Lady',
    });
  }
  if (options.showProposedTeam && state.proposedTeam.includes(playerId)) {
    marks.push({
      type: 'team-member',
      className: 'bg-orange-500/30 border border-orange-400/50 text-orange-100',
      label: '✓ Đề cử',
    });
  }
  if (options.showLadyTarget && state.ladyTargetId === playerId) {
    marks.push({
      type: 'lady-target',
      className: 'bg-fuchsia-500/30 border border-fuchsia-400/50 text-fuchsia-100',
      label: '🎯 Bị soi',
    });
  }
  if (options.showVoteStatus) {
    const voted = state.teamVotes && state.teamVotes[playerId];
    if (voted) {
      marks.push({
        type: 'voted',
        className: 'bg-emerald-500/30 border border-emerald-400/50 text-emerald-100',
        label: '✓ Đã bầu',
      });
    } else {
      marks.push({
        type: 'not-voted',
        className: 'bg-slate-500/20 border border-slate-400/30 text-slate-300',
        label: '⏳ Chưa bầu',
      });
    }
  }
  if (playerId === myPlayerId) {
    marks.push({
      type: 'me',
      className: 'bg-blue-500/20 border border-blue-400/40 text-blue-200',
      label: 'Bạn',
    });
  }
  return marks;
}

function buildHistoryMarks(playerId: string, state: AvalonGameState): RosterMark[] {
  const marks: RosterMark[] = [];

  // Quest participation history with outcome
  state.quests.forEach((q, idx) => {
    if (q.result !== null && q.teamIds.includes(playerId)) {
      const success = q.result === 'success';
      marks.push({
        type: 'quest-history',
        key: `quest-${idx}`,
        className: success
          ? 'bg-blue-500/15 border border-blue-400/30 text-blue-200'
          : 'bg-red-500/15 border border-red-400/30 text-red-200',
        label: `Q${idx + 1}${success ? '✓' : '✕'}`,
      });
    }
  });

  // Was Lady (in history but not current holder)
  if (state.ladyHistory.includes(playerId) && state.ladyHolderId !== playerId) {
    marks.push({
      type: 'was-lady',
      className: 'bg-cyan-500/10 border border-cyan-400/25 text-cyan-300',
      label: '🌊 đã cầm',
    });
  }

  // Was Leader (in leadersUsed but not current)
  if (
    (state.leadersUsed ?? []).includes(playerId) &&
    state.currentLeaderId !== playerId
  ) {
    marks.push({
      type: 'was-leader',
      className: 'bg-amber-500/10 border border-amber-400/25 text-amber-300',
      label: '👑 đã làm',
    });
  }

  return marks;
}

function PlayerRoster({
  gamePlayers,
  state,
  myPlayerId,
  highlightedIds,
  showLadyTarget,
  showVoteStatus = false,
  title = 'Danh sách người chơi',
  emphasis,
  showHistory = true,
  compact = false,
  viewerRole,
}: {
  gamePlayers: Player[];
  state: AvalonGameState;
  myPlayerId: string;
  highlightedIds?: string[];
  showLadyTarget?: boolean;
  showVoteStatus?: boolean;
  title?: string;
  emphasis?: 'team' | 'lady' | 'none';
  showHistory?: boolean;
  compact?: boolean;
  viewerRole?: AvalonRole;
}) {
  const auto = deriveAutoHighlight(state);
  const finalIds = highlightedIds ?? auto.ids;
  const finalEmphasis = emphasis ?? auto.emphasis;
  const autoLadyTarget = state.phase === 'lady-of-lake';
  const finalShowLadyTarget = showLadyTarget ?? autoLadyTarget;
  // Non-Oberon evils know each other after the night reveal — keep the marker
  // visible to them for the rest of the game so they don't forget who's who.
  const viewerIsVisibleEvil =
    viewerRole !== undefined &&
    ROLE_TEAM[viewerRole] === 'evil' &&
    viewerRole !== AvalonRole.Oberon;
  // Merlin sees all Quỷ except Mordred — keep that knowledge persistent.
  const viewerIsMerlin = viewerRole === AvalonRole.Merlin;
  // Percival sees Merlin & Morgana but doesn't know which is which.
  const viewerIsPercival = viewerRole === AvalonRole.Percival;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2 px-1">
        {title}
      </p>
      <div className={`grid gap-2 ${compact ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-1'}`}>
        {gamePlayers.map((p) => {
          const isHighlighted = finalIds.includes(p.id);
          const liveMarks = buildRosterMarks(p.id, state, myPlayerId, {
            showProposedTeam: finalEmphasis === 'team' && !isHighlighted,
            showLadyTarget: finalShowLadyTarget,
            showVoteStatus,
          });
          if (viewerIsVisibleEvil && p.id !== myPlayerId) {
            const targetData = p.gameData as Partial<AvalonGameData>;
            const targetIsVisibleEvil =
              targetData.team === 'evil' && targetData.role !== AvalonRole.Oberon;
            if (targetIsVisibleEvil) {
              liveMarks.unshift({
                type: 'evil-ally',
                className:
                  'bg-red-500/30 border border-red-400/50 text-red-100',
                label: '🗡️ Đồng đội Quỷ',
              });
            }
          }
          if (viewerIsMerlin && p.id !== myPlayerId) {
            const targetData = p.gameData as Partial<AvalonGameData>;
            const targetIsSeenByMerlin =
              targetData.team === 'evil' && targetData.role !== AvalonRole.Mordred;
            if (targetIsSeenByMerlin) {
              liveMarks.unshift({
                type: 'merlin-sees',
                className:
                  'bg-red-500/25 border border-red-400/40 text-red-100',
                label: '🗡️ Quỷ (bạn thấy)',
              });
            }
          }
          if (viewerIsPercival && p.id !== myPlayerId) {
            const targetData = p.gameData as Partial<AvalonGameData>;
            const targetIsSuspect =
              targetData.role === AvalonRole.Merlin ||
              targetData.role === AvalonRole.Morgana;
            if (targetIsSuspect) {
              liveMarks.unshift({
                type: 'percival-sees',
                className:
                  'bg-indigo-500/25 border border-indigo-400/40 text-indigo-100',
                label: '❓ Merlin/Morgana',
              });
            }
          }
          const historyMarks = showHistory ? buildHistoryMarks(p.id, state) : [];
          const hasRedClueMark = liveMarks.some(
            (m) => m.type === 'evil-ally' || m.type === 'merlin-sees'
          );
          const hasPercivalClueMark = liveMarks.some((m) => m.type === 'percival-sees');
          const highlightCls =
            isHighlighted && finalEmphasis === 'team'
              ? 'border-orange-400/60 bg-orange-500/15 ring-1 ring-orange-400/40 shadow shadow-orange-500/20'
              : isHighlighted && finalEmphasis === 'lady'
                ? 'border-fuchsia-400/60 bg-fuchsia-500/15 ring-1 ring-fuchsia-400/40 shadow shadow-fuchsia-500/20'
                : hasRedClueMark
                  ? 'border-red-500/40 bg-red-500/10'
                  : hasPercivalClueMark
                    ? 'border-indigo-500/40 bg-indigo-500/10'
                    : 'border-white/10 bg-white/5';
          return (
            <div
              key={p.id}
              className={`rounded-xl border p-2 transition-all ${highlightCls}`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black text-white ${isHighlighted && finalEmphasis === 'team'
                    ? 'bg-gradient-to-br from-orange-500 to-amber-500'
                    : isHighlighted && finalEmphasis === 'lady'
                      ? 'bg-gradient-to-br from-fuchsia-500 to-purple-500'
                      : 'bg-gradient-to-br from-purple-500 to-cyan-500'
                    }`}
                >
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-bold text-white truncate flex-1 min-w-0">
                  {p.name}
                </span>
              </div>
              {liveMarks.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {liveMarks.map((m) => (
                    <span
                      key={m.key ?? m.type}
                      className={`rounded-full px-1.5 py-0.5 text-[9px] font-black ${m.className}`}
                    >
                      {m.label}
                    </span>
                  ))}
                </div>
              )}
              {historyMarks.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1 opacity-90">
                  {historyMarks.map((m) => (
                    <span
                      key={m.key ?? m.type}
                      className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${m.className}`}
                    >
                      {m.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WaitingCard({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
      <div className="text-4xl mb-3 animate-pulse">⏳</div>
      <p className="text-sm text-slate-300">{text}</p>
    </div>
  );
}

function LineupPreviewSection({
  state,
  myPlayer,
  gamePlayers,
  onAckRole,
}: {
  state: AvalonGameState;
  myPlayer: Player;
  gamePlayers: Player[];
  onAckRole: () => void;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const TIMEOUT_MS = 60_000;
  const elapsed = now - (state.phaseStartedAt ?? now);
  const remaining = Math.max(0, TIMEOUT_MS - elapsed);
  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  const timeStr = `${mins}:${String(secs).padStart(2, '0')}`;

  const ackedIds = Object.keys(state.roleAcks ?? {});
  const myAcked = ackedIds.includes(myPlayer.id);
  const ackCount = ackedIds.length;
  const total = gamePlayers.length;
  const allAcked = ackCount >= total;

  const lineup = state.roleLineup ?? [];
  const goodRoles = lineup.filter((r) => ROLE_TEAM[r] === 'good');
  const evilRoles = lineup.filter((r) => ROLE_TEAM[r] === 'evil');

  const goodCounts: Record<string, number> = {};
  for (const r of goodRoles) goodCounts[r] = (goodCounts[r] ?? 0) + 1;
  const evilCounts: Record<string, number> = {};
  for (const r of evilRoles) evilCounts[r] = (evilCounts[r] ?? 0) + 1;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-900/20 to-purple-900/20 p-5 text-center">
        <p className="text-[11px] uppercase font-black text-fuchsia-300 mb-1 tracking-widest">
          🎭 Vai trò trong ván này
        </p>
        <p className="text-sm text-slate-300">
          {goodRoles.length} Phe Người · {evilRoles.length} Phe Quỷ
        </p>
        <p className="mt-1 text-[11px] text-slate-500">
          (Vai trò của bạn sẽ được hiện ở bước sau)
        </p>
      </div>

      <div className="rounded-2xl border border-blue-500/30 bg-blue-900/15 p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">🛡️</span>
          <h3 className="text-sm font-black text-blue-200">Phe Người ({goodRoles.length})</h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(goodCounts).map(([role, count]) => (
            <RoleLineChip
              key={role}
              role={role as AvalonRole}
              count={count}
              tone="good"
            />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-red-500/30 bg-red-900/15 p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">🗡️</span>
          <h3 className="text-sm font-black text-red-200">Phe Quỷ ({evilRoles.length})</h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(evilCounts).map(([role, count]) => (
            <RoleLineChip
              key={role}
              role={role as AvalonRole}
              count={count}
              tone="evil"
            />
          ))}
        </div>
      </div>

      {!myAcked && (
        <button
          onClick={onAckRole}
          className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-600 to-purple-600 py-4 text-base font-black text-white hover:from-fuchsia-500 hover:to-purple-500 active:scale-[0.98] shadow-lg shadow-fuchsia-500/30"
        >
          ✓ Đã xem — Sẵn sàng nhận vai
        </button>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] uppercase font-bold text-slate-400">
            Tiến độ
          </span>
          <span className="text-sm font-black text-white">
            {ackCount} / {total}
          </span>
        </div>
        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-500 transition-all duration-500"
            style={{ width: `${total > 0 ? (ackCount / total) * 100 : 0}%` }}
          />
        </div>
        <div className="mt-3 space-y-1.5">
          {gamePlayers.map((p) => {
            const acked = ackedIds.includes(p.id);
            return (
              <div
                key={p.id}
                className="flex items-center justify-between text-xs"
              >
                <span className={acked ? 'text-white font-bold' : 'text-slate-500'}>
                  {p.name}
                  {p.id === myPlayer.id && (
                    <span className="text-cyan-400 ml-1">(bạn)</span>
                  )}
                </span>
                <span className={acked ? 'text-emerald-400 font-black' : 'text-slate-600'}>
                  {acked ? '✓ Sẵn sàng' : '⏳ Đang xem'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div
        className={`rounded-2xl border p-4 text-center ${allAcked
          ? 'border-emerald-500/40 bg-emerald-500/10'
          : remaining < 15000
            ? 'border-amber-500/40 bg-amber-500/10'
            : 'border-white/10 bg-white/5'
          }`}
      >
        <p className="text-[11px] uppercase font-bold text-slate-400 mb-1">
          {allAcked ? 'Đang chia vai...' : 'Tự động chia vai sau'}
        </p>
        <p
          className={`text-2xl font-black ${allAcked
            ? 'text-emerald-300'
            : remaining < 15000
              ? 'text-amber-300'
              : 'text-white'
            }`}
        >
          {allAcked ? '✓' : timeStr}
        </p>
      </div>
    </div>
  );
}

function RoleLineChip({
  role,
  count,
  tone,
}: {
  role: AvalonRole;
  count: number;
  tone: 'good' | 'evil';
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 ${tone === 'good'
        ? 'border-blue-500/30 bg-blue-500/10'
        : 'border-red-500/30 bg-red-500/10'
        }`}
    >
      <span className="text-xl shrink-0">{ROLE_ICONS[role]}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-black text-white truncate">{role}</p>
        <p
          className={`text-[10px] font-bold ${tone === 'good' ? 'text-blue-300' : 'text-red-300'
            }`}
        >
          {ROLE_NAMES_VI[role]}
        </p>
      </div>
      {count > 1 && (
        <span
          className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-black ${tone === 'good'
            ? 'bg-blue-500/30 text-blue-200'
            : 'bg-red-500/30 text-red-200'
            }`}
        >
          ×{count}
        </span>
      )}
    </div>
  );
}

function RoleRevealWaitingSection({
  state,
  myPlayer,
  gamePlayers,
  onShowMyRole,
}: {
  state: AvalonGameState;
  myPlayer: Player;
  gamePlayers: Player[];
  onShowMyRole: () => void;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const TIMEOUT_MS = PHASE_TIMEOUTS_MS['role-reveal'];
  const elapsed = now - (state.phaseStartedAt ?? now);
  const remaining = Math.max(0, TIMEOUT_MS - elapsed);
  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  const timeStr = `${mins}:${String(secs).padStart(2, '0')}`;

  const ackedIds = Object.keys(state.roleAcks ?? {});
  const myAcked = ackedIds.includes(myPlayer.id);
  const ackCount = ackedIds.length;
  const total = gamePlayers.length;
  const allAcked = ackCount >= total;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-purple-500/30 bg-purple-500/5 p-5 text-center">
        <p className="text-[11px] uppercase font-black text-purple-300 mb-2">
          🌙 Đang lộ vai
        </p>
        {myAcked ? (
          <>
            <div className="text-5xl mb-2">✅</div>
            <p className="text-sm font-bold text-emerald-300">Bạn đã sẵn sàng</p>
          </>
        ) : (
          <>
            <div className="text-5xl mb-2 animate-pulse">📜</div>
            <p className="text-sm font-bold text-amber-300 mb-3">
              Bạn chưa xác nhận đã đọc role
            </p>
            <button
              onClick={onShowMyRole}
              className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-sm font-black text-white hover:from-amber-400 hover:to-orange-400"
            >
              📖 Xem lại role
            </button>
          </>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] uppercase font-bold text-slate-400">
            Tiến độ
          </span>
          <span className="text-sm font-black text-white">
            {ackCount} / {total}
          </span>
        </div>
        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500"
            style={{ width: `${total > 0 ? (ackCount / total) * 100 : 0}%` }}
          />
        </div>
        <div className="mt-3 space-y-1.5">
          {gamePlayers.map((p) => {
            const acked = ackedIds.includes(p.id);
            return (
              <div
                key={p.id}
                className="flex items-center justify-between text-xs"
              >
                <span className={acked ? 'text-white font-bold' : 'text-slate-500'}>
                  {p.name}
                  {p.id === myPlayer.id && (
                    <span className="text-cyan-400 ml-1">(bạn)</span>
                  )}
                </span>
                <span className={acked ? 'text-emerald-400 font-black' : 'text-slate-600'}>
                  {acked ? '✓ Sẵn sàng' : '⏳ Đang đọc'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div
        className={`rounded-2xl border p-4 text-center ${allAcked
          ? 'border-emerald-500/40 bg-emerald-500/10'
          : remaining < 30000
            ? 'border-amber-500/40 bg-amber-500/10'
            : 'border-white/10 bg-white/5'
          }`}
      >
        <p className="text-[11px] uppercase font-bold text-slate-400 mb-1">
          {allAcked ? 'Đang chuyển sang Quest 1' : 'Tự động vào Quest sau'}
        </p>
        <p
          className={`text-2xl font-black ${allAcked
            ? 'text-emerald-300'
            : remaining < 30000
              ? 'text-amber-300'
              : 'text-white'
            }`}
        >
          {allAcked ? '✓' : timeStr}
        </p>
      </div>
    </div>
  );
}

function getActiveNightPlayerIds(
  phase: AvalonGameState['phase'],
  players: Player[]
): string[] {
  if (phase === 'night-evils') {
    return players
      .filter((p) => (p.gameData as Partial<AvalonGameData>).team === 'evil')
      .map((p) => p.id);
  }
  if (phase === 'night-merlin') {
    return players
      .filter((p) => (p.gameData as Partial<AvalonGameData>).role === AvalonRole.Merlin)
      .map((p) => p.id);
  }
  if (phase === 'night-percival') {
    return players
      .filter((p) => (p.gameData as Partial<AvalonGameData>).role === AvalonRole.Percival)
      .map((p) => p.id);
  }
  return [];
}

function NightCountdown({
  state,
  phase,
  allActiveAcked,
  warnAt = 15000,
}: {
  state: AvalonGameState;
  phase: 'night-evils' | 'night-merlin' | 'night-percival';
  allActiveAcked: boolean;
  warnAt?: number;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const TIMEOUT_MS = PHASE_TIMEOUTS_MS[phase];
  const elapsed = now - (state.phaseStartedAt ?? now);
  const remaining = Math.max(0, TIMEOUT_MS - elapsed);
  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  const timeStr = `${mins}:${String(secs).padStart(2, '0')}`;

  return (
    <div
      className={`rounded-2xl border p-4 text-center ${allActiveAcked
        ? 'border-emerald-500/40 bg-emerald-500/10'
        : remaining < warnAt
          ? 'border-amber-500/40 bg-amber-500/10'
          : 'border-white/10 bg-white/5'
        }`}
    >
      <p className="text-[11px] uppercase font-bold text-slate-400 mb-1">
        {allActiveAcked ? 'Đang chuyển bước...' : 'Tự động qua bước sau'}
      </p>
      <p
        className={`text-2xl font-black ${allActiveAcked
          ? 'text-emerald-300'
          : remaining < warnAt
            ? 'text-amber-300'
            : 'text-white'
          }`}
      >
        {allActiveAcked ? '✓' : timeStr}
      </p>
    </div>
  );
}

function NightEvilsSection({
  state,
  myPlayer,
  myRole,
  myTeam,
  gamePlayers,
  onAckRole,
}: {
  state: AvalonGameState;
  myPlayer: Player;
  myRole: AvalonRole | undefined;
  myTeam: 'good' | 'evil' | undefined;
  gamePlayers: Player[];
  onAckRole: () => void;
}) {
  const activeIds = getActiveNightPlayerIds('night-evils', gamePlayers);
  const ackedIds = Object.keys(state.roleAcks ?? {});
  const activeAckedCount = activeIds.filter((id) => ackedIds.includes(id)).length;
  const allActiveAcked = activeIds.length > 0 && activeAckedCount >= activeIds.length;
  const myAcked = ackedIds.includes(myPlayer.id);

  const otherEvils = gamePlayers.filter((p) => {
    if (p.id === myPlayer.id) return false;
    const data = p.gameData as Partial<AvalonGameData>;
    return data.team === 'evil' && data.role !== AvalonRole.Oberon;
  });

  if (myTeam !== 'evil') {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5 text-center">
          <p className="text-[11px] uppercase font-black text-red-300 mb-2">
            🗡️ Đêm — Phe Quỷ đang nhận biết nhau
          </p>
          <div className="text-5xl mb-2 animate-pulse">😴</div>
          <p className="text-sm text-slate-300">
            Hãy nhắm mắt. Phe Quỷ đang lộ diện với nhau.
          </p>
        </div>
        <NightCountdown state={state} phase="night-evils" allActiveAcked={allActiveAcked} />
      </div>
    );
  }

  const isOberon = myRole === AvalonRole.Oberon;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-5">
        <p className="text-[11px] uppercase font-black text-red-300 mb-1">
          🗡️ Đêm — Phe Quỷ lộ diện
        </p>
        {isOberon ? (
          <>
            <h3 className="text-base font-black text-white mb-1">Bạn là Oberon — đơn độc</h3>
            <p className="text-xs text-slate-300 mb-3">
              Bạn không biết đồng đội Quỷ là ai. Đồng đội Quỷ cũng không biết bạn.
              Tự xoay xở phá Quest.
            </p>
            <div className="rounded-xl border border-red-500/20 bg-red-950/30 p-4 text-center">
              <div className="text-4xl mb-1">🦉</div>
              <p className="text-xs text-slate-400">Không có đồng đội nào hiện ra với bạn.</p>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-base font-black text-white mb-1">Đồng đội Phe Quỷ của bạn</h3>
            <p className="text-xs text-slate-300 mb-3">
              {otherEvils.length === 0
                ? 'Bạn là kẻ ác duy nhất hiện ra (Oberon nếu có sẽ ẩn).'
                : 'Chỉ thấy tên — không biết role cụ thể của nhau. Oberon (nếu có) sẽ KHÔNG hiện ra.'}
            </p>
            <div className="space-y-2">
              {otherEvils.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-rose-500 text-sm font-black text-white">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-white truncate">{p.name}</p>
                    <p className="text-[11px] font-bold text-red-300">Phe Quỷ</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {!myAcked ? (
        <button
          onClick={onAckRole}
          className="w-full rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 py-4 text-base font-black text-white hover:from-red-500 hover:to-rose-500 active:scale-[0.98] shadow-lg shadow-red-500/30"
        >
          ✓ Đã xem — Tiếp theo
        </button>
      ) : (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-center">
          <p className="text-sm font-bold text-emerald-300">✓ Bạn đã sẵn sàng</p>
        </div>
      )}

      <NightCountdown state={state} phase="night-evils" allActiveAcked={allActiveAcked} />
    </div>
  );
}

function NightMerlinSection({
  state,
  myPlayer,
  myRole,
  gamePlayers,
  onAckRole,
}: {
  state: AvalonGameState;
  myPlayer: Player;
  myRole: AvalonRole | undefined;
  gamePlayers: Player[];
  onAckRole: () => void;
}) {
  const activeIds = getActiveNightPlayerIds('night-merlin', gamePlayers);
  const ackedIds = Object.keys(state.roleAcks ?? {});
  const activeAckedCount = activeIds.filter((id) => ackedIds.includes(id)).length;
  const allActiveAcked = activeIds.length > 0 && activeAckedCount >= activeIds.length;
  const myAcked = ackedIds.includes(myPlayer.id);

  const visibleEvils = gamePlayers.filter((p) => {
    const data = p.gameData as Partial<AvalonGameData>;
    return data.team === 'evil' && data.role !== AvalonRole.Mordred;
  });

  if (myRole !== AvalonRole.Merlin) {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-5 text-center">
          <p className="text-[11px] uppercase font-black text-blue-300 mb-2">
            🧙 Đêm — Merlin đang quan sát
          </p>
          <div className="text-5xl mb-2 animate-pulse">🌙</div>
          <p className="text-sm text-slate-300">
            Hãy nhắm mắt. Merlin đang nhìn ra Phe Quỷ.
          </p>
        </div>
        <NightCountdown state={state} phase="night-merlin" allActiveAcked={allActiveAcked} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-blue-500/40 bg-blue-500/10 p-5">
        <p className="text-[11px] uppercase font-black text-blue-300 mb-1">
          🧙 Bạn là Merlin
        </p>
        <h3 className="text-base font-black text-white mb-1">Phe Quỷ lộ diện trước bạn</h3>
        <p className="text-xs text-slate-300 mb-3">
          Bạn nhìn thấy {visibleEvils.length} kẻ ác. <strong>Mordred</strong> ẩn — không hiện ở đây.
          Hãy bí mật dẫn dắt Phe Người, đừng để Sát Thủ tìm ra bạn.
        </p>
        <div className="space-y-2">
          {visibleEvils.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-rose-500 text-sm font-black text-white">
                {p.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-white truncate">{p.name}</p>
                <p className="text-[11px] font-bold text-red-300">Phe Quỷ</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {!myAcked ? (
        <button
          onClick={onAckRole}
          className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 py-4 text-base font-black text-white hover:from-blue-500 hover:to-cyan-500 active:scale-[0.98] shadow-lg shadow-blue-500/30"
        >
          ✓ Đã xem — Tiếp theo
        </button>
      ) : (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-center">
          <p className="text-sm font-bold text-emerald-300">✓ Bạn đã sẵn sàng</p>
        </div>
      )}

      <NightCountdown state={state} phase="night-merlin" allActiveAcked={allActiveAcked} />
    </div>
  );
}

function NightPercivalSection({
  state,
  myPlayer,
  myRole,
  gamePlayers,
  onAckRole,
}: {
  state: AvalonGameState;
  myPlayer: Player;
  myRole: AvalonRole | undefined;
  gamePlayers: Player[];
  onAckRole: () => void;
}) {
  const activeIds = getActiveNightPlayerIds('night-percival', gamePlayers);
  const ackedIds = Object.keys(state.roleAcks ?? {});
  const activeAckedCount = activeIds.filter((id) => ackedIds.includes(id)).length;
  const allActiveAcked = activeIds.length > 0 && activeAckedCount >= activeIds.length;
  const myAcked = ackedIds.includes(myPlayer.id);

  const suspects = gamePlayers.filter((p) => {
    const data = p.gameData as Partial<AvalonGameData>;
    return data.role === AvalonRole.Merlin || data.role === AvalonRole.Morgana;
  });

  if (myRole !== AvalonRole.Percival) {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-5 text-center">
          <p className="text-[11px] uppercase font-black text-indigo-300 mb-2">
            🛡️ Đêm — Percival đang quan sát
          </p>
          <div className="text-5xl mb-2 animate-pulse">🌙</div>
          <p className="text-sm text-slate-300">
            Hãy nhắm mắt. Percival đang nhìn ra Merlin & Morgana.
          </p>
        </div>
        <NightCountdown state={state} phase="night-percival" allActiveAcked={allActiveAcked} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-indigo-500/40 bg-indigo-500/10 p-5">
        <p className="text-[11px] uppercase font-black text-indigo-300 mb-1">
          🛡️ Bạn là Percival
        </p>
        <h3 className="text-base font-black text-white mb-1">Merlin & Morgana hiện ra</h3>
        <p className="text-xs text-slate-300 mb-3">
          1 trong 2 người dưới đây là <strong>Merlin</strong>, người còn lại là{' '}
          <strong>Morgana</strong>. Bạn KHÔNG biết ai là ai — hãy bảo vệ Merlin
          và đừng để Sát Thủ đoán trúng.
        </p>
        <div className="space-y-2">
          {suspects.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-2.5"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-sm font-black text-white">
                {p.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-white truncate">{p.name}</p>
                <p className="text-[11px] font-bold text-indigo-300">Merlin hoặc Morgana</p>
              </div>
              <span className="shrink-0 text-2xl">❓</span>
            </div>
          ))}
        </div>
      </div>

      {!myAcked ? (
        <button
          onClick={onAckRole}
          className="w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 py-4 text-base font-black text-white hover:from-indigo-500 hover:to-purple-500 active:scale-[0.98] shadow-lg shadow-indigo-500/30"
        >
          ✓ Đã xem — Vào Quest
        </button>
      ) : (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-center">
          <p className="text-sm font-bold text-emerald-300">✓ Bạn đã sẵn sàng</p>
        </div>
      )}

      <NightCountdown state={state} phase="night-percival" allActiveAcked={allActiveAcked} />
    </div>
  );
}


function TeamBuildSection({
  isLeader,
  state,
  gamePlayers,
  teamSize,
  myPlayerId,
  onProposedTeamChange,
  onSubmitTeam,
}: {
  isLeader: boolean;
  state: AvalonGameState;
  gamePlayers: Player[];
  teamSize: number;
  myPlayerId: string;
  onProposedTeamChange: (ids: string[]) => void;
  onSubmitTeam: () => void;
}) {
  const leader = gamePlayers.find((p) => p.id === state.currentLeaderId);
  const team = state.proposedTeam;

  if (!isLeader) {
    const emptySlots = Math.max(0, teamSize - team.length);
    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 sm:p-5">
          <p className="text-xs font-bold text-amber-300 mb-2">⚔️ ĐANG CHỌN ĐỘI — QUEST {state.currentQuest + 1}</p>
          <p className="text-sm text-slate-300 mb-3">
            Leader <span className="font-black text-white">{leader?.name ?? '?'}</span> đang chọn{' '}
            <span className="font-black text-amber-300">{teamSize} người tham gia</span>.
          </p>
          <p className="text-[10px] uppercase font-bold text-slate-500 mb-2">
            Đội đang được chọn ({team.length}/{teamSize})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {team.map((id) => {
              const p = gamePlayers.find((pp) => pp.id === id);
              return (
                <span
                  key={id}
                  className="rounded-full bg-amber-500/25 border border-amber-400/40 px-2.5 py-1 text-xs font-black text-amber-100"
                >
                  ✓ {p?.name ?? '?'}
                </span>
              );
            })}
            {Array.from({ length: emptySlots }).map((_, i) => (
              <span
                key={`empty-${i}`}
                className="rounded-full border border-dashed border-amber-500/30 bg-amber-500/5 px-2.5 py-1 text-xs font-bold text-amber-300/60"
              >
                ⬚ trống
              </span>
            ))}
          </div>
        </div>

        <div className="lg:hidden">
          <PlayerRoster
            gamePlayers={gamePlayers}
            state={state}
            myPlayerId={myPlayerId}
            highlightedIds={team}
            title="Tất cả người chơi (highlight = đang được đề cử)"
            emphasis="team"
            viewerRole={(gamePlayers.find((pp) => pp.id === myPlayerId)?.gameData as Partial<AvalonGameData> | undefined)?.role}
          />
        </div>
      </div>
    );
  }

  const toggle = (id: string) => {
    if (team.includes(id)) {
      onProposedTeamChange(team.filter((x) => x !== id));
    } else if (team.length < teamSize) {
      onProposedTeamChange([...team, id]);
    } else {
      onProposedTeamChange([...team.slice(1), id]);
    }
  };

  return (
    <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4">
      <p className="text-[11px] uppercase font-black text-amber-300 mb-1">⚔️ Bạn là Leader</p>
      <h3 className="text-base font-black text-white mb-1">
        Chọn {teamSize} người cho Quest {state.currentQuest + 1}
      </h3>
      <p className="text-xs text-slate-400 mb-4">
        Bạn có thể tự chọn mình. Nhấn lại để bỏ chọn.
      </p>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {gamePlayers.map((p) => {
          const picked = team.includes(p.id);
          return (
            <button
              key={p.id}
              onClick={() => toggle(p.id)}
              className={`rounded-xl border p-3 text-left transition-all active:scale-95 ${picked
                ? 'border-amber-500 bg-amber-500/15 ring-1 ring-amber-500/50 shadow shadow-amber-500/20'
                : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-black text-white ${picked
                    ? 'bg-gradient-to-br from-amber-500 to-orange-500'
                    : 'bg-gradient-to-br from-purple-500 to-cyan-500'
                    }`}
                >
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-bold text-white truncate">{p.name}</span>
              </div>
              <TokenBadges playerId={p.id} state={state} />
              {picked && (
                <p className="mt-1 text-[10px] font-black text-amber-300">✓ Đã chọn</p>
              )}
            </button>
          );
        })}
      </div>

      <button
        onClick={onSubmitTeam}
        disabled={team.length !== teamSize}
        className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 py-3.5 text-base font-black text-white hover:from-amber-400 hover:to-orange-400 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {team.length !== teamSize
          ? `Cần đủ ${teamSize} người (đang có ${team.length})`
          : '✓ Trình đội — Bỏ phiếu'}
      </button>
    </div>
  );
}

function TeamVoteSection({
  state,
  myPlayer,
  gamePlayers,
  onCastVote,
}: {
  state: AvalonGameState;
  myPlayer: Player;
  gamePlayers: Player[];
  onCastVote: (v: TeamVote) => void;
}) {
  const myVote = state.teamVotes[myPlayer.id];
  const team = state.proposedTeam.map((id) => gamePlayers.find((p) => p.id === id)).filter(Boolean) as Player[];
  const leader = gamePlayers.find((p) => p.id === state.currentLeaderId);
  const votedCount = Object.keys(state.teamVotes).length;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-4">
        <p className="text-[11px] uppercase font-black text-cyan-300 mb-1">🗳️ Bỏ phiếu đội</p>
        <p className="text-sm text-slate-300 mb-3">
          Leader <span className="font-black text-white">{leader?.name ?? '?'}</span> đề xuất đội cho Quest{' '}
          {state.currentQuest + 1}:
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          {team.map((p) => (
            <span
              key={p.id}
              className="rounded-full bg-amber-500/20 px-3 py-1.5 text-sm font-bold text-amber-200"
            >
              {p.name}
            </span>
          ))}
        </div>
        <p className="text-[11px] text-slate-500">
          Đã bầu: {votedCount}/{gamePlayers.length}
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2 px-1">
          Tiến độ bầu phiếu (không lộ ai bầu thế nào)
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {gamePlayers.map((p) => {
            const voted = !!state.teamVotes[p.id];
            return (
              <div
                key={p.id}
                className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 ${voted
                  ? 'border-emerald-500/40 bg-emerald-500/10'
                  : 'border-amber-500/30 bg-amber-500/5'
                  }`}
              >
                <span className="text-base shrink-0">{voted ? '✅' : '⏳'}</span>
                <span className="text-xs font-bold text-white truncate flex-1">
                  {p.name}
                  {p.id === myPlayer.id && <span className="text-blue-300"> (bạn)</span>}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {!myVote ? (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onCastVote('approve')}
            className="rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 py-5 font-black text-white text-base hover:from-blue-500 hover:to-cyan-500 active:scale-95 shadow-lg shadow-blue-500/30"
          >
            <div className="text-3xl mb-1">✓</div>
            ĐỒNG Ý
          </button>
          <button
            onClick={() => onCastVote('reject')}
            className="rounded-2xl bg-gradient-to-br from-red-600 to-rose-600 py-5 font-black text-white text-base hover:from-red-500 hover:to-rose-500 active:scale-95 shadow-lg shadow-red-500/30"
          >
            <div className="text-3xl mb-1">✕</div>
            TỪ CHỐI
          </button>
        </div>
      ) : (
        <div
          className={`rounded-2xl border p-4 text-center ${myVote === 'approve'
            ? 'border-blue-500/40 bg-blue-500/10'
            : 'border-red-500/40 bg-red-500/10'
            }`}
        >
          <p className="text-xs uppercase font-bold text-slate-400 mb-1">Phiếu của bạn</p>
          <p
            className={`text-2xl font-black ${myVote === 'approve' ? 'text-blue-300' : 'text-red-300'
              }`}
          >
            {myVote === 'approve' ? '✓ Đồng ý' : '✕ Từ chối'}
          </p>
          <p className="mt-2 text-xs text-slate-400">Chờ Leader lật phiếu...</p>
        </div>
      )}

      <div className="lg:hidden">
        <PlayerRoster
          gamePlayers={gamePlayers}
          state={state}
          myPlayerId={myPlayer.id}
          highlightedIds={state.proposedTeam}
          showVoteStatus
          title="Tất cả người chơi (✓ = đã bầu, ⏳ = chưa bầu)"
          emphasis="team"
          viewerRole={(myPlayer.gameData as Partial<AvalonGameData>).role}
        />
      </div>
    </div>
  );
}

function QuestPlaySection({
  state,
  myPlayer,
  myTeam,
  onTeam,
  gamePlayers,
  onPlayQuestCard,
}: {
  state: AvalonGameState;
  myPlayer: Player;
  myTeam: 'good' | 'evil' | undefined;
  onTeam: boolean;
  gamePlayers: Player[];
  onPlayQuestCard: (c: QuestCard) => void;
}) {
  const myCard = (myPlayer.gameData as Partial<AvalonGameData>).questCard;
  const team = state.proposedTeam.map((id) => gamePlayers.find((p) => p.id === id)).filter(Boolean) as Player[];

  if (!onTeam) {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-purple-500/30 bg-purple-500/5 p-5 text-center">
          <p className="text-[11px] uppercase font-bold text-purple-300 mb-2">⚔️ Đội đang chơi Quest</p>
          <div className="flex flex-wrap gap-2 justify-center mb-3">
            {team.map((p) => (
              <span
                key={p.id}
                className="rounded-full bg-amber-500/20 px-3 py-1.5 text-sm font-bold text-amber-200"
              >
                {p.name}
              </span>
            ))}
          </div>
          <p className="text-xs text-slate-400">
            Bạn không trong đội — chờ kết quả...
          </p>
          <div className="mt-3 text-3xl animate-pulse">⏳</div>
        </div>

        <div className="lg:hidden">
          <PlayerRoster
            gamePlayers={gamePlayers}
            state={state}
            myPlayerId={myPlayer.id}
            highlightedIds={state.proposedTeam}
            title="Tất cả người chơi (highlight = đang đi Quest)"
            emphasis="team"
            viewerRole={(myPlayer.gameData as Partial<AvalonGameData>).role}
          />
        </div>
      </div>
    );
  }

  if (myCard) {
    return (
      <div
        className={`rounded-2xl border p-5 text-center ${myCard === 'success'
          ? 'border-blue-500/40 bg-blue-500/10'
          : 'border-red-500/40 bg-red-500/10'
          }`}
      >
        <p className="text-xs uppercase font-bold text-slate-400 mb-1">Lá bài bạn đã đặt</p>
        <div className="text-5xl mb-1">{myCard === 'success' ? '🛡️' : '🗡️'}</div>
        <p
          className={`text-3xl font-black ${myCard === 'success' ? 'text-blue-300' : 'text-red-300'
            }`}
        >
          {myCard === 'success' ? 'PHE THIỆN' : 'PHE ÁC'}
        </p>
        <p className="mt-3 text-xs text-slate-400">Chờ các thành viên còn lại đặt bài...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-purple-500/30 bg-purple-500/5 p-4">
        <p className="text-[11px] uppercase font-black text-purple-300 mb-1">🎴 Bạn ở trong đội</p>
        <p className="text-sm text-slate-300">
          Chọn 1 lá bài để đặt vào Quest {state.currentQuest + 1}.
        </p>
        {myTeam === 'good' && (
          <p className="mt-2 text-xs text-blue-300/80">
            ⚠️ Phe Người BẮT BUỘC phải đặt lá Phe Người.
          </p>
        )}
        {myTeam === 'evil' && (
          <p className="mt-2 text-xs text-red-300/80">
            🗡️ Phe Quỷ có thể đặt lá Phe Người hoặc Phe Quỷ tuỳ chiến thuật.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onPlayQuestCard('success')}
          className="rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 py-6 font-black text-white text-base hover:from-blue-500 hover:to-cyan-500 active:scale-95 shadow-lg shadow-blue-500/30"
        >
          <div className="text-4xl mb-1">🛡️</div>
          PHE THIỆN
        </button>
        <button
          onClick={() => {
            if (myTeam === 'good') {
              alert('Phe Người không được đặt lá Phe Quỷ — bắt buộc phải đặt lá Phe Người.');
              return;
            }
            onPlayQuestCard('fail');
          }}
          disabled={myTeam === 'good'}
          className="rounded-2xl bg-gradient-to-br from-red-600 to-rose-600 py-6 font-black text-white text-base hover:from-red-500 hover:to-rose-500 active:scale-95 shadow-lg shadow-red-500/30 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <div className="text-4xl mb-1">🗡️</div>
          PHE ÁC
        </button>
      </div>
    </div>
  );
}

function TeamVoteResultSection({
  state,
  gamePlayers,
}: {
  state: AvalonGameState;
  gamePlayers: Player[];
}) {
  const approves = Object.values(state.teamVotes ?? {}).filter((v) => v === 'approve').length;
  const rejects = Object.values(state.teamVotes ?? {}).filter((v) => v === 'reject').length;
  const approved = state.lastTeamVoteResult === 'approved';
  const team = state.proposedTeam.map((id) => gamePlayers.find((p) => p.id === id)).filter(Boolean) as Player[];

  return (
    <div className="space-y-3 animate-scale-in">
      <div
        className={`rounded-2xl border-2 p-6 text-center ${approved
          ? 'border-blue-500/50 bg-blue-500/15 shadow-lg shadow-blue-500/20'
          : 'border-red-500/50 bg-red-500/15 shadow-lg shadow-red-500/20'
          }`}
      >
        <p className="text-[11px] uppercase font-bold text-slate-300 mb-1 tracking-widest">
          Kết quả phiếu đội
        </p>
        <div className="text-6xl mb-2">{approved ? '✅' : '❌'}</div>
        <p
          className={`text-3xl font-black ${approved ? 'text-blue-200' : 'text-red-200'
            }`}
        >
          {approved ? 'ĐỘI ĐƯỢC DUYỆT' : 'ĐỘI BỊ TỪ CHỐI'}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 max-w-xs mx-auto">
          <div className="rounded-xl bg-blue-500/15 border border-blue-500/30 px-3 py-2">
            <p className="text-[10px] uppercase font-bold text-blue-300">Đồng ý</p>
            <p className="text-2xl font-black text-blue-200">{approves}</p>
          </div>
          <div className="rounded-xl bg-red-500/15 border border-red-500/30 px-3 py-2">
            <p className="text-[10px] uppercase font-bold text-red-300">Từ chối</p>
            <p className="text-2xl font-black text-red-200">{rejects}</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-300">
          {approved
            ? 'Đội tiến hành thực hiện Quest...'
            : `Leader bị thay · Thanh từ chối ${state.voteRejectStreak}/5`}
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-[11px] uppercase font-bold text-slate-400 mb-2">Đội được đề xuất</p>
        <div className="flex flex-wrap gap-2">
          {team.map((p) => (
            <span
              key={p.id}
              className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-200"
            >
              {p.name}
            </span>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-slate-500 italic">
          🤐 Không lộ ai bầu thế nào — chỉ có tổng số phiếu.
        </p>
      </div>
    </div>
  );
}

function QuestResultSection({
  state,
  playerCount,
}: {
  state: AvalonGameState;
  playerCount: number;
}) {
  const quest = state.quests[state.currentQuest];
  if (!quest) return null;
  const evilCount = quest.failCount;
  const goodCount = quest.teamSize - evilCount;
  const success = quest.result === 'success';

  return (
    <div className="space-y-3 animate-scale-in">
      <div
        className={`rounded-2xl border-2 p-6 text-center ${success
          ? 'border-blue-500/50 bg-blue-500/15 shadow-lg shadow-blue-500/20'
          : 'border-red-500/50 bg-red-500/15 shadow-lg shadow-red-500/20'
          }`}
      >
        <p className="text-[11px] uppercase font-bold text-slate-300 mb-1 tracking-widest">
          Kết quả Quest {state.currentQuest + 1}
        </p>
        <div className="text-6xl mb-2">{success ? '🛡️' : '🗡️'}</div>
        <p
          className={`text-3xl font-black ${success ? 'text-blue-200' : 'text-red-200'
            }`}
        >
          {success ? 'QUEST THÀNH CÔNG' : 'QUEST THẤT BẠI'}
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <p className="text-[11px] uppercase font-bold text-slate-400 mb-3 text-center">
          Số lá bài (không lộ ai đặt)
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border-2 border-blue-500/30 bg-blue-500/10 p-4 text-center">
            <div className="text-3xl mb-1">🛡️</div>
            <p className="text-[10px] uppercase font-bold text-blue-300 mb-0.5">Phe Người</p>
            <p className="text-3xl font-black text-blue-200">{goodCount}</p>
          </div>
          <div className="rounded-xl border-2 border-red-500/30 bg-red-500/10 p-4 text-center">
            <div className="text-3xl mb-1">🗡️</div>
            <p className="text-[10px] uppercase font-bold text-red-300 mb-0.5">Phe Quỷ</p>
            <p className="text-3xl font-black text-red-200">{evilCount}</p>
          </div>
        </div>
        {playerCount >= 7 && state.currentQuest === 3 && (
          <p className="mt-3 text-[11px] text-slate-400 text-center">
            ⚠️ Quest này cần ≥2 lá Phe Quỷ để fail
          </p>
        )}
      </div>
    </div>
  );
}

function LadySection({
  state,
  myPlayer,
  myTeam,
  gamePlayers,
  onLadyInspect,
  onLadyShow,
  onLadyFinish,
}: {
  state: AvalonGameState;
  myPlayer: Player;
  myTeam: 'good' | 'evil' | undefined;
  gamePlayers: Player[];
  onLadyInspect: (id: string) => void;
  onLadyShow: (card: 'good' | 'evil') => void;
  onLadyFinish: () => void;
}) {
  const isHolder = state.ladyHolderId === myPlayer.id;
  const isTarget = state.ladyTargetId === myPlayer.id;
  const holder = gamePlayers.find((p) => p.id === state.ladyHolderId);
  const target = state.ladyTargetId ? gamePlayers.find((p) => p.id === state.ladyTargetId) : null;
  const shown = state.ladyShownCard;

  if (isTarget) {
    const isEvil = myTeam === 'evil';

    if (!shown && isEvil) {
      return (
        <div className="rounded-2xl border-2 border-red-500/60 bg-red-500/10 p-5">
          <p className="text-[11px] uppercase font-black text-red-300 mb-1">
            🌊 {holder?.name} đang soi bạn
          </p>
          <h3 className="text-base font-black text-white mb-1">Bạn là Phe Quỷ — chọn lá hiện ra</h3>
          <p className="text-xs text-slate-300 mb-4">
            Có thể nói xạo: hiện lá Phe Người để gạt người soi, hoặc hiện lá Phe Quỷ để nói thật.
            Sau khi chọn, kết quả sẽ tự gửi cho Lady — không cần đưa máy.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onLadyShow('good')}
              className="rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 py-5 font-black text-white text-base hover:from-blue-500 hover:to-cyan-500 active:scale-95 shadow-lg shadow-blue-500/30"
            >
              <div className="text-3xl mb-1">🛡️</div>
              HIỆN PHE NGƯỜI
              <div className="text-[10px] font-bold text-blue-100/80 mt-1">(Nói xạo)</div>
            </button>
            <button
              onClick={() => onLadyShow('evil')}
              className="rounded-2xl bg-gradient-to-br from-red-600 to-rose-600 py-5 font-black text-white text-base hover:from-red-500 hover:to-rose-500 active:scale-95 shadow-lg shadow-red-500/30"
            >
              <div className="text-3xl mb-1">🗡️</div>
              HIỆN PHE QUỶ
              <div className="text-[10px] font-bold text-red-100/80 mt-1">(Nói thật)</div>
            </button>
          </div>
        </div>
      );
    }

    if (!shown && !isEvil) {
      return (
        <div className="rounded-2xl border-2 border-blue-500/60 bg-blue-500/10 p-5">
          <p className="text-[11px] uppercase font-black text-blue-300 mb-1">
            🌊 {holder?.name} đang soi bạn
          </p>
          <h3 className="text-base font-black text-white mb-1">Bạn là Phe Người</h3>
          <p className="text-xs text-slate-300 mb-4">
            Phe Người bắt buộc hiện thật. Bấm để gửi kết quả cho Lady.
          </p>
          <button
            onClick={() => onLadyShow('good')}
            className="w-full rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 py-5 font-black text-white text-base hover:from-blue-500 hover:to-cyan-500 active:scale-95 shadow-lg shadow-blue-500/30"
          >
            <div className="text-4xl mb-1">🛡️</div>
            GỬI LÁ PHE THIỆN
          </button>
        </div>
      );
    }

    const cardSent: 'good' | 'evil' = shown ?? 'good';
    const isGoodCard = cardSent === 'good';
    return (
      <div
        className={`rounded-2xl border-2 p-6 text-center ${isGoodCard ? 'border-blue-500/40 bg-blue-500/10' : 'border-red-500/40 bg-red-500/10'
          }`}
      >
        <p className="text-[11px] uppercase font-bold text-slate-400 mb-2">
          🌊 Đã gửi cho {holder?.name}
        </p>
        <div className="text-6xl mb-2">{isGoodCard ? '🛡️' : '🗡️'}</div>
        <p
          className={`text-2xl font-black mb-1 ${isGoodCard ? 'text-blue-200' : 'text-red-200'
            }`}
        >
          {isGoodCard ? 'PHE THIỆN' : 'PHE ÁC'}
        </p>
        {isEvil && (
          <p className="text-[11px] text-amber-400/80 italic mb-2">
            {shown === 'good' ? '(Bạn đang nói xạo)' : '(Bạn đang nói thật)'}
          </p>
        )}
        <p className="text-xs text-slate-400 mt-2">
          Lady đã thấy kết quả. Chờ Lady bấm hoàn tất để chuyển token...
        </p>
        <div className="mt-3 text-2xl animate-pulse">⏳</div>
      </div>
    );
  }

  if (isHolder) {
    if (state.ladyTargetId && shown) {
      const isGoodCard = shown === 'good';
      return (
        <div className="space-y-3">
          <div
            className={`rounded-2xl border-2 p-6 text-center ${isGoodCard ? 'border-blue-500/60 bg-blue-500/15' : 'border-red-500/60 bg-red-500/15'
              }`}
          >
            <p className="text-[11px] uppercase font-bold text-slate-300 mb-1 tracking-widest">
              🌊 Kết quả soi
            </p>
            <p className="text-base font-black text-white mb-3">
              {target?.name} đã hiện
            </p>
            <div className="text-7xl mb-2">{isGoodCard ? '🛡️' : '🗡️'}</div>
            <p
              className={`text-3xl font-black ${isGoodCard ? 'text-blue-200' : 'text-red-200'
                }`}
            >
              {isGoodCard ? 'PHE THIỆN' : 'PHE ÁC'}
            </p>
            <p className="mt-3 text-[11px] text-amber-400/80 italic">
              ⚠️ Lưu ý: Phe Quỷ có thể nói xạo. Bạn cũng có thể chia sẻ thật/xạo với nhóm.
            </p>
          </div>
          <button
            onClick={onLadyFinish}
            className="w-full rounded-2xl bg-gradient-to-r from-cyan-600 to-teal-600 py-4 font-black text-white text-base hover:from-cyan-500 hover:to-teal-500 active:scale-95"
          >
            ✓ Hoàn tất — Chuyển token cho {target?.name}
          </button>
        </div>
      );
    }

    if (state.ladyTargetId) {
      return (
        <div className="space-y-3">
          <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-5 text-center">
            <p className="text-[11px] uppercase font-bold text-cyan-300 mb-2">
              🌊 Đang chờ {target?.name} chọn lá...
            </p>
            <p className="text-sm text-slate-300 mb-3">
              {target?.name} đang xem màn hình của họ và quyết định hiện lá nào cho bạn.
            </p>
            <div className="text-3xl animate-pulse">⏳</div>
          </div>
          <div className="lg:hidden">
            <PlayerRoster
              gamePlayers={gamePlayers}
              state={state}
              myPlayerId={myPlayer.id}
              highlightedIds={state.ladyTargetId ? [state.ladyTargetId] : []}
              showLadyTarget
              title="Tất cả người chơi (highlight = bị soi)"
              emphasis="lady"
              viewerRole={(myPlayer.gameData as Partial<AvalonGameData>).role}
            />
          </div>
        </div>
      );
    }

    const candidates = gamePlayers.filter((p) => {
      if (p.id === myPlayer.id) return false;
      if (state.ladyHistory.includes(p.id)) return false;
      return true;
    });

    return (
      <div className="rounded-2xl border border-cyan-500/40 bg-cyan-500/5 p-4">
        <p className="text-[11px] uppercase font-black text-cyan-300 mb-1">🌊 Lady of the Lake</p>
        <h3 className="text-base font-black text-white mb-1">Chọn 1 người để soi</h3>
        <p className="text-xs text-slate-400 mb-4">
          Người đã từng cầm token không được soi lại. Sau khi soi, người được soi trở thành Lady kế tiếp.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {candidates.map((p) => (
            <button
              key={p.id}
              onClick={() => onLadyInspect(p.id)}
              className="rounded-xl border border-white/10 bg-white/5 p-3 text-left hover:bg-white/10 active:scale-95"
            >
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 text-sm font-black text-white">
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-bold text-white truncate">{p.name}</span>
              </div>
              <TokenBadges playerId={p.id} state={state} />
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5 text-center">
        <p className="text-[11px] uppercase font-bold text-cyan-300 mb-2">🌊 Lady of the Lake</p>
        <p className="text-sm text-slate-300">
          <span className="text-[11px] uppercase font-bold text-cyan-300 mb-2">Lady</span> <span className="font-black text-white">{holder?.name}</span> đang soi 1 người chơi.
        </p>
        {target && (
          <p className="mt-2 text-xs text-slate-400">→ {target.name}</p>
        )}
        <div className="mt-3 text-3xl animate-pulse">⏳</div>
      </div>
      <div className="lg:hidden">
        <PlayerRoster
          gamePlayers={gamePlayers}
          state={state}
          myPlayerId={myPlayer.id}
          highlightedIds={state.ladyTargetId ? [state.ladyTargetId] : []}
          showLadyTarget
          title="Tất cả người chơi (highlight = bị Lady soi)"
          emphasis="lady"
          viewerRole={(myPlayer.gameData as Partial<AvalonGameData>).role}
        />
      </div>
    </div>
  );
}

function AssassinSection({
  state,
  myPlayer,
  myRole,
  gamePlayers,
  onAssassinate,
}: {
  state: AvalonGameState;
  myPlayer: Player;
  myRole: AvalonRole | undefined;
  gamePlayers: Player[];
  onAssassinate: (id: string) => void;
}) {
  const isAssassin = myRole === AvalonRole.Assassin;
  const myTeam = (myPlayer.gameData as Partial<AvalonGameData>).team;
  const goodPlayers = gamePlayers.filter((p) => {
    const data = p.gameData as Partial<AvalonGameData>;
    return data.team === 'good';
  });
  const evilPlayers = gamePlayers.filter((p) => {
    const data = p.gameData as Partial<AvalonGameData>;
    return data.team === 'evil';
  });
  const successes = state.quests.filter((q) => q.result === 'success').length;
  const failures = state.quests.filter((q) => q.result === 'fail').length;

  const evilRevealCard = (
    <div className="rounded-2xl border-2 border-red-500/50 bg-red-950/30 p-4">
      <p className="text-[11px] uppercase font-black text-red-300 mb-1 tracking-widest">
        🗡️ Phe Quỷ lộ diện
      </p>
      <p className="text-xs text-slate-300 mb-3">
        Tất cả Phe Quỷ hiện danh tính đầy đủ với Phe Người.
      </p>
      <div className="space-y-2">
        {evilPlayers.map((p) => {
          const role = (p.gameData as Partial<AvalonGameData>).role!;
          return (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5"
            >
              <span className="text-2xl shrink-0">{ROLE_ICONS[role]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-white truncate">{p.name}</p>
                <p className="text-[11px] font-bold text-red-300">
                  {role} · {ROLE_NAMES_VI[role]}
                </p>
              </div>
              {role === AvalonRole.Assassin && (
                <span className="shrink-0 rounded-full bg-red-500/40 border border-red-400/50 px-2 py-0.5 text-[10px] font-black text-red-100">
                  🎯 Sát Thủ
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const headerCard = (
    <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4 text-center">
      <p className="text-[11px] uppercase font-bold text-amber-300 mb-1 tracking-widest">
        🎯 Phe Người đã thắng {successes} Quest
      </p>
      <p className="text-sm text-slate-300">
        Phe Quỷ có cơ hội cuối: <span className="font-black text-red-300">tìm Merlin</span>.
        Trúng → Phe Quỷ thắng ngược · Trật → Phe Người thắng.
      </p>
      <p className="mt-2 text-[11px] text-slate-500">
        Quest: {successes} Người · {failures} Quỷ
      </p>
    </div>
  );

  if (myTeam === 'good') {
    return (
      <div className="space-y-3">
        {headerCard}
        {evilRevealCard}
        <div className="rounded-2xl border border-blue-500/40 bg-blue-500/10 p-5 text-center">
          <div className="text-5xl mb-2">🤫</div>
          <p className="text-sm font-black text-blue-200 mb-1">
            Phe Người hãy giữ im lặng
          </p>
          <p className="text-xs text-slate-300 leading-relaxed">
            Phe Quỷ đang hội ý chọn Merlin. Đừng phản ứng để không tiết lộ Merlin là ai.
          </p>
        </div>
      </div>
    );
  }

  if (!isAssassin) {
    return (
      <div className="space-y-3">
        {headerCard}
        {evilRevealCard}
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-5 text-center">
          <div className="text-5xl mb-2">🤝</div>
          <p className="text-sm font-black text-red-200 mb-1">
            Hội ý cùng Phe Quỷ
          </p>
          <p className="text-xs text-slate-300 leading-relaxed">
            Thảo luận với đồng đội Quỷ để xác định ai là Merlin. Sát Thủ là người ra quyết định cuối cùng.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {headerCard}
      {evilRevealCard}
      <div className="rounded-2xl border-2 border-red-500/60 bg-red-500/15 p-4">
        <p className="text-[11px] uppercase font-black text-red-300 mb-1">🗡️ Bạn là Sát Thủ</p>
        <h3 className="text-base font-black text-white mb-1">Chọn ai là Merlin</h3>
        <p className="text-xs text-slate-300 mb-4">
          Hội ý với đồng đội Quỷ trước. Khi đã chốt — bấm để xác nhận.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {goodPlayers.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                if (confirm(`Xác nhận: ${p.name} là Merlin?`)) {
                  onAssassinate(p.id);
                }
              }}
              className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-left hover:bg-red-500/20 hover:border-red-500/50 active:scale-95"
            >
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-rose-500 text-sm font-black text-white">
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-bold text-white truncate">{p.name}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function EndSection({
  state,
  myRole,
  gamePlayers,
  onPlayAgain,
  onLeaveRoom,
  isHost,
}: {
  state: AvalonGameState;
  myRole: AvalonRole | undefined;
  gamePlayers: Player[];
  onPlayAgain?: () => void;
  onLeaveRoom?: () => void;
  isHost?: boolean;
}) {
  const isGood = state.winner === 'good';
  const merlinTarget = state.merlinTargetId
    ? gamePlayers.find((p) => p.id === state.merlinTargetId)
    : null;
  const merlinTargetRole = merlinTarget
    ? (merlinTarget.gameData as Partial<AvalonGameData>).role
    : null;
  const failures = state.quests.filter((q) => q.result === 'fail').length;
  const successes = state.quests.filter((q) => q.result === 'success').length;
  const fiveRejections = state.voteRejectStreak >= 5;

  return (
    <div className="space-y-4">
      <div
        className={`rounded-2xl border p-6 text-center relative overflow-hidden ${isGood
          ? 'border-blue-500/40 bg-blue-500/10'
          : 'border-red-500/40 bg-red-500/10'
          }`}
      >
        <div className="text-6xl mb-3">{isGood ? '🛡️' : '🗡️'}</div>
        <h2 className="text-3xl font-black text-white mb-1">
          {isGood ? 'Phe Người thắng!' : 'Phe Quỷ thắng!'}
        </h2>
        <p className={`text-sm ${isGood ? 'text-blue-300' : 'text-red-300'}`}>
          {fiveRejections
            ? '5 lần liên tiếp đội bị từ chối — Phe Quỷ chiến thắng.'
            : merlinTarget
              ? merlinTargetRole === AvalonRole.Merlin
                ? `Sát Thủ đã đoán trúng Merlin (${merlinTarget.name}).`
                : `Sát Thủ đoán sai — ${merlinTarget.name} không phải Merlin.`
              : `${successes} Quest thành công · ${failures} Quest thất bại`}
        </p>
        {myRole && (
          <p className="mt-3 text-xs text-slate-400">
            Vai của bạn: <span className="font-bold text-white">{ROLE_ICONS[myRole]} {myRole}</span>
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10">
          <h3 className="text-sm font-black text-white">📜 Lộ tất cả vai trò</h3>
        </div>
        <div className="divide-y divide-white/5">
          {gamePlayers.map((p) => {
            const data = p.gameData as Partial<AvalonGameData>;
            const role = data.role;
            const team = data.team;
            const isPlayerGood = team === 'good';
            return (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-2xl shrink-0">{role ? ROLE_ICONS[role] : '🎭'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-white">{p.name}</p>
                  {role && (
                    <p
                      className={`text-xs font-bold ${isPlayerGood ? 'text-blue-300' : 'text-red-300'
                        }`}
                    >
                      {role} · {ROLE_NAMES_VI[role]}
                    </p>
                  )}
                </div>
                {team && (
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase font-black ${isPlayerGood
                      ? 'bg-blue-500/20 text-blue-300'
                      : 'bg-red-500/20 text-red-300'
                      }`}
                  >
                    {TEAM_NAME_VI[team]}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {(onPlayAgain || onLeaveRoom) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {onPlayAgain && (
            <button
              onClick={onPlayAgain}
              disabled={isHost === false}
              className="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3.5 text-sm font-black text-white hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] shadow-lg shadow-emerald-500/30 disabled:from-slate-700 disabled:to-slate-700 disabled:shadow-none disabled:opacity-60 disabled:cursor-not-allowed"
              title={isHost === false ? 'Chỉ chủ phòng mới có thể bắt đầu ván mới' : undefined}
            >
              🔄 Chơi tiếp ván mới
              {isHost === false && (
                <span className="block text-[10px] font-bold opacity-80 mt-0.5">
                  (chờ chủ phòng)
                </span>
              )}
            </button>
          )}
          {onLeaveRoom && (
            <button
              onClick={onLeaveRoom}
              className="rounded-2xl border border-white/15 bg-white/5 py-3.5 text-sm font-black text-slate-200 hover:bg-white/10 active:scale-[0.98]"
            >
              🚪 Thoát phòng
            </button>
          )}
        </div>
      )}
    </div>
  );
}
