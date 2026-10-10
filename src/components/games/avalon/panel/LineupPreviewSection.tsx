'use client';

import type { Player } from '@/types/player';
import type { AvalonGameState, AvalonRole } from '../types';
import { ROLE_TEAM } from '../constants';
import { inDisplayOrder } from '../presentation';
import { formatClock, usePhaseClock } from '../hooks/usePhaseClock';
import { useCue } from '../hooks/useCue';
import { LINEUP } from '../table/timelines';
import { DockStatus, RoleLineChip } from './shared';
import AvIcon from '../assets/AvIcon';
import ActionDock from '../ui/ActionDock';
import AvButton from '../ui/AvButton';
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

  // Listed in a fixed order, never in roleLineup's (seat) order — see inDisplayOrder.
  const lineup = inDisplayOrder(state.roleLineup ?? []);
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
            <p className="shrink-0 text-xs font-bold text-(--av-ink)/70">
              {goodRoles.length} Người · {evilRoles.length} Quỷ
            </p>
          </div>

          {/* Phe Người | Phe Quỷ — public information, in team colours. */}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div>
              <p className="mb-1 flex items-center gap-1 text-xs font-bold text-(--av-good-ink)">
                <AvIcon name="team-good" /> Phe Người ({goodRoles.length})
              </p>
              <div className="grid grid-cols-1 gap-1">
                {good.map(([role, n], i) => (
                  <div key={role} className="av-chip-in" style={chipDelay(i)}>
                    <RoleLineChip role={role} count={n} tone="good" />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1 flex items-center gap-1 text-xs font-bold text-(--av-evil-ink)">
                <AvIcon name="team-evil" /> Phe Quỷ ({evilRoles.length})
              </p>
              <div className="grid grid-cols-1 gap-1">
                {evil.map(([role, n], i) => (
                  <div key={role} className="av-chip-in" style={chipDelay(good.length + i)}>
                    <RoleLineChip role={role} count={n} tone="evil" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* The first Leader (and Lady, 7+ players) — their tokens land on the table. */}
          <div className={`mt-2.5 grid gap-2 border-t border-(--av-ink)/15 pt-2 ${lady ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-(--av-parchment)/70 bg-(--av-gold) text-sm text-(--av-ink) shadow shadow-black/30">
                <AvIcon name="leader" />
              </span>
              <span className="min-w-0">
                <span className="block text-xs text-(--av-ink)/70">Leader đầu</span>
                <span className="block truncate text-sm font-bold">
                  {leader?.name ?? '?'}
                  {leader?.id === myPlayer.id && <span className="ml-1 text-xs font-semibold text-(--av-ink)/70">(bạn)</span>}
                </span>
              </span>
            </div>
            {lady && (
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-(--av-parchment)/70 bg-(--av-lady) text-sm text-(--av-ink) shadow shadow-black/30">
                  <AvIcon name="lady" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs text-(--av-ink)/70">Lady đầu</span>
                  <span className="block truncate text-sm font-bold">
                    {lady.name}
                    {lady.id === myPlayer.id && <span className="ml-1 text-xs font-semibold text-(--av-ink)/70">(bạn)</span>}
                  </span>
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="av-scroll-rod" />
      </div>

      {/* Countdown + how many are ready (the dots before the names on the table). */}
      <GlassPanel tone={!allAcked && low ? 'evil' : 'neutral'} className="flex items-center gap-3 p-3">
        <p className="min-w-0 flex-1 text-sm text-(--av-text-2)" data-ready-count={`${ackCount}/${total}`}>
          Sẵn sàng nhận vai{' '}
          <span className="font-semibold tabular-nums text-(--av-text)">
            {ackCount}/{total}
          </span>
        </p>
        <p
          className={`shrink-0 text-right text-xs ${low && !allAcked ? 'text-(--av-evil-light)' : 'text-(--av-text-2)'}`}
          role="timer"
        >
          {allAcked ? (
            <>
              <AvIcon name="check" className="text-(--av-gold)" /> Đang chia vai
            </>
          ) : (
            <>
              Tự chia sau <span className="text-base font-bold tabular-nums">{formatClock(remaining)}</span>
            </>
          )}
        </p>
      </GlassPanel>

      <ActionDock>
        {!myAcked ? (
          <AvButton variant="primary" size="lg" block icon="check" onClick={onAckRole}>
            Đã xem — sẵn sàng nhận vai
          </AvButton>
        ) : (
          <DockStatus icon="check" title="Bạn đã sẵn sàng" note="Chờ những người còn lại" />
        )}
      </ActionDock>
    </div>
  );
}
