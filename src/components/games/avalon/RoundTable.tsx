'use client';

import { useState } from 'react';
import type { Player } from '@/types/player';
import { AvalonRole, type AvalonGameData, type AvalonGameState, type AvalonQuestRecord } from './types';
import { ROLE_TEAM, VOTE_TRACK_LIMIT, questNeedsTwoFails } from './constants';

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
      return { kind: 'evil-ally', label: '👹' };
    }
  }
  if (viewerRole === AvalonRole.Merlin) {
    if (data.team === 'evil' && data.role !== AvalonRole.Mordred) {
      return { kind: 'merlin-sees', label: '👹' };
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
  onTogglePick,
  canPick,
  pickedTeamSize,
  pickedTeamLimit,
  onAssassinPick,
  canAssassinPick,
}: RoundTableProps) {
  const n = players.length;
  const [openQuestIdx, setOpenQuestIdx] = useState<number | null>(null);

  return (
    <div className="relative mx-auto w-full max-w-[640px] sm:max-w-[680px] lg:max-w-[760px] aspect-square select-none">
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
              const isDone = q.result !== null;
              const success = q.result === 'success';
              const fail = q.result === 'fail';
              const needsTwo = questNeedsTwoFails(playerCount, idx);

              const ringColor = success
                ? 'border-blue-400/80 bg-blue-500/25 shadow-blue-500/40'
                : fail
                  ? 'border-red-400/80 bg-red-500/25 shadow-red-500/40'
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

              const baseCls = `flex flex-1 min-w-0 flex-col items-center justify-center rounded-2xl border-2 px-1.5 py-2.5 sm:py-3 text-center shadow ${ringColor}`;

              const badgeBody = (
                <>
                  <div className={`text-[10px] sm:text-xs font-black uppercase tracking-widest ${numberColor}`}>
                    Quest {idx + 1}
                  </div>
                  {isDone ? (
                    <>
                      <div className="font-black text-white text-2xl sm:text-3xl leading-none mt-0.5">
                        {success ? '✓' : '✕'}
                      </div>
                      <div
                        className={`mt-0.5 text-[10px] sm:text-xs font-black ${success ? 'text-blue-300' : 'text-red-300'
                          }`}
                      >
                        {success ? 'Thành công' : 'Thất bại'}
                      </div>
                      <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/10 border border-white/15 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold text-slate-200">
                        🔍 Chi tiết
                      </div>
                    </>
                  ) : (
                    <>
                      <div
                        className={`mt-0.5 text-[9px] sm:text-[11px] font-bold uppercase tracking-wider ${isCurrent ? 'text-amber-300/90' : 'text-stone-500'
                          }`}
                      >
                        {q.teamSize} người
                      </div>
                      {needsTwo && (
                        <div className="mt-1 rounded-full bg-rose-500/30 border border-rose-400/50 px-1.5 py-px text-[9px] font-black text-rose-200">
                          ≥ 2 lá Quỷ
                        </div>
                      )}
                    </>
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
                      ? `Quest ${idx + 1} — Cần ≥ 2 lá Phe Quỷ để Quest fail`
                      : `Quest ${idx + 1}`
                  }
                  className={baseCls}
                >
                  {badgeBody}
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
        const isAssassinTarget = state.assassinChoiceId === p.id;
        const data = p.gameData as Partial<AvalonGameData>;
        const hint = getViewerHint(p, myPlayerId, viewerRole);

        // Border / glow:
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
        if (isAssassinTarget) {
          glow = 'ring-4 ring-red-500/80 shadow-lg shadow-red-500/70';
        }

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
            ? `cursor-pointer active:scale-95 hover:ring-2 hover:ring-red-400/70 ${isAssassinTarget ? 'animate-stab' : ''}`
            : '';

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
              className={`flex flex-col items-center gap-1 ${wrapperExtra} ${
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
                    : p.name
              }
            >
              <div
                className={`relative flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full border-[3px] text-sm font-black text-white transition-all ${borderCls} ${glow} ${isOnTeam || isAssassinTarget ? 'animate-pulse' : ''
                  }`}
              >
                <span className="text-base">{p.name.charAt(0).toUpperCase()}</span>

                {isAssassinTarget && (
                  <span
                    className="pointer-events-none absolute -top-3 left-1/2 -translate-x-1/2 text-2xl drop-shadow-[0_2px_3px_rgba(0,0,0,0.6)] animate-bounce"
                    title="Sát Thủ đang ngắm"
                  >
                    🗡️
                  </span>
                )}

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
            </Wrapper>
          </div>
        );
      })}

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
      <div
        className={`relative w-full sm:max-w-md overflow-hidden rounded-3xl border-2 p-5 shadow-2xl ${
          success
            ? 'border-blue-500/50 bg-gradient-to-br from-blue-950/95 to-slate-950/95'
            : 'border-red-500/50 bg-gradient-to-br from-red-950/95 to-slate-950/95'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          aria-label="Đóng"
        >
          ✕
        </button>

        <div className="text-center">
          <p className="text-[11px] uppercase font-bold text-slate-300 tracking-widest">
            Quest {questIndex + 1}
          </p>
          <div className="text-5xl my-2">{success ? '🛡️' : '🗡️'}</div>
          <p
            className={`text-2xl font-black ${success ? 'text-blue-200' : 'text-red-200'}`}
          >
            {success ? 'THÀNH CÔNG' : 'THẤT BẠI'}
          </p>
          {needsTwo && (
            <p className="mt-1 text-[10px] font-bold text-rose-300">
              ⚠ Quest này cần ≥ 2 lá Phe Quỷ để fail
            </p>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl border-2 border-blue-500/30 bg-blue-500/10 p-3 text-center">
            <div className="text-2xl mb-0.5">🛡️</div>
            <p className="text-[10px] uppercase font-bold text-blue-300">Phe Người</p>
            <p className="text-2xl font-black text-blue-200 leading-tight">{goodCount}</p>
          </div>
          <div className="rounded-xl border-2 border-red-500/30 bg-red-500/10 p-3 text-center">
            <div className="text-2xl mb-0.5">👹</div>
            <p className="text-[10px] uppercase font-bold text-red-300">Phe Quỷ</p>
            <p className="text-2xl font-black text-red-200 leading-tight">{evilCount}</p>
          </div>
        </div>

        {(approve !== undefined || reject !== undefined) && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-center">
              <p className="text-[10px] uppercase font-bold text-emerald-300">Đồng ý</p>
              <p className="text-lg font-black text-emerald-200 leading-tight">
                {approve ?? '—'}
              </p>
            </div>
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5 text-center">
              <p className="text-[10px] uppercase font-bold text-rose-300">Từ chối</p>
              <p className="text-lg font-black text-rose-200 leading-tight">
                {reject ?? '—'}
              </p>
            </div>
          </div>
        )}

        <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3">
          <p className="text-[10px] uppercase font-bold text-slate-400 mb-2">
            👥 Đội đi Quest{leader ? ` · 👑 ${leader.name}` : ''}
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
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 text-[10px] font-black">
                    {p.name.charAt(0).toUpperCase()}
                  </span>
                  {p.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className={`mt-4 w-full rounded-xl py-2.5 text-sm font-black text-white ${
            success
              ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500'
              : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500'
          }`}
        >
          ✓ Đóng
        </button>
      </div>
    </div>
  );
}
