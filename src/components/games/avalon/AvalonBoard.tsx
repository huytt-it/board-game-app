'use client';

import { useCallback, useEffect, useId, useState } from 'react';
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
import AvIcon, { type IconName } from './assets/AvIcon';
import { avalonDisplayFont } from './assets/fonts';
import SceneBackdrop from './scenes/SceneBackdrop';
import SceneTitle from './scenes/SceneTitle';
import { getScene } from './scenes/getScene';
import { journeyKey } from './scenes/journey';
import type { SceneResult } from './scenes/types';
import GlassPanel from './ui/GlassPanel';
import DealingCards from './ui/DealingCards';
import LobbyNotices from './ui/LobbyNotices';
import { useRosterNotices } from './hooks/useRosterChanges';
import { useConfirm } from './hooks/useConfirm';
import { useDialog } from './hooks/useDialog';
import './avalon.css';

// Class for every Avalon root element: scopes avalon.css (tokens, reduced
// motion) and provides the --av-font-display variable.
const AVALON_ROOT = `avalon-root ${avalonDisplayFont.variable}`;

// Lobby and the waiting screens play in the great hall.
const HALL: SceneResult = { id: 'hall', storm: false, location: null, gloom: 0 };

// Every branch below returns the backdrop (and the scene title) at the same
// position, so they stay mounted — the backdrop crossfades, the title notices
// the change — when the screen switches from lobby to game. `game` is passed
// once there is a game state: the title needs its phaseStartedAt and seed.
function withScene(scene: SceneResult, body: React.ReactNode, game?: { state: AvalonGameState; roomId: string }) {
  return (
    <>
      <SceneBackdrop sceneId={scene.id} storm={scene.storm} gloom={scene.gloom} />
      <SceneTitle
        scene={scene}
        startedAt={game?.state.phaseStartedAt ?? null}
        quest={game?.state.currentQuest ?? 0}
        seedKey={game ? journeyKey(game.state, game.roomId) : ''}
      />
      {body}
    </>
  );
}

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
  // "Are you sure?" in the Avalon look, instead of the browser's confirm().
  const { ask, dialog: confirmDialog } = useConfirm();

  const inGame = room.status !== 'lobby' && room.status !== 'end';
  // "<Tên> đã vào phòng / đã rời phòng" in the lobby (compared on this client).
  const rosterNotices = useRosterNotices(players, room.status === 'lobby');
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
      if (await ask({ title: 'Thoát khỏi ván?', message: 'Bạn vẫn là người chơi — mở lại link phòng để vào lại.', confirmLabel: 'Thoát', icon: 'leave' })) {
        localStorage.removeItem(ACTIVE_ROOM_KEY);
        router.push('/');
      }
      return;
    }
    if (await ask({ title: 'Rời phòng?', confirmLabel: 'Rời phòng', icon: 'leave' })) {
      await leaveRoom(playerId);
      router.push('/');
    }
  }, [inGame, ask, leaveRoom, playerId, router]);

  const handleDelete = useCallback(async () => {
    if (await ask({ title: 'Xoá phòng?', message: 'Thao tác không thể hoàn tác.', confirmLabel: 'Xoá phòng', icon: 'delete' })) {
      await deleteRoom();
      router.push('/');
    }
  }, [ask, deleteRoom, router]);

  const handleStartGame = useCallback(async () => {
    try {
      await assignRoles();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể bắt đầu ván';
      setNotice(msg);
    }
  }, [assignRoles]);

  const handleNewGame = useCallback(async () => {
    if (!(await ask({ title: 'Bắt đầu ván mới?', message: 'Toàn bộ vai và lịch sử sẽ bị xoá.', confirmLabel: 'Ván mới', tone: 'gold', icon: 'new-game' }))) return;
    await gameStorage.clearGameData(room.id);
    await resetRoom();
  }, [ask, room.id, resetRoom]);

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
      if (!(await ask({ title: `Mời ${targetName} ra khỏi phòng?`, confirmLabel: 'Mời ra', icon: 'close' }))) return;
      try {
        await gameStorage.removePlayer(room.id, targetId);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Không thể kick người chơi';
        setNotice(msg);
      }
    },
    [ask, room.id]
  );

  // Errors of the player's own actions ("cannot start", "cannot kick"…) and the
  // lost-connection warning, in the room's look instead of the browser's alert().
  // `role="alert"` / `status`: a screen reader says it when it appears.
  const banner =
    offline || notice ? (
      <div className="fixed inset-x-0 top-0 z-40 px-4 pt-2" role={offline ? 'status' : 'alert'} data-banner="">
        <div
          className={`mx-auto max-w-md rounded-xl border px-4 py-2 text-center text-sm font-bold shadow-lg ${
            offline
              ? 'border-orange-500/40 bg-orange-950/90 text-orange-200'
              : 'border-amber-500/40 bg-amber-950/90 text-amber-200'
          }`}
        >
          {offline ? (
            <>
              <AvIcon name="offline" /> Mất kết nối — đang thử kết nối lại. Thao tác của bạn chưa được gửi.
            </>
          ) : (
            notice
          )}
        </div>
      </div>
    ) : null;

  if (room.status === 'lobby') {
    const enoughPlayers = (PLAYER_COUNTS as readonly number[]).includes(playerCount);
    const optionalRolesCount =
      ((room.config.optionalRoles as unknown[] | undefined)?.length) ?? 0;
    return withScene(
      HALL,
      <div className={`${AVALON_ROOT} mx-auto max-w-5xl animate-fade-in px-4 pt-6 pb-32 sm:px-6 lg:px-8`}>
        {showPreview && <AvalonPreview onClose={() => setShowPreview(false)} />}
        <LobbyNotices notices={rosterNotices} players={players} />
        {banner}
        {confirmDialog}

        <Modal open={showSettings} onClose={() => setShowSettings(false)} icon="settings" title="Cài đặt Avalon">
          <RoomSettings
            config={room.config}
            onUpdateConfig={updateConfig}
            playerCount={playerCount}
          />
        </Modal>

        <Modal open={showRoleGuide} onClose={() => setShowRoleGuide(false)} icon="guide" title="Hướng dẫn các vai trò">
          <RoleGuide />
        </Modal>

        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <h1 className="av-display flex items-center gap-2 text-2xl md:text-3xl text-white mr-auto">
            <AvIcon name="avalon" className="text-(--av-gold)" /> The Resistance: Avalon
          </h1>
          <button
            onClick={() => setShowRoleGuide(true)}
            className="min-h-11 rounded-lg border border-(--av-parchment)/25 bg-(--av-parchment)/10 px-3 py-1.5 text-sm font-bold text-(--av-parchment) hover:bg-(--av-parchment)/20"
          >
            <AvIcon name="guide" /> Vai trò
          </button>
          {isHost && (
            <button
              onClick={() => setShowSettings(true)}
              className="min-h-11 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-sm font-bold text-amber-300 hover:bg-amber-500/20"
            >
              <AvIcon name="settings" /> Cài đặt
              <span className="ml-1 rounded-full bg-amber-500/30 px-1.5 py-0.5 text-[10px]">
                {optionalRolesCount}
              </span>
            </button>
          )}
          <button
            onClick={() => setShowPreview(true)}
            className="min-h-11 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-sm font-bold text-purple-300 hover:bg-purple-500/20"
          >
            <AvIcon name="preview" /> Xem trước
          </button>
          <button
            onClick={isHost ? handleDelete : handleLeave}
            className="min-h-11 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-400 hover:bg-orange-500/10 hover:text-orange-300"
          >
            <AvIcon name={isHost ? 'delete' : 'leave'} /> {isHost ? 'Xoá' : 'Rời'}
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

          <GlassPanel className="p-4">
            <QRCodeDisplay
              roomId={room.id}
              roomCode={room.roomCode}
              gameType={room.gameType}
            />
          </GlassPanel>
        </div>

        {isHost && (
          <div className="fixed bottom-0 inset-x-0 z-30 px-4 pb-safe pt-3 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent">
            <button
              onClick={handleStartGame}
              disabled={!enoughPlayers}
              className="w-full max-w-5xl mx-auto block rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 px-6 py-4 text-lg font-bold text-white transition-all hover:from-amber-500 hover:to-yellow-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-amber-500/30"
            >
              {!enoughPlayers ? (
                `Cần 5–10 người chơi (đang có ${playerCount})`
              ) : (
                <>
                  <AvIcon name="avalon" /> Bắt đầu ván Avalon
                </>
              )}
            </button>
          </div>
        )}
      </div>
    );
  }

  if (!state) {
    return withScene(
      HALL,
      <div className={`${AVALON_ROOT} flex min-h-dvh items-center justify-center text-slate-300`}>
        <div className="text-center">
          <AvIcon name="waiting" size={36} className="mb-2 animate-pulse" />
          <p className="text-sm">Đang tải trạng thái ván...</p>
        </div>
      </div>
    );
  }

  if (!myPlayer || !myRole) {
    return withScene(
      HALL,
      <div className={`${AVALON_ROOT} flex min-h-dvh items-center justify-center p-4`}>
        <DealingCards />
      </div>
    );
  }

  if (!isSupportedCount && state.phase !== 'end') {
    return withScene(
      HALL,
      <div className={`${AVALON_ROOT} flex min-h-dvh items-center justify-center text-slate-300 p-4 text-center`}>
        <div>
          <AvIcon name="warning" size={36} className="mb-2 text-amber-300" />
          <p className="text-sm">Số người chơi không hợp lệ ({playerCount}). Avalon cần 5–10 người.</p>
          <button
            onClick={isHost ? handleDelete : handleLeave}
            className="mt-4 min-h-11 rounded-lg border border-white/10 bg-(color:--av-bar-bg) px-4 py-2 text-xs font-bold text-slate-300 hover:bg-orange-500/10 hover:text-orange-300"
          >
            <AvIcon name={isHost ? 'delete' : 'leave'} /> {isHost ? 'Xoá phòng' : 'Rời'}
          </button>
        </div>
        {confirmDialog}
      </div>
    );
  }

  // The scene every device shows for this moment of the game (hall, night,
  // the quest's location…): a pure function of the shared state.
  const scene = getScene(state, room.id, playerCount);
  const game = { state, roomId: room.id };

  if (state.phase === 'role-reveal' && !localRoleSeen && !myAcked) {
    return withScene(
      scene,
      <div className={AVALON_ROOT}>
        {banner}
        <RoleReveal
          myRole={myRole}
          myPlayerId={playerId}
          players={players}
          startedAt={state.phaseStartedAt}
          onDone={handleRoleRevealDone}
        />
        {confirmDialog}
      </div>,
      game
    );
  }

  return withScene(
    scene,
    <div className={AVALON_ROOT}>
      {banner}
      {/* The Delete / Leave button lives in PlayerPanel's top bar (onLeaveRoom). */}
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
        roomId={room.id}
        joinOrder={players.map((p) => p.id)}
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
      {confirmDialog}
    </div>,
    game
  );
}

function Modal({
  open,
  onClose,
  icon,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  icon?: IconName;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return <ModalBody onClose={onClose} icon={icon} title={title}>{children}</ModalBody>;
}

// The open modal: a labelled dialog that keeps the keyboard focus inside and
// closes on Escape (hooks/useDialog).
function ModalBody({
  onClose,
  icon,
  title,
  children,
}: {
  onClose: () => void;
  icon?: IconName;
  title: string;
  children: React.ReactNode;
}) {
  const dialog = useDialog<HTMLDivElement>(onClose);
  const titleId = useId();
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center animate-fade-in">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative w-full md:max-w-2xl max-h-[92vh] md:max-h-[85vh] flex flex-col rounded-t-3xl md:rounded-2xl border border-white/10 bg-slate-950 shadow-2xl overflow-hidden outline-none"
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-slate-900/60">
          <h2 id={titleId} className="av-display flex min-w-0 items-center gap-2 text-xl text-white">
            {icon && <AvIcon name={icon} className="text-(--av-gold)" />}
            <span className="truncate">{title}</span>
          </h2>
          <button
            onClick={onClose}
            className="ml-auto min-h-11 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-bold text-slate-300 hover:bg-white/10"
          >
            <AvIcon name="close" /> Đóng
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}

export { defaultAvalonConfig };

// The invite screen of an Avalon room (page.tsx loads it from this module, so
// it shares the board's chunk: the player who joins already has the board).
export { default as AvalonJoinScreen } from './AvalonJoinScreen';
