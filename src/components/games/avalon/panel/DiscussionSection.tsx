import type { Player } from '@/types/player';
import type { AvalonGameState } from '../types';
import { formatClock, usePhaseClock } from '../hooks/usePhaseClock';
import AvIcon from '../assets/AvIcon';
import GlassPanel from '../ui/GlassPanel';
import JourneyStrip from '../scenes/JourneyStrip';

export function DiscussionSection({
  state,
  myPlayer,
  gamePlayers,
  roomId,
  onAckDiscussion,
}: {
  state: AvalonGameState;
  myPlayer: Player;
  gamePlayers: Player[];
  roomId: string;
  onAckDiscussion: () => void;
}) {
  const { remaining } = usePhaseClock(state);
  const timeStr = formatClock(remaining);

  const ackedIds = Object.keys(state.roleAcks ?? {});
  const myAcked = ackedIds.includes(myPlayer.id);
  const ackCount = ackedIds.length;
  const total = gamePlayers.length;
  const allAcked = ackCount >= total && total > 0;

  return (
    <div className="space-y-3">
      <GlassPanel tone="success" emphasis className="p-5 text-center">
        <p className="text-[11px] uppercase font-black text-emerald-300 mb-2 tracking-widest">
          <AvIcon name="discussion" /> Thảo luận trước Quest {state.currentQuest + 1}
        </p>
        <div className={`text-5xl font-black mb-2 ${remaining < 60_000 ? 'text-amber-300' : 'text-white'}`}>
          {timeStr}
        </div>
        <p className="text-xs text-slate-300">
          Thời gian thảo luận tối đa <strong className="text-white">10 phút</strong>.
          Khi tất cả nhấn <strong className="text-emerald-300">Sẵn sàng</strong>, sẽ vào ngay{' '}
          <strong>Quest {state.currentQuest + 1}</strong>.
        </p>
      </GlassPanel>

      {!myAcked ? (
        <button
          onClick={onAckDiscussion}
          className="w-full rounded-2xl bg-gradient-to-r from-emerald-700 to-teal-700 py-4 text-base font-black text-white hover:from-emerald-600 hover:to-teal-600 active:scale-[0.98] shadow-lg shadow-emerald-500/30"
        >
          ✓ Tôi sẵn sàng — Bỏ qua thảo luận
        </button>
      ) : (
        <button
          disabled
          className="w-full rounded-2xl border border-emerald-400/40 bg-(color:--av-glass-bg) py-4 text-base font-black text-emerald-200"
        >
          ✓ Bạn đã sẵn sàng — Chờ những người còn lại
        </button>
      )}

      <GlassPanel className="p-3" data-journey="">
        <p className="mb-2 px-1 text-[10px] uppercase font-bold text-slate-400 tracking-widest">
          Hành trình
        </p>
        <JourneyStrip state={state} roomId={roomId} />
      </GlassPanel>

      <GlassPanel className="p-3">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">
            Sẵn sàng kết thúc thảo luận
          </span>
          <span className="text-sm font-black text-white">
            {ackCount} / {total}
          </span>
        </div>
        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
            style={{ width: `${total > 0 ? (ackCount / total) * 100 : 0}%` }}
          />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-1.5">
          {gamePlayers.map((p) => {
            const acked = ackedIds.includes(p.id);
            return (
              <div
                key={p.id}
                className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 ${acked
                  ? 'border-emerald-500/40 bg-emerald-500/10'
                  : 'border-white/10 bg-white/5'
                  }`}
              >
                <AvIcon
                  name={acked ? 'check' : 'discussion'}
                  size={16}
                  className={acked ? 'text-emerald-300' : 'text-amber-200/80'}
                  title={acked ? 'Sẵn sàng' : 'Đang thảo luận'}
                />
                <span className="text-xs font-bold text-white truncate flex-1">
                  {p.name}
                  {p.id === myPlayer.id && <span className="text-(--av-parchment)"> (bạn)</span>}
                </span>
              </div>
            );
          })}
        </div>
        {allAcked && (
          <p className="mt-2 text-[11px] text-emerald-300 text-center font-bold">
            Tất cả sẵn sàng — đang chuyển sang Quest...
          </p>
        )}
      </GlassPanel>
    </div>
  );
}
