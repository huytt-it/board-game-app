'use client';

import { useState } from 'react';
import { aliveIds } from '@/components/games/werewolf/engine/table.ts';
import { isDead } from '../state';
import Button from '../ui/Button';
import { Avatar, DeadNote, Dock, PhaseHeader, RoleTag, revealedRole, type PanelCtx } from './shared';

/** Danh sách người còn sống / đã chết (công khai; vai chỉ hiện khi đã lộ lúc chết), dùng ở Thảo luận. */
export function Roster({ ctx, mark }: { ctx: PanelCtx; mark?: (id: string) => boolean }) {
  return (
    <ul className="grid grid-cols-1 gap-1.5 min-[360px]:grid-cols-2">
      {ctx.players.map((p) => {
        const dead = isDead(ctx.state, p.id);
        const role = revealedRole(ctx, p.id);
        return (
          <li
            key={p.id}
            data-player-id={p.id}
            className={`flex min-h-11 items-center gap-2 rounded-xl px-2 py-1.5 text-sm ${dead ? 'bg-slate-900/40 text-slate-500' : 'bg-slate-800/80 text-slate-100'}`}
          >
            <Avatar name={p.name} dim={dead} />
            <span className={`min-w-0 flex-1 truncate ${dead ? 'line-through' : 'font-semibold'}`}>
              {p.name}
              {p.id === ctx.me.id && <span className="ml-1 text-xs font-normal text-slate-400">(bạn)</span>}
            </span>
            {role && <RoleTag role={role} />}
            {!dead && mark?.(p.id) && <span className="text-xs font-bold text-emerald-300">✓</span>}
          </li>
        );
      })}
    </ul>
  );
}

// Thảo luận (rules §5.8): cả làng nói chuyện ngoài đời. Kết thúc sớm khi mọi
// người còn sống đã bấm "Sẵn sàng bỏ phiếu".
export default function TalkPanel({ ctx, onReady }: { ctx: PanelCtx; onReady: () => Promise<unknown> }) {
  const [sentAt, setSentAt] = useState<number | null>(null);
  const alive = aliveIds(ctx.table);
  const iAmAlive = alive.includes(ctx.me.id);
  const ready = !!ctx.state.acks?.[ctx.me.id] || sentAt === ctx.state.phaseStartedAt;
  const send = () => {
    setSentAt(ctx.state.phaseStartedAt);
    onReady().catch(() => setSentAt(null));
  };
  const readyCount = alive.filter((id) => ctx.state.acks?.[id]).length;
  return (
    <section data-phase-section="day-talk">
      <PhaseHeader title={`Ngày ${ctx.state.round} — Thảo luận`} remaining={ctx.remaining}>
        Nói chuyện ngoài đời, tìm ra Sói.
      </PhaseHeader>
      <Roster ctx={ctx} mark={(id) => !!ctx.state.acks?.[id]} />
      <p className="mt-3 text-center text-sm text-slate-400">
        {readyCount}/{alive.length} người sẵn sàng bỏ phiếu
      </p>
      {iAmAlive ? (
        <Dock>
          <Button variant="primary" block disabled={ready || ctx.remaining <= 0} onClick={send}>
            {ready ? 'Đã sẵn sàng — chờ mọi người' : 'Sẵn sàng bỏ phiếu'}
          </Button>
        </Dock>
      ) : (
        <div className="mt-4">
          <DeadNote />
        </div>
      )}
    </section>
  );
}
