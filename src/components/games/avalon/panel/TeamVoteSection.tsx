import type { Player } from '@/types/player';
import type { AvalonGameData, AvalonGameState, TeamVote } from '../types';
import { formatSecs, usePhaseClock } from '../hooks/usePhaseClock';
import { useArrivals } from '../hooks/useArrivals';
import { PlayerRoster } from './PlayerRoster';
import AvIcon from '../assets/AvIcon';
import ActionDock from '../ui/ActionDock';
import GlassPanel from '../ui/GlassPanel';
import { LOW_TIME_GLOW, LowTimeClock } from './shared';

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

  // Đếm ngược 30s — hết giờ player chưa bầu = REJECT mặc định.
  const { remaining } = usePhaseClock(state);
  const timeStr = formatSecs(remaining);
  // The last ten seconds: the clock (and the ballot box, if you have not
  // voted) throb — through their glow, the digits keep full contrast.
  const lowTime = remaining < 10_000;

  // Votes that came in while watching: their tick pops. My own ballot turns
  // face down — the same card whether I approved or rejected.
  const freshVotes = useArrivals(Object.keys(state.teamVotes ?? {}).sort());
  const ballotDropped = freshVotes.has(myPlayer.id);

  return (
    <div className="space-y-3">
      <GlassPanel tone="gold" className="p-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[11px] uppercase font-black text-(--av-parchment)"><AvIcon name="vote" /> Bỏ phiếu đội</p>
          <LowTimeClock low={lowTime} className={lowTime ? 'text-orange-300' : 'text-(--av-parchment)'}>
            {timeStr}
          </LowTimeClock>
        </div>
        <p className="text-sm text-slate-300 mb-3">
          Leader <span className="font-black text-white">{leader?.name ?? '?'}</span> đề xuất đội cho Quest{' '}
          {state.currentQuest + 1}:
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          {team.map((p) => (
            <span
              key={p.id}
              className="rounded-full bg-amber-500/20 px-3 py-1.5 text-sm font-bold text-amber-200"
            >
              {p.name}
            </span>
          ))}
        </div>
        <p className="text-[11px] text-slate-400">
          Đã bầu: {votedCount}/{gamePlayers.length}
          {!myVote && (
            <span className="ml-2 text-amber-300/90"><AvIcon name="warning" /> Chưa bầu trong {timeStr} sẽ bị tính là Từ chối</span>
          )}
        </p>
      </GlassPanel>

      <GlassPanel className="p-3">
        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2 px-1">
          Tiến độ bầu phiếu (không lộ ai bầu thế nào)
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {gamePlayers.map((p) => {
            const voted = !!state.teamVotes[p.id];
            return (
              <div
                key={p.id}
                className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 ${voted
                  ? 'border-emerald-500/40 bg-emerald-500/10'
                  : 'border-amber-500/30 bg-amber-500/5'
                  }`}
              >
                <span key={voted ? 'voted' : 'waiting'} className={`flex ${voted && freshVotes.has(p.id) ? 'av-pop' : ''}`}>
                  <AvIcon
                    name={voted ? 'check' : 'waiting'}
                    size={16}
                    className={voted ? 'text-emerald-300' : 'text-amber-300/80'}
                    title={voted ? 'Đã bầu' : 'Chưa bầu'}
                  />
                </span>
                <span className="text-xs font-bold text-white truncate flex-1">
                  {p.name}
                  {p.id === myPlayer.id && <span className="text-(--av-parchment)"> (bạn)</span>}
                </span>
              </div>
            );
          })}
        </div>
      </GlassPanel>

      <div className="lg:hidden">
        <PlayerRoster
          gamePlayers={gamePlayers}
          state={state}
          myPlayerId={myPlayer.id}
          highlightedIds={state.proposedTeam}
          showVoteStatus
          title="Tất cả người chơi (kèm ai đã bầu / chưa bầu)"
          emphasis="team"
          viewerRole={(myPlayer.gameData as Partial<AvalonGameData>).role}
        />
      </div>

      <ActionDock>
        {!myVote ? (
          <div
            className={`relative grid grid-cols-2 gap-3 rounded-2xl ${lowTime ? 'av-pulse-ring' : ''}`}
            style={lowTime ? LOW_TIME_GLOW : undefined}
          >
            <button
              onClick={() => onCastVote('approve')}
              className="flex flex-col items-center rounded-2xl bg-(--av-approve) py-4 font-black text-(--av-ink) text-base hover:brightness-110 active:scale-95 shadow-lg shadow-black/30 lg:py-5"
            >
              <AvIcon name="vote-approve" size={30} className="mb-1" />
              ĐỒNG Ý
            </button>
            <button
              onClick={() => onCastVote('reject')}
              className="flex flex-col items-center rounded-2xl bg-(--av-reject) py-4 font-black text-(--av-ink) text-base hover:brightness-110 active:scale-95 shadow-lg shadow-black/30 lg:py-5"
            >
              <AvIcon name="vote-reject" size={30} className="mb-1" />
              TỪ CHỐI
            </button>
          </div>
        ) : (
          // Votes are secret: once cast, the ballot lies face down and looks
          // the same whatever the vote; the viewer's own choice is only a small
          // line (ux-plan 2.9). It flips down when the vote is cast live, the
          // same movement for both votes.
          <div
            className={`flex items-center gap-3 rounded-2xl border border-(--av-gold)/45 bg-(--av-ink) bg-[radial-gradient(circle_at_20%_50%,rgba(212,166,74,0.16),transparent_60%)] px-4 py-3 shadow-lg shadow-black/40 ${
              ballotDropped ? 'av-ballot-in' : ''
            }`}
            data-ballot="down"
          >
            <span className="flex h-12 w-10 shrink-0 items-center justify-center rounded-md border-2 border-(--av-gold)/60 bg-black/40">
              <AvIcon name="vote" size={22} className="text-(--av-gold)" />
            </span>
            <div className="min-w-0 flex-1 text-left">
              <p className="av-display text-xl leading-tight text-white">Đã bỏ phiếu</p>
              <p className="text-xs font-bold text-slate-300">
                Phiếu của bạn:{' '}
                <span className={myVote === 'approve' ? 'text-(--av-approve-light)' : 'text-(--av-reject-light)'}>
                  <AvIcon name={myVote === 'approve' ? 'vote-approve' : 'vote-reject'} />{' '}
                  {myVote === 'approve' ? 'Đồng ý' : 'Từ chối'}
                </span>
              </p>
              <p className="text-[11px] text-slate-400">Đang chờ những người còn lại...</p>
            </div>
          </div>
        )}
      </ActionDock>
    </div>
  );
}
