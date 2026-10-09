import type { Player } from '@/types/player';
import type { AvalonGameData, AvalonGameState } from '../types';
import { formatSecs, usePhaseClock } from '../hooks/usePhaseClock';
import { PlayerRoster } from './PlayerRoster';
import { LowTimeClock, TokenBadges } from './shared';
import AvIcon from '../assets/AvIcon';
import ActionDock from '../ui/ActionDock';
import GlassPanel from '../ui/GlassPanel';
import PlayerAvatar from '../ui/PlayerAvatar';

export function TeamBuildSection({
  isLeader,
  state,
  gamePlayers,
  teamSize,
  myPlayerId,
  onProposedTeamChange,
  onSubmitTeam,
}: {
  isLeader: boolean;
  state: AvalonGameState;
  gamePlayers: Player[];
  teamSize: number;
  myPlayerId: string;
  onProposedTeamChange: (ids: string[]) => void;
  onSubmitTeam: () => void;
}) {
  const leader = gamePlayers.find((p) => p.id === state.currentLeaderId);
  const team = state.proposedTeam;

  // Countdown 60s cho Leader chọn đội. Hết giờ: auto-submit nếu đủ size,
  // ngược lại xoay sang Leader kế tiếp (xử lý trong useAvalon).
  const { remaining } = usePhaseClock(state);
  const timeStr = formatSecs(remaining);
  const lowTime = remaining < 15_000;

  if (!isLeader) {
    const emptySlots = Math.max(0, teamSize - team.length);
    return (
      <div className="space-y-3">
        <GlassPanel tone="leader" className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-amber-300"><AvIcon name="team" /> ĐANG CHỌN ĐỘI — QUEST {state.currentQuest + 1}</p>
            <LowTimeClock low={lowTime} className={lowTime ? 'text-orange-300' : 'text-amber-200'}>
              {timeStr}
            </LowTimeClock>
          </div>
          <p className="text-sm text-slate-300 mb-3">
            Leader <span className="font-black text-white">{leader?.name ?? '?'}</span> đang chọn{' '}
            <span className="font-black text-amber-300">{teamSize} người tham gia</span>.
          </p>
          <p className="text-[10px] uppercase font-bold text-slate-400 mb-2">
            Đội đang được chọn ({team.length}/{teamSize})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {team.map((id) => {
              const p = gamePlayers.find((pp) => pp.id === id);
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-(--av-team)/20 border border-(--av-team)/40 py-1 pl-1 pr-2.5 text-xs font-black text-orange-100"
                >
                  {p && <PlayerAvatar player={p} size="xs" />}
                  {p?.name ?? '?'}
                </span>
              );
            })}
            {Array.from({ length: emptySlots }).map((_, i) => (
              <span
                key={`empty-${i}`}
                className="rounded-full border border-dashed border-amber-500/30 bg-amber-500/5 px-2.5 py-1 text-xs font-bold text-amber-300/60"
              >
                ⬚ trống
              </span>
            ))}
          </div>
        </GlassPanel>

        <div className="lg:hidden">
          <PlayerRoster
            gamePlayers={gamePlayers}
            state={state}
            myPlayerId={myPlayerId}
            highlightedIds={team}
            title="Tất cả người chơi (highlight = đang được đề cử)"
            emphasis="team"
            viewerRole={(gamePlayers.find((pp) => pp.id === myPlayerId)?.gameData as Partial<AvalonGameData> | undefined)?.role}
          />
        </div>
      </div>
    );
  }

  const toggle = (id: string) => {
    if (team.includes(id)) {
      onProposedTeamChange(team.filter((x) => x !== id));
    } else if (team.length < teamSize) {
      onProposedTeamChange([...team, id]);
    } else {
      onProposedTeamChange([...team.slice(1), id]);
    }
  };

  return (
    <div className="space-y-3">
      <GlassPanel tone="leader" emphasis className="p-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[11px] uppercase font-black text-(--av-leader)"><AvIcon name="leader" /> Bạn là Leader</p>
          <LowTimeClock low={lowTime} className={lowTime ? 'text-orange-300' : 'text-amber-200'}>
            {timeStr}
          </LowTimeClock>
        </div>
        <h3 className="av-display text-xl text-white mb-1">
          Chọn {teamSize} người cho Quest {state.currentQuest + 1}
        </h3>
        <p className="text-xs text-slate-300 mb-1">
          Bạn có thể tự chọn mình. Nhấn lại để bỏ chọn.
        </p>
        <p className="text-[10px] text-amber-300/80 mb-4">
          <AvIcon name="warning" /> Còn {timeStr} — hết giờ sẽ tự trình đội (nếu đủ) hoặc chuyển Leader.
        </p>

        <div className="grid grid-cols-2 gap-2">
          {gamePlayers.map((p) => {
            const picked = team.includes(p.id);
            return (
              <button
                key={p.id}
                onClick={() => toggle(p.id)}
                className={`rounded-xl border p-3 text-left transition-all active:scale-95 ${picked
                  ? 'border-(--av-team) bg-(--av-team)/15 ring-1 ring-(--av-team)/50 shadow shadow-black/20'
                  : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <PlayerAvatar player={p} size="sm" selected={picked} isMe={p.id === myPlayerId} />
                  <span className="text-sm font-bold text-white truncate">{p.name}</span>
                </div>
                <TokenBadges playerId={p.id} state={state} />
                {picked && (
                  <p className="mt-1 text-[10px] font-black text-orange-200">
                    <AvIcon name="check" /> Đã chọn
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </GlassPanel>

      <ActionDock>
        <button
          onClick={onSubmitTeam}
          disabled={team.length !== teamSize}
          className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 py-3.5 text-base font-black text-(--av-ink) hover:from-amber-400 hover:to-orange-400 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed"
        >
          {team.length !== teamSize
            ? `Cần đủ ${teamSize} người (đang có ${team.length})`
            : '✓ Trình đội — Bỏ phiếu'}
        </button>
      </ActionDock>
    </div>
  );
}
