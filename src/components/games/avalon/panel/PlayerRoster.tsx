import type { Player } from '@/types/player';
import { AvalonRole, type AvalonGameData, type AvalonGameState } from '../types';
import { ROLE_TEAM } from '../constants';

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

  // Quest participation history with outcome — chỉ hiển thị "Quest N" + màu
  // (xanh = success, đỏ = fail). Bỏ ✓/✕ vì màu đã đủ ngữ nghĩa.
  state.quests.forEach((q, idx) => {
    if (q.result !== null && q.teamIds.includes(playerId)) {
      const success = q.result === 'success';
      marks.push({
        type: 'quest-history',
        key: `quest-${idx}`,
        className: success
          ? 'bg-blue-500/30 border border-blue-400/50 text-blue-100'
          : 'bg-red-500/30 border border-red-400/50 text-red-100',
        label: `Quest ${idx + 1}`,
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

export function PlayerRoster({
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
                label: '👹 Đồng đội Quỷ',
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
                label: '👹 Quỷ (bạn thấy)',
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
          // Phân nhóm tag theo vị trí trên card:
          //   aboveTags = leader/lady → trên avatar
          //   belowTags = quest-history → dưới avatar (chỉ "Quest N" + màu)
          //   rightTags = mọi tag còn lại → cột phải cạnh tên
          const aboveTags = liveMarks.filter(
            (m) => m.type === 'leader' || m.type === 'lady-holder'
          );
          const rightLiveTags = liveMarks.filter(
            (m) => m.type !== 'leader' && m.type !== 'lady-holder'
          );
          const belowTags = historyMarks.filter((m) => m.type === 'quest-history');
          const rightHistoryTags = historyMarks.filter((m) => m.type !== 'quest-history');
          const rightTags = [...rightLiveTags, ...rightHistoryTags];
          return (
            <div
              key={p.id}
              className={`rounded-xl border p-2 transition-all ${highlightCls}`}
            >
              {/* Row 1 (chỉ render khi có Leader/Lady): tag in flow phía trên
                  avatar+name. Không dùng absolute (tránh bị icon đè / tràn ra
                  ngoài card). */}
              {aboveTags.length > 0 && (
                <div className="mb-1.5 flex flex-wrap gap-1">
                  {aboveTags.map((m) => (
                    <span
                      key={m.key ?? m.type}
                      className={`rounded-full px-1.5 py-0.5 text-[9px] font-black ${m.className}`}
                    >
                      {m.label}
                    </span>
                  ))}
                </div>
              )}

              {/* Row 2: avatar (sát mép trái) + tên (vertical-center với avatar
                  qua items-center) + right tags ngay dưới tên — không tách rời
                  khỏi avatar nên tag "Bạn" / "Đồng đội Quỷ"... nằm cạnh tên. */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black text-white ${isHighlighted && finalEmphasis === 'team'
                    ? 'bg-gradient-to-br from-orange-500 to-amber-500'
                    : isHighlighted && finalEmphasis === 'lady'
                      ? 'bg-gradient-to-br from-fuchsia-500 to-purple-500'
                      : 'bg-gradient-to-br from-purple-500 to-cyan-500'
                    }`}
                >
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1 flex flex-col gap-1">
                  <span className="text-xs font-bold text-white truncate">{p.name}</span>
                  {rightTags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {rightTags.map((m) => (
                        <span
                          key={m.key ?? m.type}
                          className={`rounded-full px-1.5 py-0.5 text-[9px] font-black ${m.className}`}
                        >
                          {m.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Row 3 (chỉ khi có quest history): chip "Quest 1"/"Quest 2"...
                  ở cuối card, dưới hàng avatar+name. */}
              {belowTags.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-0.5">
                  {belowTags.map((m) => (
                    <span
                      key={m.key ?? m.type}
                      className={`rounded-full px-1.5 py-0.5 text-[9px] font-black ${m.className}`}
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
