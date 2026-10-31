'use client';

import { useState } from 'react';
import { useCue } from '@/components/games/shared/hooks/useCue';
import { aliveIds } from '@/components/games/werewolf/engine/table.ts';
import { isDead } from '../state';
import Button from '../ui/Button';
import { HUNTER_SHOT, hunterShotOf, loveFollowersOf } from '../scenes/timelines';
import { DoneMark } from './DealPanel';
import { DeadNote, Dock, PhaseHeader, PhaseLayout, revealedRole, RoleLine, Seat, StatusLine, type PanelCtx } from './shared';

/**
 * Cả làng (công khai): người còn sống, người đã chết (bia mộ; vai chỉ hiện khi
 * đã lộ lúc chết), dấu ✓ khi `mark` đúng (vd. sẵn sàng bỏ phiếu). Dùng ở Thảo luận.
 * Ngay sau phát bắn của Thợ săn, ghế người bị bắn thành bia mộ cùng lúc với thẻ
 * phát bắn (HunterShot).
 */
export function Roster({ ctx, mark, markLabel }: { ctx: PanelCtx; mark?: (id: string) => boolean; markLabel?: string }) {
  const cue = useCue(ctx.state.phaseStartedAt);
  const shot = hunterShotOf(ctx.state);
  // Người bị bắn và người chết theo họ (rules §11.5) thành bia mộ cùng lúc.
  const fallen = shot?.targetId ? [shot.targetId, ...loveFollowersOf(ctx.state.log, shot.targetId, shot.round)] : [];
  return (
    <ul className="grid grid-cols-2 gap-2 lg:grid-cols-3 lg:gap-3" aria-label="Người trong làng">
      {ctx.players.map((p) => {
        const dead = isDead(ctx.state, p.id);
        const role = revealedRole(ctx, p.id);
        return (
          <li key={p.id} data-player-id={p.id}>
            <Seat
              player={p}
              dead={dead}
              fall={fallen.includes(p.id) ? cue(HUNTER_SHOT.fallAt) : undefined}
              sub={role ? <RoleLine role={role} /> : p.id === ctx.me.id ? <span className="block text-xs font-normal text-(--ww-text-3)">bạn</span> : undefined}
              mark={!dead && mark?.(p.id) ? <DoneMark label={markLabel} /> : undefined}
            />
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
    <PhaseLayout
      section="day-talk"
      header={
        <PhaseHeader title={`Ngày ${ctx.state.round} — Thảo luận`} remaining={ctx.remaining}>
          Nói chuyện ngoài đời, tìm ra Sói.
        </PhaseHeader>
      }
      stage={<Roster ctx={ctx} mark={(id) => !!ctx.state.acks?.[id]} markLabel="Sẵn sàng bỏ phiếu" />}
    >
      <StatusLine icon="check" className="mt-3 lg:mt-0">
        {readyCount}/{alive.length} người sẵn sàng bỏ phiếu
      </StatusLine>
      {iAmAlive ? (
        <Dock>
          <Button variant="primary" size="lg" block disabled={ready || ctx.remaining <= 0} onClick={send}>
            {ready ? 'Đã sẵn sàng — chờ mọi người' : 'Sẵn sàng bỏ phiếu'}
          </Button>
        </Dock>
      ) : (
        <div className="mt-4">
          <DeadNote />
        </div>
      )}
    </PhaseLayout>
  );
}
