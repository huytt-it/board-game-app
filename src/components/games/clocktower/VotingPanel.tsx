'use client';

import { useState } from 'react';
import type { Player } from '@/types/player';
import { ROLE_ICONS, type ClocktowerRole } from '@/types/games/clocktower';

interface VotingPanelProps {
  targetName: string;
  targetId: string;
  players: Player[];
  playerId: string;
  votes: Record<string, boolean>;
  hasVoted: boolean;
  voteCount: { agree: number; disagree: number; total: number };
  onVote: (vote: boolean) => void;
  onResolve?: () => void;      // Host only
  onCancel?: () => void;       // Host only
  isHost: boolean;
  alivePlayers: number;
}

/**
 * Voting panel during day phase — shows nominated player,
 * vote buttons, real-time vote progress, and result.
 */
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
  const agreePercent = alivePlayers > 0 ? (voteCount.agree / alivePlayers) * 100 : 0;
  const disagreePercent = alivePlayers > 0 ? (voteCount.disagree / alivePlayers) * 100 : 0;
  const currentPlayer = players.find((p) => p.id === playerId);
  const isAlive = currentPlayer?.isAlive ?? false;
  const isTarget = playerId === targetId;

  // Get target player info
  const targetPlayer = players.find((p) => p.id === targetId);
  const targetRole = targetPlayer?.gameData?.role as ClocktowerRole | undefined;

  return (
    <div className="animate-slide-up space-y-5">
      {/* Nomination Header */}
      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-900/20 to-orange-900/10 p-5">
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest text-amber-400/80 font-semibold mb-2">
            ⚖️ Nomination for Execution
          </p>
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-red-500 text-2xl font-black text-white shadow-lg shadow-amber-500/30">
              {targetName.charAt(0).toUpperCase()}
            </div>
          </div>
          <h3 className="text-2xl font-black text-white mb-1">{targetName}</h3>
          <p className="text-sm text-slate-400">has been nominated for execution</p>
        </div>
      </div>

      {/* Vote Progress */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
        <div className="flex justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
          <span>Votes Cast: {voteCount.total} / {alivePlayers}</span>
          <span>Majority: {majority}</span>
        </div>

        {/* Agree bar */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-green-400 font-medium">👍 Agree ({voteCount.agree})</span>
            <span className="text-slate-500">{Math.round(agreePercent)}%</span>
          </div>
          <div className="h-3 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-700 ease-out"
              style={{ width: `${agreePercent}%` }}
            />
          </div>
        </div>

        {/* Disagree bar */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-red-400 font-medium">👎 Disagree ({voteCount.disagree})</span>
            <span className="text-slate-500">{Math.round(disagreePercent)}%</span>
          </div>
          <div className="h-3 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-red-500 to-rose-400 transition-all duration-700 ease-out"
              style={{ width: `${disagreePercent}%` }}
            />
          </div>
        </div>

        {/* Majority line indicator */}
        {voteCount.agree >= majority && (
          <div className="rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-2 text-center animate-scale-in">
            <span className="text-sm text-green-400 font-semibold">
              ✅ Majority reached — execution will proceed
            </span>
          </div>
        )}
      </div>

      {/* Voter list */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
        <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">Individual Votes</p>
        <div className="grid grid-cols-2 gap-1.5">
          {players.filter((p) => !p.isHost && p.isAlive && p.id !== targetId).map((p) => {
            const vote = votes[p.id];
            return (
              <div
                key={p.id}
                className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-all ${
                  vote === true
                    ? 'bg-green-500/10 text-green-400'
                    : vote === false
                    ? 'bg-red-500/10 text-red-400'
                    : 'bg-white/5 text-slate-500'
                }`}
              >
                <div className={`h-1.5 w-1.5 rounded-full ${
                  vote === true ? 'bg-green-500' : vote === false ? 'bg-red-500' : 'bg-slate-600'
                }`} />
                <span className="font-medium truncate">{p.name}</span>
                {p.id === playerId && <span className="text-[9px] text-slate-600 ml-auto">You</span>}
                {vote !== undefined && (
                  <span className="ml-auto">{vote ? '👍' : '👎'}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Vote Buttons (alive non-host non-target players only) */}
      {isAlive && !isHost && !isTarget && !hasVoted && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onVote(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-4 text-lg font-bold text-white transition-all hover:from-green-500 hover:to-emerald-500 hover:shadow-lg hover:shadow-green-500/25"
            id="vote-agree-btn"
          >
            👍 Execute
          </button>
          <button
            onClick={() => onVote(false)}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-4 py-4 text-lg font-bold text-white transition-all hover:from-red-500 hover:to-rose-500 hover:shadow-lg hover:shadow-red-500/25"
            id="vote-disagree-btn"
          >
            👎 Spare
          </button>
        </div>
      )}

      {/* Already voted */}
      {hasVoted && !isHost && (
        <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-center">
          <p className="text-sm text-slate-400">
            ✅ Your vote has been cast. Waiting for others...
          </p>
        </div>
      )}

      {/* Dead player message */}
      {!isAlive && !isHost && (
        <div className="rounded-xl bg-red-500/5 border border-red-500/20 p-4 text-center">
          <p className="text-sm text-red-400">💀 Dead players cannot vote.</p>
        </div>
      )}

      {/* Target message */}
      {isTarget && (
        <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-4 text-center animate-shake">
          <p className="text-sm text-amber-400">⚖️ You are on trial. Your fate is in others&apos; hands...</p>
        </div>
      )}

      {/* Host controls */}
      {isHost && (
        <div className="flex gap-3">
          <button
            onClick={onResolve}
            className="flex-1 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-4 py-3 font-bold text-white transition-all hover:from-amber-500 hover:to-orange-500 hover:shadow-lg"
            id="resolve-vote-btn"
          >
            ⚖️ Finalize Vote
          </button>
          <button
            onClick={onCancel}
            className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 font-medium text-slate-400 transition-all hover:bg-white/10 hover:text-white"
            id="cancel-vote-btn"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
