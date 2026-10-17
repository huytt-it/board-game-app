'use client';

import { useRef, useState } from 'react';
import { useHold } from '@/components/games/shared/hooks/useHold';
import { pickFor, WITCH_PICK_ERROR_TEXT } from '@/components/games/werewolf/engine/night.ts';
import { aliveIds } from '@/components/games/werewolf/engine/table.ts';
import { EMPTY_WITCH_DRAFT, type WitchDraft, type WitchResult } from '../useWerewolf';
import { potionsOf } from '../state';
import WwIcon from '../assets/WwIcon';
import Button from '../ui/Button';
import { DeadNote, Dock, HoldCard, InHoldButton, MeMark, nameOf, PhaseHeader, PhaseLayout, PlayerTile, revealedRole, StatusLine, type PanelCtx } from './shared';

// Đêm ② — Phù thủy (rules §5.4, plan §7 "Bổ sung cho GĐ2" mục 2). Khi không
// giữ thẻ, màn này GIỐNG HỆT NHAU với mọi người: cùng câu, cùng lưới mọi
// người còn sống, cùng nút Xác nhận (bấm được cả khi chưa chọn ai — "Phù thủy
// không làm gì" trông như "người khác không đoán"), cùng dòng "Chưa / Đã xác
// nhận". Chạm lưới khi không giữ = đoán Sói nhắm ai (với Phù thủy chỉ là ô
// sáng, không có tác dụng). Người bị nhắm, công tắc Cứu và việc chọn người để
// Độc chỉ hiện và chỉ thao tác được khi đang giữ: Phù thủy vừa giữ thẻ vừa chạm
// người ở lưới để độc. Một lần chạm lưới lúc không giữ không bao giờ thành độc.

function errorText(code: WitchResult['error'], fallback: string): string {
  return code ? WITCH_PICK_ERROR_TEXT[code] : fallback;
}

function WitchBody({
  ctx,
  draft,
  note,
  locked,
  onDraft,
}: {
  ctx: PanelCtx;
  draft: WitchDraft;
  note: string | null;
  locked: boolean;
  onDraft: (next: WitchDraft) => void;
}) {
  const attack = ctx.state.attack;
  const potions = potionsOf(ctx.myData);
  return (
    <div className="space-y-1.5 text-left" data-ww-witch="">
      <p className="font-bold" data-ww-attack={attack ?? 'none'}>
        {attack ? `Sói nhắm: ${nameOf(ctx.players, attack)}` : 'Đêm nay Sói không cắn ai.'}
      </p>
      {potions.heal ? (
        attack ? (
          <InHoldButton pressed={draft.heal} tone="heal" disabled={locked} onPress={() => onDraft({ ...draft, heal: !draft.heal })}>
            <WwIcon name="heal" size={18} className="mr-1.5" />
            {draft.heal ? `Sẽ cứu ${nameOf(ctx.players, attack)} — bấm để bỏ` : `Cứu ${nameOf(ctx.players, attack)}`}
          </InHoldButton>
        ) : (
          <p className="text-xs text-(--ww-text-3)">Còn bình cứu, đêm nay không có ai để cứu.</p>
        )
      ) : (
        <p className="text-xs text-(--ww-text-3)">Đã dùng bình cứu.</p>
      )}
      {potions.poison ? (
        draft.poisonId ? (
          <InHoldButton pressed tone="poison" disabled={locked} onPress={() => onDraft({ ...draft, poisonId: null })}>
            <WwIcon name="poison" size={18} className="mr-1.5" />
            Sẽ độc {nameOf(ctx.players, draft.poisonId)} — bấm để bỏ
          </InHoldButton>
        ) : (
          <p className="text-xs text-(--ww-text-2)">Độc: vẫn giữ thẻ, chạm một người ở lưới.</p>
        )
      ) : (
        <p className="text-xs text-(--ww-text-3)">Đã dùng bình độc.</p>
      )}
      <p className="text-xs text-(--ww-text-3)">Không dùng bình: cứ bấm Xác nhận.</p>
      {note && (
        <p className="text-xs font-semibold text-(--ww-accent)" data-ww-note="">
          {note}
        </p>
      )}
    </div>
  );
}

function GuessBody({ note }: { note: string | null }) {
  return (
    <div className="space-y-1.5 text-left">
      <p className="font-bold">Đoán xem đêm nay Sói nhắm ai.</p>
      <p className="text-xs text-(--ww-text-2)">Chỉ để tổng kết cuối ván. Không đoán cũng được: cứ bấm Xác nhận.</p>
      {note && (
        <p className="text-xs font-semibold text-(--ww-accent)" data-ww-note="">
          {note}
        </p>
      )}
    </div>
  );
}

export default function WitchPanel({
  ctx,
  onPick,
  onConfirm,
}: {
  ctx: PanelCtx;
  onPick: (draft: WitchDraft) => WitchResult;
  onConfirm: (draft: WitchDraft) => Promise<Pick<WitchResult, 'outcome' | 'error'>>;
}) {
  const { state, me, myData, table, players } = ctx;
  const { held, bind } = useHold(state.phaseStartedAt);
  const [note, setNote] = useState<{ at: number; text: string } | null>(null);
  const heldAtDown = useRef(false);
  // Lựa chọn vừa đổi hiện ngay trên máy này, trước khi lần ghi về (trả lại nếu
  // gửi lỗi); đang gửi Xác nhận thì khoá. Như nhau với mọi người.
  const [pending, setPending] = useState<{ at: number; draft: WitchDraft } | null>(null);
  const [confirmingAt, setConfirmingAt] = useState<number | null>(null);
  const alive = aliveIds(table);
  const stored = pickFor(myData.witchPick, state.round);
  const confirmed = !!stored?.confirmed;
  const confirming = confirmingAt === state.phaseStartedAt && !confirmed;
  const draft: WitchDraft =
    (pending && pending.at === state.phaseStartedAt ? pending.draft : null) ??
    (stored ? { heal: stored.heal, poisonId: stored.poisonId, guessId: stored.guessId } : EMPTY_WITCH_DRAFT);
  const open = ctx.remaining > 0;
  const isWitch = myData.role === 'witch';
  const iAmAlive = alive.includes(me.id);
  const shownNote = note && note.at === state.phaseStartedAt ? note.text : null;
  const say = (text: string | null) => setNote(text ? { at: state.phaseStartedAt, text } : null);

  const change = (next: WitchDraft, invalidText: string) => {
    if (!open) return say('Hết giờ.');
    if (confirming) return;
    if (confirmed) return say('Bạn đã xác nhận, không đổi được nữa.');
    const { outcome, error, write } = onPick(next);
    if (outcome === 'invalid') return say(errorText(error, invalidText));
    if (outcome === 'locked') return say('Bạn đã xác nhận, không đổi được nữa.');
    if (outcome === 'closed') return say('Hết giờ.');
    say(null);
    const mine = { at: state.phaseStartedAt, draft: next };
    setPending(mine);
    write?.catch(() => setPending((p) => (p === mine ? null : p)));
  };

  const tap = (targetId: string) => {
    const wasHeld = heldAtDown.current || held;
    heldAtDown.current = false;
    // Phù thủy đang giữ thẻ: chạm người ở lưới = độc (chạm lại = bỏ độc).
    if (isWitch && wasHeld) {
      return change({ ...draft, poisonId: draft.poisonId === targetId ? null : targetId }, 'Không độc người này được.');
    }
    change({ ...draft, guessId: targetId }, 'Chọn một người còn sống.');
  };

  const confirm = () => {
    // Giữ "đang gửi" đến khi snapshot báo đã xác nhận; gửi lỗi / không hợp lệ thì trả lại.
    setConfirmingAt(state.phaseStartedAt);
    onConfirm(draft).then(
      ({ outcome, error }) => {
        if (outcome === 'ok') return;
        setConfirmingAt(null);
        if (outcome === 'invalid') say(errorText(error, 'Lựa chọn không còn hợp lệ, chọn lại.'));
      },
      () => setConfirmingAt(null)
    );
  };

  const byId = new Map(players.map((p) => [p.id, p]));
  // Ô người bị độc chỉ có dấu khi đang giữ (ngoài ra mọi ô như nhau với mọi người).
  const poisonMark = (
    <span className="inline-flex h-5 items-center gap-1 rounded-full bg-(--ww-wolf-light) px-2 text-xs font-bold text-(--ww-ink)" data-ww-poison-mark="">
      <WwIcon name="poison" size={12} />
      độc
    </span>
  );
  return (
    <PhaseLayout
      section="night-witch"
      header={
        <PhaseHeader title={`Đêm ${state.round} — Phù thủy`} remaining={ctx.remaining}>
          Phù thủy dùng bình. Mọi người đoán Sói nhắm ai rồi bấm Xác nhận.
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
                selected={iAmAlive && draft.guessId === id}
                role={revealedRole(ctx, id)}
                disabled={!iAmAlive}
                onPointerDown={() => {
                  heldAtDown.current = held;
                }}
                onClick={() => tap(id)}
                mark={held && isWitch && draft.poisonId === id ? poisonMark : id === me.id ? <MeMark /> : undefined}
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
            <HoldCard held={held} bind={bind} className="h-60">
              {() =>
                isWitch ? (
                  <WitchBody
                    ctx={ctx}
                    draft={draft}
                    note={shownNote}
                    locked={confirmed || confirming || !open}
                    onDraft={(next) => change(next, 'Không dùng bình như vậy được.')}
                  />
                ) : (
                  <GuessBody note={shownNote} />
                )
              }
            </HoldCard>
          </div>
          <Dock>
            <Button variant="primary" size="lg" block disabled={!open || confirmed || confirming} onClick={confirm}>
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
