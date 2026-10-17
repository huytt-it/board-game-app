'use client';

import { useCue } from '@/components/games/shared/hooks/useCue';
import { useReducedMotion } from '@/components/games/shared/hooks/useReducedMotion';
import { usePhaseMoment } from '../hooks/usePhaseMoment';
import WwIcon from '../assets/WwIcon';
import { NIGHTFALL } from '../scenes/timelines';
import type { WerewolfGameState } from '../types';

// Vào đêm (plan §9, GĐ4): 0–1,2 s màn sẫm lại, "Đêm N" hiện giữa màn rồi tan.
// Là lớp TRANG TRÍ phủ cả màn với `pointer-events: none`: lưới và nút của Đêm ①
// bấm xuyên qua được ngay từ T = 0 (không chặn bước có giờ). Giống hệt nhau với
// mọi người xem, người sống lẫn người chết, không phụ thuộc vai (plan §2.3). Từ
// đêm 2, trăng còn lên sau đồi trong cảnh nền (SceneBackdrop). Giảm chuyển
// động: không có lớp này (tiêu đề "Đêm N" đã đủ chữ).
export default function Nightfall({ state }: { state: Pick<WerewolfGameState, 'phaseStartedAt' | 'round'> }) {
  const reduced = useReducedMotion();
  const over = usePhaseMoment(state.phaseStartedAt, NIGHTFALL.veilMs);
  if (reduced || over) return null;
  return <Veil key={state.phaseStartedAt} startedAt={state.phaseStartedAt} round={state.round} />;
}

function Veil({ startedAt, round }: { startedAt: number; round: number }) {
  const cue = useCue(startedAt);
  return (
    <div
      aria-hidden="true"
      className="ww-a-nightfall pointer-events-none fixed inset-0 z-30 flex flex-col items-center justify-center gap-2 px-4 text-center"
      style={{ animationDelay: cue(0) }}
      data-ww-nightfall=""
    >
      <WwIcon name="night" size={44} className="text-(--ww-moon)" />
      <p className="ww-display text-4xl leading-tight text-(--ww-text)">Đêm {round}</p>
      <p className="text-sm text-(--ww-text-2)">Cả làng đi ngủ…</p>
    </div>
  );
}
