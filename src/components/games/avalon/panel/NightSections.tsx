'use client';

import { useState, type HTMLAttributes } from 'react';
import type { Player } from '@/types/player';
import { AvalonRole, PHASE_TIMEOUTS_MS, type AvalonGameData, type AvalonGameState } from '../types';
import { ROLE_NAMES_VI } from '../constants';
import { formatClock, usePhaseClock } from '../hooks/usePhaseClock';
import AvIcon, { type IconName } from '../assets/AvIcon';
import ActionDock from '../ui/ActionDock';
import GlassPanel from '../ui/GlassPanel';
import PlayerAvatar from '../ui/PlayerAvatar';

// The night (ux-plan GĐ4). Everyone gets the SAME screen: the table under a
// "eyes closed" veil with the public call ("Phe Quỷ mở mắt…", RoundTable's
// NightVeil), the countdown, and a dock with one sealed card and one button.
// Only while a player presses and holds the card does THAT device show what
// the call lets them see — and light the seats concerned on the table. A
// player who is not called holds it too and reads "not you this time", so
// from across the table holding gives nothing away. No vibration, ever.

export type NightPhase = 'night-evils' | 'night-merlin' | 'night-percival';

const data = (p: Player) => p.gameData as Partial<AvalonGameData>;

// Who is called this turn (they must confirm before the turn may end early).
function getActiveNightPlayerIds(phase: NightPhase, players: Player[]): string[] {
  if (phase === 'night-evils') return players.filter((p) => data(p).team === 'evil').map((p) => p.id);
  const role = phase === 'night-merlin' ? AvalonRole.Merlin : AvalonRole.Percival;
  return players.filter((p) => data(p).role === role).map((p) => p.id);
}

/** What the viewer sees when they hold the card: are they called this turn,
 *  and which players are shown to them (the seats that light up). */
export function nightSight(phase: NightPhase, me: Player, players: Player[]): { active: boolean; seen: Player[] } {
  const mine = data(me);
  if (phase === 'night-evils') {
    if (mine.team !== 'evil') return { active: false, seen: [] };
    // Oberon sees nobody, and nobody sees Oberon.
    if (mine.role === AvalonRole.Oberon) return { active: true, seen: [] };
    return {
      active: true,
      seen: players.filter((p) => p.id !== me.id && data(p).team === 'evil' && data(p).role !== AvalonRole.Oberon),
    };
  }
  if (phase === 'night-merlin') {
    if (mine.role !== AvalonRole.Merlin) return { active: false, seen: [] };
    return { active: true, seen: players.filter((p) => data(p).team === 'evil' && data(p).role !== AvalonRole.Mordred) };
  }
  if (mine.role !== AvalonRole.Percival) return { active: false, seen: [] };
  return {
    active: true,
    seen: players.filter((p) => data(p).role === AvalonRole.Merlin || data(p).role === AvalonRole.Morgana),
  };
}

/** The public call of each night turn — the same words on every screen. */
export const NIGHT_CALL: Record<NightPhase, { icon: IconName; who: string; line: string }> = {
  'night-evils': { icon: 'team-evil', who: 'Phe Quỷ', line: 'Tay sai của Mordred mở mắt nhận mặt nhau.' },
  'night-merlin': { icon: 'merlin', who: 'Merlin', line: 'Merlin nhìn ra Phe Quỷ — trừ Mordred.' },
  'night-percival': { icon: 'percival', who: 'Percival', line: 'Percival thấy Merlin và Morgana — không rõ ai là ai.' },
};

function NightCountdown({ state, phase, allActiveAcked }: { state: AvalonGameState; phase: NightPhase; allActiveAcked: boolean }) {
  const { remaining } = usePhaseClock(state, PHASE_TIMEOUTS_MS[phase]);
  const low = remaining < 15000;
  return (
    <GlassPanel tone={allActiveAcked ? 'success' : low ? 'warning' : 'neutral'} className="p-4 text-center">
      <p className="mb-1 text-[11px] font-bold uppercase text-slate-400">
        {allActiveAcked ? 'Đang chuyển bước...' : 'Tự động qua bước sau'}
      </p>
      <p className={`text-2xl font-black tabular-nums ${allActiveAcked ? 'text-emerald-300' : low ? 'text-amber-300' : 'text-white'}`}>
        {allActiveAcked ? <AvIcon name="check" title="Đã xong" /> : formatClock(remaining)}
      </p>
    </GlassPanel>
  );
}

function SeenChip({ player, mark }: { player: Player; mark: 'evil' | 'unknown' }) {
  return (
    <span
      className={`inline-flex max-w-[9rem] items-center gap-1.5 rounded-full border bg-black/35 py-0.5 pl-0.5 pr-2 text-xs font-bold text-white ${
        mark === 'evil' ? 'border-(--av-evil)/55' : 'border-indigo-400/55'
      }`}
    >
      <PlayerAvatar player={player} size="xs" />
      <span className="truncate">{player.name}</span>
      {mark === 'unknown' && <AvIcon name="unknown" className="shrink-0 text-indigo-300" title="Merlin hay Morgana?" />}
    </span>
  );
}

// The sealed card in the dock, and what it shows while held. One fixed size
// for every case, sealed or open, called or not.
function NightCard({
  phase,
  me,
  sight,
  held,
  bind,
}: {
  phase: NightPhase;
  me: Player;
  sight: { active: boolean; seen: Player[] };
  held: boolean;
  bind: HTMLAttributes<HTMLElement>;
}) {
  const role = data(me).role;
  let body: React.ReactNode;
  if (!held) {
    body = (
      <>
        <AvIcon name="eye" size={30} className="text-(--av-gold)" />
        <span className="mt-1 block text-sm font-black text-(--av-parchment)">Nhấn giữ để xem</span>
        <span className="mt-0.5 block text-[11px] leading-snug text-slate-300">
          Ai không được gọi cũng nhấn giữ — màn hình của mọi người như nhau.
        </span>
      </>
    );
  } else if (!sight.active) {
    body = (
      <>
        <AvIcon name="night" size={26} className="text-slate-200" />
        <span className="mt-1 block text-sm font-black text-white">Lượt này không gọi bạn</span>
        <span className="mt-0.5 block text-[11px] leading-snug text-slate-300">
          {role ? <>Bạn là {ROLE_NAMES_VI[role]}. </> : null}Cứ nhắm mắt, chờ lượt sau.
        </span>
      </>
    );
  } else if (phase === 'night-evils' && role === AvalonRole.Oberon) {
    body = (
      <>
        <AvIcon name="oberon" size={26} className="text-(--av-evil-light)" />
        <span className="mt-1 block text-sm font-black text-white">Bạn là Oberon — đơn độc</span>
        <span className="mt-0.5 block text-[11px] leading-snug text-slate-300">
          Không đồng đội nào hiện ra với bạn, và họ cũng không thấy bạn.
        </span>
      </>
    );
  } else {
    const title =
      phase === 'night-evils' ? 'Đồng đội Phe Quỷ của bạn' : phase === 'night-merlin' ? 'Phe Quỷ lộ diện trước bạn' : 'Merlin & Morgana hiện ra';
    const note =
      phase === 'night-evils'
        ? 'Oberon (nếu có) không hiện ra.'
        : phase === 'night-merlin'
          ? 'Mordred ẩn — không hiện ở đây.'
          : 'Một người là Merlin, người kia là Morgana.';
    body = (
      <>
        <span className="block text-sm font-black text-white">{title}</span>
        <span className="mt-1.5 flex flex-wrap justify-center gap-1.5">
          {sight.seen.length === 0 ? (
            <span className="text-xs text-slate-300">Không ai hiện ra với bạn.</span>
          ) : (
            sight.seen.map((p) => <SeenChip key={p.id} player={p} mark={phase === 'night-percival' ? 'unknown' : 'evil'} />)
          )}
        </span>
        <span className="mt-1.5 block text-[11px] leading-snug text-slate-300">{note}</span>
      </>
    );
  }

  return (
    <button
      type="button"
      {...bind}
      data-night-card={held ? 'open' : 'sealed'}
      className="av-hold flex h-32 w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-(--av-gold)/45 bg-(color:--av-glass-bg) px-3 text-center shadow-lg shadow-black/30 outline-none focus-visible:ring-2 focus-visible:ring-(--av-gold)"
    >
      {body}
    </button>
  );
}

export function NightSection({
  state,
  phase,
  myPlayer,
  gamePlayers,
  held,
  holdBind,
  onAckRole,
}: {
  state: AvalonGameState;
  phase: NightPhase;
  myPlayer: Player;
  gamePlayers: Player[];
  held: boolean;
  holdBind: HTMLAttributes<HTMLElement>;
  onAckRole: () => void;
}) {
  const sight = nightSight(phase, myPlayer, gamePlayers);
  const activeIds = getActiveNightPlayerIds(phase, gamePlayers);
  const ackedIds = Object.keys(state.roleAcks ?? {});
  const allActiveAcked = activeIds.length > 0 && activeIds.every((id) => ackedIds.includes(id));
  // A player who is called confirms on the table (the turn ends once all of
  // them have). Anyone else gets the same button, which only changes their own
  // screen — so a neighbour cannot tell who had something to confirm.
  const [localDone, setLocalDone] = useState(false);
  const done = sight.active ? ackedIds.includes(myPlayer.id) : localDone;
  const onContinue = () => {
    if (sight.active) onAckRole();
    else setLocalDone(true);
  };

  return (
    <div className="flex flex-col gap-3">
      <NightCountdown state={state} phase={phase} allActiveAcked={allActiveAcked} />
      <ActionDock>
        <div className="flex flex-col gap-2">
          <NightCard phase={phase} me={myPlayer} sight={sight} held={held} bind={holdBind} />
          <button
            onClick={onContinue}
            disabled={done}
            className="w-full rounded-2xl border border-(--av-gold)/60 bg-(--av-gold)/20 py-3 text-base font-black text-(--av-parchment) transition-all hover:bg-(--av-gold)/30 active:scale-[0.98] disabled:border-white/10 disabled:bg-(color:--av-glass-bg) disabled:text-slate-300"
          >
            {done ? '✓ Xong — chờ lượt sau' : '✓ Đã xem — Tiếp tục'}
          </button>
        </div>
      </ActionDock>
    </div>
  );
}
