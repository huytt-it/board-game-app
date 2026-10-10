import type { Player } from '@/types/player';
import { AvalonRole, type AvalonGameData, type AvalonGameState } from '../types';
import { ROLE_NAMES_VI } from '../constants';
import { formatClock, usePhaseClock } from '../hooks/usePhaseClock';
import { useConfirm } from '../hooks/useConfirm';
import { LOW_TIME_GLOW } from './shared';
import AvIcon from '../assets/AvIcon';
import ActionDock from '../ui/ActionDock';
import AimHeartbeat from '../ui/AimHeartbeat';
import GlassPanel from '../ui/GlassPanel';
import PlayerAvatar from '../ui/PlayerAvatar';
import RoleEmblem from '../ui/RoleEmblem';

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
  const { ask, dialog: confirmDialog } = useConfirm();
  // Rounded UP to whole seconds before formatting as m:ss (unlike formatClock
  // alone, which rounds down), so the label hits 0:00 only when time is up.
  const timeLabel = formatClock(Math.ceil(remaining / 1000) * 1000);
  const lowTime = remaining <= 30_000;

  // Card "Sát Thủ đang ngắm <X>" — luôn hiển thị TRÊN khối Phe Quỷ lộ diện khi
  // Sát Thủ đã pick (broadcast qua state.assassinChoiceId). Khi chưa pick thì
  // ẩn để khối Phe Quỷ lên trên. Trong phase này cả Phe Quỷ đã lộ diện công
  // khai, nên màu phe trên các thẻ không lộ thêm gì.
  const pickedCard = picked && (
    <GlassPanel key={picked.id} tone="evil" className="p-4 animate-scale-in">
      <p className="text-[11px] uppercase font-black text-(--av-evil-light) mb-1 tracking-widest">
        <AvIcon name="target" /> Sát Thủ đang ngắm
      </p>
      <div className="flex items-center gap-3">
        <PlayerAvatar player={picked} size="lg" aim="assassin" className="av-stab">
          <AimHeartbeat state={state} />
          <span className="pointer-events-none absolute -top-4 left-1/2 -translate-x-1/2 text-2xl text-(--av-evil) drop-shadow-[0_2px_3px_rgba(0,0,0,0.7)] animate-bounce">
            <AvIcon name="target" />
          </span>
        </PlayerAvatar>
        <div className="flex-1 min-w-0">
          <p className="text-base font-black text-white truncate">{picked.name}</p>
          <p className="text-[11px] font-bold text-(--av-evil-light)">
            Đang bị Sát Thủ nghi là Merlin
          </p>
        </div>
      </div>
    </GlassPanel>
  );

  const evilRevealCard = (
    <GlassPanel tone="evil" className="p-4">
      <p className="text-[11px] uppercase font-black text-(--av-evil-light) mb-1 tracking-widest">
        <AvIcon name="team-evil" /> Phe Quỷ lộ diện
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
              className="flex items-center gap-3 rounded-xl border border-(--av-evil)/30 bg-(--av-evil)/10 px-3 py-2.5"
            >
              <RoleEmblem role={role} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-white truncate">{p.name}</p>
                <p className="text-[11px] font-bold text-(--av-evil-light)">
                  {role} · {ROLE_NAMES_VI[role]}
                </p>
              </div>
              {role === AvalonRole.Assassin && (
                <span className="shrink-0 rounded-full bg-(--av-evil)/40 border border-(--av-evil-light)/50 px-2 py-0.5 text-[10px] font-black text-white">
                  <AvIcon name="assassin" /> Sát Thủ
                </span>
              )}
            </div>
          );
        })}
      </div>
    </GlassPanel>
  );

  const headerCard = (
    <GlassPanel tone="evil" className="p-4 text-center">
      <p className="text-[11px] uppercase font-bold text-amber-300 mb-1 tracking-widest">
        <AvIcon name="assassinate" /> Phe Người đã thắng {successes} Quest
      </p>
      <p className="text-sm text-slate-300">
        Phe Quỷ có cơ hội cuối: <span className="font-black text-(--av-evil-light)">tìm Merlin</span>.
        Trúng → Phe Quỷ thắng ngược · Trật hoặc hết giờ → Phe Người thắng.
      </p>
      <div
        className={`relative mt-3 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 font-mono text-lg font-black tabular-nums ${lowTime
          ? 'border-orange-500/60 bg-orange-500/15 text-orange-200 av-pulse-ring'
          : 'border-amber-500/40 bg-amber-500/10 text-amber-200'
          }`}
        style={lowTime ? LOW_TIME_GLOW : undefined}
      >
        <AvIcon name="clock" /> {timeLabel}
      </div>
      <p className="mt-2 text-[11px] text-slate-400">
        Quest: {successes} Người · {failures} Quỷ
      </p>
    </GlassPanel>
  );

  if (myTeam === 'good') {
    return (
      <div className="space-y-3">
        {headerCard}
        {pickedCard}
        {evilRevealCard}
        <GlassPanel tone="good" className="p-5 text-center">
          <AvIcon name="team-good" size={48} className="mb-2 text-(--av-good-light)" />
          <p className="text-sm font-black text-(--av-good-light) mb-1">
            Phe Người hãy giữ im lặng
          </p>
          <p className="text-xs text-slate-300 leading-relaxed">
            Phe Quỷ đang hội ý chọn Merlin. Đừng phản ứng để không tiết lộ Merlin là ai.
          </p>
        </GlassPanel>
      </div>
    );
  }

  if (!isAssassin) {
    return (
      <div className="space-y-3">
        {headerCard}
        {pickedCard}
        {evilRevealCard}
        <GlassPanel tone="evil" className="p-5 text-center">
          <AvIcon name="team-evil" size={48} className="mb-2 text-(--av-evil-light)" />
          <p className="text-sm font-black text-(--av-evil-light) mb-1">
            Hội ý cùng Phe Quỷ
          </p>
          <p className="text-xs text-slate-300 leading-relaxed">
            Thảo luận với đồng đội Quỷ để xác định ai là Merlin. Sát Thủ là người ra quyết định cuối cùng.
          </p>
        </GlassPanel>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {headerCard}
      {pickedCard}
      {evilRevealCard}
      <GlassPanel tone="evil" className="p-4">
        <p className="text-[11px] uppercase font-black text-(--av-evil-light) mb-1"><AvIcon name="assassin" /> Bạn là Sát Thủ</p>
        <h3 className="av-display text-xl text-white mb-1">Chọn ai là Merlin</h3>
        <p className="text-xs text-slate-300 mb-4">
          Hội ý với đồng đội Quỷ trước. Bấm vào người trong danh sách (hoặc bấm avatar trên bàn) để chọn — mọi người đều thấy bạn đang ngắm ai. Khi đã chốt thật, bấm <strong className="text-(--av-evil-light)">Xác nhận đâm</strong>.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {goodPlayers.map((p) => {
            const isPicked = pickedId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => onSetAssassinChoice?.(p.id, myPlayer.id)}
                className={`rounded-xl border p-3 text-left transition-all active:scale-95 ${isPicked
                  ? 'border-(--av-evil) bg-(--av-evil)/30 ring-2 ring-(--av-evil)/70 shadow-lg shadow-black/40'
                  : 'border-(--av-evil)/30 bg-(--av-evil)/10 hover:bg-(--av-evil)/20 hover:border-(--av-evil)/50'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <PlayerAvatar
                    player={p}
                    size="sm"
                    aim={isPicked ? 'assassin' : null}
                    className={isPicked ? 'av-stab' : ''}
                  />
                  <span className="text-sm font-bold text-white truncate flex-1">{p.name}</span>
                  {isPicked && <AvIcon name="target" size={16} className="text-(--av-evil-light)" />}
                </div>
              </button>
            );
          })}
        </div>
      </GlassPanel>

      <ActionDock>
        <button
          onClick={async () => {
            if (!pickedId) return;
            const p = gamePlayers.find((pp) => pp.id === pickedId);
            if (!p) return;
            if (
              await ask({
                title: `Đâm ${p.name}?`,
                message: `Bạn chốt ${p.name} là Merlin. Không thể đổi sau khi xác nhận.`,
                confirmLabel: 'Đâm',
                tone: 'evil',
                icon: 'assassinate',
              })
            ) {
              onAssassinate(pickedId, myPlayer.id);
            }
          }}
          disabled={!pickedId}
          className="w-full rounded-2xl bg-(--av-evil) py-3.5 text-base font-black text-(--av-ink) hover:brightness-110 active:scale-95 disabled:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed shadow-lg shadow-black/40"
        >
          {pickedId ? (
            <>
              <AvIcon name="assassinate" /> Xác nhận đâm {picked?.name ?? ''}
            </>
          ) : (
            'Chọn 1 người trước'
          )}
        </button>
      </ActionDock>
      {confirmDialog}
    </div>
  );
}
