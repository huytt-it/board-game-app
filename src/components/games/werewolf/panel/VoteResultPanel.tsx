'use client';

import type { DayVoteOutcome } from '@/components/games/werewolf/engine/day.ts';
import { isDead } from '../state';
import WwIcon from '../assets/WwIcon';
import Panel from '../ui/Panel';
import { PhaseHeader, PhaseLayout, RoleTag, Seat, nameOf, revealedRole, type PanelCtx } from './shared';

const NO_HANG: Record<Exclude<DayVoteOutcome, 'executed'>, string> = {
  'no-votes': 'Không ai bị bầu.',
  tie: 'Hoà phiếu.',
  skips: 'Số phiếu Bỏ qua không ít hơn phiếu cao nhất.',
};

// Kết quả phiếu (rules §5.9): công khai ai bầu ai, ai bị treo (lật vai theo
// cài đặt). 8 giây, không ai bấm gì. "Ai bầu ai" là sân khấu: mỗi người bầu
// một ghế, dòng phụ là người họ bầu.
export default function VoteResultPanel({ ctx }: { ctx: PanelCtx }) {
  const last = ctx.state.lastVote;
  const ballots = last?.ballots ?? {};
  const tally = new Map<string, number>();
  for (const to of Object.values(ballots)) tally.set(to, (tally.get(to) ?? 0) + 1);
  const executed = last?.executedId ?? null;
  const role = executed ? revealedRole(ctx, executed) : null;
  const voters = ctx.players.filter((p) => ballots[p.id] !== undefined);
  return (
    <PhaseLayout
      section="vote-result"
      header={<PhaseHeader title={`Ngày ${ctx.state.round} — Kết quả`} remaining={ctx.remaining} warn={false} />}
      stage={
        <div className="mt-4 lg:mt-0">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-(--ww-text-2)">
            <WwIcon name="vote" size={16} className="text-(--ww-text-3)" />
            Ai bầu ai
          </h3>
          <ul className="grid grid-cols-2 gap-2 lg:grid-cols-3 lg:gap-3" data-ww-ballots="">
            {voters.map((p) => {
              const to = ballots[p.id];
              return (
                <li key={p.id} data-player-id={p.id}>
                  <Seat
                    player={p}
                    dead={isDead(ctx.state, p.id)}
                    sub={
                      <span className="block truncate text-xs font-normal text-(--ww-text-2)">
                        → {to === 'skip' ? 'Bỏ qua' : nameOf(ctx.players, to)}
                      </span>
                    }
                  />
                </li>
              );
            })}
          </ul>
        </div>
      }
    >
      <Panel className="px-4 py-5 text-center lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none" data-ww-executed={executed ?? 'none'}>
        <WwIcon name="hanged" size={40} className={`mx-auto ${executed ? 'text-(--ww-moon)' : 'text-(--ww-text-3)'}`} />
        {executed ? (
          <>
            <p className="mt-2 text-xl font-bold text-(--ww-text)">{nameOf(ctx.players, executed)} bị treo</p>
            {role && (
              <p className="mt-2">
                <RoleTag role={role} />
              </p>
            )}
          </>
        ) : (
          <>
            <p className="mt-2 text-xl font-bold text-(--ww-text)">Không ai bị treo</p>
            {last && last.outcome !== 'executed' && <p className="mt-1 text-sm text-(--ww-text-2)">{NO_HANG[last.outcome]}</p>}
          </>
        )}
        <p className="mt-3 text-xs text-(--ww-text-3)">
          {[...tally].map(([to, n]) => `${to === 'skip' ? 'Bỏ qua' : nameOf(ctx.players, to)}: ${n}`).join(' · ')}
        </p>
      </Panel>
    </PhaseLayout>
  );
}
