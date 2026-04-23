'use client';

import { useRoom } from '@/hooks/useRoom';
import { useAuth } from '@/hooks/useAuth';
import QRCodeDisplay from '@/components/core/QRCodeDisplay';
import LoadingSpinner from '@/components/core/LoadingSpinner';
import RoleCard from './RoleCard';
import NightActionPanel from './NightActionPanel';
import HostDashboard from './HostDashboard';
import PlayerWaiting from './PlayerWaiting';
import type { GameModuleProps } from '@/lib/gameRegistry';
import type { ClocktowerRole } from '@/types/games/clocktower';

export default function ClocktowerBoard({ room, players, playerId, isHost }: GameModuleProps) {
  const { updateStatus } = useRoom(room.id, playerId);
  const currentPlayer = players.find((p) => p.id === playerId);
  const playerRole = currentPlayer?.gameData?.role as ClocktowerRole | undefined;

  // ─── Lobby View ───────────────────────────────────────────────────
  if (room.status === 'lobby') {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Room Header */}
        <div className="text-center">
          <h1 className="mb-2 text-3xl font-black text-white">
            🏰 Blood on the Clocktower
          </h1>
          <p className="text-slate-400">Waiting for players to join...</p>
        </div>

        {/* QR Code & Room Info */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-6">
          <QRCodeDisplay roomId={room.id} roomCode={room.roomCode} gameType={room.gameType} />
        </div>

        {/* Player List */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
            Players ({players.length}/{room.config.maxPlayers})
          </h3>
          <div className="space-y-2">
            {players.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 text-sm font-bold text-white">
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium text-white">{p.name}</span>
                {p.isHost && (
                  <span className="ml-auto rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-medium text-amber-400">
                    Storyteller
                  </span>
                )}
                {p.id === playerId && !p.isHost && (
                  <span className="ml-auto text-xs text-slate-500">You</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Start Game (Host only) */}
        {isHost && (
          <button
            onClick={() => updateStatus('night')}
            disabled={players.length < 5}
            className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 text-lg font-bold text-white transition-all hover:from-purple-500 hover:to-indigo-500 hover:shadow-lg hover:shadow-purple-500/25 disabled:opacity-40 disabled:cursor-not-allowed"
            id="start-game-btn"
          >
            {players.length < 5
              ? `Need ${5 - players.length} more player(s)`
              : '🎭 Start Night Phase'}
          </button>
        )}
      </div>
    );
  }

  // ─── Host View (Day or Night) ─────────────────────────────────────
  if (isHost) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black text-white">🏰 Storyteller Dashboard</h1>
          <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
            room.status === 'night'
              ? 'bg-indigo-500/20 text-indigo-300'
              : room.status === 'day'
              ? 'bg-amber-500/20 text-amber-300'
              : 'bg-slate-500/20 text-slate-300'
          }`}>
            {room.status}
          </span>
        </div>
        <HostDashboard
          roomId={room.id}
          hostId={playerId}
          players={players}
          onChangePhase={(phase) => updateStatus(phase)}
          currentPhase={room.status}
        />
      </div>
    );
  }

  // ─── Player View: Night Phase ─────────────────────────────────────
  if (room.status === 'night') {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <div className="text-center">
          <h1 className="mb-1 text-2xl font-black text-white">🌙 Night Phase</h1>
          <p className="text-sm text-slate-400">Close your eyes...</p>
        </div>

        {/* Role Card */}
        {playerRole && (
          <RoleCard role={playerRole} isRevealed={true} />
        )}

        {/* Night Action */}
        <NightActionPanel
          roomId={room.id}
          playerId={playerId}
          players={players}
          roleName={playerRole}
        />
      </div>
    );
  }

  // ─── Player View: Day Phase ───────────────────────────────────────
  if (room.status === 'day') {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="text-center">
          <h1 className="mb-1 text-2xl font-black text-white">☀️ Day Phase</h1>
          <p className="text-sm text-slate-400">Discuss, accuse, and nominate!</p>
        </div>

        {/* Role Card (compact) */}
        {playerRole && (
          <RoleCard role={playerRole} isRevealed={true} compact />
        )}

        {/* Town Square */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
            Town Square
          </h3>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {players
              .filter((p) => !p.isHost)
              .map((p) => (
                <div
                  key={p.id}
                  className={`flex flex-col items-center gap-1 rounded-xl p-3 transition-all ${
                    p.isAlive
                      ? 'bg-white/5 hover:bg-white/10'
                      : 'bg-red-500/5 opacity-50'
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                      p.isAlive
                        ? 'bg-gradient-to-br from-purple-500 to-cyan-500 text-white'
                        : 'bg-slate-700 text-slate-500'
                    }`}
                  >
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <span className={`text-xs font-medium ${p.isAlive ? 'text-white' : 'text-slate-500 line-through'}`}>
                    {p.name}
                  </span>
                  {!p.isAlive && <span className="text-[10px] text-red-400">💀</span>}
                  {p.id === playerId && <span className="text-[10px] text-cyan-400">You</span>}
                </div>
              ))}
          </div>
        </div>

        {/* Dead? */}
        {currentPlayer && !currentPlayer.isAlive && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-center">
            <p className="text-sm text-red-400">💀 You have died. You may still participate in discussion but have limited voting power.</p>
          </div>
        )}
      </div>
    );
  }

  // ─── Game Over ────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="text-6xl">🎭</div>
      <h1 className="text-3xl font-black text-white">Game Over</h1>
      <p className="text-slate-400">Thanks for playing Blood on the Clocktower!</p>
    </div>
  );
}
