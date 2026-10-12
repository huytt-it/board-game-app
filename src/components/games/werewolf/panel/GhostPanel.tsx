'use client';

import { pickFor, wolfStatus } from '@/components/games/werewolf/engine/night.ts';
import { nightActionOf, ROLE_NAME } from '@/components/games/werewolf/engine/roles.ts';
import { aliveIds } from '@/components/games/werewolf/engine/table.ts';
import { dataOf, nightPicksOf, potionsOf } from '../state';
import { LogList, nameOf, type PanelCtx } from './shared';

// Hồn ma (rules §6, luật "Hồn ma xem hết vai" bật): người chết thấy lựa chọn
// ban đêm của mọi người theo thời gian thực và "Diễn biến ván" đến lúc này.
// Chỉ render khi ghostSeesAll(ctx) — người còn sống không bao giờ thấy.

const VERB = { wolf: 'cắn', seer: 'soi', guard: 'che', suspect: 'nghi' } as const;

function NightLive({ ctx }: { ctx: PanelCtx }) {
  const { state, players, table } = ctx;
  const byId = new Map(players.map((p) => [p.id, p]));
  const pack = wolfStatus(table, nightPicksOf(state, players), state.round);
  return (
    <div data-ww-ghost-live="night">
      <p className="mb-1.5 text-sm font-semibold text-rose-200">
        {pack.agreedId
          ? `Bầy Sói đã thống nhất: ${nameOf(players, pack.agreedId)}`
          : pack.counts.length === 0
            ? 'Bầy Sói chưa ai chọn.'
            : `Bầy Sói chưa thống nhất: ${pack.counts.map((c) => `${nameOf(players, c.targetId)} (${c.votes})`).join(' · ')}`}
      </p>
      <ul className="space-y-0.5 text-sm text-slate-200">
        {aliveIds(table).map((id) => {
          const data = dataOf(byId.get(id));
          if (!data.role) return null;
          const pick = pickFor(data.nightPick, state.round);
          return (
            <li key={id}>
              {nameOf(players, id)} ({ROLE_NAME[data.role]}): {pick?.targetId ? `${VERB[nightActionOf(data.role)]} ${nameOf(players, pick.targetId)}` : 'chưa chọn'}
              {pick?.confirmed && <span className="text-emerald-300"> ✓</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function WitchLive({ ctx }: { ctx: PanelCtx }) {
  const { state, players, table } = ctx;
  const byId = new Map(players.map((p) => [p.id, p]));
  return (
    <div data-ww-ghost-live="night-witch">
      <p className="mb-1.5 text-sm font-semibold text-rose-200">
        {state.attack ? `Sói nhắm: ${nameOf(players, state.attack)}` : 'Đêm nay Sói không cắn ai.'}
      </p>
      <ul className="space-y-0.5 text-sm text-slate-200">
        {aliveIds(table).map((id) => {
          const data = dataOf(byId.get(id));
          if (!data.role) return null;
          const pick = pickFor(data.witchPick, state.round);
          let text: string;
          if (data.role === 'witch') {
            const potions = potionsOf(data);
            const acts = [
              pick?.heal && state.attack ? `cứu ${nameOf(players, state.attack)}` : null,
              pick?.poisonId ? `độc ${nameOf(players, pick.poisonId)}` : null,
            ].filter(Boolean);
            const left = [potions.heal ? 'cứu' : null, potions.poison ? 'độc' : null].filter(Boolean).join(', ') || 'hết';
            text = `${acts.length > 0 ? acts.join(' và ') : 'chưa dùng bình'} (bình còn: ${left})`;
          } else {
            text = pick?.guessId ? `đoán ${nameOf(players, pick.guessId)}` : 'chưa đoán';
          }
          return (
            <li key={id}>
              {nameOf(players, id)} ({ROLE_NAME[data.role]}): {text}
              {pick?.confirmed && <span className="text-emerald-300"> ✓</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function GhostPanel({ ctx }: { ctx: PanelCtx }) {
  const phase = ctx.state.phase;
  return (
    <aside className="mt-6 space-y-4 rounded-2xl bg-slate-900/70 p-4 ring-1 ring-slate-700" data-ww-ghost="">
      <p className="text-xs font-bold tracking-wide text-slate-400 uppercase">Hồn ma</p>
      {phase === 'night' && <NightLive ctx={ctx} />}
      {phase === 'night-witch' && <WitchLive ctx={ctx} />}
      <details open={phase !== 'night' && phase !== 'night-witch'}>
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-slate-200">Diễn biến ván đến giờ</summary>
        <LogList log={ctx.state.log ?? []} players={ctx.players} />
      </details>
    </aside>
  );
}
