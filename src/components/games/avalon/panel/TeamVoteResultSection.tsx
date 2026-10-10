import type { CSSProperties } from 'react';
import type { Player } from '@/types/player';
import type { AvalonGameState } from '../types';
import { VOTE_TRACK_LIMIT } from '../constants';
import { useCue } from '../hooks/useCue';
import { usePhaseTimeline } from '../hooks/usePhaseTimeline';
import { VOTE_RESULT, VOTE_RESULT_STAGES } from '../table/timelines';
import AvIcon from '../assets/AvIcon';
import GlassPanel from '../ui/GlassPanel';

const ROMAN = ['I', 'II', 'III', 'IV', 'V'];

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

// team-vote-result (8 s): 0–0.6 s the title, 0.6–2.6 s the two tallies roll
// up, 2.8 s the APPROVED / REJECTED stamp; a rejected team then snuffs a
// candle on the table at 3.5 s (RoundTable). Everything is cued on
// phaseStartedAt (useCue), so all screens show the same frame and a reload
// does not replay it; the votes stay secret — only the totals.
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
  const team = state.proposedTeam.map((id) => gamePlayers.find((p) => p.id === id)).filter(Boolean) as Player[];
  const leader = gamePlayers.find((p) => p.id === state.currentLeaderId);
  const lastChance = !approved && state.voteRejectStreak >= VOTE_TRACK_LIMIT - 1;

  const startedAt = state.phaseStartedAt ?? 0;
  const cue = useCue(startedAt);
  // Only used to tell tests / screen readers where the sequence is.
  const { stage } = usePhaseTimeline(startedAt, VOTE_RESULT_STAGES);
  const stamped = stage !== 'count';

  const tone = approved ? 'text-(--av-approve-light)' : 'text-(--av-reject-light)';

  return (
    <div className="space-y-3" data-anim-stage={stage}>
      <GlassPanel tone="accent" className="relative overflow-hidden p-6 text-center">
        {/* The result's colour washes in with the stamp, not before it. */}
        <div
          className={`av-appear pointer-events-none absolute inset-0 rounded-[inherit] border-2 bg-linear-to-b to-transparent to-70% ${
            approved ? 'border-(--av-approve)/60 from-(--av-approve)/20' : 'border-(--av-reject)/60 from-(--av-reject)/20'
          }`}
          style={{ animationDelay: cue(VOTE_RESULT.stampAt) }}
        />

        <div className="av-rise relative" style={{ animationDelay: cue(0) }}>
          <p className="text-[11px] uppercase font-bold text-slate-300 tracking-widest">
            Quest {ROMAN[state.currentQuest] ?? state.currentQuest + 1}
            {leader ? ` · Leader ${leader.name}` : ''}
          </p>
          <p className="av-display mt-1 text-3xl text-white">Kết quả phiếu đội</p>
        </div>

        <div className="relative mt-4 grid grid-cols-2 gap-3 max-w-xs mx-auto">
          <div className="rounded-xl bg-(--av-approve)/15 border border-(--av-approve)/30 px-3 py-2">
            <p className="text-[10px] uppercase font-bold text-(--av-approve-light)">
              <AvIcon name="vote-approve" /> Đồng ý
            </p>
            <p className="text-3xl font-black text-white">
              <RollingCount value={approves} delay={cue(VOTE_RESULT.countAt)} />
            </p>
          </div>
          <div className="rounded-xl bg-(--av-reject)/15 border border-(--av-reject)/30 px-3 py-2">
            <p className="text-[10px] uppercase font-bold text-(--av-reject-light)">
              <AvIcon name="vote-reject" /> Từ chối
            </p>
            <p className="text-3xl font-black text-white">
              <RollingCount value={rejects} delay={cue(VOTE_RESULT.countAt)} />
            </p>
            {nonVoters > 0 && (
              <p className="text-[10px] font-bold leading-tight text-slate-300/80">
                (gồm {nonVoters} người không bầu)
              </p>
            )}
          </div>
        </div>

        {/* The stamp. Its space is reserved from the start, so nothing jumps. */}
        <div className="relative mt-5 flex h-14 items-center justify-center" aria-live="polite">
          <div
            className={`av-stamp inline-flex items-center gap-2 rounded-lg border-[3px] border-double px-4 py-1.5 ${tone} ${
              approved ? 'border-(--av-approve)' : 'border-(--av-reject-light)'
            } bg-black/40`}
            style={{ animationDelay: cue(VOTE_RESULT.stampAt) }}
            data-stamp={approved ? 'approved' : 'rejected'}
          >
            <AvIcon name={approved ? 'vote-approve' : 'vote-reject'} size={26} />
            <span className="av-display text-2xl uppercase tracking-wider">{approved ? 'Được duyệt' : 'Bị bác'}</span>
          </div>
          {/* Screen readers hear the result once it is stamped. */}
          <span className="sr-only">{stamped ? (approved ? 'Đội được duyệt' : 'Đội bị từ chối') : ''}</span>
        </div>

        <p className="av-appear relative mt-3 text-xs text-slate-300" style={{ animationDelay: cue(approved ? VOTE_RESULT.stampAt + 400 : VOTE_RESULT.candleAt) }}>
          {approved
            ? 'Đội tiến hành thực hiện Quest...'
            : `Leader bị thay · Thanh từ chối ${state.voteRejectStreak}/${VOTE_TRACK_LIMIT}`}
        </p>
        {lastChance && (
          <p
            className="av-rise relative mt-2 rounded-lg border border-(--av-evil)/50 bg-(--av-evil)/15 px-3 py-1.5 text-xs font-black text-(--av-evil-light)"
            style={{ animationDelay: cue(VOTE_RESULT.candleAt) }}
          >
            <AvIcon name="warning" /> Chỉ còn 1 ngọn nến — thêm một lần bác nữa là Phe Quỷ thắng!
          </p>
        )}
      </GlassPanel>

      <GlassPanel className="p-4">
        <p className="text-[11px] uppercase font-bold text-slate-400 mb-2">Đội được đề xuất</p>
        <div className="flex flex-wrap gap-2">
          {team.map((p) => (
            <span
              key={p.id}
              className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-200"
            >
              {p.name}
            </span>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-slate-400 italic">
          Không lộ ai bầu thế nào — chỉ có tổng số phiếu.
        </p>
      </GlassPanel>
    </div>
  );
}
