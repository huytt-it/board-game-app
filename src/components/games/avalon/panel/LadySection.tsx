import type { Player } from '@/types/player';
import type { AvalonGameData, AvalonGameState } from '../types';
import { formatSecs, usePhaseClock } from '../hooks/usePhaseClock';
import { PlayerRoster } from './PlayerRoster';
import { TokenBadges } from './shared';
import AvIcon from '../assets/AvIcon';
import PlayerAvatar from '../ui/PlayerAvatar';

export function LadySection({
  state,
  myPlayer,
  myTeam,
  gamePlayers,
  onLadyInspect,
  onLadyConfirm,
  onLadyFinish,
}: {
  state: AvalonGameState;
  myPlayer: Player;
  myTeam: 'good' | 'evil' | undefined;
  gamePlayers: Player[];
  onLadyInspect: (id: string) => void;
  onLadyConfirm: () => void;
  onLadyShow: (card: 'good' | 'evil') => void;
  onLadyFinish: () => void;
}) {
  const isHolder = state.ladyHolderId === myPlayer.id;
  const isTarget = state.ladyTargetId === myPlayer.id;
  const holder = gamePlayers.find((p) => p.id === state.ladyHolderId);
  const target = state.ladyTargetId ? gamePlayers.find((p) => p.id === state.ladyTargetId) : null;
  const shown = state.ladyShownCard;
  const inspected = shown !== null;

  // Đếm ngược 45s — hiển thị cho cả Lady, target và bystander.
  const { remaining } = usePhaseClock(state);
  const timeStr = formatSecs(remaining);

  if (isTarget) {
    const isEvil = myTeam === 'evil';
    if (!inspected) {
      return (
        <div className="rounded-2xl border-2 border-(--av-lady)/60 bg-(--av-lady)/10 p-5 text-center">
          <p className="text-[11px] uppercase font-black text-teal-100 mb-2 tracking-widest">
            <AvIcon name="lady" /> {holder?.name} đang ngắm bạn
          </p>
          <p className="text-sm text-slate-300 mb-3">
            Chờ Lady bấm <strong className="text-white">Xác nhận soi vai trò</strong> để xem phe của bạn.
          </p>
          <AvIcon name="eye" size={30} className="mb-1 animate-pulse text-(--av-lady)" />
          <p className="text-[11px] text-slate-400">Còn lại {timeStr}</p>
        </div>
      );
    }
    return (
      <div
        className={`rounded-2xl border-2 p-6 text-center ${isEvil
          ? 'border-red-500/60 bg-red-500/10'
          : 'border-blue-500/60 bg-blue-500/10'
          }`}
      >
        <p className="text-[11px] uppercase font-black text-slate-300 mb-2 tracking-widest">
          <AvIcon name="lady" /> {holder?.name} đã soi vai trò của bạn
        </p>
        <AvIcon
          name={isEvil ? 'team-evil' : 'team-good'}
          size={60}
          className={`mb-2 ${isEvil ? 'text-red-200' : 'text-blue-200'}`}
        />
        <p
          className={`text-2xl font-black mb-1 ${isEvil ? 'text-red-200' : 'text-blue-200'
            }`}
        >
          {isEvil ? 'PHE ÁC' : 'PHE THIỆN'}
        </p>
        <p className="text-[11px] text-slate-400 mt-2">
          Lady đã thấy phe thật của bạn — không thể nói xạo.
        </p>
        <p className="mt-3 text-xs text-slate-400">
          Chờ {holder?.name} hoàn tất để chuyển token...
        </p>
        <AvIcon name="waiting" size={24} className="mt-2 animate-pulse text-slate-300" />
      </div>
    );
  }

  if (isHolder) {
    // Bước 3: đã confirm → reveal + Hoàn tất.
    if (state.ladyTargetId && inspected) {
      const isGoodCard = shown === 'good';
      return (
        <div className="space-y-3">
          <div
            className={`rounded-2xl border-2 p-6 text-center ${isGoodCard ? 'border-blue-500/60 bg-blue-500/15' : 'border-red-500/60 bg-red-500/15'
              }`}
          >
            <p className="text-[11px] uppercase font-bold text-slate-300 mb-1 tracking-widest">
              <AvIcon name="lady" /> Kết quả soi
            </p>
            <p className="text-base font-black text-white mb-3">
              {target?.name} là
            </p>
            <AvIcon
              name={isGoodCard ? 'team-good' : 'team-evil'}
              size={72}
              className={`mb-2 ${isGoodCard ? 'text-blue-200' : 'text-red-200'}`}
            />
            <p
              className={`av-display text-4xl ${isGoodCard ? 'text-blue-200' : 'text-red-200'
                }`}
            >
              {isGoodCard ? 'PHE THIỆN' : 'PHE ÁC'}
            </p>
            <p className="mt-3 text-[11px] text-slate-400 italic">
              Bạn có thể chia sẻ thật / nói xạo với nhóm tuỳ ý.
            </p>
          </div>
          <button
            onClick={onLadyFinish}
            className="w-full rounded-2xl bg-gradient-to-r from-cyan-600 to-teal-600 py-4 font-black text-white text-base hover:from-cyan-500 hover:to-teal-500 active:scale-95"
          >
            ✓ Hoàn tất — Chuyển token cho {target?.name}
          </button>
        </div>
      );
    }

    // Bước 1+2 gộp: luôn hiện candidate list. Click 1 người → highlight + sáng
    // nút "Xác nhận soi". Click người khác → highlight chuyển + đồng hồ reset
    // (thực hiện trong useAvalon.ladyInspect bằng cách ghi phaseStartedAt mới).
    const candidates = gamePlayers.filter((p) => {
      if (p.id === myPlayer.id) return false;
      if (state.ladyHistory.includes(p.id)) return false;
      return true;
    });
    const hasPick = !!state.ladyTargetId;

    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-cyan-500/40 bg-cyan-500/5 p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[11px] uppercase font-black text-(--av-lady)"><AvIcon name="lady" /> Lady of the Lake</p>
            <span className={`text-xs font-black tabular-nums ${remaining < 10_000 ? 'text-orange-300 animate-pulse' : 'text-cyan-200'}`}>
              <AvIcon name="clock" /> {timeStr}
            </span>
          </div>
          <h3 className="av-display text-xl text-white mb-1">
            {hasPick ? `Đã chọn ${target?.name} — bấm Xác nhận soi` : 'Chọn 1 người để soi'}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            Người đã từng cầm token không được soi lại. Đổi người: bấm vào người khác trong danh sách (đồng hồ sẽ reset).
          </p>
          <div className="grid grid-cols-2 gap-2">
            {candidates.map((p) => {
              const picked = state.ladyTargetId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => onLadyInspect(p.id)}
                  className={`rounded-xl border p-3 text-left transition-all active:scale-95 ${picked
                    ? 'border-(--av-lady) bg-(--av-lady)/20 ring-2 ring-(--av-lady)/60 shadow-lg shadow-black/40'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <PlayerAvatar player={p} size="sm" aim={picked ? 'lady' : null} />
                    <span className="text-sm font-bold text-white truncate">{p.name}</span>
                  </div>
                  <TokenBadges playerId={p.id} state={state} />
                  {picked && (
                    <p className="mt-1 text-[10px] font-black text-teal-100">
                      <AvIcon name="eye" /> Đang ngắm
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={onLadyConfirm}
          disabled={!hasPick}
          className={`w-full rounded-2xl py-3.5 text-base font-black text-white transition-all active:scale-95 ${hasPick
            ? 'bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 shadow-lg shadow-black/40'
            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
        >
          <AvIcon name="eye" /> Xác nhận soi {hasPick ? target?.name : '(chọn 1 người)'}
        </button>
      </div>
    );
  }

  // Bystander view — thấy ai đang được Lady ngắm/đã soi.
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5 text-center">
        <p className="text-[11px] uppercase font-bold text-(--av-lady) mb-2"><AvIcon name="lady" /> Lady of the Lake</p>
        {!target && (
          <>
            <p className="text-sm text-slate-300">
              <span className="font-black text-white">{holder?.name}</span> đang chọn người để soi...
            </p>
            <p className="mt-2 text-[11px] text-amber-300/80"><AvIcon name="clock" /> Còn lại {timeStr}</p>
          </>
        )}
        {target && !inspected && (
          <>
            <p className="text-sm text-slate-300">
              <span className="font-black text-white">{holder?.name}</span> đang ngắm{' '}
              <span className="font-black text-teal-100">{target.name}</span>.
            </p>
            <p className="mt-1 text-xs text-slate-400">Chờ Lady xác nhận soi...</p>
            <p className="mt-2 text-[11px] text-amber-300/80"><AvIcon name="clock" /> Còn lại {timeStr}</p>
          </>
        )}
        {target && inspected && (
          <>
            <p className="text-sm text-slate-300">
              <span className="font-black text-white">{holder?.name}</span> đã soi{' '}
              <span className="font-black text-teal-100">{target.name}</span>.
            </p>
            <p className="mt-1 text-xs text-slate-400">Chờ Lady chuyển token...</p>
          </>
        )}
        <AvIcon name="waiting" size={30} className="mt-3 animate-pulse text-slate-300" />
      </div>
      <div className="lg:hidden">
        <PlayerRoster
          gamePlayers={gamePlayers}
          state={state}
          myPlayerId={myPlayer.id}
          highlightedIds={state.ladyTargetId ? [state.ladyTargetId] : []}
          showLadyTarget
          title="Tất cả người chơi (highlight = đang bị ngắm)"
          emphasis="lady"
          viewerRole={(myPlayer.gameData as Partial<AvalonGameData>).role}
        />
      </div>
    </div>
  );
}
