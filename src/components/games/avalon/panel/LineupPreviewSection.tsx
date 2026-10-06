import type { Player } from '@/types/player';
import type { AvalonGameState, AvalonRole } from '../types';
import { ROLE_TEAM } from '../constants';
import { formatClock, usePhaseClock } from '../hooks/usePhaseClock';
import { RoleLineChip } from './shared';
import AvIcon from '../assets/AvIcon';

export function LineupPreviewSection({
  state,
  myPlayer,
  gamePlayers,
  onAckRole,
}: {
  state: AvalonGameState;
  myPlayer: Player;
  gamePlayers: Player[];
  onAckRole: () => void;
}) {
  const { remaining } = usePhaseClock(state);
  const timeStr = formatClock(remaining);

  const ackedIds = Object.keys(state.roleAcks ?? {});
  const myAcked = ackedIds.includes(myPlayer.id);
  const ackCount = ackedIds.length;
  const total = gamePlayers.length;
  const allAcked = ackCount >= total;

  const lineup = state.roleLineup ?? [];
  const goodRoles = lineup.filter((r) => ROLE_TEAM[r] === 'good');
  const evilRoles = lineup.filter((r) => ROLE_TEAM[r] === 'evil');
  const leader = gamePlayers.find((p) => p.id === state.currentLeaderId);
  const lady = gamePlayers.find((p) => p.id === state.ladyHolderId);

  // Đếm số lượng từng role để hiện tổng quan (vd "LoyalServant ×2") —
  // KHÔNG gắn với player nào, chỉ cho biết ván có những role gì.
  const goodCounts: Record<string, number> = {};
  for (const r of goodRoles) goodCounts[r] = (goodCounts[r] ?? 0) + 1;
  const evilCounts: Record<string, number> = {};
  for (const r of evilRoles) evilCounts[r] = (evilCounts[r] ?? 0) + 1;

  return (
    <div className="space-y-2.5">
      {/* Header gọn: tổng quan + đếm ngược inline */}
      <div className="rounded-2xl border border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-900/20 to-purple-900/20 p-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase font-black text-fuchsia-300 tracking-widest">
            <AvIcon name="roles" /> Các vai trò trong ván
          </p>
          <p className="text-xs text-slate-300 mt-0.5">
            {goodRoles.length} Phe Người · {evilRoles.length} Phe Quỷ
          </p>
        </div>
        <div
          className={`shrink-0 text-center rounded-xl border px-3 py-1.5 ${allAcked
            ? 'border-emerald-500/40 bg-emerald-500/10'
            : remaining < 15000
              ? 'border-amber-500/40 bg-amber-500/10'
              : 'border-white/10 bg-white/5'
            }`}
        >
          <p className="text-[9px] uppercase font-bold text-slate-400">
            {allAcked ? 'Chia vai' : 'Tự chia sau'}
          </p>
          <p
            className={`text-lg font-black tabular-nums leading-tight ${allAcked
              ? 'text-emerald-300'
              : remaining < 15000
                ? 'text-amber-300'
                : 'text-white'
              }`}
          >
            {allAcked ? <AvIcon name="check" title="Mọi người đã sẵn sàng" /> : timeStr}
          </p>
        </div>
      </div>

      {/* 2-cột: Phe Người | Phe Quỷ — ô role chip nhỏ gọn */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-blue-500/30 bg-blue-900/15 p-2.5">
          <div className="flex items-center gap-1.5 mb-2">
            <AvIcon name="team-good" size={14} className="text-blue-300" />
            <h3 className="text-xs font-black text-blue-200">Phe Người ({goodRoles.length})</h3>
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {Object.entries(goodCounts).map(([role, count]) => (
              <RoleLineChip
                key={role}
                role={role as AvalonRole}
                count={count}
                tone="good"
              />
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-red-500/30 bg-red-900/15 p-2.5">
          <div className="flex items-center gap-1.5 mb-2">
            <AvIcon name="team-evil" size={14} className="text-red-300" />
            <h3 className="text-xs font-black text-red-200">Phe Quỷ ({evilRoles.length})</h3>
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {Object.entries(evilCounts).map(([role, count]) => (
              <RoleLineChip
                key={role}
                role={role as AvalonRole}
                count={count}
                tone="evil"
              />
            ))}
          </div>
        </div>
      </div>

      {/* 2-cột: Leader | Lady (Lady chỉ hiện khi ≥7) — gọn 1 hàng */}
      <div className={`grid gap-2 ${lady ? 'grid-cols-2' : 'grid-cols-1'}`}>
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-2.5 flex items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--av-leader) text-lg text-(--av-ink) border-2 border-amber-100 shadow shadow-black/40">
            <AvIcon name="leader" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] uppercase font-black tracking-widest text-amber-300">
              Leader đầu
            </p>
            <p className="text-sm font-black text-white truncate">
              {leader?.name ?? '?'}
              {leader?.id === myPlayer.id && (
                <span className="ml-1 text-[10px] text-amber-200">(bạn)</span>
              )}
            </p>
          </div>
        </div>
        {lady && (
          <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-2.5 flex items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--av-lady) text-lg text-(--av-ink) border-2 border-teal-100 shadow shadow-black/40">
              <AvIcon name="lady" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] uppercase font-black tracking-widest text-cyan-300">
                Lady đầu
              </p>
              <p className="text-sm font-black text-white truncate">
                {lady.name}
                {lady.id === myPlayer.id && (
                  <span className="ml-1 text-[10px] text-cyan-200">(bạn)</span>
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Ack button + progress bar gộp 1 card */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3 space-y-2">
        {!myAcked ? (
          <button
            onClick={onAckRole}
            className="w-full rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 py-3 text-sm font-black text-white hover:from-fuchsia-500 hover:to-purple-500 active:scale-[0.98] shadow shadow-fuchsia-500/30"
          >
            ✓ Đã xem — Sẵn sàng nhận vai
          </button>
        ) : (
          <button
            disabled
            className="w-full rounded-xl border border-emerald-400/40 bg-emerald-500/10 py-3 text-sm font-black text-emerald-200"
          >
            ✓ Bạn sẵn sàng — Chờ những người khác
          </button>
        )}
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold text-slate-400">Tiến độ</span>
          <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-500 transition-all duration-500"
              style={{ width: `${total > 0 ? (ackCount / total) * 100 : 0}%` }}
            />
          </div>
          <span className="text-xs font-black text-white tabular-nums">{ackCount}/{total}</span>
        </div>
      </div>
    </div>
  );
}
