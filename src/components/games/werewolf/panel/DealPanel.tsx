'use client';

import { useState } from 'react';
import { useHold } from '@/components/games/shared/hooks/useHold';
import { ROLE_BLURB, ROLE_NAME } from '@/components/games/werewolf/engine/roles.ts';
import { wolfIds } from '@/components/games/werewolf/engine/table.ts';
import Button from '../ui/Button';
import { Dock, HoldCard, PhaseHeader, nameOf, type PanelCtx } from './shared';

/** Nội dung riêng của "vai của tôi": tên vai, một câu, Sói thấy đồng đội. */
export function MyRoleBody({ ctx }: { ctx: Pick<PanelCtx, 'me' | 'myData' | 'players' | 'table'> }) {
  const role = ctx.myData.role;
  if (!role) return <p>Chưa có vai.</p>;
  const mates = role === 'werewolf' ? wolfIds(ctx.table).filter((id) => id !== ctx.me.id) : [];
  return (
    <div className="space-y-1.5">
      <p className="text-xl font-bold" data-ww-my-role={role}>
        Bạn là {ROLE_NAME[role]}
      </p>
      <p className="text-xs leading-snug text-slate-300">{ROLE_BLURB[role]}</p>
      {role === 'werewolf' && (
        <p className="text-sm text-rose-200">
          {mates.length > 0 ? <>Đồng đội: {mates.map((id) => nameOf(ctx.players, id)).join(', ')}</> : 'Bạn là Sói duy nhất.'}
        </p>
      )}
    </div>
  );
}

export default function DealPanel({ ctx, onAck }: { ctx: PanelCtx; onAck: () => Promise<unknown> }) {
  const { held, bind } = useHold(ctx.state.phaseStartedAt);
  const [sentAt, setSentAt] = useState<number | null>(null);
  const acked = !!ctx.state.acks?.[ctx.me.id] || sentAt === ctx.state.phaseStartedAt;
  const ack = () => {
    setSentAt(ctx.state.phaseStartedAt);
    onAck().catch(() => setSentAt(null));
  };
  const ackCount = ctx.players.filter((p) => ctx.state.acks?.[p.id]).length;
  return (
    <section data-phase-section="deal">
      <PhaseHeader title="Xem vai" remaining={ctx.remaining}>
        Giữ thẻ để xem vai của mình. Đừng để ai nhìn thấy.
      </PhaseHeader>
      <HoldCard held={held} bind={bind} className="h-44">
        {() => <MyRoleBody ctx={ctx} />}
      </HoldCard>
      <p className="mt-3 text-center text-sm text-slate-400">
        {ackCount}/{ctx.players.length} người đã xem
      </p>
      <Dock>
        <Button variant="primary" block disabled={acked} onClick={ack}>
          {acked ? 'Đã xem — chờ mọi người' : 'Đã xem'}
        </Button>
      </Dock>
    </section>
  );
}
