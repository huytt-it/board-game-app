'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRoom, ACTIVE_ROOM_KEY } from '@/hooks/useRoom';
import { useWakeLock } from '@/hooks/useWakeLock';
import { serverNow } from '@/lib/serverClock';
import { gameStorage } from '@/services/database/firebaseAdapter';
import QRCodeDisplay from '@/components/core/QRCodeDisplay';
import type { GameModuleProps } from '@/lib/gameRegistry';
import { dealDone, nightDone, talkDone, voteDone } from '@/components/games/werewolf/engine/flow.ts';
import { useWerewolf, type PickOutcome } from './useWerewolf';
import { dataOf, nightPicksOf } from './state';
import { phaseTimeoutMs, type DayBallot, type WerewolfGameState, type WerewolfRoomConfig, type WwTable } from './types';
import { usePhaseRemaining } from './hooks/usePhaseClock';
import { useConfirm } from './ui/Dialog';
import RoomMenu from './ui/RoomMenu';
import Button from './ui/Button';
import LobbyPanel from './panel/LobbyPanel';
import DealPanel from './panel/DealPanel';
import NightPanel from './panel/NightPanel';
import DawnPanel from './panel/DawnPanel';
import TalkPanel from './panel/TalkPanel';
import VotePanel from './panel/VotePanel';
import VoteResultPanel from './panel/VoteResultPanel';
import EndPanel from './panel/EndPanel';
import type { PanelCtx } from './panel/shared';

// Máy khác chờ thêm chừng này rồi mới tự chuyển phase thay chủ phòng (chủ
// phòng mất mạng / ngủ). CAS bảo đảm chỉ một lần ghi thắng.
const TAKEOVER_MS = 2500;

// Thời gian còn lại của phase, theo đồng hồ chung.
function remainingMs(state: WerewolfGameState): number {
  return phaseTimeoutMs(state) - (serverNow() - state.phaseStartedAt);
}

export interface PhaseHandlers {
  onAckDeal: () => void;
  onPick: (targetId: string) => Promise<PickOutcome>;
  onConfirmNight: () => void;
  onReady: () => void;
  onVote: (ballot: DayBallot) => void;
  onPlayAgain: () => void;
  onLeave: () => void;
}

/** Màn của phase hiện tại (dùng chung với WerewolfPreview). */
export function PhaseView({ ctx, handlers }: { ctx: Omit<PanelCtx, 'remaining'>; handlers: PhaseHandlers }) {
  const remaining = usePhaseRemaining(ctx.state);
  const full: PanelCtx = { ...ctx, remaining };
  switch (ctx.state.phase) {
    case 'deal':
      return <DealPanel ctx={full} onAck={handlers.onAckDeal} />;
    case 'night':
      return <NightPanel ctx={full} onPick={handlers.onPick} onConfirm={handlers.onConfirmNight} />;
    case 'dawn':
      return <DawnPanel ctx={full} />;
    case 'day-talk':
      return <TalkPanel ctx={full} onReady={handlers.onReady} />;
    case 'day-vote':
      return <VotePanel ctx={full} onVote={handlers.onVote} />;
    case 'vote-result':
      return <VoteResultPanel ctx={full} />;
    case 'end':
      return <EndPanel ctx={full} onPlayAgain={handlers.onPlayAgain} onLeave={handlers.onLeave} />;
    default:
      // Đêm ② (Phù thủy) và Thợ săn có ở GĐ2.
      return <p className="text-center text-sm text-slate-400">Bước này có ở GĐ2.</p>;
  }
}

/** Thanh trên: tên trò chơi, menu ⋯ (giống nhau với mọi vai). */
export function TopBar({ menu }: { menu: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <p className="text-sm font-bold tracking-wide text-indigo-200 uppercase">Ma Sói</p>
      {menu}
    </div>
  );
}

export default function WerewolfBoard({ room, players, playerId, isHost }: GameModuleProps) {
  const router = useRouter();
  const { leaveRoom, deleteRoom, updateConfig } = useRoom(room.id, playerId);
  const {
    config,
    state,
    table,
    ready,
    gamePlayers,
    startGame,
    ackDeal,
    proceedAfterDeal,
    pickNight,
    confirmNight,
    resolveNightPhase,
    proceedAfterDawn,
    readyToVote,
    proceedAfterTalk,
    castDayVote,
    resolveDayVote,
    proceedAfterVoteResult,
    restart,
  } = useWerewolf(room.id, room, players);

  const [offline, setOffline] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const { ask, dialog: confirmDialog } = useConfirm();

  const inGame = room.status !== 'lobby' && room.status !== 'end';
  // Điện thoại ngủ thì dừng timer và rớt kết nối, làm cả bàn chờ.
  useWakeLock(inGame);

  // Chỉ báo mất kết nối khi đã mất một lúc (tránh nháy lúc tải trang).
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

  // Hành động của người chơi: gửi không được (mất mạng) thì báo, không im lặng.
  const act =
    <A extends unknown[]>(fn: (...args: A) => unknown) =>
    (...args: A) => {
      Promise.resolve(fn(...args)).catch(() => setNotice('Không gửi được — kiểm tra kết nối mạng rồi thử lại.'));
    };

  // ── Tự chuyển phase ─────────────────────────────────────────────────
  // MỌI máy chạy timer. Mỗi lần đổi phase là một CAS (useWerewolf.advance),
  // nên chỉ một lần ghi thắng, lần ghi cũ / trùng bị bỏ. Chủ phòng chạy trước,
  // máy khác chờ thêm TAKEOVER_MS. CAS thất bại vì dữ liệu cũ thì effect này
  // tự chạy lại khi dữ liệu mới về.
  const arm = useCallback(
    (delayMs: number, advance: () => Promise<unknown>) => {
      const t = setTimeout(
        () => {
          advance().catch(() => {}); // mất mạng: máy khác sẽ làm
        },
        Math.max(0, delayMs) + (isHost ? 0 : TAKEOVER_MS)
      );
      return () => clearTimeout(t);
    },
    [isHost]
  );

  useEffect(() => {
    // Thiếu vai của một ghế thì engine sẽ quyết sai: chờ dữ liệu đủ.
    if (!state || !table || !ready) return;
    const timeout = remainingMs(state) + 250;
    switch (state.phase) {
      case 'deal':
        return arm(dealDone(table, state.acks ?? {}) ? 0 : timeout, proceedAfterDeal);
      case 'night':
        return arm(nightDone(table, nightPicksOf(state, players), state.round) ? 0 : timeout, resolveNightPhase);
      case 'dawn':
        return arm(timeout, proceedAfterDawn);
      case 'day-talk':
        return arm(talkDone(table, state.acks ?? {}) ? 0 : timeout, proceedAfterTalk);
      case 'day-vote':
        return arm(voteDone(table, state.dayVotes ?? {}) ? 0 : timeout, resolveDayVote);
      case 'vote-result':
        return arm(timeout, proceedAfterVoteResult);
    }
  }, [
    state,
    table,
    ready,
    players,
    arm,
    proceedAfterDeal,
    resolveNightPhase,
    proceedAfterDawn,
    proceedAfterTalk,
    resolveDayVote,
    proceedAfterVoteResult,
  ]);

  // ── Rời / xoá / chơi lại ────────────────────────────────────────────

  const handleLeave = useCallback(async () => {
    if (inGame) {
      // Rời giữa ván KHÔNG xoá người chơi: vai nằm trong doc đó và cả bàn cần
      // nó. Giống đóng tab — mở lại link phòng là vào lại.
      if (await ask({ title: 'Thoát khỏi ván?', message: 'Bạn vẫn là người chơi — mở lại link phòng để vào lại.', confirmLabel: 'Thoát' })) {
        localStorage.removeItem(ACTIVE_ROOM_KEY);
        router.push('/');
      }
      return;
    }
    if (await ask({ title: 'Rời phòng?', confirmLabel: 'Rời phòng' })) {
      await leaveRoom(playerId);
      router.push('/');
    }
  }, [inGame, ask, leaveRoom, playerId, router]);

  const handleDelete = useCallback(async () => {
    if (await ask({ title: 'Xoá phòng?', message: 'Thao tác không thể hoàn tác.', confirmLabel: 'Xoá phòng', danger: true })) {
      await deleteRoom();
      router.push('/');
    }
  }, [ask, deleteRoom, router]);

  const handleStart = useCallback(async () => {
    try {
      await startGame();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Không bắt đầu được ván.');
    }
  }, [startGame]);

  const handleNewGame = useCallback(async () => {
    if (!(await ask({ title: 'Chơi lại?', message: 'Vai và diễn biến ván này sẽ bị xoá.', confirmLabel: 'Chơi lại' }))) return;
    await restart().catch(() => setNotice('Không gửi được — kiểm tra kết nối mạng rồi thử lại.'));
  }, [ask, restart]);

  const handleKick = useCallback(
    async (targetId: string, name: string) => {
      if (!(await ask({ title: `Mời ${name} ra khỏi phòng?`, confirmLabel: 'Mời ra', danger: true }))) return;
      try {
        await gameStorage.removePlayer(room.id, targetId);
      } catch (err) {
        setNotice(err instanceof Error ? err.message : 'Không mời ra được.');
      }
    },
    [ask, room.id]
  );

  const handlePick = useCallback(
    (targetId: string): Promise<PickOutcome> =>
      pickNight(playerId, targetId).catch(() => {
        setNotice('Không gửi được — kiểm tra kết nối mạng rồi thử lại.');
        return 'closed' as const;
      }),
    [pickNight, playerId]
  );

  // Lỗi của chính người chơi và cảnh báo mất kết nối, thay cho alert().
  const banner =
    offline || notice ? (
      <div className="fixed inset-x-0 top-0 z-40 px-4 pt-2" role={offline ? 'status' : 'alert'} data-banner="">
        <div className="mx-auto max-w-md rounded-xl bg-slate-900 px-4 py-2 text-center text-sm font-semibold text-slate-100 shadow-lg ring-1 ring-rose-500/60">
          {offline ? 'Mất kết nối — đang thử kết nối lại. Thao tác của bạn chưa được gửi.' : notice}
        </div>
      </div>
    ) : null;

  const me = players.find((p) => p.id === playerId);
  const myData = dataOf(me);
  const menuCtx = state && table && me ? { me, myData, players: gamePlayers, table } : null;
  const menu = <RoomMenu ctx={inGame ? menuCtx : null} isHost={isHost} inGame={inGame} onLeave={handleLeave} onDelete={handleDelete} />;

  const shell = (body: React.ReactNode, attrs: Record<string, string | number> = {}) => (
    <div className="mx-auto w-full max-w-lg text-slate-100" data-ww-root="" {...attrs}>
      {banner}
      <TopBar menu={menu} />
      {body}
      {confirmDialog}
    </div>
  );

  if (room.status === 'lobby') {
    return shell(
      config ? (
        <LobbyPanel
          players={players}
          myId={playerId}
          hostId={room.hostId}
          isHost={isHost}
          config={config}
          invite={<QRCodeDisplay roomId={room.id} roomCode={room.roomCode} gameType={room.gameType} />}
          onKick={handleKick}
          onUpdateConfig={(next: Partial<WerewolfRoomConfig>) => updateConfig(next)}
          onStart={handleStart}
        />
      ) : null,
      { 'data-ww-phase': 'lobby' }
    );
  }

  if (!state) return shell(<p className="py-16 text-center text-sm text-slate-400">Đang tải ván…</p>);

  const attrs = { 'data-ww-phase': state.phase, 'data-ww-started': state.phaseStartedAt, 'data-ww-round': state.round };

  if (!state.seatOrder.includes(playerId)) {
    return shell(
      <div className="py-16 text-center">
        <p className="text-sm text-slate-300">Ván đang diễn ra. Bạn sẽ chơi từ ván sau.</p>
        <Button className="mt-4" onClick={handleLeave}>
          Thoát
        </Button>
      </div>,
      attrs
    );
  }

  if (!me || !myData.role || !table || !ready) {
    return shell(<p className="py-16 text-center text-sm text-slate-400">Đang chia vai…</p>, attrs);
  }

  const ctx: Omit<PanelCtx, 'remaining'> = { state, me, myData, players: gamePlayers, table: table as WwTable, isHost };
  return shell(
    <PhaseView
      ctx={ctx}
      handlers={{
        onAckDeal: act(() => ackDeal(playerId)),
        onPick: handlePick,
        onConfirmNight: act(() => confirmNight(playerId)),
        onReady: act(() => readyToVote(playerId)),
        onVote: act((ballot: DayBallot) => castDayVote(playerId, ballot)),
        onPlayAgain: handleNewGame,
        onLeave: isHost ? handleDelete : handleLeave,
      }}
    />,
    attrs
  );
}

