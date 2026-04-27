'use client';

import type { Player } from '@/types/player';
import type { GameAction } from '@/types/actions';
import type { RoomGameState } from '@/types/room';
import {
  ClocktowerRole,
  ROLE_ICONS,
  ROLE_NAMES_VI,
  ROLE_TEAMS,
} from '@/types/games/clocktower';

interface NightTimelinePanelProps {
  players: Player[];
  pendingActions: GameAction[];
  resolvedActions: GameAction[];
  dayCount: number;
  gameState?: RoomGameState;
  resolveMessages: Record<string, string>;
  onResolveMessageChange: (id: string, val: string) => void;
  onResolve: (action: GameAction) => void;
}

// ─── Official Trouble Brewing night order ──────────────────────────────
const NIGHT_ORDER_FIRST: ClocktowerRole[] = [
  ClocktowerRole.Poisoner,
  ClocktowerRole.Washerwoman,
  ClocktowerRole.Librarian,
  ClocktowerRole.Investigator,
  ClocktowerRole.Chef,
  ClocktowerRole.Empath,
  ClocktowerRole.FortuneTeller,
  ClocktowerRole.Butler,
  ClocktowerRole.Spy,
];

const NIGHT_ORDER_OTHER: ClocktowerRole[] = [
  ClocktowerRole.Poisoner,
  ClocktowerRole.Monk,
  ClocktowerRole.ScarletWoman,
  ClocktowerRole.Imp,
  ClocktowerRole.Ravenkeeper,
  ClocktowerRole.Empath,
  ClocktowerRole.FortuneTeller,
  ClocktowerRole.Undertaker,
  ClocktowerRole.Butler,
  ClocktowerRole.Spy,
];

// Roles that are passive/conditional — no player submission required
const PASSIVE_ROLES = new Set<ClocktowerRole>([
  ClocktowerRole.ScarletWoman,
  ClocktowerRole.Ravenkeeper,
]);

// ─── Helpers ───────────────────────────────────────────────────────────

/** Find the player assigned to a given role (Drunk players match by drunkRole) */
function findPlayerForRole(role: ClocktowerRole, players: Player[]): Player | undefined {
  return players.find((p) => {
    if (p.isHost || !p.isAlive) return false;
    const isDrunk = p.gameData?.isDrunk === true;
    const drunkRole = p.gameData?.drunkRole as ClocktowerRole | undefined;
    if (isDrunk && drunkRole === role) return true;
    return (p.gameData?.role as ClocktowerRole) === role;
  });
}

/** Night order index for a given player's action (Drunk acts at drunkRole slot) */
function getNightOrderIndex(playerId: string, players: Player[], nightOrder: ClocktowerRole[]): number {
  const actor = players.find((p) => p.id === playerId);
  if (!actor) return 999;
  const isDrunk = actor.gameData?.isDrunk === true;
  const drunkRole = actor.gameData?.drunkRole as ClocktowerRole | undefined;
  const effectiveRole = isDrunk && drunkRole ? drunkRole : (actor.gameData?.role as ClocktowerRole | undefined);
  if (!effectiveRole) return 999;
  const idx = nightOrder.indexOf(effectiveRole);
  return idx === -1 ? 999 : idx;
}

/** Step number (1-based) for a role in the current night order */
function getStepNumber(playerId: string, players: Player[], nightOrder: ClocktowerRole[]): number {
  const idx = getNightOrderIndex(playerId, players, nightOrder);
  return idx === 999 ? 0 : idx + 1;
}

// ─── Stable seeded index ───────────────────────────────────────────────
function seededPick<T>(arr: T[], seed: string): T {
  const hash = seed.split('').reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) & 0xfffffff, 7);
  return arr[hash % arr.length];
}

// ─── Recommendation logic (unchanged) ─────────────────────────────────
function getRoleRec(
  role: ClocktowerRole,
  action: GameAction,
  actor: Player,
  target: Player | undefined,
  secondTarget: Player | undefined,
  targetRole: ClocktowerRole | undefined,
  secondTargetRole: ClocktowerRole | undefined,
  gamePlayers: Player[],
  isTargetProtected: boolean,
  allActions: GameAction[],
  gameState?: RoomGameState
): { emoji: string; lines: string[]; color: string } | null {
  if (role === ClocktowerRole.Poisoner && target) {
    return {
      emoji: '☠️',
      lines: [
        `${target.name} bị NHIỄM ĐỘC đêm nay và ngày mai.`,
        `→ Hệ thống tự đánh dấu Poisoned khi bạn xác nhận.`,
        `Nhớ đưa thông tin SAI cho mọi hành động của họ.`,
      ],
      color: 'text-purple-300 bg-purple-500/8 border-purple-500/20',
    };
  }
  if (role === ClocktowerRole.Monk && target) {
    return {
      emoji: '🛡️',
      lines: [
        `${target.name} được BẢO VỆ khỏi Quỷ đêm nay.`,
        `Nếu Imp tấn công họ → không ai chết.`,
      ],
      color: 'text-green-300 bg-green-500/8 border-green-500/20',
    };
  }
  if (role === ClocktowerRole.Imp && target) {
    if (action.targetId === action.playerId) {
      const minions = gamePlayers.filter(
        (p) => p.isAlive && ROLE_TEAMS[p.gameData?.role as ClocktowerRole] === 'minion'
      );
      return {
        emoji: '🔁',
        lines: [
          `Imp TỰ GIẾT! (Starpass)`,
          minions.length > 0
            ? `Tay Sai còn sống: ${minions.map((p) => `${p.name} (${p.gameData?.role})`).join(', ')}`
            : `⚠️ Không có Tay Sai — Imp chết, phe Thiện thắng!`,
          `Nhấn ✓ Xác nhận để mở giao diện chọn kế vị.`,
        ],
        color: 'text-orange-300 bg-orange-500/8 border-orange-500/20',
      };
    }
    if (isTargetProtected) {
      return {
        emoji: '✅',
        lines: [`${target.name} được Monk bảo vệ — KHÔNG AI CHẾT.`, `Không tiết lộ.`],
        color: 'text-green-300 bg-green-500/8 border-green-500/20',
      };
    }
    if (targetRole === ClocktowerRole.Soldier) {
      return {
        emoji: '🛡️',
        lines: [`${target.name} là SOLDIER — miễn nhiễm. KHÔNG AI CHẾT.`],
        color: 'text-cyan-300 bg-cyan-500/8 border-cyan-500/20',
      };
    }
    if (targetRole === ClocktowerRole.Ravenkeeper) {
      return {
        emoji: '🐦‍⬛',
        lines: [
          `${target.name} là RAVENKEEPER — họ sẽ chết đêm nay.`,
          `→ Nhấn nút "🐦‍⬛ Kích hoạt" trong Grimoire để đánh thức họ chọn người.`,
          `Sau khi Ravenkeeper chọn xong, xử lý hành động và gửi thông tin nhân vật.`,
        ],
        color: 'text-slate-300 bg-slate-500/8 border-slate-500/20',
      };
    }
    if (targetRole === ClocktowerRole.Mayor) {
      return {
        emoji: '👑',
        lines: [
          `${target.name} là MAYOR.`,
          `Có thể chuyển cái chết sang người khác (bạn chọn), hoặc để Mayor chết bình thường.`,
        ],
        color: 'text-amber-300 bg-amber-500/8 border-amber-500/20',
      };
    }
    return {
      emoji: '💀',
      lines: [`${target.name} SẼ CHẾT đêm nay.`, `Đánh dấu chết khi bắt đầu ngày.`],
      color: 'text-red-300 bg-red-500/8 border-red-500/20',
    };
  }
  if (role === ClocktowerRole.FortuneTeller) {
    const ftRedHerring = actor.gameData?.fortuneTellerRedHerring as string | undefined;
    const targets = [target, secondTarget].filter(Boolean);
    const targetNames = targets.map((t) => t!.name).join(' & ');
    const targetIds = [action.targetId, action.secondTargetId].filter(Boolean);
    const hasDemon = [targetRole, secondTargetRole].includes(ClocktowerRole.Imp);
    const hasRecluse = [targetRole, secondTargetRole].includes(ClocktowerRole.Recluse);
    const hasRedHerring = ftRedHerring && targetIds.includes(ftRedHerring);
    const redHerringPlayer = ftRedHerring ? gamePlayers.find((p) => p.id === ftRedHerring) : undefined;
    if (hasDemon) {
      return { emoji: '🔮', lines: [`[${targetNames}] — CÓ 1 người là Quỷ.`, `→ Trả lời: CÓ (Yes).`], color: 'text-red-300 bg-red-500/8 border-red-500/20' };
    }
    if (hasRecluse) {
      return { emoji: '🔮', lines: [`[${targetNames}] — Có Recluse (có thể đăng ký như Quỷ).`, `→ Có thể trả lời CÓ hoặc KHÔNG.`], color: 'text-indigo-300 bg-indigo-500/8 border-indigo-500/20' };
    }
    if (hasRedHerring) {
      return { emoji: '🔮', lines: [`[${targetNames}] — ${redHerringPlayer?.name} là mồi nhử của FT.`, `→ Trả lời: CÓ (Yes).`], color: 'text-indigo-300 bg-indigo-500/8 border-indigo-500/20' };
    }
    return { emoji: '🔮', lines: [`[${targetNames}] — Không có Quỷ hay mồi nhử.`, `→ Trả lời: KHÔNG (No).`], color: 'text-indigo-300 bg-indigo-500/8 border-indigo-500/20' };
  }
  if (role === ClocktowerRole.Spy) {
    const grimoire = gamePlayers
      .map((p) => {
        const pRole = p.gameData?.role as ClocktowerRole | undefined;
        const tags: string[] = [];
        if (p.gameData?.isDrunk) tags.push('🍺Drunk');
        if (p.gameData?.isPoisoned) tags.push('☠️Poisoned');
        if (!p.isAlive) tags.push('💀Dead');
        return `${p.name}: ${pRole ? ROLE_ICONS[pRole] : '?'}${pRole || '?'}${tags.length ? ` [${tags.join(',')}]` : ''}`;
      })
      .join('\n');
    return { emoji: '🕵️', lines: [`Cho Spy xem Grimoire:`, grimoire], color: 'text-slate-300 bg-slate-500/8 border-slate-500/20' };
  }
  if (role === ClocktowerRole.Empath) {
    const aliveSorted = gamePlayers
      .filter((p) => p.isAlive)
      .sort((a, b) => ((a.gameData?.seatNumber as number) ?? 0) - ((b.gameData?.seatNumber as number) ?? 0));
    const myIndex = aliveSorted.findIndex((p) => p.id === actor.id);
    if (myIndex === -1 || aliveSorted.length < 2) {
      return { emoji: '💗', lines: ['Không đủ người để tính hàng xóm.'], color: 'text-pink-300 bg-pink-500/8 border-pink-500/20' };
    }
    const left = aliveSorted[(myIndex - 1 + aliveSorted.length) % aliveSorted.length];
    const right = aliveSorted[(myIndex + 1) % aliveSorted.length];
    const leftRole = left?.gameData?.role as ClocktowerRole | undefined;
    const rightRole = right?.gameData?.role as ClocktowerRole | undefined;
    const leftEvil = leftRole ? (ROLE_TEAMS[leftRole] === 'minion' || ROLE_TEAMS[leftRole] === 'demon') : false;
    const rightEvil = rightRole ? (ROLE_TEAMS[rightRole] === 'minion' || ROLE_TEAMS[rightRole] === 'demon') : false;
    const evilCount = [leftEvil, rightEvil].filter(Boolean).length;
    const notes: string[] = [];
    if (leftRole === ClocktowerRole.Recluse || rightRole === ClocktowerRole.Recluse) notes.push('Recluse có thể đăng ký như ác → có thể tăng số lên 1.');
    if (leftRole === ClocktowerRole.Spy || rightRole === ClocktowerRole.Spy) notes.push('Spy có thể đăng ký như thiện → có thể giảm số xuống 1.');
    return {
      emoji: '💗',
      lines: [`← ${left?.name || '?'} (${leftRole || '?'})  |  ${right?.name || '?'} (${rightRole || '?'}) →`, `→ Trả lời: ${evilCount} hàng xóm ác.`, ...notes],
      color: 'text-pink-300 bg-pink-500/8 border-pink-500/20',
    };
  }
  if (role === ClocktowerRole.Washerwoman) {
    const townsfolk = gamePlayers.filter((p) => p.isAlive && ROLE_TEAMS[p.gameData?.role as ClocktowerRole] === 'townsfolk');
    if (townsfolk.length === 0) return { emoji: '🧺', lines: ['Không có Townsfolk nào còn sống.'], color: 'text-blue-300 bg-blue-500/8 border-blue-500/20' };
    const real = seededPick(townsfolk, action.id + 'real');
    const decoyPool = gamePlayers.filter((p) => p.id !== real.id);
    const decoy = decoyPool.length > 0 ? seededPick(decoyPool, action.id + 'decoy') : null;
    return { emoji: '🧺', lines: [`Chỉ: "${real.name}" và "${decoy?.name || '?'}"`, `→ Nói: "Một trong hai là ${real.gameData?.role}."`], color: 'text-blue-300 bg-blue-500/8 border-blue-500/20' };
  }
  if (role === ClocktowerRole.Librarian) {
    const outsiders = gamePlayers.filter((p) => p.isAlive && ROLE_TEAMS[p.gameData?.role as ClocktowerRole] === 'outsider');
    if (outsiders.length === 0) return { emoji: '📚', lines: ['Không có Outsider trong ván.', `→ Trả lời: "Không có Outsider nào."`], color: 'text-blue-300 bg-blue-500/8 border-blue-500/20' };
    const real = seededPick(outsiders, action.id + 'real');
    const decoyPool = gamePlayers.filter((p) => p.id !== real.id);
    const decoy = decoyPool.length > 0 ? seededPick(decoyPool, action.id + 'decoy') : null;
    const shownRole = real.gameData?.isDrunk === true ? ClocktowerRole.Drunk : (real.gameData?.role as ClocktowerRole);
    return { emoji: '📚', lines: [`Chỉ: "${real.name}" và "${decoy?.name || '?'}"`, `→ Nói: "Một trong hai là ${shownRole}."`], color: 'text-blue-300 bg-blue-500/8 border-blue-500/20' };
  }
  if (role === ClocktowerRole.Investigator) {
    const minions = gamePlayers.filter((p) => p.isAlive && ROLE_TEAMS[p.gameData?.role as ClocktowerRole] === 'minion');
    if (minions.length === 0) return { emoji: '🔍', lines: ['Không có Minion trong ván.'], color: 'text-blue-300 bg-blue-500/8 border-blue-500/20' };
    const real = seededPick(minions, action.id + 'real');
    const decoyPool = gamePlayers.filter((p) => p.id !== real.id);
    const decoy = decoyPool.length > 0 ? seededPick(decoyPool, action.id + 'decoy') : null;
    const notes: string[] = [];
    if (real.gameData?.role === ClocktowerRole.Spy) notes.push('Spy có thể đăng ký như Townsfolk/Outsider.');
    return { emoji: '🔍', lines: [`Chỉ: "${real.name}" và "${decoy?.name || '?'}"`, `→ Nói: "Một trong hai là ${real.gameData?.role}."`, ...notes], color: 'text-blue-300 bg-blue-500/8 border-blue-500/20' };
  }
  if (role === ClocktowerRole.Chef) {
    const bySeat = [...gamePlayers].sort((a, b) => ((a.gameData?.seatNumber as number) ?? 0) - ((b.gameData?.seatNumber as number) ?? 0));
    let evilPairs = 0;
    for (let i = 0; i < bySeat.length; i++) {
      const a = bySeat[i];
      const b = bySeat[(i + 1) % bySeat.length];
      const aRole = a.gameData?.role as ClocktowerRole | undefined;
      const bRole = b.gameData?.role as ClocktowerRole | undefined;
      const aEvil = aRole ? (ROLE_TEAMS[aRole] === 'minion' || ROLE_TEAMS[aRole] === 'demon') : false;
      const bEvil = bRole ? (ROLE_TEAMS[bRole] === 'minion' || ROLE_TEAMS[bRole] === 'demon') : false;
      if (aEvil && bEvil) evilPairs++;
    }
    const seatList = bySeat.map((p) => `${p.gameData?.seatNumber ?? '?'}.${p.name}`).join(' → ');
    return { emoji: '👨‍🍳', lines: [`Vòng: ${seatList}`, `Cặp ác ngồi cạnh nhau: ${evilPairs}`, `→ Trả lời: ${evilPairs}.`], color: 'text-yellow-300 bg-yellow-500/8 border-yellow-500/20' };
  }
  if (role === ClocktowerRole.Undertaker) {
    const lastRole = gameState?.lastExecutedRole;
    const lastId = gameState?.lastExecutedPlayerId;
    const lastPlayer = lastId ? gamePlayers.find((p) => p.id === lastId) : null;
    if (!lastRole && !lastPlayer) {
      return { emoji: '⚰️', lines: ['Chưa có ai bị xử tử hôm nay.', `→ Không có thông tin cho Undertaker.`], color: 'text-slate-300 bg-slate-500/8 border-slate-500/20' };
    }
    return { emoji: '⚰️', lines: [`Người bị xử tử: ${lastPlayer?.name || '?'}`, `Nhân vật thật: ${lastRole || '?'}`, `→ Trả lời: "${lastRole}".`], color: 'text-slate-300 bg-slate-500/8 border-slate-500/20' };
  }
  if (role === ClocktowerRole.Ravenkeeper && target) {
    const trueRole = target.gameData?.role as ClocktowerRole | undefined;
    const trueRoleIcon = trueRole ? ROLE_ICONS[trueRole] : '?';
    return {
      emoji: '🐦‍⬛',
      lines: [
        `${actor.name} (Ravenkeeper) muốn biết nhân vật của ${target.name}.`,
        `Nhân vật thật: ${trueRoleIcon} ${trueRole || '?'}`,
        `→ Nhắn riêng: "${target.name} là ${trueRole || '?'}."`,
        `✅ Gửi tin xong → bấm 💀 trong Grimoire để đánh dấu Ravenkeeper chết.`,
      ],
      color: 'text-slate-300 bg-slate-500/8 border-slate-500/20',
    };
  }
  if (role === ClocktowerRole.Butler && target) {
    return {
      emoji: '🎩',
      lines: [
        `${actor.name} chọn ${target.name} làm chủ.`,
        `Ngày mai Butler chỉ được bỏ phiếu nếu ${target.name} bỏ phiếu trước.`,
      ],
      color: 'text-teal-300 bg-teal-500/8 border-teal-500/20',
    };
  }
  return null;
}

function getRecommendation(
  action: GameAction,
  players: Player[],
  allActions: GameAction[],
  gameState?: RoomGameState
): { emoji: string; lines: string[]; color: string } | null {
  const actor = players.find((p) => p.id === action.playerId);
  const target = players.find((p) => p.id === action.targetId);
  const secondTarget = players.find((p) => p.id === action.secondTargetId);
  if (!actor) return null;

  const role = actor.gameData?.role as ClocktowerRole | undefined;
  const isDrunk = actor.gameData?.isDrunk === true;
  const drunkRole = actor.gameData?.drunkRole as ClocktowerRole | undefined;
  const targetRole = target?.gameData?.role as ClocktowerRole | undefined;
  const secondTargetRole = secondTarget?.gameData?.role as ClocktowerRole | undefined;
  const isPoisoned = actor.gameData?.isPoisoned === true;

  const monkAction = allActions.find((a) => {
    const monkActor = players.find((p) => p.id === a.playerId);
    return monkActor?.gameData?.role === ClocktowerRole.Monk && a.targetId === action.targetId;
  });
  const isTargetProtected = !!monkAction;
  const gamePlayers = players.filter((p) => !p.isHost);
  const effectiveRole = isDrunk && drunkRole ? drunkRole : role;
  if (!effectiveRole) return null;

  const baseRec = getRoleRec(effectiveRole, action, actor, target, secondTarget, targetRole, secondTargetRole, gamePlayers, isTargetProtected, allActions, gameState);

  if (isDrunk && drunkRole) {
    return {
      emoji: '🍺',
      lines: [
        `⚠️ ${actor.name} là KẺ SAY RƯỢU — nghĩ là ${drunkRole}`,
        `Kêu theo thứ tự ${drunkRole} · Đưa thông tin SAI:`,
        ...(baseRec?.lines ?? [`Đưa thông tin GIẢ như ${drunkRole} thật.`]),
      ],
      color: 'text-amber-300 bg-amber-500/8 border-amber-500/20',
    };
  }
  if (isPoisoned && role) {
    return {
      emoji: '🤢',
      lines: [
        `⚠️ ${actor.name} (${role}) bị NHIỄM ĐỘC — Đưa thông tin SAI:`,
        ...(baseRec?.lines ?? [`Đưa thông tin GIẢ cho ${role} đêm nay.`]),
      ],
      color: 'text-green-300 bg-green-500/8 border-green-500/20',
    };
  }
  return baseRec;
}

// ─── Resolved action verb ─────────────────────────────────────────────
function getResolvedVerb(
  effectiveRole: ClocktowerRole | undefined,
  action: GameAction
): { verb: string; verbColor: string; isInfoOnly: boolean } {
  switch (effectiveRole) {
    case ClocktowerRole.Poisoner:
      return { verb: 'đầu độc', verbColor: 'text-purple-400', isInfoOnly: false };
    case ClocktowerRole.Monk:
      return { verb: 'bảo vệ', verbColor: 'text-green-400', isInfoOnly: false };
    case ClocktowerRole.Imp:
      if (action.targetId === action.playerId)
        return { verb: 'tự giết → Starpass', verbColor: 'text-orange-400', isInfoOnly: false };
      return { verb: 'giết', verbColor: 'text-red-400', isInfoOnly: false };
    case ClocktowerRole.Butler:
      return { verb: 'chọn chủ nhân', verbColor: 'text-teal-400', isInfoOnly: false };
    case ClocktowerRole.FortuneTeller:
      return { verb: 'kiểm tra', verbColor: 'text-indigo-400', isInfoOnly: false };
    case ClocktowerRole.Empath:
      return { verb: 'nhận thông tin hàng xóm', verbColor: 'text-pink-400', isInfoOnly: true };
    case ClocktowerRole.Chef:
      return { verb: 'nhận thông tin cặp ác', verbColor: 'text-yellow-400', isInfoOnly: true };
    case ClocktowerRole.Undertaker:
      return { verb: 'nhận thông tin xử tử', verbColor: 'text-slate-400', isInfoOnly: true };
    case ClocktowerRole.Washerwoman:
      return { verb: 'nhận thông tin Townsfolk', verbColor: 'text-blue-400', isInfoOnly: true };
    case ClocktowerRole.Librarian:
      return { verb: 'nhận thông tin Outsider', verbColor: 'text-blue-400', isInfoOnly: true };
    case ClocktowerRole.Investigator:
      return { verb: 'nhận thông tin Minion', verbColor: 'text-blue-400', isInfoOnly: true };
    case ClocktowerRole.Spy:
      return { verb: 'xem Grimoire', verbColor: 'text-slate-400', isInfoOnly: true };
    case ClocktowerRole.Ravenkeeper:
      return { verb: 'xem nhân vật trước khi chết', verbColor: 'text-slate-300', isInfoOnly: false };
    default:
      return { verb: 'sử dụng kỹ năng', verbColor: 'text-slate-500', isInfoOnly: false };
  }
}

// ─── Night Order Tracker ───────────────────────────────────────────────
type SlotStatus = 'resolved' | 'submitted' | 'waiting' | 'passive';

interface NightSlot {
  role: ClocktowerRole;
  player: Player | undefined;
  status: SlotStatus;
  step: number;
}

function NightOrderTracker({
  players,
  pendingActions,
  resolvedActions,
  dayCount,
}: {
  players: Player[];
  pendingActions: GameAction[];
  resolvedActions: GameAction[];
  dayCount: number;
}) {
  const nightOrder = dayCount === 0 ? NIGHT_ORDER_FIRST : NIGHT_ORDER_OTHER;

  const slots: NightSlot[] = nightOrder
    .flatMap((role, idx) => {
      const player = findPlayerForRole(role, players);
      if (!player) return [];

      const isPassive = PASSIVE_ROLES.has(role);
      const isResolved = resolvedActions.some((a) => a.playerId === player.id);
      const isSubmitted = pendingActions.some((a) => a.playerId === player.id);

      // submitted/resolved always take precedence over passive so triggered
      // Ravenkeeper actions surface correctly even though Ravenkeeper is in PASSIVE_ROLES
      let status: SlotStatus;
      if (isResolved) status = 'resolved';
      else if (isSubmitted) status = 'submitted';
      else if (isPassive) status = 'passive';
      else status = 'waiting';

      return [{ role, player, status, step: idx + 1 }];
    });

  if (slots.length === 0) return null;

  const resolvedCount = slots.filter((s) => s.status === 'resolved').length;
  const actionableCount = slots.filter((s) => s.status !== 'passive').length;

  return (
    <div className="rounded-xl border border-white/10 bg-black/25 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/8">
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
          🌙 Thứ tự đêm {dayCount === 0 ? '1' : `${dayCount + 1}`}
        </span>
        <span className="text-[11px] font-bold text-slate-400">
          <span className="text-green-400">{resolvedCount}</span>
          <span className="text-slate-600">/{actionableCount}</span>
          <span className="text-slate-600 ml-1">hoàn thành</span>
        </span>
      </div>

      {/* Slots — horizontal scroll */}
      <div className="overflow-x-auto px-3 py-3">
        <div className="flex items-center gap-1.5 min-w-max">
          {slots.map((slot, idx) => {
            const isDrunkHere = slot.player?.gameData?.isDrunk === true;

            // Visual config per status
            const cfg = {
              resolved: {
                wrap: 'border-green-500/40 bg-green-950/40',
                dot: <span className="text-green-400 text-[10px] font-black leading-none">✓</span>,
                name: 'text-green-300',
                step: 'text-green-600',
              },
              submitted: {
                wrap: 'border-amber-500/50 bg-amber-950/40',
                dot: (
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                  </span>
                ),
                name: 'text-amber-200',
                step: 'text-amber-600',
              },
              waiting: {
                wrap: 'border-white/10 bg-white/[0.03]',
                dot: <span className="h-1.5 w-1.5 rounded-full bg-slate-600 shrink-0" />,
                name: 'text-slate-400',
                step: 'text-slate-700',
              },
              passive: {
                wrap: 'border-white/5 bg-white/[0.02] opacity-60',
                dot: <span className="h-1.5 w-1.5 rounded-full bg-slate-700 shrink-0" />,
                name: 'text-slate-600',
                step: 'text-slate-800',
              },
            }[slot.status];

            return (
              <div key={slot.role} className="flex items-center gap-1">
                <div className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-1.5 min-w-[62px] text-center ${cfg.wrap}`}>
                  {/* Step + status dot row */}
                  <div className="flex items-center gap-1 w-full justify-between">
                    <span className={`text-[9px] font-black ${cfg.step}`}>{slot.step}</span>
                    {cfg.dot}
                  </div>
                  {/* Role icon */}
                  <span className="text-base leading-none">{ROLE_ICONS[slot.role]}</span>
                  {/* Player name */}
                  <span className={`text-[10px] font-semibold leading-tight truncate w-full text-center ${cfg.name}`}>
                    {slot.player?.name ?? slot.role}
                  </span>
                  {isDrunkHere && (
                    <span className="text-[8px] text-amber-500 font-bold leading-none">🍺 say</span>
                  )}
                  {slot.status === 'passive' && (
                    <span className="text-[8px] text-slate-700 italic leading-none">passif</span>
                  )}
                </div>
                {idx < slots.length - 1 && (
                  <span className="text-slate-700 text-[10px] shrink-0">›</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Main Panel ────────────────────────────────────────────────────────
export default function NightTimelinePanel({
  players,
  pendingActions,
  resolvedActions,
  dayCount,
  gameState,
  resolveMessages,
  onResolveMessageChange,
  onResolve,
}: NightTimelinePanelProps) {
  const allActions = [...pendingActions, ...resolvedActions];
  const nightOrder = dayCount === 0 ? NIGHT_ORDER_FIRST : NIGHT_ORDER_OTHER;

  // Sort pending actions by night order — host processes them in sequence
  const sortedPending = [...pendingActions].sort(
    (a, b) =>
      getNightOrderIndex(a.playerId, players, nightOrder) -
      getNightOrderIndex(b.playerId, players, nightOrder)
  );

  // Sort resolved log by night order too (consistent ordering)
  const sortedResolved = [...resolvedActions].sort(
    (a, b) =>
      getNightOrderIndex(a.playerId, players, nightOrder) -
      getNightOrderIndex(b.playerId, players, nightOrder)
  );

  return (
    <div className="space-y-4">

      {/* ── Night Order Tracker ──────────────────────────────────────── */}
      <NightOrderTracker
        players={players}
        pendingActions={pendingActions}
        resolvedActions={resolvedActions}
        dayCount={dayCount}
      />

      {/* ── Pending Actions ──────────────────────────────────────────── */}
      <div>
        {/* Section header */}
        <div className="flex items-center gap-2 mb-3">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
          </span>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
            Chờ xử lý
          </h3>
          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-black text-amber-400">
            {pendingActions.length}
          </span>
          {pendingActions.length > 0 && (
            <span className="text-[10px] text-slate-600 ml-auto">sắp theo thứ tự gọi đêm</span>
          )}
        </div>

        {/* Empty state */}
        {sortedPending.length === 0 && (
          <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center">
            <p className="text-sm text-slate-600">Đang chờ người chơi nộp hành động...</p>
          </div>
        )}

        {/* Action cards */}
        <div className="space-y-3">
          {sortedPending.map((action) => {
            const actor = players.find((p) => p.id === action.playerId);
            const role = actor?.gameData?.role as ClocktowerRole | undefined;
            const isDrunk = actor?.gameData?.isDrunk === true;
            const isPoisoned = actor?.gameData?.isPoisoned === true;
            const drunkRole = actor?.gameData?.drunkRole as ClocktowerRole | undefined;
            const displayRole = isDrunk && drunkRole ? drunkRole : role;
            const step = getStepNumber(action.playerId, players, nightOrder);
            const rec = getRecommendation(action, players, allActions, gameState);

            return (
              <div
                key={action.id}
                className="rounded-xl border border-amber-500/15 bg-gradient-to-b from-amber-950/20 to-slate-900/40 overflow-hidden"
              >
                {/* Card header */}
                <div className="flex items-center gap-2.5 px-3.5 py-3 border-b border-white/5">
                  {/* Step badge */}
                  {step > 0 && (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-amber-500/20 text-[11px] font-black text-amber-400 border border-amber-500/30">
                      {step}
                    </span>
                  )}
                  {/* Role icon */}
                  {displayRole && (
                    <span className="text-xl shrink-0 leading-none">{ROLE_ICONS[displayRole]}</span>
                  )}
                  {/* Name + role */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-white text-sm leading-tight">{action.playerName}</span>
                      {isDrunk && (
                        <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-black text-amber-400">🍺 SAY</span>
                      )}
                      {isPoisoned && (
                        <span className="rounded-full bg-purple-500/20 px-1.5 py-0.5 text-[9px] font-black text-purple-400">☠️ ĐỘC</span>
                      )}
                    </div>
                    {role && (
                      <span className="text-[11px] text-slate-500 leading-none">
                        {String(role)}
                        {isDrunk && drunkRole && <span className="text-amber-600"> · nghĩ là {drunkRole}</span>}
                      </span>
                    )}
                  </div>
                  {/* Target(s) */}
                  {(action.targetName || action.secondTargetName) ? (
                    <div className="shrink-0 flex items-center gap-1 text-xs">
                      <span className="text-slate-600">→</span>
                      <span className="font-semibold text-white">
                        {action.targetName}
                        {action.secondTargetName && (
                          <span className="text-cyan-300"> & {action.secondTargetName}</span>
                        )}
                      </span>
                    </div>
                  ) : (
                    <span className="shrink-0 text-[10px] text-slate-600 italic">Chờ thông tin từ ST</span>
                  )}
                </div>

                {/* Recommendation */}
                {rec && (
                  <div className={`mx-3.5 mt-3 rounded-lg border px-3 py-2.5 text-xs space-y-1 ${rec.color}`}>
                    <p className="font-bold text-[11px] uppercase tracking-wide opacity-70">{rec.emoji} Gợi ý Storyteller</p>
                    {rec.lines.map((line, i) => (
                      <p key={i} className={i === 0 ? 'font-semibold' : 'opacity-80'}>{line}</p>
                    ))}
                  </div>
                )}

                {/* Input + confirm */}
                <div className="flex gap-2 px-3.5 py-3">
                  <input
                    type="text"
                    value={resolveMessages[action.id] || ''}
                    onChange={(e) => onResolveMessageChange(action.id, e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') onResolve(action); }}
                    placeholder="Thông tin gửi cho người chơi... (Enter để gửi)"
                    className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white placeholder-slate-600 outline-none focus:border-amber-500/50 focus:bg-black/40 transition-colors"
                  />
                  <button
                    onClick={() => onResolve(action)}
                    className="shrink-0 rounded-lg bg-amber-600 px-4 py-2 text-xs font-black text-white transition-all hover:bg-amber-500 active:scale-95 shadow-lg shadow-amber-500/20"
                    id={`resolve-${action.id}`}
                  >
                    ✓ Xác nhận
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Resolved log ─────────────────────────────────────────────── */}
      {sortedResolved.length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <span className="h-2 w-2 rounded-full bg-green-700 shrink-0" />
            Đã xử lý
            <span className="rounded-full bg-green-900/60 border border-green-700/30 px-2 py-0.5 text-[10px] font-black text-green-600">
              {sortedResolved.length}
            </span>
          </h3>

          <div className="space-y-2">
            {sortedResolved.map((action) => {
              const actor = players.find((p) => p.id === action.playerId);
              const role = actor?.gameData?.role as ClocktowerRole | undefined;
              const isDrunk = actor?.gameData?.isDrunk === true;
              const drunkRole = actor?.gameData?.drunkRole as ClocktowerRole | undefined;
              const isPoisoned = actor?.gameData?.isPoisoned === true;
              const effectiveRole = isDrunk && drunkRole ? drunkRole : role;

              const target = players.find((p) => p.id === action.targetId);
              const targetRole = target?.gameData?.role as ClocktowerRole | undefined;
              const secondTarget = players.find((p) => p.id === action.secondTargetId);
              const secondTargetRole = secondTarget?.gameData?.role as ClocktowerRole | undefined;

              const step = getStepNumber(action.playerId, players, nightOrder);
              const { verb, verbColor, isInfoOnly } = getResolvedVerb(effectiveRole, action);
              const hasMessage = action.result?.message && action.result.message !== 'Không có thông tin.';

              return (
                <div
                  key={action.id}
                  className="rounded-xl border border-green-500/10 bg-gradient-to-b from-green-950/15 to-slate-900/20 overflow-hidden"
                >
                  {/* ── Actor row ── */}
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5">
                    {/* Step badge */}
                    {step > 0 && (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-green-900/60 border border-green-700/30 text-[9px] font-black text-green-600">
                        {step}
                      </span>
                    )}
                    {/* Role icon */}
                    {effectiveRole && (
                      <span className="text-lg leading-none shrink-0">{ROLE_ICONS[effectiveRole]}</span>
                    )}
                    {/* Name · role */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-300 leading-tight">{action.playerName}</span>
                        {role && (
                          <span className="text-[10px] text-slate-600">· {String(role)}</span>
                        )}
                        {isDrunk && (
                          <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[8px] font-black text-amber-500">🍺 say</span>
                        )}
                        {isPoisoned && (
                          <span className="rounded-full bg-purple-500/15 px-1.5 py-0.5 text-[8px] font-black text-purple-400">☠️ độc</span>
                        )}
                      </div>
                    </div>
                    <span className="shrink-0 text-[10px] font-black text-green-600">✓</span>
                  </div>

                  {/* ── Action summary row ── */}
                  <div className="px-3 py-2 space-y-1.5">
                    {/* Verb + targets */}
                    <div className="flex items-center gap-1.5 flex-wrap text-xs">
                      <span className={`font-bold ${verbColor}`}>{verb}</span>

                      {/* Targets (for non-info-only roles) */}
                      {!isInfoOnly && action.targetName && (
                        <>
                          <span className="text-slate-700">→</span>
                          {/* Target 1 */}
                          <div className="flex items-center gap-1">
                            {targetRole && (
                              <span className="text-sm leading-none">{ROLE_ICONS[targetRole]}</span>
                            )}
                            <span className="font-semibold text-white">{action.targetName}</span>
                            {targetRole && (
                              <span className="text-[10px] text-slate-500">({String(targetRole)})</span>
                            )}
                          </div>
                          {/* Target 2 (FortuneTeller dual-pick) */}
                          {action.secondTargetName && (
                            <>
                              <span className="text-slate-600">&amp;</span>
                              <div className="flex items-center gap-1">
                                {secondTargetRole && (
                                  <span className="text-sm leading-none">{ROLE_ICONS[secondTargetRole]}</span>
                                )}
                                <span className="font-semibold text-cyan-300">{action.secondTargetName}</span>
                                {secondTargetRole && (
                                  <span className="text-[10px] text-slate-500">({String(secondTargetRole)})</span>
                                )}
                              </div>
                            </>
                          )}
                        </>
                      )}
                    </div>

                    {/* Message sent to player */}
                    {hasMessage && (
                      <div className="flex items-start gap-1.5 rounded-lg bg-black/20 border border-white/5 px-2.5 py-1.5">
                        <span className="text-[11px] text-slate-600 shrink-0 mt-px">💬</span>
                        <p className="text-[11px] text-slate-400 italic leading-relaxed">
                          "{action.result!.message}"
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
