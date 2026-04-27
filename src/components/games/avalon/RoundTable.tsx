'use client';

import type { Player } from '@/types/player';
import { AvalonRole, type AvalonGameData, type AvalonGameState } from './types';
import { ROLE_TEAM, VOTE_TRACK_LIMIT, questNeedsTwoFails } from './constants';

interface RoundTableProps {
  players: Player[];
  state: AvalonGameState;
  myPlayerId: string;
  viewerRole?: AvalonRole;
  playerCount: number;
}

const NAME_BY_ID_FALLBACK = (id: string, players: Player[]) =>
  players.find((p) => p.id === id)?.name ?? '?';

type VisibleTag =
  | { kind: 'evil-ally'; label: string }
  | { kind: 'merlin-sees'; label: string }
  | { kind: 'percival-sees'; label: string };

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
      return { kind: 'evil-ally', label: '🗡️' };
    }
  }
  if (viewerRole === AvalonRole.Merlin) {
    if (data.team === 'evil' && data.role !== AvalonRole.Mordred) {
      return { kind: 'merlin-sees', label: '🗡️' };
    }
  }
  if (viewerRole === AvalonRole.Percival) {
    if (data.role === AvalonRole.Merlin || data.role === AvalonRole.Morgana) {
      return { kind: 'percival-sees', label: '❓' };
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
}: RoundTableProps) {
  const n = players.length;

  return (
    <div className="relative mx-auto w-full max-w-[640px] sm:max-w-[680px] lg:max-w-[760px] aspect-square select-none">
      {/* The round table itself — wood/dark gradient with concentric rings */}
      <div className="absolute inset-[12%] rounded-full bg-[radial-gradient(circle_at_30%_25%,rgba(180,120,60,0.25),transparent_55%),linear-gradient(135deg,#3b2a1a_0%,#2a1c0f_50%,#15100a_100%)] border-[3px] border-amber-800/60 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8),inset_0_2px_8px_rgba(255,200,140,0.1)]">
        <div className="absolute inset-2 rounded-full border border-amber-700/30" />
        <div className="absolute inset-5 rounded-full border border-amber-600/15" />

        {/* Center: quest row + vote-track stacked vertically */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-4 sm:px-6">
          {/* Quest badges (M1..M5) — full info like the old QuestTrack */}
          <div className="flex items-stretch justify-center gap-1.5 sm:gap-2 w-full max-w-[88%]">
            {state.quests.map((q, idx) => {
              const isCurrent = idx === state.currentQuest;
              const isDone = q.result !== null;
              const success = q.result === 'success';
              const fail = q.result === 'fail';
              const needsTwo = questNeedsTwoFails(playerCount, idx);

              const ringColor = success
                ? 'border-blue-400/80 bg-blue-500/20 shadow-blue-500/40'
                : fail
                  ? 'border-red-400/80 bg-red-500/20 shadow-red-500/40'
                  : isCurrent
                    ? 'border-amber-300/90 bg-amber-500/15 shadow-amber-400/40 ring-2 ring-amber-300/60 animate-pulse'
                    : 'border-stone-600/70 bg-stone-900/60';
              const numberColor = success
                ? 'text-blue-200'
                : fail
                  ? 'text-red-200'
                  : isCurrent
                    ? 'text-amber-200'
                    : 'text-stone-400';

              return (
                <div
                  key={idx}
                  title={
                    needsTwo && !isDone
                      ? `Quest ${idx + 1} — Cần ≥ 2 lá Phe Quỷ để Quest fail`
                      : `Quest ${idx + 1}`
                  }
                  className={`flex flex-1 min-w-0 flex-col items-center justify-center rounded-2xl border-2 px-1 py-1.5 text-center shadow ${ringColor}`}
                >
                  <div className={`text-[8px] sm:text-[9px] font-black uppercase tracking-widest ${numberColor}`}>
                    Quest {idx + 1}
                  </div>
                  {isDone && (
                    <div className="font-black text-white text-lg sm:text-xl">
                      {success ? '✓' : '✕'}
                    </div>
                  )}
                  {!isDone && (
                    <div
                      className={`text-[8px] sm:text-[9px] font-bold uppercase tracking-wider ${isCurrent ? 'text-amber-300/90' : 'text-stone-500'
                        }`}
                    >
                      {q.teamSize} người
                    </div>
                  )}
                  {!isDone && needsTwo && (
                    <div className="mt-0.5 rounded-full bg-rose-500/30 border border-rose-400/50 px-1.5 py-px text-[8px] font-black text-rose-200">
                      ≥ 2 lá Quỷ
                    </div>
                  )}
                  {isDone && (
                    <>
                      <div
                        className={`text-[9px] font-bold ${success ? 'text-blue-300' : 'text-red-300'
                          }`}
                      >
                        {success ? 'Thành công' : 'Thất bại'}
                      </div>
                      <div
                        className="mt-0.5 text-[10px] font-black tabular-nums"
                        title={`${q.teamSize - q.failCount} lá Người · ${q.failCount} lá Quỷ`}
                      >
                        <span className="text-blue-300">{q.teamSize - q.failCount}</span>
                        <span className="text-stone-500"> / </span>
                        <span className="text-red-300">{q.failCount}</span>
                      </div>
                    </>
                  )}
                  {isDone && q.teamIds.length > 0 && (
                    <div className="mt-1 flex flex-wrap justify-center gap-0.5 max-w-full">
                      {q.teamIds.map((id) => {
                        const name = NAME_BY_ID_FALLBACK(id, players);
                        const initial = name.charAt(0).toUpperCase();
                        return (
                          <span
                            key={id}
                            title={name}
                            className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[8px] font-black border ${success
                              ? 'bg-blue-500/25 border-blue-400/50 text-blue-100'
                              : 'bg-red-500/25 border-red-400/50 text-red-100'
                              }`}
                          >
                            {initial}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Crown + 5 reject-streak dots */}
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl drop-shadow-[0_2px_3px_rgba(0,0,0,0.6)]">👑</span>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: VOTE_TRACK_LIMIT }).map((_, i) => {
                const filled = i < state.voteRejectStreak;
                const isCurrent = i === state.voteRejectStreak;
                const isLast = i === VOTE_TRACK_LIMIT - 1;
                const dotCls = isLast
                  ? filled
                    ? 'bg-red-500 border-red-200 text-white shadow shadow-red-500/60'
                    : 'bg-red-950/60 border-red-500/70 text-red-300'
                  : filled
                    ? 'bg-amber-500 border-amber-200 text-white shadow shadow-amber-500/40'
                    : 'bg-stone-900/70 border-stone-600/70 text-stone-400';
                return (
                  <div
                    key={i}
                    title={
                      isLast
                        ? 'Lần từ chối thứ 5 — Phe Quỷ thắng ngay!'
                        : `Đã từ chối ${i + 1} lần`
                    }
                    className={`flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full border text-[11px] font-black transition-all ${dotCls} ${isCurrent ? 'ring-2 ring-white/70 scale-110' : ''
                      }`}
                  >
                    {i + 1}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Player avatars arranged around the table.
          Equivalent to the rotate(angle) translateY(-r) rotate(-angle) trick,
          but computed with sin/cos so the radius can be a % of the container
          (translateY % refers to the element itself, not the parent). */}
      {players.map((p, i) => {
        // Start the first player at the top (12 o'clock) and go clockwise.
        const angleDeg = (360 / n) * i - 90;
        const rad = (angleDeg * Math.PI) / 180;
        const radiusPct = 43; // % of container — sits just outside the table (which is inset-[12%])
        const x = 50 + radiusPct * Math.cos(rad);
        const y = 50 + radiusPct * Math.sin(rad);
        const isOnTeam = state.proposedTeam.includes(p.id);
        const isLeader = state.currentLeaderId === p.id;
        const isLady = state.ladyHolderId === p.id;
        const isLadyTarget = state.ladyTargetId === p.id;
        const isMe = p.id === myPlayerId;
        const data = p.gameData as Partial<AvalonGameData>;
        const hint = getViewerHint(p, myPlayerId, viewerRole);

        // Border / glow:
        //   - viewer's own circle: tint by viewer's true team
        //   - others: red (visible evil), indigo (Percival's Merlin/Morgana), default neutral
        let borderCls = 'border-white/30 bg-white/10';
        let glow = '';
        if (isMe) {
          borderCls =
            data.team === 'evil'
              ? 'border-red-400 bg-red-500/15'
              : 'border-blue-400 bg-blue-500/15';
        } else if (hint?.kind === 'evil-ally' || hint?.kind === 'merlin-sees') {
          borderCls = 'border-red-400 bg-red-500/15';
        } else if (hint?.kind === 'percival-sees') {
          borderCls = 'border-indigo-400 bg-indigo-500/15';
        }
        if (isOnTeam) {
          glow = 'ring-4 ring-orange-400/70 shadow-lg shadow-orange-500/50';
        } else if (isLadyTarget) {
          glow = 'ring-4 ring-fuchsia-400/70 shadow-lg shadow-fuchsia-500/50';
        }

        const voted = state.teamVotes && state.teamVotes[p.id];
        const showVoteDot = state.phase === 'team-vote';

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
            <div className="flex flex-col items-center gap-1">
              <div
                className={`relative flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full border-[3px] text-sm font-black text-white transition-all ${borderCls} ${glow} ${isOnTeam ? 'animate-pulse' : ''
                  }`}
              >
                <span className="text-base">{p.name.charAt(0).toUpperCase()}</span>

                {/* Leader crown badge */}
                {isLeader && (
                  <span
                    title="Leader"
                    className="absolute -top-2 -left-2 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 border border-amber-200 text-[10px] shadow shadow-amber-500/40"
                  >
                    👑
                  </span>
                )}
                {/* Lady token */}
                {isLady && (
                  <span
                    title="Lady of the Lake"
                    className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500 border border-cyan-200 text-[10px] shadow shadow-cyan-500/40"
                  >
                    🌊
                  </span>
                )}
                {/* Hint icon (visible-evil / Percival uncertainty) */}
                {hint && (
                  <span
                    title={hint.kind}
                    className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] border ${hint.kind === 'percival-sees'
                      ? 'bg-indigo-500 border-indigo-200'
                      : 'bg-red-600 border-red-200'
                      }`}
                  >
                    {hint.label}
                  </span>
                )}
                {/* Vote status dot (only during team-vote) */}
                {showVoteDot && (
                  <span
                    title={voted ? 'Đã bầu' : 'Chưa bầu'}
                    className={`absolute -bottom-1 -left-1 h-3 w-3 rounded-full border ${voted
                      ? 'bg-emerald-400 border-emerald-200'
                      : 'bg-slate-500 border-slate-300 animate-pulse'
                      }`}
                  />
                )}
              </div>

              <div
                className={`max-w-[80px] truncate rounded-md px-1.5 py-0.5 text-[11px] font-bold leading-tight text-center ${isMe
                  ? 'bg-blue-500/30 text-blue-100 ring-1 ring-blue-400/40'
                  : 'bg-black/50 text-white'
                  }`}
                title={p.name}
              >
                {p.name}
                {isMe && <span className="ml-0.5 text-blue-200">•</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
