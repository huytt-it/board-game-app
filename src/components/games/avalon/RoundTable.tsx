'use client';

import { useState, type CSSProperties } from 'react';
import type { Player } from '@/types/player';
import { AvalonRole, type AvalonGameData, type AvalonGameState, type AvalonQuestRecord } from './types';
import { ROLE_TEAM, VOTE_TRACK_LIMIT, questNeedsTwoFails } from './constants';
import { seatPosition } from './table/seatPosition';
import TableTokens from './table/TableTokens';
import CardPile from './table/CardPile';
import { VOTE_RESULT, questResultTimeline } from './table/timelines';
import { useArrivals } from './hooks/useArrivals';
import { useHiddenQuest, useShownRejectStreak } from './hooks/useTableReveal';
import AvIcon, { type IconName } from './assets/AvIcon';
import Cued from './ui/Cued';
import GlassPanel from './ui/GlassPanel';
import PlayerAvatar from './ui/PlayerAvatar';

const ROMAN = ['I', 'II', 'III', 'IV', 'V'];

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

// Colour of the throbbing glow around the quest being played (amber-300).
const CURRENT_QUEST_GLOW = { '--av-pulse': 'rgb(252 211 77)' } as CSSProperties;
const LAST_CANDLE_GLOW = { '--av-pulse': 'var(--av-evil)' } as CSSProperties;

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
}: RoundTableProps) {
  const n = players.length;
  const [openQuestIdx, setOpenQuestIdx] = useState<number | null>(null);
  const startedAt = state.phaseStartedAt ?? 0;

  // While a result screen plays its sequence, the table holds back what the
  // panel has not revealed yet: the quest tile seals at the stamp, the candle
  // goes out 3.5 s into a rejected vote (table/timelines.ts).
  const { rejectStreak } = useShownRejectStreak(state);
  const hiddenQuest = useHiddenQuest(state);
  const questResult = state.phase === 'quest-result';
  const rejectedResult = state.phase === 'team-vote-result' && state.lastTeamVoteResult === 'rejected';
  const lastChance = rejectedResult && state.voteRejectStreak >= VOTE_TRACK_LIMIT - 1;

  // "Voted" dots pop when a vote comes in (not on reload).
  const votedIds = state.phase === 'team-vote' ? Object.keys(state.teamVotes ?? {}).sort() : [];
  const freshVotes = useArrivals(votedIds);

  const showPile = state.phase === 'quest-play' || questResult;

  const candles = Array.from({ length: VOTE_TRACK_LIMIT }).map((_, i) => {
    const out = i < rejectStreak;
    const isNext = i === rejectStreak;
    const isLast = i === VOTE_TRACK_LIMIT - 1;
    const snuffing = rejectedResult && i === state.voteRejectStreak - 1;
    const candleCls = out
      ? 'text-stone-400/70'
      : isLast
        ? 'text-(--av-evil) drop-shadow-[0_0_6px_var(--av-evil)]'
        : 'text-(--av-leader) drop-shadow-[0_0_5px_var(--av-leader)]';
    // One candle left: the last one throbs red until a team is approved.
    const warn = isLast && !out && rejectStreak >= VOTE_TRACK_LIMIT - 1;
    const icon = (
      <AvIcon name={out ? 'candle-out' : 'candle-lit'} className={`h-6 w-6 sm:h-7 sm:w-7 ${candleCls}`} />
    );
    return (
      <span
        key={i}
        title={isLast ? 'Lần từ chối thứ 5 — Phe Quỷ thắng ngay!' : `Đã từ chối ${i + 1} lần`}
        className={`relative flex rounded-full transition-transform ${isNext ? 'scale-125' : ''} ${warn ? 'av-pulse-ring' : ''}`}
        style={warn ? LAST_CANDLE_GLOW : undefined}
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
          <Cued startedAt={startedAt} at={VOTE_RESULT.candleAt} className="av-smoke pointer-events-none absolute -top-3 left-1/2 h-3 w-1.5 -translate-x-1/2 rounded-full bg-stone-300/60" />
        )}
      </span>
    );
  });

  return (
    // A size container: the tokens and flying cards measure in cqw (% of the table).
    <div className="@container relative mx-auto w-full max-w-[640px] sm:max-w-[680px] lg:max-w-[760px] aspect-square select-none">
      {/* The round table itself — wood/dark gradient with concentric rings */}
      <div className="absolute inset-[12%] rounded-full bg-[radial-gradient(circle_at_30%_25%,rgba(180,120,60,0.25),transparent_55%),linear-gradient(135deg,#3b2a1a_0%,#2a1c0f_50%,#15100a_100%)] border-[3px] border-amber-800/60 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8),inset_0_2px_8px_rgba(255,200,140,0.1)]">
        <div className="absolute inset-2 rounded-full border border-amber-700/30" />
        <div className="absolute inset-5 rounded-full border border-amber-600/15" />

        {/* Center: quest row + vote-track stacked vertically */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-4 sm:px-6">
          {/* Quest badges (M1..M5) — bigger, simpler when done. Click for popup. */}
          <div className="flex items-stretch justify-center gap-2 sm:gap-3 w-full max-w-[94%]">
            {state.quests.map((q, idx) => {
              const isCurrent = idx === state.currentQuest;
              // A result still being revealed in quest-result is not shown yet.
              const isDone = q.result !== null && hiddenQuest !== idx;
              const success = isDone && q.result === 'success';
              const fail = isDone && q.result === 'fail';
              const needsTwo = questNeedsTwoFails(playerCount, idx);
              const sealing = questResult && isCurrent && isDone;

              // The current quest's tile throbs through its glow only — the
              // numeral and the team size inside keep full contrast.
              const ringColor = success
                ? 'border-(--av-good)/80 bg-(--av-good)/25 shadow-black/40'
                : fail
                  ? 'border-(--av-evil)/80 bg-(--av-evil)/25 shadow-black/40'
                  : isCurrent
                    ? 'border-amber-300/90 bg-amber-500/15 shadow-amber-400/40 ring-2 ring-amber-300/60 av-pulse-ring'
                    : 'border-stone-600/70 bg-stone-900/60';
              const numberColor = success
                ? 'text-(--av-good-light)'
                : fail
                  ? 'text-(--av-evil-light)'
                  : isCurrent
                    ? 'text-amber-200'
                    : 'text-stone-400';

              const baseCls = `relative flex flex-1 min-w-0 flex-col items-center justify-center rounded-2xl border-2 px-1 py-2 sm:px-1.5 sm:py-3 text-center shadow ${ringColor}`;

              // Roman numeral instead of "QUEST n": it never wraps, even at 375px.
              const badgeBody = (
                <>
                  <div className={`av-display text-lg sm:text-2xl leading-none whitespace-nowrap ${numberColor}`}>
                    {ROMAN[idx]}
                  </div>
                  {isDone ? (
                    <>
                      <AvIcon
                        name={success ? 'quest-success' : 'quest-fail'}
                        className={`mt-1 h-6 w-6 sm:h-8 sm:w-8 ${success ? 'text-(--av-good-light)' : 'text-(--av-evil-light)'}`}
                      />
                      <div
                        className={`mt-0.5 hidden sm:block text-xs font-black whitespace-nowrap ${success ? 'text-(--av-good-light)' : 'text-(--av-evil-light)'
                          }`}
                      >
                        {success ? 'Thành công' : 'Thất bại'}
                      </div>
                      <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/10 border border-white/15 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold text-slate-200">
                        <AvIcon name="details" />
                        <span className="hidden sm:inline">Chi tiết</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div
                        className={`mt-1 inline-flex items-center gap-0.5 whitespace-nowrap text-[11px] font-bold ${isCurrent ? 'text-amber-300' : 'text-stone-400'
                          }`}
                      >
                        <span className="sm:hidden"><AvIcon name="team" /></span>
                        {q.teamSize}
                        <span className="hidden sm:inline"> người</span>
                      </div>
                      {needsTwo && (
                        <div className="mt-1 inline-flex items-center gap-0.5 whitespace-nowrap rounded-full bg-(--av-evil)/30 border border-(--av-evil)/55 px-1.5 py-px text-[9px] font-black text-(--av-evil-light)">
                          ≥2<span className="hidden sm:inline"> lá Quỷ</span>
                          <span className="sm:hidden"><AvIcon name="quest-fail" /></span>
                        </div>
                      )}
                    </>
                  )}
                  {/* The result was just stamped: the tile is sealed in its colour. */}
                  {sealing && (
                    <Cued
                      startedAt={startedAt}
                      at={questResultTimeline(q.teamSize).stampAt}
                      className={`av-seal pointer-events-none absolute -inset-1 rounded-2xl border-2 ${success ? 'border-(--av-good-light)' : 'border-(--av-evil-light)'}`}
                    />
                  )}
                </>
              );

              if (isDone) {
                return (
                  <button
                    key={idx}
                    onClick={() => setOpenQuestIdx(idx)}
                    className={`${baseCls} hover:brightness-110 active:scale-95 transition`}
                    title={`Xem chi tiết Quest ${idx + 1}`}
                    aria-label={`Quest ${idx + 1}: ${success ? 'thành công' : 'thất bại'} — xem chi tiết`}
                    data-quest-tile={success ? 'success' : 'fail'}
                  >
                    {badgeBody}
                  </button>
                );
              }
              return (
                <div
                  key={idx}
                  title={
                    needsTwo
                      ? `Quest ${idx + 1} — ${q.teamSize} người — Cần ≥ 2 lá Phe Quỷ để Quest fail`
                      : `Quest ${idx + 1} — ${q.teamSize} người`
                  }
                  className={baseCls}
                  style={isCurrent ? CURRENT_QUEST_GLOW : undefined}
                  data-quest-tile={isCurrent ? 'current' : 'pending'}
                >
                  {badgeBody}
                </div>
              );
            })}
          </div>

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
      </div>

      {/* Player avatars arranged around the table (see table/seatPosition.ts).
          Each seat is centred on the AVATAR (the name hangs below it), so the
          tokens of TableTokens land on the same points. */}
      {players.map((p, i) => {
        // Start the first player at the top (12 o'clock) and go clockwise.
        const { x, y } = seatPosition(i, n);
        const isOnTeam = state.proposedTeam.includes(p.id);
        const isLeader = state.currentLeaderId === p.id;
        const isLady = state.ladyHolderId === p.id;
        const isLadyTarget = state.ladyTargetId === p.id;
        const isMe = p.id === myPlayerId;
        const isAssassinTarget = state.assassinChoiceId === p.id;
        const data = p.gameData as Partial<AvalonGameData>;
        const hint = getViewerHint(p, myPlayerId, viewerRole);

        const voted = state.teamVotes && state.teamVotes[p.id];
        const showVoteDot = state.phase === 'team-vote';

        const isPickable = canPick && state.phase === 'team-build' && onTogglePick;
        const isAssassinPickable =
          canAssassinPick &&
          state.phase === 'assassinate' &&
          onAssassinPick &&
          data.team === 'good';

        const handleClick = () => {
          if (isAssassinPickable) {
            onAssassinPick!(p.id);
            return;
          }
          if (isPickable) onTogglePick!(p.id);
        };

        const Wrapper: 'button' | 'div' = isPickable || isAssassinPickable ? 'button' : 'div';
        const wrapperExtra = isPickable
          ? `cursor-pointer active:scale-95 ${isOnTeam ? '' : 'hover:ring-2 hover:ring-amber-300/60'}`
          : isAssassinPickable
            ? `cursor-pointer active:scale-95 hover:ring-2 hover:ring-(--av-evil)/70 ${isAssassinTarget ? 'av-stab' : ''}`
            : '';
        // The tokens are drawn by TableTokens; say them in the seat's title.
        const tokens = `${isLeader ? ' · Leader' : ''}${isLady ? ' · Lady of the Lake' : ''}`;

        return (
          <div
            key={p.id}
            className="absolute"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transform: 'translate(-50%, -50%)',
            }}
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
                    : `${p.name}${tokens}`
              }
            >
              <PlayerAvatar
                player={p}
                size="table"
                selected={isOnTeam}
                aim={isAssassinTarget ? 'assassin' : isLadyTarget ? 'lady' : null}
                isMe={isMe}
                pulse={isOnTeam || isAssassinTarget}
              >
                {isAssassinTarget && (
                  <span
                    className="pointer-events-none absolute -top-4 left-1/2 -translate-x-1/2 text-2xl text-(--av-evil) drop-shadow-[0_2px_3px_rgba(0,0,0,0.7)] animate-bounce"
                    title="Sát Thủ đang ngắm"
                  >
                    <AvIcon name="target" />
                  </span>
                )}

                {/* Hint icon (visible-evil / Percival uncertainty) */}
                {hint && (
                  <span
                    title={hint.label}
                    className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[12px] text-white border ${hint.kind === 'percival-sees'
                      ? 'bg-indigo-500 border-indigo-200'
                      : 'bg-(--av-evil) border-(--av-evil-light)'
                      }`}
                  >
                    <AvIcon name={hint.icon} />
                  </span>
                )}
                {/* Vote status dot (only during team-vote); pops when the vote lands. */}
                {showVoteDot && (
                  <span
                    key={voted ? 'voted' : 'waiting'}
                    title={voted ? 'Đã bầu' : 'Chưa bầu'}
                    data-vote-dot={voted ? 'voted' : 'waiting'}
                    className={`absolute -bottom-1 -left-1 h-3 w-3 rounded-full border ${voted
                      ? `bg-emerald-400 border-emerald-200 ${freshVotes.has(p.id) ? 'av-pop' : ''}`
                      : 'bg-slate-500 border-slate-300 animate-pulse'
                      }`}
                  />
                )}
              </PlayerAvatar>

              {/* Near-opaque label: the seats sit over the scene, which can be
                  bright (the dawn of end-good) — the name must stay readable. */}
              <div
                className={`absolute left-1/2 top-full mt-1 w-max max-w-[80px] -translate-x-1/2 truncate rounded-md px-1.5 py-0.5 text-[11px] font-bold leading-tight text-center ${isMe
                  ? 'bg-black/75 text-(--av-parchment) ring-1 ring-(--av-parchment)/50'
                  : 'bg-black/75 text-white'
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
          questIndex={openQuestIdx}
          quest={state.quests[openQuestIdx]}
          players={players}
          playerCount={playerCount}
          onClose={() => setOpenQuestIdx(null)}
        />
      )}
    </div>
  );
}

function QuestDetailPopup({
  questIndex,
  quest,
  players,
  playerCount,
  onClose,
}: {
  questIndex: number;
  quest: AvalonQuestRecord;
  players: Player[];
  playerCount: number;
  onClose: () => void;
}) {
  const success = quest.result === 'success';
  const evilCount = quest.failCount;
  const goodCount = Math.max(0, quest.teamSize - evilCount);
  const team = quest.teamIds
    .map((id) => players.find((p) => p.id === id))
    .filter(Boolean) as Player[];
  const leader = quest.leaderId ? players.find((p) => p.id === quest.leaderId) : null;
  const approve = quest.approveCount;
  const reject = quest.rejectCount;
  const needsTwo = questNeedsTwoFails(playerCount, questIndex);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-3 animate-fade-in"
      onClick={onClose}
    >
      {/* A quest's result is public: tinted by it, the same on every screen. */}
      <GlassPanel
        tone={success ? 'good' : 'evil'}
        emphasis
        className="relative w-full sm:max-w-md overflow-hidden rounded-3xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          aria-label="Đóng"
        >
          <AvIcon name="close" size={20} />
        </button>

        <div className="text-center">
          <p className="text-[11px] uppercase font-bold text-slate-300 tracking-widest">
            Quest {questIndex + 1}
          </p>
          <AvIcon
            name={success ? 'quest-success' : 'quest-fail'}
            size={52}
            className={`my-2 ${success ? 'text-(--av-good-light)' : 'text-(--av-evil-light)'}`}
          />
          <p
            className={`av-display text-3xl ${success ? 'text-(--av-good-light)' : 'text-(--av-evil-light)'}`}
          >
            {success ? 'Thành công' : 'Thất bại'}
          </p>
          {needsTwo && (
            <p className="mt-1 text-[10px] font-bold text-(--av-evil-light)">
              <AvIcon name="warning" /> Quest này cần ≥ 2 lá Phe Quỷ để fail
            </p>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl border-2 border-(--av-good)/35 bg-(--av-good)/10 p-3 text-center">
            <AvIcon name="quest-success" size={26} className="mb-0.5 text-(--av-good-light)" />
            <p className="text-[10px] uppercase font-bold text-(--av-good-light)">Lá Phe Người</p>
            <p className="text-2xl font-black text-white leading-tight">{goodCount}</p>
          </div>
          <div className="rounded-xl border-2 border-(--av-evil)/35 bg-(--av-evil)/10 p-3 text-center">
            <AvIcon name="quest-fail" size={26} className="mb-0.5 text-(--av-evil-light)" />
            <p className="text-[10px] uppercase font-bold text-(--av-evil-light)">Lá Phe Quỷ</p>
            <p className="text-2xl font-black text-white leading-tight">{evilCount}</p>
          </div>
        </div>

        {(approve !== undefined || reject !== undefined) && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-(--av-approve)/30 bg-(--av-approve)/10 p-2.5 text-center">
              <p className="text-[10px] uppercase font-bold text-(--av-approve-light)">
                <AvIcon name="vote-approve" /> Đồng ý
              </p>
              <p className="text-lg font-black text-white leading-tight">
                {approve ?? '—'}
              </p>
            </div>
            <div className="rounded-xl border border-(--av-reject)/30 bg-(--av-reject)/10 p-2.5 text-center">
              <p className="text-[10px] uppercase font-bold text-(--av-reject-light)">
                <AvIcon name="vote-reject" /> Từ chối
              </p>
              <p className="text-lg font-black text-white leading-tight">
                {reject ?? '—'}
              </p>
            </div>
          </div>
        )}

        <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3">
          <p className="flex flex-wrap items-center gap-1 text-[10px] uppercase font-bold text-slate-400 mb-2">
            <AvIcon name="team" /> Đội đi Quest
            {leader && (
              <>
                {' · '}
                <AvIcon name="leader" className="text-(--av-leader)" /> {leader.name}
              </>
            )}
          </p>
          {team.length === 0 ? (
            <p className="text-xs text-slate-500 italic">(không rõ)</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {team.map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/8 border border-white/15 px-2.5 py-1 text-xs font-bold text-white"
                >
                  <PlayerAvatar player={p} size="xs" />
                  {p.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full rounded-xl border border-(--av-gold)/60 bg-(--av-gold)/20 py-2.5 text-sm font-black text-(--av-parchment) hover:bg-(--av-gold)/30"
        >
          ✓ Đóng
        </button>
      </GlassPanel>
    </div>
  );
}
