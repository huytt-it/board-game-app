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

// ─── Recommendation return type ────────────────────────────────────────
interface RoleRec {
  emoji: string;
  lines: string[];
  color: string;
  /** Pre-filled message for the resolve input */
  suggestedMessage?: string;
  /** Quick-tap answer buttons (e.g. CÓ / KHÔNG) */
  quickAnswers?: Array<{ label: string; value: string; style: string }>;
}

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

const YES_NO_BUTTONS: Array<{ label: string; value: string; style: string }> = [
  { label: '✅ CÓ', value: 'CÓ', style: 'bg-green-700/80 hover:bg-green-600 border-green-600/40 text-green-100' },
  { label: '❌ KHÔNG', value: 'KHÔNG', style: 'bg-red-800/80 hover:bg-red-700 border-red-700/40 text-red-100' },
];
const YES_NO_BUTTONS_FLIPPED: Array<{ label: string; value: string; style: string }> = [
  { label: '✅ CÓ', value: 'CÓ', style: 'bg-red-800/80 hover:bg-red-700 border-red-700/40 text-red-100' },
  { label: '❌ KHÔNG', value: 'KHÔNG', style: 'bg-green-700/80 hover:bg-green-600 border-green-600/40 text-green-100' },
];

// ─── Core recommendation per role ─────────────────────────────────────
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
): RoleRec | null {

  // ── Poisoner ──────────────────────────────────────────────────────
  if (role === ClocktowerRole.Poisoner && target) {
    return {
      emoji: '☠️',
      lines: [
        `${target.name} bị NHIỄM ĐỘC đêm nay và suốt ngày mai.`,
        `Hệ thống tự đánh dấu Poisoned khi bạn xác nhận.`,
        `Nhớ trả lời SAI mọi thông tin cho họ trong đêm này.`,
      ],
      color: 'text-purple-300 bg-purple-500/8 border-purple-500/20',
    };
  }

  // ── Monk ──────────────────────────────────────────────────────────
  if (role === ClocktowerRole.Monk && target) {
    return {
      emoji: '🛡️',
      lines: [
        `${target.name} được BẢO VỆ khỏi Quỷ đêm nay.`,
        `Nếu Imp tấn công họ → không ai chết đêm nay.`,
      ],
      color: 'text-green-300 bg-green-500/8 border-green-500/20',
    };
  }

  // ── Imp ───────────────────────────────────────────────────────────
  if (role === ClocktowerRole.Imp && target) {
    if (action.targetId === action.playerId) {
      const minions = gamePlayers.filter(
        (p) => p.isAlive && ROLE_TEAMS[p.gameData?.role as ClocktowerRole] === 'minion'
      );
      return {
        emoji: '🔁',
        lines: [
          `${actor.name} (Imp) TỰ GIẾT — Starpass!`,
          minions.length > 0
            ? `Tay Sai còn sống: ${minions.map((p) => `${p.name} (${p.gameData?.role})`).join(', ')}`
            : `⚠️ Không có Tay Sai — Imp chết, phe Thiện thắng!`,
          `Nhấn ✓ Xác nhận để mở giao diện chọn Tay Sai kế vị.`,
        ],
        color: 'text-orange-300 bg-orange-500/8 border-orange-500/20',
      };
    }
    if (isTargetProtected) {
      return {
        emoji: '🛡️',
        lines: [
          `${target.name} được Monk bảo vệ — KHÔNG AI CHẾT đêm nay.`,
          `Không tiết lộ gì cho người chơi.`,
        ],
        color: 'text-green-300 bg-green-500/8 border-green-500/20',
      };
    }
    if (targetRole === ClocktowerRole.Soldier) {
      return {
        emoji: '🪖',
        lines: [`${target.name} là SOLDIER — miễn nhiễm với Quỷ. KHÔNG AI CHẾT.`],
        color: 'text-cyan-300 bg-cyan-500/8 border-cyan-500/20',
      };
    }
    if (targetRole === ClocktowerRole.Ravenkeeper) {
      return {
        emoji: '🐦‍⬛',
        lines: [
          `${target.name} là RAVENKEEPER — họ sẽ chết và được chọn người xem nhân vật.`,
          `→ Nhấn nút "🐦‍⬛ Kích hoạt" trong Grimoire để đánh thức Ravenkeeper.`,
          `Sau khi Ravenkeeper nộp hành động, xử lý → rồi bấm 💀 đánh dấu họ chết.`,
        ],
        color: 'text-slate-300 bg-slate-500/8 border-slate-500/20',
      };
    }
    if (targetRole === ClocktowerRole.Mayor) {
      return {
        emoji: '👑',
        lines: [
          `${target.name} là MAYOR.`,
          `Quản trò chọn: để Mayor chết bình thường, hoặc chuyển cái chết sang người khác.`,
        ],
        color: 'text-amber-300 bg-amber-500/8 border-amber-500/20',
      };
    }
    return {
      emoji: '💀',
      lines: [
        `${target.name} SẼ CHẾT đêm nay.`,
        `→ Sáng mai bấm 💀 trong Grimoire để đánh dấu họ chết.`,
      ],
      color: 'text-red-300 bg-red-500/8 border-red-500/20',
    };
  }

  // ── Fortune Teller ────────────────────────────────────────────────
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
      return {
        emoji: '🔮',
        lines: [`[${targetNames}] — CÓ 1 người là Quỷ Dữ.`, `→ Trả lời: CÓ`],
        color: 'text-red-300 bg-red-500/8 border-red-500/20',
        suggestedMessage: 'CÓ',
        quickAnswers: YES_NO_BUTTONS,
      };
    }
    if (hasRecluse) {
      return {
        emoji: '🔮',
        lines: [
          `[${targetNames}] — Có Recluse (có thể đăng ký như Quỷ).`,
          `→ Bạn có thể chọn: CÓ hoặc KHÔNG`,
        ],
        color: 'text-indigo-300 bg-indigo-500/8 border-indigo-500/20',
        quickAnswers: YES_NO_BUTTONS,
      };
    }
    if (hasRedHerring) {
      return {
        emoji: '🔮',
        lines: [
          `[${targetNames}] — ${redHerringPlayer?.name} là mồi nhử đã gán cho FT.`,
          `→ Trả lời: CÓ (mồi nhử kích hoạt)`,
        ],
        color: 'text-indigo-300 bg-indigo-500/8 border-indigo-500/20',
        suggestedMessage: 'CÓ',
        quickAnswers: YES_NO_BUTTONS,
      };
    }
    return {
      emoji: '🔮',
      lines: [`[${targetNames}] — Không có Quỷ hay mồi nhử.`, `→ Trả lời: KHÔNG`],
      color: 'text-indigo-300 bg-indigo-500/8 border-indigo-500/20',
      suggestedMessage: 'KHÔNG',
      quickAnswers: YES_NO_BUTTONS,
    };
  }

  // ── Spy ───────────────────────────────────────────────────────────
  if (role === ClocktowerRole.Spy) {
    const grimoire = gamePlayers
      .sort((a, b) => ((a.gameData?.seatNumber as number) ?? 0) - ((b.gameData?.seatNumber as number) ?? 0))
      .map((p) => {
        const pRole = p.gameData?.role as ClocktowerRole | undefined;
        const tags: string[] = [];
        if (p.gameData?.isDrunk) tags.push('SAY');
        if (p.gameData?.isPoisoned) tags.push('ĐỘC');
        if (!p.isAlive) tags.push('CHẾT');
        const seat = p.gameData?.seatNumber ? `#${p.gameData.seatNumber} ` : '';
        return `${seat}${p.name}: ${pRole ? ROLE_ICONS[pRole] : '?'} ${pRole || '?'}${tags.length ? ` [${tags.join(', ')}]` : ''}`;
      })
      .join('\n');
    return {
      emoji: '🕵️',
      lines: [`Cho ${actor.name} (Spy) xem Grimoire trực tiếp.`, `Hoặc đọc to nội dung sau:`],
      color: 'text-slate-300 bg-slate-500/8 border-slate-500/20',
      suggestedMessage: grimoire,
    };
  }

  // ── Empath ────────────────────────────────────────────────────────
  if (role === ClocktowerRole.Empath) {
    const aliveSorted = gamePlayers
      .filter((p) => p.isAlive)
      .sort((a, b) => ((a.gameData?.seatNumber as number) ?? 0) - ((b.gameData?.seatNumber as number) ?? 0));
    const myIndex = aliveSorted.findIndex((p) => p.id === actor.id);
    if (myIndex === -1 || aliveSorted.length < 2) {
      return {
        emoji: '💗',
        lines: ['Không đủ người để tính hàng xóm Empath.'],
        color: 'text-pink-300 bg-pink-500/8 border-pink-500/20',
        suggestedMessage: '0',
      };
    }
    const left = aliveSorted[(myIndex - 1 + aliveSorted.length) % aliveSorted.length];
    const right = aliveSorted[(myIndex + 1) % aliveSorted.length];
    const leftRole = left?.gameData?.role as ClocktowerRole | undefined;
    const rightRole = right?.gameData?.role as ClocktowerRole | undefined;
    const isEvilRole = (r?: ClocktowerRole) => r ? (ROLE_TEAMS[r] === 'minion' || ROLE_TEAMS[r] === 'demon') : false;
    const leftEvil = isEvilRole(leftRole);
    const rightEvil = isEvilRole(rightRole);
    const evilCount = [leftEvil, rightEvil].filter(Boolean).length;
    const notes: string[] = [];
    if (leftRole === ClocktowerRole.Recluse || rightRole === ClocktowerRole.Recluse)
      notes.push('⚠️ Recluse có thể đăng ký như Ác → có thể +1.');
    if (leftRole === ClocktowerRole.Spy || rightRole === ClocktowerRole.Spy)
      notes.push('⚠️ Spy có thể đăng ký như Thiện → có thể -1.');
    const leftDesc = `← ${left?.name || '?'} (${leftRole ? ROLE_ICONS[leftRole] : '?'} ${leftRole || '?'})${leftEvil ? ' 👿' : ''}`;
    const rightDesc = `${right?.name || '?'} (${rightRole ? ROLE_ICONS[rightRole] : '?'} ${rightRole || '?'})${rightEvil ? ' 👿' : ''} →`;
    return {
      emoji: '💗',
      lines: [leftDesc, rightDesc, `→ Trả lời: ${evilCount} hàng xóm ác.`, ...notes],
      color: 'text-pink-300 bg-pink-500/8 border-pink-500/20',
      suggestedMessage: String(evilCount),
    };
  }

  // ── Washerwoman ───────────────────────────────────────────────────
  if (role === ClocktowerRole.Washerwoman) {
    const townsfolk = gamePlayers.filter((p) => p.isAlive && ROLE_TEAMS[p.gameData?.role as ClocktowerRole] === 'townsfolk');
    if (townsfolk.length === 0) {
      return {
        emoji: '🧺',
        lines: ['Không có Townsfolk nào còn sống.'],
        color: 'text-blue-300 bg-blue-500/8 border-blue-500/20',
      };
    }
    const real = seededPick(townsfolk, action.id + 'real');
    const decoyPool = gamePlayers.filter((p) => p.id !== real.id);
    const decoy = decoyPool.length > 0 ? seededPick(decoyPool, action.id + 'decoy') : null;
    const realRole = real.gameData?.role as ClocktowerRole | undefined;
    const msg = `Một trong ${real.name} hoặc ${decoy?.name || '?'} là ${realRole || '?'}.`;
    return {
      emoji: '🧺',
      lines: [
        `Người thật: ${real.name} (${ROLE_ICONS[realRole!] ?? ''} ${realRole})`,
        `Người kèm: ${decoy?.name || '?'}`,
        `→ Nói: "${msg}"`,
      ],
      color: 'text-blue-300 bg-blue-500/8 border-blue-500/20',
      suggestedMessage: msg,
    };
  }

  // ── Librarian ─────────────────────────────────────────────────────
  if (role === ClocktowerRole.Librarian) {
    const outsiders = gamePlayers.filter((p) => p.isAlive && ROLE_TEAMS[p.gameData?.role as ClocktowerRole] === 'outsider');
    if (outsiders.length === 0) {
      return {
        emoji: '📚',
        lines: ['Không có Outsider trong ván.', `→ Nói: "Không có Outsider nào."`],
        color: 'text-blue-300 bg-blue-500/8 border-blue-500/20',
        suggestedMessage: 'Không có Outsider nào.',
      };
    }
    const real = seededPick(outsiders, action.id + 'real');
    const decoyPool = gamePlayers.filter((p) => p.id !== real.id);
    const decoy = decoyPool.length > 0 ? seededPick(decoyPool, action.id + 'decoy') : null;
    const shownRole = real.gameData?.isDrunk === true ? ClocktowerRole.Drunk : (real.gameData?.role as ClocktowerRole);
    const msg = `Một trong ${real.name} hoặc ${decoy?.name || '?'} là ${shownRole}.`;
    return {
      emoji: '📚',
      lines: [
        `Người thật: ${real.name} (${ROLE_ICONS[shownRole] ?? ''} ${shownRole})`,
        `Người kèm: ${decoy?.name || '?'}`,
        `→ Nói: "${msg}"`,
      ],
      color: 'text-blue-300 bg-blue-500/8 border-blue-500/20',
      suggestedMessage: msg,
    };
  }

  // ── Investigator ──────────────────────────────────────────────────
  if (role === ClocktowerRole.Investigator) {
    const minions = gamePlayers.filter((p) => p.isAlive && ROLE_TEAMS[p.gameData?.role as ClocktowerRole] === 'minion');
    if (minions.length === 0) {
      return {
        emoji: '🔍',
        lines: ['Không có Minion trong ván.'],
        color: 'text-blue-300 bg-blue-500/8 border-blue-500/20',
      };
    }
    const real = seededPick(minions, action.id + 'real');
    const decoyPool = gamePlayers.filter((p) => p.id !== real.id);
    const decoy = decoyPool.length > 0 ? seededPick(decoyPool, action.id + 'decoy') : null;
    const realRole = real.gameData?.role as ClocktowerRole | undefined;
    const msg = `Một trong ${real.name} hoặc ${decoy?.name || '?'} là ${realRole || '?'}.`;
    const notes: string[] = [];
    if (realRole === ClocktowerRole.Spy)
      notes.push('⚠️ Spy có thể đăng ký như Townsfolk/Outsider.');
    return {
      emoji: '🔍',
      lines: [
        `Người thật: ${real.name} (${ROLE_ICONS[realRole!] ?? ''} ${realRole})`,
        `Người kèm: ${decoy?.name || '?'}`,
        `→ Nói: "${msg}"`,
        ...notes,
      ],
      color: 'text-blue-300 bg-blue-500/8 border-blue-500/20',
      suggestedMessage: msg,
    };
  }

  // ── Chef ──────────────────────────────────────────────────────────
  if (role === ClocktowerRole.Chef) {
    const bySeat = [...gamePlayers].sort((a, b) => ((a.gameData?.seatNumber as number) ?? 0) - ((b.gameData?.seatNumber as number) ?? 0));
    let evilPairs = 0;
    const evilPairNames: string[] = [];
    for (let i = 0; i < bySeat.length; i++) {
      const a = bySeat[i];
      const b = bySeat[(i + 1) % bySeat.length];
      const aRole = a.gameData?.role as ClocktowerRole | undefined;
      const bRole = b.gameData?.role as ClocktowerRole | undefined;
      const aEvil = aRole ? (ROLE_TEAMS[aRole] === 'minion' || ROLE_TEAMS[aRole] === 'demon') : false;
      const bEvil = bRole ? (ROLE_TEAMS[bRole] === 'minion' || ROLE_TEAMS[bRole] === 'demon') : false;
      if (aEvil && bEvil) {
        evilPairs++;
        evilPairNames.push(`${a.name} & ${b.name}`);
      }
    }
    const seatList = bySeat.map((p) => {
      const r = p.gameData?.role as ClocktowerRole | undefined;
      const isEvil = r ? (ROLE_TEAMS[r] === 'minion' || ROLE_TEAMS[r] === 'demon') : false;
      return `${p.gameData?.seatNumber ?? '?'}.${p.name}${isEvil ? '👿' : ''}`;
    }).join(' → ');
    return {
      emoji: '👨‍🍳',
      lines: [
        `Vòng: ${seatList}`,
        evilPairNames.length > 0 ? `Cặp ác: ${evilPairNames.join(' | ')}` : 'Không có cặp ác cạnh nhau.',
        `→ Trả lời: ${evilPairs}`,
      ],
      color: 'text-yellow-300 bg-yellow-500/8 border-yellow-500/20',
      suggestedMessage: String(evilPairs),
    };
  }

  // ── Undertaker ────────────────────────────────────────────────────
  if (role === ClocktowerRole.Undertaker) {
    const lastRole = gameState?.lastExecutedRole;
    const lastId = gameState?.lastExecutedPlayerId;
    const lastPlayer = lastId ? gamePlayers.find((p) => p.id === lastId) : null;
    if (!lastRole && !lastPlayer) {
      return {
        emoji: '⚰️',
        lines: ['Chưa có ai bị xử tử trước đó.', `→ Không có thông tin cho Undertaker đêm nay.`],
        color: 'text-slate-300 bg-slate-500/8 border-slate-500/20',
        suggestedMessage: 'Chưa có ai bị xử tử.',
      };
    }
    const msg = `${lastPlayer?.name || '?'} là ${lastRole || '?'}.`;
    return {
      emoji: '⚰️',
      lines: [
        `Người bị xử tử hôm qua: ${lastPlayer?.name || '?'}`,
        `Nhân vật thật: ${lastRole ? `${ROLE_ICONS[lastRole as ClocktowerRole] ?? ''} ${lastRole}` : '?'}`,
        `→ Nói: "${msg}"`,
      ],
      color: 'text-slate-300 bg-slate-500/8 border-slate-500/20',
      suggestedMessage: msg,
    };
  }

  // ── Ravenkeeper ───────────────────────────────────────────────────
  if (role === ClocktowerRole.Ravenkeeper && target) {
    const trueRole = target.gameData?.role as ClocktowerRole | undefined;
    const trueRoleIcon = trueRole ? ROLE_ICONS[trueRole] : '?';
    const msg = `${target.name} là ${trueRole || '?'}.`;
    return {
      emoji: '🐦‍⬛',
      lines: [
        `${actor.name} muốn biết nhân vật của ${target.name}.`,
        `Nhân vật thật: ${trueRoleIcon} ${trueRole || '?'}`,
        `→ Nói: "${msg}"`,
        `✅ Gửi tin xong → bấm 💀 trong Grimoire để đánh dấu Ravenkeeper chết.`,
      ],
      color: 'text-slate-300 bg-slate-500/8 border-slate-500/20',
      suggestedMessage: msg,
    };
  }

  // ── Butler ────────────────────────────────────────────────────────
  if (role === ClocktowerRole.Butler && target) {
    return {
      emoji: '🎩',
      lines: [
        `${actor.name} chọn ${target.name} làm chủ nhân đêm nay.`,
        `Ngày mai ${actor.name} chỉ được bỏ phiếu nếu ${target.name} bỏ phiếu trước.`,
        `Không cần gửi tin — đây là ghi nhớ nội bộ.`,
      ],
      color: 'text-teal-300 bg-teal-500/8 border-teal-500/20',
    };
  }

  return null;
}

// ─── Final recommendation (handles Drunk / Poisoned overlay) ──────────
function getRecommendation(
  action: GameAction,
  players: Player[],
  allActions: GameAction[],
  gameState?: RoomGameState
): RoleRec | null {
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

  // ── Drunk overlay ──────────────────────────────────────────────────
  if (isDrunk && drunkRole) {
    const wrongMsg = computeWrongMessage(baseRec?.suggestedMessage);
    return {
      emoji: '🍺',
      lines: [
        `⚠️ ${actor.name} là KẺ SAY RƯỢU — thực ra là ${role ? ROLE_NAMES_VI[role] : '?'}, nghĩ mình là ${ROLE_NAMES_VI[drunkRole] || drunkRole}`,
        `Gọi theo thứ tự ${drunkRole} · Đưa thông tin GIẢ:`,
        ...(baseRec?.lines ?? [`Đưa thông tin GIẢ như ${drunkRole} thật.`]),
      ],
      color: 'text-amber-300 bg-amber-500/8 border-amber-500/20',
      suggestedMessage: wrongMsg,
      quickAnswers: wrongMsg === 'CÓ' || wrongMsg === 'KHÔNG' ? YES_NO_BUTTONS_FLIPPED : undefined,
    };
  }

  // ── Poisoned overlay ───────────────────────────────────────────────
  if (isPoisoned && role) {
    const wrongMsg = computeWrongMessage(baseRec?.suggestedMessage);
    return {
      emoji: '🤢',
      lines: [
        `⚠️ ${actor.name} (${ROLE_NAMES_VI[role] || role}) bị NHIỄM ĐỘC — đưa thông tin GIẢ:`,
        ...(baseRec?.lines ?? [`Đưa thông tin GIẢ cho ${role} đêm nay.`]),
      ],
      color: 'text-green-300 bg-green-500/8 border-green-500/20',
      suggestedMessage: wrongMsg,
      quickAnswers: wrongMsg === 'CÓ' || wrongMsg === 'KHÔNG' ? YES_NO_BUTTONS_FLIPPED : undefined,
    };
  }

  return baseRec;
}

/** Compute a plausible wrong answer from the correct suggested message */
function computeWrongMessage(correct?: string): string | undefined {
  if (correct === undefined) return undefined;
  if (correct === 'CÓ') return 'KHÔNG';
  if (correct === 'KHÔNG') return 'CÓ';
  const asNum = parseInt(correct);
  if (!isNaN(asNum)) return asNum > 0 ? '0' : '1';
  // For sentence answers, prefix with a marker so host knows to improvise
  return undefined;
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
      return { verb: 'nhận số hàng xóm ác', verbColor: 'text-pink-400', isInfoOnly: true };
    case ClocktowerRole.Chef:
      return { verb: 'nhận số cặp ác', verbColor: 'text-yellow-400', isInfoOnly: true };
    case ClocktowerRole.Undertaker:
      return { verb: 'nhận nhân vật người bị xử tử', verbColor: 'text-slate-400', isInfoOnly: true };
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

// ─── Morning Checklist ─────────────────────────────────────────────────
function MorningChecklist({
  resolvedActions,
  players,
  pendingCount,
}: {
  resolvedActions: GameAction[];
  players: Player[];
  pendingCount: number;
}) {
  if (pendingCount > 0 || resolvedActions.length === 0) return null;

  const gamePlayers = players.filter((p) => !p.isHost);

  const getEffectiveRole = (a: GameAction): ClocktowerRole | undefined => {
    const actor = gamePlayers.find((p) => p.id === a.playerId);
    if (!actor) return undefined;
    const isDrunk = actor.gameData?.isDrunk === true;
    const drunkRole = actor.gameData?.drunkRole as ClocktowerRole | undefined;
    const role = actor.gameData?.role as ClocktowerRole | undefined;
    return isDrunk && drunkRole ? drunkRole : role;
  };

  const impAction = resolvedActions.find(
    (a) => getEffectiveRole(a) === ClocktowerRole.Imp && a.targetId !== a.playerId
  );
  const monkAction = resolvedActions.find(
    (a) => getEffectiveRole(a) === ClocktowerRole.Monk
  );
  const poisonerAction = resolvedActions.find(
    (a) => getEffectiveRole(a) === ClocktowerRole.Poisoner
  );
  const butlerAction = resolvedActions.find(
    (a) => getEffectiveRole(a) === ClocktowerRole.Butler
  );

  type ChecklistItem = { emoji: string; text: string; subtext?: string; type: 'death' | 'safe' | 'warning' | 'info' };
  const items: ChecklistItem[] = [];

  if (impAction) {
    const target = gamePlayers.find((p) => p.id === impAction.targetId);
    const targetRole = target?.gameData?.role as ClocktowerRole | undefined;
    const isMonkProtected = monkAction?.targetId === impAction.targetId;
    const isSoldier = targetRole === ClocktowerRole.Soldier;

    if (isMonkProtected) {
      items.push({
        emoji: '🛡️',
        text: `${target?.name || '?'} được Monk bảo vệ — KHÔNG AI CHẾT đêm nay`,
        subtext: 'Quỷ tấn công nhưng Monk đã chặn',
        type: 'safe',
      });
    } else if (isSoldier) {
      items.push({
        emoji: '🪖',
        text: `${target?.name || '?'} (Soldier) miễn nhiễm — KHÔNG AI CHẾT`,
        type: 'safe',
      });
    } else {
      items.push({
        emoji: '💀',
        text: `Đánh dấu ${target?.name || '?'} chết trong Grimoire`,
        subtext: `Quỷ đã giết ${target?.name || '?'} đêm nay`,
        type: 'death',
      });
    }
  }

  if (monkAction && impAction?.targetId !== monkAction.targetId) {
    const target = gamePlayers.find((p) => p.id === monkAction.targetId);
    items.push({
      emoji: '🛡️',
      text: `${target?.name || '?'} được Monk bảo vệ — an toàn đêm nay`,
      subtext: 'Monk chủ động bảo vệ, không phải phản ứng từ Quỷ',
      type: 'info',
    });
  }

  if (poisonerAction) {
    const target = gamePlayers.find((p) => p.id === poisonerAction.targetId);
    items.push({
      emoji: '☠️',
      text: `${target?.name || '?'} bị nhiễm độc — trả lời sai suốt hôm nay`,
      subtext: 'Đã tự đánh dấu trong Grimoire. Nhớ đưa thông tin SAI cho họ.',
      type: 'warning',
    });
  }

  if (butlerAction) {
    const actor = gamePlayers.find((p) => p.id === butlerAction.playerId);
    const master = gamePlayers.find((p) => p.id === butlerAction.targetId);
    items.push({
      emoji: '🎩',
      text: `${actor?.name || '?'} (Butler) chỉ bỏ phiếu sau ${master?.name || '?'}`,
      subtext: 'Nhớ kiểm tra thứ tự bỏ phiếu khi xử án hôm nay',
      type: 'info',
    });
  }

  if (items.length === 0) {
    items.push({
      emoji: '🌅',
      text: 'Không có ai chết đêm nay — làng bình yên',
      type: 'safe',
    });
  }

  return (
    <div className="rounded-xl border border-sky-500/25 bg-gradient-to-b from-sky-950/30 to-slate-900/30 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-sky-500/15">
        <span className="text-lg">🌅</span>
        <h3 className="text-sm font-black text-sky-300 uppercase tracking-wide">Checklist Sáng</h3>
        <span className="text-xs text-slate-500 ml-1">— việc cần làm khi bắt đầu ngày</span>
      </div>
      {/* Items */}
      <div className="divide-y divide-white/5">
        {items.map((item, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 px-4 py-3 ${
              item.type === 'death'   ? 'bg-red-950/20'    :
              item.type === 'safe'    ? 'bg-green-950/15'  :
              item.type === 'warning' ? 'bg-purple-950/20' :
              'bg-white/[0.02]'
            }`}
          >
            <span className="text-xl shrink-0 mt-0.5">{item.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-bold leading-tight ${
                item.type === 'death'   ? 'text-red-300'    :
                item.type === 'safe'    ? 'text-green-300'  :
                item.type === 'warning' ? 'text-purple-300' :
                'text-slate-200'
              }`}>
                {item.text}
              </p>
              {item.subtext && (
                <p className="text-xs text-slate-500 mt-0.5 leading-snug">{item.subtext}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
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

      <div className="overflow-x-auto px-3 py-3">
        <div className="flex items-center gap-1.5 min-w-max">
          {slots.map((slot, idx) => {
            const isDrunkHere = slot.player?.gameData?.isDrunk === true;
            const seat = slot.player?.gameData?.seatNumber as number | undefined;

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
                <div className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-1.5 min-w-[64px] text-center ${cfg.wrap}`}>
                  <div className="flex items-center gap-1 w-full justify-between">
                    <span className={`text-[9px] font-black ${cfg.step}`}>{slot.step}</span>
                    {cfg.dot}
                  </div>
                  <span className="text-base leading-none">{ROLE_ICONS[slot.role]}</span>
                  <span className={`text-[10px] font-bold leading-tight truncate w-full text-center ${cfg.name}`}>
                    {seat != null ? `#${seat} ` : ''}{slot.player?.name ?? slot.role}
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

  const sortedPending = [...pendingActions].sort(
    (a, b) =>
      getNightOrderIndex(a.playerId, players, nightOrder) -
      getNightOrderIndex(b.playerId, players, nightOrder)
  );

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

      {/* ── Morning Checklist (when all done) ───────────────────────── */}
      <MorningChecklist
        resolvedActions={resolvedActions}
        players={players}
        pendingCount={pendingActions.length}
      />

      {/* ── Pending Actions ──────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
          </span>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Chờ xử lý</h3>
          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-black text-amber-400">
            {pendingActions.length}
          </span>
          {pendingActions.length > 0 && (
            <span className="text-[10px] text-slate-600 ml-auto">theo thứ tự gọi đêm</span>
          )}
        </div>

        {sortedPending.length === 0 && (
          <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center">
            <p className="text-sm text-slate-600">
              {resolvedActions.length > 0
                ? '✅ Tất cả hành động đêm nay đã xử lý xong.'
                : 'Đang chờ người chơi nộp hành động...'}
            </p>
          </div>
        )}

        <div className="space-y-3">
          {sortedPending.map((action) => {
            const actor = players.find((p) => p.id === action.playerId);
            const role = actor?.gameData?.role as ClocktowerRole | undefined;
            const isDrunk = actor?.gameData?.isDrunk === true;
            const isPoisoned = actor?.gameData?.isPoisoned === true;
            const drunkRole = actor?.gameData?.drunkRole as ClocktowerRole | undefined;
            const displayRole = isDrunk && drunkRole ? drunkRole : role;
            const seat = actor?.gameData?.seatNumber as number | undefined;
            const step = getStepNumber(action.playerId, players, nightOrder);
            const rec = getRecommendation(action, players, allActions, gameState);
            const currentMsg = resolveMessages[action.id] || '';

            return (
              <div
                key={action.id}
                className="rounded-xl border border-amber-500/15 bg-gradient-to-b from-amber-950/20 to-slate-900/40 overflow-hidden"
              >
                {/* ── Card header: actor ── */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
                  {/* Step badge */}
                  {step > 0 && (
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-sm font-black text-amber-400 border border-amber-500/30">
                      {step}
                    </span>
                  )}
                  {/* Role icon */}
                  {displayRole && (
                    <span className="text-2xl shrink-0 leading-none">{ROLE_ICONS[displayRole]}</span>
                  )}
                  {/* Name + role */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {seat != null && (
                        <span className="text-[10px] font-black text-slate-600">#{seat}</span>
                      )}
                      <span className="font-black text-white text-base leading-tight">{action.playerName}</span>
                      {isDrunk && (
                        <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-black text-amber-400 border border-amber-500/25">🍺 SAY</span>
                      )}
                      {isPoisoned && (
                        <span className="rounded-full bg-purple-500/20 px-1.5 py-0.5 text-[9px] font-black text-purple-400 border border-purple-500/25">☠️ ĐỘC</span>
                      )}
                    </div>
                    {role && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[11px] text-slate-500">
                          {ROLE_ICONS[role]} {String(role)}
                          {isDrunk && drunkRole && (
                            <span className="text-amber-600"> · nghĩ là {ROLE_ICONS[drunkRole]} {drunkRole}</span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                  {/* Target(s) */}
                  {(action.targetName || action.secondTargetName) ? (
                    <div className="shrink-0 flex flex-col items-end gap-0.5 text-xs">
                      <span className="text-slate-600 text-[9px]">chọn</span>
                      <span className="font-bold text-white text-sm leading-tight">
                        {action.targetName}
                        {action.secondTargetName && (
                          <span className="text-cyan-300"> & {action.secondTargetName}</span>
                        )}
                      </span>
                    </div>
                  ) : (
                    <span className="shrink-0 text-[10px] text-slate-600 italic">Chờ ST nhập</span>
                  )}
                </div>

                {/* ── Recommendation box ── */}
                {rec && (
                  <div className={`mx-4 mt-3 rounded-xl border px-3.5 py-3 text-xs space-y-1.5 ${rec.color}`}>
                    <p className="font-black text-[10px] uppercase tracking-widest opacity-60">{rec.emoji} Gợi ý Storyteller</p>
                    {rec.lines.map((line, i) => (
                      <p key={i} className={i === 0 ? 'font-bold text-[13px] leading-snug' : 'opacity-75 text-[12px]'}>
                        {line}
                      </p>
                    ))}
                  </div>
                )}

                {/* ── Quick answer buttons ── */}
                {rec?.quickAnswers && (
                  <div className="flex gap-2 px-4 pt-2.5">
                    {rec.quickAnswers.map((qa) => (
                      <button
                        key={qa.value}
                        onClick={() => onResolveMessageChange(action.id, qa.value)}
                        className={`flex-1 rounded-lg border py-2 text-xs font-black transition-all active:scale-95 ${qa.style}`}
                      >
                        {qa.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* ── Pre-fill suggested message button ── */}
                {rec?.suggestedMessage && !rec.quickAnswers && (
                  <div className="px-4 pt-2.5">
                    <button
                      onClick={() => onResolveMessageChange(action.id, rec.suggestedMessage!)}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left transition-all hover:bg-white/8 active:scale-[0.99]"
                    >
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 block mb-0.5">📋 Điền gợi ý</span>
                      <span className="text-[11px] text-slate-300 leading-relaxed line-clamp-2">
                        {rec.suggestedMessage}
                      </span>
                    </button>
                  </div>
                )}

                {/* ── Input + confirm ── */}
                <div className="flex gap-2 px-4 py-3">
                  <input
                    type="text"
                    value={currentMsg}
                    onChange={(e) => onResolveMessageChange(action.id, e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') onResolve(action); }}
                    placeholder={rec?.suggestedMessage ? 'Đã có gợi ý ↑ · Chỉnh sửa rồi gửi...' : 'Thông tin gửi cho người chơi...'}
                    className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white placeholder-slate-600 outline-none focus:border-amber-500/50 focus:bg-black/40 transition-colors"
                  />
                  <button
                    onClick={() => onResolve(action)}
                    className="shrink-0 rounded-lg bg-amber-600 px-4 py-2 text-xs font-black text-white transition-all hover:bg-amber-500 active:scale-95 shadow-lg shadow-amber-500/20"
                    id={`resolve-${action.id}`}
                  >
                    ✓ Gửi
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
              const seat = actor?.gameData?.seatNumber as number | undefined;

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
                  {/* Actor row */}
                  <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/5">
                    {step > 0 && (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-green-900/60 border border-green-700/30 text-[9px] font-black text-green-600">
                        {step}
                      </span>
                    )}
                    {effectiveRole && (
                      <span className="text-lg leading-none shrink-0">{ROLE_ICONS[effectiveRole]}</span>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {seat != null && (
                          <span className="text-[9px] font-black text-slate-700">#{seat}</span>
                        )}
                        <span className="text-sm font-black text-slate-200 leading-tight">{action.playerName}</span>
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

                  {/* Action summary */}
                  <div className="px-3 py-2 space-y-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap text-xs">
                      <span className={`font-bold ${verbColor}`}>{verb}</span>
                      {!isInfoOnly && action.targetName && (
                        <>
                          <span className="text-slate-700">→</span>
                          <div className="flex items-center gap-1">
                            {targetRole && <span className="text-sm leading-none">{ROLE_ICONS[targetRole]}</span>}
                            <span className="font-bold text-white">{action.targetName}</span>
                            {targetRole && <span className="text-[10px] text-slate-500">({String(targetRole)})</span>}
                          </div>
                          {action.secondTargetName && (
                            <>
                              <span className="text-slate-600">&amp;</span>
                              <div className="flex items-center gap-1">
                                {secondTargetRole && <span className="text-sm leading-none">{ROLE_ICONS[secondTargetRole]}</span>}
                                <span className="font-bold text-cyan-300">{action.secondTargetName}</span>
                                {secondTargetRole && <span className="text-[10px] text-slate-500">({String(secondTargetRole)})</span>}
                              </div>
                            </>
                          )}
                        </>
                      )}
                    </div>
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
