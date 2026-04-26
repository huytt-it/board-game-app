'use client';

import type { Player } from '@/types/player';

interface VotingPanelProps {
  targetName: string;
  targetId: string;
  players: Player[];
  playerId: string;
  votes: Record<string, boolean>;
  hasVoted: boolean;
  voteCount: { agree: number; disagree: number; total: number };
  onVote: (vote: boolean) => void;
  onResolve?: () => void;  // Host only
  onCancel?: () => void;   // Host only
  isHost: boolean;
  alivePlayers: number;
}

export default function VotingPanel({
  targetName,
  targetId,
  players,
  playerId,
  votes,
  hasVoted,
  voteCount,
  onVote,
  onResolve,
  onCancel,
  isHost,
  alivePlayers,
}: VotingPanelProps) {
  const majority = Math.ceil(alivePlayers / 2);
  const agreePercent    = alivePlayers > 0 ? (voteCount.agree    / alivePlayers) * 100 : 0;
  const disagreePercent = alivePlayers > 0 ? (voteCount.disagree / alivePlayers) * 100 : 0;
  const currentPlayer = players.find((p) => p.id === playerId);
  const isAlive  = currentPlayer?.isAlive ?? false;
  const isTarget = playerId === targetId;
  const majorityReached = voteCount.agree >= majority;

  // Players who vote (alive, non-host, non-target)
  const voters = players.filter((p) => !p.isHost && p.isAlive && p.id !== targetId);

  return (
    <div className="flex flex-col flex-1 overflow-hidden animate-slide-up">

      {/* ── Scrollable content area ─────────────────────────────────── */}
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

          {/* Target-is-me notice */}
          {isTarget && (
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
            <span className="text-slate-400">{voteCount.total} / {alivePlayers} đã bỏ phiếu</span>
            <span className={majorityReached ? 'text-green-400 font-bold' : 'text-slate-500'}>
              Cần {majority} phiếu đồng ý
            </span>
          </div>

          {/* Agree bar */}
          <div>
            <div className="flex justify-between text-sm font-bold mb-2">
              <span className="text-green-400">👍 Xử tử</span>
              <span className="text-green-400">{voteCount.agree}</span>
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
            <div className="flex justify-between text-sm font-bold mb-2">
              <span className="text-slate-400">👎 Tha bổng</span>
              <span className="text-slate-400">{voteCount.disagree}</span>
            </div>
            <div className="h-4 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-slate-600 to-slate-500 transition-all duration-700 ease-out"
                style={{ width: `${disagreePercent}%` }}
              />
            </div>
          </div>

          {/* Majority banner */}
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
            {voters.map((p) => {
              const vote = votes[p.id];
              const agreed    = vote === true;
              const disagreed = vote === false;
              const pending   = vote === undefined;
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition-all ${
                    agreed
                      ? 'bg-green-500/12 border border-green-500/20'
                      : disagreed
                      ? 'bg-slate-700/40 border border-white/5'
                      : 'bg-white/5 border border-white/5'
                  }`}
                >
                  <div className={`h-2 w-2 rounded-full shrink-0 ${
                    agreed ? 'bg-green-500' : disagreed ? 'bg-slate-500' : 'bg-slate-700 animate-breathe'
                  }`} />
                  <span className={`font-medium truncate ${agreed ? 'text-green-300' : disagreed ? 'text-slate-400' : 'text-slate-600'}`}>
                    {p.name}
                  </span>
                  {p.id === playerId && (
                    <span className="text-[9px] text-slate-600 ml-auto shrink-0">bạn</span>
                  )}
                  {!pending && (
                    <span className="ml-auto shrink-0 text-base">{agreed ? '👍' : '👎'}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Host controls (inside scroll area so they're visible) */}
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

        {/* Dead message (inside scroll so always reachable) */}
        {!isAlive && !isHost && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-4 text-center">
            <p className="text-sm text-red-400 font-medium">💀 Người chết không được bỏ phiếu.</p>
          </div>
        )}

        {/* Already voted */}
        {hasVoted && !isHost && (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-center">
            <p className="text-sm text-slate-400">✅ Đã bỏ phiếu. Đang chờ mọi người...</p>
          </div>
        )}
      </div>

      {/* ── Sticky bottom vote buttons (players only, not yet voted) ── */}
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
    </div>
  );
}
