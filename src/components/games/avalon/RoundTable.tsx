'use client';

import { useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import type { Player } from '@/types/player';
import { AvalonRole, type AvalonGameData, type AvalonGameState, type AvalonQuestRecord } from './types';
import { ROLE_NAMES_VI, ROLE_TEAM, VOTE_TRACK_LIMIT, questNeedsTwoFails } from './constants';
import { ROLE_ICON_NAME } from './presentation';
import { seatPosition } from './table/seatPosition';
import TableTokens, { isTeamPhase } from './table/TableTokens';
import CardPile from './table/CardPile';
import { END, NIGHT, VOTE_RESULT, questResultTimeline } from './table/timelines';
import { NIGHT_CALL, type NightPhase } from './panel/NightSections';
import { useArrivals } from './hooks/useArrivals';
import { useCue } from './hooks/useCue';
import { useDialog } from './hooks/useDialog';
import { useHiddenQuest, useShownRejectStreak } from './hooks/useTableReveal';
import AvIcon, { type IconName } from './assets/AvIcon';
import AimHeartbeat from './ui/AimHeartbeat';
import Cued from './ui/Cued';
import AvButton from './ui/AvButton';
import GlassPanel from './ui/GlassPanel';
import PlayerAvatar from './ui/PlayerAvatar';
import RoleEmblem from './ui/RoleEmblem';

const ROMAN = ['I', 'II', 'III', 'IV', 'V'];

// The phases where each player confirms on their own (an ack), shown as the
// "ready" mark on the seats. Never the night: who is called is secret.
const READY_PHASES: ReadonlySet<string> = new Set(['lineup-preview', 'role-reveal', 'discussion']);

interface RoundTableProps {
  players: Player[];
  state: AvalonGameState;
  myPlayerId: string;
  viewerRole?: AvalonRole;
  playerCount: number;
  // Leader đang ở team-build có thể bấm avatar trên bàn để toggle pick.
  onTogglePick?: (id: string) => void;
  canPick?: boolean;
  pickedTeamSize?: number;
  pickedTeamLimit?: number;
  // Sát Thủ đang chọn Merlin → bấm avatar Phe Người để chọn.
  onAssassinPick?: (id: string) => void;
  canAssassinPick?: boolean;
  // Người cầm Lady (chưa soi) → bấm ghế để ngắm người đó.
  onLadyPick?: (id: string) => void;
  canLadyPick?: boolean;
  /** The scene title of the moment (scenes/SceneTitle), drawn on the table
   *  surface between the upper seats and the quest tiles. */
  sceneTitle?: ReactNode;
  /** Player ids in the order they joined the room: in lineup-preview the
   *  seats slide from that order to the game's seat order. */
  joinOrder?: readonly string[];
  /** Night: the seats the viewer's night card shows them, lit while they hold
   *  it (PlayerPanel / NightSection). */
  glowIds?: readonly string[];
  /** End of the game: every seat turns over to its role, in seat order, from
   *  this moment (ms after phaseStartedAt — hooks/useEndReveal). Public
   *  information by then, so the shields carry the team colours. */
  revealAll?: number;
}

type VisibleTag =
  | { kind: 'evil-ally'; icon: IconName; label: string }
  | { kind: 'merlin-sees'; icon: IconName; label: string }
  | { kind: 'percival-sees'; icon: IconName; label: string };

function getViewerHint(
  target: Player,
  myPlayerId: string,
  viewerRole?: AvalonRole
): VisibleTag | null {
  if (target.id === myPlayerId || viewerRole === undefined) return null;
  const data = target.gameData as Partial<AvalonGameData>;

  const viewerIsVisibleEvil =
    ROLE_TEAM[viewerRole] === 'evil' && viewerRole !== AvalonRole.Oberon;
  if (viewerIsVisibleEvil) {
    if (data.team === 'evil' && data.role !== AvalonRole.Oberon) {
      return { kind: 'evil-ally', icon: 'team-evil', label: 'Đồng đội Phe Quỷ' };
    }
  }
  if (viewerRole === AvalonRole.Merlin) {
    if (data.team === 'evil' && data.role !== AvalonRole.Mordred) {
      return { kind: 'merlin-sees', icon: 'team-evil', label: 'Phe Quỷ (bạn thấy)' };
    }
  }
  if (viewerRole === AvalonRole.Percival) {
    if (data.role === AvalonRole.Merlin || data.role === AvalonRole.Morgana) {
      return { kind: 'percival-sees', icon: 'unknown', label: 'Merlin hoặc Morgana' };
    }
  }
  return null;
}

export default function RoundTable({
  players,
  state,
  myPlayerId,
  viewerRole,
  playerCount,
  onTogglePick,
  canPick,
  pickedTeamSize,
  pickedTeamLimit,
  onAssassinPick,
  canAssassinPick,
  onLadyPick,
  canLadyPick,
  sceneTitle,
  joinOrder,
  glowIds,
  revealAll,
}: RoundTableProps) {
  const n = players.length;
  const [openQuestIdx, setOpenQuestIdx] = useState<number | null>(null);
  const startedAt = state.phaseStartedAt ?? 0;
  const cue = useCue(startedAt);
  const lineup = state.phase === 'lineup-preview';
  const night = state.phase.startsWith('night-') ? (state.phase as NightPhase) : null;
  // The game is over: no quest is "being played" any more.
  const ended = state.phase === 'end';

  // While a result screen plays its sequence, the table holds back what the
  // panel has not revealed yet: the quest tile seals at the stamp, the candle
  // goes out 3.5 s into a rejected vote (table/timelines.ts).
  const { rejectStreak } = useShownRejectStreak(state);
  const hiddenQuest = useHiddenQuest(state);
  const questResult = state.phase === 'quest-result';
  const rejectedResult = state.phase === 'team-vote-result' && state.lastTeamVoteResult === 'rejected';
  const lastChance = rejectedResult && state.voteRejectStreak >= VOTE_TRACK_LIMIT - 1;

  // The small mark on each seat: in team-vote whether that player has
  // voted (never how), and in the phases where everyone confirms on their own
  // (the line-up, the role letter, the discussion) whether they are ready.
  // Public in all of them. It pops when it comes in (not on reload).
  const markKind = state.phase === 'team-vote' ? 'vote' : READY_PHASES.has(state.phase) ? 'ready' : null;
  const markedIds =
    markKind === 'vote' ? Object.keys(state.teamVotes ?? {}).sort() : markKind === 'ready' ? Object.keys(state.roleAcks ?? {}).sort() : [];
  const freshMarks = useArrivals(markedIds);
  // Who is on the team is shown only while there is a team on the table.
  const teamOnTable = isTeamPhase(state.phase);

  const showPile = state.phase === 'quest-play' || questResult;

  const candles = Array.from({ length: VOTE_TRACK_LIMIT }).map((_, i) => {
    const out = i < rejectStreak;
    const isNext = i === rejectStreak;
    const isLast = i === VOTE_TRACK_LIMIT - 1;
    const snuffing = rejectedResult && i === state.voteRejectStreak - 1;
    // The table is the background: plain flames, no glow.
    const candleCls = out ? 'text-(--av-text-3)/70' : isLast ? 'text-(--av-evil)' : 'text-(--av-gold)';
    // One candle left: the last one gets a still red ring until a team is
    // approved (one thing blinks at a time: the dock, or the Assassin's aim).
    const warn = isLast && !out && rejectStreak >= VOTE_TRACK_LIMIT - 1;
    const icon = (
      <AvIcon name={out ? 'candle-out' : 'candle-lit'} className={`h-6 w-6 sm:h-7 sm:w-7 @min-[560px]:h-9 @min-[560px]:w-9 ${candleCls}`} />
    );
    return (
      <span
        key={i}
        title={isLast ? 'Lần từ chối thứ 5 — Phe Quỷ thắng ngay!' : `Đã từ chối ${i + 1} lần`}
        className={`relative flex rounded-full transition-transform ${isNext ? 'scale-125' : ''} ${warn ? 'ring-2 ring-(--av-evil)/80' : ''}`}
        data-candle={out ? 'out' : 'lit'}
      >
        {snuffing && out ? (
          // Mounted when the candle goes out: a short flicker into smoke.
          <Cued key="snuffed" startedAt={startedAt} at={VOTE_RESULT.candleAt} className="av-snuff flex">
            {icon}
          </Cued>
        ) : (
          icon
        )}
        {snuffing && (
          <Cued startedAt={startedAt} at={VOTE_RESULT.candleAt} className="av-smoke pointer-events-none absolute -top-3 left-1/2 h-3 w-1.5 -translate-x-1/2 rounded-full bg-(--av-text-2)/60" />
        )}
      </span>
    );
  });

  // The quest tiles. Public, the same on every screen.
  const tileState = (idx: number) => {
    const q = state.quests[idx];
    // A result still being revealed in quest-result is not shown yet.
    const done = q.result !== null && hiddenQuest !== idx;
    return {
      done,
      success: done && q.result === 'success',
      fail: done && q.result === 'fail',
      current: !ended && idx === state.currentQuest,
      needsTwo: questNeedsTwoFails(playerCount, idx),
    };
  };
  const rowLabel = `Các Quest — ${state.quests
    .map((q, idx) => {
      const t = tileState(idx);
      const what = t.success ? 'thành công' : t.fail ? 'thất bại' : t.current ? 'đang chơi' : ended ? 'không được chơi' : 'chưa chơi';
      return `${ROMAN[idx]}: ${what}, ${q.teamSize} người${t.needsTwo && !t.done && !ended ? ', cần 2 lá Phe Quỷ để thất bại' : ''}`;
    })
    .join('; ')}. Xem chi tiết.`;
  const lastPlayed = Math.max(0, ...state.quests.map((_, idx) => (tileState(idx).done ? idx : 0)));

  // Quest history: the WHOLE row of tiles is one button. A tap opens the
  // quest under the finger (the nearest tile between two), and the popup can
  // switch to any other quest. Five tiles side by side cannot each be 44px
  // wide at 320px, but the row is one large target. The keyboard opens the
  // quest being played (or the last one, at the end).
  const openQuestAt = (e: MouseEvent<HTMLButtonElement>) => {
    let idx = ended ? lastPlayed : Math.min(state.currentQuest, state.quests.length - 1);
    if (e.detail > 0) {
      let best = Infinity;
      e.currentTarget.querySelectorAll<HTMLElement>('[data-quest-idx]').forEach((t) => {
        const r = t.getBoundingClientRect();
        const d = e.clientX < r.left ? r.left - e.clientX : e.clientX > r.right ? e.clientX - r.right : 0;
        if (d < best) {
          best = d;
          idx = Number(t.dataset.questIdx);
        }
      });
    }
    setOpenQuestIdx(idx);
  };

  return (
    // A size container: the tokens and flying cards measure in cqw (% of the table).
    // On a desktop the table never grows taller than the screen (top bar + padding).
    <div className={`@container relative mx-auto w-full max-w-[640px] sm:max-w-[680px] lg:max-w-[min(720px,calc(100dvh-5.75rem))] aspect-square select-none ${n >= 8 ? "av-table-dense" : ""}`}>
      {/* The round table itself: dark wood, one faint rim. It is the
          background of the game, not its centrepiece. */}
      <div className="absolute inset-[12%] rounded-full border-2 border-black/40 bg-[radial-gradient(circle_at_30%_25%,rgba(180,120,60,0.16),transparent_55%),linear-gradient(135deg,#33251a_0%,#241a10_50%,#140f0a_100%)] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8),inset_0_0_0_1px_rgba(239,227,200,0.07)]">
        {/* Center: quest row + vote-track stacked vertically, a little below
            the middle: the name labels of the upper seats hang towards the
            corners of the row (measured 0 overlap at 300–1440px, 5–10 seats). */}
        <div className="av-table-core absolute inset-x-0 bottom-0 top-[13cqw] flex flex-col items-center justify-center gap-3 px-3 sm:gap-4 sm:px-5 @min-[560px]:gap-5">
          {/* The five quests: a numeral and either the team size or the
              result. A tap opens the history (see openQuestAt). */}
          <button
            type="button"
            onClick={openQuestAt}
            className="av-hit [--av-hit-x:-2px] [--av-hit-y:-6px] flex w-full max-w-[88%] items-stretch @min-[480px]:max-w-[78%] justify-center gap-1.5 rounded-xl transition hover:brightness-110 active:scale-[0.99] sm:gap-2 @min-[560px]:gap-3"
            aria-label={rowLabel}
            title="Xem các Quest"
            data-quest-row=""
          >
            {state.quests.map((q, idx) => {
              const t = tileState(idx);
              const sealing = questResult && t.current && t.done;
              const frame = t.success
                ? 'border-(--av-good)/70 bg-(--av-good)/15 text-(--av-good-light)'
                : t.fail
                  ? 'border-(--av-evil)/70 bg-(--av-evil)/15 text-(--av-evil-light)'
                  : t.current
                    ? 'border-(--av-gold) bg-(--av-gold)/10 text-(--av-gold)'
                    : ended
                      ? 'border-(--av-line) bg-black/25 text-(--av-text-3)'
                      : 'border-(--av-line) bg-black/35 text-(--av-text-2)';
              return (
                <span
                  key={idx}
                  className={`relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl border py-1 sm:gap-1 sm:py-2.5 @min-[560px]:gap-1.5 @min-[560px]:py-3.5 ${frame}`}
                  data-quest-idx={idx}
                  data-quest-tile={t.success ? 'success' : t.fail ? 'fail' : t.current ? 'current' : ended ? 'unplayed' : 'pending'}
                >
                  {/* Roman numeral instead of "QUEST n": it never wraps. */}
                  <span className="av-display text-lg leading-none whitespace-nowrap sm:text-2xl @min-[560px]:text-3xl">{ROMAN[idx]}</span>
                  {t.done ? (
                    <AvIcon name={t.success ? 'quest-success' : 'quest-fail'} className="h-5 w-5 sm:h-6 sm:w-6 @min-[560px]:h-8 @min-[560px]:w-8" />
                  ) : (
                    <span className="inline-flex h-5 items-center gap-0.5 whitespace-nowrap text-xs font-semibold tabular-nums sm:h-6 @min-[560px]:h-8 @min-[560px]:text-base">
                      <AvIcon name="team" />
                      {q.teamSize}
                    </span>
                  )}
                  {/* The two-fail rule: a small mark, explained in the popup. */}
                  {t.needsTwo && !t.done && !ended && (
                    <span
                      className="absolute -right-1 -top-1.5 flex h-4 items-center gap-px rounded-full border border-(--av-evil)/70 bg-(--av-ink) px-1 text-[clamp(9px,2.8cqw,11px)] font-bold leading-none text-(--av-evil-light)"
                      data-two-fails=""
                    >
                      <AvIcon name="quest-fail" />2
                    </span>
                  )}
                  {/* The result was just stamped: the tile is sealed in its colour. */}
                  {sealing && (
                    <Cued
                      startedAt={startedAt}
                      at={questResultTimeline(q.teamSize).stampAt}
                      className={`av-seal pointer-events-none absolute -inset-1 rounded-xl border-2 ${t.success ? 'border-(--av-good-light)' : 'border-(--av-evil-light)'}`}
                    />
                  )}
                </span>
              );
            })}
          </button>

          {/* Reject track: 5 candles, one goes out each time a team is rejected.
              The 5th burns in the evil colour — if it goes out, evil wins. With
              one candle left after a rejection, the row shakes once. */}
          <div
            role="img"
            aria-label={`Đội bị từ chối liên tiếp ${rejectStreak}/${VOTE_TRACK_LIMIT} lần`}
            data-reject-track={rejectStreak}
          >
            {lastChance ? (
              <Cued startedAt={startedAt} at={VOTE_RESULT.candleAt} className="av-shake flex items-end gap-1 sm:gap-1.5">
                {candles}
              </Cued>
            ) : (
              <div className="flex items-end gap-1 sm:gap-1.5">{candles}</div>
            )}
          </div>
        </div>

        {/* Night: the same "eyes closed" veil and public call on every screen. */}
        {night && <NightVeil key={night} phase={night} startedAt={startedAt} />}
      </div>

      {/* The scene's name, on the free band of the table (scenes/SceneTitle). */}
      {sceneTitle}

      {/* Player avatars arranged around the table (see table/seatPosition.ts).
          Each seat is centred on the AVATAR (the name hangs below it), so the
          tokens of TableTokens land on the same points. */}
      {players.map((p, i) => {
        // Start the first player at the top (12 o'clock) and go clockwise.
        const { x, y } = seatPosition(i, n);
        // lineup-preview: the seat slides in from where this player sat in
        // join order (offset in % of the table = cqw, avalon.css).
        const joinedAt = lineup && joinOrder ? joinOrder.indexOf(p.id) : -1;
        const from = joinedAt >= 0 && joinedAt !== i ? seatPosition(joinedAt, n) : null;
        const glowing = !!night && !!glowIds?.includes(p.id);
        const isOnTeam = teamOnTable && state.proposedTeam.includes(p.id);
        const isLeader = state.currentLeaderId === p.id;
        const isLady = state.ladyHolderId === p.id;
        const isLadyTarget = state.ladyTargetId === p.id;
        const isMe = p.id === myPlayerId;
        // (At the end the stab is marked on the turned seat instead.)
        const isAssassinTarget = !ended && state.assassinChoiceId === p.id;
        const data = p.gameData as Partial<AvalonGameData>;
        // End: the seat turns over to its role (everything is public now, so
        // the viewer's private hints are not needed any more).
        const role = revealAll !== undefined ? data.role : undefined;
        // At the assassination the Evil team stands revealed to everyone: a
        // public badge with the role replaces the viewer's private hint.
        const unmasked = state.phase === 'assassinate' && data.team === 'evil' && data.role ? data.role : null;
        const hint = role || unmasked ? null : getViewerHint(p, myPlayerId, viewerRole);
        const stabbed = !!role && state.merlinTargetId === p.id;

        const marked = markedIds.includes(p.id);

        const isPickable = canPick && state.phase === 'team-build' && onTogglePick;
        const isAssassinPickable =
          canAssassinPick &&
          state.phase === 'assassinate' &&
          onAssassinPick &&
          data.team === 'good';
        // The Lady may look at anyone but herself and the former holders.
        const isLadyPickable =
          canLadyPick &&
          state.phase === 'lady-of-lake' &&
          onLadyPick &&
          p.id !== state.ladyHolderId &&
          !state.ladyHistory.includes(p.id);

        const handleClick = () => {
          if (isAssassinPickable) {
            onAssassinPick!(p.id);
            return;
          }
          if (isLadyPickable) {
            onLadyPick!(p.id);
            return;
          }
          if (isPickable) onTogglePick!(p.id);
        };

        const Wrapper: 'button' | 'div' = isPickable || isAssassinPickable || isLadyPickable ? 'button' : 'div';
        const wrapperExtra = isPickable
          ? `cursor-pointer active:scale-95 ${isOnTeam ? '' : 'hover:ring-2 hover:ring-(--av-gold)/60'}`
          : isAssassinPickable
            ? `cursor-pointer active:scale-95 hover:ring-2 hover:ring-(--av-evil)/70 ${isAssassinTarget ? 'av-stab' : ''}`
            : isLadyPickable
              ? `cursor-pointer active:scale-95 ${isLadyTarget ? '' : 'hover:ring-2 hover:ring-(--av-gold)/60'}`
              : '';
        // The tokens are drawn by TableTokens; say them in the seat's title.
        const tokens = `${isLeader ? ' · Leader' : ''}${isLady ? ' · Lady of the Lake' : ''}${role ? ` · ${ROLE_NAMES_VI[role]}` : ''}`;

        const avatar = (
          <PlayerAvatar
            player={p}
            size="table"
            selected={isOnTeam}
            aim={isAssassinTarget ? 'assassin' : isLadyTarget ? 'lady' : null}
            isMe={isMe}
            glow={glowing}
          >
            {isAssassinTarget && (
              <>
                {/* The target's heartbeat: it quickens as the Assassin's time runs out. */}
                <AimHeartbeat state={state} />
                <span
                  className="pointer-events-none absolute -top-4 left-1/2 -translate-x-1/2 text-2xl text-(--av-evil) drop-shadow-[0_2px_3px_rgba(0,0,0,0.7)] animate-bounce"
                  title="Sát Thủ đang ngắm"
                >
                  <AvIcon name="target" />
                </span>
              </>
            )}

            {/* The vote / ready mark, bottom-LEFT: says only THAT they voted
                (never how) / are ready — filled when in, hollow while
                waiting. It pops when it comes in. Every seat shows it: it
                never competes with the corner badge on the right. */}
            {markKind && (
              <span
                key={marked ? 'in' : 'waiting'}
                title={markKind === 'vote' ? (marked ? 'Đã bầu' : 'Chưa bầu') : marked ? 'Sẵn sàng' : 'Chưa sẵn sàng'}
                {...(markKind === 'vote'
                  ? { 'data-vote-dot': marked ? 'voted' : 'waiting' }
                  : { 'data-ready-dot': marked ? 'ready' : 'waiting' })}
                className={`absolute -bottom-0.5 -left-0.5 h-3.5 w-3.5 rounded-full border-2 ${
                  marked ? `border-(--av-ink) bg-(--av-parchment) ${freshMarks.has(p.id) ? 'av-pop' : ''}` : 'border-(--av-text-3) bg-(--av-ink)'
                }`}
              />
            )}

            {/* At most ONE corner badge per seat, bottom-right: the viewer's
                night hint (visible evil / Percival's "Merlin or Morgana?"), or
                — at the assassination — the unmasked Evil role, public. */}
            {unmasked ? (
              <span
                title={`${ROLE_NAMES_VI[unmasked]} · Phe Quỷ`}
                className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-(--av-evil-light) bg-(--av-evil) text-xs text-(--av-ink)"
                data-seat-badge="unmasked"
              >
                <AvIcon name={ROLE_ICON_NAME[unmasked]} />
              </span>
            ) : (
              hint && (
                <span
                  title={hint.label}
                  className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border text-xs ${hint.kind === 'percival-sees'
                    ? 'border-(--av-parchment)/70 bg-(--av-ink) text-(--av-parchment)'
                    : 'border-(--av-evil-light) bg-(--av-evil) text-white'
                    }`}
                  data-seat-badge="hint"
                >
                  <AvIcon name={hint.icon} />
                </span>
              )
            )}
          </PlayerAvatar>
        );
        // End: the seat turns over like a card — the avatar on the back, the
        // role's shield (team colours) on the face. One seat every 150 ms in
        // seat order from the reveal moment; keyed by it, so skipping the
        // overlay restarts the turn (useEndReveal).
        const seatBody =
          role && revealAll !== undefined ? (
            <Cued
              key={revealAll}
              startedAt={startedAt}
              at={revealAll + END.flipAt + END.flipGapMs * i}
              className="av-seat-flip relative"
              data-seat-role={role}
            >
              <div className="av-seat-back">{avatar}</div>
              <div className="av-seat-face absolute inset-0 flex items-center justify-center">
                <RoleEmblem role={role} size="md" />
                {stabbed && (
                  <span
                    className="absolute -bottom-1 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-(--av-evil-light) bg-(--av-evil) text-xs text-(--av-ink) shadow shadow-black/50"
                    title="Bị Sát Thủ đâm"
                  >
                    <AvIcon name="assassinate" />
                  </span>
                )}
              </div>
            </Cued>
          ) : (
            avatar
          );

        return (
          <div
            key={p.id}
            className={`absolute ${from ? 'av-seat-shuffle' : ''} ${night ? `transition-opacity duration-300 ${glowing ? 'opacity-100' : 'opacity-60'}` : ''}`}
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transform: 'translate(-50%, -50%)',
              ...(from
                ? ({ '--dx': from.x - x, '--dy': from.y - y, animationDelay: cue(0) } as CSSProperties)
                : {}),
            }}
            data-seat={p.id}
          >
            <Wrapper
              type={Wrapper === 'button' ? 'button' : undefined}
              onClick={Wrapper === 'button' ? handleClick : undefined}
              className={`relative block rounded-full ${wrapperExtra} ${
                Wrapper === 'button' ? 'bg-transparent border-0 p-0' : ''
              }`}
              title={
                isPickable
                  ? isOnTeam
                    ? `Bỏ ${p.name} khỏi đội`
                    : `Thêm ${p.name} vào đội${
                        pickedTeamLimit !== undefined && pickedTeamSize !== undefined && pickedTeamSize >= pickedTeamLimit
                          ? ' (sẽ đổi chỗ người đầu danh sách)'
                          : ''
                      }`
                  : isAssassinPickable
                    ? `Chọn ${p.name} là Merlin`
                    : isLadyPickable
                      ? `Soi ${p.name}`
                      : `${p.name}${tokens}`
              }
            >
              {seatBody}

              {/* Near-opaque label: the seats sit over the scene, which can be
                  bright (the dawn of end-good) — the name must stay readable. */}
              <div
                className={`av-seat-name absolute left-1/2 top-full mt-1 w-max max-w-[80px] -translate-x-1/2 truncate rounded-full px-2 py-0.5 text-[clamp(10px,3.5cqw,12px)] font-semibold leading-tight text-center ${isMe
                  ? 'bg-black/75 text-(--av-parchment) ring-1 ring-(--av-parchment)/50'
                  : 'bg-black/75 text-(--av-text)'
                  }`}
                title={p.name}
              >
                {p.name}
                {isMe && <span className="ml-0.5">•</span>}
              </div>
            </Wrapper>
          </div>
        );
      })}

      {/* Crown, Lady and nomination tokens; they travel between seats. */}
      <TableTokens players={players} state={state} />

      {/* The quest's face-down pile (quest-play → quest-result). */}
      {showPile && <CardPile players={players} state={state} />}

      {openQuestIdx !== null && state.quests[openQuestIdx] && (
        <QuestDetailPopup
          initial={openQuestIdx}
          quests={state.quests}
          players={players}
          playerCount={playerCount}
          current={ended ? -1 : state.currentQuest}
          hiddenQuest={hiddenQuest}
          onClose={() => setOpenQuestIdx(null)}
        />
      )}
    </div>
  );
}

// The night's veil over the table surface: a closed eye and the public call
// of this turn ("Phe Quỷ mở mắt…"). It settles in on the phase clock (Cued),
// so every screen shows the same frame and a reload does not replay it.
function NightVeil({ phase, startedAt }: { phase: NightPhase; startedAt: number }) {
  const call = NIGHT_CALL[phase];
  return (
    <Cued
      startedAt={startedAt}
      at={0}
      className="av-appear absolute -inset-px flex flex-col items-center justify-center rounded-full bg-[radial-gradient(circle_at_50%_40%,#141a33_0%,#0a0d1c_70%)] px-[14%] text-center shadow-[inset_0_0_30px_rgba(0,0,0,0.8)]"
      data-night-veil={phase}
    >
      <Cued startedAt={startedAt} at={NIGHT.callAt} className="av-rise flex flex-col items-center">
        <AvIcon name="eye" className="h-[clamp(1.5rem,8cqw,2.5rem)] w-[clamp(1.5rem,8cqw,2.5rem)] text-(--av-parchment)/70" />
        <p className="av-display mt-1 whitespace-nowrap text-[clamp(1.05rem,6cqw,1.6rem)] leading-tight text-(--av-parchment)">
          <AvIcon name={call.icon} className="mr-1 text-[0.8em]" />
          {call.who} mở mắt…
        </p>
        <p className="mt-1 text-[clamp(10px,3.4cqw,13px)] leading-snug text-(--av-text-2)">{call.line}</p>
        <p className="mt-1.5 text-[clamp(9px,2.8cqw,11px)] font-bold uppercase tracking-wider text-(--av-text-3)">Mọi người khác nhắm mắt</p>
      </Cued>
    </Cued>
  );
}

// The quest history (a tap on the row of tiles): one quest at a time, and a
// switcher of the five numerals (tinted like the tiles) to move between them.
// Played: the result, the cards, the vote on the approved team, the Leader
// and the team. Not played yet: the team size and the two-fail rule. All of it
// public; a result still being revealed (quest-result) stays hidden.
function QuestDetailPopup({
  initial,
  quests,
  players,
  playerCount,
  current,
  hiddenQuest,
  onClose,
}: {
  initial: number;
  quests: readonly AvalonQuestRecord[];
  players: Player[];
  playerCount: number;
  /** The quest being played, -1 once the game is over. */
  current: number;
  hiddenQuest: number | null;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(initial);
  const dialog = useDialog<HTMLDivElement>(onClose);

  const quest = quests[idx];
  const playedOf = (i: number) => quests[i].result !== null && hiddenQuest !== i;
  const played = playedOf(idx);
  const success = played && quest.result === 'success';
  const evilCount = quest.failCount;
  const goodCount = Math.max(0, quest.teamSize - evilCount);
  const team = quest.teamIds.map((id) => players.find((p) => p.id === id)).filter(Boolean) as Player[];
  const leader = quest.leaderId ? players.find((p) => p.id === quest.leaderId) : null;
  const needsTwo = questNeedsTwoFails(playerCount, idx);
  const status = played
    ? success
      ? 'Thành công'
      : 'Thất bại'
    : idx === current
      ? 'Đang chơi'
      : current < 0
        ? 'Không được chơi'
        : 'Chưa chơi';
  const tint = played ? (success ? 'text-(--av-good-light)' : 'text-(--av-evil-light)') : idx === current ? 'text-(--av-gold)' : 'text-(--av-text-2)';

  return (
    <div
      ref={dialog}
      role="dialog"
      aria-modal="true"
      aria-label={`Quest ${ROMAN[idx]}: ${status}`}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 outline-none animate-fade-in sm:items-center"
      onClick={onClose}
      data-quest-popup={idx}
    >
      {/* A quest's result is public: tinted by it, the same on every screen. */}
      <GlassPanel
        tone={played ? (success ? 'good' : 'evil') : 'neutral'}
        solid
        className="w-full p-5 sm:max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center gap-1.5" role="group" aria-label="Chọn Quest">
          {quests.map((q, i) => {
            const done = playedOf(i);
            const tile = done
              ? q.result === 'success'
                ? 'border-(--av-good)/70 bg-(--av-good)/15 text-(--av-good-light)'
                : 'border-(--av-evil)/70 bg-(--av-evil)/15 text-(--av-evil-light)'
              : i === current
                ? 'border-(--av-gold)/70 text-(--av-gold)'
                : 'border-(--av-line) text-(--av-text-2)';
            return (
              <button
                key={i}
                type="button"
                onClick={() => setIdx(i)}
                aria-pressed={i === idx}
                aria-label={`Quest ${i + 1}`}
                className={`av-display flex h-11 w-11 items-center justify-center rounded-xl border text-lg transition hover:brightness-125 ${tile} ${
                  i === idx ? 'ring-2 ring-(--av-parchment) ring-offset-2 ring-offset-(--av-ink)' : ''
                }`}
              >
                {ROMAN[i]}
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex flex-col items-center text-center">
          <AvIcon name={played ? (success ? 'quest-success' : 'quest-fail') : 'quest'} size={44} className={tint} />
          <p className={`av-display mt-1 text-3xl leading-tight ${tint}`}>{status}</p>
          <p className="mt-1 text-sm text-(--av-text-2)">
            Quest {ROMAN[idx]} · {quest.teamSize} người
          </p>
        </div>

        <dl className="mt-4 divide-y divide-(--av-line) border-t border-(--av-line) text-sm">
          {played && (
            <div className="flex items-center justify-between gap-3 py-2.5">
              <dt className="text-(--av-text-3)">Lá bài</dt>
              <dd className="flex items-center gap-3 font-semibold text-(--av-text)">
                <span className="inline-flex items-center gap-1">
                  <AvIcon name="quest-success" className="text-(--av-good-light)" title="Lá Phe Người" />
                  {goodCount}
                </span>
                <span className="inline-flex items-center gap-1">
                  <AvIcon name="quest-fail" className="text-(--av-evil-light)" title="Lá Phe Quỷ" />
                  {evilCount}
                </span>
              </dd>
            </div>
          )}
          {played && (quest.approveCount !== undefined || quest.rejectCount !== undefined) && (
            <div className="flex items-center justify-between gap-3 py-2.5">
              <dt className="text-(--av-text-3)">Phiếu</dt>
              <dd className="flex items-center gap-3 font-semibold text-(--av-text)">
                <span className="inline-flex items-center gap-1">
                  <AvIcon name="vote-approve" title="Đồng ý" /> {quest.approveCount ?? '—'}
                </span>
                <span className="inline-flex items-center gap-1">
                  <AvIcon name="vote-reject" title="Từ chối" /> {quest.rejectCount ?? '—'}
                </span>
              </dd>
            </div>
          )}
          {played && (
            <div className="flex items-start justify-between gap-3 py-2.5">
              <dt className="shrink-0 text-(--av-text-3)">Đội</dt>
              <dd className="flex min-w-0 flex-wrap justify-end gap-x-3 gap-y-1.5 font-semibold text-(--av-text)">
                {team.length === 0
                  ? '—'
                  : team.map((p) => (
                      <span key={p.id} className="inline-flex items-center gap-1.5">
                        <PlayerAvatar player={p} size="xs" />
                        {p.name}
                        {leader?.id === p.id && <AvIcon name="leader" className="text-(--av-gold)" title="Leader" />}
                      </span>
                    ))}
                {leader && !team.some((p) => p.id === leader.id) && (
                  <span className="inline-flex items-center gap-1 text-(--av-text-2)">
                    <AvIcon name="leader" className="text-(--av-gold)" title="Leader" /> {leader.name}
                  </span>
                )}
              </dd>
            </div>
          )}
          {needsTwo && (
            <p className="flex items-start gap-2 py-2.5 text-left text-(--av-evil-light)">
              <AvIcon name="warning" className="mt-0.5 shrink-0" />
              Quest này cần ít nhất 2 lá Phe Quỷ mới thất bại.
            </p>
          )}
        </dl>

        <AvButton variant="secondary" block onClick={onClose} className="mt-4">
          Đóng
        </AvButton>
      </GlassPanel>
    </div>
  );
}
