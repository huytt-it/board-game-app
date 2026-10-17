'use client';

import type { Player } from '@/types/player';
import type { DayVoteOutcome } from '@/components/games/werewolf/engine/day.ts';
import { useCue } from '@/components/games/shared/hooks/useCue';
import { usePhaseTimeline } from '@/components/games/shared/hooks/usePhaseTimeline';
import WwIcon from '../assets/WwIcon';
import Panel from '../ui/Panel';
import { VOTE_RESULT, VOTE_RESULT_STAGES } from '../scenes/timelines';
import { Avatar, avatarColor, PhaseHeader, PhaseLayout, RoleTag, nameOf, revealedRole, type PanelCtx } from './shared';

const NO_HANG: Record<Exclude<DayVoteOutcome, 'executed'>, string> = {
  'no-votes': 'Không ai bị bầu.',
  tie: 'Hoà phiếu.',
  skips: 'Số phiếu Bỏ qua không ít hơn phiếu cao nhất.',
};

// Kết quả phiếu (rules §5.9): công khai ai bầu ai, ai bị treo (lật vai theo
// cài đặt). 8 giây, không ai bấm gì.
//
// Hoạt cảnh (GĐ4, scenes/timelines.ts VOTE_RESULT): phiếu GOM THÀNH CỘT ĐẾM —
// mỗi người được bầu (theo ghế, "Bỏ qua" cuối) là một hàng, tên người bầu rơi
// vào hàng theo thứ tự ghế của người bầu, số phiếu hiện khi lá cuối của hàng
// chạm. Rồi phán quyết: hàng của người bị treo sáng lên, giàn treo dập xuống,
// tên, lật vai (theo luật) — hoặc "Không ai bị treo" kèm lý do. Đọc được ở
// 375 px (tên đầy đủ, không có mũi tên bay chéo màn hình).
export default function VoteResultPanel({ ctx }: { ctx: PanelCtx }) {
  const last = ctx.state.lastVote;
  const ballots = last?.ballots ?? {};
  const executed = last?.executedId ?? null;
  const role = executed ? revealedRole(ctx, executed) : null;
  const cue = useCue(ctx.state.phaseStartedAt);
  const { stage } = usePhaseTimeline(ctx.state.phaseStartedAt, VOTE_RESULT_STAGES);
  const at = (ms: number) => ({ animationDelay: cue(ms) });

  // Người bầu theo ghế = thứ tự lá phiếu rơi.
  const voters = ctx.players.filter((p) => ballots[p.id] !== undefined);
  const order = new Map(voters.map((p, k) => [p.id, k]));
  const rows: Array<{ key: string; player: Player | null; from: Player[] }> = [
    ...ctx.players.map((p) => ({
      key: p.id,
      player: p,
      from: voters.filter((v) => ballots[v.id] === p.id),
    })),
    {
      key: 'skip',
      player: null,
      from: voters.filter((v) => ballots[v.id] === 'skip'),
    },
  ].filter((r) => r.from.length > 0);

  return (
    <PhaseLayout
      section="vote-result"
      data-ww-anim-stage={stage}
      header={<PhaseHeader title={`Ngày ${ctx.state.round} — Kết quả`} remaining={ctx.remaining} warn={false} />}
      stage={
        <div className="mt-4 lg:mt-0">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-(--ww-text-2)">
            <WwIcon name="vote" size={16} className="text-(--ww-text-3)" />
            Ai bầu ai
          </h3>
          <ul className="grid gap-2 lg:grid-cols-2 lg:gap-3" data-ww-ballots="">
            {rows.map((row) => {
              const landed = VOTE_RESULT.ballotAt(Math.max(...row.from.map((v) => order.get(v.id) ?? 0))) + VOTE_RESULT.ballotMs;
              return (
                <li
                  key={row.key}
                  className="ww-a-pop relative rounded-xl bg-(--ww-raised) px-3 py-2.5 shadow-md shadow-black/25"
                  style={at(VOTE_RESULT.rowsAt)}
                  data-ww-tally={row.key}
                >
                  {row.key === executed && (
                    // Hàng của người bị treo sáng lên lúc phán quyết.
                    <span
                      aria-hidden="true"
                      className="ww-a-fade pointer-events-none absolute inset-0 rounded-xl ring-2 ring-(--ww-accent)"
                      style={at(VOTE_RESULT.verdictAt)}
                    />
                  )}
                  <div className="flex items-center gap-2.5">
                    {row.player ? (
                      <Avatar name={row.player.name} id={row.player.id} />
                    ) : (
                      <span
                        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-(--ww-ink) text-(--ww-text-3)"
                        aria-hidden="true"
                      >
                        <WwIcon name="close" size={16} />
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-(--ww-text)">{row.player ? row.player.name : 'Bỏ qua'}</span>
                    <span
                      className="ww-a-pop text-base font-bold text-(--ww-text) tabular-nums"
                      style={at(landed)}
                      data-ww-tally-count={row.from.length}
                    >
                      {row.from.length}
                    </span>
                  </div>
                  <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={`Người bầu ${row.player ? row.player.name : 'Bỏ qua'}`}>
                    {row.from.map((v) => (
                      <li
                        key={v.id}
                        className="ww-a-drop inline-flex h-6 max-w-full items-center gap-1.5 rounded-full bg-(--ww-ink) px-2 text-xs text-(--ww-text-2)"
                        style={at(VOTE_RESULT.ballotAt(order.get(v.id) ?? 0))}
                        data-ww-ballot={v.id}
                      >
                        <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ backgroundColor: avatarColor(v.id) }} />
                        <span className="truncate">{v.name}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        </div>
      }
    >
      <Panel
        className="relative mt-4 px-4 py-5 text-center lg:mt-0 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none"
        data-ww-executed={executed ?? 'none'}
      >
        {/* Trong lúc phiếu rơi: "Đang kiểm phiếu…", tan đi đúng lúc phán quyết hiện ra. */}
        <p
          aria-hidden="true"
          className="ww-a-gone absolute inset-0 flex items-center justify-center gap-1.5 text-sm text-(--ww-text-2)"
          style={at(VOTE_RESULT.verdictAt)}
        >
          <WwIcon name="waiting" size={16} className="text-(--ww-text-3)" />
          Đang kiểm phiếu…
        </p>
        <div className="ww-a-pop" style={at(VOTE_RESULT.verdictAt)}>
          {executed ? (
            <>
              <WwIcon name="hanged" size={40} className="ww-a-thud text-(--ww-moon)" style={at(VOTE_RESULT.gibbetAt)} />
              <p className="mt-2 text-xl font-bold text-(--ww-text)">{nameOf(ctx.players, executed)} bị treo</p>
              {role && (
                <p className="mt-2">
                  <span className="ww-a-flip inline-flex" style={at(VOTE_RESULT.flipAt)}>
                    <RoleTag role={role} />
                  </span>
                </p>
              )}
            </>
          ) : (
            <>
              <WwIcon name="hanged" size={40} className="text-(--ww-text-3)" />
              <p className="mt-2 text-xl font-bold text-(--ww-text)">Không ai bị treo</p>
              {last && last.outcome !== 'executed' && <p className="mt-1 text-sm text-(--ww-text-2)">{NO_HANG[last.outcome]}</p>}
            </>
          )}
        </div>
      </Panel>
    </PhaseLayout>
  );
}
