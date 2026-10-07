import type { Player } from '@/types/player';
import type { AvalonGameState } from '../types';
import { formatClock, usePhaseClock } from '../hooks/usePhaseClock';
import AvIcon from '../assets/AvIcon';
import GlassPanel from '../ui/GlassPanel';

export function RoleRevealWaitingSection({
  state,
  myPlayer,
  gamePlayers,
  onShowMyRole,
}: {
  state: AvalonGameState;
  myPlayer: Player;
  gamePlayers: Player[];
  onShowMyRole: () => void;
}) {
  const { remaining } = usePhaseClock(state);
  const timeStr = formatClock(remaining);

  const ackedIds = Object.keys(state.roleAcks ?? {});
  const myAcked = ackedIds.includes(myPlayer.id);
  const ackCount = ackedIds.length;
  const total = gamePlayers.length;
  const allAcked = ackCount >= total;

  return (
    <div className="space-y-3">
      <GlassPanel tone="mystic" className="p-5 text-center">
        <p className="text-[11px] uppercase font-black text-purple-300 mb-2">
          <AvIcon name="seal" /> Đang lộ vai
        </p>
        {myAcked ? (
          <>
            <AvIcon name="check" size={48} className="mb-2 text-emerald-300" />
            <p className="text-sm font-bold text-emerald-300">Bạn đã sẵn sàng</p>
          </>
        ) : (
          <>
            <AvIcon name="seal" size={48} className="mb-2 animate-pulse text-(--av-gold)" />
            <p className="text-sm font-bold text-amber-300 mb-3">
              Bạn chưa xác nhận đã đọc role
            </p>
            <button
              onClick={onShowMyRole}
              className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-sm font-black text-white hover:from-amber-400 hover:to-orange-400"
            >
              <AvIcon name="eye" /> Xem lại role
            </button>
          </>
        )}
      </GlassPanel>

      <GlassPanel className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] uppercase font-bold text-slate-400">
            Tiến độ
          </span>
          <span className="text-sm font-black text-white">
            {ackCount} / {total}
          </span>
        </div>
        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500"
            style={{ width: `${total > 0 ? (ackCount / total) * 100 : 0}%` }}
          />
        </div>
        <div className="mt-3 space-y-1.5">
          {gamePlayers.map((p) => {
            const acked = ackedIds.includes(p.id);
            return (
              <div
                key={p.id}
                className="flex items-center justify-between text-xs"
              >
                <span className={acked ? 'text-white font-bold' : 'text-slate-400'}>
                  {p.name}
                  {p.id === myPlayer.id && (
                    <span className="text-(--av-parchment) ml-1">(bạn)</span>
                  )}
                </span>
                <span className={acked ? 'text-emerald-400 font-black' : 'text-slate-400'}>
                  <AvIcon name={acked ? 'check' : 'waiting'} /> {acked ? 'Sẵn sàng' : 'Đang đọc'}
                </span>
              </div>
            );
          })}
        </div>
      </GlassPanel>

      <GlassPanel
        tone={allAcked ? 'success' : remaining < 30000 ? 'warning' : 'neutral'}
        className="p-4 text-center"
      >
        <p className="text-[11px] uppercase font-bold text-slate-400 mb-1">
          {allAcked ? 'Đang chuyển sang lượt Đêm' : 'Tự động vào lượt Đêm sau'}
        </p>
        <p
          className={`text-2xl font-black ${allAcked
            ? 'text-emerald-300'
            : remaining < 30000
              ? 'text-amber-300'
              : 'text-white'
            }`}
        >
          {allAcked ? <AvIcon name="check" title="Mọi người đã sẵn sàng" /> : timeStr}
        </p>
      </GlassPanel>
    </div>
  );
}
