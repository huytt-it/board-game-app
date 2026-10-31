'use client';

import { useRef, useState } from 'react';
import { useHold } from '@/components/games/shared/hooks/useHold';
import { CUPID_PICK_ERROR_TEXT, pickFor, wolfBitesFor, wolfStatus } from '@/components/games/werewolf/engine/night.ts';
import { cupidPairsTonight, isWolfRole } from '@/components/games/werewolf/engine/roles.ts';
import { aliveIds } from '@/components/games/werewolf/engine/table.ts';
import type { NightConfirmResult, NightDraft, PickResult } from '../useWerewolf';
import { dataOf } from '../state';
import type { NightPick, WwRole } from '../types';
import WwIcon from '../assets/WwIcon';
import Button from '../ui/Button';
import { DeadNote, Dock, HoldCard, MeMark, nameOf, PhaseHeader, PhaseLayout, PlayerTile, revealedRole, StatusLine, type PanelCtx } from './shared';
import { RoleNotes } from './RoleInfo';

// Đêm ① (rules §5.2, §11, plan §2.3 + "Bổ sung cho GĐ1" mục 7, "Bổ sung cho
// GĐ5b" mục 3). Khi không giữ thẻ, màn này GIỐNG HỆT NHAU với mọi vai và mọi
// đêm (kể cả đêm cắn 2): cùng câu, cùng lưới (mọi người còn sống), cùng nút,
// cùng trạng thái "Chưa xác nhận / Đã xác nhận", và chỉ MỘT ô sáng (ô vừa chạm).
// Lưới không làm mờ hay khoá ô theo vai; chạm ô không hợp lệ thì không đổi gì,
// lý do chỉ hiện trong thẻ giữ-để-xem.
//
// Vừa giữ thẻ vừa chạm lưới (giống Phù thủy độc):
//  - Sói (Ma Sói, Sói con) đã Xác nhận: đổi lựa chọn (mất Xác nhận);
//  - Sói ở đêm cắn 2 (rules §11.7): thêm / bỏ người trong tập 2 người bầy cắn
//    (ô sáng khi không giữ là người thứ nhất);
//  - Cupid ở đêm 1 (rules §11.5): thêm / bỏ người được ghép đôi (≤ 2, được chọn
//    mình). Chạm khi không giữ vẫn là "người mình nghi".
// Dấu "cắn" / "ghép đôi" trên ô chỉ hiện khi đang giữ.

const SUSPECT_TEXT = 'Chọn người bạn nghi. Chỉ để tổng kết cuối ván.';

const ACTION_TEXT: Record<WwRole, string> = {
  werewolf: 'Cùng bầy chọn một người để cắn.',
  wolfcub: 'Cùng bầy chọn một người để cắn.',
  seer: 'Chọn một người để soi.',
  guard: 'Chọn một người để che khỏi Sói (được tự che).',
  villager: SUSPECT_TEXT,
  witch: SUSPECT_TEXT,
  hunter: SUSPECT_TEXT,
  elder: SUSPECT_TEXT,
  lycan: SUSPECT_TEXT,
  minion: SUSPECT_TEXT,
  tanner: SUSPECT_TEXT,
  cupid: SUSPECT_TEXT,
};

function invalidText(role: WwRole, ctx: PanelCtx, targetId: string): string {
  if (isWolfRole(role)) return 'Không cắn Sói được.';
  if (role === 'guard') return `Đêm trước bạn che ${nameOf(ctx.players, targetId)}, đêm nay không che lại được.`;
  if (role === 'seer') return 'Không tự soi mình được.';
  return 'Chọn một người khác mình.';
}

/** Lựa chọn đang lưu, dạng nháp của màn (chỉ có `biteIds` / `loverIds` khi đã ghi). */
function draftOf(pick: NightPick | null): NightDraft {
  if (!pick) return { targetId: null };
  return {
    targetId: pick.targetId,
    ...(pick.biteIds != null ? { biteIds: pick.biteIds } : {}),
    ...(pick.loverIds != null ? { loverIds: pick.loverIds } : {}),
  };
}

/** Tập người Sói này đang chọn cắn ở đêm cắn 2 (người đầu = ô sáng). */
function biteSet(draft: NightDraft): string[] {
  return draft.biteIds ?? (draft.targetId ? [draft.targetId] : []);
}

function WolfPack({ ctx }: { ctx: PanelCtx }) {
  const nightPicks = Object.fromEntries(ctx.players.map((p) => [p.id, dataOf(p).nightPick ?? null]));
  const status = wolfStatus(ctx.table, nightPicks, ctx.state.round);
  const names = (ids: readonly string[]) => ids.map((id) => nameOf(ctx.players, id)).join(', ');
  const two = status.bites === 2;
  return (
    <div className="mt-1.5 space-y-1 text-xs text-(--ww-text-2)" data-ww-pack={status.agreed ? 'agreed' : 'split'} data-ww-bites={status.bites}>
      {two && (
        <p className="text-sm font-bold text-(--ww-wolf-light)" data-ww-bite-two="">
          Đêm nay bầy được cắn 2 người.
        </p>
      )}
      <ul className="space-y-0.5">
        {status.wolves.map((id) => (
          <li key={id}>
            {id === ctx.me.id ? 'Bạn' : nameOf(ctx.players, id)} → {status.sets[id].length > 0 ? names(status.sets[id]) : 'chưa chọn'}
          </li>
        ))}
      </ul>
      <p className={`font-semibold ${status.agreed ? 'text-(--ww-text)' : 'text-(--ww-accent)'}`}>
        {status.agreedIds && status.agreedIds.length > 0
          ? `Bầy đã thống nhất: ${status.agreedIds.map((id) => nameOf(ctx.players, id)).join(' và ')}.`
          : status.counts.length === 0
            ? 'Bầy chưa ai chọn.'
            : `Bầy chưa thống nhất: ${status.counts.map((c) => `${nameOf(ctx.players, c.targetId)} (${c.votes})`).join(' · ')}`}
      </p>
    </div>
  );
}

function PrivateBody({ ctx, draft, note, bitesTwo }: { ctx: PanelCtx; draft: NightDraft; note: string | null; bitesTwo: boolean }) {
  const role = ctx.myData.role as WwRole;
  const pick = pickFor(ctx.myData.nightPick, ctx.state.round);
  const look = (ctx.myData.seerLog ?? []).find((l) => l.round === ctx.state.round);
  const cupidNight = cupidPairsTonight(role, ctx.state.round);
  const lovers = draft.loverIds ?? [];
  return (
    <div className="text-left">
      <p className="font-bold">{cupidNight ? 'Ghép đôi 2 người (được chọn mình).' : ACTION_TEXT[role]}</p>
      {isWolfRole(role) && (
        <>
          <WolfPack ctx={ctx} />
          {bitesTwo ? (
            <p className="mt-1 text-xs text-(--ww-text-3)">Người thứ hai: vẫn giữ thẻ, chạm ở lưới (chạm lại để bỏ).</p>
          ) : (
            pick?.confirmed && <p className="mt-1 text-xs text-(--ww-text-3)">Muốn đổi: vẫn giữ thẻ, chạm người khác ở lưới.</p>
          )}
        </>
      )}
      {cupidNight && (
        <div className="mt-1 space-y-0.5 text-xs">
          <p className="text-sm font-semibold text-(--ww-text)" data-ww-cupid-draft={lovers.join(',')}>
            {lovers.length === 0 ? 'Chưa ghép ai.' : lovers.length === 1 ? `Đã chọn ${nameOf(ctx.players, lovers[0])}, chọn thêm 1 người.` : `Ghép đôi: ${nameOf(ctx.players, lovers[0])} và ${nameOf(ctx.players, lovers[1])}.`}
          </p>
          <p className="text-(--ww-text-2)">Vẫn giữ thẻ, chạm từng người ở lưới (chạm lại để bỏ). Chạm khi không giữ: người bạn nghi.</p>
        </div>
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
      <RoleNotes ctx={ctx} compact />
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
  onPick: (draft: NightDraft) => PickResult;
  onConfirm: (draft: NightDraft) => Promise<NightConfirmResult>;
}) {
  const { state, me, myData, table, players } = ctx;
  const { held, bind } = useHold(state.phaseStartedAt);
  // Lý do lần chạm vừa rồi không đổi được gì: chỉ hiện trong thẻ khi giữ.
  const [note, setNote] = useState<{ at: number; text: string } | null>(null);
  const heldAtDown = useRef(false);
  // Lựa chọn vừa đổi hiện ngay trên máy này, trước khi lần ghi về (trả lại nếu
  // gửi lỗi); đang gửi Xác nhận thì khoá lưới. Như nhau với mọi vai.
  const [pending, setPending] = useState<{ at: number; draft: NightDraft } | null>(null);
  const [confirmingAt, setConfirmingAt] = useState<number | null>(null);
  const alive = aliveIds(table);
  const pick = pickFor(myData.nightPick, state.round);
  const confirmed = !!pick?.confirmed;
  const confirming = confirmingAt === state.phaseStartedAt && !confirmed;
  const draft = (pending && pending.at === state.phaseStartedAt ? pending.draft : null) ?? draftOf(pick);
  const shownPick = draft.targetId;
  const open = ctx.remaining > 0;
  const role = myData.role as WwRole;
  const wolf = isWolfRole(role);
  // Đêm cắn 2 (Sói con chết vòng trước, rules §11.7): cùng hàm engine dùng khi chốt.
  const bitesTwo = wolf && wolfBitesFor(table, state.round) === 2;
  const cupidNight = cupidPairsTonight(role, state.round);
  const iAmAlive = alive.includes(me.id);
  const shownNote = note && note.at === state.phaseStartedAt ? note.text : null;
  const say = (text: string | null) => setNote(text ? { at: state.phaseStartedAt, text } : null);

  const send = (next: NightDraft, invalid: string) => {
    const { outcome, write } = onPick(next);
    if (outcome === 'invalid') return say(invalid);
    if (outcome === 'locked') return say('Bạn đã xác nhận, không đổi được nữa.');
    if (outcome === 'closed') return say('Hết giờ.');
    say(null);
    setConfirmingAt(null);
    const mine = { at: state.phaseStartedAt, draft: next };
    setPending(mine);
    write?.catch(() => setPending((p) => (p === mine ? null : p)));
  };

  const tap = (targetId: string) => {
    const wasHeld = heldAtDown.current || held;
    heldAtDown.current = false;
    if (!open) return say('Hết giờ.');
    if (confirming) return;
    // Cupid đêm 1, đang giữ thẻ: thêm / bỏ người được ghép đôi.
    if (cupidNight && wasHeld) {
      if (confirmed) return say('Bạn đã xác nhận, không đổi được nữa.');
      const lovers = draft.loverIds ?? [];
      if (!lovers.includes(targetId) && lovers.length >= 2) return say('Đã chọn đủ 2 người. Chạm lại một người để bỏ.');
      const next = lovers.includes(targetId) ? lovers.filter((id) => id !== targetId) : [...lovers, targetId];
      return send({ ...draft, loverIds: next }, 'Chỉ ghép đôi được người còn sống.');
    }
    // Sói ở đêm cắn 2, đang giữ thẻ: thêm / bỏ người trong tập (đổi được cả sau Xác nhận).
    if (bitesTwo && wasHeld) {
      const set = biteSet(draft);
      if (!set.includes(targetId) && set.length >= 2) return send({ ...draft, targetId: set[0], biteIds: [set[0], targetId] }, invalidText(role, ctx, targetId));
      const next = set.includes(targetId) ? set.filter((id) => id !== targetId) : [...set, targetId];
      return send({ ...draft, targetId: next[0] ?? null, biteIds: next }, invalidText(role, ctx, targetId));
    }
    if (confirmed && !(wolf && wasHeld)) {
      return say(wolf ? 'Muốn đổi: vừa giữ thẻ, vừa chạm người khác.' : 'Bạn đã xác nhận, không đổi được nữa.');
    }
    if (bitesTwo) {
      // Chạm khi không giữ: người thứ nhất (ô sáng); người thứ hai đã chọn khi giữ thì giữ nguyên.
      const second = biteSet(draft)[1];
      return send({ ...draft, targetId, biteIds: second && second !== targetId ? [targetId, second] : [targetId] }, invalidText(role, ctx, targetId));
    }
    send({ ...draft, targetId }, invalidText(role, ctx, targetId));
  };

  const confirm = () => {
    if (!shownPick) return;
    // Giữ "đang gửi" đến khi snapshot báo đã xác nhận; gửi lỗi / Cupid chưa ghép đủ thì trả lại.
    setConfirmingAt(state.phaseStartedAt);
    onConfirm(draft).then(
      ({ outcome, error }) => {
        if (outcome === 'ok') return;
        setConfirmingAt(null);
        if (outcome === 'invalid') say(error ? `${CUPID_PICK_ERROR_TEXT[error]} Giữ thẻ, chạm lưới để ghép đôi.` : 'Lựa chọn không còn hợp lệ, chọn lại.');
        else if (outcome === 'closed') say('Hết giờ.');
      },
      () => setConfirmingAt(null)
    );
  };

  // Dấu riêng trên ô (chỉ khi đang giữ): người trong tập cắn (đêm cắn 2), người được ghép đôi (Cupid đêm 1).
  const heldMark = (id: string) => {
    if (!held) return null;
    if (bitesTwo && biteSet(draft).includes(id)) {
      return (
        <span className="inline-flex h-5 items-center gap-1 rounded-full bg-(--ww-wolf-light) px-2 text-xs font-bold text-(--ww-ink)" data-ww-bite-mark="">
          <WwIcon name="werewolf" size={12} />
          cắn
        </span>
      );
    }
    if (cupidNight && (draft.loverIds ?? []).includes(id)) {
      return (
        <span className="inline-flex h-5 items-center gap-1 rounded-full bg-(--ww-lovers-light) px-2 text-xs font-bold text-(--ww-ink)" data-ww-lover-mark="">
          <WwIcon name="lovers" size={12} />
          đôi
        </span>
      );
    }
    return null;
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
                mark={heldMark(id) ?? (id === me.id ? <MeMark /> : undefined)}
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
              {() => <PrivateBody ctx={ctx} draft={draft} note={shownNote} bitesTwo={bitesTwo} />}
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
