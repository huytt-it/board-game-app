import type { Player } from '@/types/player';
import type { AvalonGameData, AvalonGameState, TeamVote } from '../types';
import { formatSecs, usePhaseClock } from '../hooks/usePhaseClock';
import { PlayerRoster } from './PlayerRoster';

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
  const lowTime = remaining < 10_000;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[11px] uppercase font-black text-cyan-300">🗳️ Bỏ phiếu đội</p>
          <span className={`text-xs font-black tabular-nums ${lowTime ? 'text-red-300 animate-pulse' : 'text-cyan-200'}`}>
            ⏱ {timeStr}
          </span>
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
        <p className="text-[11px] text-slate-500">
          Đã bầu: {votedCount}/{gamePlayers.length}
          {!myVote && (
            <span className="ml-2 text-amber-400/80">⚠ Chưa bầu trong {timeStr} sẽ bị tính là Từ chối</span>
          )}
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
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
                <span className="text-base shrink-0">{voted ? '✅' : '⏳'}</span>
                <span className="text-xs font-bold text-white truncate flex-1">
                  {p.name}
                  {p.id === myPlayer.id && <span className="text-blue-300"> (bạn)</span>}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {!myVote ? (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onCastVote('approve')}
            className="rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 py-5 font-black text-white text-base hover:from-blue-500 hover:to-cyan-500 active:scale-95 shadow-lg shadow-blue-500/30"
          >
            <div className="text-3xl mb-1">✓</div>
            ĐỒNG Ý
          </button>
          <button
            onClick={() => onCastVote('reject')}
            className="rounded-2xl bg-gradient-to-br from-red-600 to-rose-600 py-5 font-black text-white text-base hover:from-red-500 hover:to-rose-500 active:scale-95 shadow-lg shadow-red-500/30"
          >
            <div className="text-3xl mb-1">✕</div>
            TỪ CHỐI
          </button>
        </div>
      ) : (
        <div
          className={`rounded-2xl border p-4 text-center ${myVote === 'approve'
            ? 'border-blue-500/40 bg-blue-500/10'
            : 'border-red-500/40 bg-red-500/10'
            }`}
        >
          <p className="text-xs uppercase font-bold text-slate-400 mb-1">Phiếu của bạn</p>
          <p
            className={`text-2xl font-black ${myVote === 'approve' ? 'text-blue-300' : 'text-red-300'
              }`}
          >
            {myVote === 'approve' ? '✓ Đồng ý' : '✕ Từ chối'}
          </p>
          <p className="mt-2 text-xs text-slate-400">Đang chờ những người còn lại...</p>
        </div>
      )}

      <div className="lg:hidden">
        <PlayerRoster
          gamePlayers={gamePlayers}
          state={state}
          myPlayerId={myPlayer.id}
          highlightedIds={state.proposedTeam}
          showVoteStatus
          title="Tất cả người chơi (✓ = đã bầu, ⏳ = chưa bầu)"
          emphasis="team"
          viewerRole={(myPlayer.gameData as Partial<AvalonGameData>).role}
        />
      </div>
    </div>
  );
}
