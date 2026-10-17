'use client';

import type { CSSProperties } from 'react';
import { useCue } from '@/components/games/shared/hooks/useCue';
import { usePhaseMoment } from '../hooks/usePhaseMoment';
import WwIcon from '../assets/WwIcon';
import { HUNTER_SHOT, hunterShotOf } from '../scenes/timelines';
import { Avatar, nameOf, revealedRole, RoleTag, type PanelCtx } from './shared';

// Phát bắn của Thợ săn, diễn ở bước NGAY SAU bước Thợ săn (Thảo luận, Đêm hoặc
// Kết thúc; plan §9 "Bổ sung cho GĐ4" mục 6). Lần bấm Bắn chỉ là một CAS, không
// chờ hoạt cảnh; bước sau đọc mục 'hunter' của nhật ký (hunterShotOf) và diễn
// lại: tấm thẻ nhỏ trên đầu màn, hồng tâm khép lại trên người bị bắn, chớp,
// bia mộ, lật vai (theo luật). Thông tin công khai, giống hệt nhau với mọi vai.
// Thẻ là lớp phủ `pointer-events: none` ở trên tiêu đề, không che lưới (màn
// rộng: trên khung bên phải): ban đêm ai cũng chọn được ngay từ T = 0. Gỡ ở
// HUNTER_SHOT.doneAt; giảm chuyển động thì thẻ đứng yên (đủ chữ) tới lúc đó.
export default function HunterShot({ ctx, hidden = false }: { ctx: PanelCtx; hidden?: boolean }) {
  const over = usePhaseMoment(ctx.state.phaseStartedAt, HUNTER_SHOT.doneAt);
  const shot = hunterShotOf(ctx.state);
  if (!shot || over || hidden) return null;
  return <ShotCard key={ctx.state.phaseStartedAt} ctx={ctx} hunterId={shot.hunterId} targetId={shot.targetId} />;
}

function ShotCard({ ctx, hunterId, targetId }: { ctx: PanelCtx; hunterId: string; targetId: string | null }) {
  const cue = useCue(ctx.state.phaseStartedAt);
  const at = (ms: number) => ({ animationDelay: cue(ms) });
  const target = targetId ? ctx.players.find((p) => p.id === targetId) : undefined;
  const role = targetId ? revealedRole(ctx, targetId) : null;
  return (
    // Cùng lề và bề rộng với khung của trang phòng (px-4 sm:px-6 lg:px-8, WwShell max-w-lg / 6xl).
    <div
      className="pointer-events-none fixed inset-x-0 top-16 z-35 px-4 sm:px-6 lg:top-20 lg:px-8"
      role="status"
      data-ww-hunter-shot={targetId ?? 'none'}
    >
      <div className="mx-auto flex max-w-lg justify-center lg:max-w-6xl lg:justify-end">
        <div
          className="ww-a-toast flex w-full max-w-sm items-center gap-3 rounded-2xl border border-(--ww-line) bg-(--ww-ink) px-4 py-3 shadow-lg shadow-black/50"
          style={{ animationDelay: `${cue(0)}, ${cue(HUNTER_SHOT.outAt)}` }}
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-(--ww-raised) text-(--ww-moon)" aria-hidden="true">
            <WwIcon name="hunter" size={24} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-(--ww-text-2)">Thợ săn {nameOf(ctx.players, hunterId)}</p>
            <p className="truncate text-base font-semibold text-(--ww-text)">{targetId ? `bắn ${nameOf(ctx.players, targetId)}` : 'không bắn ai'}</p>
            {role && (
              <span className="ww-a-flip mt-1 inline-flex" style={at(HUNTER_SHOT.flipAt)}>
                <RoleTag role={role} />
              </span>
            )}
          </div>
          {target && (
            <span className="relative flex size-10 shrink-0 items-center justify-center" aria-hidden="true">
              {/* Khung cuối: bia mộ. Trước đó: avatar người sống, hồng tâm khép lại, chớp. */}
              <WwIcon name="dead" size={30} className="text-(--ww-text-3)" />
              <span className="ww-a-gone absolute inset-0" style={at(HUNTER_SHOT.fallAt)}>
                <Avatar name={target.name} id={target.id} size="md" />
              </span>
              <Reticle className="ww-a-aim absolute -inset-1.5 text-(--ww-wolf-light)" style={at(HUNTER_SHOT.aimAt)} />
              <span className="ww-a-flash absolute -inset-2 rounded-full bg-(--ww-moon)/60" style={at(HUNTER_SHOT.fireAt)} />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/** Hồng tâm (vẽ tay, trang trí): vòng tròn + bốn vạch. */
function Reticle({ className = '', style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 52 52" className={className} style={style} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
      <circle cx="26" cy="26" r="19" />
      <path d="M26 2v10M26 40v10M2 26h10M40 26h10" />
    </svg>
  );
}
