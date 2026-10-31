'use client';

import { useMemo, useState } from 'react';
import type { Player } from '@/types/player';
import { serverNow } from '@/lib/serverClock';
import { afterVote } from '@/components/games/werewolf/engine/flow.ts';
import { isValidTarget, pickFor, seerLook, validateCupidPick, validateWitchPick, wolfBitesFor } from '@/components/games/werewolf/engine/night.ts';
import { ALL_ROLES, cupidPairsTonight, fullCounts, isWolfRole, nightActionOf, ROLE_NAME, ROLE_TEAM } from '@/components/games/werewolf/engine/roles.ts';
import { DEFAULT_RULES, FULL_POTIONS } from '@/components/games/werewolf/engine/types.ts';
import { PhaseView, TopBar } from './WerewolfBoard';
import WwShell from './WwShell';
import StyleBoard from './StyleBoard';
import WerewolfJoinScreen from './WerewolfJoinScreen';
import { attacksOf, dataOf, potionsOf, readConfig, tableOf } from './state';
import type { NightDraft, PickResult, WitchDraft, WitchResult } from './useWerewolf';
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
  // Vai mở rộng (GĐ5b). Người xem chọn vai mở rộng ở ô "Người xem".
  'lobby-extras': 'Sảnh — 12 người, bật vai mở rộng',
  'night-bite2': 'Đêm 2 — đêm cắn 2 (Sói con bị treo hôm qua, lộ vai tắt)',
  'night-bite1': 'Đêm 2 — đêm thường (đối chứng của đêm cắn 2, lộ vai tắt)',
  'night-lovers': 'Đêm 2 — người xem trong cặp đôi (khác phe)',
  'night-lovers-ctrl': 'Đêm 2 — có cặp đôi, người xem không ở trong cặp (đối chứng)',
  'witch-two': 'Đêm ② — Sói nhắm 2 người (đêm cắn 2)',
  'witch-one-r2': 'Đêm ② — Sói nhắm 1 người (đối chứng, vòng 2)',
  'dawn-lovers': 'Bình minh — người yêu chết theo (3 người)',
  'dawn-four': 'Bình minh — 4 người chết (cắn 2 + độc + chết theo)',
  'vote-result-lover': 'Kết quả — người bị treo kéo người yêu chết theo',
  'talk-shot-lover': 'Thảo luận — Thợ săn bắn người có người yêu',
  'ghost-extras': 'Hồn ma — Đêm 2 cắn 2, cặp đôi, Già làng (xem hết)',
  'end-tanner': 'Kết thúc — Kẻ chán đời thắng',
  'end-lovers': 'Kết thúc — Tình nhân thắng',
  'end-minion': 'Kết thúc — Sói thắng, có Tay sai',
} as const;

export type PreviewScene = keyof typeof PREVIEW_SCENES;
export const PREVIEW_ROLES: readonly WwRole[] = ALL_ROLES;

const NAMES = ['Lan', 'Minh', 'Hùng', 'Mai', 'Tú', 'Hoa', 'Khoa', 'Quân', 'Vy', 'Đức', 'Phương', 'Nguyên'];
// Bộ mặc định 9 người: 2 Sói, Tiên tri, Bảo vệ, Phù thủy, Thợ săn, 3 Dân. Ghế
// 5 và 7 luôn là Dân (đổi vai người xem không chạm tới). `count` 5–12 lấy n ghế
// đầu (để kiểm bố cục với 5–12 người; vài màn của Phù thủy / Thợ săn / hồn ma
// cần đủ 9, màn của vai mở rộng cần 10).
const LINEUP: WwRole[] = ['villager', 'werewolf', 'seer', 'guard', 'villager', 'werewolf', 'villager', 'witch', 'hunter', 'villager', 'villager', 'villager'];
const DEFAULT_COUNT = 9;
const ID = (i: number) => `p${i + 1}`;
const ME = ID(0);
/** Ghế 10: ghế của vai mở rộng "phía sau" (Sói con đã chết, người yêu…), không bao giờ là người xem. */
const BACK = ID(9);

/**
 * Bộ vai của bàn: bộ mặc định, thêm `extras` (vai mở rộng) vào ghế Dân từ cuối
 * bàn lên (không đụng ghế 1, 5, 7), rồi đổi chỗ người xem với người giữ `role`.
 */
function baseLineup(n: number, extras: readonly WwRole[] = []): WwRole[] {
  const roles = LINEUP.slice(0, n);
  const free = roles.map((r, i) => (r === 'villager' && i !== 0 && i !== 4 && i !== 6 ? i : -1)).filter((i) => i >= 0).reverse();
  extras.forEach((e, k) => {
    if (free[k] !== undefined) roles[free[k]] = e;
  });
  return roles;
}

function lineupFor(role: WwRole, n: number, extras: readonly WwRole[] = []): WwRole[] {
  const roles = baseLineup(n, extras);
  const j = roles.findIndex((r, i) => i > 0 && r === role);
  if (roles[0] !== role && j > 0) [roles[0], roles[j]] = [roles[j], roles[0]];
  // Vai mở rộng không có trong bộ mặc định: người xem (ghế 1, Dân) giữ luôn vai đó.
  else if (roles[0] !== role) roles[0] = role;
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

function baseStateN(phase: WwPhase, start: number, over: Partial<WerewolfGameState>, lineup: readonly WwRole[]): WerewolfGameState {
  const roleCounts = fullCounts({});
  for (const r of lineup) roleCounts[r] += 1;
  return {
    phase,
    phaseStartedAt: start,
    round: 1,
    seatOrder: lineup.map((_, i) => ID(i)),
    roleCounts,
    rules: DEFAULT_RULES,
    timeouts: {},
    deaths: [],
    acks: {},
    attack: null,
    attacks: [],
    lovers: null,
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

function buildScene(scene: PreviewScene, role: WwRole, start: number, n = DEFAULT_COUNT, extras: readonly WwRole[] = []): Mock {
  const roles = lineupFor(role, n, extras);
  const baseState = (phase: WwPhase, at: number, over: Partial<WerewolfGameState> = {}) => baseStateN(phase, at, over, roles);
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
      // Cupid đêm 1 đã ghép đôi (chỉ thấy khi giữ thẻ): ghế 3 và 4.
      const lovers = role === 'cupid' ? { loverIds: [ID(2), ID(3)] } : {};
      const mine = scene === 'night-empty' || scene === 'night-dead' ? null : { round: 1, targetId: common, confirmed: scene !== 'night-picked', ...lovers };
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
    case 'lobby-extras':
      return {
        state: null,
        players: makePlayers(roles).map((p) => ({ ...p, gameData: {} })),
        lobby: {
          isHost: true,
          roleCounts: { werewolf: 2, wolfcub: 1, seer: 1, guard: 1, witch: 1, hunter: 1, elder: 1, cupid: 1, minion: 1 },
        },
      };
    case 'night-bite2':
    case 'night-bite1':
    case 'witch-two':
    case 'witch-one-r2': {
      // Vòng 2, lộ vai tắt. Hôm qua treo ghế 10: Sói con (đêm cắn 2) hoặc Ma Sói
      // (đêm thường) — công khai như nhau. Các Sói khác đã chọn (đêm cắn 2: hai người).
      const two = scene === 'night-bite2' || scene === 'witch-two';
      roles[9] = two ? 'wolfcub' : 'werewolf';
      const witchPhase = scene.startsWith('witch');
      const bite = (confirmed: boolean) =>
        two ? { round: 2, targetId: common, biteIds: [common, otherVillager], confirmed } : { round: 2, targetId: common, confirmed };
      const players = makePlayers(roles, (id, r) => {
        if (witchPhase) {
          if (id !== ME) return {};
          return role === 'witch'
            ? { witchPick: { round: 2, heal: true, poisonId: wolves[0], guessId: common, confirmed: false, ...(two ? { healId: otherVillager } : {}) } }
            : { witchPick: { round: 2, heal: false, poisonId: null, guessId: common, confirmed: false } };
        }
        if (id === ME) return { nightPick: isWolfRole(r) ? bite(false) : { round: 2, targetId: common, confirmed: false } };
        if (isWolfRole(r) && id !== BACK) return { nightPick: bite(true) };
        return {};
      });
      const deaths = [{ id: BACK, round: 1, cause: 'vote' as const }];
      return {
        state: baseState(witchPhase ? 'night-witch' : 'night', start, {
          round: 2,
          deaths,
          rules: { ...DEFAULT_RULES, revealOnDeath: false },
          attack: witchPhase ? common : null,
          attacks: witchPhase ? (two ? [common, otherVillager] : [common]) : [],
          log: [...ROUND1_LOG, { kind: 'vote', round: 1, ballots: { [ME]: BACK, [common]: BACK }, executedId: BACK }],
        }),
        players,
      };
    }
    case 'night-lovers':
    case 'night-lovers-ctrl': {
      // Đêm 2: người xem và ghế 6 (Ma Sói) là cặp đôi Cupid (ghế 10) đã ghép đêm 1.
      // Đối chứng: cặp là ghế 3 và ghế 6 (người xem không ở trong cặp).
      roles[9] = 'cupid';
      const pair: [string, string] = [scene === 'night-lovers' ? ME : ID(2), ID(5)];
      return {
        state: baseState('night', start, {
          round: 2,
          lovers: pair,
          log: [...ROUND1_LOG.filter((e) => e.kind !== 'death'), { kind: 'lovers', round: 1, cupidId: BACK, loverIds: pair, mixed: true }],
        }),
        players: makePlayers(roles),
      };
    }
    case 'dawn-lovers':
    case 'dawn-four': {
      // Ghế 4 yêu ghế 5 (ghế 5 bị cắn → ghế 4 chết theo). dawn-four: đêm cắn 2 (ghế 5, 7) + độc ghế 3.
      roles[9] = scene === 'dawn-four' ? 'wolfcub' : 'cupid';
      const four = scene === 'dawn-four';
      const r = four ? 2 : 1;
      const pair: [string, string] = [ID(3), common];
      const deaths = [
        ...(four ? [{ id: BACK, round: 1, cause: 'vote' as const }] : []),
        { id: common, round: r, cause: 'wolf' as const },
        { id: otherVillager, round: r, cause: four ? ('wolf' as const) : ('poison' as const) },
        ...(four ? [{ id: ID(2), round: 2, cause: 'poison' as const }] : []),
        { id: ID(3), round: r, cause: 'love' as const },
      ];
      const dawnDeaths = deaths
        .filter((d) => d.round === r && d.cause !== 'vote')
        .map((d) => d.id)
        .sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
      return {
        state: baseState('dawn', start, {
          round: r,
          lovers: pair,
          deaths,
          dawnDeaths,
          log: [{ kind: 'love', round: r, id: ID(3), loverId: common, part: 'night' }],
        }),
        players: makePlayers(roles),
      };
    }
    case 'vote-result-lover': {
      // Treo Sói ghế 2 (hoặc người xem nếu người xem là Ma Sói) → ghế 4 (người yêu) chết theo ngay.
      roles[9] = 'cupid';
      const players = makePlayers(roles);
      const hanged = wolves[0];
      const pair: [string, string] = [ID(3), hanged];
      const deaths = [{ id: common, round: 1, cause: 'wolf' as const }];
      const { table } = tableOf(baseState('day-vote', start, { deaths, lovers: pair }), players);
      const votes: Record<string, DayBallot> = {};
      for (const id of table.seatOrder.filter((x) => x !== common)) votes[id] = id === hanged ? 'skip' : hanged;
      const step = afterVote(table, 1, votes);
      return {
        state: baseState('vote-result', start, {
          lovers: pair,
          deaths: [...deaths, ...step.newDeaths],
          lastVote: { ballots: step.vote.ballots, executedId: step.vote.executedId, outcome: step.vote.outcome },
          log: step.log,
        }),
        players,
      };
    }
    case 'talk-shot-lover': {
      // Thợ săn bị cắn đêm 1, bắn ghế 4; ghế 7 (người yêu của ghế 4) chết theo.
      roles[9] = 'cupid';
      const hunterId = idOf('hunter');
      return {
        state: baseState('day-talk', start, {
          lovers: [ID(3), otherVillager],
          deaths: [
            { id: hunterId, round: 1, cause: 'wolf' },
            { id: ID(3), round: 1, cause: 'hunter' },
            { id: otherVillager, round: 1, cause: 'love' },
          ],
          log: [
            { kind: 'wolves', round: 1, targetId: hunterId, how: 'consensus' },
            { kind: 'death', round: 1, id: hunterId, cause: 'wolf' },
            { kind: 'hunter', round: 1, hunterId, targetId: ID(3) },
            { kind: 'love', round: 1, id: otherVillager, loverId: ID(3), part: 'day' },
          ],
        }),
        players: makePlayers(roles),
      };
    }
    case 'ghost-extras': {
      // Người xem chết đêm 1; đêm 2 là đêm cắn 2 (Sói con ghế 10 bị treo), Già làng
      // ghế 11 đã mất mạng phụ, Cupid ghế 12 ghép ghế 4 với ghế 6 (Ma Sói, khác phe).
      roles[9] = 'wolfcub';
      if (n > 10) roles[10] = 'elder';
      if (n > 11) roles[11] = 'cupid';
      const pair: [string, string] = [ID(3), ID(5)];
      const players = makePlayers(roles, (id, r) => {
        if (id === ME) return {};
        if (r === 'elder') return { elderLife: false, nightPick: { round: 2, targetId: common, confirmed: true } };
        if (isWolfRole(r) && id !== BACK) {
          return { nightPick: { round: 2, targetId: common, biteIds: id === wolves[0] ? [common, otherVillager] : [common], confirmed: true } };
        }
        return { nightPick: { round: 2, targetId: wolves[0], confirmed: false } };
      });
      return {
        state: baseState('night', start, {
          round: 2,
          lovers: pair,
          deaths: [
            { id: ME, round: 1, cause: 'wolf' },
            { id: BACK, round: 1, cause: 'vote' },
          ],
          log: [
            ...ROUND1_LOG.filter((e) => e.kind !== 'death'),
            { kind: 'lovers', round: 1, cupidId: ID(11), loverIds: pair, mixed: true },
            { kind: 'elder', round: 1, elderId: ID(10) },
            { kind: 'death', round: 1, id: ME, cause: 'wolf' },
            { kind: 'vote', round: 1, ballots: { [common]: BACK }, executedId: BACK },
          ],
        }),
        players,
      };
    }
    case 'end-tanner':
    case 'end-lovers':
    case 'end-minion': {
      const base = baseLineup(n, extras);
      base[9] = scene === 'end-tanner' ? 'tanner' : scene === 'end-lovers' ? 'cupid' : 'minion';
      const players = makePlayers(base);
      if (scene === 'end-tanner') {
        return {
          state: baseState('end', start, {
            deaths: [
              { id: common, round: 1, cause: 'wolf' },
              { id: BACK, round: 1, cause: 'vote' },
            ],
            winner: 'tanner',
            endReason: 'tanner-hanged',
            log: [...ROUND1_LOG, { kind: 'vote', round: 1, ballots: { [ME]: BACK, [common]: BACK }, executedId: BACK }],
          }),
          players,
        };
      }
      if (scene === 'end-lovers') {
        // Còn đúng cặp Tình nhân: ghế 2 (Ma Sói) và ghế 5 (Dân).
        const pair: [string, string] = [ID(1), common];
        const others = base.map((_, i) => ID(i)).filter((id) => !pair.includes(id));
        return {
          state: baseState('end', start, {
            round: 3,
            lovers: pair,
            deaths: others.map((id, k) => ({ id, round: 1 + (k % 3), cause: k % 2 ? ('vote' as const) : ('wolf' as const) })),
            winner: 'lovers',
            endReason: 'lovers',
            log: [{ kind: 'lovers', round: 1, cupidId: BACK, loverIds: pair, mixed: true }, ...SAMPLE_LOG.slice(0, 7)],
          }),
          players,
        };
      }
      return {
        state: baseState('end', start, {
          round: 2,
          deaths: [
            { id: common, round: 1, cause: 'wolf' },
            { id: otherVillager, round: 1, cause: 'vote' },
            { id: ID(2), round: 2, cause: 'wolf' },
          ],
          winner: 'wolves',
          endReason: 'wolf-parity',
          log: SAMPLE_LOG,
        }),
        players,
      };
    }
    case 'end-hunter': {
      // Thợ săn (ghế 9) bị cắn đêm 2, bắn Sói cuối cùng (ghế 6): phát bắn diễn trước, rồi mới lộ phe thắng.
      const base = baseLineup(n, extras);
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
        players: makePlayers(baseLineup(n, extras)),
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
  extras,
  chrome,
}: {
  scene: PreviewScene;
  role: WwRole;
  start: number;
  rules?: Partial<WwRules>;
  count: number;
  extras: readonly WwRole[];
  /** Thanh chọn màn / vai của Preview (nằm trong khung để cảnh nền phủ cả nó). */
  chrome: React.ReactNode;
}) {
  const extrasKey = extras.join(',');
  // eslint-disable-next-line react-hooks/exhaustive-deps -- extras theo khoá chuỗi
  const initial = useMemo(() => buildScene(scene, role, start, count, extras), [scene, role, start, count, extrasKey]);
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

  // Như useWerewolf.nightCheck / pickNight / confirmNight, nhưng ghi vào state cục bộ.
  const myRole = myData.role as WwRole;
  const nightPick = (draft: NightDraft, confirmed: boolean) => ({
    round: state.round,
    targetId: draft.targetId,
    confirmed,
    ...(draft.biteIds != null ? { biteIds: draft.biteIds } : {}),
    ...(draft.loverIds != null ? { loverIds: draft.loverIds } : {}),
  });
  const onPick = (draft: NightDraft): PickResult => {
    const cur = pickFor(myData.nightPick, state.round);
    if (cur?.confirmed && !isWolfRole(myRole)) return { outcome: 'locked', write: null };
    const ok = (kind: Parameters<typeof isValidTarget>[2], id: string) => isValidTarget(table, ME, kind, id, { guardLast: myData.guardLast ?? null });
    const bad =
      (draft.targetId !== null && !ok(nightActionOf(myRole), draft.targetId)) ||
      (draft.biteIds != null && !(isWolfRole(myRole) && wolfBitesFor(table, state.round) === 2 && draft.biteIds.every((id) => ok('wolf', id)))) ||
      (draft.loverIds != null && !(cupidPairsTonight(myRole, state.round) && draft.loverIds.every((id) => ok('lover', id))));
    if (bad) return { outcome: 'invalid', write: null };
    setMine({ nightPick: nightPick(draft, false) });
    return { outcome: 'ok', write: Promise.resolve() };
  };
  const onConfirm = async (draft: NightDraft) => {
    if (cupidPairsTonight(myRole, state.round)) {
      const error = validateCupidPick(table, ME, draft.loverIds ?? [], state.round);
      if (error) return { outcome: 'invalid' as const, error };
    }
    const look = myRole === 'seer' && draft.targetId ? seerLook(table, ME, draft.targetId) : null;
    setMine({
      nightPick: nightPick(draft, true),
      ...(look ? { seerLog: [{ round: state.round, targetId: look.targetId, isWolf: look.isWolf }] } : {}),
    });
    return { outcome: 'ok' as const, error: null };
  };
  const witchDraft = (draft: WitchDraft): WitchResult => {
    const cur = pickFor(myData.witchPick, state.round);
    if (cur?.confirmed) return { outcome: 'locked', error: null, write: null };
    if (draft.guessId && !isValidTarget(table, ME, 'guess', draft.guessId)) return { outcome: 'invalid', error: null, write: null };
    if (myData.role === 'witch') {
      const error = validateWitchPick(table, ME, draft, attacksOf(state), potionsOf(myData));
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
            counts={state.roleCounts}
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
  extras = [],
}: {
  /** Số người trên bàn (5–12, mặc định 9): kiểm bố cục với ít / nhiều người. */
  count?: number;
  /**
   * Vai mở rộng thêm vào bàn (ghế Dân từ cuối bàn lên, cần ≥ 10 người): để đổi
   * vai người xem sang vai mở rộng mà bộ vai trên bàn không đổi (cặp ảnh riêng tư).
   */
  extras?: readonly WwRole[];
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
  return (
    <Screen
      key={`${scene}:${role}:${startAt}:${extras.join(',')}`}
      scene={scene}
      role={role}
      start={startAt}
      rules={rules}
      count={count}
      extras={extras}
      chrome={bar}
    />
  );
}
