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
import AvIcon from './assets/AvIcon';
import { avalonDisplayFont } from './assets/fonts';
import SceneBackdrop from './scenes/SceneBackdrop';
import { getScene } from './scenes/getScene';
import type { SceneResult } from './scenes/types';
import ActionDock from './ui/ActionDock';
import AvButton from './ui/AvButton';
import GlassPanel from './ui/GlassPanel';
import Modal from './ui/Modal';
import DealingCards from './ui/DealingCards';
import LobbyNotices from './ui/LobbyNotices';
import { useRosterNotices } from './hooks/useRosterChanges';
import { useConfirm } from './hooks/useConfirm';
import './avalon.css';

// Class for every Avalon root element: scopes avalon.css (tokens, reduced
// motion) and provides the --av-font-display variable.
const AVALON_ROOT = `avalon-root ${avalonDisplayFont.variable}`;

// Lobby and the waiting screens play in the great hall.
const HALL: SceneResult = { id: 'hall', storm: false, location: null, gloom: 0 };

// Every branch below returns the backdrop at the same position, so it stays
// mounted — and crossfades — when the screen switches from lobby to game.
// (The scene's title is drawn on the table: PlayerPanel → scenes/SceneTitle.)
function withScene(scene: SceneResult, body: React.ReactNode) {
  return (
    <>
      <SceneBackdrop sceneId={scene.id} storm={scene.storm} gloom={scene.gloom} />
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
        {/* Solid ink with the warning red edge: the same for both kinds. */}
        <div className="mx-auto flex max-w-md items-start justify-center gap-2 rounded-xl border border-(--av-evil)/60 bg-(--av-ink) px-4 py-2 text-center text-sm font-semibold text-(--av-text) shadow-lg shadow-black/50">
          <AvIcon name={offline ? 'offline' : 'warning'} className="mt-0.5 shrink-0 text-(--av-evil-light)" />
          <span>{offline ? 'Mất kết nối — đang thử kết nối lại. Thao tác của bạn chưa được gửi.' : notice}</span>
        </div>
      </div>
    ) : null;

  if (room.status === 'lobby') {
    const enoughPlayers = (PLAYER_COUNTS as readonly number[]).includes(playerCount);
    const optionalRolesCount =
      ((room.config.optionalRoles as unknown[] | undefined)?.length) ?? 0;
    return withScene(
      HALL,
      <div className={`${AVALON_ROOT} mx-auto max-w-5xl animate-fade-in px-4 pt-6 pb-8 sm:px-6 lg:px-8`}>
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

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <h1 className="av-display mr-auto flex items-center gap-2 text-2xl text-(--av-text) md:text-3xl">
            <AvIcon name="avalon" className="text-(--av-gold)" /> The Resistance: Avalon
          </h1>
          <AvButton variant="secondary" icon="guide" onClick={() => setShowRoleGuide(true)}>
            Vai trò
          </AvButton>
          {isHost && (
            <AvButton variant="secondary" icon="settings" onClick={() => setShowSettings(true)} title={`Cài đặt — ${optionalRolesCount} vai phụ đang bật`}>
              Cài đặt
              <span className="tabular-nums text-(--av-text-3)">{optionalRolesCount}</span>
            </AvButton>
          )}
          <AvButton variant="secondary" icon="preview" onClick={() => setShowPreview(true)}>
            Xem trước
          </AvButton>
          <AvButton variant="ghost" danger={isHost} icon={isHost ? 'delete' : 'leave'} onClick={isHost ? handleDelete : handleLeave}>
            {isHost ? 'Xoá' : 'Rời'}
          </AvButton>
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
          </div>

          {/* The room code / QR, and the host's start button under it (on a
              phone the button is pinned to the bottom: ActionDock). */}
          <div className="flex flex-col gap-4">
            <GlassPanel className="p-4">
              <QRCodeDisplay
                roomId={room.id}
                roomCode={room.roomCode}
                gameType={room.gameType}
              />
            </GlassPanel>
            {isHost && (
              <ActionDock>
                <AvButton variant="primary" size="lg" block icon="avalon" onClick={handleStartGame} disabled={!enoughPlayers}>
                  {enoughPlayers ? 'Bắt đầu ván Avalon' : `Cần 5–10 người (đang có ${playerCount})`}
                </AvButton>
              </ActionDock>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!state) {
    return withScene(
      HALL,
      <div className={`${AVALON_ROOT} flex min-h-dvh items-center justify-center text-(--av-text-2)`}>
        <div className="text-center">
          <AvIcon name="waiting" size={36} className="mb-2" />
          <p className="text-sm">Đang tải trạng thái ván…</p>
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
      <div className={`${AVALON_ROOT} flex min-h-dvh items-center justify-center p-4 text-center text-(--av-text-2)`}>
        <div>
          <AvIcon name="warning" size={36} className="mb-2 text-(--av-evil-light)" />
          <p className="text-sm">Số người chơi không hợp lệ ({playerCount}). Avalon cần 5–10 người.</p>
          <AvButton variant={isHost ? 'danger' : 'secondary'} icon={isHost ? 'delete' : 'leave'} onClick={isHost ? handleDelete : handleLeave} className="mt-4">
            {isHost ? 'Xoá phòng' : 'Rời'}
          </AvButton>
        </div>
        {confirmDialog}
      </div>
    );
  }

  // The scene every device shows for this moment of the game (hall, night,
  // the quest's location…): a pure function of the shared state.
  const scene = getScene(state, room.id, playerCount);

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
      </div>
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
    </div>
  );
}

export { defaultAvalonConfig };

// The invite screen of an Avalon room (page.tsx loads it from this module, so
// it shares the board's chunk: the player who joins already has the board).
export { default as AvalonJoinScreen } from './AvalonJoinScreen';
