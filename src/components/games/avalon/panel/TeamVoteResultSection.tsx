import type { CSSProperties } from 'react';
import type { Player } from '@/types/player';
import type { AvalonGameState } from '../types';
import { VOTE_TRACK_LIMIT } from '../constants';
import { useCue } from '../hooks/useCue';
import { usePhaseTimeline } from '../hooks/usePhaseTimeline';
import { VOTE_RESULT, VOTE_RESULT_STAGES } from '../table/timelines';
import AvIcon from '../assets/AvIcon';
import GlassPanel from '../ui/GlassPanel';

// A tally that rolls up from 0 like a mechanical counter: a column 0…N slides
// up (transform only). Its static transform is the final number, so a reload
// after the count — or reduced motion — just shows N.
function RollingCount({ value, delay }: { value: number; delay: string }) {
  const rows = Array.from({ length: value + 1 }, (_, i) => i);
  const style: CSSProperties = { transform: `translateY(${-value * 1.15}em)`, animationDelay: delay };
  return (
    <span className="relative inline-block h-[1.15em] overflow-hidden align-top tabular-nums" aria-label={String(value)}>
      <span className={`block ${value > 0 ? 'av-roll' : ''}`} style={style} aria-hidden>
        {rows.map((i) => (
          <span key={i} className="block h-[1.15em] leading-[1.15em]">
            {i}
          </span>
        ))}
      </span>
    </span>
  );
}

// One tally: the ballot's icon and the rolling number; the word is small.
function Tally({ icon, label, value, delay, note }: { icon: 'vote-approve' | 'vote-reject'; label: string; value: number; delay: string; note?: string }) {
  return (
    <div className="flex flex-col items-center" title={label}>
      <span className="flex items-center gap-2 text-3xl font-bold text-(--av-text)">
        <AvIcon name={icon} size={26} className="text-(--av-text-2)" />
        <RollingCount value={value} delay={delay} />
      </span>
      <span className="mt-0.5 text-xs text-(--av-text-3)">
        {label}
        {note && ` · ${note}`}
      </span>
    </div>
  );
}

// team-vote-result (8 s): 0–0.6 s the title, 0.6–2.6 s the two tallies roll
// up, 2.8 s the APPROVED / REJECTED stamp; a rejected team then snuffs a
// candle on the table at 3.5 s (RoundTable). Everything is cued on
// phaseStartedAt (useCue), so all screens show the same frame and a reload
// does not replay it; the votes stay secret — only the totals, as an icon and
// a number (no colour: neither vote is "good"). Approved is stamped in gold
// (the team goes on), rejected in the danger red (a candle goes out).
export function TeamVoteResultSection({
  state,
  gamePlayers,
}: {
  state: AvalonGameState;
  gamePlayers: Player[];
}) {
  // Đếm đúng như useAvalon.resolveTeamVote: chỉ tính phiếu của người còn trong
  // phòng, và ai không bầu thì tính là Từ chối (rejects = tổng − approves).
  const activeIds = new Set(gamePlayers.map((p) => p.id));
  const approves = Object.entries(state.teamVotes ?? {}).filter(
    ([id, v]) => activeIds.has(id) && v === 'approve'
  ).length;
  const rejects = Math.max(0, gamePlayers.length - approves);
  const nonVoters = gamePlayers.filter((p) => !state.teamVotes?.[p.id]).length;
  const approved = state.lastTeamVoteResult === 'approved';
  const lastChance = !approved && state.voteRejectStreak >= VOTE_TRACK_LIMIT - 1;

  const startedAt = state.phaseStartedAt ?? 0;
  const cue = useCue(startedAt);
  // Only used to tell tests / screen readers where the sequence is.
  const { stage } = usePhaseTimeline(startedAt, VOTE_RESULT_STAGES);
  const stamped = stage !== 'count';

  const tone = approved ? 'border-(--av-gold) text-(--av-gold)' : 'border-(--av-evil-light) text-(--av-evil-light)';

  return (
    <div data-anim-stage={stage}>
      <GlassPanel className="relative overflow-hidden p-5 text-center">
        {/* The result's colour washes in with the stamp, not before it. */}
        <div
          className={`av-appear pointer-events-none absolute inset-0 rounded-2xl bg-linear-to-b to-transparent to-70% ${
            approved ? 'from-(--av-gold)/12' : 'from-(--av-evil)/14'
          }`}
          style={{ animationDelay: cue(VOTE_RESULT.stampAt) }}
        />

        <h3 className="av-display av-rise relative text-xl leading-tight text-(--av-text)" style={{ animationDelay: cue(0) }}>
          Kết quả bỏ phiếu
        </h3>

        <div className="relative mt-4 flex justify-center gap-10">
          <Tally icon="vote-approve" label="Đồng ý" value={approves} delay={cue(VOTE_RESULT.countAt)} />
          <Tally
            icon="vote-reject"
            label="Từ chối"
            value={rejects}
            delay={cue(VOTE_RESULT.countAt)}
            note={nonVoters > 0 ? `${nonVoters} không bầu` : undefined}
          />
        </div>

        {/* The stamp. Its space is reserved from the start, so nothing jumps. */}
        <div className="relative mt-4 flex h-14 items-center justify-center" aria-live="polite">
          <div
            className={`av-stamp inline-flex items-center gap-2 rounded-xl border-[3px] border-double bg-black/40 px-4 py-1.5 ${tone}`}
            style={{ animationDelay: cue(VOTE_RESULT.stampAt) }}
            data-stamp={approved ? 'approved' : 'rejected'}
          >
            <AvIcon name={approved ? 'vote-approve' : 'vote-reject'} size={26} />
            <span className="av-display text-2xl uppercase tracking-wider">{approved ? 'Được duyệt' : 'Bị bác'}</span>
          </div>
          {/* Screen readers hear the result once it is stamped. */}
          <span className="sr-only">{stamped ? (approved ? 'Đội được duyệt' : 'Đội bị từ chối') : ''}</span>
        </div>

        <p
          className={`av-appear relative mt-3 text-sm ${lastChance ? 'font-semibold text-(--av-evil-light)' : 'text-(--av-text-2)'}`}
          style={{ animationDelay: cue(approved ? VOTE_RESULT.stampAt + 400 : VOTE_RESULT.candleAt) }}
        >
          {approved
            ? 'Đội lên đường làm Quest.'
            : lastChance
              ? 'Còn 1 nến — bác nữa là Phe Quỷ thắng!'
              : 'Leader kế tiếp sẽ chọn đội mới.'}
        </p>
      </GlassPanel>
    </div>
  );
}
