'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRoom, ACTIVE_ROOM_KEY } from '@/hooks/useRoom';
import { useWakeLock } from '@/hooks/useWakeLock';
import { serverNow } from '@/lib/serverClock';
import { gameStorage } from '@/services/database/firebaseAdapter';
import type { Player } from '@/types/player';
import QRCodeDisplay from '@/components/core/QRCodeDisplay';
import type { GameModuleProps } from '@/lib/gameRegistry';
import RoleReveal from './RoleReveal';
import RoleCard from './RoleCard';
import RolePreviewPopup from './RolePreviewPopup';
import RoomSettings from './RoomSettings';
import RoleGuide from './RoleGuide';
import PlayerPanel from './PlayerPanel';
import AvalonPreview from './AvalonPreview';
import LobbyRoundTable from './LobbyRoundTable';
import { useAvalon, defaultAvalonConfig } from './useAvalon';
import { AvalonRole, type AvalonGameData, type AvalonGameState, PHASE_TIMEOUTS_MS } from './types';
import { PLAYER_COUNTS } from './constants';
import './avalon.css';

// How long non-host clients wait before stepping in to advance a phase the host
// has not advanced (host offline / asleep).
const TAKEOVER_MS = 2500;

// Time left in the current phase, on the shared server clock.
function remainingMs(state: AvalonGameState): number {
  return PHASE_TIMEOUTS_MS[state.phase] - (serverNow() - (state.phaseStartedAt ?? serverNow()));
}

// True once every player still in the room has an entry (ack / vote).
function everyoneIn(players: Player[], record: Record<string, unknown> | undefined): boolean {
  return players.length > 0 && players.every((p) => !!record?.[p.id]);
}

export default function AvalonBoard({ room, players, playerId, isHost }: GameModuleProps) {
  const router = useRouter();
  const { leaveRoom, deleteRoom, resetRoom, updateConfig } = useRoom(room.id, playerId);

  const {
    state,
    gamePlayers,
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
    teamBuildTimeoutAdvance,
    castTeamVote,
    resolveTeamVote,
    proceedAfterTeamVoteResult,
    playQuestCard,
    resolveQuest,
    proceedAfterQuestResult,
    proceedAfterDiscussion,
    ackDiscussion,
    ladyInspect,
    ladyConfirm,
    ladyShow,
    ladyFinish,
    ladyTimeoutAdvance,
    setAssassinChoice,
    assassinate,
    assassinTimeoutAdvance,
  } = useAvalon(room.id, room, players);

  const [localRoleSeen, setLocalRoleSeen] = useState(false);
  const [showMyRoleCard, setShowMyRoleCard] = useState(false);
  const [showRolePreview, setShowRolePreview] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showRoleGuide, setShowRoleGuide] = useState(false);
  const [offline, setOffline] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const inGame = room.status !== 'lobby' && room.status !== 'end';
  // A sleeping phone stops its timers and drops its connection, which stalls the table.
  useWakeLock(inGame);

  // Show the "offline" banner only once the connection has been down for a moment,
  // so the brief cache-then-server flicker on load doesn't trigger it.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsub = gameStorage.subscribeToConnection(room.id, (online) => {
      clearTimeout(timer);
      if (online) setOffline(false);
      else timer = setTimeout(() => setOffline(true), 3000);
    });
    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, [room.id]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  // Wraps a player action: if it cannot be sent (offline), say so instead of failing silently.
  const act =
    <A extends unknown[]>(fn: (...args: A) => unknown) =>
    (...args: A) => {
      Promise.resolve(fn(...args)).catch(() =>
        setNotice('Không gửi được — kiểm tra kết nối mạng rồi thử lại.')
      );
    };

  useEffect(() => {
    if (room.status !== 'night' || state?.phase !== 'role-reveal') {
      setLocalRoleSeen(false);
    }
  }, [room.status, state?.phase]);

  const myPlayer = players.find((p) => p.id === playerId);
  const myRole = (myPlayer?.gameData as Partial<AvalonGameData> | undefined)?.role;
  const myAcked = !!(state?.roleAcks && state.roleAcks[playerId]);

  // ── Auto-progression ────────────────────────────────────────────────
  // EVERY client runs these timers. Each phase change is a compare-and-set on
  // the room (see useAvalon.advance), so only one attempt can win and a stale or
  // duplicate one is dropped. The host fires first; everyone else waits
  // TAKEOVER_MS, so the game keeps moving when the host is offline or asleep
  // without all ten clients writing at once.
  const arm = useCallback(
    (delayMs: number, advance: () => Promise<unknown>) => {
      const t = setTimeout(
        () => {
          advance().catch(() => {}); // offline: another client will pick it up
        },
        Math.max(0, delayMs) + (isHost ? 0 : TAKEOVER_MS)
      );
      return () => clearTimeout(t);
    },
    [isHost]
  );

  // lineup-preview → role-reveal (all acked or timeout)
  useEffect(() => {
    if (!state || state.phase !== 'lineup-preview') return;
    const done = everyoneIn(gamePlayers, state.roleAcks);
    return arm(done ? 0 : remainingMs(state) + 250, proceedToRoleReveal);
  }, [state, gamePlayers, arm, proceedToRoleReveal]);

  // role-reveal → night-evils (all acked or timeout)
  useEffect(() => {
    if (!state || room.status !== 'night' || state.phase !== 'role-reveal') return;
    const done = everyoneIn(gamePlayers, state.roleAcks);
    return arm(done ? 0 : remainingMs(state) + 250, proceedToNightEvils);
  }, [state, room.status, gamePlayers, arm, proceedToNightEvils]);

  // night-evils → night-merlin (all evils acked or timeout)
  useEffect(() => {
    if (!state || state.phase !== 'night-evils') return;
    const evils = players.filter((p) => (p.gameData as Partial<AvalonGameData> | undefined)?.team === 'evil');
    const done = evils.length > 0 && evils.every((p) => state.roleAcks?.[p.id]);
    return arm(done ? 0 : remainingMs(state) + 250, proceedToNightMerlin);
  }, [state, players, arm, proceedToNightMerlin]);

  // night-merlin → night-percival (or straight to team-build if there is no Percival)
  useEffect(() => {
    if (!state || state.phase !== 'night-merlin') return;
    const merlins = players.filter((p) => (p.gameData as Partial<AvalonGameData> | undefined)?.role === AvalonRole.Merlin);
    const done = merlins.length > 0 && merlins.every((p) => state.roleAcks?.[p.id]);
    const hasPercival = (state.roleLineup ?? []).includes(AvalonRole.Percival);
    return arm(
      done ? 0 : remainingMs(state) + 250,
      () => (hasPercival ? proceedToNightPercival() : beginTeamBuild())
    );
  }, [state, players, arm, proceedToNightPercival, beginTeamBuild]);

  // night-percival → team-build
  useEffect(() => {
    if (!state || state.phase !== 'night-percival') return;
    const percivals = players.filter((p) => (p.gameData as Partial<AvalonGameData> | undefined)?.role === AvalonRole.Percival);
    const done = percivals.length > 0 && percivals.every((p) => state.roleAcks?.[p.id]);
    return arm(done ? 0 : remainingMs(state) + 250, beginTeamBuild);
  }, [state, players, arm, beginTeamBuild]);

  // team-build → vote (auto-submit) or rotate Leader after 60s if the Leader is idle.
  useEffect(() => {
    if (!state || state.phase !== 'team-build') return;
    return arm(remainingMs(state) + 250, teamBuildTimeoutAdvance);
  }, [state, arm, teamBuildTimeoutAdvance]);

  // team-vote → resolve (everyone voted or timeout; a missing vote counts as reject)
  useEffect(() => {
    if (!state || state.phase !== 'team-vote') return;
    const done = everyoneIn(gamePlayers, state.teamVotes);
    return arm(done ? 0 : remainingMs(state) + 250, resolveTeamVote);
  }, [state, gamePlayers, arm, resolveTeamVote]);

  // quest-play → resolve (team played all cards or timeout). Each player's own
  // questCard is the source of truth — not the shared questPlayedBy array, which
  // races when several players submit at once.
  useEffect(() => {
    if (!state || state.phase !== 'quest-play') return;
    const allCardsSynced =
      state.proposedTeam.length > 0 &&
      state.proposedTeam.every((id) => {
        const card = (players.find((p) => p.id === id)?.gameData as Partial<AvalonGameData> | undefined)?.questCard;
        return card === 'success' || card === 'fail';
      });
    return arm(allCardsSynced ? 0 : remainingMs(state) + 250, resolveQuest);
  }, [state, players, arm, resolveQuest]);

  // team-vote-result → next (short review pause)
  useEffect(() => {
    if (!state || state.phase !== 'team-vote-result') return;
    return arm(remainingMs(state) + 250, proceedAfterTeamVoteResult);
  }, [state, arm, proceedAfterTeamVoteResult]);

  // quest-result → next (short review pause)
  useEffect(() => {
    if (!state || state.phase !== 'quest-result') return;
    return arm(remainingMs(state) + 250, proceedAfterQuestResult);
  }, [state, arm, proceedAfterQuestResult]);

  // discussion → team-build (everyone ready or 10-min timeout)
  useEffect(() => {
    if (!state || state.phase !== 'discussion') return;
    const done = everyoneIn(gamePlayers, state.roleAcks);
    return arm(done ? 0 : remainingMs(state) + 250, proceedAfterDiscussion);
  }, [state, gamePlayers, arm, proceedAfterDiscussion]);

  // lady-of-lake → discussion if the holder is idle / disconnected
  useEffect(() => {
    if (!state || state.phase !== 'lady-of-lake') return;
    return arm(remainingMs(state) + 250, ladyTimeoutAdvance);
  }, [state, arm, ladyTimeoutAdvance]);

  // assassinate → end (Good wins if the Assassin is idle for 180s)
  useEffect(() => {
    if (!state || state.phase !== 'assassinate') return;
    return arm(remainingMs(state) + 250, assassinTimeoutAdvance);
  }, [state, arm, assassinTimeoutAdvance]);

  const handleLeave = useCallback(async () => {
    if (inGame) {
      // Leaving mid-game must NOT delete the player: their role lives on that
      // record and the rest of the table is counting on it. It works like closing
      // the tab — they can come back through the room link.
      if (confirm('Thoát khỏi ván? Bạn vẫn là người chơi — mở lại link phòng để vào lại.')) {
        localStorage.removeItem(ACTIVE_ROOM_KEY);
        router.push('/');
      }
      return;
    }
    if (confirm('Rời phòng?')) {
      await leaveRoom(playerId);
      router.push('/');
    }
  }, [inGame, leaveRoom, playerId, router]);

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
      // Offline: the ack is lost, but the phase also ends on its own timer.
      await ackRole(playerId).catch(() =>
        setNotice('Không gửi được xác nhận — kiểm tra kết nối mạng.')
      );
    }
  }, [ackRole, playerId]);

  const handleKickPlayer = useCallback(
    async (targetId: string, targetName: string) => {
      if (!confirm(`Kick "${targetName}" khỏi phòng?`)) return;
      try {
        await gameStorage.removePlayer(room.id, targetId);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Không thể kick người chơi';
        alert(msg);
      }
    },
    [room.id]
  );

  if (room.status === 'lobby') {
    const enoughPlayers = (PLAYER_COUNTS as readonly number[]).includes(playerCount);
    const optionalRolesCount =
      ((room.config.optionalRoles as unknown[] | undefined)?.length) ?? 0;
    return (
      <div className="avalon-root mx-auto max-w-5xl animate-fade-in pb-32">
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
              // Số ghế trên bàn = maxPlayers trong cài đặt phòng. Ghế chưa có
              // người sẽ hiện dạng dashed "+".
              reserveSeats={(room.config.maxPlayers as number | undefined) ?? 10}
              onKick={isHost ? handleKickPlayer : undefined}
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

  const banner =
    offline || notice ? (
      <div className="fixed inset-x-0 top-0 z-40 px-4 pt-2">
        <div
          className={`mx-auto max-w-md rounded-xl border px-4 py-2 text-center text-sm font-bold shadow-lg ${
            offline
              ? 'border-red-500/40 bg-red-950/90 text-red-200'
              : 'border-amber-500/40 bg-amber-950/90 text-amber-200'
          }`}
        >
          {offline ? '📡 Mất kết nối — đang thử kết nối lại. Thao tác của bạn chưa được gửi.' : notice}
        </div>
      </div>
    ) : null;

  if (!state) {
    return (
      <div className="avalon-root flex min-h-dvh items-center justify-center text-slate-400">
        <div className="text-center">
          <div className="text-4xl mb-2 animate-pulse">⏳</div>
          <p className="text-sm">Đang tải trạng thái ván...</p>
        </div>
      </div>
    );
  }

  if (!myPlayer || !myRole) {
    return (
      <div className="avalon-root flex min-h-dvh items-center justify-center text-slate-400 p-4">
        <div className="text-center">
          <div className="text-4xl mb-2 animate-pulse">⏳</div>
          <p className="text-sm">Đang chia bài...</p>
        </div>
      </div>
    );
  }

  if (!isSupportedCount && state.phase !== 'end') {
    return (
      <div className="avalon-root flex min-h-dvh items-center justify-center text-slate-400 p-4 text-center">
        <div>
          <div className="text-4xl mb-2">⚠️</div>
          <p className="text-sm">Số người chơi không hợp lệ ({playerCount}). Avalon cần 5–10 người.</p>
          <button
            onClick={isHost ? handleDelete : handleLeave}
            className="mt-4 rounded-lg border border-white/10 bg-slate-900/80 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-red-500/10 hover:text-red-400"
          >
            {isHost ? '🗑️ Xoá phòng' : '🚪 Rời'}
          </button>
        </div>
      </div>
    );
  }

  if (state.phase === 'role-reveal' && !localRoleSeen && !myAcked) {
    return (
      <div className="avalon-root">
        {banner}
        <RoleReveal
          myRole={myRole}
          myPlayerId={playerId}
          players={players}
          onDone={handleRoleRevealDone}
        />
      </div>
    );
  }

  return (
    <div className="avalon-root">
      {banner}
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
        players={gamePlayers}
        playerCount={playerCount}
        onProposedTeamChange={act(setProposedTeam)}
        onSubmitTeam={act(submitTeam)}
        onCastVote={act((v) => castTeamVote(playerId, v))}
        onPlayQuestCard={act((c) => playQuestCard(playerId, c))}
        onLadyInspect={act(ladyInspect)}
        onLadyConfirm={act(ladyConfirm)}
        onLadyShow={ladyShow}
        onLadyFinish={act(ladyFinish)}
        onAssassinate={act(assassinate)}
        onSetAssassinChoice={act(setAssassinChoice)}
        onShowMyRole={() => setShowMyRoleCard(true)}
        onShowRolePreview={() => setShowRolePreview(true)}
        onAckRole={act(() => ackRole(playerId))}
        onAckDiscussion={act(() => ackDiscussion(playerId))}
        onPlayAgain={handleNewGame}
        onLeaveRoom={isHost ? handleDelete : handleLeave}
        isHost={isHost}
      />
      {showMyRoleCard && (
        <RoleCard role={myRole} onClose={() => setShowMyRoleCard(false)} />
      )}
      {showRolePreview && state && myPlayer && (
        <RolePreviewPopup
          state={state}
          myPlayer={myPlayer}
          players={gamePlayers}
          onClose={() => setShowRolePreview(false)}
        />
      )}
    </div>
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
