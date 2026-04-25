'use client';

import type { Player } from '@/types/player';
import type { GameAction } from '@/types/actions';
import type { RoomGameState } from '@/types/room';
import {
  ClocktowerRole,
  ROLE_ICONS,
  ROLE_TEAMS,
  FIRST_NIGHT_ROLES,
  OTHER_NIGHT_ROLES,
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
// Night 1: info roles wake, no Imp (Imp doesn't act night 1)
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

// Night 2+: Imp kills, then info roles, Ravenkeeper triggers on death (host handles)
const NIGHT_ORDER_OTHER: ClocktowerRole[] = [
  ClocktowerRole.Poisoner,
  ClocktowerRole.Monk,
  ClocktowerRole.ScarletWoman, // passive — shown so host remembers to check
  ClocktowerRole.Imp,
  ClocktowerRole.Ravenkeeper,  // only if killed this night
  ClocktowerRole.Empath,
  ClocktowerRole.FortuneTeller,
  ClocktowerRole.Undertaker,
  ClocktowerRole.Butler,
  ClocktowerRole.Spy,
];

// ─── Stable seeded index for deterministic-but-varied suggestions ──────
function seededIndex(seed: string, max: number): number {
  if (max === 0) return 0;
  const hash = seed.split('').reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) & 0xfffffff, 7);
  return hash % max;
}

function seededPick<T>(arr: T[], seed: string): T {
  return arr[seededIndex(seed, arr.length)];
}

// ─── Build recommendation for each action ─────────────────────────────
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

  // Monk protection for this action's target
  const monkAction = allActions.find((a) => {
    const monkActor = players.find((p) => p.id === a.playerId);
    return monkActor?.gameData?.role === ClocktowerRole.Monk && a.targetId === action.targetId;
  });
  const isTargetProtected = !!monkAction;

  const gamePlayers = players.filter((p) => !p.isHost);

  // ── Drunk: always false info ────────────────────────────────────────
  if (isDrunk && drunkRole) {
    return {
      emoji: '🍺',
      lines: [
        `${actor.name} là KẺ SAY RƯỢU — họ nghĩ mình là ${drunkRole}.`,
        `Đưa thông tin GIẢ (như thể họ là ${drunkRole} thật, nhưng sai sự thật).`,
      ],
      color: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
    };
  }

  // ── Poisoned actor: false info ──────────────────────────────────────
  if (isPoisoned && role) {
    return {
      emoji: '🤢',
      lines: [
        `${actor.name} (${role}) đang bị NHIỄM ĐỘC.`,
        `Đưa thông tin GIẢ cho họ đêm nay.`,
      ],
      color: 'text-green-300 bg-green-500/10 border-green-500/20',
    };
  }

  // ── Poisoner ────────────────────────────────────────────────────────
  if (role === ClocktowerRole.Poisoner && target) {
    return {
      emoji: '☠️',
      lines: [
        `${target.name} bị NHIỄM ĐỘC đêm nay và ngày mai.`,
        `→ Hệ thống sẽ tự đánh dấu Poisoned khi bạn xác nhận.`,
        `Nhớ đưa thông tin SAI cho mọi hành động của họ.`,
      ],
      color: 'text-purple-300 bg-purple-500/10 border-purple-500/20',
    };
  }

  // ── Monk ────────────────────────────────────────────────────────────
  if (role === ClocktowerRole.Monk && target) {
    return {
      emoji: '🛡️',
      lines: [
        `${target.name} được BẢO VỆ khỏi Quỷ đêm nay.`,
        `Nếu Imp tấn công họ → không ai chết.`,
      ],
      color: 'text-green-300 bg-green-500/10 border-green-500/20',
    };
  }

  // ── Imp ─────────────────────────────────────────────────────────────
  if (role === ClocktowerRole.Imp && target) {
    // Self-kill (starpass)
    if (action.targetId === action.playerId) {
      const minions = gamePlayers.filter(
        (p) => p.isAlive && ROLE_TEAMS[p.gameData?.role as ClocktowerRole] === 'minion'
      );
      return {
        emoji: '🔁',
        lines: [
          `Imp TỰ GIẾT bản thân! (Starpass)`,
          `Chọn 1 Minion còn sống để trở thành Imp mới:`,
          minions.length > 0 ? minions.map((p) => `• ${p.name} (${p.gameData?.role})`).join(', ') : '(Không có Minion!)',
          `Cập nhật vai trò của Minion đó trong Grimoire.`,
        ],
        color: 'text-orange-300 bg-orange-500/10 border-orange-500/20',
      };
    }
    // Protected by Monk
    if (isTargetProtected) {
      return {
        emoji: '✅',
        lines: [
          `${target.name} được Monk bảo vệ — KHÔNG AI CHẾT đêm nay.`,
          `Không tiết lộ điều này với ai.`,
        ],
        color: 'text-green-300 bg-green-500/10 border-green-500/20',
      };
    }
    // Soldier is immune
    if (targetRole === ClocktowerRole.Soldier) {
      return {
        emoji: '🛡️',
        lines: [
          `${target.name} là SOLDIER — miễn nhiễm với Quỷ.`,
          `KHÔNG AI CHẾT đêm nay.`,
        ],
        color: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/20',
      };
    }
    // Ravenkeeper gets triggered on death
    if (targetRole === ClocktowerRole.Ravenkeeper) {
      return {
        emoji: '🐦‍⬛',
        lines: [
          `${target.name} là RAVENKEEPER — họ sẽ chết.`,
          `⚠️ Trước khi đánh dấu chết: Đánh thức họ riêng tư, cho họ chọn 1 người.`,
          `Sau đó cho họ biết nhân vật của người được chọn đó, rồi mới đánh dấu chết.`,
        ],
        color: 'text-slate-300 bg-slate-500/10 border-slate-500/20',
      };
    }
    // Mayor redirect
    if (targetRole === ClocktowerRole.Mayor) {
      return {
        emoji: '👑',
        lines: [
          `${target.name} là MAYOR.`,
          `Nếu Mayor chết ban đêm, ANOTHER player có thể chết thay (bạn chọn ai).`,
          `Hoặc cho Mayor chết bình thường nếu không có ai thích hợp hơn.`,
        ],
        color: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
      };
    }
    return {
      emoji: '💀',
      lines: [
        `${target.name} SẼ CHẾT đêm nay.`,
        `Đánh dấu họ là đã chết khi bắt đầu ngày.`,
      ],
      color: 'text-red-300 bg-red-500/10 border-red-500/20',
    };
  }

  // ── Fortune Teller ─────────────────────────────────────────────────
  if (role === ClocktowerRole.FortuneTeller) {
    const ftRedHerring = actor.gameData?.fortuneTellerRedHerring as string | undefined;
    const targets = [target, secondTarget].filter(Boolean);
    const targetNames = targets.map((t) => t!.name).join(' & ');
    const targetIds = [action.targetId, action.secondTargetId].filter(Boolean);

    const hasDemon = [targetRole, secondTargetRole].includes(ClocktowerRole.Imp);
    const hasRecluse = [targetRole, secondTargetRole].includes(ClocktowerRole.Recluse);
    const hasRedHerring = ftRedHerring && targetIds.includes(ftRedHerring);
    const redHerringPlayer = ftRedHerring ? players.find((p) => p.id === ftRedHerring) : undefined;

    if (hasDemon) {
      return {
        emoji: '🔮',
        lines: [`[${targetNames}] — Có 1 người là Quỷ.`, `→ Trả lời: CÓ (Yes).`],
        color: 'text-red-300 bg-red-500/10 border-red-500/20',
      };
    }
    if (hasRecluse) {
      return {
        emoji: '🔮',
        lines: [
          `[${targetNames}] — Có Recluse (có thể đăng ký như Quỷ).`,
          `→ Bạn CÓ THỂ trả lời CÓ hoặc KHÔNG tùy ý.`,
        ],
        color: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20',
      };
    }
    if (hasRedHerring) {
      return {
        emoji: '🔮',
        lines: [
          `[${targetNames}] — ${redHerringPlayer?.name} là "mồi nhử" của FT.`,
          `→ Trả lời: CÓ (Yes) — mồi nhử luôn đăng ký như Quỷ với FT.`,
        ],
        color: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20',
      };
    }
    return {
      emoji: '🔮',
      lines: [`[${targetNames}] — Không có Quỷ hay mồi nhử.`, `→ Trả lời: KHÔNG (No).`],
      color: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20',
    };
  }

  // ── Spy ──────────────────────────────────────────────────────────
  if (role === ClocktowerRole.Spy) {
    const grimoire = gamePlayers
      .map((p) => {
        const pRole = p.gameData?.role as ClocktowerRole | undefined;
        const tags: string[] = [];
        if (p.gameData?.isDrunk === true) tags.push('🍺Drunk');
        if (p.gameData?.isPoisoned === true) tags.push('☠️Poisoned');
        if (!p.isAlive) tags.push('💀Dead');
        return `${p.name}: ${pRole ? ROLE_ICONS[pRole] : '?'}${pRole || '?'}${tags.length ? ` [${tags.join(',')}]` : ''}`;
      })
      .join('\n');
    return {
      emoji: '🕵️',
      lines: [`Cho Spy xem Grimoire:`, grimoire],
      color: 'text-slate-300 bg-slate-500/10 border-slate-500/20',
    };
  }

  // ── Empath ──────────────────────────────────────────────────────
  if (role === ClocktowerRole.Empath) {
    const aliveSorted = gamePlayers.filter((p) => p.isAlive);
    const myIndex = aliveSorted.findIndex((p) => p.id === actor.id);
    if (myIndex === -1 || aliveSorted.length < 2) {
      return {
        emoji: '💗',
        lines: ['Không đủ người để tính hàng xóm.'],
        color: 'text-pink-300 bg-pink-500/10 border-pink-500/20',
      };
    }
    const left = aliveSorted[(myIndex - 1 + aliveSorted.length) % aliveSorted.length];
    const right = aliveSorted[(myIndex + 1) % aliveSorted.length];
    const leftRole = left?.gameData?.role as ClocktowerRole | undefined;
    const rightRole = right?.gameData?.role as ClocktowerRole | undefined;
    // Recluse might register as evil; Spy might register as good
    const leftEvil = leftRole ? (ROLE_TEAMS[leftRole] === 'minion' || ROLE_TEAMS[leftRole] === 'demon') : false;
    const rightEvil = rightRole ? (ROLE_TEAMS[rightRole] === 'minion' || ROLE_TEAMS[rightRole] === 'demon') : false;
    const evilCount = [leftEvil, rightEvil].filter(Boolean).length;

    const notes: string[] = [];
    if (leftRole === ClocktowerRole.Recluse || rightRole === ClocktowerRole.Recluse) {
      notes.push('Recluse có thể đăng ký như ác → bạn có thể tăng số lên 1.');
    }
    if (leftRole === ClocktowerRole.Spy || rightRole === ClocktowerRole.Spy) {
      notes.push('Spy có thể đăng ký như thiện → bạn có thể giảm số xuống 1.');
    }

    return {
      emoji: '💗',
      lines: [
        `Hàng xóm: ${left?.name || '?'} (${leftRole || '?'}) | ${right?.name || '?'} (${rightRole || '?'})`,
        `→ Trả lời: ${evilCount} hàng xóm ác.`,
        ...notes,
      ],
      color: 'text-pink-300 bg-pink-500/10 border-pink-500/20',
    };
  }

  // ── Washerwoman ─────────────────────────────────────────────────
  if (role === ClocktowerRole.Washerwoman) {
    const townsfolk = gamePlayers.filter(
      (p) => p.isAlive && ROLE_TEAMS[p.gameData?.role as ClocktowerRole] === 'townsfolk'
    );
    if (townsfolk.length === 0) {
      return {
        emoji: '🧺',
        lines: ['Không có Townsfolk nào còn sống để chỉ điểm.'],
        color: 'text-blue-300 bg-blue-500/10 border-blue-500/20',
      };
    }
    const real = seededPick(townsfolk, action.id + 'real');
    const decoyPool = gamePlayers.filter((p) => p.id !== real.id);
    const decoy = decoyPool.length > 0 ? seededPick(decoyPool, action.id + 'decoy') : null;
    return {
      emoji: '🧺',
      lines: [
        `Chỉ cho họ: "${real.name}" và "${decoy?.name || '?'}"`,
        `→ Nói: "Một trong hai người là ${real.gameData?.role}."`,
      ],
      color: 'text-blue-300 bg-blue-500/10 border-blue-500/20',
    };
  }

  // ── Librarian ───────────────────────────────────────────────────
  if (role === ClocktowerRole.Librarian) {
    // Drunk counts as an Outsider and Librarian can learn about them
    const outsiders = gamePlayers.filter(
      (p) => p.isAlive && ROLE_TEAMS[p.gameData?.role as ClocktowerRole] === 'outsider'
    );
    if (outsiders.length === 0) {
      return {
        emoji: '📚',
        lines: [
          `Không có Outsider trong ván đấu.`,
          `→ Trả lời: "Không có Outsider nào."`,
        ],
        color: 'text-blue-300 bg-blue-500/10 border-blue-500/20',
      };
    }
    const real = seededPick(outsiders, action.id + 'real');
    const decoyPool = gamePlayers.filter((p) => p.id !== real.id);
    const decoy = decoyPool.length > 0 ? seededPick(decoyPool, action.id + 'decoy') : null;
    // If the outsider is Drunk, show their actual role (Drunk), not drunkRole
    const shownRole = real.gameData?.isDrunk === true ? ClocktowerRole.Drunk : (real.gameData?.role as ClocktowerRole);
    return {
      emoji: '📚',
      lines: [
        `Chỉ cho họ: "${real.name}" và "${decoy?.name || '?'}"`,
        `→ Nói: "Một trong hai người là ${shownRole}."`,
      ],
      color: 'text-blue-300 bg-blue-500/10 border-blue-500/20',
    };
  }

  // ── Investigator ────────────────────────────────────────────────
  if (role === ClocktowerRole.Investigator) {
    const minions = gamePlayers.filter(
      (p) => p.isAlive && ROLE_TEAMS[p.gameData?.role as ClocktowerRole] === 'minion'
    );
    if (minions.length === 0) {
      return {
        emoji: '🔍',
        lines: ['Không có Minion trong ván đấu — kết quả bất thường.'],
        color: 'text-blue-300 bg-blue-500/10 border-blue-500/20',
      };
    }
    const real = seededPick(minions, action.id + 'real');
    const decoyPool = gamePlayers.filter((p) => p.id !== real.id);
    const decoy = decoyPool.length > 0 ? seededPick(decoyPool, action.id + 'decoy') : null;
    const notes: string[] = [];
    if (real.gameData?.role === ClocktowerRole.Spy) {
      notes.push('Spy có thể đăng ký như Townsfolk/Outsider → bạn có thể đưa thông tin khác.');
    }
    return {
      emoji: '🔍',
      lines: [
        `Chỉ cho họ: "${real.name}" và "${decoy?.name || '?'}"`,
        `→ Nói: "Một trong hai người là ${real.gameData?.role}."`,
        ...notes,
      ],
      color: 'text-blue-300 bg-blue-500/10 border-blue-500/20',
    };
  }

  // ── Chef ────────────────────────────────────────────────────────
  if (role === ClocktowerRole.Chef) {
    const aliveSorted = gamePlayers.filter((p) => p.isAlive);
    let evilPairs = 0;
    for (let i = 0; i < aliveSorted.length; i++) {
      const a = aliveSorted[i];
      const b = aliveSorted[(i + 1) % aliveSorted.length];
      const aRole = a.gameData?.role as ClocktowerRole | undefined;
      const bRole = b.gameData?.role as ClocktowerRole | undefined;
      const aEvil = aRole ? (ROLE_TEAMS[aRole] === 'minion' || ROLE_TEAMS[aRole] === 'demon') : false;
      const bEvil = bRole ? (ROLE_TEAMS[bRole] === 'minion' || ROLE_TEAMS[bRole] === 'demon') : false;
      if (aEvil && bEvil) evilPairs++;
    }
    return {
      emoji: '👨‍🍳',
      lines: [
        `Số cặp ác ngồi cạnh nhau (theo thứ tự tham gia): ${evilPairs}.`,
        `→ Trả lời: ${evilPairs}.`,
        `⚠️ Dựa trên thứ tự ngồi thực tế — điều chỉnh nếu thứ tự ngồi khác.`,
      ],
      color: 'text-yellow-300 bg-yellow-500/10 border-yellow-500/20',
    };
  }

  // ── Undertaker ──────────────────────────────────────────────────
  if (role === ClocktowerRole.Undertaker) {
    const lastRole = gameState?.lastExecutedRole;
    const lastId = gameState?.lastExecutedPlayerId;
    const lastPlayer = lastId ? gamePlayers.find((p) => p.id === lastId) : null;

    if (!lastRole && !lastPlayer) {
      return {
        emoji: '⚰️',
        lines: [
          `Chưa có ai bị xử tử hôm nay.`,
          `→ Undertaker không nhận thông tin (không có ai chết ban ngày).`,
        ],
        color: 'text-slate-300 bg-slate-500/10 border-slate-500/20',
      };
    }
    return {
      emoji: '⚰️',
      lines: [
        `Người bị xử tử hôm nay: ${lastPlayer?.name || '?'}`,
        `Nhân vật thật của họ: ${lastRole || '?'}`,
        `→ Trả lời: "${lastRole}".`,
      ],
      color: 'text-slate-300 bg-slate-500/10 border-slate-500/20',
    };
  }

  // ── Butler ──────────────────────────────────────────────────────
  if (role === ClocktowerRole.Butler && target) {
    return {
      emoji: '🎩',
      lines: [
        `${actor.name} chọn ${target.name} làm chủ.`,
        `Ngày mai Butler chỉ được bỏ phiếu nếu ${target.name} bỏ phiếu trước.`,
        `Quản trò theo dõi và nhắc nếu Butler bỏ phiếu sai.`,
      ],
      color: 'text-teal-300 bg-teal-500/10 border-teal-500/20',
    };
  }

  return null;
}

// ─── Night order display ────────────────────────────────────────────────
function NightOrderDisplay({ players, dayCount }: { players: Player[]; dayCount: number }) {
  const nightOrder = dayCount === 0 ? NIGHT_ORDER_FIRST : NIGHT_ORDER_OTHER;
  const activeRoles = new Set(
    players.filter((p) => !p.isHost && p.isAlive).map((p) => p.gameData?.role as ClocktowerRole)
  );

  const activeInOrder = nightOrder.filter((r) => activeRoles.has(r));
  if (activeInOrder.length === 0) return null;

  const passiveLabels: Partial<Record<ClocktowerRole, string>> = {
    [ClocktowerRole.ScarletWoman]: 'passif',
    [ClocktowerRole.Ravenkeeper]: 'si tử',
  };

  return (
    <div className="mb-4 overflow-x-auto rounded-xl border border-white/10 bg-black/20 p-3">
      <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">
        Thứ tự đêm {dayCount === 0 ? '(Đêm 1)' : '(Đêm 2+)'}
      </p>
      <div className="flex items-center gap-1 flex-wrap">
        {activeInOrder.map((role, idx) => {
          const player = players.find((p) => p.gameData?.role === role && !p.isHost);
          const label = passiveLabels[role];
          return (
            <div key={role} className="flex items-center gap-1">
              <div className={`flex flex-col items-center rounded-lg p-2 min-w-[56px] text-center border ${
                label ? 'bg-slate-800/50 border-slate-600/20' : 'bg-white/5 border-white/10'
              }`}>
                <span className="text-lg">{ROLE_ICONS[role]}</span>
                <span className="text-[10px] text-slate-400 leading-tight">{player?.name || role}</span>
                {label && (
                  <span className="text-[9px] text-slate-600 italic">{label}</span>
                )}
              </div>
              {idx < activeInOrder.length - 1 && <span className="text-slate-600 text-xs">→</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

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

  const sortedPending = [...pendingActions].sort(
    (a, b) => ((a.createdAt as any)?.seconds ?? 0) - ((b.createdAt as any)?.seconds ?? 0)
  );
  const sortedResolved = [...resolvedActions].sort(
    (a, b) => ((a.createdAt as any)?.seconds ?? 0) - ((b.createdAt as any)?.seconds ?? 0)
  );

  return (
    <div className="space-y-4">
      <NightOrderDisplay players={players} dayCount={dayCount} />

      {/* Pending Actions */}
      <div>
        <h3 className="flex items-center gap-2 mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-purple-500" />
          </span>
          Đang chờ xử lý ({pendingActions.length})
        </h3>

        {sortedPending.length === 0 && (
          <p className="rounded-xl bg-white/5 px-4 py-6 text-center text-sm text-slate-500">
            Đang chờ người chơi nộp hành động...
          </p>
        )}

        <div className="space-y-3">
          {sortedPending.map((action) => {
            const actor = players.find((p) => p.id === action.playerId);
            const role = actor?.gameData?.role as ClocktowerRole | undefined;
            const rec = getRecommendation(action, players, allActions, gameState);

            return (
              <div
                key={action.id}
                className="rounded-xl border border-purple-500/20 bg-gradient-to-r from-purple-900/20 to-indigo-900/10 p-4 space-y-3"
              >
                {/* Header */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    {role && <span className="text-xl">{ROLE_ICONS[role]}</span>}
                    <div>
                      <span className="font-semibold text-white">{action.playerName}</span>
                      {role && (
                        <span className="ml-2 text-xs text-purple-400">
                          {role}
                          {actor?.gameData?.isDrunk === true && (
                            <span className="ml-1 text-amber-400 font-bold">🍺 DRUNK</span>
                          )}
                          {actor?.gameData?.isPoisoned === true && (
                            <span className="ml-1 text-green-400 font-bold">☠️ POISONED</span>
                          )}
                        </span>
                      )}
                    </div>
                    {(action.targetName || action.secondTargetName) ? (
                      <>
                        <span className="text-slate-500">→</span>
                        <span className="text-purple-300 font-medium">
                          {action.targetName || '—'}
                          {action.secondTargetName && (
                            <span className="text-cyan-300"> & {action.secondTargetName}</span>
                          )}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-slate-500">→</span>
                        <span className="text-slate-500 text-xs italic">Chờ thông tin từ Quản trò</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Recommendation */}
                {rec && (
                  <div className={`rounded-lg border p-3 text-sm space-y-1 ${rec.color}`}>
                    <p className="font-semibold">
                      {rec.emoji} Gợi ý Quản trò:
                    </p>
                    {rec.lines.map((line, i) => (
                      <p key={i} className={i === 0 ? '' : 'text-xs opacity-90'}>{line}</p>
                    ))}
                  </div>
                )}

                {/* Resolve */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={resolveMessages[action.id] || ''}
                    onChange={(e) => onResolveMessageChange(action.id, e.target.value)}
                    placeholder="Nhập thông tin gửi cho người chơi..."
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-purple-500"
                  />
                  <button
                    onClick={() => onResolve(action)}
                    className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-purple-500 shrink-0"
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

      {/* Resolved log */}
      {sortedResolved.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
            📜 Nhật ký Đêm ({sortedResolved.length})
          </h3>
          <div className="relative space-y-0 border-l-2 border-white/10 ml-3">
            {sortedResolved.map((action) => {
              const actor = players.find((p) => p.id === action.playerId);
              const role = actor?.gameData?.role as ClocktowerRole | undefined;
              return (
                <div key={action.id} className="relative pl-5 pb-3">
                  <div className="absolute -left-[7px] top-1 h-3 w-3 rounded-full bg-green-500 border-2 border-slate-900" />
                  <div className="rounded-lg bg-white/5 border border-white/5 px-3 py-2 text-sm">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {role && <span>{ROLE_ICONS[role]}</span>}
                      <span className="font-medium text-slate-300">{action.playerName}</span>
                      <span className="text-slate-600">→</span>
                      <span className="text-slate-400">
                        {action.targetName || '—'}
                        {action.secondTargetName && (
                          <span className="text-cyan-400"> & {action.secondTargetName}</span>
                        )}
                      </span>
                      <span className="ml-auto text-xs text-green-500">✓ Đã xử lý</span>
                    </div>
                    {action.result?.message && (
                      <p className="text-xs text-slate-500 italic">
                        💬 Đã gửi: "{action.result.message}"
                      </p>
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
