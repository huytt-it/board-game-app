import type { Player } from '@/types/player';
import type { AvalonGameState } from '../types';

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

  return (
    <div className="space-y-3 animate-scale-in">
      <div
        className={`rounded-2xl border-2 p-6 text-center ${approved
          ? 'border-blue-500/50 bg-blue-500/15 shadow-lg shadow-blue-500/20'
          : 'border-red-500/50 bg-red-500/15 shadow-lg shadow-red-500/20'
          }`}
      >
        <p className="text-[11px] uppercase font-bold text-slate-300 mb-1 tracking-widest">
          Kết quả phiếu đội
        </p>
        <div className="text-6xl mb-2">{approved ? '✅' : '❌'}</div>
        <p
          className={`text-3xl font-black ${approved ? 'text-blue-200' : 'text-red-200'
            }`}
        >
          {approved ? 'ĐỘI ĐƯỢC DUYỆT' : 'ĐỘI BỊ TỪ CHỐI'}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 max-w-xs mx-auto">
          <div className="rounded-xl bg-blue-500/15 border border-blue-500/30 px-3 py-2">
            <p className="text-[10px] uppercase font-bold text-blue-300">Đồng ý</p>
            <p className="text-2xl font-black text-blue-200">{approves}</p>
          </div>
          <div className="rounded-xl bg-red-500/15 border border-red-500/30 px-3 py-2">
            <p className="text-[10px] uppercase font-bold text-red-300">Từ chối</p>
            <p className="text-2xl font-black text-red-200">{rejects}</p>
            {nonVoters > 0 && (
              <p className="text-[10px] font-bold leading-tight text-red-300/80">
                (gồm {nonVoters} người không bầu)
              </p>
            )}
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-300">
          {approved
            ? 'Đội tiến hành thực hiện Quest...'
            : `Leader bị thay · Thanh từ chối ${state.voteRejectStreak}/5`}
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
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
        <p className="mt-3 text-[11px] text-slate-500 italic">
          🤐 Không lộ ai bầu thế nào — chỉ có tổng số phiếu.
        </p>
      </div>
    </div>
  );
}
