'use client';

import { useState, type CSSProperties } from 'react';
import { useCue } from '@/components/games/shared/hooks/useCue';
import { usePhaseTimeline } from '@/components/games/shared/hooks/usePhaseTimeline';
import { DEATH_CAUSE_TEXT } from '@/components/games/werewolf/engine/log.ts';
import { TEAM_NAME } from '@/components/games/werewolf/engine/roles.ts';
import { WIN_REASON_TEXT } from '@/components/games/werewolf/engine/win.ts';
import { dataOf } from '../state';
import WwIcon from '../assets/WwIcon';
import Button from '../ui/Button';
import Chip from '../ui/Chip';
import type { WwDeath } from '../types';
import { END, HUNTER_SHOT, endTimeline, hunterShotOf } from '../scenes/timelines';
import EndStory from './EndStory';
import HunterShot from './HunterShot';
import { Dock, PhaseLayout, RoleLine, Seat, type PanelCtx } from './shared';

// Kết thúc (rules §5.10): phe thắng và lý do, lật vai của mọi người, "Diễn
// biến ván" kể theo từng đêm / ngày, chủ phòng chơi lại. Mọi thứ ở màn này là
// công khai.
//
// Hoạt cảnh (GĐ4, scenes/timelines.ts END), theo đồng hồ chung từ mốc R: R = 0,
// hoặc R = HUNTER_SHOT.doneAt nếu chính phát bắn của Thợ săn kết thúc ván (phát
// bắn diễn trước). R: phe thắng hiện ra; vai lật từng ghế theo thứ tự ghế; rồi
// "Diễn biến ván". Chạm vào màn (hoặc "Bỏ qua") thì nhảy tới khung cuối — chỉ
// trên máy mình. Nút ở thanh đáy bấm được suốt hoạt cảnh.
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
  const shot = hunterShotOf(state);
  const revealAt = shot ? HUNTER_SHOT.doneAt : 0;
  const { stage } = usePhaseTimeline(state.phaseStartedAt, endTimeline(revealAt));
  const cue = useCue(state.phaseStartedAt);
  // Bỏ qua hoạt cảnh: chỉ trên máy này, chỉ cho ván này.
  const [skippedAt, setSkippedAt] = useState<number | null>(null);
  const still = skippedAt === state.phaseStartedAt;
  const done = still || stage === 'done';
  const skip = () => {
    if (!done) setSkippedAt(state.phaseStartedAt);
  };
  // Lớp hoạt cảnh + mốc (tính từ R); đã bỏ qua thì không có hoạt cảnh nào.
  const anim = (cls: string, ms: number): { className: string; style?: CSSProperties } =>
    still ? { className: '' } : { className: cls, style: { animationDelay: cue(revealAt + ms) } };

  // Rời làng lúc đêm (kể cả lúc xem vai) thì ghi "Đêm N", như nhật ký.
  const partOf = (d: WwDeath) => {
    if (d.cause === 'wolf' || d.cause === 'poison') return 'Đêm';
    const left = d.cause === 'left' ? state.log.find((e) => e.kind === 'left' && e.id === d.id) : null;
    return left && left.kind === 'left' && ['deal', 'night', 'night-witch'].includes(left.during) ? 'Đêm' : 'Ngày';
  };
  const banner = anim('ww-a-banner', 0);
  const reason = anim('ww-a-fade', 300);
  const chip = anim('ww-a-pop', END.chipAt);
  const story = anim('ww-a-pop', END.storyAt);
  return (
    // Chạm bất cứ đâu trên màn để bỏ qua (không chặn nút: nút vẫn nhận lần chạm đó).
    <div onPointerDownCapture={skip} data-ww-end-skipped={still ? '' : undefined}>
      <HunterShot ctx={ctx} hidden={still} />
      <PhaseLayout
        section="end"
        data-ww-anim-stage={still ? 'done' : stage}
        header={
          <header className="relative mb-4" data-ww-winner={winner ?? 'none'}>
            <p className="flex items-center gap-2 text-sm text-(--ww-text-2)">
              <WwIcon name={wolves ? 'werewolf' : 'team-village'} size={20} className={wolves ? 'text-(--ww-wolf-light)' : 'text-(--ww-village-light)'} />
              Kết thúc
            </p>
            <h2
              className={`ww-display mt-1 origin-left text-3xl leading-tight ${wolves ? 'text-(--ww-wolf-light)' : 'text-(--ww-village-light)'} ${banner.className}`}
              style={banner.style}
            >
              {winner ? `${TEAM_NAME[winner]} thắng` : 'Ván đã dừng'}
            </h2>
            {state.endReason && (
              <p className={`mt-1.5 text-sm text-(--ww-text-2) ${reason.className}`} style={reason.style}>
                {WIN_REASON_TEXT[state.endReason]}
              </p>
            )}
            {winner && myTeam && (
              <Chip tone={myTeam === winner ? 'accent' : 'neutral'} className={`mt-2 ${chip.className}`} style={chip.style}>
                {myTeam === winner ? 'Phe bạn thắng!' : 'Phe bạn thua.'}
              </Chip>
            )}
            {!done && (
              <Button variant="ghost" className="absolute -top-2 right-0" onClick={skip} data-ww-skip="">
                Bỏ qua
              </Button>
            )}
          </header>
        }
        stage={
          <ul className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 lg:grid-cols-3 lg:gap-3" aria-label="Vai của mọi người">
            {players.map((p, i) => {
              const role = dataOf(p).role;
              const death = state.deaths.find((d) => d.id === p.id);
              const flip = anim('ww-a-flip', END.flipAt + i * END.flipGapMs);
              return (
                <li key={p.id} data-player-id={p.id}>
                  <Seat
                    player={p}
                    dead={!!death}
                    // Người bị phát bắn kết thúc ván: thành bia mộ cùng lúc với thẻ phát bắn.
                    fall={!still && shot?.targetId === p.id ? cue(HUNTER_SHOT.fallAt) : undefined}
                    sub={
                      // Lật vai từng ghế theo thứ tự ghế.
                      <span className={`block ${flip.className}`} style={flip.style}>
                        {role && <RoleLine role={role} />}
                        <span className="block truncate text-xs font-normal text-(--ww-text-3)">
                          {death ? `${partOf(death)} ${death.round}: ${DEATH_CAUSE_TEXT[death.cause]}` : 'Sống sót'}
                        </span>
                      </span>
                    }
                  />
                </li>
              );
            })}
          </ul>
        }
      >
        <div className={`mt-4 lg:mt-0 ${story.className}`} style={story.style}>
          <EndStory log={state.log ?? []} players={players} />
        </div>

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
    </div>
  );
}
