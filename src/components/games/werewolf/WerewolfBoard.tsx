'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRoom, ACTIVE_ROOM_KEY } from '@/hooks/useRoom';
import { useWakeLock } from '@/hooks/useWakeLock';
import { serverNow } from '@/lib/serverClock';
import { gameStorage } from '@/services/database/firebaseAdapter';
import QRCodeDisplay from '@/components/core/QRCodeDisplay';
import type { GameModuleProps } from '@/lib/gameRegistry';
import { dealDone, nightDone, talkDone, voteDone, witchDone } from '@/components/games/werewolf/engine/flow.ts';
import { aliveIds } from '@/components/games/werewolf/engine/table.ts';
import { useWerewolf, type NightConfirmResult, type NightDraft, type PickResult, type WitchDraft, type WitchResult } from './useWerewolf';
import { dataOf, lobbyCounts, nightPicksOf, witchPicksOf } from './state';
import { phaseTimeoutMs, type DayBallot, type WerewolfGameState, type WerewolfRoomConfig, type WwTable } from './types';
import { usePhaseRemaining } from './hooks/usePhaseClock';
import { useCueSync } from './hooks/useCueSync';
import { useConfirm } from './ui/Dialog';
import RoomMenu from './ui/RoomMenu';
import Button from './ui/Button';
import LobbyPanel from './panel/LobbyPanel';
import DealPanel from './panel/DealPanel';
import NightPanel from './panel/NightPanel';
import WitchPanel from './panel/WitchPanel';
import HunterPanel from './panel/HunterPanel';
import DawnPanel from './panel/DawnPanel';
import TalkPanel from './panel/TalkPanel';
import VotePanel from './panel/VotePanel';
import VoteResultPanel from './panel/VoteResultPanel';
import EndPanel from './panel/EndPanel';
import GhostPanel from './panel/GhostPanel';
import Nightfall from './panel/Nightfall';
import HunterShot from './panel/HunterShot';
import { hasGhostCard, type PanelCtx } from './panel/shared';
import WwIcon from './assets/WwIcon';
import WwShell from './WwShell';
import './werewolf.css';

// Màn vào phòng riêng của Ma Sói: page.tsx nạp nó từ module này để dùng chung chunk.
export { default as WerewolfJoinScreen } from './WerewolfJoinScreen';

// Máy khác chờ thêm chừng này rồi mới tự chuyển phase thay chủ phòng (chủ
// phòng mất mạng / ngủ). CAS bảo đảm chỉ một lần ghi thắng.
const TAKEOVER_MS = 2500;

// Thời gian còn lại của phase, theo đồng hồ chung.
function remainingMs(state: WerewolfGameState): number {
  return phaseTimeoutMs(state) - (serverNow() - state.phaseStartedAt);
}

// Hành động trong phase trả về lần ghi: panel trả lại trạng thái "đã bấm" nếu gửi lỗi.
export interface PhaseHandlers {
  onAckDeal: () => Promise<unknown>;
  onPick: (draft: NightDraft) => PickResult;
  /** Cupid ở đêm 1 chưa ghép đủ đôi: `invalid` + lý do (hiện trong thẻ giữ). */
  onConfirmNight: (draft: NightDraft) => Promise<NightConfirmResult>;
  onPickWitch: (draft: WitchDraft) => WitchResult;
  onConfirmWitch: (draft: WitchDraft) => Promise<Pick<WitchResult, 'outcome' | 'error'>>;
  /** Thợ săn bắn (`targetId`) / không bắn (null). false = bước đã qua. */
  onShoot: (targetId: string | null) => Promise<boolean>;
  onReady: () => Promise<unknown>;
  onVote: (ballot: DayBallot) => Promise<unknown>;
  onPlayAgain: () => void;
  onLeave: () => void;
}

/**
 * Màn của phase hiện tại (dùng chung với WerewolfPreview). Người chết có thêm một
 * thẻ giữ để xem (GhostPanel). Lớp hoạt cảnh chung của bước (GĐ4, giống hệt
 * nhau với mọi người xem, `pointer-events: none`): vào đêm, phát bắn của Thợ
 * săn ở bước ngay sau bước Thợ săn (màn kết thúc tự diễn phát bắn của nó).
 * useCueSync bù độ trễ dựng cho mọi hoạt cảnh của bước (cả cảnh nền).
 */
export function PhaseView({ ctx, handlers }: { ctx: Omit<PanelCtx, 'remaining'>; handlers: PhaseHandlers }) {
  useCueSync(ctx.state.phaseStartedAt);
  const remaining = usePhaseRemaining(ctx.state);
  const full: PanelCtx = { ...ctx, remaining };
  const phase = full.state.phase;
  return (
    <>
      {phase === 'night' && <Nightfall state={full.state} />}
      {(phase === 'night' || phase === 'day-talk') && <HunterShot ctx={full} />}
      <PhasePanel ctx={full} handlers={handlers} />
      {/* Màn rộng (PhaseLayout hai cột): thẻ của người chết nằm dưới khung bên phải. */}
      {hasGhostCard(full) && (
        <div className="lg:ml-auto lg:w-96">
          <GhostPanel ctx={full} />
        </div>
      )}
    </>
  );
}

function PhasePanel({ ctx: full, handlers }: { ctx: PanelCtx; handlers: PhaseHandlers }) {
  switch (full.state.phase) {
    case 'deal':
      return <DealPanel ctx={full} onAck={handlers.onAckDeal} />;
    case 'night':
      return <NightPanel ctx={full} onPick={handlers.onPick} onConfirm={handlers.onConfirmNight} />;
    case 'night-witch':
      return <WitchPanel ctx={full} onPick={handlers.onPickWitch} onConfirm={handlers.onConfirmWitch} />;
    case 'dawn':
      return <DawnPanel ctx={full} />;
    case 'hunter':
      return <HunterPanel ctx={full} onShoot={handlers.onShoot} />;
    case 'day-talk':
      return <TalkPanel ctx={full} onReady={handlers.onReady} />;
    case 'day-vote':
      return <VotePanel ctx={full} onVote={handlers.onVote} />;
    case 'vote-result':
      return <VoteResultPanel ctx={full} />;
    case 'end':
      return <EndPanel ctx={full} onPlayAgain={handlers.onPlayAgain} onLeave={handlers.onLeave} />;
  }
}

/** Thanh trên: tên trò chơi, menu ⋯ (giống nhau với mọi vai). */
export function TopBar({ menu }: { menu: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between" data-ww-topbar="">
      <p className="flex items-center gap-2 text-(--ww-text-2)">
        <WwIcon name="game" size={22} className="text-(--ww-moon)" />
        <span className="ww-display text-xl text-(--ww-text)">Ma Sói</span>
      </p>
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
    pickWitch,
    confirmWitch,
    resolveWitchPhase,
    proceedAfterDawn,
    shootHunter,
    hunterTimeout,
    leaveVillage,
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

  // Hành động của người chơi: gửi không được (mất mạng) thì báo, không im lặng,
  // rồi ném tiếp để panel trả lại trạng thái.
  const failed = useCallback((err: unknown): never => {
    setNotice('Không gửi được — kiểm tra kết nối mạng rồi thử lại.');
    throw err;
  }, []);

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
      case 'night-witch':
        return arm(witchDone(table, witchPicksOf(state, players), state.round) ? 0 : timeout, resolveWitchPhase);
      case 'dawn':
        return arm(timeout, proceedAfterDawn);
      case 'hunter':
        return arm(timeout, hunterTimeout);
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
    resolveWitchPhase,
    proceedAfterDawn,
    hunterTimeout,
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

  // Cho rời làng dùng state MỚI NHẤT lúc chủ phòng bấm xác nhận (hộp thoại có
  // thể mở qua vài lần đổi phase).
  const leaveRef = useRef(leaveVillage);
  useEffect(() => {
    leaveRef.current = leaveVillage;
  }, [leaveVillage]);
  const handleLeaveVillage = useCallback(
    async (targetId: string, name: string) => {
      const reveal = state?.rules.revealOnDeath ?? true;
      const ok = await ask({
        title: `Cho ${name} rời làng?`,
        message: `${name} tính là đã chết (rời làng)${reveal ? ' và lộ vai' : ''}. Không hoàn tác được.`,
        confirmLabel: 'Cho rời làng',
        danger: true,
      });
      if (!ok) return;
      try {
        if (!(await leaveRef.current(targetId))) setNotice(`Chưa cho ${name} rời làng được (ván vừa đổi bước) — thử lại.`);
      } catch {
        setNotice('Không gửi được — kiểm tra kết nối mạng rồi thử lại.');
      }
    },
    [ask, state?.rules.revealOnDeath]
  );

  const handlePick = useCallback(
    (draft: NightDraft): PickResult => {
      const res = pickNight(playerId, draft);
      res.write?.catch(() => setNotice('Không gửi được — kiểm tra kết nối mạng rồi thử lại.'));
      return res;
    },
    [pickNight, playerId]
  );

  const handlePickWitch = useCallback(
    (draft: WitchDraft): WitchResult => {
      const res = pickWitch(playerId, draft);
      res.write?.catch(() => setNotice('Không gửi được — kiểm tra kết nối mạng rồi thử lại.'));
      return res;
    },
    [pickWitch, playerId]
  );

  // Lỗi của chính người chơi và cảnh báo mất kết nối, thay cho alert().
  const banner =
    offline || notice ? (
      <div className="fixed inset-x-0 top-0 z-40 px-4 pt-2" role={offline ? 'status' : 'alert'} data-banner="">
        <div className="mx-auto flex max-w-md items-start justify-center gap-2 rounded-xl border border-(--ww-wolf)/60 bg-(--ww-ink) px-4 py-2 text-center text-sm font-semibold text-(--ww-text) shadow-lg shadow-black/50">
          <WwIcon name={offline ? 'offline' : 'warning'} size={18} className="mt-px text-(--ww-wolf-light)" />
          {offline ? 'Mất kết nối — đang thử kết nối lại. Thao tác của bạn chưa được gửi.' : notice}
        </div>
      </div>
    ) : null;

  const me = players.find((p) => p.id === playerId);
  const myData = dataOf(me);
  const menuCtx = state && table && me ? { me, myData, players: gamePlayers, table, state } : null;
  const leaveCandidates =
    isHost && inGame && state && table && ready && state.phase !== 'end'
      ? gamePlayers.filter((p) => p.id !== playerId && aliveIds(table).includes(p.id))
      : null;
  const menu = (
    <RoomMenu
      ctx={inGame ? menuCtx : null}
      isHost={isHost}
      inGame={inGame}
      rules={state?.rules ?? config?.rules ?? null}
      counts={room.status !== 'lobby' && state ? state.roleCounts : config ? lobbyCounts(config.roleCounts, players.length) : null}
      leaveCandidates={leaveCandidates}
      onLeaveVillage={handleLeaveVillage}
      onLeave={handleLeave}
      onDelete={handleDelete}
    />
  );

  const shell = (body: React.ReactNode, attrs: Record<`data-${string}`, string | number> = {}) => (
    <WwShell state={room.status === 'lobby' ? null : state} {...attrs}>
      {banner}
      <TopBar menu={menu} />
      {body}
      {confirmDialog}
    </WwShell>
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

  if (!state) return shell(<p className="py-16 text-center text-sm text-(--ww-text-2)">Đang tải ván…</p>);

  const attrs = { 'data-ww-phase': state.phase, 'data-ww-started': state.phaseStartedAt, 'data-ww-round': state.round };

  if (!state.seatOrder.includes(playerId)) {
    return shell(
      <div className="py-16 text-center">
        <p className="text-sm text-(--ww-text-2)">Ván đang diễn ra. Bạn sẽ chơi từ ván sau.</p>
        <Button className="mt-4" onClick={handleLeave}>
          Thoát
        </Button>
      </div>,
      attrs
    );
  }

  if (!me || !myData.role || !table || !ready) {
    return shell(<p className="py-16 text-center text-sm text-(--ww-text-2)">Đang chia vai…</p>, attrs);
  }

  const ctx: Omit<PanelCtx, 'remaining'> = { state, me, myData, players: gamePlayers, table: table as WwTable, isHost };
  return shell(
    <PhaseView
      ctx={ctx}
      handlers={{
        onAckDeal: () => ackDeal(playerId).catch(failed),
        onPick: handlePick,
        onConfirmNight: (draft: NightDraft) => confirmNight(playerId, draft).catch(failed),
        onPickWitch: handlePickWitch,
        onConfirmWitch: (draft: WitchDraft) => confirmWitch(playerId, draft).catch(failed),
        onShoot: (targetId: string | null) => shootHunter(playerId, targetId).catch(failed),
        onReady: () => readyToVote(playerId).catch(failed),
        onVote: (ballot: DayBallot) => castDayVote(playerId, ballot).catch(failed),
        onPlayAgain: handleNewGame,
        onLeave: isHost ? handleDelete : handleLeave,
      }}
    />,
    attrs
  );
}

