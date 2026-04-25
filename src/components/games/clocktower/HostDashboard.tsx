'use client';

import { useState } from 'react';
import { useNightActions } from '@/hooks/useNightActions';
import { useVoting } from '@/hooks/games/useVoting';
import { useGameHistory } from '@/hooks/useGameHistory';
import { gameStorage } from '@/services/database/firebaseAdapter';
import type { Player } from '@/types/player';
import type { GameAction } from '@/types/actions';
import type { RoomGameState } from '@/types/room';
import { ROLE_ICONS, ROLE_TEAMS, ClocktowerRole } from '@/types/games/clocktower';
import VotingPanel from './VotingPanel';
import NightTimelinePanel from './NightTimelinePanel';
import GameHistoryPanel from './GameHistoryPanel';

interface HostDashboardProps {
  roomId: string;
  hostId: string;
  players: Player[];
  onChangePhase: (phase: 'day' | 'night') => void;
  currentPhase: string;
  gameState?: RoomGameState;
  onEndGame?: (winner: 'good' | 'evil') => void;
}

export default function HostDashboard({
  roomId,
  hostId,
  players,
  onChangePhase,
  currentPhase,
  gameState,
  onEndGame,
}: HostDashboardProps) {
  const { pendingActions, resolvedActions, resolveAction, sendPrivateMessage, clearAllActions } = useNightActions(roomId, hostId);
  const [resolveMessages, setResolveMessages] = useState<Record<string, string>>({});
  const [directMessage, setDirectMessage] = useState('');
  const [directTarget, setDirectTarget] = useState('');
  const [activeTab, setActiveTab] = useState<'night' | 'history'>('night');

  const { events: historyEvents, addEvent } = useGameHistory(roomId);

  const dayCount = gameState?.dayCount ?? 0;
  const phase: 'night' | 'day' = (currentPhase === 'night') ? 'night' : 'day';

  const alivePlayers = players.filter((p) => !p.isHost && p.isAlive).length;
  const { nominations, votingTarget, votingTargetName, votes, hasVoted, voteCount, nominatePlayer, castVote, resolveVote, cancelVote } =
    useVoting(roomId, hostId, gameState, alivePlayers);

  const handleVoteResolve = async () => {
    if (!votingTarget || !votingTargetName) return;
    const targetPlayer = players.find((p) => p.id === votingTarget);
    const executedRole = targetPlayer?.gameData?.role as string | undefined;
    await resolveVote(executedRole);
    // Write execution to history
    await addEvent({
      type: 'execution',
      dayCount,
      phase: 'day',
      emoji: '⚖️',
      title: `${votingTargetName} bị đưa lên giá treo`,
      detail: `${voteCount} phiếu đồng ý`,
      targetName: votingTargetName,
    });
  };

  const toggleAlive = async (playerId: string, currentAlive: boolean) => {
    const player = players.find((p) => p.id === playerId);
    const role = player?.gameData?.role as ClocktowerRole | undefined;

    // ScarletWoman warning: if Imp is killed and 5+ players alive
    if (currentAlive && role === ClocktowerRole.Imp) {
      const aliveCount = players.filter((p) => !p.isHost && p.isAlive).length;
      const scarletWoman = players.find(
        (p) => !p.isHost && p.isAlive && p.gameData?.role === ClocktowerRole.ScarletWoman
      );
      if (scarletWoman && aliveCount >= 5) {
        alert(
          `⚠️ SCARLET WOMAN!\n${scarletWoman.name} là Scarlet Woman và có ${aliveCount} người còn sống.\nScarlet Woman sẽ trở thành Imp mới! Cập nhật vai trò của họ trong Grimoire.`
        );
      }
    }

    await gameStorage.updatePlayerAlive(roomId, playerId, !currentAlive);
    if (currentAlive) {
      await addEvent({
        type: 'night_death',
        dayCount,
        phase,
        emoji: '💀',
        title: `${player?.name || playerId} đã chết`,
        detail: 'Bị loại khỏi ván đấu bởi Quản trò',
        targetName: player?.name,
        targetRole: role ? String(role) : undefined,
      });
    }
  };

  const handleResolve = async (action: GameAction) => {
    const msg = resolveMessages[action.id] || 'No information.';
    await resolveAction(action.id, msg);
    await sendPrivateMessage(action.playerId, msg);
    setResolveMessages((prev) => { const copy = { ...prev }; delete copy[action.id]; return copy; });

    // Auto-update isPoisoned when Poisoner resolves
    const actorForResolve = players.find((p) => p.id === action.playerId);
    if (actorForResolve?.gameData?.role === ClocktowerRole.Poisoner && action.targetId) {
      // Clear previous victim first
      const previousVictim = players.find((p) => p.gameData?.isPoisoned === true && p.id !== action.targetId);
      if (previousVictim) {
        await gameStorage.updatePlayerGameData(roomId, previousVictim.id, { isPoisoned: false });
      }
      await gameStorage.updatePlayerGameData(roomId, action.targetId, { isPoisoned: true });
    }

    // Write to history
    const actor = players.find((p) => p.id === action.playerId);
    const actorRole = actor?.gameData?.role as ClocktowerRole | undefined;
    
    const roleStr = actorRole ? `(${actorRole})` : '';
    
    let actionTitle = `${action.playerName} ${roleStr} đã sử dụng kỹ năng`;
    if (action.targetName) {
      if (actorRole === ClocktowerRole.Monk) {
        actionTitle = `Người chơi ${action.targetName} đã được bảo vệ bởi ${action.playerName} ${roleStr}`;
      } else {
        actionTitle = `${action.playerName} ${roleStr} đã sử dụng kỹ năng lên người chơi ${action.targetName}`;
      }
    }

    const detailMsg = msg !== 'No information.'
      ? `Quản trò đã đưa thông tin cho ${action.playerName} ${roleStr}: "${msg}"`
      : undefined;

    await addEvent({
      type: 'night_action',
      dayCount,
      phase: 'night',
      emoji: '🎯',
      title: actionTitle,
      detail: detailMsg,
      actorName: action.playerName,
      actorRole: actorRole ? String(actorRole) : undefined,
      targetName: action.targetName,
    });
  };

  const handleDirectMessage = async () => {
    if (!directTarget || !directMessage.trim()) return;
    await sendPrivateMessage(directTarget, directMessage.trim());
    setDirectMessage('');
    setDirectTarget('');
  };

  const handleNewNight = async () => {
    await addEvent({
      type: 'phase_change',
      dayCount: dayCount + 1,
      phase: 'night',
      emoji: '🌙',
      title: `Bắt đầu Đêm ${dayCount + 1}`,
    });
    await clearAllActions();
    onChangePhase('night');
  };

  return (
    <div className="space-y-6">
      {/* Phase Controls */}
      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Phase Control</h3>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => onChangePhase('day')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              currentPhase === 'day'
                ? 'bg-amber-500 text-black'
                : 'bg-white/5 text-slate-300 hover:bg-amber-500/20 hover:text-amber-300'
            }`}
            id="phase-day-btn"
          >
            ☀️ Day
          </button>
          <button
            onClick={handleNewNight}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              currentPhase === 'night'
                ? 'bg-indigo-500 text-white'
                : 'bg-white/5 text-slate-300 hover:bg-indigo-500/20 hover:text-indigo-300'
            }`}
            id="phase-night-btn"
          >
            🌙 Night
          </button>
        </div>
      </div>

      {/* Voting Section (Day Phase) */}
      {(currentPhase === 'day' || currentPhase === 'voting') && (
        <div className="space-y-4">
          {/* Active voting */}
          {currentPhase === 'voting' && votingTarget && votingTargetName && (
            <VotingPanel
              targetName={votingTargetName}
              targetId={votingTarget}
              players={players}
              playerId={hostId}
              votes={votes}
              hasVoted={hasVoted}
              voteCount={voteCount}
              onVote={(v) => castVote(v)}
              onResolve={handleVoteResolve}
              onCancel={cancelVote}
              isHost={true}
              alivePlayers={alivePlayers}
            />
          )}

          {/* Pending Slayer Action */}
          {gameState?.pendingSlayerAction && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
              <h3 className="mb-2 text-sm font-semibold text-amber-400">⚔️ Slayer Action!</h3>
              <p className="mb-3 text-sm text-white">
                <span className="font-bold">{gameState.pendingSlayerAction.slayerName}</span> tuyên bố hạ{' '}
                <span className="font-bold text-amber-300">{gameState.pendingSlayerAction.targetName}</span>.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    const { targetId } = gameState.pendingSlayerAction!;
                    await gameStorage.updatePlayerAlive(roomId, targetId, false);
                    await gameStorage.updateRoomGameState(roomId, { pendingSlayerAction: null } as any);
                  }}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-red-500"
                >
                  💀 Trúng — Giết ngay
                </button>
                <button
                  onClick={() => gameStorage.updateRoomGameState(roomId, { pendingSlayerAction: null } as any)}
                  className="rounded-lg bg-slate-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-slate-500"
                >
                  ✗ Trật — Không ai chết
                </button>
              </div>
            </div>
          )}

          {/* Live Nominations (only during day, not during active voting) */}
          {currentPhase === 'day' && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-amber-400">
                ⚖️ Live Nominations
              </h3>
              <div className="space-y-2">
                {players
                  .filter((p) => !p.isHost && p.isAlive)
                  .sort((a, b) => {
                     const aCount = Object.values(nominations || {}).filter(id => id === a.id).length;
                     const bCount = Object.values(nominations || {}).filter(id => id === b.id).length;
                     return bCount - aCount;
                  })
                  .map((p) => {
                    const role = p.gameData?.role as ClocktowerRole | undefined;
                    const count = Object.values(nominations || {}).filter(id => id === p.id).length;
                    const percentage = alivePlayers > 0 ? Math.round((count / alivePlayers) * 100) : 0;
                    
                    if (count === 0) return null;

                    return (
                      <div key={p.id} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
                         <div className="flex-1">
                           <div className="flex items-center justify-between mb-1">
                             <div className="flex items-center gap-2 text-sm text-white font-medium">
                               {role && <span>{ROLE_ICONS[role]}</span>}
                               {p.name}
                             </div>
                             <span className="text-xs text-amber-400 font-bold">{count} votes ({percentage}%)</span>
                           </div>
                           <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                             <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${percentage}%` }} />
                           </div>
                         </div>
                         <button
                           onClick={() => {
                             if (role === ClocktowerRole.Virgin) {
                               alert(`⚠️ VIRGIN!\n${p.name} là Virgin. Nếu người đề cử đầu tiên là Townsfolk, họ sẽ bị xử tử ngay lập tức thay vì ${p.name}.`);
                             }
                             nominatePlayer(p.id, p.name);
                           }}
                           className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-amber-500 shadow-lg shadow-amber-500/20"
                         >
                           ⚖️ Trial
                         </button>
                      </div>
                    );
                  })}
                  
                  {Object.values(nominations || {}).length === 0 && (
                     <p className="text-sm text-slate-500 italic text-center py-4">No one has been nominated yet.</p>
                  )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Game History Panel */}
      <div className="rounded-xl border border-white/10 bg-white/5">
        <div className="flex border-b border-white/10">
          <button
            onClick={() => setActiveTab('night')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
              activeTab === 'night' ? 'text-purple-400 border-b-2 border-purple-500' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            🌙 {currentPhase === 'night' ? 'Night Actions' : 'Night Log'}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
              activeTab === 'history' ? 'text-amber-400 border-b-2 border-amber-500' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            📜 Game History ({historyEvents.filter(e => e.type !== 'phase_change').length})
          </button>
        </div>
        <div className="p-4">
          {activeTab === 'night' && currentPhase === 'night' && (
            <NightTimelinePanel
              players={players}
              pendingActions={pendingActions}
              resolvedActions={resolvedActions}
              dayCount={dayCount}
              gameState={gameState}
              resolveMessages={resolveMessages}
              onResolveMessageChange={(id, val) =>
                setResolveMessages((prev) => ({ ...prev, [id]: val }))
              }
              onResolve={handleResolve}
            />
          )}
          {activeTab === 'night' && currentPhase !== 'night' && (
            <p className="text-center text-sm text-slate-500 py-4">Không phải đêm. Chuyển sang ngày...</p>
          )}
          {activeTab === 'history' && (
            <GameHistoryPanel events={historyEvents} />
          )}
        </div>
      </div>

      {/* Direct Private Message */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
          📬 Send Private Message
        </h3>
        <div className="space-y-2">
          <select
            value={directTarget}
            onChange={(e) => setDirectTarget(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-purple-500"
            id="direct-message-target"
          >
            <option value="">Select player...</option>
            {players
              .filter((p) => p.id !== hostId)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {!p.isAlive ? '(Dead)' : ''}
                </option>
              ))}
          </select>
          <div className="flex gap-2">
            <input
              type="text"
              value={directMessage}
              onChange={(e) => setDirectMessage(e.target.value)}
              placeholder="Type a private message..."
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-purple-500"
              id="direct-message-input"
            />
            <button
              onClick={handleDirectMessage}
              disabled={!directTarget || !directMessage.trim()}
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-cyan-500 disabled:opacity-40"
              id="send-direct-message-btn"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Player Overview */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
          Players ({players.length})
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {players.map((p) => {
            const role = p.gameData?.role as ClocktowerRole | undefined;
            const isDrunk = p.gameData?.isDrunk === true;
            const drunkRole = p.gameData?.drunkRole as ClocktowerRole | undefined;
            return (
              <div
                key={p.id}
                className={`flex flex-col gap-1 rounded-lg px-3 py-2 text-sm ${
                  p.isAlive ? 'bg-white/5 text-white' : 'bg-red-500/5 text-slate-500'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full shrink-0 ${p.isAlive ? 'bg-green-500' : 'bg-red-500'}`} />
                  {role && <span>{ROLE_ICONS[role]}</span>}
                  <span className={!p.isAlive ? 'line-through' : ''}>{p.name}</span>
                  {p.isHost && <span className="ml-auto text-xs text-amber-400">Host</span>}
                </div>

                {!p.isHost && role && (
                  <div className="flex items-center gap-1 flex-wrap pl-4">
                    <span className="text-xs text-purple-400 font-medium">{String(role)}</span>
                    {isDrunk && drunkRole && (
                      <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                        🍺 nghĩ là {drunkRole}
                      </span>
                    )}
                    {p.gameData?.isPoisoned === true && (
                      <span className="rounded-full bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-bold text-purple-300">
                        ☠️ Poisoned
                      </span>
                    )}
                    {!p.isAlive && (
                      <span className="rounded-full bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-400">
                        💀 Dead
                      </span>
                    )}
                  </div>
                )}

                {!p.isHost && (
                  <button
                    onClick={() => toggleAlive(p.id, p.isAlive)}
                    className={`self-start ml-4 rounded-md px-2 py-0.5 text-xs font-bold transition-all ${
                      p.isAlive
                        ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                        : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                    }`}
                  >
                    {p.isAlive ? '💀 Kill' : '💖 Revive'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>



      {/* End Game Control */}
      {onEndGame && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
            End Game
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => { if (confirm('Are you sure the Good team has won?')) { onEndGame('good'); } }}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-3 font-bold text-white transition-all hover:from-cyan-500 hover:to-blue-500"
            >
              🌟 Good Wins
            </button>
            <button
              onClick={() => { if (confirm('Are you sure the Evil team has won?')) { onEndGame('evil'); } }}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 px-4 py-3 font-bold text-white transition-all hover:from-red-500 hover:to-orange-500"
            >
              👹 Evil Wins
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
