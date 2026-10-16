'use client';

import { useState } from 'react';
import { aliveIds } from '@/components/games/werewolf/engine/table.ts';
import Button from '../ui/Button';
import { useConfirm } from '../ui/Dialog';
import { Dock, PhaseHeader, PlayerTile, nameOf, revealedRole, type PanelCtx } from './shared';

// Thợ săn (rules §5.7): Thợ săn vừa chết chọn một người còn sống để bắn, hoặc
// không bắn. Bước này công khai (vai Thợ săn lộ ra là đương nhiên), nên không
// cần giữ để xem. Bấm Bắn / Không bắn (có hộp xác nhận) là chuyển bước luôn.
// Hết giờ thì coi như không bắn.
export default function HunterPanel({ ctx, onShoot }: { ctx: PanelCtx; onShoot: (targetId: string | null) => Promise<boolean> }) {
  const { state, me, table, players } = ctx;
  const hunterId = state.hunter?.hunterId ?? null;
  const isMe = hunterId === me.id;
  const { ask, dialog } = useConfirm();
  const [aim, setAim] = useState<{ at: number; id: string } | null>(null);
  const [sendingAt, setSendingAt] = useState<number | null>(null);
  const [late, setLate] = useState<number | null>(null);
  const alive = aliveIds(table);
  const aimId = aim && aim.at === state.phaseStartedAt && alive.includes(aim.id) ? aim.id : null;
  const open = ctx.remaining > 0;
  const sending = sendingAt === state.phaseStartedAt;

  const fire = async (targetId: string | null) => {
    const ok = await ask(
      targetId
        ? { title: `Bắn ${nameOf(players, targetId)}?`, message: 'Người này chết ngay. Không đổi lại được.', confirmLabel: 'Bắn', danger: true }
        : { title: 'Không bắn ai?', message: 'Bạn bỏ lượt bắn. Không đổi lại được.', confirmLabel: 'Không bắn' }
    );
    if (!ok) return;
    setSendingAt(state.phaseStartedAt);
    const done = await onShoot(targetId).catch(() => null);
    if (done !== true) setSendingAt(null);
    if (done === false) setLate(state.phaseStartedAt);
  };

  const byId = new Map(players.map((p) => [p.id, p]));
  const after = state.hunter?.after === 'vote' ? 'Sau đó trời tối.' : 'Sau đó cả làng thảo luận.';
  return (
    <section data-phase-section="hunter" data-ww-hunter={hunterId ?? ''}>
      <PhaseHeader title="Thợ săn" remaining={ctx.remaining}>
        {isMe ? `Bạn là Thợ săn và đã chết. Bắn một người, hoặc không bắn. ${after}` : `Thợ săn ${nameOf(players, hunterId)} đang ngắm… ${after}`}
      </PhaseHeader>

      <div className="grid grid-cols-2 gap-2 min-[360px]:grid-cols-3" role="group" aria-label="Người còn sống">
        {alive.map((id) => {
          const p = byId.get(id);
          if (!p) return null;
          return (
            <PlayerTile
              key={id}
              player={p}
              label={isMe ? `Ngắm ${p.name}` : p.name}
              selected={isMe && aimId === id}
              role={revealedRole(ctx, id)}
              disabled={!isMe || !open || sending}
              onClick={() => setAim({ at: state.phaseStartedAt, id })}
            />
          );
        })}
      </div>

      {late === state.phaseStartedAt && <p className="mt-3 text-center text-sm font-semibold text-amber-300">Hết giờ — lượt bắn đã qua.</p>}

      {isMe ? (
        <Dock>
          <div className="flex gap-2">
            <Button block disabled={!open || sending} onClick={() => fire(null)}>
              Không bắn
            </Button>
            <Button block variant="danger" disabled={!open || sending || !aimId} onClick={() => aimId && fire(aimId)}>
              {sending ? 'Đang gửi…' : aimId ? `Bắn ${nameOf(players, aimId)}` : 'Chọn người để bắn'}
            </Button>
          </div>
        </Dock>
      ) : (
        <p className="mt-4 text-center text-sm text-slate-400">Chờ Thợ săn quyết định…</p>
      )}
      {dialog}
    </section>
  );
}
