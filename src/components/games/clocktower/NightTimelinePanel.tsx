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
  if (!actor) return null;

  const role = actor.gameData?.role as ClocktowerRole | undefined;
  const isDrunk = actor.gameData?.isDrunk === true;
  const targetRole = target?.gameData?.role as ClocktowerRole | undefined;

  // Check Monk protection
  const monkAction = allActions.find((a) => {
    const monkActor = players.find((p) => p.id === a.playerId);
    return monkActor?.gameData?.role === ClocktowerRole.Monk && a.targetId === action.targetId;
  });
  const isProtected = !!monkAction;

  // ── Drunk always gets false info ────────────────────────────────────
  if (isDrunk && role) {
    return {
      emoji: '🍺',
      text: `${actor.name} là KẺ SAY RƯỢU — Đưa thông tin GIẢ cho họ (họ nghĩ mình là ${role}, nhưng không phải).`,
      color: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
    };
  }

  // ── Poisoner ────────────────────────────────────────────────────────
  if (role === ClocktowerRole.Poisoner && target) {
    return {
      emoji: '☠️',
      text: `${target.name} bị NHIỄM ĐỘC đêm nay. Đưa thông tin SAI cho họ khi họ sử dụng chức năng.`,
      color: 'text-purple-300 bg-purple-500/10 border-purple-500/20',
    };
  }

  // ── Monk ────────────────────────────────────────────────────────────
  if (role === ClocktowerRole.Monk && target) {
    return {
      emoji: '🛡️',
      text: `${target.name} được BẢOVỆ khỏi Quỷ đêm nay. Nếu Quỷ tấn công họ, không ai chết.`,
      color: 'text-green-300 bg-green-500/10 border-green-500/20',
    };
  }

  // ── Imp (Demon) ────────────────────────────────────────────────────
  if (role === ClocktowerRole.Imp && target) {
    // Self-kill → starpass
    if (action.targetId === action.playerId) {
      return {
        emoji: '🔁',
        text: `Imp TỰ GIẾT bản thân! Một Tay Sai (Minion) ngẫu nhiên sẽ trở thành Imp mới.`,
        color: 'text-orange-300 bg-orange-500/10 border-orange-500/20',
      };
    }
    // Protected by Monk
    if (isProtected) {
      return {
        emoji: '✅',
        text: `${target.name} được Monk bảo vệ. KHÔNG AI CHẾT đêm nay.`,
        color: 'text-green-300 bg-green-500/10 border-green-500/20',
      };
    }
    // Soldier
    if (targetRole === ClocktowerRole.Soldier) {
      return {
        emoji: '🛡️',
        text: `${target.name} là SOLDIER — miễn nhiễm với Quỷ. KHÔNG AI CHẾT đêm nay.`,
        color: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/20',
      };
    }
    return {
      emoji: '💀',
      text: `${target.name} SẼ CHẾT đêm nay. Bạn cần đánh dấu họ là đã chết khi bắt đầu ngày.`,
      color: 'text-red-300 bg-red-500/10 border-red-500/20',
    };
  }

  // ── Fortune Teller ─────────────────────────────────────────────────
  if (role === ClocktowerRole.FortuneTeller && target) {
    // Check if second target is in the ability description
    const isTargetDemon = targetRole === ClocktowerRole.Imp;
    const targetTeam = targetRole ? ROLE_TEAMS[targetRole] : null;
    const isRecluse = targetRole === ClocktowerRole.Recluse;

    if (isTargetDemon) {
      return {
        emoji: '🔮',
        text: `Một trong hai người chơi là Quỷ (Imp). → Trả lời: CÓ (Yes).`,
        color: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20',
      };
    }
    if (isRecluse) {
      return {
        emoji: '🔮',
        text: `Một người chơi là Recluse — có thể đăng ký như Quỷ. → Bạn CÓ THỂ trả lời CÓ hoặc KHÔNG tùy ý.`,
        color: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20',
      };
    }
    return {
      emoji: '🔮',
      text: `Không ai trong 2 người là Quỷ. → Trả lời: KHÔNG (No).`,
      color: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20',
    };
  }

  // ── Spy ──────────────────────────────────────────────────────────
  if (role === ClocktowerRole.Spy) {
    const grimoire = players
      .filter((p) => !p.isHost)
      .map((p) => `${p.name}: ${ROLE_ICONS[p.gameData?.role as ClocktowerRole] || '?'} ${p.gameData?.role || '?'}`)
      .join(', ');
    return {
      emoji: '🕵️',
      text: `Cho Spy xem Grimoire: [${grimoire}]`,
      color: 'text-slate-300 bg-slate-500/10 border-slate-500/20',
    };
  }

  // ── Empath ──────────────────────────────────────────────────────
  if (role === ClocktowerRole.Empath) {
    const playerIndex = players.findIndex((p) => p.id === actor.id);
    const aliveSorted = players.filter((p) => !p.isHost && p.isAlive);
    const myIndex = aliveSorted.findIndex((p) => p.id === actor.id);
    const left = aliveSorted[(myIndex - 1 + aliveSorted.length) % aliveSorted.length];
    const right = aliveSorted[(myIndex + 1) % aliveSorted.length];
    const leftTeam = left?.gameData?.role ? ROLE_TEAMS[left.gameData.role as ClocktowerRole] : 'good';
    const rightTeam = right?.gameData?.role ? ROLE_TEAMS[right.gameData.role as ClocktowerRole] : 'good';
    const evilCount = [leftTeam, rightTeam].filter((t) => t === 'minion' || t === 'demon').length;
    return {
      emoji: '💗',
      text: `Hàng xóm: ${left?.name || '?'} (${leftTeam}) và ${right?.name || '?'} (${rightTeam}). → Trả lời: ${evilCount} (số lượng hàng xóm ác).`,
      color: 'text-pink-300 bg-pink-500/10 border-pink-500/20',
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {role && <span className="text-xl">{ROLE_ICONS[role]}</span>}
                    <div>
                      <span className="font-semibold text-white">{action.playerName}</span>
                      {role && <span className="ml-2 text-xs text-purple-400">{role}</span>}
                    </div>
                    <span className="text-slate-500">→</span>
                    <span className="text-purple-300 font-medium">{action.targetName || 'No target'}</span>
                  </div>
                  <span className="rounded-full bg-yellow-500/20 px-2.5 py-0.5 text-xs font-medium text-yellow-400">
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
                    <div className="flex items-center gap-2 mb-1">
                      {role && <span>{ROLE_ICONS[role]}</span>}
                      <span className="font-medium text-slate-300">{action.playerName}</span>
                      <span className="text-slate-600">→</span>
                      <span className="text-slate-400">{action.targetName || '—'}</span>
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
