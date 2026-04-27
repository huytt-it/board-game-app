'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRoom } from '@/hooks/useRoom';
import { gameStorage } from '@/services/database/firebaseAdapter';
import QRCodeDisplay from '@/components/core/QRCodeDisplay';
import type { GameModuleProps } from '@/lib/gameRegistry';
import RoleReveal from './RoleReveal';
import RoleCard from './RoleCard';
import RoomSettings from './RoomSettings';
import RoleGuide from './RoleGuide';
import PlayerPanel from './PlayerPanel';
import AvalonPreview from './AvalonPreview';
import LobbyRoundTable from './LobbyRoundTable';
import { useAvalon, defaultAvalonConfig } from './useAvalon';
import { AvalonRole, type AvalonGameData, PHASE_TIMEOUTS_MS } from './types';
import { PLAYER_COUNTS } from './constants';

export default function AvalonBoard({ room, players, playerId, isHost }: GameModuleProps) {
  const router = useRouter();
  const { leaveRoom, deleteRoom, resetRoom, updateConfig } = useRoom(room.id, playerId);

  const {
    state,
    playerCount,
    isSupportedCount,
    assignRoles,
    proceedToRoleReveal,
    proceedToNightEvils,
    proceedToNightMerlin,
    proceedToNightPercival,
    beginTeamBuild,
    ackRole,
    setProposedTeam,
    submitTeam,
    castTeamVote,
    resolveTeamVote,
    proceedAfterTeamVoteResult,
    playQuestCard,
    resolveQuest,
    proceedAfterQuestResult,
    proceedAfterDiscussion,
    ackDiscussion,
    ladyInspect,
    ladyShow,
    ladyFinish,
    assassinate,
  } = useAvalon(room.id, room, players);

  const [localRoleSeen, setLocalRoleSeen] = useState(false);
  const [showMyRoleCard, setShowMyRoleCard] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showRoleGuide, setShowRoleGuide] = useState(false);

  useEffect(() => {
    if (room.status !== 'night' || state?.phase !== 'role-reveal') {
      setLocalRoleSeen(false);
    }
  }, [room.status, state?.phase]);

  const myPlayer = players.find((p) => p.id === playerId);
  const myRole = (myPlayer?.gameData as Partial<AvalonGameData> | undefined)?.role;
  const myAcked = !!(state?.roleAcks && state.roleAcks[playerId]);

  // Auto-progression: lineup-preview → role-reveal (when all acked or timeout)
  useEffect(() => {
    if (!state || state.phase !== 'lineup-preview') return;
    const ackCount = Object.keys(state.roleAcks ?? {}).length;
    const allAcked = ackCount >= playerCount && playerCount > 0;
    const elapsed = Date.now() - (state.phaseStartedAt ?? Date.now());
    const remaining = PHASE_TIMEOUTS_MS['lineup-preview'] - elapsed;
    if (allAcked || remaining <= 0) {
      proceedToRoleReveal();
      return;
    }
    const t = setTimeout(() => proceedToRoleReveal(), Math.max(500, remaining + 250));
    return () => clearTimeout(t);
  }, [state, playerCount, proceedToRoleReveal]);

  // Auto-progression: role-reveal → night-evils (when all acked or timeout)
  useEffect(() => {
    if (!state || room.status !== 'night' || state.phase !== 'role-reveal') return;
    const ackCount = Object.keys(state.roleAcks ?? {}).length;
    const allAcked = ackCount >= playerCount && playerCount > 0;
    const elapsed = Date.now() - (state.phaseStartedAt ?? Date.now());
    const remaining = PHASE_TIMEOUTS_MS['role-reveal'] - elapsed;
    if (allAcked || remaining <= 0) {
      proceedToNightEvils();
      return;
    }
    const t = setTimeout(() => proceedToNightEvils(), Math.max(500, remaining + 250));
    return () => clearTimeout(t);
  }, [state, room.status, playerCount, proceedToNightEvils]);

  // Auto-progression: night-evils → night-merlin (when all evils acked or timeout)
  useEffect(() => {
    if (!state || state.phase !== 'night-evils') return;
    const evilIds = players
      .filter((p) => (p.gameData as Partial<AvalonGameData> | undefined)?.team === 'evil')
      .map((p) => p.id);
    const ackedIds = Object.keys(state.roleAcks ?? {});
    const activeAckedCount = evilIds.filter((id) => ackedIds.includes(id)).length;
    const allActiveAcked = evilIds.length > 0 && activeAckedCount >= evilIds.length;
    const elapsed = Date.now() - (state.phaseStartedAt ?? Date.now());
    const remaining = PHASE_TIMEOUTS_MS['night-evils'] - elapsed;
    if (allActiveAcked || remaining <= 0) {
      proceedToNightMerlin();
      return;
    }
    const t = setTimeout(() => proceedToNightMerlin(), Math.max(500, remaining + 250));
    return () => clearTimeout(t);
  }, [state, players, proceedToNightMerlin]);

  // Auto-progression: night-merlin → night-percival (or skip to team-build if no Percival)
  useEffect(() => {
    if (!state || state.phase !== 'night-merlin') return;
    const merlinIds = players
      .filter((p) => (p.gameData as Partial<AvalonGameData> | undefined)?.role === AvalonRole.Merlin)
      .map((p) => p.id);
    const ackedIds = Object.keys(state.roleAcks ?? {});
    const activeAckedCount = merlinIds.filter((id) => ackedIds.includes(id)).length;
    const allActiveAcked = merlinIds.length > 0 && activeAckedCount >= merlinIds.length;
    const elapsed = Date.now() - (state.phaseStartedAt ?? Date.now());
    const remaining = PHASE_TIMEOUTS_MS['night-merlin'] - elapsed;
    const hasPercival = (state.roleLineup ?? []).includes(AvalonRole.Percival);
    const advance = () => (hasPercival ? proceedToNightPercival() : beginTeamBuild());
    if (allActiveAcked || remaining <= 0) {
      advance();
      return;
    }
    const t = setTimeout(() => advance(), Math.max(500, remaining + 250));
    return () => clearTimeout(t);
  }, [state, players, proceedToNightPercival, beginTeamBuild]);

  // Auto-progression: night-percival → team-build
  useEffect(() => {
    if (!state || state.phase !== 'night-percival') return;
    const percivalIds = players
      .filter((p) => (p.gameData as Partial<AvalonGameData> | undefined)?.role === AvalonRole.Percival)
      .map((p) => p.id);
    const ackedIds = Object.keys(state.roleAcks ?? {});
    const activeAckedCount = percivalIds.filter((id) => ackedIds.includes(id)).length;
    const allActiveAcked = percivalIds.length > 0 && activeAckedCount >= percivalIds.length;
    const elapsed = Date.now() - (state.phaseStartedAt ?? Date.now());
    const remaining = PHASE_TIMEOUTS_MS['night-percival'] - elapsed;
    if (allActiveAcked || remaining <= 0) {
      beginTeamBuild();
      return;
    }
    const t = setTimeout(() => beginTeamBuild(), Math.max(500, remaining + 250));
    return () => clearTimeout(t);
  }, [state, players, beginTeamBuild]);

  // Auto-progression: team-vote → resolve (when everyone voted or timeout)
  useEffect(() => {
    if (!state || state.phase !== 'team-vote') return;
    const votedCount = Object.keys(state.teamVotes ?? {}).length;
    const allVoted = votedCount >= playerCount && playerCount > 0;
    const elapsed = Date.now() - (state.phaseStartedAt ?? Date.now());
    const remaining = PHASE_TIMEOUTS_MS['team-vote'] - elapsed;
    if (allVoted || remaining <= 0) {
      resolveTeamVote();
      return;
    }
    const t = setTimeout(() => resolveTeamVote(), Math.max(500, remaining + 250));
    return () => clearTimeout(t);
  }, [state, playerCount, resolveTeamVote]);

  // Auto-progression: quest-play → resolve (when team played all or timeout)
  useEffect(() => {
    if (!state || state.phase !== 'quest-play') return;
    const teamSize = state.proposedTeam.length;
    const playedCount = state.questPlayedBy.length;
    const allPlayed = teamSize > 0 && playedCount >= teamSize;
    const allCardsSynced = state.proposedTeam.every((id) => {
      const p = players.find((pp) => pp.id === id);
      const card = (p?.gameData as Partial<AvalonGameData> | undefined)?.questCard;
      return card === 'success' || card === 'fail';
    });
    const elapsed = Date.now() - (state.phaseStartedAt ?? Date.now());
    const remaining = PHASE_TIMEOUTS_MS['quest-play'] - elapsed;
    if ((allPlayed && allCardsSynced) || remaining <= 0) {
      resolveQuest();
      return;
    }
    const t = setTimeout(() => resolveQuest(), Math.max(500, remaining + 250));
    return () => clearTimeout(t);
  }, [state, players, resolveQuest]);

  // Auto-progression: team-vote-result → next (after short review timeout)
  useEffect(() => {
    if (!state || state.phase !== 'team-vote-result') return;
    const elapsed = Date.now() - (state.phaseStartedAt ?? Date.now());
    const remaining = PHASE_TIMEOUTS_MS['team-vote-result'] - elapsed;
    if (remaining <= 0) {
      proceedAfterTeamVoteResult();
      return;
    }
    const t = setTimeout(() => proceedAfterTeamVoteResult(), Math.max(500, remaining + 250));
    return () => clearTimeout(t);
  }, [state, proceedAfterTeamVoteResult]);

  // Auto-progression: quest-result → next (after short review timeout)
  useEffect(() => {
    if (!state || state.phase !== 'quest-result') return;
    const elapsed = Date.now() - (state.phaseStartedAt ?? Date.now());
    const remaining = PHASE_TIMEOUTS_MS['quest-result'] - elapsed;
    if (remaining <= 0) {
      proceedAfterQuestResult();
      return;
    }
    const t = setTimeout(() => proceedAfterQuestResult(), Math.max(500, remaining + 250));
    return () => clearTimeout(t);
  }, [state, proceedAfterQuestResult]);

  // Auto-progression: discussion → team-build (all-ack or 10-min timeout)
  useEffect(() => {
    if (!state || state.phase !== 'discussion') return;
    const ackCount = Object.keys(state.roleAcks ?? {}).length;
    const allAcked = ackCount >= playerCount && playerCount > 0;
    const elapsed = Date.now() - (state.phaseStartedAt ?? Date.now());
    const remaining = PHASE_TIMEOUTS_MS['discussion'] - elapsed;
    if (allAcked || remaining <= 0) {
      proceedAfterDiscussion();
      return;
    }
    const t = setTimeout(() => proceedAfterDiscussion(), Math.max(500, remaining + 250));
    return () => clearTimeout(t);
  }, [state, playerCount, proceedAfterDiscussion]);

  const handleLeave = useCallback(async () => {
    if (confirm('Rời phòng?')) {
      await leaveRoom(playerId);
      router.push('/');
    }
  }, [leaveRoom, playerId, router]);

  const handleDelete = useCallback(async () => {
    if (confirm('Xoá phòng? Thao tác không thể hoàn tác.')) {
      await deleteRoom();
      router.push('/');
    }
  }, [deleteRoom, router]);

  const handleStartGame = useCallback(async () => {
    try {
      await assignRoles();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể bắt đầu ván';
      alert(msg);
    }
  }, [assignRoles]);

  const handleNewGame = useCallback(async () => {
    if (!confirm('Bắt đầu ván mới? Toàn bộ vai và lịch sử sẽ bị xoá.')) return;
    await gameStorage.clearGameData(room.id);
    await resetRoom();
  }, [room.id, resetRoom]);

  const handleRoleRevealDone = useCallback(async () => {
    setLocalRoleSeen(true);
    if (playerId) {
      await ackRole(playerId);
    }
  }, [ackRole, playerId]);

  if (room.status === 'lobby') {
    const enoughPlayers = (PLAYER_COUNTS as readonly number[]).includes(playerCount);
    const optionalRolesCount =
      ((room.config.optionalRoles as unknown[] | undefined)?.length) ?? 0;
    return (
      <div className="mx-auto max-w-5xl animate-fade-in pb-32">
        {showPreview && <AvalonPreview onClose={() => setShowPreview(false)} />}

        <Modal open={showSettings} onClose={() => setShowSettings(false)} title="⚙️ Cài đặt Avalon">
          <RoomSettings
            config={room.config}
            onUpdateConfig={updateConfig}
            playerCount={playerCount}
          />
        </Modal>

        <Modal open={showRoleGuide} onClose={() => setShowRoleGuide(false)} title="📖 Hướng dẫn các vai trò">
          <RoleGuide />
        </Modal>

        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <h1 className="text-xl md:text-2xl font-black text-white mr-auto">
            ⚔️ The Resistance: Avalon
          </h1>
          <button
            onClick={() => setShowRoleGuide(true)}
            className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-sm font-bold text-blue-300 hover:bg-blue-500/20"
          >
            📖 Vai trò
          </button>
          {isHost && (
            <button
              onClick={() => setShowSettings(true)}
              className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-sm font-bold text-amber-300 hover:bg-amber-500/20"
            >
              ⚙️ Cài đặt
              <span className="ml-1 rounded-full bg-amber-500/30 px-1.5 py-0.5 text-[10px]">
                {optionalRolesCount}
              </span>
            </button>
          )}
          <button
            onClick={() => setShowPreview(true)}
            className="rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-sm font-bold text-purple-300 hover:bg-purple-500/20"
          >
            👁️ Xem trước
          </button>
          <button
            onClick={isHost ? handleDelete : handleLeave}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400"
          >
            {isHost ? '🗑️ Xoá' : '🚪 Rời'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-4 items-start">
          <div className="flex flex-col items-center">
            <LobbyRoundTable
              players={players}
              myPlayerId={playerId}
              roomCode={room.roomCode}
              maxPlayers={(room.config.maxPlayers as number | undefined) ?? 10}
              minPlayers={5}
              reserveSeats={Math.max(playerCount, 5)}
            />
            {!enoughPlayers && (
              <p className="mt-3 text-xs text-amber-400 text-center font-bold">
                Cần 5–10 người để bắt đầu ván.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-4">
            <QRCodeDisplay
              roomId={room.id}
              roomCode={room.roomCode}
              gameType={room.gameType}
            />
          </div>
        </div>

        {isHost && (
          <div className="fixed bottom-0 inset-x-0 z-30 px-4 pb-safe pt-3 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent">
            <button
              onClick={handleStartGame}
              disabled={!enoughPlayers}
              className="w-full max-w-5xl mx-auto block rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4 text-lg font-bold text-white transition-all hover:from-blue-500 hover:to-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30"
            >
              {!enoughPlayers
                ? `Cần 5–10 người chơi (đang có ${playerCount})`
                : '⚔️ Bắt đầu ván Avalon'}
            </button>
          </div>
        )}
      </div>
    );
  }

  if (!state) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-slate-400">
        <div className="text-center">
          <div className="text-4xl mb-2 animate-pulse">⏳</div>
          <p className="text-sm">Đang tải trạng thái ván...</p>
        </div>
      </div>
    );
  }

  if (!myPlayer || !myRole) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-slate-400 p-4">
        <div className="text-center">
          <div className="text-4xl mb-2 animate-pulse">⏳</div>
          <p className="text-sm">Đang chia bài...</p>
        </div>
      </div>
    );
  }

  if (!isSupportedCount && state.phase !== 'end') {
    return (
      <div className="flex min-h-dvh items-center justify-center text-slate-400 p-4 text-center">
        <div>
          <div className="text-4xl mb-2">⚠️</div>
          <p className="text-sm">Số người chơi không hợp lệ ({playerCount}). Avalon cần 5–10 người.</p>
        </div>
      </div>
    );
  }

  if (state.phase === 'role-reveal' && !localRoleSeen && !myAcked) {
    return (
      <RoleReveal
        myRole={myRole}
        myPlayerId={playerId}
        players={players}
        onDone={handleRoleRevealDone}
      />
    );
  }

  return (
    <>
      <div className="absolute right-4 top-4 z-30 flex gap-2">
        <button
          onClick={isHost ? handleDelete : handleLeave}
          className="rounded-lg border border-white/10 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 text-xs font-bold text-slate-400 hover:bg-red-500/10 hover:text-red-400"
        >
          {isHost ? '🗑️ Xoá' : '🚪 Rời'}
        </button>
      </div>
      <PlayerPanel
        state={state}
        myPlayer={myPlayer}
        players={players}
        playerCount={playerCount}
        onProposedTeamChange={setProposedTeam}
        onSubmitTeam={submitTeam}
        onCastVote={(v) => castTeamVote(playerId, v)}
        onPlayQuestCard={(c) => playQuestCard(playerId, c)}
        onLadyInspect={ladyInspect}
        onLadyShow={ladyShow}
        onLadyFinish={ladyFinish}
        onAssassinate={assassinate}
        onShowMyRole={() => setShowMyRoleCard(true)}
        onAckRole={() => ackRole(playerId)}
        onAckDiscussion={() => ackDiscussion(playerId)}
        onPlayAgain={handleNewGame}
        onLeaveRoom={isHost ? handleDelete : handleLeave}
        isHost={isHost}
      />
      {showMyRoleCard && (
        <RoleCard role={myRole} onClose={() => setShowMyRoleCard(false)} />
      )}
    </>
  );
}

function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center animate-fade-in">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full md:max-w-2xl max-h-[92vh] md:max-h-[85vh] flex flex-col rounded-t-3xl md:rounded-2xl border border-white/10 bg-slate-950 shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-slate-900/60">
          <h2 className="text-base font-black text-white truncate">{title}</h2>
          <button
            onClick={onClose}
            className="ml-auto rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-bold text-slate-300 hover:bg-white/10"
          >
            ✕ Đóng
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}

export { defaultAvalonConfig };
