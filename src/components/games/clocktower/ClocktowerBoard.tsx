'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useRoom } from '@/hooks/useRoom';
import { useVoting } from '@/hooks/games/useVoting';
import QRCodeDisplay from '@/components/core/QRCodeDisplay';
import RoleCard from './RoleCard';
import NightActionPanel from './NightActionPanel';
import HostDashboard from './HostDashboard';
import PlayerWaiting from './PlayerWaiting';
import GameStartAnimation from './GameStartAnimation';
import RoleRevealAnimation from './RoleRevealAnimation';
import VotingPanel from './VotingPanel';
import RoomSettingsPanel from './RoomSettingsPanel';
import type { GameModuleProps } from '@/lib/gameRegistry';
import { ROLE_ICONS, type ClocktowerRole } from '@/types/games/clocktower';

type AnimationPhase = 'none' | 'countdown' | 'role-reveal';

export default function ClocktowerBoard({ room, players, playerId, isHost }: GameModuleProps) {
  const router = useRouter();
  const { updateStatus, updateGameState, updateConfig, startGame, leaveRoom, deleteRoom, resetRoom } = useRoom(room.id, playerId);
  const [animationPhase, setAnimationPhase] = useState<AnimationPhase>('none');
  const [roleRevealed, setRoleRevealed] = useState(false);

  const currentPlayer = players.find((p) => p.id === playerId);
  const playerRole = currentPlayer?.gameData?.role as ClocktowerRole | undefined;
  // Drunk players see their fake Townsfolk role everywhere in the player-facing UI
  const isDrunk = currentPlayer?.gameData?.isDrunk === true;
  const drunkRole = currentPlayer?.gameData?.drunkRole as ClocktowerRole | undefined;
  const displayRole = isDrunk && drunkRole ? drunkRole : playerRole;
  const alivePlayers = players.filter((p) => !p.isHost && p.isAlive).length;

  const { nominations, votingTarget, votingTargetName, votes, hasVoted, voteCount, nominatePlayer, castNomination, castVote, resolveVote, cancelVote } =
    useVoting(room.id, playerId, room.gameState, alivePlayers);

  // ─── Handle Start Game (Host) ──────────────────────────────────────
  const handleStartGame = useCallback(async () => {
    try {
      await startGame();
      setAnimationPhase('countdown');
    } catch (err: any) {
      alert(err.message || 'Failed to start game');
    }
  }, [startGame]);

  // ─── After countdown animation completes ───────────────────────────
  const handleCountdownComplete = useCallback(() => {
    setAnimationPhase('none');
    updateStatus('night');
  }, [updateStatus]);

  // ─── Handle role reveal for players ────────────────────────────────
  // When night starts and player has a role but hasn't seen it yet
  const showRoleReveal = !isHost && room.status === 'night' && displayRole && !roleRevealed;

  // ─── Room Management Actions ───────────────────────────────────────
  const handleLeave = async () => {
    if (confirm('Are you sure you want to leave this room?')) {
      await leaveRoom(playerId);
      router.push('/');
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this room? This cannot be undone.')) {
      await deleteRoom();
      router.push('/');
    }
  };

  const handleReset = async () => {
    if (confirm('Are you sure you want to start a new game?')) {
      await resetRoom();
    }
  };

  // ─── Animation overlays ────────────────────────────────────────────
  if (animationPhase === 'countdown') {
    return <GameStartAnimation onComplete={handleCountdownComplete} />;
  }

  if (showRoleReveal) {
    return (
      <RoleRevealAnimation
        role={displayRole!}
        onDismiss={() => setRoleRevealed(true)}
      />
    );
  }

  // ─── Lobby View ───────────────────────────────────────────────────
  if (room.status === 'lobby') {
    return (
      <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
        {/* Room Header Actions */}
        <div className="flex justify-end">
          <button
            onClick={isHost ? handleDelete : handleLeave}
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-400 transition-all hover:bg-red-500/10 hover:text-red-400"
          >
            {isHost ? '🗑️ Delete Room' : '🚪 Leave Room'}
          </button>
        </div>

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

        {/* Room Settings (Host Only) */}
        {isHost && (
          <RoomSettingsPanel 
            config={room.config}
            onUpdateConfig={updateConfig}
            playerCount={players.filter(p => !p.isHost).length}
          />
        )}

        {/* Player List */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
            Players ({players.length}/{room.config.maxPlayers})
          </h3>
          <div className="space-y-2">
            {players.map((p, idx) => (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3 animate-slide-up"
                style={{ animationDelay: `${idx * 80}ms` }}
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

        {/* Start Game (Host only) — no minimum player restriction for testing */}
        {isHost && (
          <button
            onClick={handleStartGame}
            disabled={players.filter((p) => !p.isHost).length < 1}
            className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 text-lg font-bold text-white transition-all hover:from-purple-500 hover:to-indigo-500 hover:shadow-lg hover:shadow-purple-500/25 disabled:opacity-40 disabled:cursor-not-allowed"
            id="start-game-btn"
          >
            {players.filter((p) => !p.isHost).length < 1
              ? 'Need at least 1 player'
              : '🎭 Start Night Phase'}
          </button>
        )}
      </div>
    );
  }

  // ─── Game Over View ───────────────────────────────────────────────
  if (room.status === 'end') {
    const winner = room.gameState?.winner;
    const isGoodWin = winner === 'good';
    
    return (
      <div className="mx-auto max-w-2xl space-y-6 animate-fade-in text-center">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-xl relative overflow-hidden">
          <div className={`absolute inset-0 bg-gradient-to-br opacity-20 ${isGoodWin ? 'from-cyan-500 to-blue-500' : 'from-red-500 to-orange-500'}`} />
          <div className="relative text-6xl mb-4">{isGoodWin ? '🌟' : '👹'}</div>
          <h1 className="relative mb-2 text-4xl font-black text-white">
            {isGoodWin ? 'Good Wins!' : 'Evil Wins!'}
          </h1>
          <p className="relative text-slate-300">
            {isGoodWin ? 'The Town has successfully defeated the Demon.' : 'The Demon has destroyed the Town.'}
          </p>
        </div>

        <div className="flex justify-center gap-4 mt-8">
          {isHost ? (
            <button
              onClick={handleReset}
              className="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-8 py-4 font-bold text-white transition-all hover:from-purple-500 hover:to-indigo-500"
            >
              🔄 Start New Game
            </button>
          ) : (
            <button
              onClick={handleLeave}
              className="rounded-xl border border-white/10 bg-white/5 px-8 py-4 font-semibold text-white transition-all hover:bg-white/10"
            >
              🚪 Return to Lobby
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── Host View (Day, Night, or Voting) ─────────────────────────────
  if (isHost) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black text-white">🏰 Storyteller Dashboard</h1>
          <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
            room.status === 'night'
              ? 'bg-indigo-500/20 text-indigo-300'
              : room.status === 'voting'
              ? 'bg-amber-500/20 text-amber-300'
              : room.status === 'day'
              ? 'bg-amber-500/20 text-amber-300'
              : 'bg-slate-500/20 text-slate-300'
          }`}>
            {room.status === 'voting' ? '⚖️ Voting' : room.status}
          </span>
          {room.gameState?.dayCount !== undefined && room.gameState.dayCount > 0 && (
            <span className="text-xs text-slate-500">Day {room.gameState.dayCount}</span>
          )}
          <div className="ml-auto">
            <button onClick={handleDelete} className="rounded-lg px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500/10 transition-colors border border-red-500/20">
              🗑️ Delete Room
            </button>
          </div>
        </div>
        <HostDashboard
          roomId={room.id}
          hostId={playerId}
          players={players}
          onChangePhase={(phase) => {
            const resetVotingState = {
              nominations: {},
              votingTarget: null,
              votingTargetName: null,
              votes: {},
            } as any;
            
            if (phase === 'day') {
              const currentDay = room.gameState?.dayCount || 0;
              updateGameState({ 
                dayCount: currentDay + 1,
                ...resetVotingState
              });
            } else if (phase === 'night') {
              updateGameState(resetVotingState);
            }
            updateStatus(phase);
          }}
          currentPhase={room.status}
          gameState={room.gameState}
          onEndGame={async (winner) => {
            await updateGameState({ winner });
            await updateStatus('end');
          }}
        />
      </div>
    );
  }

  // ─── Player View: Night Phase ─────────────────────────────────────
  if (room.status === 'night') {
    return (
      <div className="mx-auto max-w-lg space-y-6 animate-fade-in">
        <div className="flex items-start justify-between text-left">
          <div>
            <h1 className="mb-1 text-2xl font-black text-white">🌙 Night Phase</h1>
            <p className="text-sm text-slate-400">Close your eyes...</p>
          </div>
          <button onClick={handleLeave} className="rounded-lg px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500/10 transition-colors border border-red-500/20">
            🚪 Leave Room
          </button>
        </div>

        {/* Role Card */}
        {displayRole && (
          <RoleCard role={displayRole} isRevealed={true} />
        )}

        {/* Night Action */}
        <NightActionPanel
          roomId={room.id}
          playerId={playerId}
          players={players}
          dayCount={room.gameState?.dayCount || 0}
        />
      </div>
    );
  }

  // ─── Player View: Voting Phase ─────────────────────────────────────
  if (room.status === 'voting') {
    return (
      <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
        <div className="flex items-start justify-between text-left">
          <div>
            <h1 className="mb-1 text-2xl font-black text-white">⚖️ Town Vote</h1>
            <p className="text-sm text-slate-400">A nomination has been called!</p>
          </div>
          <button onClick={handleLeave} className="rounded-lg px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500/10 transition-colors border border-red-500/20">
            🚪 Leave Room
          </button>
        </div>

        {/* Role Card (compact) */}
        {displayRole && (
          <RoleCard role={displayRole} isRevealed={true} compact />
        )}

        {/* Voting Panel */}
        {votingTarget && votingTargetName && (
          <VotingPanel
            targetName={votingTargetName}
            targetId={votingTarget}
            players={players}
            playerId={playerId}
            votes={votes}
            hasVoted={hasVoted}
            voteCount={voteCount}
            onVote={castVote}
            isHost={false}
            alivePlayers={alivePlayers}
          />
        )}
      </div>
    );
  }

  // ─── Player View: Day Phase ───────────────────────────────────────
  if (room.status === 'day') {
    return (
      <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
        <div className="flex items-start justify-between text-left">
          <div>
            <h1 className="mb-1 text-2xl font-black text-white">☀️ Day Phase</h1>
            <p className="text-sm text-slate-400">Discuss, accuse, and nominate!</p>
            {room.gameState?.dayCount !== undefined && room.gameState.dayCount > 0 && (
              <p className="text-xs text-slate-500 mt-1">Day {room.gameState.dayCount}</p>
            )}
          </div>
          <button onClick={handleLeave} className="rounded-lg px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500/10 transition-colors border border-red-500/20">
            🚪 Leave Room
          </button>
        </div>

        {/* Role Card (compact) */}
        {displayRole && (
          <RoleCard role={displayRole} isRevealed={true} compact />
        )}

        {/* Town Square */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
            Town Square
          </h3>
          <p className="mb-4 text-xs text-slate-500">
            Click on a player to nominate them for execution. You can only nominate one player.
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {players
              .filter((p) => !p.isHost)
              .map((p) => {
                const role = p.gameData?.role as ClocktowerRole | undefined;
                const isNominatedByMe = nominations?.[playerId] === p.id;
                const nominatedCount = Object.values(nominations || {}).filter(id => id === p.id).length;

                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      if (room.status === 'day' && p.isAlive && p.id !== playerId) {
                         castNomination(isNominatedByMe ? null : p.id);
                      }
                    }}
                    disabled={room.status !== 'day' || !p.isAlive || p.id === playerId}
                    className={`flex flex-col items-center gap-1 rounded-xl p-3 transition-all ${
                      p.isAlive
                        ? isNominatedByMe
                          ? 'bg-amber-500/20 ring-1 ring-amber-500 hover:bg-amber-500/30'
                          : 'bg-white/5 hover:bg-white/10'
                        : 'bg-red-500/5 opacity-50 cursor-not-allowed'
                    } relative`}
                  >
                    {nominatedCount > 0 && (
                      <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-black shadow-lg">
                        {nominatedCount}
                      </span>
                    )}
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                        p.isAlive
                          ? isNominatedByMe 
                            ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/50'
                            : 'bg-gradient-to-br from-purple-500 to-cyan-500 text-white'
                          : 'bg-slate-700 text-slate-500'
                      }`}
                    >
                      {p.isAlive
                        ? p.name.charAt(0).toUpperCase()
                        : '💀'}
                    </div>
                    <span className={`text-xs font-medium truncate w-full ${!p.isAlive ? 'text-slate-500 line-through' : isNominatedByMe ? 'text-amber-400' : 'text-white'}`}>
                      {p.name}
                    </span>
                    {!p.isAlive && <span className="text-[10px] text-red-400">💀 Dead</span>}
                    {p.id === playerId && <span className="text-[10px] text-cyan-400">You</span>}
                  </button>
                );
              })}
          </div>
        </div>

        {/* Dead? */}
        {currentPlayer && !currentPlayer.isAlive && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-center animate-scale-in">
            <p className="text-sm text-red-400">💀 You have died. You may still participate in discussion but cannot vote or use abilities.</p>
          </div>
        )}
      </div>
    );
  }

  // ─── Game Over ────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center animate-scale-in">
      <div className="text-6xl animate-float">🎭</div>
      <h1 className="text-3xl font-black text-white">Game Over</h1>
      <p className="text-slate-400">Thanks for playing Blood on the Clocktower!</p>

      <div className="mt-8 flex gap-4">
        {isHost && (
          <button
            onClick={handleReset}
            className="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-3 font-semibold text-white transition-all hover:from-purple-500 hover:to-indigo-500 hover:shadow-lg hover:shadow-purple-500/25"
          >
            🔄 Return to Lobby
          </button>
        )}
        <button
          onClick={isHost ? handleDelete : handleLeave}
          className="rounded-xl border border-white/10 px-6 py-3 font-semibold text-slate-300 transition-all hover:bg-white/5 hover:text-white"
        >
          {isHost ? '🗑️ Delete Room' : '🚪 Leave Room'}
        </button>
      </div>
    </div>
  );
}
