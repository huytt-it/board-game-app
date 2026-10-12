'use client';

import type { DayVoteOutcome } from '@/components/games/werewolf/engine/day.ts';
import { PhaseHeader, RoleTag, nameOf, shownRole, type PanelCtx } from './shared';

const NO_HANG: Record<Exclude<DayVoteOutcome, 'executed'>, string> = {
  'no-votes': 'Không ai bị bầu.',
  tie: 'Hoà phiếu.',
  skips: 'Số phiếu Bỏ qua không ít hơn phiếu cao nhất.',
};

// Kết quả phiếu (rules §5.9): công khai ai bầu ai, ai bị treo (lật vai theo
// cài đặt). 8 giây.
export default function VoteResultPanel({ ctx }: { ctx: PanelCtx }) {
  const last = ctx.state.lastVote;
  const ballots = Object.entries(last?.ballots ?? {});
  const tally = new Map<string, number>();
  for (const [, to] of ballots) tally.set(to, (tally.get(to) ?? 0) + 1);
  const executed = last?.executedId ?? null;
  const role = executed ? shownRole(ctx, executed) : null;
  return (
    <section data-phase-section="vote-result">
      <PhaseHeader title={`Ngày ${ctx.state.round} — Kết quả`} remaining={ctx.remaining} />
      <div className="rounded-2xl bg-slate-800/70 px-4 py-5 text-center" data-ww-executed={executed ?? 'none'}>
        {executed ? (
          <>
            <p className="text-xl font-bold text-slate-50">{nameOf(ctx.players, executed)} bị treo</p>
            {role && (
              <p className="mt-2">
                <RoleTag role={role} />
              </p>
            )}
          </>
        ) : (
          <>
            <p className="text-xl font-bold text-slate-50">Không ai bị treo</p>
            {last && last.outcome !== 'executed' && <p className="mt-1 text-sm text-slate-300">{NO_HANG[last.outcome]}</p>}
          </>
        )}
      </div>
      <h3 className="mt-5 mb-2 text-sm font-semibold text-slate-300">Ai bầu ai</h3>
      <ul className="space-y-1 text-sm">
        {ballots.map(([from, to]) => (
          <li key={from} className="flex items-center justify-between gap-2 rounded-lg bg-slate-800/60 px-3 py-1.5">
            <span className="truncate text-slate-100">{nameOf(ctx.players, from)}</span>
            <span className="shrink-0 text-slate-400">→ {to === 'skip' ? 'Bỏ qua' : nameOf(ctx.players, to)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-center text-xs text-slate-400">
        {[...tally].map(([to, n]) => `${to === 'skip' ? 'Bỏ qua' : nameOf(ctx.players, to)}: ${n}`).join(' · ')}
      </p>
    </section>
  );
}
