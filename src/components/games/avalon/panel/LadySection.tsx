import { useState } from 'react';
import type { Player } from '@/types/player';
import type { AvalonGameData, AvalonGameState } from '../types';
import { TEAM_NAME_VI } from '../constants';
import { TEAM_ICON_NAME } from '../presentation';
import { formatSecs, usePhaseClock } from '../hooks/usePhaseClock';
import { PlayerRoster } from './PlayerRoster';
import { LowTimeClock, TokenBadges } from './shared';
import AvIcon from '../assets/AvIcon';
import ActionDock from '../ui/ActionDock';
import GlassPanel from '../ui/GlassPanel';
import PlayerAvatar from '../ui/PlayerAvatar';

// The inspected team, shown ONLY to the Lady. The card around it stays neutral
// (ux-plan 2.9): only the words and a mid-size icon carry the team colour.
function InspectedTeam({ team }: { team: 'good' | 'evil' }) {
  const color = team === 'good' ? 'text-(--av-good-light)' : 'text-(--av-evil-light)';
  return (
    <div className="my-3 flex flex-col items-center gap-1">
      <AvIcon name={TEAM_ICON_NAME[team]} size={40} className={color} />
      <p className={`av-display text-2xl ${color}`}>{TEAM_NAME_VI[team]}</p>
    </div>
  );
}

// The Lady's result card, turned over from its face-down back. It is on the
// Lady's screen only (nobody else is ever shown the team), so the flip is a
// local, decorative transition: it plays when the result ARRIVES while the
// screen is open, and a reload shows the card face up straight away (ux-plan
// 2.2). Face up is the static style; the keyframes only describe the turn.
function LadyResultCard({ target, team, live }: { target: Player; team: 'good' | 'evil'; live: boolean }) {
  return (
    <div style={{ perspective: '800px' }} data-lady-result={team} data-lady-flip={live ? 'live' : 'static'}>
      <div className={`relative [transform-style:preserve-3d] ${live ? 'av-lady-flip' : ''}`}>
        <GlassPanel tone="lady" emphasis className="av-flip-face p-6 text-center">
          <p className="text-[11px] uppercase font-bold text-slate-300 mb-1 tracking-widest">
            <AvIcon name="lady" /> Kết quả soi
          </p>
          <p className="text-base font-black text-white">{target.name} là</p>
          <InspectedTeam team={team} />
          <p className="text-[11px] text-slate-400 italic">
            Bạn có thể chia sẻ thật / nói xạo với nhóm tuỳ ý.
          </p>
        </GlassPanel>
        {/* The back: one design for every result. */}
        <div
          className="av-flip-back flex items-center justify-center rounded-2xl border-2 border-(--av-lady)/60 bg-(--av-ink)"
          aria-hidden
        >
          <AvIcon name="lady" size={56} className="text-(--av-lady)" />
        </div>
      </div>
    </div>
  );
}

export function LadySection({
  state,
  myPlayer,
  gamePlayers,
  onLadyInspect,
  onLadyConfirm,
  onLadyFinish,
}: {
  state: AvalonGameState;
  myPlayer: Player;
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

  // Did this screen open before the result came in? Then the card turns over
  // when it does; if the result is already there (a reload) it just shows.
  const [liveReveal] = useState(() => !inspected);

  // Đếm ngược 45s — hiển thị cho cả Lady, target và bystander.
  const { remaining } = usePhaseClock(state);
  const timeStr = formatSecs(remaining);

  // What the screen reader hears when the Lady looks: the holder hears the
  // team, nobody else ever does (the same words for the target and the rest).
  const announce =
    !inspected || !target
      ? ''
      : isHolder
        ? `${target.name} thuộc ${TEAM_NAME_VI[shown === 'good' ? 'good' : 'evil']}.`
        : `${holder?.name ?? 'Lady'} đã soi ${isTarget ? 'bạn' : target.name}.`;
  const live = (
    <p className="sr-only" role="status" aria-live="polite" data-lady-announce="">
      {announce}
    </p>
  );

  if (isTarget) {
    // The screen is the same whichever team the viewer is on: the card is
    // neutral and says nothing about what the Lady saw (ux-plan 2.4).
    if (!inspected) {
      return (
        <GlassPanel tone="lady" emphasis className="p-5 text-center">
          {live}
          <p className="text-[11px] uppercase font-black text-teal-100 mb-2 tracking-widest">
            <AvIcon name="lady" /> {holder?.name} đang ngắm bạn
          </p>
          <p className="text-sm text-slate-300 mb-3">
            Chờ Lady bấm <strong className="text-white">Xác nhận soi</strong> để nhìn thấy phe thật của bạn.
          </p>
          <AvIcon name="eye" size={30} className="mb-1 animate-pulse text-(--av-lady)" />
          <p className="text-[11px] text-slate-400">Còn lại {timeStr}</p>
        </GlassPanel>
      );
    }
    return (
      <GlassPanel tone="lady" emphasis className="p-6 text-center">
        {live}
        <p className="text-[11px] uppercase font-black text-slate-300 mb-2 tracking-widest">
          <AvIcon name="lady" /> {holder?.name} đã soi bạn
        </p>
        <AvIcon name="eye" size={40} className="text-(--av-lady)" />
        <p className="av-display mt-1 text-2xl text-white">Đã soi</p>
        <p className="mt-2 text-[11px] text-slate-400">
          Lady đã thấy phe thật của bạn — không thể nói xạo với Lady.
        </p>
        <p className="mt-3 text-xs text-slate-300">
          Chờ {holder?.name} hoàn tất để chuyển token...
        </p>
        <AvIcon name="waiting" size={24} className="mt-2 animate-pulse text-slate-300" />
      </GlassPanel>
    );
  }

  if (isHolder) {
    // Bước 3: đã confirm → reveal + Hoàn tất.
    if (target && inspected) {
      return (
        <div className="space-y-3">
          {live}
          <LadyResultCard target={target} team={shown === 'good' ? 'good' : 'evil'} live={liveReveal} />
          <ActionDock>
            <button
              onClick={onLadyFinish}
              className="w-full rounded-2xl bg-(--av-lady) py-4 font-black text-(--av-ink) text-base hover:brightness-110 active:scale-95"
            >
              ✓ Hoàn tất — Chuyển token cho {target.name}
            </button>
          </ActionDock>
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
        {live}
        <GlassPanel tone="lady" className="p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[11px] uppercase font-black text-(--av-lady)"><AvIcon name="lady" /> Lady of the Lake</p>
            <LowTimeClock low={remaining < 10_000} className={remaining < 10_000 ? 'text-orange-300' : 'text-teal-100'}>
              {timeStr}
            </LowTimeClock>
          </div>
          <h3 className="av-display text-xl text-white mb-1">
            {hasPick ? `Đã chọn ${target?.name} — bấm Xác nhận soi` : 'Chọn 1 người để soi'}
          </h3>
          <p className="text-xs text-slate-300 mb-3">
            Người đã từng cầm token không được soi lại. Đổi người: bấm vào người khác trong danh sách (đồng hồ sẽ reset).
          </p>
          <div className="grid grid-cols-2 gap-2">
            {candidates.map((p) => {
              const picked = state.ladyTargetId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => onLadyInspect(p.id)}
                  aria-pressed={picked}
                  className={`min-h-14 rounded-xl border p-3 text-left transition-all active:scale-95 ${picked
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
        </GlassPanel>

        <ActionDock>
          <button
            onClick={onLadyConfirm}
            disabled={!hasPick}
            className={`w-full rounded-2xl py-3.5 text-base font-black transition-all active:scale-95 ${hasPick
              ? 'bg-(--av-lady) text-(--av-ink) hover:brightness-110 shadow-lg shadow-black/40'
              : 'bg-slate-800 text-slate-400 cursor-not-allowed'
              }`}
          >
            <AvIcon name="eye" /> Xác nhận soi {hasPick ? target?.name : '(chọn 1 người)'}
          </button>
        </ActionDock>
      </div>
    );
  }

  // Bystander view — thấy ai đang được Lady ngắm/đã soi.
  return (
    <div className="space-y-3">
      {live}
      <GlassPanel tone="lady" className="p-5 text-center">
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
      </GlassPanel>
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
