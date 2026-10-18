'use client';

import { useMemo, useState } from 'react';
import type { Player } from '@/types/player';
import { serverNow } from '@/lib/serverClock';
import { afterVote } from '@/components/games/werewolf/engine/flow.ts';
import { isValidTarget, pickFor, seerLook, validateWitchPick } from '@/components/games/werewolf/engine/night.ts';
import { fullCounts, nightActionOf, ROLE_NAME, ROLE_ORDER, ROLE_TEAM } from '@/components/games/werewolf/engine/roles.ts';
import { DEFAULT_RULES, FULL_POTIONS } from '@/components/games/werewolf/engine/types.ts';
import { PhaseView, TopBar } from './WerewolfBoard';
import WwShell from './WwShell';
import StyleBoard from './StyleBoard';
import WerewolfJoinScreen from './WerewolfJoinScreen';
import { dataOf, potionsOf, readConfig, tableOf } from './state';
import type { PickResult, WitchDraft, WitchResult } from './useWerewolf';
import type { DayBallot, WerewolfGameData, WerewolfGameState, WwLogEntry, WwPhase, WwRole, WwRules } from './types';
import LobbyPanel from './panel/LobbyPanel';
import RoomMenu from './ui/RoomMenu';
import type { Room } from '@/types/room';

// Harness xem từng màn bằng state giả, không cần Firebase (plan §11). Người
// xem luôn là ghế 1 (Lan). Đổi vai của người xem = đổi chỗ với người đang giữ
// vai đó, nên bộ vai trên bàn không đổi (cặp ảnh riêng tư).

export const PREVIEW_SCENES = {
  style: 'Bảng phong cách',
  join: 'Vào phòng — mời vào làng',
  'join-closed': 'Vào phòng — ván đang diễn ra',
  'lobby-host': 'Sảnh — chủ phòng',
  'lobby-guest': 'Sảnh — người chơi (chỉ đọc)',
  'lobby-warn': 'Sảnh — bộ vai lệch (cảnh báo)',
  deal: 'Xem vai',
  'night-empty': 'Đêm ① — chưa chọn',
  'night-picked': 'Đêm ① — đã chọn, chưa xác nhận',
  'night-confirmed': 'Đêm ① — đã xác nhận',
  'night-split': 'Đêm ① — bầy Sói chưa thống nhất',
  'night-dead': 'Đêm ① — người xem đã chết',
  'night-2': 'Đêm 2 — vào đêm, trăng lên',
  'night-after-hunter': 'Đêm 2 — sau phát bắn của Thợ săn (bị treo)',
  'witch-empty': 'Đêm ② — chưa chọn',
  'witch-picked': 'Đêm ② — đã chọn (Phù thủy: cứu + độc), chưa xác nhận',
  'witch-confirmed': 'Đêm ② — đã xác nhận',
  'witch-no-attack': 'Đêm ② — Sói không cắn ai',
  'witch-spent': 'Đêm ② — Phù thủy đã hết bình',
  'witch-dead': 'Đêm ② — người xem đã chết',
  'dawn-deaths': 'Bình minh — có người chết',
  'dawn-peaceful': 'Bình minh — bình yên',
  'dawn-two': 'Bình minh — hai người chết',
  'hunter-dawn': 'Thợ săn — bị cắn, bắn sau bình minh',
  'hunter-vote': 'Thợ săn — bị treo, bắn sau kết quả',
  'dawn-hunter': 'Bình minh — Thợ săn chết (chưa bắn: chưa phải hồn ma)',
  'ghost-night': 'Hồn ma — Đêm ① (xem hết)',
  'ghost-witch': 'Hồn ma — Đêm ② (xem hết)',
  'ghost-talk': 'Hồn ma — Thảo luận (xem hết)',
  'ghost-dawn': 'Người chết — Bình minh',
  'ghost-hunter': 'Người chết — Thợ săn đang ngắm',
  'ghost-vote': 'Người chết — Bỏ phiếu',
  'ghost-result': 'Người chết — Kết quả phiếu',
  'ghost-long': 'Người chết — nhật ký dài (vòng 2, giới hạn 8 mục cuối)',
  'ghost-off': 'Người chết — Đêm ① (hồn ma tắt)',
  'talk-hidden': 'Thảo luận — lộ vai khi chết tắt',
  'day-talk': 'Thảo luận',
  'talk-after-hunter': 'Thảo luận — sau phát bắn của Thợ săn (bị cắn)',
  'talk-hunter-skip': 'Thảo luận — Thợ săn không bắn',
  'day-vote': 'Bỏ phiếu',
  'vote-result-hanged': 'Kết quả — có người bị treo',
  'vote-result-tie': 'Kết quả — hoà, không ai bị treo',
  'end-village': 'Kết thúc — Dân thắng',
  'end-wolves': 'Kết thúc — Sói thắng',
  'end-hunter': 'Kết thúc — Thợ săn bắn Sói cuối cùng',
} as const;

export type PreviewScene = keyof typeof PREVIEW_SCENES;
export const PREVIEW_ROLES: readonly WwRole[] = ROLE_ORDER;

const NAMES = ['Lan', 'Minh', 'Hùng', 'Mai', 'Tú', 'Hoa', 'Khoa', 'Quân', 'Vy', 'Đức'];
// Bộ mặc định 9 người: 2 Sói, Tiên tri, Bảo vệ, Phù thủy, Thợ săn, 3 Dân. Ghế
// 5 và 7 luôn là Dân (đổi vai người xem không chạm tới). `count` 5–10 lấy n ghế
// đầu (để kiểm bố cục với 5–10 người; vài màn của Phù thủy / Thợ săn / hồn ma
// cần đủ 9).
const LINEUP: WwRole[] = ['villager', 'werewolf', 'seer', 'guard', 'villager', 'werewolf', 'villager', 'witch', 'hunter', 'villager'];
const DEFAULT_COUNT = 9;
const ID = (i: number) => `p${i + 1}`;
const ME = ID(0);

function lineupFor(role: WwRole, n: number): WwRole[] {
  const roles = LINEUP.slice(0, n);
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
    gameData: {
      role,
      team: ROLE_TEAM[role],
      nightPick: null,
      witchPick: null,
      potions: role === 'witch' ? FULL_POTIONS : null,
      guardLast: null,
      seerLog: [],
      ...extra(ID(i), role),
    },
  }));
}

function baseStateN(phase: WwPhase, start: number, over: Partial<WerewolfGameState> = {}, n = DEFAULT_COUNT): WerewolfGameState {
  const roleCounts = fullCounts({});
  for (const r of LINEUP.slice(0, n)) roleCounts[r] += 1;
  return {
    phase,
    phaseStartedAt: start,
    round: 1,
    seatOrder: NAMES.slice(0, n).map((_, i) => ID(i)),
    roleCounts,
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
  { kind: 'guesses', round: 1, picks: { p1: 'p5', p3: 'p7', p9: 'p5' } },
  { kind: 'death', round: 1, id: 'p5', cause: 'wolf' },
  { kind: 'vote', round: 1, ballots: { p1: 'p2', p2: 'p7', p3: 'p2', p4: 'p2', p6: 'skip', p7: 'p2', p8: 'p2', p9: 'p2' }, executedId: 'p2' },
  { kind: 'wolves', round: 2, targetId: 'p3', how: 'majority' },
  { kind: 'witch', round: 2, witchId: 'p8', healedId: null, poisonId: 'p7' },
  { kind: 'death', round: 2, id: 'p3', cause: 'wolf' },
  { kind: 'death', round: 2, id: 'p7', cause: 'poison' },
  { kind: 'vote', round: 2, ballots: { p1: 'p6', p4: 'p6', p6: 'p1', p8: 'p6', p9: 'p6' }, executedId: 'p6' },
];

const ROUND1_LOG = SAMPLE_LOG.filter((e) => e.round === 1 && e.kind !== 'vote');

// Nhật ký của màn người chết. Người xem là Thợ săn thì đã bắn xong (không bắn),
// nên là hồn ma thật (không còn "chưa bắn").
const ghostLog = (role: WwRole): WwLogEntry[] =>
  role === 'hunter' ? [...ROUND1_LOG, { kind: 'hunter', round: 1, hunterId: ME, targetId: null }] : ROUND1_LOG;

interface Mock {
  state: WerewolfGameState | null;
  players: Player[];
  lobby?: { isHost: boolean; roleCounts: Record<string, number> | null };
  style?: boolean;
  join?: 'open' | 'closed';
}

function buildScene(scene: PreviewScene, role: WwRole, start: number, n = DEFAULT_COUNT): Mock {
  const roles = lineupFor(role, n);
  const baseState = (phase: WwPhase, at: number, over: Partial<WerewolfGameState> = {}) => baseStateN(phase, at, over, n);
  const idOf = (r: WwRole, nth = 0) => ID(roles.map((x, i) => (x === r ? i : -1)).filter((i) => i >= 0)[nth]);
  const wolves = roles.map((r, i) => (r === 'werewolf' ? ID(i) : null)).filter(Boolean) as string[];
  // Người ai cũng chọn được (ghế 5 và 7 luôn là Dân, đổi vai không chạm tới):
  // mọi vai chọn cùng một ô, cho cặp ảnh riêng tư.
  const common = ID(4);
  const otherVillager = ID(6);
  switch (scene) {
    case 'style':
      return { state: null, players: [], style: true };
    case 'join':
    case 'join-closed':
      return { state: null, players: makePlayers(roles).map((p) => ({ ...p, gameData: {} })), join: scene === 'join' ? 'open' : 'closed' };
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
    case 'night-2':
    case 'night-after-hunter': {
      // Đêm 2: cảnh vừa đổi từ giàn treo, trăng lên. Ngày 1 treo Sói (night-2) hoặc
      // treo Thợ săn, Thợ săn bắn ghế 7 (night-after-hunter, diễn lại phát bắn).
      const shot = scene === 'night-after-hunter';
      const hunterId = idOf('hunter');
      const hanged = shot ? hunterId : wolves[1];
      const ballots: Record<string, DayBallot> = Object.fromEntries(
        roles.map((_, i) => ID(i)).filter((id) => id !== common).map((id) => [id, id === hanged ? 'skip' : hanged])
      );
      return {
        state: baseState('night', start, {
          round: 2,
          deaths: [
            { id: common, round: 1, cause: 'wolf' },
            { id: hanged, round: 1, cause: 'vote' },
            ...(shot ? [{ id: otherVillager, round: 1, cause: 'hunter' as const }] : []),
          ],
          log: [
            ...ROUND1_LOG,
            { kind: 'vote', round: 1, ballots, executedId: hanged },
            ...(shot ? [{ kind: 'hunter' as const, round: 1, hunterId, targetId: otherVillager }] : []),
          ],
        }),
        players: makePlayers(roles),
      };
    }
    case 'witch-empty':
    case 'witch-picked':
    case 'witch-confirmed':
    case 'witch-no-attack':
    case 'witch-spent':
    case 'witch-dead': {
      // Ai cũng đoán cùng một ô (ghế 5): cặp ảnh riêng tư chỉ khác vai.
      const chosen = scene === 'witch-picked' || scene === 'witch-confirmed';
      const witch = role === 'witch';
      const mine = chosen
        ? { round: 1, heal: witch, poisonId: witch ? wolves[0] : null, guessId: common, confirmed: scene === 'witch-confirmed' }
        : null;
      const deaths = scene === 'witch-dead' ? [{ id: ME, round: 1, cause: 'wolf' as const }] : [];
      const players = makePlayers(roles, (id, r) => ({
        ...(id === ME ? { witchPick: mine } : {}),
        ...(r === 'witch' && scene === 'witch-spent' ? { potions: { heal: false, poison: false } } : {}),
      }));
      return { state: baseState('night-witch', start, { deaths, attack: scene === 'witch-no-attack' ? null : common }), players };
    }
    case 'dawn-deaths':
      return { state: baseState('dawn', start, { deaths: [{ id: common, round: 1, cause: 'wolf' }], dawnDeaths: [common] }), players: makePlayers(roles) };
    case 'dawn-peaceful':
      return { state: baseState('dawn', start), players: makePlayers(roles) };
    case 'dawn-two':
      return {
        state: baseState('dawn', start, {
          deaths: [
            { id: common, round: 1, cause: 'wolf' },
            { id: otherVillager, round: 1, cause: 'poison' },
          ],
          dawnDeaths: [common, otherVillager],
        }),
        players: makePlayers(roles),
      };
    case 'hunter-dawn':
    case 'hunter-vote': {
      // Người xem chọn vai Thợ săn thì thấy màn bắn; vai khác thấy "đang ngắm".
      const hunterId = idOf('hunter');
      const after = scene === 'hunter-dawn' ? 'dawn' : 'vote';
      const deaths = [{ id: hunterId, round: 1, cause: after === 'dawn' ? ('wolf' as const) : ('vote' as const) }];
      return { state: baseState('hunter', start, { deaths, hunter: { hunterId, after } }), players: makePlayers(roles) };
    }
    case 'dawn-hunter': {
      const hunterId = idOf('hunter');
      return {
        state: baseState('dawn', start, { deaths: [{ id: hunterId, round: 1, cause: 'wolf' }], dawnDeaths: [hunterId], log: ROUND1_LOG }),
        players: makePlayers(roles),
      };
    }
    case 'ghost-night':
    case 'ghost-witch':
    case 'ghost-off': {
      // Người xem (ghế 1) chết đêm 1; đang là đêm 2. Mọi người đã chọn, vài người xác nhận.
      const deaths = [{ id: ME, round: 1, cause: 'wolf' as const }];
      const witchPhase = scene === 'ghost-witch';
      const players = makePlayers(roles, (id, r) => {
        if (id === ME) return {};
        if (witchPhase) {
          if (r === 'witch') return { witchPick: { round: 2, heal: true, poisonId: wolves[0], guessId: null, confirmed: false } };
          return { witchPick: { round: 2, heal: false, poisonId: null, guessId: common, confirmed: r === 'seer' } };
        }
        if (r === 'werewolf') return { nightPick: { round: 2, targetId: id === wolves[0] ? common : otherVillager, confirmed: true } };
        if (r === 'seer') return { nightPick: { round: 2, targetId: wolves[0], confirmed: true } };
        if (r === 'guard') return { nightPick: { round: 2, targetId: common, confirmed: false } };
        return { nightPick: { round: 2, targetId: wolves[1], confirmed: false } };
      });
      return {
        state: baseState(witchPhase ? 'night-witch' : 'night', start, {
          round: 2,
          deaths,
          attack: witchPhase ? common : null,
          rules: { ...DEFAULT_RULES, ghostsSeeAll: scene !== 'ghost-off' },
          log: ghostLog(role),
        }),
        players,
      };
    }
    case 'ghost-talk':
    case 'talk-hidden': {
      const ghost = scene === 'ghost-talk';
      return {
        state: baseState('day-talk', start, {
          deaths: [
            { id: ghost ? ME : common, round: 1, cause: 'wolf' },
            { id: otherVillager, round: 1, cause: 'poison' },
          ],
          rules: { ...DEFAULT_RULES, revealOnDeath: ghost },
          // Dấu ✓ công khai nằm ở ghế cố định (Dân), không phụ thuộc vai người xem.
          acks: { [ghost ? common : idOf('seer')]: true },
          log: ghost ? ghostLog(role) : ROUND1_LOG,
        }),
        players: makePlayers(roles),
      };
    }
    case 'ghost-dawn':
    case 'ghost-hunter':
    case 'ghost-vote':
    case 'ghost-result': {
      // Người xem (ghế 1) chết đêm 1; đang là vòng 2. Người xem là Thợ săn ở màn
      // "Thợ săn" thì chính là người đang tới lượt bắn (chết đêm 2, chưa bắn).
      const hunterId = idOf('hunter');
      const iAmShooter = scene === 'ghost-hunter' && hunterId === ME;
      const players = makePlayers(roles);
      const deaths: Array<{ id: string; round: number; cause: 'wolf' | 'vote' }> = iAmShooter ? [{ id: ME, round: 2, cause: 'wolf' }] : [{ id: ME, round: 1, cause: 'wolf' }];
      const log = iAmShooter ? ROUND1_LOG : ghostLog(role);
      if (scene === 'ghost-dawn') {
        deaths.push({ id: common, round: 2, cause: 'wolf' });
        return { state: baseState('dawn', start, { round: 2, deaths, dawnDeaths: [common], log }), players };
      }
      if (scene === 'ghost-hunter') {
        if (!iAmShooter) deaths.push({ id: hunterId, round: 2, cause: 'wolf' });
        return { state: baseState('hunter', start, { round: 2, deaths, hunter: { hunterId, after: 'dawn' }, log }), players };
      }
      if (scene === 'ghost-vote') {
        // Phiếu công khai không phụ thuộc vai của người xem (cặp ảnh riêng tư).
        return { state: baseState('day-vote', start, { round: 2, deaths, dayVotes: { [common]: otherVillager, [otherVillager]: common }, log }), players };
      }
      const { table } = tableOf(baseState('day-vote', start, { round: 2, deaths }), players);
      const alive = table.seatOrder.filter((id) => id !== ME);
      const votes: Record<string, DayBallot> = {};
      for (const id of alive) votes[id] = id === otherVillager ? 'skip' : otherVillager;
      const step = afterVote(table, 2, votes);
      return {
        state: baseState('vote-result', start, {
          round: 2,
          deaths: [...deaths, ...step.newDeaths],
          lastVote: { ballots: step.vote.ballots, executedId: step.vote.executedId, outcome: step.vote.outcome },
          log,
        }),
        players,
      };
    }
    case 'ghost-long':
      // Nhật ký dài (11 mục của hai vòng): tờ hồn ma chỉ hiện 8 mục mới nhất.
      return {
        state: baseState('day-talk', start, {
          round: 2,
          deaths: [
            { id: 'p5', round: 1, cause: 'wolf' },
            { id: 'p2', round: 1, cause: 'vote' },
            { id: 'p3', round: 2, cause: 'wolf' },
            { id: 'p7', round: 2, cause: 'poison' },
            { id: ME, round: 2, cause: 'wolf' },
          ],
          log: SAMPLE_LOG.slice(0, 11),
        }),
        players: makePlayers(roles),
      };
    case 'day-talk':
      return {
        state: baseState('day-talk', start, { deaths: [{ id: common, round: 1, cause: 'wolf' }], acks: { [idOf('seer')]: true, [wolves[1]]: true } }),
        players: makePlayers(roles),
      };
    case 'talk-after-hunter':
    case 'talk-hunter-skip': {
      // Thợ săn bị cắn đêm 1, bắn ghế 7 (hoặc không bắn) sau bình minh: Thảo luận diễn lại phát bắn.
      const hunterId = idOf('hunter');
      const target = scene === 'talk-after-hunter' ? otherVillager : null;
      return {
        state: baseState('day-talk', start, {
          deaths: [{ id: hunterId, round: 1, cause: 'wolf' }, ...(target ? [{ id: target, round: 1, cause: 'hunter' as const }] : [])],
          log: [
            { kind: 'wolves', round: 1, targetId: hunterId, how: 'consensus' },
            { kind: 'death', round: 1, id: hunterId, cause: 'wolf' },
            { kind: 'hunter', round: 1, hunterId, targetId: target },
          ],
        }),
        players: makePlayers(roles),
      };
    }
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
    case 'end-hunter': {
      // Thợ săn (ghế 9) bị cắn đêm 2, bắn Sói cuối cùng (ghế 6): phát bắn diễn trước, rồi mới lộ phe thắng.
      const base = LINEUP.slice(0, n);
      return {
        state: baseState('end', start, {
          round: 2,
          deaths: [
            { id: 'p5', round: 1, cause: 'wolf' },
            { id: 'p2', round: 1, cause: 'vote' },
            { id: 'p9', round: 2, cause: 'wolf' },
            { id: 'p6', round: 2, cause: 'hunter' },
          ],
          winner: 'village',
          endReason: 'no-wolves',
          log: [
            ...SAMPLE_LOG.slice(0, 7),
            { kind: 'wolves', round: 2, targetId: 'p9', how: 'consensus' },
            { kind: 'death', round: 2, id: 'p9', cause: 'wolf' },
            { kind: 'hunter', round: 2, hunterId: 'p9', targetId: 'p6' },
          ],
        }),
        players: makePlayers(base),
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
        players: makePlayers(LINEUP.slice(0, n)),
      };
    }
  }
}

function Screen({
  scene,
  role,
  start,
  rules,
  count,
  chrome,
}: {
  scene: PreviewScene;
  role: WwRole;
  start: number;
  rules?: Partial<WwRules>;
  count: number;
  /** Thanh chọn màn / vai của Preview (nằm trong khung để cảnh nền phủ cả nó). */
  chrome: React.ReactNode;
}) {
  const initial = useMemo(() => buildScene(scene, role, start, count), [scene, role, start, count]);
  const [players, setPlayers] = useState(initial.players);
  const [state, setState] = useState(() => (initial.state && rules ? { ...initial.state, rules: { ...initial.state.rules, ...rules } } : initial.state));
  const setMine = (data: Partial<WerewolfGameData>) =>
    setPlayers((ps) => ps.map((p) => (p.id === ME ? { ...p, gameData: { ...p.gameData, ...data } } : p)));

  const attrs = { 'data-ww-preview': scene, 'data-ww-viewer-role': role };
  if (initial.join) {
    // Màn vào phòng có khung (và cảnh) riêng; thanh chọn của Preview không hiện ở đây — đổi màn bằng URL.
    const room = { roomCode: 'ABC123', status: initial.join === 'open' ? 'lobby' : 'night', config: { maxPlayers: 10 } } as unknown as Room;
    return (
      <div {...attrs}>
        <WerewolfJoinScreen room={room} players={players} onJoin={async () => {}} />
      </div>
    );
  }
  if (initial.style) {
    return (
      <WwShell state={null} {...attrs}>
        {chrome}
        <TopBar menu={null} />
        <StyleBoard />
      </WwShell>
    );
  }
  if (initial.lobby) {
    const room = { config: { roleCounts: initial.lobby.roleCounts } } as unknown as Room;
    return (
      <WwShell state={null} {...attrs}>
        {chrome}
        <TopBar
          menu={<RoomMenu ctx={null} isHost={initial.lobby.isHost} inGame={false} rules={readConfig(room).rules} onLeave={() => {}} onDelete={() => {}} />}
        />
        <LobbyPanel
          players={players}
          myId={ME}
          hostId={ME}
          isHost={initial.lobby.isHost}
          config={readConfig(room)}
          invite={<p className="text-center font-mono text-2xl tracking-widest text-(--ww-text)">ABC123</p>}
          onKick={() => {}}
          onUpdateConfig={() => {}}
          onStart={() => {}}
        />
      </WwShell>
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
  const witchDraft = (draft: WitchDraft): WitchResult => {
    const cur = pickFor(myData.witchPick, state.round);
    if (cur?.confirmed) return { outcome: 'locked', error: null, write: null };
    if (draft.guessId && !isValidTarget(table, ME, 'guess', draft.guessId)) return { outcome: 'invalid', error: null, write: null };
    if (myData.role === 'witch') {
      const error = validateWitchPick(table, ME, draft, state.attack, potionsOf(myData));
      if (error) return { outcome: 'invalid', error, write: null };
    }
    setMine({ witchPick: { round: state.round, ...draft, confirmed: false } });
    return { outcome: 'ok', error: null, write: Promise.resolve() };
  };
  const local = (fn: () => void) => async () => fn();
  return (
    <WwShell state={state} {...attrs}>
      {chrome}
      <TopBar
        menu={
          <RoomMenu
            ctx={ctx}
            isHost
            inGame
            rules={state.rules}
            leaveCandidates={state.phase === 'end' ? null : players.filter((p) => p.id !== ME && !table.deaths.some((d) => d.id === p.id))}
            onLeaveVillage={(id) =>
              setState((s) => s && { ...s, deaths: [...s.deaths, { id, round: s.round, cause: 'left' }], log: [...s.log, { kind: 'left', round: s.round, id, during: s.phase }] })
            }
            onLeave={() => {}}
            onDelete={() => {}}
          />
        }
      />
      <PhaseView
        ctx={ctx}
        handlers={{
          onAckDeal: local(() => setState((s) => s && { ...s, acks: { ...s.acks, [ME]: true } })),
          onPick,
          onConfirmNight: onConfirm,
          onPickWitch: witchDraft,
          onConfirmWitch: async (draft) => {
            setMine({ witchPick: { round: state.round, ...draft, confirmed: true } });
            return { outcome: 'ok', error: null };
          },
          onShoot: async () => true,
          onReady: local(() => setState((s) => s && { ...s, acks: { ...s.acks, [ME]: true } })),
          onVote: async (b) => setState((s) => s && { ...s, dayVotes: { ...s.dayVotes, [ME]: b } }),
          onPlayAgain: () => {},
          onLeave: () => {},
        }}
      />
    </WwShell>
  );
}

export default function WerewolfPreview({
  initialScene = 'night-empty',
  initialRole = 'villager',
  start,
  chrome = true,
  rules,
  count = DEFAULT_COUNT,
}: {
  /** Số người trên bàn (5–10, mặc định 9): kiểm bố cục với ít / nhiều người. */
  count?: number;
  initialScene?: PreviewScene;
  initialRole?: WwRole;
  /** Ghi đè luật của màn (vd. tắt "Hồn ma xem hết vai" để chụp ảnh). */
  rules?: Partial<WwRules>;
  /** Thời điểm bắt đầu phase (ms, đồng hồ chung). Thiếu = lúc mở + 0. Hai máy cùng `start` thấy cùng đồng hồ. */
  start?: number;
  /** false: ẩn thanh chọn (để chụp ảnh). */
  chrome?: boolean;
}) {
  const [scene, setScene] = useState<PreviewScene>(initialScene);
  const [role, setRole] = useState<WwRole>(initialRole);
  const [opened] = useState(() => serverNow());
  const startAt = start ?? opened;
  const bar = chrome ? (
    <div className="mb-4 space-y-2 rounded-xl border border-(--ww-accent)/40 bg-(--ww-ink) p-3">
      <p className="text-xs font-bold text-(--ww-accent) uppercase">Xem trước Ma Sói — dữ liệu giả</p>
      <select
        aria-label="Màn"
        className="w-full rounded-xl bg-(--ww-raised) px-2 py-2 text-sm text-(--ww-text)"
        value={scene}
        onChange={(e) => setScene(e.target.value as PreviewScene)}
      >
        {Object.entries(PREVIEW_SCENES).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
      <select
        aria-label="Vai người xem"
        className="w-full rounded-xl bg-(--ww-raised) px-2 py-2 text-sm text-(--ww-text)"
        value={role}
        onChange={(e) => setRole(e.target.value as WwRole)}
      >
        {PREVIEW_ROLES.map((r) => (
          <option key={r} value={r}>
            Người xem: {ROLE_NAME[r]}
          </option>
        ))}
      </select>
    </div>
  ) : null;
  return <Screen key={`${scene}:${role}:${startAt}`} scene={scene} role={role} start={startAt} rules={rules} count={count} chrome={bar} />;
}
