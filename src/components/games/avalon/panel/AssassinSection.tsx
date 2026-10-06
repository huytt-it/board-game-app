import type { Player } from '@/types/player';
import { AvalonRole, type AvalonGameData, type AvalonGameState } from '../types';
import { ROLE_ICONS, ROLE_NAMES_VI } from '../constants';
import { formatClock, usePhaseClock } from '../hooks/usePhaseClock';

export function AssassinSection({
  state,
  myPlayer,
  myRole,
  gamePlayers,
  onAssassinate,
  onSetAssassinChoice,
}: {
  state: AvalonGameState;
  myPlayer: Player;
  myRole: AvalonRole | undefined;
  gamePlayers: Player[];
  onAssassinate: (id: string, callerId?: string) => void;
  onSetAssassinChoice?: (id: string | null, callerId?: string) => void;
}) {
  const isAssassin = myRole === AvalonRole.Assassin;
  const myTeam = (myPlayer.gameData as Partial<AvalonGameData>).team;
  const goodPlayers = gamePlayers.filter((p) => {
    const data = p.gameData as Partial<AvalonGameData>;
    return data.team === 'good';
  });
  const evilPlayers = gamePlayers.filter((p) => {
    const data = p.gameData as Partial<AvalonGameData>;
    return data.team === 'evil';
  });
  const successes = state.quests.filter((q) => q.result === 'success').length;
  const failures = state.quests.filter((q) => q.result === 'fail').length;
  const pickedId = state.assassinChoiceId ?? null;
  const picked = pickedId ? gamePlayers.find((p) => p.id === pickedId) : null;

  const { remaining } = usePhaseClock(state);
  // Rounded UP to whole seconds before formatting as m:ss (unlike formatClock
  // alone, which rounds down), so the label hits 0:00 only when time is up.
  const timeLabel = formatClock(Math.ceil(remaining / 1000) * 1000);
  const lowTime = remaining <= 30_000;

  // Card "Sát Thủ đang ngắm <X>" — luôn hiển thị TRÊN khối Phe Quỷ lộ diện khi
  // Sát Thủ đã pick (broadcast qua state.assassinChoiceId). Khi chưa pick thì
  // ẩn để khối Phe Quỷ lên trên.
  const pickedCard = picked && (
    <div
      key={picked.id}
      className="rounded-2xl border-2 border-red-500/70 bg-gradient-to-br from-red-950/60 to-rose-950/60 p-4 shadow-lg shadow-red-500/30 animate-scale-in"
    >
      <p className="text-[11px] uppercase font-black text-red-200 mb-1 tracking-widest">
        🎯 Sát Thủ đang ngắm
      </p>
      <div className="flex items-center gap-3">
        <div className="relative flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-red-400 bg-red-500/30 text-lg font-black text-white av-stab">
          {picked.name.charAt(0).toUpperCase()}
          <span className="pointer-events-none absolute -top-3 left-1/2 -translate-x-1/2 text-2xl drop-shadow-[0_2px_3px_rgba(0,0,0,0.6)] animate-bounce">
            🗡️
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-black text-white truncate">{picked.name}</p>
          <p className="text-[11px] font-bold text-red-300">
            Đang bị Sát Thủ nghi là Merlin
          </p>
        </div>
      </div>
    </div>
  );

  const evilRevealCard = (
    <div className="rounded-2xl border-2 border-red-500/50 bg-red-950/30 p-4">
      <p className="text-[11px] uppercase font-black text-red-300 mb-1 tracking-widest">
        👹 Phe Quỷ lộ diện
      </p>
      <p className="text-xs text-slate-300 mb-3">
        Tất cả Phe Quỷ hiện danh tính đầy đủ với Phe Người.
      </p>
      <div className="space-y-2">
        {evilPlayers.map((p) => {
          const role = (p.gameData as Partial<AvalonGameData>).role!;
          return (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5"
            >
              <span className="text-2xl shrink-0">{ROLE_ICONS[role]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-white truncate">{p.name}</p>
                <p className="text-[11px] font-bold text-red-300">
                  {role} · {ROLE_NAMES_VI[role]}
                </p>
              </div>
              {role === AvalonRole.Assassin && (
                <span className="shrink-0 rounded-full bg-red-500/40 border border-red-400/50 px-2 py-0.5 text-[10px] font-black text-red-100">
                  🎯 Sát Thủ
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const headerCard = (
    <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4 text-center">
      <p className="text-[11px] uppercase font-bold text-amber-300 mb-1 tracking-widest">
        🎯 Phe Người đã thắng {successes} Quest
      </p>
      <p className="text-sm text-slate-300">
        Phe Quỷ có cơ hội cuối: <span className="font-black text-red-300">tìm Merlin</span>.
        Trúng → Phe Quỷ thắng ngược · Trật hoặc hết giờ → Phe Người thắng.
      </p>
      <div
        className={`mt-3 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 font-mono text-lg font-black tabular-nums ${lowTime
          ? 'border-red-500/60 bg-red-500/15 text-red-200 animate-pulse'
          : 'border-amber-500/40 bg-amber-500/10 text-amber-200'
          }`}
      >
        ⏱️ {timeLabel}
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        Quest: {successes} Người · {failures} Quỷ
      </p>
    </div>
  );

  if (myTeam === 'good') {
    return (
      <div className="space-y-3">
        {headerCard}
        {pickedCard}
        {evilRevealCard}
        <div className="rounded-2xl border border-blue-500/40 bg-blue-500/10 p-5 text-center">
          <div className="text-5xl mb-2">🤫</div>
          <p className="text-sm font-black text-blue-200 mb-1">
            Phe Người hãy giữ im lặng
          </p>
          <p className="text-xs text-slate-300 leading-relaxed">
            Phe Quỷ đang hội ý chọn Merlin. Đừng phản ứng để không tiết lộ Merlin là ai.
          </p>
        </div>
      </div>
    );
  }

  if (!isAssassin) {
    return (
      <div className="space-y-3">
        {headerCard}
        {pickedCard}
        {evilRevealCard}
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-5 text-center">
          <div className="text-5xl mb-2">🤝</div>
          <p className="text-sm font-black text-red-200 mb-1">
            Hội ý cùng Phe Quỷ
          </p>
          <p className="text-xs text-slate-300 leading-relaxed">
            Thảo luận với đồng đội Quỷ để xác định ai là Merlin. Sát Thủ là người ra quyết định cuối cùng.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {headerCard}
      {pickedCard}
      {evilRevealCard}
      <div className="rounded-2xl border-2 border-red-500/60 bg-red-500/15 p-4">
        <p className="text-[11px] uppercase font-black text-red-300 mb-1">🗡️ Bạn là Sát Thủ</p>
        <h3 className="text-base font-black text-white mb-1">Chọn ai là Merlin</h3>
        <p className="text-xs text-slate-300 mb-4">
          Hội ý với đồng đội Quỷ trước. Bấm vào người trong danh sách (hoặc bấm avatar trên bàn) để chọn — mọi người đều thấy bạn đang ngắm ai. Khi đã chốt thật, bấm <strong className="text-red-200">Xác nhận đâm</strong>.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {goodPlayers.map((p) => {
            const isPicked = pickedId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => onSetAssassinChoice?.(p.id, myPlayer.id)}
                className={`rounded-xl border p-3 text-left transition-all active:scale-95 ${isPicked
                  ? 'border-red-400 bg-red-500/30 ring-2 ring-red-400/70 shadow-lg shadow-red-500/40'
                  : 'border-red-500/30 bg-red-500/10 hover:bg-red-500/20 hover:border-red-500/50'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-black text-white ${isPicked
                      ? 'bg-gradient-to-br from-red-400 to-rose-500 av-stab'
                      : 'bg-gradient-to-br from-red-500 to-rose-500'
                      }`}
                  >
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-bold text-white truncate flex-1">{p.name}</span>
                  {isPicked && <span className="text-base">🗡️</span>}
                </div>
              </button>
            );
          })}
        </div>
        <button
          onClick={() => {
            if (!pickedId) return;
            const p = gamePlayers.find((pp) => pp.id === pickedId);
            if (!p) return;
            if (confirm(`Đâm ${p.name} làm Merlin? Không thể đổi sau khi xác nhận.`)) {
              onAssassinate(pickedId, myPlayer.id);
            }
          }}
          disabled={!pickedId}
          className="mt-4 w-full rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 py-3.5 text-base font-black text-white hover:from-red-500 hover:to-rose-500 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-red-500/30"
        >
          {pickedId ? `🗡️ Xác nhận đâm ${picked?.name ?? ''}` : 'Chọn 1 người trước'}
        </button>
      </div>
    </div>
  );
}
