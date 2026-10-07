import type { Player } from '@/types/player';
import type { AvalonGameState } from '../types';
import AvIcon from '../assets/AvIcon';
import GlassPanel from '../ui/GlassPanel';

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
      <GlassPanel tone={approved ? 'approve' : 'reject'} emphasis className="p-6 text-center">
        <p className="text-[11px] uppercase font-bold text-slate-300 mb-1 tracking-widest">
          Kết quả phiếu đội
        </p>
        <AvIcon
          name={approved ? 'vote-approve' : 'vote-reject'}
          size={60}
          className={`mb-2 ${approved ? 'text-(--av-approve)' : 'text-(--av-reject)'}`}
        />
        <p className="av-display text-4xl text-white">
          {approved ? 'Đội được duyệt' : 'Đội bị từ chối'}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 max-w-xs mx-auto">
          <div className="rounded-xl bg-(--av-approve)/15 border border-(--av-approve)/30 px-3 py-2">
            <p className="text-[10px] uppercase font-bold text-(--av-approve)">Đồng ý</p>
            <p className="text-2xl font-black text-white">{approves}</p>
          </div>
          <div className="rounded-xl bg-(--av-reject)/15 border border-(--av-reject)/30 px-3 py-2">
            <p className="text-[10px] uppercase font-bold text-(--av-reject-light)">Từ chối</p>
            <p className="text-2xl font-black text-white">{rejects}</p>
            {nonVoters > 0 && (
              <p className="text-[10px] font-bold leading-tight text-slate-300/80">
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
