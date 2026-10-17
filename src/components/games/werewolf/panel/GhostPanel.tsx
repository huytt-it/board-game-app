'use client';

import { useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { useHold } from '@/components/games/shared/hooks/useHold';
import { pickFor, wolfStatus } from '@/components/games/werewolf/engine/night.ts';
import { nightActionOf, ROLE_NAME } from '@/components/games/werewolf/engine/roles.ts';
import { dataOf, isDead, nightPicksOf, potionsOf } from '../state';
import type { WerewolfGameData, WwRole } from '../types';
import WwIcon from '../assets/WwIcon';
import { MyRoleBody } from './DealPanel';
import { HoldCard, LogList, ghostView, nameOf, type PanelCtx } from './shared';

// Thẻ giữ-để-xem của người chết (rules §6, plan §7b). Người chết ở mọi bước
// (trừ màn kết thúc) có đúng MỘT thẻ này. Khi không giữ, màn của họ giống hệt
// nhau dù vai gì, dù luật "Hồn ma xem hết vai" bật hay tắt: cùng câu, cùng thẻ
// "Nhấn giữ để xem". Mọi thứ riêng chỉ render khi đang giữ:
//  - luật bật: vai của mọi người, lựa chọn đêm theo thời gian thực, nhật ký
//    gần nhất (vòng này và vòng trước, tối đa 8 mục);
//  - luật tắt, hoặc Thợ săn chưa bắn: chỉ vai của mình.
// Người còn sống không bao giờ có thẻ này.

const VERB = { wolf: 'cắn', seer: 'soi', guard: 'che', suspect: 'nghi' } as const;
// Nhật ký chỉ hiện chừng này mục mới nhất (trong vòng này và vòng trước) để tờ vừa một màn hình điện thoại.
const MAX_LOG_ENTRIES = 8;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-3">
      <h3 className="mb-1 text-xs font-bold text-(--ww-text-2)">{title}</h3>
      {children}
    </section>
  );
}

const roleColor = (role: WwRole) => (role === 'werewolf' ? 'text-(--ww-wolf-light)' : 'text-(--ww-village-light)');

/** Vai của mọi người theo ghế, hai cột (các bước không có lựa chọn đêm). */
function Roles({ ctx }: { ctx: PanelCtx }) {
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-sm leading-snug" data-ww-ghost-roles="">
      {ctx.players.map((p) => {
        const role = dataOf(p).role;
        if (!role) return null;
        const dead = isDead(ctx.state, p.id);
        return (
          <li key={p.id} className="flex min-w-0 items-baseline justify-between gap-1.5">
            <span className={`truncate ${dead ? 'text-(--ww-text-3) line-through' : 'text-(--ww-text)'}`}>{p.name}</span>
            <span className={`shrink-0 font-semibold ${roleColor(role)}`} data-ww-ghost-role={role}>
              {ROLE_NAME[role]}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Ban đêm: gộp "vai" và "lựa chọn đang có" thành một danh sách theo ghế. Người đã chết chỉ có tên (gạch, chữ mức 3) và vai. */
function PickRows({ ctx, pick }: { ctx: PanelCtx; pick: (role: WwRole, data: Partial<WerewolfGameData>) => { text: string; confirmed: boolean } }) {
  return (
    <ul className="space-y-0.5 text-sm leading-snug text-(--ww-text-2)" data-ww-ghost-roles="">
      {ctx.players.map((p) => {
        const data = dataOf(p);
        const role = data.role;
        if (!role) return null;
        const dead = isDead(ctx.state, p.id);
        const choice = dead ? null : pick(role, data);
        return (
          <li key={p.id}>
            <span className={dead ? 'text-(--ww-text-3) line-through' : 'text-(--ww-text)'}>{p.name}</span>{' '}
            <span className={`font-semibold ${roleColor(role)}`} data-ww-ghost-role={role}>
              ({ROLE_NAME[role]})
            </span>
            {choice && (
              <>
                : {choice.text}
                {choice.confirmed && <span className="text-(--ww-text)"> ✓</span>}
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function NightLive({ ctx }: { ctx: PanelCtx }) {
  const { state, players, table } = ctx;
  const pack = wolfStatus(table, nightPicksOf(state, players), state.round);
  return (
    <Section title={`Đêm ${state.round}: vai và lựa chọn đang có`}>
      <div data-ww-ghost-live="night">
        <p className="mb-1 text-sm leading-snug font-semibold text-(--ww-wolf-light)">
          {pack.agreedId
            ? `Bầy Sói đã thống nhất: ${nameOf(players, pack.agreedId)}`
            : pack.counts.length === 0
              ? 'Bầy Sói chưa ai chọn.'
              : `Bầy Sói chưa thống nhất: ${pack.counts.map((c) => `${nameOf(players, c.targetId)} (${c.votes})`).join(' · ')}`}
        </p>
        <PickRows
          ctx={ctx}
          pick={(role, data) => {
            const p = pickFor(data.nightPick, state.round);
            return { text: p?.targetId ? `${VERB[nightActionOf(role)]} ${nameOf(players, p.targetId)}` : 'chưa chọn', confirmed: !!p?.confirmed };
          }}
        />
      </div>
    </Section>
  );
}

function WitchLive({ ctx }: { ctx: PanelCtx }) {
  const { state, players } = ctx;
  return (
    <Section title={`Đêm ${state.round} (Phù thủy): vai và lựa chọn đang có`}>
      <div data-ww-ghost-live="night-witch">
        <p className="mb-1 text-sm leading-snug font-semibold text-(--ww-wolf-light)">
          {state.attack ? `Sói nhắm: ${nameOf(players, state.attack)}` : 'Đêm nay Sói không cắn ai.'}
        </p>
        <PickRows
          ctx={ctx}
          pick={(role, data) => {
            const p = pickFor(data.witchPick, state.round);
            if (role !== 'witch') return { text: p?.guessId ? `đoán ${nameOf(players, p.guessId)}` : 'chưa đoán', confirmed: !!p?.confirmed };
            const potions = potionsOf(data);
            const acts = [p?.heal && state.attack ? `cứu ${nameOf(players, state.attack)}` : null, p?.poisonId ? `độc ${nameOf(players, p.poisonId)}` : null].filter(Boolean);
            const left = [potions.heal ? 'cứu' : null, potions.poison ? 'độc' : null].filter(Boolean).join(', ') || 'hết';
            return { text: `${acts.length > 0 ? acts.join(' và ') : 'chưa dùng bình'} (bình còn: ${left})`, confirmed: !!p?.confirmed };
          }}
        />
      </div>
    </Section>
  );
}

/** Hồn ma xem hết vai: vai của mọi người, lựa chọn của bước hiện tại, nhật ký gần nhất (vòng này và vòng trước). */
function AllBody({ ctx }: { ctx: PanelCtx }) {
  const { state, players } = ctx;
  const log = state.log ?? [];
  // Nhật ký dài thì chỉ vòng hiện tại và vòng trước, tối đa MAX_LOG_ENTRIES mục mới nhất; đầy đủ ở màn kết thúc.
  const shown = log.filter((e) => e.round >= state.round - 1).slice(-MAX_LOG_ENTRIES);
  const night = state.phase === 'night' || state.phase === 'night-witch';
  return (
    <>
      <p className="flex items-center gap-1.5 text-xs font-bold text-(--ww-text-3)">
        <WwIcon name="ghost" size={16} />
        Hồn ma · chỉ mình bạn thấy
      </p>
      {state.phase === 'night' && <NightLive ctx={ctx} />}
      {state.phase === 'night-witch' && <WitchLive ctx={ctx} />}
      {!night && (
        <Section title="Vai trong làng">
          <Roles ctx={ctx} />
        </Section>
      )}
      <Section title="Diễn biến ván đến giờ">
        <LogList log={shown} players={players} compact />
        {shown.length < log.length && <p className="mt-1.5 text-xs text-(--ww-text-3)">Các dòng cũ hơn: xem đầy đủ ở màn kết thúc.</p>}
      </Section>
    </>
  );
}

/** Luật tắt, hoặc Thợ săn chưa bắn: chỉ vai của mình. */
function OwnBody({ ctx, view }: { ctx: PanelCtx; view: 'wait' | 'own' }) {
  return (
    <>
      <MyRoleBody ctx={ctx} />
      <p className="mt-2 text-xs text-(--ww-text-3)">
        {view === 'wait'
          ? 'Bắn xong (hoặc bỏ lượt), bạn mới xem được vai của mọi người.'
          : 'Phòng này tắt “Hồn ma xem hết vai”: người chết chỉ thấy vai của mình.'}
      </p>
    </>
  );
}

export default function GhostPanel({ ctx }: { ctx: PanelCtx }) {
  const { held, bind } = useHold(ctx.state.phaseStartedAt);
  const sheet = useRef<HTMLDivElement>(null);
  // Tờ dài hơn màn hình (nhật ký 2 vòng, 10 người) thì kéo lên / xuống NGAY BẰNG
  // ngón đang giữ để cuộn. Ngón thứ hai không cuộn được: trình duyệt coi hai
  // ngón là pinch. Con trỏ đã bắt vào thẻ nên pointermove vẫn về thẻ dù ngón
  // trượt ra ngoài.
  const drag = useRef<{ id: number; y: number } | null>(null);
  const ending = (handler: ((e: ReactPointerEvent<HTMLElement>) => void) | undefined) => (e: ReactPointerEvent<HTMLElement>) => {
    drag.current = null;
    handler?.(e);
  };
  const dragBind = {
    ...bind,
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
      drag.current = { id: e.pointerId, y: e.clientY };
      bind.onPointerDown?.(e);
    },
    onPointerMove: (e: ReactPointerEvent<HTMLElement>) => {
      const d = drag.current;
      if (!d || d.id !== e.pointerId) return;
      sheet.current?.scrollBy({ top: d.y - e.clientY });
      d.y = e.clientY;
    },
    onPointerUp: ending(bind.onPointerUp),
    onPointerCancel: ending(bind.onPointerCancel),
    onLostPointerCapture: ending(bind.onLostPointerCapture),
  };
  return (
    <div className="mt-4" data-ww-ghost-card="">
      <HoldCard held={held} bind={dragBind} className="h-36" hint="Chỉ mình bạn xem được.">
        {() => {
          const view = ghostView(ctx);
          return (
            <>
              <p className="text-xs text-(--ww-text-3)">Đang giữ — thả tay là che lại. Kéo lên / xuống để cuộn.</p>
              {/*
                Tờ giấy phủ lên cả màn hình (fixed) để đủ chỗ cho danh sách vai,
                lựa chọn và nhật ký trên 375px. Ngón đang giữ vẫn nằm trên thẻ
                (đã bắt con trỏ). Ngón thứ hai chạm tờ này thì không được làm thẻ
                đóng lại (useHold nghe pointerup / cancel / lostpointercapture,
                cả ba đều nổi bọt từ tờ lên thẻ).
              */}
              <div
                ref={sheet}
                data-ww-ghost={view}
                className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 mx-auto max-h-[min(88dvh,40rem)] max-w-lg touch-none overflow-y-auto overscroll-contain rounded-2xl border border-(--ww-line) bg-(--ww-ink) p-3 text-left text-(--ww-text) shadow-2xl shadow-black/60"
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                onPointerCancel={(e) => e.stopPropagation()}
                onLostPointerCapture={(e) => e.stopPropagation()}
              >
                {view === 'all' ? <AllBody ctx={ctx} /> : <OwnBody ctx={ctx} view={view} />}
              </div>
            </>
          );
        }}
      </HoldCard>
    </div>
  );
}
