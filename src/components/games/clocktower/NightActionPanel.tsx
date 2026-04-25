'use client';

import { useClocktowerNight } from '@/hooks/games/useClocktowerNight';
import type { Player } from '@/types/player';
import {
  ROLE_ICONS,
  ROLE_ACTION_TYPE,
  ClocktowerRole,
} from '@/types/games/clocktower';
import PlayerWaiting from './PlayerWaiting';
import SingleTargetAction from './roleActions/SingleTargetAction';
import DualTargetAction from './roleActions/DualTargetAction';
import InfoOnlyAction from './roleActions/InfoOnlyAction';

interface NightActionPanelProps {
  roomId: string;
  playerId: string;
  players: Player[];
  dayCount: number;
}

export default function NightActionPanel({ roomId, playerId, players, dayCount }: NightActionPanelProps) {
  const {
    privateMessage,
    waitingForStoryteller,
    hasSubmitted,
    hasNightAction,
    displayRole,
    submitAction,
    clearMessage,
  } = useClocktowerNight(roomId, playerId, dayCount);

  const currentPlayer = players.find((p) => p.id === playerId);
  const isAlive = currentPlayer?.isAlive ?? false;

  // ─── Dead player ──────────────────────────────────────────────────
  if (!isAlive) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center animate-scale-in">
        <div className="text-5xl mb-3">💀</div>
        <h3 className="text-lg font-bold text-red-400 mb-2">Bạn Đã Qua Đời</h3>
        <p className="text-sm text-slate-400">Người chết không thể hành động trong đêm...</p>
      </div>
    );
  }

  // ─── Show private message from Storyteller (highest priority) ─────
  if (privateMessage) {
    return (
      <div className="space-y-4 animate-scale-in">
        <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-900/30 to-indigo-900/20 p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xl">📜</span>
            <h3 className="font-semibold text-purple-300">Thông tin từ Quản trò</h3>
          </div>
          <p className="text-sm leading-relaxed text-slate-200 whitespace-pre-wrap">{privateMessage}</p>
        </div>
        <button
          onClick={clearMessage}
          className="w-full rounded-xl bg-white/5 px-4 py-3 text-sm text-slate-400 transition-all hover:bg-white/10 hover:text-white"
        >
          Đã hiểu
        </button>
      </div>
    );
  }

  // ─── Waiting for Storyteller response ─────────────────────────────
  if (waitingForStoryteller || hasSubmitted) {
    return <PlayerWaiting message="Đang chờ phản hồi từ Quản trò..." />;
  }

  // ─── Role has no night action ──────────────────────────────────────
  if (!displayRole || !hasNightAction) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-900/10 p-5 text-center">
          <div className="text-4xl mb-3">{displayRole ? ROLE_ICONS[displayRole] : '🌙'}</div>
          <h3 className="text-lg font-semibold text-indigo-300 mb-2">Không có hành động đêm</h3>
          <p className="text-sm text-slate-400">
            Nhân vật của bạn không hành động trong đêm nay.
          </p>
          <p className="text-xs text-slate-500 mt-2">Chờ Quản trò chuyển sang ban ngày...</p>
        </div>
        <PlayerWaiting message="Đang chờ màn đêm qua đi..." />
      </div>
    );
  }

  // ─── Dispatch to role-specific action UI ──────────────────────────
  const actionType = ROLE_ACTION_TYPE[displayRole];

  if (actionType === 'info-only') {
    return (
      <InfoOnlyAction
        role={displayRole}
        hasSubmitted={hasSubmitted}
        onSubmit={() => submitAction()}
      />
    );
  }

  if (actionType === 'single-target') {
    return (
      <SingleTargetAction
        role={displayRole}
        playerId={playerId}
        players={players}
        canTargetSelf={false}
        onSubmit={(targetId, targetName) => submitAction(targetId, targetName)}
      />
    );
  }

  if (actionType === 'self-or-other') {
    return (
      <SingleTargetAction
        role={displayRole}
        playerId={playerId}
        players={players}
        canTargetSelf={true}
        onSubmit={(targetId, targetName) => submitAction(targetId, targetName)}
      />
    );
  }

  if (actionType === 'dual-target') {
    return (
      <DualTargetAction
        role={displayRole}
        playerId={playerId}
        players={players}
        onSubmit={(firstId, firstName, secondId, secondName) =>
          submitAction(firstId, firstName, secondId, secondName)
        }
      />
    );
  }

  // ─── Fallback (no-action roles that somehow have a night action) ───
  return <PlayerWaiting message="Đang chờ màn đêm qua đi..." />;
}
