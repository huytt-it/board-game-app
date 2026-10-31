'use client';

import { useState } from 'react';
import { useHold } from '@/components/games/shared/hooks/useHold';
import { ROLE_BLURB, ROLE_NAME } from '@/components/games/werewolf/engine/roles.ts';
import WwIcon from '../assets/WwIcon';
import Button from '../ui/Button';
import { Dock, HoldCard, PhaseHeader, PhaseLayout, Seat, StatusLine, type PanelCtx } from './shared';
import { myTeam, RoleNotes, TeamLine } from './RoleInfo';

/**
 * Nội dung riêng của "vai của tôi" (chỉ render khi đang giữ): huy hiệu vai trung
 * tính (không tô màu phe lên mảng lớn), tên vai, phe bằng chữ nhỏ, một câu; Sói
 * thấy đồng đội; vai mở rộng thêm các dòng của RoleNotes (Tay sai thấy bầy, Già
 * làng thấy mạng phụ, cặp đôi từ Bình minh ngày 1). `state`: để biết cặp đôi đã
 * được biết chưa (thiếu = đã biết).
 */
export function MyRoleBody({
  ctx,
}: {
  ctx: Pick<PanelCtx, 'me' | 'myData' | 'players' | 'table'> & { state?: Pick<PanelCtx['state'], 'phase' | 'round'> };
}) {
  const role = ctx.myData.role;
  if (!role) return <p>Chưa có vai.</p>;
  const team = myTeam(ctx);
  return (
    <div className="flex items-start gap-3 text-left">
      <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-(--ww-ink) text-(--ww-moon) ring-1 ring-(--ww-line)">
        <WwIcon name={role} size={32} />
      </span>
      <div className="min-w-0 space-y-1">
        <p className="ww-display text-2xl leading-tight text-(--ww-text)" data-ww-my-role={role}>
          Bạn là {ROLE_NAME[role]}
        </p>
        {team && <TeamLine team={team} />}
        <p className="text-sm leading-snug text-(--ww-text-2)">{ROLE_BLURB[role]}</p>
        <RoleNotes ctx={ctx} />
      </div>
    </div>
  );
}

/** Dấu "đã xem / sẵn sàng / đã bầu" trên ghế: công khai, như nhau với mọi vai. */
export function DoneMark({ label = 'Đã xong' }: { label?: string }) {
  return (
    <span className="flex size-5 items-center justify-center rounded-full bg-(--ww-text-2) text-(--ww-ink)" data-ww-done="">
      <WwIcon name="check" size={13} title={label} />
    </span>
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
    <PhaseLayout
      section="deal"
      header={
        <PhaseHeader title="Xem vai" remaining={ctx.remaining}>
          Giữ thẻ để xem vai của mình. Đừng để ai nhìn thấy.
        </PhaseHeader>
      }
      // Màn rộng: cả làng, ai đã xem có dấu ✓ (điện thoại chỉ cần dòng đếm).
      stageOnPhone={false}
      stage={
        <div className="grid grid-cols-3 gap-3" role="list" aria-label="Người trong làng">
          {ctx.players.map((p) => (
            <div key={p.id} role="listitem">
              <Seat
                player={p}
                sub={p.id === ctx.me.id ? <span className="block text-xs font-normal text-(--ww-text-3)">bạn</span> : undefined}
                mark={ctx.state.acks?.[p.id] ? <DoneMark /> : undefined}
              />
            </div>
          ))}
        </div>
      }
    >
      <HoldCard held={held} bind={bind} className="h-48">
        {() => <MyRoleBody ctx={ctx} />}
      </HoldCard>
      <StatusLine icon="check" className="mt-3">
        {ackCount}/{ctx.players.length} người đã xem
      </StatusLine>
      <Dock>
        <Button variant="primary" size="lg" block disabled={acked} onClick={ack}>
          {acked ? 'Đã xem — chờ mọi người' : 'Đã xem'}
        </Button>
      </Dock>
    </PhaseLayout>
  );
}
