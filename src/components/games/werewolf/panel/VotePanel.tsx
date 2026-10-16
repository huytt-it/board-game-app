'use client';

import { useState } from 'react';
import { aliveIds } from '@/components/games/werewolf/engine/table.ts';
import type { DayBallot } from '../types';
import Button from '../ui/Button';
import { DeadNote, Dock, PhaseHeader, PlayerTile, revealedRole, type PanelCtx } from './shared';

// Bỏ phiếu (rules §5.9): bầu một người còn sống khác mình, hoặc Bỏ qua. Đổi
// được đến khi hết bước. Ai đã bầu thì mọi người thấy (dấu ✓), bầu ai thì ẩn.
export default function VotePanel({ ctx, onVote }: { ctx: PanelCtx; onVote: (ballot: DayBallot) => Promise<unknown> }) {
  const alive = aliveIds(ctx.table);
  const iAmAlive = alive.includes(ctx.me.id);
  const votes = ctx.state.dayVotes ?? {};
  // Phiếu vừa bấm sáng ngay trên máy này (trả lại nếu gửi lỗi).
  const [pending, setPending] = useState<{ at: number; b: DayBallot } | null>(null);
  const mine = (pending && pending.at === ctx.state.phaseStartedAt ? pending.b : null) ?? votes[ctx.me.id];
  const vote = (b: DayBallot) => {
    const p = { at: ctx.state.phaseStartedAt, b };
    setPending(p);
    onVote(b).catch(() => setPending((cur) => (cur === p ? null : cur)));
  };
  const open = ctx.remaining > 0;
  const votedCount = alive.filter((id) => typeof votes[id] === 'string').length;
  const byId = new Map(ctx.players.map((p) => [p.id, p]));
  const voted = <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500 text-[11px] font-bold text-slate-950" aria-label="đã bầu">✓</span>;
  return (
    <section data-phase-section="day-vote">
      <PhaseHeader title={`Ngày ${ctx.state.round} — Bỏ phiếu`} remaining={ctx.remaining}>
        Bầu người bạn muốn treo. Đổi được đến khi hết giờ.
      </PhaseHeader>
      <div className="grid grid-cols-2 gap-2 min-[360px]:grid-cols-3" role="group" aria-label="Bầu ai">
        {alive.map((id) => {
          const p = byId.get(id);
          if (!p) return null;
          const self = id === ctx.me.id;
          return (
            <PlayerTile
              key={id}
              player={p}
              label={self ? `${p.name} (bạn)` : `Bầu ${p.name}`}
              selected={mine === id}
              role={revealedRole(ctx, id)}
              disabled={!iAmAlive || self || !open}
              onClick={() => vote(id)}
              mark={typeof votes[id] === 'string' ? voted : undefined}
            />
          );
        })}
      </div>
      <p className="mt-3 text-center text-sm text-slate-400">
        {votedCount}/{alive.length} người đã bầu
      </p>
      {iAmAlive ? (
        <Dock>
          <Button variant={mine === 'skip' ? 'primary' : 'secondary'} block aria-pressed={mine === 'skip'} disabled={!open} onClick={() => vote('skip')}>
            {mine === 'skip' ? 'Đã chọn Bỏ qua' : 'Bỏ qua'}
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
