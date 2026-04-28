'use client';

import type { Player } from '@/types/player';

interface VotingPanelProps {
  targetName: string;
  targetId: string;
  players: Player[];
  playerId: string;
  votes: Record<string, boolean>;
  voteTypes?: Record<string, 'normal' | 'ghost'>;
  hasVoted: boolean;
  voteCount: { agree: number; disagree: number; total: number };
  onVote: (vote: boolean) => void;
  onGhostVote?: (vote: boolean) => void;
  onResolve?: () => void;
  onCancel?: () => void;
  isHost: boolean;
  alivePlayers: number;
}

export default function VotingPanel({
  targetName,
  targetId,
  players,
  playerId,
  votes,
  voteTypes = {},
  hasVoted,
  voteCount,
  onVote,
  onGhostVote,
  onResolve,
  onCancel,
  isHost,
  alivePlayers,
}: VotingPanelProps) {
  const majority = Math.ceil(alivePlayers / 2);
  const majorityReached = voteCount.agree >= majority;

  const currentPlayer = players.find((p) => p.id === playerId);
  const isAlive  = currentPlayer?.isAlive ?? false;
  const isTarget = playerId === targetId;
  const isDead   = !isAlive;

  // Ghost vote eligibility: dead, hasn't spent their token, not the target, not host
  const hasUsedGhostVote = currentPlayer?.gameData?.hasUsedGhostVote === true;
  const canCastGhostVote = isDead && !isHost && !isTarget && !hasUsedGhostVote && !hasVoted;

  // Count breakdown for display
  const ghostAgreeCount = Object.entries(votes).filter(([id, v]) => v === true && voteTypes[id] === 'ghost').length;
  const ghostDisagreeCount = Object.entries(votes).filter(([id, v]) => v === false && voteTypes[id] === 'ghost').length;
  const normalAgreeCount = voteCount.agree - ghostAgreeCount;
  const normalDisagreeCount = voteCount.disagree - ghostDisagreeCount;

  // Voters shown in the individual list: alive (excluding target) + dead who cast a ghost vote
  const aliveVoters  = players.filter((p) => !p.isHost && p.isAlive  && p.id !== targetId);
  const ghostVoters  = players.filter((p) => !p.isHost && !p.isAlive && votes[p.id] !== undefined && p.id !== targetId);
  const allVoters    = [...aliveVoters, ...ghostVoters];

  // Dead players eligible for ghost vote (shown in the ghost-vote waiting row on host view)
  const pendingGhostVoters = players.filter(
    (p) => !p.isHost && !p.isAlive && p.id !== targetId && votes[p.id] === undefined && !p.gameData?.hasUsedGhostVote
  );

  const agreePercent    = alivePlayers > 0 ? Math.min(100, (voteCount.agree    / alivePlayers) * 100) : 0;
  const disagreePercent = alivePlayers > 0 ? Math.min(100, (voteCount.disagree / alivePlayers) * 100) : 0;

  return (
    <div className="flex flex-col flex-1 overflow-hidden animate-slide-up">

      {/* ── Scrollable content ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* Nominee card */}
        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-900/25 to-orange-900/10 p-5 text-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-amber-500/80">
            ⚖️ Đang được xét xử
          </p>
          <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-red-500 text-3xl font-black text-white shadow-xl shadow-amber-500/30">
            {targetName.charAt(0).toUpperCase()}
          </div>
          <h3 className="text-2xl font-black text-white mb-1">{targetName}</h3>
          {isTarget && !isHost && (
            <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/8 px-4 py-2.5 animate-shake">
              <p className="text-sm text-amber-300 font-medium">
                ⚖️ Bạn đang bị xét xử. Số phận trong tay mọi người...
              </p>
            </div>
          )}
        </div>

        {/* Vote progress */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-4">
          {/* Tally header */}
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-400">
              {voteCount.total} đã bỏ phiếu
              {ghostVoters.length > 0 && (
                <span className="ml-1 text-slate-500">(bao gồm {ghostVoters.length} 👻)</span>
              )}
            </span>
            <span className={majorityReached ? 'text-green-400 font-black' : 'text-slate-500'}>
              Cần {majority} đồng ý
            </span>
          </div>

          {/* Agree bar */}
          <div>
            <div className="flex justify-between text-sm font-bold mb-1.5">
              <span className="text-green-400">👍 Xử tử</span>
              <div className="flex items-center gap-1.5">
                <span className="text-green-400 font-black">{voteCount.agree}</span>
                {ghostAgreeCount > 0 && (
                  <span className="text-[10px] text-slate-500 font-normal">
                    ({normalAgreeCount} + {ghostAgreeCount}👻)
                  </span>
                )}
              </div>
            </div>
            <div className="h-4 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-700 ease-out"
                style={{ width: `${agreePercent}%` }}
              />
            </div>
          </div>

          {/* Disagree bar */}
          <div>
            <div className="flex justify-between text-sm font-bold mb-1.5">
              <span className="text-slate-400">👎 Tha bổng</span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">{voteCount.disagree}</span>
                {ghostDisagreeCount > 0 && (
                  <span className="text-[10px] text-slate-500 font-normal">
                    ({normalDisagreeCount} + {ghostDisagreeCount}👻)
                  </span>
                )}
              </div>
            </div>
            <div className="h-4 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-slate-600 to-slate-500 transition-all duration-700 ease-out"
                style={{ width: `${disagreePercent}%` }}
              />
            </div>
          </div>

          {majorityReached && (
            <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-2.5 text-center animate-scale-in">
              <p className="text-sm font-black text-green-400">✅ Đủ phiếu — Sẽ bị xử tử!</p>
            </div>
          )}
        </div>

        {/* Individual votes */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-3">
            Phiếu bầu cá nhân
          </p>
          <div className="grid grid-cols-2 gap-2">
            {allVoters.map((p) => {
              const vote    = votes[p.id];
              const type    = voteTypes[p.id];
              const isGhost = type === 'ghost';
              const agreed    = vote === true;
              const disagreed = vote === false;
              const pending   = vote === undefined;

              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition-all ${
                    isGhost
                      ? agreed
                        ? 'bg-green-500/6 border border-green-500/15'
                        : disagreed
                        ? 'bg-slate-700/25 border border-white/5'
                        : 'bg-white/3 border border-white/5'
                      : agreed
                      ? 'bg-green-500/12 border border-green-500/20'
                      : disagreed
                      ? 'bg-slate-700/40 border border-white/5'
                      : 'bg-white/5 border border-white/5'
                  }`}
                >
                  {/* Status dot */}
                  <div className={`h-2 w-2 rounded-full shrink-0 ${
                    agreed ? 'bg-green-500' : disagreed ? 'bg-slate-500' : 'bg-slate-700 animate-breathe'
                  } ${isGhost ? 'opacity-50' : ''}`} />

                  {/* Name */}
                  <span className={`font-medium truncate text-xs ${
                    isGhost
                      ? agreed ? 'text-green-400/60' : disagreed ? 'text-slate-500' : 'text-slate-600'
                      : agreed ? 'text-green-300' : disagreed ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    {p.name}
                  </span>

                  {/* "you" label */}
                  {p.id === playerId && (
                    <span className="text-[9px] text-slate-600 ml-auto shrink-0">bạn</span>
                  )}

                  {/* Vote icon (ghost or normal) */}
                  {!pending && (
                    <span className="ml-auto shrink-0">
                      {isGhost ? (
                        <span className="text-xs" title="Phiếu linh hồn">
                          {agreed ? '👻👍' : '👻👎'}
                        </span>
                      ) : (
                        <span className="text-base">{agreed ? '👍' : '👎'}</span>
                      )}
                    </span>
                  )}
                </div>
              );
            })}

            {/* Dead players with pending ghost vote — shown on host view */}
            {isHost && pendingGhostVoters.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm border border-white/5 bg-white/3 opacity-50"
              >
                <div className="h-2 w-2 rounded-full shrink-0 bg-slate-700" />
                <span className="font-medium truncate text-xs text-slate-600">{p.name}</span>
                <span className="ml-auto shrink-0 text-[10px] text-slate-700">👻 chưa dùng</span>
              </div>
            ))}
          </div>
        </div>

        {/* Ghost vote legend — host only */}
        {isHost && Object.values(voteTypes).some((t) => t === 'ghost') && (
          <div className="rounded-xl border border-slate-500/15 bg-slate-900/40 px-4 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-1">👻 Phiếu linh hồn</p>
            <p className="text-[11px] text-slate-500">
              Phiếu 👻 đến từ người đã chết, dùng 1 lần duy nhất trong cả ván.
              Tính bình đẳng với phiếu bình thường khi tính đa số.
            </p>
          </div>
        )}

        {/* Host controls */}
        {isHost && (
          <div className="flex gap-3 pt-1 pb-2">
            <button
              onClick={onResolve}
              className="flex-1 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 py-4 font-black text-white transition-all active:scale-[0.98] hover:from-amber-500 hover:to-orange-500 hover:shadow-lg"
              id="resolve-vote-btn"
            >
              ⚖️ Chốt kết quả
            </button>
            <button
              onClick={onCancel}
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 font-semibold text-slate-400 transition-all active:scale-[0.98] hover:bg-white/10 hover:text-white"
              id="cancel-vote-btn"
            >
              Huỷ
            </button>
          </div>
        )}

        {/* Already voted (normal or ghost) */}
        {hasVoted && !isHost && (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-center">
            {voteTypes[playerId] === 'ghost' ? (
              <p className="text-sm text-slate-400">
                👻 Đã dùng phiếu linh hồn. Phiếu của bạn đã được tính vĩnh viễn.
              </p>
            ) : (
              <p className="text-sm text-slate-400">✅ Đã bỏ phiếu. Đang chờ mọi người...</p>
            )}
          </div>
        )}

        {/* Dead — ghost vote already spent */}
        {isDead && !isHost && !hasVoted && !canCastGhostVote && !isTarget && (
          <div className="rounded-2xl border border-slate-700/30 bg-slate-900/40 px-5 py-4 text-center">
            <p className="text-2xl mb-1">👻</p>
            <p className="text-sm text-slate-500 font-medium">Phiếu linh hồn đã dùng.</p>
            <p className="text-xs text-slate-600 mt-0.5">Bạn không còn phiếu nào trong ván này.</p>
          </div>
        )}

        {/* Dead is the target */}
        {isDead && isTarget && !isHost && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-4 text-center">
            <p className="text-sm text-red-400 font-medium">⚖️ Bạn đang bị xét xử — không thể bỏ phiếu.</p>
          </div>
        )}
      </div>

      {/* ── Sticky bottom: normal vote buttons (alive, non-target) ─────── */}
      {isAlive && !isHost && !isTarget && !hasVoted && (
        <div className="shrink-0 border-t border-white/10 bg-slate-950/98 px-4 pt-3 pb-safe backdrop-blur-sm">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
            Bỏ phiếu của bạn
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onVote(true)}
              id="vote-agree-btn"
              className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-b from-green-500 to-green-700 py-5 font-black text-white shadow-lg shadow-green-600/30 transition-all active:scale-95 hover:from-green-400 hover:to-green-600"
            >
              <span className="text-4xl leading-none">👍</span>
              <span className="text-sm tracking-wide">Xử tử</span>
            </button>
            <button
              onClick={() => onVote(false)}
              id="vote-disagree-btn"
              className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-slate-800 py-5 font-bold text-slate-300 shadow-lg transition-all active:scale-95 hover:bg-slate-700 hover:text-white"
            >
              <span className="text-4xl leading-none">👎</span>
              <span className="text-sm tracking-wide">Tha bổng</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Sticky bottom: ghost vote buttons (dead, token available) ──── */}
      {canCastGhostVote && (
        <div className="shrink-0 border-t border-slate-600/30 bg-slate-950/98 px-4 pt-3 pb-safe backdrop-blur-sm">
          {/* Ghost vote banner */}
          <div className="rounded-2xl border border-slate-500/25 bg-gradient-to-br from-slate-800/60 to-slate-900/60 px-4 py-3 mb-3 text-center">
            <p className="text-xl mb-0.5">👻</p>
            <p className="text-xs font-black text-white/70 uppercase tracking-wider">Phiếu Linh Hồn</p>
            <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
              Bạn đã chết nhưng còn 1 phiếu · Dùng 1 lần duy nhất trong ván này
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onGhostVote?.(true)}
              className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-green-500/25 bg-green-900/20 py-4 font-black text-green-400/80 shadow-lg transition-all active:scale-95 hover:bg-green-900/35 hover:text-green-300"
            >
              <span className="text-2xl leading-none">👻👍</span>
              <span className="text-xs tracking-wide">Xử tử</span>
            </button>
            <button
              onClick={() => onGhostVote?.(false)}
              className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-slate-600/25 bg-slate-800/20 py-4 font-bold text-slate-500 shadow-lg transition-all active:scale-95 hover:bg-slate-800/40 hover:text-slate-400"
            >
              <span className="text-2xl leading-none">👻👎</span>
              <span className="text-xs tracking-wide">Tha bổng</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
