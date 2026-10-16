'use client';

import { DEATH_CAUSE_TEXT } from '@/components/games/werewolf/engine/log.ts';
import { TEAM_NAME } from '@/components/games/werewolf/engine/roles.ts';
import { WIN_REASON_TEXT } from '@/components/games/werewolf/engine/win.ts';
import { dataOf } from '../state';
import Button from '../ui/Button';
import type { WwDeath } from '../types';
import { Avatar, Dock, LogList, RoleTag, type PanelCtx } from './shared';

// Kết thúc (rules §5.10): phe thắng và lý do, lật vai của mọi người, "Diễn
// biến ván" dạng danh sách (GĐ4 kể lại theo từng đêm), chủ phòng chơi lại.
export default function EndPanel({
  ctx,
  onPlayAgain,
  onLeave,
}: {
  ctx: PanelCtx;
  onPlayAgain: () => void;
  onLeave: () => void;
}) {
  const { state, players } = ctx;
  const winner = state.winner;
  const myTeam = ctx.myData.team;
  // Rời làng lúc đêm (kể cả lúc xem vai) thì ghi "Đêm N", như nhật ký.
  const partOf = (d: WwDeath) => {
    if (d.cause === 'wolf' || d.cause === 'poison') return 'Đêm';
    const left = d.cause === 'left' ? state.log.find((e) => e.kind === 'left' && e.id === d.id) : null;
    return left && left.kind === 'left' && ['deal', 'night', 'night-witch'].includes(left.during) ? 'Đêm' : 'Ngày';
  };
  return (
    <section data-phase-section="end">
      <header className="mb-4 rounded-2xl bg-slate-800/70 px-4 py-5 text-center" data-ww-winner={winner ?? 'none'}>
        <p className="text-sm text-slate-300">Kết thúc</p>
        <p className={`mt-1 text-2xl font-bold ${winner === 'wolves' ? 'text-rose-300' : 'text-emerald-300'}`}>
          {winner ? `${TEAM_NAME[winner]} thắng` : 'Ván đã dừng'}
        </p>
        {state.endReason && <p className="mt-1 text-sm text-slate-300">{WIN_REASON_TEXT[state.endReason]}</p>}
        {winner && myTeam && <p className="mt-2 text-sm font-semibold text-slate-100">{myTeam === winner ? 'Phe bạn thắng!' : 'Phe bạn thua.'}</p>}
      </header>

      <h3 className="mb-2 text-sm font-semibold text-slate-300">Vai của mọi người</h3>
      <ul className="mb-5 space-y-1.5">
        {players.map((p) => {
          const role = dataOf(p).role;
          const death = state.deaths.find((d) => d.id === p.id);
          return (
            <li key={p.id} className="flex items-center gap-2 rounded-xl bg-slate-800/70 px-3 py-2 text-sm" data-player-id={p.id}>
              <Avatar name={p.name} dim={!!death} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-slate-100">{p.name}</span>
                <span className="block text-xs text-slate-400">
                  {death ? `${partOf(death)} ${death.round}: ${DEATH_CAUSE_TEXT[death.cause]}` : 'Sống sót'}
                </span>
              </span>
              {role && <RoleTag role={role} />}
            </li>
          );
        })}
      </ul>

      <h3 className="mb-2 text-sm font-semibold text-slate-300">Diễn biến ván</h3>
      <LogList log={state.log ?? []} players={players} />

      <Dock>
        {ctx.isHost ? (
          <div className="flex gap-2">
            <Button block variant="primary" onClick={onPlayAgain}>
              Chơi lại
            </Button>
            <Button block variant="danger" onClick={onLeave}>
              Xoá phòng
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <p className="flex-1 text-sm text-slate-400">Chờ chủ phòng chơi lại…</p>
            <Button onClick={onLeave}>Thoát</Button>
          </div>
        )}
      </Dock>
    </section>
  );
}
