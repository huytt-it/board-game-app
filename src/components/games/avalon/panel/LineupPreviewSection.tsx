'use client';

import type { Player } from '@/types/player';
import type { AvalonGameState, AvalonRole } from '../types';
import { ROLE_TEAM } from '../constants';
import { formatClock, usePhaseClock } from '../hooks/usePhaseClock';
import { useCue } from '../hooks/useCue';
import { LINEUP } from '../table/timelines';
import { RoleLineChip } from './shared';
import AvIcon from '../assets/AvIcon';
import ActionDock from '../ui/ActionDock';
import GlassPanel from '../ui/GlassPanel';

// The line-up: which roles are in this game (public — no role is tied to a
// player), the first Leader and Lady. Drawn as a parchment scroll that unrolls
// as the phase starts, the role chips landing on it one after another
// (table/timelines.ts LINEUP, on the phase clock: a reload lands on the right
// frame). Meanwhile the table above shuffles the seats and spins the crown.
export function LineupPreviewSection({
  state,
  myPlayer,
  gamePlayers,
  onAckRole,
}: {
  state: AvalonGameState;
  myPlayer: Player;
  gamePlayers: Player[];
  onAckRole: () => void;
}) {
  const { remaining } = usePhaseClock(state);
  const cue = useCue(state.phaseStartedAt ?? 0);

  const ackedIds = Object.keys(state.roleAcks ?? {});
  const myAcked = ackedIds.includes(myPlayer.id);
  const ackCount = ackedIds.length;
  const total = gamePlayers.length;
  const allAcked = ackCount >= total;
  const low = remaining < 15000;

  const lineup = state.roleLineup ?? [];
  const goodRoles = lineup.filter((r) => ROLE_TEAM[r] === 'good');
  const evilRoles = lineup.filter((r) => ROLE_TEAM[r] === 'evil');
  const leader = gamePlayers.find((p) => p.id === state.currentLeaderId);
  const lady = gamePlayers.find((p) => p.id === state.ladyHolderId);

  // Đếm số lượng từng role để hiện tổng quan (vd "LoyalServant ×2") —
  // KHÔNG gắn với player nào, chỉ cho biết ván có những role gì.
  const count = (roles: AvalonRole[]) => {
    const c = new Map<AvalonRole, number>();
    for (const r of roles) c.set(r, (c.get(r) ?? 0) + 1);
    return [...c.entries()];
  };
  const good = count(goodRoles);
  const evil = count(evilRoles);
  // The chips land one after another: good team first, then evil.
  const chipDelay = (i: number) => ({ animationDelay: cue(LINEUP.chipsAt + LINEUP.chipGapMs * i) });

  return (
    <div className="flex flex-col gap-2.5">
      {/* The scroll: two wooden rods and the parchment between them. */}
      <div className="av-unroll" style={{ animationDelay: cue(0) }} data-lineup-scroll="">
        <div className="av-scroll-rod" />
        <div className="av-parchment mx-1.5 px-3 pb-3 pt-2.5 text-(--av-ink)">
          <div className="flex items-baseline justify-between gap-2 border-b border-(--av-ink)/15 pb-1.5">
            <h3 className="av-display flex items-center gap-1.5 text-lg leading-tight">
              <AvIcon name="roles" className="text-(--av-ink)/70" /> Các vai trong ván
            </h3>
            <p className="shrink-0 text-[11px] font-bold text-(--av-ink)/70">
              {goodRoles.length} Người · {evilRoles.length} Quỷ
            </p>
          </div>

          {/* Phe Người | Phe Quỷ — public information, in team colours. */}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div>
              <p className="mb-1 flex items-center gap-1 text-[11px] font-black text-(--av-good-ink)">
                <AvIcon name="team-good" /> Phe Người ({goodRoles.length})
              </p>
              <div className="grid grid-cols-1 gap-1">
                {good.map(([role, n], i) => (
                  <div key={role} className="av-chip-in" style={chipDelay(i)}>
                    <RoleLineChip role={role} count={n} tone="good" surface="parchment" />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1 flex items-center gap-1 text-[11px] font-black text-(--av-evil-ink)">
                <AvIcon name="team-evil" /> Phe Quỷ ({evilRoles.length})
              </p>
              <div className="grid grid-cols-1 gap-1">
                {evil.map(([role, n], i) => (
                  <div key={role} className="av-chip-in" style={chipDelay(good.length + i)}>
                    <RoleLineChip role={role} count={n} tone="evil" surface="parchment" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* The first Leader (and Lady, 7+ players) — their tokens land on the table. */}
          <div className={`mt-2.5 grid gap-2 border-t border-(--av-ink)/15 pt-2 ${lady ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-amber-100 bg-(--av-gold) text-sm text-(--av-ink) shadow shadow-black/30">
                <AvIcon name="leader" />
              </span>
              <span className="min-w-0">
                <span className="block text-[9px] font-black uppercase tracking-widest text-(--av-ink)/65">Leader đầu</span>
                <span className="block truncate text-sm font-black">
                  {leader?.name ?? '?'}
                  {leader?.id === myPlayer.id && <span className="ml-1 text-[10px] text-(--av-ink)/70">(bạn)</span>}
                </span>
              </span>
            </div>
            {lady && (
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-teal-100 bg-(--av-lady) text-sm text-(--av-ink) shadow shadow-black/30">
                  <AvIcon name="lady" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[9px] font-black uppercase tracking-widest text-(--av-ink)/65">Lady đầu</span>
                  <span className="block truncate text-sm font-black">
                    {lady.name}
                    {lady.id === myPlayer.id && <span className="ml-1 text-[10px] text-(--av-ink)/70">(bạn)</span>}
                  </span>
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="av-scroll-rod" />
      </div>

      {/* Countdown + who is ready. */}
      <GlassPanel tone={!allAcked && low ? 'evil' : 'neutral'} className="flex items-center gap-3 p-3">
        <div className="shrink-0 text-center">
          <p className="text-[9px] font-bold uppercase text-slate-400">{allAcked ? 'Chia vai' : 'Tự chia sau'}</p>
          <p className={`text-lg font-black leading-tight tabular-nums ${allAcked ? 'text-emerald-300' : low ? 'text-amber-300' : 'text-white'}`}>
            {allAcked ? <AvIcon name="check" title="Mọi người đã sẵn sàng" /> : formatClock(remaining)}
          </p>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-400">Sẵn sàng nhận vai</span>
            <span className="text-xs font-black tabular-nums text-white">
              {ackCount}/{total}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-(--av-gold) transition-all duration-500"
              style={{ width: `${total > 0 ? (ackCount / total) * 100 : 0}%` }}
            />
          </div>
        </div>
      </GlassPanel>

      <ActionDock>
        {!myAcked ? (
          <button
            onClick={onAckRole}
            className="w-full rounded-2xl border border-(--av-gold)/60 bg-(--av-gold)/20 py-4 text-base font-black text-(--av-parchment) transition-all hover:bg-(--av-gold)/30 active:scale-[0.98]"
          >
            ✓ Đã xem — Sẵn sàng nhận vai
          </button>
        ) : (
          <button
            disabled
            className="w-full rounded-2xl border border-emerald-400/40 bg-(color:--av-glass-bg) py-4 text-base font-black text-emerald-200"
          >
            ✓ Bạn sẵn sàng — Chờ những người khác
          </button>
        )}
      </ActionDock>
    </div>
  );
}
