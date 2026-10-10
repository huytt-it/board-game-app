import type { Player } from '@/types/player';
import { AvalonRole, type AvalonGameData, type AvalonGameState } from '../types';
import { ROLE_TEAM } from '../constants';
import AvIcon, { type IconName } from '../assets/AvIcon';
import GlassPanel from '../ui/GlassPanel';
import PlayerAvatar from '../ui/PlayerAvatar';
import { useHiddenQuest } from '../hooks/useTableReveal';

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
  | 'quest-history';
  className: string;
  label: string;
  icon?: IconName;
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
      className: 'bg-(--av-leader)/25 border border-(--av-leader)/50 text-amber-100',
      icon: 'leader',
      label: 'Leader',
    });
  }
  if (state.ladyHolderId === playerId) {
    marks.push({
      type: 'lady-holder',
      className: 'bg-(--av-lady)/25 border border-(--av-lady)/50 text-teal-100',
      icon: 'lady',
      label: 'Lady',
    });
  }
  if (options.showProposedTeam && state.proposedTeam.includes(playerId)) {
    marks.push({
      type: 'team-member',
      className: 'bg-(--av-team)/25 border border-(--av-team)/50 text-orange-100',
      icon: 'team',
      label: 'Đề cử',
    });
  }
  if (options.showLadyTarget && state.ladyTargetId === playerId) {
    marks.push({
      type: 'lady-target',
      className: 'bg-(--av-lady)/20 border border-(--av-lady)/45 text-teal-100',
      icon: 'eye',
      label: 'Bị soi',
    });
  }
  if (options.showVoteStatus) {
    const voted = state.teamVotes && state.teamVotes[playerId];
    if (voted) {
      marks.push({
        type: 'voted',
        className: 'bg-emerald-500/30 border border-emerald-400/50 text-emerald-100',
        icon: 'check',
        label: 'Đã bầu',
      });
    } else {
      marks.push({
        type: 'not-voted',
        className: 'bg-slate-500/20 border border-slate-400/30 text-slate-300',
        icon: 'waiting',
        label: 'Chưa bầu',
      });
    }
  }
  if (playerId === myPlayerId) {
    marks.push({
      type: 'me',
      className: 'bg-(--av-parchment)/15 border border-(--av-parchment)/40 text-(--av-parchment)',
      label: 'Bạn',
    });
  }
  return marks;
}

function buildHistoryMarks(playerId: string, state: AvalonGameState, hiddenQuest: number | null): RosterMark[] {
  const marks: RosterMark[] = [];

  // Quest participation history with outcome — chỉ hiển thị "Quest N" + màu
  // (xanh = success, đỏ = fail). Bỏ ✓/✕ vì màu đã đủ ngữ nghĩa.
  state.quests.forEach((q, idx) => {
    // A quest still being revealed (quest-result, before its stamp) waits.
    if (q.result !== null && idx !== hiddenQuest && q.teamIds.includes(playerId)) {
      const success = q.result === 'success';
      marks.push({
        type: 'quest-history',
        key: `quest-${idx}`,
        className: success
          ? 'bg-(--av-good)/30 border border-(--av-good)/55 text-white'
          : 'bg-(--av-evil)/30 border border-(--av-evil)/55 text-white',
        label: `Quest ${idx + 1}`,
      });
    }
  });

  // Was Lady (in history but not current holder)
  if (state.ladyHistory.includes(playerId) && state.ladyHolderId !== playerId) {
    marks.push({
      type: 'was-lady',
      className: 'bg-(--av-lady)/10 border border-(--av-lady)/25 text-teal-300',
      icon: 'lady',
      label: 'đã cầm',
    });
  }

  // Was Leader (in leadersUsed but not current)
  if (
    (state.leadersUsed ?? []).includes(playerId) &&
    state.currentLeaderId !== playerId
  ) {
    marks.push({
      type: 'was-leader',
      className: 'bg-(--av-leader)/10 border border-(--av-leader)/25 text-amber-300',
      icon: 'leader',
      label: 'đã làm',
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
  const hiddenQuest = useHiddenQuest(state);
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
    <GlassPanel className="p-3">
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
          // What the viewer privately knows about this player is ONE icon
          // of fixed size beside the name — never a chip that wraps and makes
          // the row taller: the roster must have the same height whatever the
          // viewer's role (ux-plan GĐ4).
          let hint: { icon: IconName; label: string; cls: string } | null = null;
          if (p.id !== myPlayerId) {
            const targetData = p.gameData as Partial<AvalonGameData>;
            if (viewerIsVisibleEvil && targetData.team === 'evil' && targetData.role !== AvalonRole.Oberon) {
              hint = { icon: 'team-evil', label: 'Đồng đội Phe Quỷ', cls: 'bg-(--av-evil) border-(--av-evil-light)' };
            } else if (viewerIsMerlin && targetData.team === 'evil' && targetData.role !== AvalonRole.Mordred) {
              hint = { icon: 'team-evil', label: 'Phe Quỷ (bạn thấy)', cls: 'bg-(--av-evil) border-(--av-evil-light)' };
            } else if (
              viewerIsPercival &&
              (targetData.role === AvalonRole.Merlin || targetData.role === AvalonRole.Morgana)
            ) {
              hint = { icon: 'unknown', label: 'Merlin hoặc Morgana', cls: 'bg-indigo-500 border-indigo-200' };
            }
          }
          const historyMarks = showHistory ? buildHistoryMarks(p.id, state, hiddenQuest) : [];
          // A row is only ever tinted by PUBLIC state (team pick, Lady's aim).
          // What the viewer privately knows (Merlin's / the evils' view,
          // Percival's) shows only in the small chips — a row tinted red or
          // indigo would tell a neighbour who the viewer is (ux-plan 2.9).
          const highlightCls =
            isHighlighted && finalEmphasis === 'team'
              ? 'border-(--av-team)/60 bg-(--av-team)/15 ring-1 ring-(--av-team)/40 shadow shadow-black/20'
              : isHighlighted && finalEmphasis === 'lady'
                ? 'border-(--av-lady)/60 bg-(--av-lady)/15 ring-1 ring-(--av-lady)/40 shadow shadow-black/20'
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
                      className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-black ${m.className}`}
                    >
                      {m.icon && <AvIcon name={m.icon} />}
                      {m.label}
                    </span>
                  ))}
                </div>
              )}

              {/* Row 2: avatar (sát mép trái) + tên (vertical-center với avatar
                  qua items-center) + right tags ngay dưới tên — không tách rời
                  khỏi avatar nên tag "Bạn" / "Đồng đội Quỷ"... nằm cạnh tên. */}
              <div className="flex items-center gap-2.5 min-w-0">
                <PlayerAvatar
                  player={p}
                  size="sm"
                  selected={isHighlighted && finalEmphasis === 'team'}
                  aim={isHighlighted && finalEmphasis === 'lady' ? 'lady' : null}
                  isMe={p.id === myPlayerId}
                />
                <div className="min-w-0 flex-1 flex flex-col gap-1">
                  <span className="flex min-w-0 items-center gap-1">
                    <span className="text-xs font-bold text-white truncate">{p.name}</span>
                    {hint && (
                      <span
                        title={hint.label}
                        aria-label={hint.label}
                        role="img"
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] text-white ${hint.cls}`}
                      >
                        <AvIcon name={hint.icon} />
                      </span>
                    )}
                  </span>
                  {rightTags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {rightTags.map((m) => (
                        <span
                          key={m.key ?? m.type}
                          className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-black ${m.className}`}
                        >
                          {m.icon && <AvIcon name={m.icon} />}
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
                      className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-black ${m.className}`}
                    >
                      {m.icon && <AvIcon name={m.icon} />}
                      {m.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </GlassPanel>
  );
}
