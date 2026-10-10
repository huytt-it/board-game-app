import type { Player } from '@/types/player';
import type { AvalonGameState, TeamVote } from '../types';
import { questNeedsTwoFails } from '../constants';
import { formatSecs, usePhaseClock } from '../hooks/usePhaseClock';
import { useArrivals } from '../hooks/useArrivals';
import AvIcon from '../assets/AvIcon';
import ActionDock from '../ui/ActionDock';
import AvButton from '../ui/AvButton';
import GlassPanel from '../ui/GlassPanel';
import { LowTimeClock } from './shared';

// team-vote — the model screen of GĐ7 ("one sentence, one action"): a title
// with the clock, who is on the team, how many have voted, and the two
// ballots in the dock. Who has voted is the dot on each seat; the Leader is
// the crown; the two-fail rule is a line here only on the quest that has it.
export function TeamVoteSection({
  state,
  myPlayer,
  gamePlayers,
  onCastVote,
}: {
  state: AvalonGameState;
  myPlayer: Player;
  gamePlayers: Player[];
  onCastVote: (v: TeamVote) => void;
}) {
  const myVote = state.teamVotes[myPlayer.id];
  const team = state.proposedTeam.map((id) => gamePlayers.find((p) => p.id === id)).filter(Boolean) as Player[];
  const leader = gamePlayers.find((p) => p.id === state.currentLeaderId);
  const votedCount = Object.keys(state.teamVotes).length;
  const needsTwo = questNeedsTwoFails(gamePlayers.length, state.currentQuest);

  // Đếm ngược 30s — hết giờ player chưa bầu = REJECT mặc định. The last ten
  // seconds the clock turns red; it also throbs (through its glow: the digits
  // keep their contrast) once you have voted — before that the dock's "your
  // turn" edge is already blinking, and one thing blinks at a time.
  const { remaining } = usePhaseClock(state);
  const lowTime = remaining < 10_000;

  // My own ballot turns face down when I vote — the same card whether I
  // approved or rejected.
  const freshVotes = useArrivals(Object.keys(state.teamVotes ?? {}).sort());
  const ballotDropped = freshVotes.has(myPlayer.id);

  return (
    <div className="space-y-3">
      <GlassPanel tone={myVote ? 'neutral' : 'accent'} className="p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="av-display text-xl leading-tight text-(--av-text)">Bỏ phiếu đội</h3>
          <LowTimeClock low={lowTime && !!myVote} className={lowTime ? 'text-(--av-evil-light)' : 'text-(--av-text-2)'}>
            {formatSecs(remaining)}
          </LowTimeClock>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-(--av-text-2)" data-vote-team="">
          {leader?.id === myPlayer.id ? 'Đội bạn đề xuất' : `Đội của ${leader?.name ?? '?'}`}:{' '}
          <span className="font-semibold text-(--av-text)">{team.map((p) => p.name).join(', ')}</span>
        </p>
        <p className="mt-1 text-xs text-(--av-text-3)" data-vote-count={votedCount}>
          Đã bầu {votedCount}/{gamePlayers.length}
          {!myVote && ' · hết giờ = Từ chối'}
        </p>
        {needsTwo && (
          <p className="mt-2 flex items-start gap-1.5 text-xs text-(--av-evil-light)">
            <AvIcon name="warning" className="mt-px shrink-0" />
            Cần 2 lá Phe Quỷ mới thất bại.
          </p>
        )}
      </GlassPanel>

      <ActionDock>
        {!myVote ? (
          // Two identical neutral cards: neither invites the tap more.
          <div className="grid grid-cols-2 gap-3">
            <AvButton variant="choice" size="lg" icon="vote-approve" onClick={() => onCastVote('approve')}>
              Đồng ý
            </AvButton>
            <AvButton variant="choice" size="lg" icon="vote-reject" onClick={() => onCastVote('reject')}>
              Từ chối
            </AvButton>
          </div>
        ) : (
          // Votes are secret: once cast, the ballot lies face down and looks
          // the same whatever the vote; the viewer's own choice is only a small
          // word (ux-plan 2.9). It flips down when the vote is cast live, the
          // same movement for both votes.
          <div
            className={`flex min-h-14 items-center gap-3 rounded-xl bg-(--av-raised) px-4 py-2 shadow-lg shadow-black/40 ${
              ballotDropped ? 'av-ballot-in' : ''
            }`}
            data-ballot="down"
          >
            <span className="flex h-10 w-8 shrink-0 items-center justify-center rounded-md border border-(--av-gold)/60">
              <AvIcon name="vote" size={18} className="text-(--av-gold)" />
            </span>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-sm font-semibold text-(--av-text)">
                Đã bỏ phiếu ·{' '}
                <span className="font-normal text-(--av-text-2)">
                  <AvIcon name={myVote === 'approve' ? 'vote-approve' : 'vote-reject'} />{' '}
                  {myVote === 'approve' ? 'Đồng ý' : 'Từ chối'}
                </span>
              </p>
              <p className="text-xs text-(--av-text-3)">Chờ những người còn lại</p>
            </div>
          </div>
        )}
      </ActionDock>
    </div>
  );
}
