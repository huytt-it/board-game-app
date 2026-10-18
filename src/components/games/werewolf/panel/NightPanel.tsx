'use client';

import { useRef, useState } from 'react';
import { useHold } from '@/components/games/shared/hooks/useHold';
import { pickFor, wolfStatus } from '@/components/games/werewolf/engine/night.ts';
import { aliveIds } from '@/components/games/werewolf/engine/table.ts';
import type { PickResult } from '../useWerewolf';
import { dataOf } from '../state';
import type { WwRole } from '../types';
import Button from '../ui/Button';
import { DeadNote, Dock, HoldCard, MeMark, nameOf, PhaseHeader, PhaseLayout, PlayerTile, revealedRole, StatusLine, type PanelCtx } from './shared';

// Đêm ① (rules §5.2, plan §2.3 + "Bổ sung cho GĐ1" mục 7). Khi không giữ thẻ,
// màn này GIỐNG HỆT NHAU với mọi vai: cùng câu, cùng lưới (mọi người còn
// sống), cùng nút, cùng trạng thái "Chưa xác nhận / Đã xác nhận". Lưới không
// làm mờ hay khoá ô theo vai; chạm ô không hợp lệ thì không đổi gì, lý do chỉ
// hiện trong thẻ giữ-để-xem. Sói muốn đổi sau khi Xác nhận thì vừa giữ thẻ
// (thấy lựa chọn của bầy) vừa chạm người khác.

const ACTION_TEXT: Record<WwRole, string> = {
  werewolf: 'Cùng bầy chọn một người để cắn.',
  seer: 'Chọn một người để soi.',
  guard: 'Chọn một người để che khỏi Sói (được tự che).',
  villager: 'Chọn người bạn nghi. Chỉ để tổng kết cuối ván.',
  witch: 'Chọn người bạn nghi. Chỉ để tổng kết cuối ván.',
  hunter: 'Chọn người bạn nghi. Chỉ để tổng kết cuối ván.',
  // Vai mở rộng: màn của từng vai làm ở GĐ5b.
  elder: 'Chọn người bạn nghi. Chỉ để tổng kết cuối ván.',
  lycan: 'Chọn người bạn nghi. Chỉ để tổng kết cuối ván.',
  minion: 'Chọn người bạn nghi. Chỉ để tổng kết cuối ván.',
  tanner: 'Chọn người bạn nghi. Chỉ để tổng kết cuối ván.',
  cupid: 'Chọn người bạn nghi. Chỉ để tổng kết cuối ván.',
  wolfcub: 'Cùng bầy chọn một người để cắn.',
};

function invalidText(role: WwRole, ctx: PanelCtx, targetId: string): string {
  if (role === 'werewolf') return 'Không cắn Sói được.';
  if (role === 'guard') return `Đêm trước bạn đã che ${nameOf(ctx.players, targetId)}, đêm nay không che lại được.`;
  if (role === 'seer') return 'Không tự soi mình được.';
  return 'Chọn một người khác mình.';
}

function WolfPack({ ctx }: { ctx: PanelCtx }) {
  const nightPicks = Object.fromEntries(ctx.players.map((p) => [p.id, dataOf(p).nightPick ?? null]));
  const status = wolfStatus(ctx.table, nightPicks, ctx.state.round);
  return (
    <div className="mt-1.5 space-y-1 text-xs text-(--ww-text-2)" data-ww-pack={status.agreed ? 'agreed' : 'split'}>
      <ul className="space-y-0.5">
        {status.wolves.map((id) => (
          <li key={id}>
            {id === ctx.me.id ? 'Bạn' : nameOf(ctx.players, id)} → {status.picks[id] ? nameOf(ctx.players, status.picks[id]) : 'chưa chọn'}
          </li>
        ))}
      </ul>
      <p className={`font-semibold ${status.agreed ? 'text-(--ww-text)' : 'text-(--ww-accent)'}`}>
        {status.agreedId
          ? `Bầy đã thống nhất: ${nameOf(ctx.players, status.agreedId)}.`
          : status.counts.length === 0
            ? 'Bầy chưa ai chọn.'
            : `Bầy chưa thống nhất: ${status.counts.map((c) => `${nameOf(ctx.players, c.targetId)} (${c.votes})`).join(' · ')}`}
      </p>
    </div>
  );
}

function PrivateBody({ ctx, note }: { ctx: PanelCtx; note: string | null }) {
  const role = ctx.myData.role as WwRole;
  const pick = pickFor(ctx.myData.nightPick, ctx.state.round);
  const look = (ctx.myData.seerLog ?? []).find((l) => l.round === ctx.state.round);
  return (
    <div className="text-left">
      <p className="font-bold">{ACTION_TEXT[role]}</p>
      {role === 'werewolf' && (
        <>
          <WolfPack ctx={ctx} />
          {pick?.confirmed && <p className="mt-1 text-xs text-(--ww-text-3)">Muốn đổi: vẫn giữ thẻ này, chạm người khác ở lưới.</p>}
        </>
      )}
      {role === 'seer' &&
        (look ? (
          <p className="mt-1.5 text-base font-bold" data-ww-seer-result={look.isWolf ? 'wolf' : 'not-wolf'}>
            {nameOf(ctx.players, look.targetId)}:{' '}
            <span className={look.isWolf ? 'text-(--ww-wolf-light)' : 'text-(--ww-village-light)'}>{look.isWolf ? 'LÀ SÓI' : 'không phải Sói'}</span>
          </p>
        ) : (
          <p className="mt-1 text-xs text-(--ww-text-3)">Xác nhận xong, kết quả soi hiện ở đây.</p>
        ))}
      {role === 'guard' && ctx.myData.guardLast && (
        <p className="mt-1 text-xs text-(--ww-text-2)">Đêm trước bạn che {nameOf(ctx.players, ctx.myData.guardLast)}: đêm nay không che lại được.</p>
      )}
      {note && (
        <p className="mt-1.5 text-xs font-semibold text-(--ww-accent)" data-ww-note="">
          {note}
        </p>
      )}
    </div>
  );
}

export default function NightPanel({
  ctx,
  onPick,
  onConfirm,
}: {
  ctx: PanelCtx;
  onPick: (targetId: string) => PickResult;
  onConfirm: (targetId: string) => Promise<unknown>;
}) {
  const { state, me, myData, table, players } = ctx;
  const { held, bind } = useHold(state.phaseStartedAt);
  // Lý do lần chạm vừa rồi không đổi được gì: chỉ hiện trong thẻ khi giữ.
  const [note, setNote] = useState<{ at: number; text: string } | null>(null);
  const heldAtDown = useRef(false);
  // Ô vừa chạm sáng ngay trên máy này, trước khi lần ghi về (trả lại nếu gửi
  // lỗi); đang gửi Xác nhận thì khoá lưới. Như nhau với mọi vai.
  const [pending, setPending] = useState<{ at: number; id: string } | null>(null);
  const [confirmingAt, setConfirmingAt] = useState<number | null>(null);
  const alive = aliveIds(table);
  const pick = pickFor(myData.nightPick, state.round);
  const confirmed = !!pick?.confirmed;
  const confirming = confirmingAt === state.phaseStartedAt && !confirmed;
  const shownPick = (pending && pending.at === state.phaseStartedAt ? pending.id : null) ?? pick?.targetId ?? null;
  const open = ctx.remaining > 0;
  const role = myData.role as WwRole;
  const iAmAlive = alive.includes(me.id);
  const shownNote = note && note.at === state.phaseStartedAt ? note.text : null;
  const say = (text: string | null) => setNote(text ? { at: state.phaseStartedAt, text } : null);

  const tap = (targetId: string) => {
    const wasHeld = heldAtDown.current || held;
    heldAtDown.current = false;
    if (!open) return say('Hết giờ.');
    if (confirming) return;
    if (confirmed && !(role === 'werewolf' && wasHeld)) {
      return say(role === 'werewolf' ? 'Muốn đổi: vừa giữ thẻ, vừa chạm người khác.' : 'Bạn đã xác nhận, không đổi được nữa.');
    }
    const { outcome, write } = onPick(targetId);
    if (outcome === 'invalid') return say(invalidText(role, ctx, targetId));
    if (outcome === 'locked') return say('Bạn đã xác nhận, không đổi được nữa.');
    if (outcome === 'closed') return say('Hết giờ.');
    say(null);
    setConfirmingAt(null);
    const mine = { at: state.phaseStartedAt, id: targetId };
    setPending(mine);
    write?.catch(() => setPending((p) => (p === mine ? null : p)));
  };

  const confirm = () => {
    if (!shownPick) return;
    // Giữ "đang gửi" đến khi snapshot báo đã xác nhận; gửi lỗi thì trả lại.
    setConfirmingAt(state.phaseStartedAt);
    onConfirm(shownPick).catch(() => setConfirmingAt(null));
  };

  const byId = new Map(players.map((p) => [p.id, p]));
  return (
    <PhaseLayout
      section="night"
      header={
        <PhaseHeader title={`Đêm ${state.round}`} remaining={ctx.remaining}>
          Ai cũng chọn một người rồi bấm Xác nhận.
        </PhaseHeader>
      }
      stage={
        <div className="grid grid-cols-2 gap-2 min-[360px]:grid-cols-3 lg:gap-3" role="group" aria-label="Người còn sống">
          {alive.map((id) => {
            const p = byId.get(id);
            if (!p) return null;
            return (
              <PlayerTile
                key={id}
                player={p}
                label={`Chọn ${p.name}`}
                selected={iAmAlive && shownPick === id}
                role={revealedRole(ctx, id)}
                disabled={!iAmAlive}
                onPointerDown={() => {
                  heldAtDown.current = held;
                }}
                onClick={() => tap(id)}
                mark={id === me.id ? <MeMark /> : undefined}
              />
            );
          })}
        </div>
      }
    >
      {iAmAlive ? (
        <>
          <StatusLine icon={confirmed ? 'check' : 'waiting'} accent={!confirmed} className="mt-3 lg:mt-0" data-ww-confirmed={confirmed ? 'yes' : 'no'}>
            {confirmed ? 'Đã xác nhận' : 'Chưa xác nhận'}
          </StatusLine>
          <div className="mt-3">
            <HoldCard held={held} bind={bind} className="h-48">
              {() => <PrivateBody ctx={ctx} note={shownNote} />}
            </HoldCard>
          </div>
          <Dock>
            <Button variant="primary" size="lg" block disabled={!open || !shownPick || confirmed || confirming} onClick={confirm}>
              {confirmed ? 'Đã xác nhận' : confirming ? 'Đang gửi…' : 'Xác nhận'}
            </Button>
          </Dock>
        </>
      ) : (
        <div className="mt-4 lg:mt-0">
          <DeadNote />
        </div>
      )}
    </PhaseLayout>
  );
}
