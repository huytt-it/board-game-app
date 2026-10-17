'use client';

import { DEATH_CAUSE_TEXT } from '@/components/games/werewolf/engine/log.ts';
import { TEAM_NAME } from '@/components/games/werewolf/engine/roles.ts';
import { WIN_REASON_TEXT } from '@/components/games/werewolf/engine/win.ts';
import { dataOf } from '../state';
import WwIcon from '../assets/WwIcon';
import Button from '../ui/Button';
import Chip from '../ui/Chip';
import type { WwDeath } from '../types';
import { Dock, LogList, PhaseLayout, RoleLine, Seat, type PanelCtx } from './shared';

// Kết thúc (rules §5.10): phe thắng và lý do, lật vai của mọi người, "Diễn
// biến ván" (thu gọn, mở ra mới đọc; GĐ4 kể lại theo từng đêm), chủ phòng chơi
// lại. Mọi thứ ở màn này là công khai.
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
  const wolves = winner === 'wolves';
  // Rời làng lúc đêm (kể cả lúc xem vai) thì ghi "Đêm N", như nhật ký.
  const partOf = (d: WwDeath) => {
    if (d.cause === 'wolf' || d.cause === 'poison') return 'Đêm';
    const left = d.cause === 'left' ? state.log.find((e) => e.kind === 'left' && e.id === d.id) : null;
    return left && left.kind === 'left' && ['deal', 'night', 'night-witch'].includes(left.during) ? 'Đêm' : 'Ngày';
  };
  return (
    <PhaseLayout
      section="end"
      header={
        <header className="mb-4" data-ww-winner={winner ?? 'none'}>
          <p className="flex items-center gap-2 text-sm text-(--ww-text-2)">
            <WwIcon name={wolves ? 'werewolf' : 'team-village'} size={20} className={wolves ? 'text-(--ww-wolf-light)' : 'text-(--ww-village-light)'} />
            Kết thúc
          </p>
          <h2 className={`ww-display mt-1 text-3xl leading-tight ${wolves ? 'text-(--ww-wolf-light)' : 'text-(--ww-village-light)'}`}>
            {winner ? `${TEAM_NAME[winner]} thắng` : 'Ván đã dừng'}
          </h2>
          {state.endReason && <p className="mt-1.5 text-sm text-(--ww-text-2)">{WIN_REASON_TEXT[state.endReason]}</p>}
          {winner && myTeam && (
            <Chip tone={myTeam === winner ? 'accent' : 'neutral'} className="mt-2">
              {myTeam === winner ? 'Phe bạn thắng!' : 'Phe bạn thua.'}
            </Chip>
          )}
        </header>
      }
      stage={
        <ul className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 lg:grid-cols-3 lg:gap-3" aria-label="Vai của mọi người">
          {players.map((p) => {
            const role = dataOf(p).role;
            const death = state.deaths.find((d) => d.id === p.id);
            return (
              <li key={p.id} data-player-id={p.id}>
                <Seat
                  player={p}
                  dead={!!death}
                  sub={
                    <>
                      {role && <RoleLine role={role} />}
                      <span className="block truncate text-xs font-normal text-(--ww-text-3)">
                        {death ? `${partOf(death)} ${death.round}: ${DEATH_CAUSE_TEXT[death.cause]}` : 'Sống sót'}
                      </span>
                    </>
                  }
                />
              </li>
            );
          })}
        </ul>
      }
    >
      <details className="group mt-4 rounded-2xl border border-(--ww-line) bg-(color:--ww-glass-bg) lg:mt-0 lg:border-0 lg:bg-transparent">
        <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 rounded-2xl px-4 text-sm font-semibold text-(--ww-text) select-none lg:px-0 [&::-webkit-details-marker]:hidden">
          <WwIcon name="rules" size={18} className="text-(--ww-text-3)" />
          <span className="flex-1">Diễn biến ván</span>
          <span className="text-xs font-normal text-(--ww-text-3) group-open:hidden">Mở</span>
          <span className="hidden text-xs font-normal text-(--ww-text-3) group-open:inline">Thu gọn</span>
        </summary>
        <div className="px-4 pb-4 lg:max-h-[50dvh] lg:overflow-y-auto lg:px-0">
          <LogList log={state.log ?? []} players={players} />
        </div>
      </details>

      <Dock>
        {ctx.isHost ? (
          <div className="flex gap-2">
            <Button block size="lg" variant="primary" onClick={onPlayAgain}>
              Chơi lại
            </Button>
            <Button block size="lg" variant="danger" onClick={onLeave}>
              Xoá phòng
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <p className="flex flex-1 items-center gap-1.5 text-sm text-(--ww-text-2)">
              <WwIcon name="waiting" size={16} />
              Chờ chủ phòng chơi lại…
            </p>
            <Button icon="leave" onClick={onLeave}>
              Thoát
            </Button>
          </div>
        )}
      </Dock>
    </PhaseLayout>
  );
}
