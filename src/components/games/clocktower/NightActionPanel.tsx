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
    isTriggeredRavenkeeper,
    submitAction,
    clearMessage,
  } = useClocktowerNight(roomId, playerId, dayCount);

  const currentPlayer = players.find((p) => p.id === playerId);
  const isAlive = currentPlayer?.isAlive ?? false;

  // ─── Dead player ──────────────────────────────────────────────────
  if (!isAlive) {
    return (
      <div className="flex flex-col items-center gap-5 py-10 text-center animate-scale-in">
        <div className="text-7xl">💀</div>
        <div>
          <h3 className="text-xl font-black text-red-400 mb-2">Bạn Đã Qua Đời</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Người chết không thể hành động trong đêm.<br />Hãy quan sát...
          </p>
        </div>
        <PlayerWaiting message="Đang chờ màn đêm qua đi..." />
      </div>
    );
  }

  // ─── Show private message from Storyteller (highest priority) ─────
  if (privateMessage) {
    return (
      <div className="flex flex-col gap-4 animate-scale-in">
        {/* Glow header */}
        <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-900/40 to-indigo-900/20 p-5 shadow-lg shadow-purple-500/10">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/20 text-xl">📜</div>
            <div>
              <h3 className="font-black text-white">Tin từ Quản trò</h3>
              <p className="text-xs text-purple-400">Chỉ mình bạn thấy tin này</p>
            </div>
          </div>
          <div className="rounded-xl bg-black/30 border border-white/5 px-4 py-4">
            <p className="text-base leading-relaxed text-slate-100 whitespace-pre-wrap font-medium">
              {privateMessage}
            </p>
          </div>
        </div>
        <button
          onClick={clearMessage}
          className="w-full rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 py-4 text-base font-black text-white transition-all active:scale-95 hover:from-purple-500 hover:to-indigo-500"
        >
          ✓ Đã hiểu — Đóng lại
        </button>
      </div>
    );
  }

  // ─── Waiting for Storyteller response ─────────────────────────────
  if (waitingForStoryteller || hasSubmitted) {
    return <PlayerWaiting message="Quản trò đang xử lý — chờ tin nhắn riêng tư..." />;
  }

  // ─── Role has no night action ──────────────────────────────────────
  if (!displayRole || !hasNightAction) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-900/10 p-5 text-center">
          <div className="text-5xl mb-3 animate-float">
            {displayRole ? ROLE_ICONS[displayRole] : '🌙'}
          </div>
          <h3 className="text-lg font-black text-indigo-300 mb-2">Không có hành động đêm nay</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Nhân vật của bạn ngủ yên trong đêm nay.
          </p>
          <p className="text-xs text-slate-600 mt-1">Chờ Quản trò chuyển sang ban ngày...</p>
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
      <div className="space-y-3">
        {/* Ravenkeeper death banner — shown when triggered by host */}
        {isTriggeredRavenkeeper && (
          <div className="rounded-2xl border border-slate-500/30 bg-gradient-to-br from-slate-900/80 to-slate-800/40 p-5 text-center animate-scale-in shadow-lg shadow-black/30">
            <div className="text-5xl mb-3 animate-float">🐦‍⬛</div>
            <h3 className="font-black text-slate-100 text-lg mb-2 leading-tight">
              Đêm nay bạn sẽ qua đời...
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Trước khi ra đi, hãy chọn <span className="text-white font-bold">1 người chơi</span> bất kỳ.
              <br />Quản trò sẽ tiết lộ <span className="text-slate-200 font-semibold">nhân vật thật</span> của họ cho bạn.
            </p>
          </div>
        )}
        <SingleTargetAction
          role={displayRole}
          playerId={playerId}
          players={players}
          canTargetSelf={false}
          onSubmit={(targetId, targetName) => submitAction(targetId, targetName)}
        />
      </div>
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
