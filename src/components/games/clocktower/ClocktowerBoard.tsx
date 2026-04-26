'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useRoom } from '@/hooks/useRoom';
import { useVoting } from '@/hooks/games/useVoting';
import { gameStorage } from '@/services/database/firebaseAdapter';
import QRCodeDisplay from '@/components/core/QRCodeDisplay';
import RoleCard from './RoleCard';
import NightActionPanel from './NightActionPanel';
import HostDashboard from './HostDashboard';
import PlayerWaiting from './PlayerWaiting';
import GameStartAnimation from './GameStartAnimation';
import RoleRevealAnimation from './RoleRevealAnimation';
import VotingPanel from './VotingPanel';
import RoomSettingsPanel from './RoomSettingsPanel';
import PlayerRoleCard from './PlayerRoleCard';
import RoleHandbook from './RoleHandbook';
import type { GameModuleProps } from '@/lib/gameRegistry';
import {
  ROLE_ICONS, ROLE_NAMES_VI, ROLE_TEAM_VI, ROLE_TEAMS,
  ClocktowerRole, type ClocktowerTeam,
} from '@/types/games/clocktower';

type AnimationPhase = 'none' | 'countdown' | 'role-reveal';

// ─── Team visual config (board-level) ─────────────────────────────────
const TEAM_PAGE_BG: Record<ClocktowerTeam, React.CSSProperties> = {
  townsfolk: { backgroundImage: 'radial-gradient(ellipse at top, rgba(30,58,138,0.45) 0%, transparent 55%)' },
  outsider:  { backgroundImage: 'radial-gradient(ellipse at top, rgba(76,29,149,0.45) 0%, transparent 55%)'  },
  minion:    { backgroundImage: 'radial-gradient(ellipse at top, rgba(124,45,18,0.45) 0%, transparent 55%)'  },
  demon:     { backgroundImage: 'radial-gradient(ellipse at top, rgba(127,29,29,0.55) 0%, transparent 55%)'  },
};

const TEAM_STRIP_BG: Record<ClocktowerTeam, string> = {
  townsfolk: 'bg-blue-950/40 border-blue-500/20',
  outsider:  'bg-purple-950/40 border-purple-500/20',
  minion:    'bg-orange-950/40 border-orange-500/20',
  demon:     'bg-red-950/40 border-red-500/20',
};

const TEAM_BADGE: Record<ClocktowerTeam, string> = {
  townsfolk: 'bg-blue-500/20 text-blue-300',
  outsider:  'bg-purple-500/20 text-purple-300',
  minion:    'bg-orange-500/20 text-orange-300',
  demon:     'bg-red-500/20 text-red-300',
};

const TEAM_EMOJI: Record<ClocktowerTeam, string> = {
  townsfolk: '🌟',
  outsider:  '🌀',
  minion:    '🗡️',
  demon:     '👹',
};

export default function ClocktowerBoard({ room, players, playerId, isHost }: GameModuleProps) {
  const router = useRouter();
  const { updateStatus, updateGameState, updateConfig, startGame, leaveRoom, deleteRoom, resetRoom } = useRoom(room.id, playerId);
  const [animationPhase, setAnimationPhase] = useState<AnimationPhase>('none');
  const [roleRevealed, setRoleRevealed] = useState(false);

  const currentPlayer = players.find((p) => p.id === playerId);
  const playerRole = currentPlayer?.gameData?.role as ClocktowerRole | undefined;
  const isDrunk   = currentPlayer?.gameData?.isDrunk === true;
  const drunkRole = currentPlayer?.gameData?.drunkRole as ClocktowerRole | undefined;
  // Drunk players see their fake role everywhere in player-facing UI — no drunk indicator shown
  const displayRole = isDrunk && drunkRole ? drunkRole : playerRole;
  // Team is derived from displayRole so Drunk players appear as Townsfolk
  const displayTeam: ClocktowerTeam | null = displayRole ? ROLE_TEAMS[displayRole] : null;
  const dayCount = room.gameState?.dayCount ?? 0;

  const alivePlayers = players.filter((p) => !p.isHost && p.isAlive).length;
  const {
    nominations, votingTarget, votingTargetName,
    votes, hasVoted, voteCount,
    nominatePlayer, castNomination, castVote, resolveVote, cancelVote,
  } = useVoting(room.id, playerId, room.gameState, alivePlayers);

  // ─── Handbook / role info overlay ─────────────────────────────────
  const [showHandbook, setShowHandbook] = useState(false);
  const [showRoleInfo, setShowRoleInfo] = useState(false);

  // ─── Slayer state ──────────────────────────────────────────────────
  const [slayerPickMode, setSlayerPickMode] = useState(false);
  const isSlayer   = displayRole === ClocktowerRole.Slayer;
  const slayerUsed = currentPlayer?.gameData?.hasUsedAbility === true;

  const handleSlayerUse = useCallback(
    async (targetId: string, targetName: string) => {
      if (!playerId || !currentPlayer) return;
      await gameStorage.updatePlayerGameData(room.id, playerId, { hasUsedAbility: true });
      await updateGameState({ pendingSlayerAction: { slayerName: currentPlayer.name, targetId, targetName } } as any);
      setSlayerPickMode(false);
    },
    [playerId, currentPlayer, room.id, updateGameState]
  );

  // ─── Start game ────────────────────────────────────────────────────
  const handleStartGame = useCallback(async () => {
    try {
      await startGame();
      setAnimationPhase('countdown');
    } catch (err: any) {
      alert(err.message || 'Failed to start game');
    }
  }, [startGame]);

  const handleCountdownComplete = useCallback(() => {
    setAnimationPhase('none');
    updateStatus('night');
  }, [updateStatus]);

  const showRoleReveal = !isHost && room.status === 'night' && displayRole && !roleRevealed;

  // ─── Room actions ──────────────────────────────────────────────────
  const handleLeave = async () => {
    if (confirm('Bạn có chắc muốn rời phòng?')) {
      await leaveRoom(playerId);
      router.push('/');
    }
  };
  const handleDelete = async () => {
    if (confirm('Xoá phòng? Thao tác này không thể hoàn tác.')) {
      await deleteRoom();
      router.push('/');
    }
  };
  const handleReset = async () => {
    if (confirm('Bắt đầu ván mới?')) await resetRoom();
  };

  // ─── Animation overlays ────────────────────────────────────────────
  if (animationPhase === 'countdown') {
    return <GameStartAnimation onComplete={handleCountdownComplete} />;
  }
  if (showRoleReveal) {
    return <RoleRevealAnimation role={displayRole!} onDismiss={() => setRoleRevealed(true)} />;
  }

  // ─── Role info / handbook overlays (rendered on top of current view) ─
  // We render these as fragments that wrap the main content so they can
  // be dismissed without remounting the phase below.
  const overlays = (
    <>
      {showHandbook && (
        <RoleHandbook onClose={() => setShowHandbook(false)} highlightRole={displayRole} />
      )}
      {showRoleInfo && displayRole && (
        <PlayerRoleCard
          role={displayRole}
          onClose={() => setShowRoleInfo(false)}
        />
      )}
    </>
  );

  // ══════════════════════════════════════════════════════════════════
  // LOBBY
  // ══════════════════════════════════════════════════════════════════
  if (room.status === 'lobby') {
    return (
      <>
        {overlays}
        <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
        <div className="flex items-center gap-2 justify-end">
          {!isHost && (
            <button
              onClick={() => setShowHandbook(true)}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-bold text-slate-300 transition-all hover:bg-white/10 active:scale-95"
            >
              📖 Sách HD
            </button>
          )}
          <button
            onClick={isHost ? handleDelete : handleLeave}
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-400 transition-all hover:bg-red-500/10 hover:text-red-400"
          >
            {isHost ? '🗑️ Xoá phòng' : '🚪 Rời phòng'}
          </button>
        </div>

        <div className="text-center">
          <h1 className="mb-2 text-3xl font-black text-white">🏰 Blood on the Clocktower</h1>
          <p className="text-slate-400">Đang chờ người chơi tham gia...</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-6">
          <QRCodeDisplay roomId={room.id} roomCode={room.roomCode} gameType={room.gameType} />
        </div>

        {isHost && (
          <RoomSettingsPanel
            config={room.config}
            onUpdateConfig={updateConfig}
            playerCount={players.filter((p) => !p.isHost).length}
          />
        )}

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
            Người chơi ({players.filter((p) => !p.isHost).length}/{room.config.maxPlayers})
          </h3>
          <div className="space-y-2">
            {players.map((p, idx) => (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3 animate-slide-up"
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 text-sm font-bold text-white">
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium text-white">{p.name}</span>
                {p.isHost && (
                  <span className="ml-auto rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-medium text-amber-400">
                    Storyteller
                  </span>
                )}
                {p.id === playerId && !p.isHost && (
                  <span className="ml-auto text-xs text-slate-500">Bạn</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {isHost && (
          <button
            onClick={handleStartGame}
            disabled={players.filter((p) => !p.isHost).length < 1}
            className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 text-lg font-bold text-white transition-all hover:from-purple-500 hover:to-indigo-500 hover:shadow-lg hover:shadow-purple-500/25 disabled:opacity-40 disabled:cursor-not-allowed"
            id="start-game-btn"
          >
            {players.filter((p) => !p.isHost).length < 1
              ? 'Cần ít nhất 1 người chơi'
              : '🎭 Bắt đầu đêm đầu tiên'}
          </button>
        )}
      </div>
      </>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // GAME OVER
  // ══════════════════════════════════════════════════════════════════
  if (room.status === 'end') {
    const winner    = room.gameState?.winner;
    const isGoodWin = winner === 'good';
    return (
      <div className="mx-auto max-w-2xl space-y-6 animate-fade-in text-center">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-xl relative overflow-hidden">
          <div className={`absolute inset-0 bg-gradient-to-br opacity-20 ${isGoodWin ? 'from-cyan-500 to-blue-500' : 'from-red-500 to-orange-500'}`} />
          <div className="relative text-6xl mb-4">{isGoodWin ? '🌟' : '👹'}</div>
          <h1 className="relative mb-2 text-4xl font-black text-white">
            {isGoodWin ? 'Thiện thắng!' : 'Ác thắng!'}
          </h1>
          <p className="relative text-slate-300">
            {isGoodWin ? 'Dân làng đã tiêu diệt Quỷ.' : 'Quỷ đã thống trị làng.'}
          </p>
        </div>
        <div className="flex justify-center gap-4">
          {isHost ? (
            <button
              onClick={handleReset}
              className="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-8 py-4 font-bold text-white transition-all hover:from-purple-500 hover:to-indigo-500"
            >
              🔄 Ván mới
            </button>
          ) : (
            <button
              onClick={handleLeave}
              className="rounded-xl border border-white/10 bg-white/5 px-8 py-4 font-semibold text-white transition-all hover:bg-white/10"
            >
              🚪 Về sảnh chờ
            </button>
          )}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // HOST VIEW (Day / Night / Voting)
  // ══════════════════════════════════════════════════════════════════
  if (isHost) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black text-white">🏰 Storyteller Dashboard</h1>
          <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
            room.status === 'night'  ? 'bg-indigo-500/20 text-indigo-300'  :
            room.status === 'voting' ? 'bg-amber-500/20 text-amber-300'    :
            room.status === 'day'    ? 'bg-amber-500/20 text-amber-300'    :
            'bg-slate-500/20 text-slate-300'
          }`}>
            {room.status === 'voting' ? '⚖️ Voting' : room.status}
          </span>
          {dayCount > 0 && (
            <span className="text-xs text-slate-500">Ngày {dayCount}</span>
          )}
          <div className="ml-auto">
            <button
              onClick={handleDelete}
              className="rounded-lg border border-red-500/20 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500/10 transition-colors"
            >
              🗑️ Xoá phòng
            </button>
          </div>
        </div>
        <HostDashboard
          roomId={room.id}
          hostId={playerId}
          players={players}
          onChangePhase={(phase) => {
            const resetVoting = { nominations: {}, votingTarget: null, votingTargetName: null, votes: {} } as any;
            if (phase === 'day') {
              updateGameState({ dayCount: (room.gameState?.dayCount || 0) + 1, ...resetVoting });
            } else {
              updateGameState(resetVoting);
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

  // ══════════════════════════════════════════════════════════════════
  // PLAYER — NIGHT PHASE
  // Full-height layout: sticky top bar + scrollable action panel
  // ══════════════════════════════════════════════════════════════════
  if (room.status === 'night') {
    return (
      <>
        {overlays}
        <div
          className="flex flex-col min-h-dvh max-w-lg mx-auto animate-fade-in"
          style={displayTeam ? TEAM_PAGE_BG[displayTeam] : undefined}
        >
          {/* ── Sticky header (phase row + role strip) ────────────── */}
          <div className="sticky top-0 z-20 bg-slate-950/95 backdrop-blur-md border-b border-white/8">
            {/* Phase row */}
            <div className="flex items-center gap-2 px-4 py-2.5">
              <span className="text-base shrink-0">🌙</span>
              <span className="text-sm font-black text-indigo-300 shrink-0">Đêm {dayCount + 1}</span>
              <div className="flex-1" />
              <button
                onClick={() => setShowHandbook(true)}
                className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-bold text-slate-400 active:bg-white/10"
              >📖</button>
              {currentPlayer && (
                <div className={`shrink-0 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                  currentPlayer.isAlive ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${currentPlayer.isAlive ? 'bg-green-500 animate-breathe' : 'bg-red-500'}`} />
                  {currentPlayer.isAlive ? 'Sống' : 'Chết'}
                </div>
              )}
              <button onClick={handleLeave} className="shrink-0 rounded-lg border border-red-500/20 px-2.5 py-1.5 text-xs font-medium text-red-400 active:bg-red-500/10">
                Thoát
              </button>
            </div>
            {/* Role strip */}
            {displayRole && displayTeam && (
              <button
                onClick={() => setShowRoleInfo(true)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 border-t ${TEAM_STRIP_BG[displayTeam]} active:opacity-75 transition-opacity`}
              >
                <span className="text-2xl shrink-0">{ROLE_ICONS[displayRole]}</span>
                <div className="flex-1 min-w-0 text-left">
                  <span className="block text-sm font-black text-white leading-tight truncate">{displayRole}</span>
                  <span className="block text-[11px] text-slate-400 leading-none">{ROLE_NAMES_VI[displayRole]}</span>
                </div>
                <span className={`shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${TEAM_BADGE[displayTeam]}`}>
                  {TEAM_EMOJI[displayTeam]} Phe {ROLE_TEAM_VI[displayTeam]}
                </span>
                <span className="shrink-0 text-[10px] text-slate-600">ⓘ</span>
              </button>
            )}
          </div>

          {/* Night action fills remaining space */}
          <div className="flex-1 overflow-y-auto px-4 py-5 pb-safe">
            <NightActionPanel
              roomId={room.id}
              playerId={playerId}
              players={players}
              dayCount={dayCount}
            />
          </div>
        </div>
      </>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // PLAYER — VOTING PHASE
  // Full-height: header + VotingPanel (internal sticky buttons)
  // ══════════════════════════════════════════════════════════════════
  if (room.status === 'voting') {
    return (
      <>
        {overlays}
        <div
          className="flex flex-col min-h-dvh max-w-lg mx-auto animate-fade-in"
          style={displayTeam ? TEAM_PAGE_BG[displayTeam] : undefined}
        >
          {/* ── Sticky header ─────────────────────────────────────── */}
          <div className="sticky top-0 z-20 bg-slate-950/95 backdrop-blur-md border-b border-white/8">
            {/* Phase row */}
            <div className="flex items-center gap-2 px-4 py-2.5">
              <span className="shrink-0">⚖️</span>
              <span className="text-sm font-black text-amber-300 shrink-0">Phiên tòa</span>
              <div className="flex-1" />
              <button onClick={() => setShowHandbook(true)} className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-bold text-slate-400 active:bg-white/10">📖</button>
              {currentPlayer && (
                <div className={`shrink-0 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                  currentPlayer.isAlive ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${currentPlayer.isAlive ? 'bg-green-500 animate-breathe' : 'bg-red-500'}`} />
                  {currentPlayer.isAlive ? 'Sống' : 'Chết'}
                </div>
              )}
              <button onClick={handleLeave} className="shrink-0 rounded-lg border border-red-500/20 px-2.5 py-1.5 text-xs font-medium text-red-400 active:bg-red-500/10">Thoát</button>
            </div>
            {/* Role strip */}
            {displayRole && displayTeam && (
              <button
                onClick={() => setShowRoleInfo(true)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 border-t ${TEAM_STRIP_BG[displayTeam]} active:opacity-75 transition-opacity`}
              >
                <span className="text-2xl shrink-0">{ROLE_ICONS[displayRole]}</span>
                <div className="flex-1 min-w-0 text-left">
                  <span className="block text-sm font-black text-white leading-tight truncate">{displayRole}</span>
                  <span className="block text-[11px] text-slate-400 leading-none">{ROLE_NAMES_VI[displayRole]}</span>
                </div>
                <span className={`shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${TEAM_BADGE[displayTeam]}`}>
                  {TEAM_EMOJI[displayTeam]} Phe {ROLE_TEAM_VI[displayTeam]}
                </span>
                <span className="shrink-0 text-[10px] text-slate-600">ⓘ</span>
              </button>
            )}
          </div>

          {/* VotingPanel owns flex-1, scroll + sticky vote buttons */}
          {votingTarget && votingTargetName ? (
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
          ) : (
            <div className="flex-1 flex items-center justify-center px-4">
              <PlayerWaiting message="Đang chờ phiên tòa bắt đầu..." />
            </div>
          )}
        </div>
      </>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // PLAYER — DAY PHASE
  // Full-height: sticky top bar + scrollable content + nominations
  // ══════════════════════════════════════════════════════════════════
  if (room.status === 'day') {
    const myNominationId = nominations?.[playerId ?? ''];
    const nominatedPlayerName = myNominationId
      ? players.find((p) => p.id === myNominationId)?.name
      : null;

    return (
      <>
        {overlays}
        <div
          className="flex flex-col min-h-dvh max-w-lg mx-auto animate-fade-in"
          style={displayTeam ? TEAM_PAGE_BG[displayTeam] : undefined}
        >
          {/* ── Sticky header ─────────────────────────────────────── */}
          <div className="sticky top-0 z-20 bg-slate-950/95 backdrop-blur-md border-b border-white/8">
            {/* Phase row */}
            <div className="flex items-center gap-2 px-4 py-2.5">
              <span className="shrink-0">☀️</span>
              <span className="text-sm font-black text-amber-300 shrink-0">Ngày {dayCount || 1}</span>
              <div className="flex-1" />
              <button onClick={() => setShowHandbook(true)} className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-bold text-slate-400 active:bg-white/10">📖</button>
              {currentPlayer && (
                <div className={`shrink-0 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                  currentPlayer.isAlive ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${currentPlayer.isAlive ? 'bg-green-500 animate-breathe' : 'bg-red-500'}`} />
                  {currentPlayer.isAlive ? 'Sống' : 'Chết'}
                </div>
              )}
              <button onClick={handleLeave} className="shrink-0 rounded-lg border border-red-500/20 px-2.5 py-1.5 text-xs font-medium text-red-400 active:bg-red-500/10">Thoát</button>
            </div>
            {/* Role strip */}
            {displayRole && displayTeam && (
              <button
                onClick={() => setShowRoleInfo(true)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 border-t ${TEAM_STRIP_BG[displayTeam]} active:opacity-75 transition-opacity`}
              >
                <span className="text-2xl shrink-0">{ROLE_ICONS[displayRole]}</span>
                <div className="flex-1 min-w-0 text-left">
                  <span className="block text-sm font-black text-white leading-tight truncate">{displayRole}</span>
                  <span className="block text-[11px] text-slate-400 leading-none">{ROLE_NAMES_VI[displayRole]}</span>
                </div>
                <span className={`shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${TEAM_BADGE[displayTeam]}`}>
                  {TEAM_EMOJI[displayTeam]} Phe {ROLE_TEAM_VI[displayTeam]}
                </span>
                <span className="shrink-0 text-[10px] text-slate-600">ⓘ</span>
              </button>
            )}
            {/* Nomination summary bar */}
            {nominatedPlayerName && (
              <div className="flex items-center gap-2 border-t border-amber-500/20 bg-amber-500/8 px-4 py-2">
                <span className="text-xs text-amber-400 font-bold flex-1 min-w-0 truncate">
                  ⚖️ Đề cử: <span className="text-amber-200">{nominatedPlayerName}</span>
                </span>
                <button onClick={() => castNomination(null)} className="shrink-0 text-[10px] text-slate-500 active:text-red-400 underline">
                  Huỷ
                </button>
              </div>
            )}
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto pb-safe">

          {/* Dead notice — prominently at top */}
          {currentPlayer && !currentPlayer.isAlive && (
            <div className="mx-4 mt-4 rounded-2xl border border-red-500/20 bg-red-500/5 p-5 text-center animate-scale-in">
              <div className="text-4xl mb-2">💀</div>
              <h3 className="font-black text-red-400 mb-1">Bạn đã qua đời</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Không thể bỏ phiếu hay đề cử. Tiếp tục theo dõi từ cõi chết...
              </p>
            </div>
          )}

          {/* Slayer ability */}
          {isSlayer && currentPlayer?.isAlive && (
            <div className="mx-4 mt-4">
              {!slayerUsed ? (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">⚔️</span>
                    <h3 className="text-base font-black text-amber-400">Kỹ năng Slayer</h3>
                  </div>
                  <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                    Tuyên bố công khai bạn hạ 1 người chơi. Nếu họ là Quỷ — họ chết ngay!
                  </p>
                  {!slayerPickMode ? (
                    <button
                      onClick={() => setSlayerPickMode(true)}
                      className="w-full rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 py-4 text-base font-black text-white transition-all active:scale-95 hover:from-amber-500 hover:to-orange-500"
                    >
                      ⚔️ Sử dụng kỹ năng Slayer
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-amber-300 font-bold">Chọn mục tiêu:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {players
                          .filter((p) => !p.isHost && p.isAlive && p.id !== playerId)
                          .map((p) => (
                            <button
                              key={p.id}
                              onClick={() => handleSlayerUse(p.id, p.name)}
                              className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-3 text-sm font-semibold text-white transition-all active:scale-95 hover:bg-amber-500/15 hover:border-amber-500/40"
                            >
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-500 font-black">
                                {p.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="truncate">{p.name}</span>
                            </button>
                          ))}
                      </div>
                      <button
                        onClick={() => setSlayerPickMode(false)}
                        className="w-full text-xs text-slate-500 underline py-2"
                      >
                        Huỷ
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-white/8 bg-white/5 px-4 py-3 text-xs text-slate-500">
                  ⚔️ Kỹ năng Slayer đã được sử dụng trong ván này.
                </div>
              )}
            </div>
          )}

          {/* Town square */}
          <div className="px-4 pt-4 pb-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-300">
                ⚖️ Đề cử xử tử
              </h3>
              <span className="text-xs text-slate-600">{alivePlayers} người còn sống</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Nhấn vào người chơi để đề cử · Nhấn lại để huỷ
            </p>

            <div className="grid grid-cols-2 gap-3">
              {players
                .filter((p) => !p.isHost)
                .map((p) => {
                  const isNominatedByMe  = nominations?.[playerId ?? ''] === p.id;
                  const nominatedCount   = Object.values(nominations || {}).filter((id) => id === p.id).length;
                  const canNominate      =
                    room.status === 'day' &&
                    p.isAlive &&
                    p.id !== playerId &&
                    (currentPlayer?.isAlive ?? false);

                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        if (canNominate) castNomination(isNominatedByMe ? null : p.id);
                      }}
                      disabled={!canNominate && !isNominatedByMe}
                      className={`relative flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all active:scale-95 min-h-[100px] ${
                        !p.isAlive
                          ? 'border-red-500/10 bg-red-500/5 opacity-60 cursor-default'
                          : isNominatedByMe
                          ? 'border-amber-500/50 bg-amber-500/10 ring-1 ring-amber-500/40 shadow-lg shadow-amber-500/10'
                          : p.id === playerId
                          ? 'border-cyan-500/20 bg-cyan-500/5 cursor-default'
                          : !(currentPlayer?.isAlive)
                          ? 'border-white/8 bg-white/3 opacity-50 cursor-default'
                          : 'border-white/10 bg-white/5 hover:bg-white/8 hover:border-white/20'
                      }`}
                    >
                      {/* Nomination count badge */}
                      {nominatedCount > 0 && (
                        <div className="absolute -top-2.5 -right-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-xs font-black text-black shadow-lg shadow-amber-500/40">
                          {nominatedCount}
                        </div>
                      )}

                      {/* Avatar */}
                      <div className={`flex h-14 w-14 items-center justify-center rounded-full text-xl font-black text-white transition-all ${
                        !p.isAlive
                          ? 'bg-slate-800'
                          : isNominatedByMe
                          ? 'bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-amber-500/40'
                          : p.id === playerId
                          ? 'bg-gradient-to-br from-cyan-600 to-cyan-800'
                          : 'bg-gradient-to-br from-purple-500 to-cyan-500'
                      }`}>
                        {p.isAlive ? p.name.charAt(0).toUpperCase() : '💀'}
                      </div>

                      {/* Name */}
                      <span className={`text-sm font-bold leading-tight truncate w-full ${
                        !p.isAlive
                          ? 'text-slate-500 line-through'
                          : isNominatedByMe
                          ? 'text-amber-200'
                          : p.id === playerId
                          ? 'text-cyan-300'
                          : 'text-white'
                      }`}>
                        {p.name}
                      </span>

                      {/* Status labels */}
                      {!p.isAlive && <span className="text-[10px] text-red-400">💀 Đã chết</span>}
                      {isNominatedByMe && p.isAlive && (
                        <span className="text-[10px] text-amber-400 font-black">✓ Bạn đề cử</span>
                      )}
                      {p.id === playerId && p.isAlive && (
                        <span className="text-[10px] text-cyan-400 font-semibold">Bạn</span>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Nomination tally (shows when others have nominated) */}
          {Object.values(nominations || {}).filter(Boolean).length > 0 && (
            <div className="mx-4 mt-3 mb-4 rounded-2xl border border-white/8 bg-white/5 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                📊 Tình trạng đề cử
              </p>
              <div className="space-y-2">
                {players
                  .filter((p) => !p.isHost && p.isAlive)
                  .map((p) => {
                    const count = Object.values(nominations || {}).filter((id) => id === p.id).length;
                    if (count === 0) return null;
                    const pct = alivePlayers > 0 ? Math.round((count / alivePlayers) * 100) : 0;
                    return (
                      <div key={p.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-white">{p.name}</span>
                          <span className="text-amber-400 font-bold">{count} ({pct}%)</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-amber-500 transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>
      </>
    );
  }

  // ── Fallback ───────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center animate-scale-in">
      <div className="text-6xl animate-float">🎭</div>
      <h1 className="text-3xl font-black text-white">Game Over</h1>
      <div className="mt-8 flex gap-4">
        {isHost && (
          <button
            onClick={handleReset}
            className="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-3 font-semibold text-white transition-all hover:from-purple-500 hover:to-indigo-500"
          >
            🔄 Về sảnh
          </button>
        )}
        <button
          onClick={isHost ? handleDelete : handleLeave}
          className="rounded-xl border border-white/10 px-6 py-3 font-semibold text-slate-300 transition-all hover:bg-white/5"
        >
          {isHost ? '🗑️ Xoá phòng' : '🚪 Rời phòng'}
        </button>
      </div>
    </div>
  );
}
