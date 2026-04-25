'use client';

import { useMemo } from 'react';
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
  resolveMessages: Record<string, string>;
  onResolveMessageChange: (id: string, val: string) => void;
  onResolve: (action: GameAction) => void;
}

// ─── Night order (official BotC Trouble Brewing order) ─────────────────
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
  ClocktowerRole.Imp,
];

const NIGHT_ORDER_OTHER: ClocktowerRole[] = [
  ClocktowerRole.Poisoner,
  ClocktowerRole.Monk,
  ClocktowerRole.Ravenkeeper,
  ClocktowerRole.Empath,
  ClocktowerRole.FortuneTeller,
  ClocktowerRole.Undertaker,
  ClocktowerRole.Butler,
  ClocktowerRole.Spy,
  ClocktowerRole.ScarletWoman,
  ClocktowerRole.Imp,
];

// ─── Derive smart recommendations for a given action ───────────────────
function getRecommendation(
  action: GameAction,
  players: Player[],
  allActions: GameAction[]
): { emoji: string; text: string; color: string } | null {
  const actor = players.find((p) => p.id === action.playerId);
  const target = players.find((p) => p.id === action.targetId);
  const secondTarget = players.find((p) => p.id === action.secondTargetId);
  if (!actor) return null;

  const role = actor.gameData?.role as ClocktowerRole | undefined;
  const isDrunk = actor.gameData?.isDrunk === true;
  const drunkRole = actor.gameData?.drunkRole as ClocktowerRole | undefined;
  const targetRole = target?.gameData?.role as ClocktowerRole | undefined;
  const secondTargetRole = secondTarget?.gameData?.role as ClocktowerRole | undefined;

  // Check Monk protection
  const monkAction = allActions.find((a) => {
    const monkActor = players.find((p) => p.id === a.playerId);
    return monkActor?.gameData?.role === ClocktowerRole.Monk && a.targetId === action.targetId;
  });
  const isProtected = !!monkAction;

  // Check if the actor is poisoned by Poisoner
  const isPoisoned = actor.gameData?.isPoisoned === true;

  // ── Drunk always gets false info ────────────────────────────────────
  // Show this first so host always knows, even when Drunk acts as their fake role
  if (isDrunk && drunkRole) {
    return {
      emoji: '🍺',
      text: `${actor.name} là KẺ SAY RƯỢU (thực ra là Drunk, nghĩ mình là ${drunkRole}). Hãy đưa thông tin GIẢ cho họ.`,
      color: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
    };
  }

  // ── Poisoned actor — give false info ────────────────────────────────
  if (isPoisoned && role) {
    return {
      emoji: '🤢',
      text: `${actor.name} (${role}) đang bị NHIỄM ĐỘC — Đưa thông tin GIẢ cho họ.`,
      color: 'text-green-300 bg-green-500/10 border-green-500/20',
    };
  }

  // ── Poisoner ────────────────────────────────────────────────────────
  if (role === ClocktowerRole.Poisoner && target) {
    return {
      emoji: '☠️',
      text: `${target.name} bị NHIỄM ĐỘC đêm nay và ngày mai. Đánh dấu isPoisoned cho họ, và trả lời các hành động của họ bằng thông tin SAI.`,
      color: 'text-purple-300 bg-purple-500/10 border-purple-500/20',
    };
  }

  // ── Monk ────────────────────────────────────────────────────────────
  if (role === ClocktowerRole.Monk && target) {
    return {
      emoji: '🛡️',
      text: `${target.name} được BẢO VỆ khỏi Quỷ đêm nay. Nếu Quỷ tấn công họ, không ai chết.`,
      color: 'text-green-300 bg-green-500/10 border-green-500/20',
    };
  }

  // ── Imp (Demon) ────────────────────────────────────────────────────
  if (role === ClocktowerRole.Imp && target) {
    if (action.targetId === action.playerId) {
      return {
        emoji: '🔁',
        text: `Imp TỰ GIẾT bản thân! Một Minion ngẫu nhiên sẽ trở thành Imp mới. Chọn Minion và cập nhật vai trò của họ.`,
        color: 'text-orange-300 bg-orange-500/10 border-orange-500/20',
      };
    }
    if (isProtected) {
      return {
        emoji: '✅',
        text: `${target.name} được Monk bảo vệ — KHÔNG AI CHẾT đêm nay.`,
        color: 'text-green-300 bg-green-500/10 border-green-500/20',
      };
    }
    if (targetRole === ClocktowerRole.Soldier) {
      return {
        emoji: '🛡️',
        text: `${target.name} là SOLDIER — miễn nhiễm với Quỷ. KHÔNG AI CHẾT đêm nay.`,
        color: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/20',
      };
    }
    return {
      emoji: '💀',
      text: `${target.name} SẼ CHẾT đêm nay. Đánh dấu họ là đã chết khi bắt đầu ngày.`,
      color: 'text-red-300 bg-red-500/10 border-red-500/20',
    };
  }

  // ── Fortune Teller ─────────────────────────────────────────────────
  // Now checks BOTH targets (first and second)
  if (role === ClocktowerRole.FortuneTeller) {
    const targets = [target, secondTarget].filter(Boolean);
    const targetNames = targets.map((t) => t!.name).join(' & ');
    const roles = [targetRole, secondTargetRole];
    const hasDemon = roles.includes(ClocktowerRole.Imp);
    const hasRecluse = roles.includes(ClocktowerRole.Recluse);

    if (hasDemon) {
      return {
        emoji: '🔮',
        text: `[${targetNames}] — Có 1 người là Quỷ (Imp). → Trả lời: CÓ (Yes).`,
        color: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20',
      };
    }
    if (hasRecluse) {
      return {
        emoji: '🔮',
        text: `[${targetNames}] — Có Recluse, có thể đăng ký như Quỷ. → Bạn CÓ THỂ trả lời CÓ hoặc KHÔNG.`,
        color: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20',
      };
    }
    return {
      emoji: '🔮',
      text: `[${targetNames}] — Không có Quỷ trong 2 người. → Trả lời: KHÔNG (No).`,
      color: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20',
    };
  }

  // ── Spy ──────────────────────────────────────────────────────────
  if (role === ClocktowerRole.Spy) {
    const grimoire = players
      .filter((p) => !p.isHost)
      .map((p) => {
        const pRole = p.gameData?.role as ClocktowerRole | undefined;
        const pDrunk = p.gameData?.isDrunk === true;
        const drunkTag = pDrunk ? ' 🍺DRUNK' : '';
        return `${p.name}: ${pRole ? ROLE_ICONS[pRole] : '?'}${pRole || '?'}${drunkTag}`;
      })
      .join(' | ');
    return {
      emoji: '🕵️',
      text: `Cho Spy xem Grimoire: ${grimoire}`,
      color: 'text-slate-300 bg-slate-500/10 border-slate-500/20',
    };
  }

  // ── Empath ──────────────────────────────────────────────────────
  if (role === ClocktowerRole.Empath) {
    const aliveSorted = players.filter((p) => !p.isHost && p.isAlive);
    const myIndex = aliveSorted.findIndex((p) => p.id === actor.id);
    const left = aliveSorted[(myIndex - 1 + aliveSorted.length) % aliveSorted.length];
    const right = aliveSorted[(myIndex + 1) % aliveSorted.length];
    const leftRole = left?.gameData?.role as ClocktowerRole | undefined;
    const rightRole = right?.gameData?.role as ClocktowerRole | undefined;
    const leftTeam = leftRole ? ROLE_TEAMS[leftRole] : 'townsfolk';
    const rightTeam = rightRole ? ROLE_TEAMS[rightRole] : 'townsfolk';
    const evilCount = [leftTeam, rightTeam].filter((t) => t === 'minion' || t === 'demon').length;
    return {
      emoji: '💗',
      text: `Hàng xóm: ${left?.name || '?'} (${leftTeam}) và ${right?.name || '?'} (${rightTeam}). → Trả lời: ${evilCount}.`,
      color: 'text-pink-300 bg-pink-500/10 border-pink-500/20',
    };
  }

  // ── Washerwoman ─────────────────────────────────────────────────
  if (role === ClocktowerRole.Washerwoman) {
    const townsfolk = players.filter((p) => !p.isHost && ROLE_TEAMS[p.gameData?.role as ClocktowerRole] === 'townsfolk');
    if (townsfolk.length > 0) {
      const real = townsfolk[0];
      const decoy = players.filter((p) => !p.isHost && p.id !== real.id)[0];
      return {
        emoji: '🧺',
        text: `Gợi ý: Chỉ cho họ "${real.name}" và "${decoy?.name || '?'}" — nói rằng 1 trong 2 người là ${real.gameData?.role}.`,
        color: 'text-blue-300 bg-blue-500/10 border-blue-500/20',
      };
    }
  }

  // ── Librarian ───────────────────────────────────────────────────
  if (role === ClocktowerRole.Librarian) {
    const outsiders = players.filter((p) => !p.isHost && ROLE_TEAMS[p.gameData?.role as ClocktowerRole] === 'outsider' && !p.gameData?.isDrunk);
    if (outsiders.length > 0) {
      const real = outsiders[0];
      const decoy = players.filter((p) => !p.isHost && p.id !== real.id)[0];
      return {
        emoji: '📚',
        text: `Gợi ý: Chỉ cho họ "${real.name}" và "${decoy?.name || '?'}" — nói rằng 1 trong 2 người là ${real.gameData?.role}.`,
        color: 'text-blue-300 bg-blue-500/10 border-blue-500/20',
      };
    }
    return {
      emoji: '📚',
      text: `Không có Outsider trong ván đấu (hoặc Drunk đang đóng vai). → Trả lời: "Không có Outsider nào."`,
      color: 'text-blue-300 bg-blue-500/10 border-blue-500/20',
    };
  }

  // ── Investigator ────────────────────────────────────────────────
  if (role === ClocktowerRole.Investigator) {
    const minions = players.filter((p) => !p.isHost && ROLE_TEAMS[p.gameData?.role as ClocktowerRole] === 'minion');
    if (minions.length > 0) {
      const real = minions[0];
      const decoy = players.filter((p) => !p.isHost && p.id !== real.id)[0];
      return {
        emoji: '🔍',
        text: `Gợi ý: Chỉ cho họ "${real.name}" và "${decoy?.name || '?'}" — nói rằng 1 trong 2 người là ${real.gameData?.role}.`,
        color: 'text-blue-300 bg-blue-500/10 border-blue-500/20',
      };
    }
  }

  // ── Chef ────────────────────────────────────────────────────────
  if (role === ClocktowerRole.Chef) {
    const aliveSorted = players.filter((p) => !p.isHost && p.isAlive);
    let evilPairs = 0;
    for (let i = 0; i < aliveSorted.length; i++) {
      const a = aliveSorted[i];
      const b = aliveSorted[(i + 1) % aliveSorted.length];
      const aTeam = ROLE_TEAMS[a.gameData?.role as ClocktowerRole];
      const bTeam = ROLE_TEAMS[b.gameData?.role as ClocktowerRole];
      const aEvil = aTeam === 'minion' || aTeam === 'demon';
      const bEvil = bTeam === 'minion' || bTeam === 'demon';
      if (aEvil && bEvil) evilPairs++;
    }
    return {
      emoji: '👨‍🍳',
      text: `Số cặp người ác ngồi cạnh nhau: ${evilPairs}. → Trả lời: ${evilPairs}.`,
      color: 'text-yellow-300 bg-yellow-500/10 border-yellow-500/20',
    };
  }

  // ── Butler ──────────────────────────────────────────────────────
  if (role === ClocktowerRole.Butler && target) {
    return {
      emoji: '🎩',
      text: `${actor.name} chọn ${target.name} làm chủ. Ngày mai, Butler chỉ bỏ phiếu nếu ${target.name} bỏ phiếu trước.`,
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

  return (
    <div className="mb-4 overflow-x-auto rounded-xl border border-white/10 bg-black/20 p-3">
      <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">Night Order (Active)</p>
      <div className="flex items-center gap-1 flex-wrap">
        {activeInOrder.map((role, idx) => {
          const player = players.find((p) => p.gameData?.role === role && !p.isHost);
          return (
            <div key={role} className="flex items-center gap-1">
              <div className="flex flex-col items-center rounded-lg bg-white/5 border border-white/10 p-2 min-w-[56px] text-center">
                <span className="text-lg">{ROLE_ICONS[role]}</span>
                <span className="text-[10px] text-slate-400 leading-tight">{player?.name || role}</span>
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
  resolveMessages,
  onResolveMessageChange,
  onResolve,
}: NightTimelinePanelProps) {
  const allActions = [...pendingActions, ...resolvedActions];

  // Sort by creation time
  const sortedPending = [...pendingActions].sort(
    (a, b) => (a.createdAt as any)?.seconds - (b.createdAt as any)?.seconds
  );

  const sortedResolved = [...resolvedActions].sort(
    (a, b) => (a.createdAt as any)?.seconds - (b.createdAt as any)?.seconds
  );

  return (
    <div className="space-y-4">
      {/* Night Order */}
      <NightOrderDisplay players={players} dayCount={dayCount} />

      {/* Pending Actions */}
      <div>
        <h3 className="flex items-center gap-2 mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-purple-500" />
          </span>
          Pending ({pendingActions.length})
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
            const recommendation = getRecommendation(action, players, allActions);

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
                        </span>
                      )}
                    </div>
                    {(action.targetName || action.secondTargetName) && (
                      <>
                        <span className="text-slate-500">→</span>
                        <span className="text-purple-300 font-medium">
                          {action.targetName || '—'}
                          {action.secondTargetName && (
                            <span className="text-cyan-300"> & {action.secondTargetName}</span>
                          )}
                        </span>
                      </>
                    )}
                    {!action.targetName && !action.secondTargetName && (
                      <>
                        <span className="text-slate-500">→</span>
                        <span className="text-slate-500 text-xs italic">Chờ thông tin</span>
                      </>
                    )}
                  </div>
                  <span className="rounded-full bg-yellow-500/20 px-2.5 py-0.5 text-xs font-medium text-yellow-400 shrink-0">
                    {action.actionType}
                  </span>
                </div>

                {/* Smart Recommendation */}
                {recommendation && (
                  <div className={`rounded-lg border p-3 text-sm ${recommendation.color}`}>
                    <span className="mr-2 text-base">{recommendation.emoji}</span>
                    <span className="font-medium">Gợi ý Quản trò:</span>{' '}
                    <span>{recommendation.text}</span>
                  </div>
                )}

                {/* Resolve input */}
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

      {/* Resolved / Night Log */}
      {sortedResolved.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
            📜 Nhật ký Đêm ({sortedResolved.length})
          </h3>
          <div className="relative space-y-0 border-l-2 border-white/10 ml-3">
            {sortedResolved.map((action, idx) => {
              const actor = players.find((p) => p.id === action.playerId);
              const role = actor?.gameData?.role as ClocktowerRole | undefined;
              return (
                <div key={action.id} className="relative pl-5 pb-3">
                  {/* Timeline dot */}
                  <div className="absolute -left-[7px] top-1 h-3 w-3 rounded-full bg-green-500 border-2 border-slate-900" />

                  <div className="rounded-lg bg-white/5 border border-white/5 px-3 py-2 text-sm">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {role && <span>{ROLE_ICONS[role]}</span>}
                      <span className="font-medium text-slate-300">{action.playerName}</span>
                      <span className="text-slate-600">→</span>
                      <span className="text-slate-400">
                        {action.targetName || '—'}
                        {action.secondTargetName && <span className="text-cyan-400"> & {action.secondTargetName}</span>}
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
