'use client';

import { useMemo, useState } from 'react';
import type { Player } from '@/types/player';
import { serverNow } from '@/lib/serverClock';
import { afterVote } from '@/components/games/werewolf/engine/flow.ts';
import { isValidTarget, pickFor, seerLook } from '@/components/games/werewolf/engine/night.ts';
import { nightActionOf, ROLE_NAME, ROLE_TEAM } from '@/components/games/werewolf/engine/roles.ts';
import { DEFAULT_RULES } from '@/components/games/werewolf/engine/types.ts';
import { PhaseView, TopBar } from './WerewolfBoard';
import { dataOf, readConfig, tableOf } from './state';
import type { PickResult } from './useWerewolf';
import type { DayBallot, WerewolfGameData, WerewolfGameState, WwLogEntry, WwPhase, WwRole } from './types';
import LobbyPanel from './panel/LobbyPanel';
import RoomMenu from './ui/RoomMenu';
import type { Room } from '@/types/room';

// Harness xem từng màn bằng state giả, không cần Firebase (plan §11). Người
// xem luôn là ghế 1 (Lan). Đổi vai của người xem = đổi chỗ với người đang giữ
// vai đó, nên bộ vai trên bàn không đổi (cặp ảnh riêng tư).

export const PREVIEW_SCENES = {
  'lobby-host': 'Sảnh — chủ phòng',
  'lobby-guest': 'Sảnh — người chơi (chỉ đọc)',
  'lobby-warn': 'Sảnh — bộ vai lệch (cảnh báo)',
  deal: 'Xem vai',
  'night-empty': 'Đêm ① — chưa chọn',
  'night-picked': 'Đêm ① — đã chọn, chưa xác nhận',
  'night-confirmed': 'Đêm ① — đã xác nhận',
  'night-split': 'Đêm ① — bầy Sói chưa thống nhất',
  'night-dead': 'Đêm ① — người xem đã chết',
  'dawn-deaths': 'Bình minh — có người chết',
  'dawn-peaceful': 'Bình minh — bình yên',
  'day-talk': 'Thảo luận',
  'day-vote': 'Bỏ phiếu',
  'vote-result-hanged': 'Kết quả — có người bị treo',
  'vote-result-tie': 'Kết quả — hoà, không ai bị treo',
  'end-village': 'Kết thúc — Dân thắng',
  'end-wolves': 'Kết thúc — Sói thắng',
} as const;

export type PreviewScene = keyof typeof PREVIEW_SCENES;
export const PREVIEW_ROLES: readonly WwRole[] = ['werewolf', 'villager', 'seer', 'guard'];

const NAMES = ['Lan', 'Minh', 'Hùng', 'Mai', 'Tú', 'Hoa', 'Khoa'];
// Bộ 7 người của GĐ1: 2 Sói, Tiên tri, Bảo vệ, 3 Dân.
const LINEUP: WwRole[] = ['villager', 'werewolf', 'seer', 'guard', 'villager', 'werewolf', 'villager'];
const ID = (i: number) => `p${i + 1}`;
const ME = ID(0);

function lineupFor(role: WwRole): WwRole[] {
  const roles = [...LINEUP];
  const j = roles.findIndex((r, i) => i > 0 && r === role);
  if (roles[0] !== role && j > 0) [roles[0], roles[j]] = [roles[j], roles[0]];
  return roles;
}

function makePlayers(roles: WwRole[], extra: (id: string, role: WwRole) => Partial<WerewolfGameData> = () => ({})): Player[] {
  return roles.map((role, i) => ({
    id: ID(i),
    name: NAMES[i],
    isAlive: true,
    isHost: i === 0,
    joinedAt: new Date(0),
    gameData: { role, team: ROLE_TEAM[role], nightPick: null, guardLast: null, seerLog: [], ...extra(ID(i), role) },
  }));
}

function baseState(phase: WwPhase, start: number, over: Partial<WerewolfGameState> = {}): WerewolfGameState {
  return {
    phase,
    phaseStartedAt: start,
    round: 1,
    seatOrder: NAMES.map((_, i) => ID(i)),
    roleCounts: { werewolf: 2, seer: 1, guard: 1, witch: 0, hunter: 0, villager: 3 },
    rules: DEFAULT_RULES,
    timeouts: {},
    deaths: [],
    acks: {},
    attack: null,
    dawnDeaths: [],
    dayVotes: {},
    lastVote: null,
    hunter: null,
    winner: null,
    endReason: null,
    log: [],
    ...over,
  };
}

const SAMPLE_LOG: WwLogEntry[] = [
  { kind: 'wolves', round: 1, targetId: 'p5', how: 'consensus' },
  { kind: 'guard', round: 1, guardId: 'p4', targetId: 'p7' },
  { kind: 'seer', round: 1, seerId: 'p3', targetId: 'p2', isWolf: true },
  { kind: 'suspects', round: 1, picks: { p1: 'p6', p7: 'p2' } },
  { kind: 'death', round: 1, id: 'p5', cause: 'wolf' },
  { kind: 'vote', round: 1, ballots: { p1: 'p2', p2: 'p7', p3: 'p2', p4: 'p2', p6: 'skip', p7: 'p2' }, executedId: 'p2' },
  { kind: 'wolves', round: 2, targetId: 'p3', how: 'majority' },
  { kind: 'death', round: 2, id: 'p3', cause: 'wolf' },
  { kind: 'vote', round: 2, ballots: { p1: 'p6', p4: 'p6', p6: 'p1', p7: 'p6' }, executedId: 'p6' },
];

interface Mock {
  state: WerewolfGameState | null;
  players: Player[];
  lobby?: { isHost: boolean; roleCounts: Record<string, number> | null };
}

function buildScene(scene: PreviewScene, role: WwRole, start: number): Mock {
  const roles = lineupFor(role);
  const idOf = (r: WwRole, nth = 0) => ID(roles.map((x, i) => (x === r ? i : -1)).filter((i) => i >= 0)[nth]);
  const wolves = roles.map((r, i) => (r === 'werewolf' ? ID(i) : null)).filter(Boolean) as string[];
  // Người ai cũng chọn được (ghế 5 và 7 luôn là Dân, đổi vai không chạm tới):
  // mọi vai chọn cùng một ô, cho cặp ảnh riêng tư.
  const common = ID(4);
  const otherVillager = ID(6);
  switch (scene) {
    case 'lobby-host':
    case 'lobby-guest':
    case 'lobby-warn':
      return {
        state: null,
        players: makePlayers(roles).map((p) => ({ ...p, gameData: {} })),
        lobby: { isHost: scene !== 'lobby-guest', roleCounts: scene === 'lobby-warn' ? { werewolf: 1, seer: 1, guard: 1 } : null },
      };
    case 'deal':
      return { state: baseState('deal', start, { round: 0, acks: { p3: true, p6: true } }), players: makePlayers(roles) };
    case 'night-empty':
    case 'night-picked':
    case 'night-confirmed':
    case 'night-split':
    case 'night-dead': {
      const mine = scene === 'night-empty' || scene === 'night-dead' ? null : { round: 1, targetId: common, confirmed: scene !== 'night-picked' };
      const deaths = scene === 'night-dead' ? [{ id: ME, round: 1, cause: 'wolf' as const }] : [];
      const players = makePlayers(roles, (id, r) => {
        if (id === ME) return { nightPick: mine };
        if (r === 'werewolf') {
          const split = scene === 'night-split' && id === wolves[wolves.length - 1];
          return { nightPick: { round: 1, targetId: split ? otherVillager : common, confirmed: true } };
        }
        return {};
      });
      if (role === 'seer' && mine?.confirmed) {
        const { table } = tableOf(baseState('night', start), players);
        const look = seerLook(table, ME, common);
        if (look) (players[0].gameData as WerewolfGameData).seerLog = [{ round: 1, targetId: look.targetId, isWolf: look.isWolf }];
      }
      return { state: baseState('night', start, { deaths }), players };
    }
    case 'dawn-deaths':
      return { state: baseState('dawn', start, { deaths: [{ id: common, round: 1, cause: 'wolf' }], dawnDeaths: [common] }), players: makePlayers(roles) };
    case 'dawn-peaceful':
      return { state: baseState('dawn', start), players: makePlayers(roles) };
    case 'day-talk':
      return {
        state: baseState('day-talk', start, { deaths: [{ id: common, round: 1, cause: 'wolf' }], acks: { [idOf('seer')]: true, [wolves[1]]: true } }),
        players: makePlayers(roles),
      };
    case 'day-vote':
      return {
        state: baseState('day-vote', start, {
          deaths: [{ id: common, round: 1, cause: 'wolf' }],
          dayVotes: { [idOf('seer')]: wolves[0], [wolves[1]]: 'skip', [ME]: wolves[0] === ME ? 'skip' : wolves[0] },
        }),
        players: makePlayers(roles),
      };
    case 'vote-result-hanged':
    case 'vote-result-tie': {
      const players = makePlayers(roles);
      const deaths = [{ id: common, round: 1, cause: 'wolf' as const }];
      const { table } = tableOf(baseState('day-vote', start, { deaths }), players);
      const alive = table.seatOrder.filter((id) => id !== common);
      const votes: Record<string, DayBallot> = {};
      alive.forEach((id, i) => {
        // Hoà: hai người cuối mỗi người 2 phiếu, họ thì Bỏ qua.
        const target = scene === 'vote-result-hanged' ? wolves[0] : i < 2 ? alive[4] : i < 4 ? alive[5] : 'skip';
        votes[id] = id === target ? 'skip' : target;
      });
      const step = afterVote(table, 1, votes);
      return {
        state: baseState('vote-result', start, {
          deaths: [...deaths, ...step.newDeaths],
          lastVote: { ballots: step.vote.ballots, executedId: step.vote.executedId, outcome: step.vote.outcome },
        }),
        players,
      };
    }
    case 'end-village':
    case 'end-wolves': {
      const village = scene === 'end-village';
      const deaths = village
        ? [
            { id: 'p5', round: 1, cause: 'wolf' as const },
            { id: 'p2', round: 1, cause: 'vote' as const },
            { id: 'p3', round: 2, cause: 'wolf' as const },
            { id: 'p6', round: 2, cause: 'vote' as const },
          ]
        : [
            { id: 'p5', round: 1, cause: 'wolf' as const },
            { id: 'p7', round: 1, cause: 'vote' as const },
            { id: 'p3', round: 2, cause: 'wolf' as const },
          ];
      return {
        state: baseState('end', start, {
          round: 2,
          deaths,
          winner: village ? 'village' : 'wolves',
          endReason: village ? 'no-wolves' : 'wolf-parity',
          log: SAMPLE_LOG,
        }),
        players: makePlayers(LINEUP),
      };
    }
  }
}

function Screen({ scene, role, start }: { scene: PreviewScene; role: WwRole; start: number }) {
  const initial = useMemo(() => buildScene(scene, role, start), [scene, role, start]);
  const [players, setPlayers] = useState(initial.players);
  const [state, setState] = useState(initial.state);
  const setMine = (data: Partial<WerewolfGameData>) =>
    setPlayers((ps) => ps.map((p) => (p.id === ME ? { ...p, gameData: { ...p.gameData, ...data } } : p)));

  if (initial.lobby) {
    const room = { config: { roleCounts: initial.lobby.roleCounts } } as unknown as Room;
    return (
      <>
        <TopBar menu={<RoomMenu ctx={null} isHost={initial.lobby.isHost} inGame={false} onLeave={() => {}} onDelete={() => {}} />} />
        <LobbyPanel
          players={players}
          myId={ME}
          hostId={ME}
          isHost={initial.lobby.isHost}
          config={readConfig(room)}
          invite={<p className="text-center font-mono text-2xl tracking-widest text-slate-100">ABC123</p>}
          onKick={() => {}}
          onUpdateConfig={() => {}}
          onStart={() => {}}
        />
      </>
    );
  }
  if (!state) return null;
  const { table } = tableOf(state, players);
  const me = players[0];
  const myData = dataOf(me);
  const ctx = { state, me, myData, players, table, isHost: true };

  const onPick = (targetId: string): PickResult => {
    const cur = pickFor(myData.nightPick, state.round);
    if (cur?.confirmed && myData.role !== 'werewolf') return { outcome: 'locked', write: null };
    if (!isValidTarget(table, ME, nightActionOf(myData.role as WwRole), targetId, { guardLast: myData.guardLast ?? null })) {
      return { outcome: 'invalid', write: null };
    }
    setMine({ nightPick: { round: state.round, targetId, confirmed: false } });
    return { outcome: 'ok', write: Promise.resolve() };
  };
  const onConfirm = async (targetId: string) => {
    const look = myData.role === 'seer' ? seerLook(table, ME, targetId) : null;
    setMine({
      nightPick: { round: state.round, targetId, confirmed: true },
      ...(look ? { seerLog: [{ round: state.round, targetId: look.targetId, isWolf: look.isWolf }] } : {}),
    });
  };
  const local = (fn: () => void) => async () => fn();
  return (
    <>
      <TopBar menu={<RoomMenu ctx={ctx} isHost inGame onLeave={() => {}} onDelete={() => {}} />} />
      <PhaseView
        ctx={ctx}
        handlers={{
          onAckDeal: local(() => setState((s) => s && { ...s, acks: { ...s.acks, [ME]: true } })),
          onPick,
          onConfirmNight: onConfirm,
          onReady: local(() => setState((s) => s && { ...s, acks: { ...s.acks, [ME]: true } })),
          onVote: async (b) => setState((s) => s && { ...s, dayVotes: { ...s.dayVotes, [ME]: b } }),
          onPlayAgain: () => {},
          onLeave: () => {},
        }}
      />
    </>
  );
}

export default function WerewolfPreview({
  initialScene = 'night-empty',
  initialRole = 'villager',
  start,
  chrome = true,
}: {
  initialScene?: PreviewScene;
  initialRole?: WwRole;
  /** Thời điểm bắt đầu phase (ms, đồng hồ chung). Thiếu = lúc mở + 0. Hai máy cùng `start` thấy cùng đồng hồ. */
  start?: number;
  /** false: ẩn thanh chọn (để chụp ảnh). */
  chrome?: boolean;
}) {
  const [scene, setScene] = useState<PreviewScene>(initialScene);
  const [role, setRole] = useState<WwRole>(initialRole);
  const [opened] = useState(() => serverNow());
  const startAt = start ?? opened;
  return (
    <div className="mx-auto w-full max-w-lg text-slate-100" data-ww-root="" data-ww-preview={scene} data-ww-viewer-role={role}>
      {chrome && (
        <div className="mb-4 space-y-2 rounded-xl bg-slate-900 p-3 ring-1 ring-amber-500/40">
          <p className="text-xs font-bold text-amber-300 uppercase">Xem trước Ma Sói — dữ liệu giả</p>
          <select
            aria-label="Màn"
            className="w-full rounded-lg bg-slate-800 px-2 py-2 text-sm"
            value={scene}
            onChange={(e) => setScene(e.target.value as PreviewScene)}
          >
            {Object.entries(PREVIEW_SCENES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select aria-label="Vai người xem" className="w-full rounded-lg bg-slate-800 px-2 py-2 text-sm" value={role} onChange={(e) => setRole(e.target.value as WwRole)}>
            {PREVIEW_ROLES.map((r) => (
              <option key={r} value={r}>
                Người xem: {ROLE_NAME[r]}
              </option>
            ))}
          </select>
        </div>
      )}
      <Screen key={`${scene}:${role}:${startAt}`} scene={scene} role={role} start={startAt} />
    </div>
  );
}
