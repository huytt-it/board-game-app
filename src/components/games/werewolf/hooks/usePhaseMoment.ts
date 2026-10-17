'use client';

import { useEffect, useState } from 'react';
import { serverNow } from '@/lib/serverClock';

/**
 * true từ lúc phase đã chạy được `at` ms (đồng hồ chung). Chỉ một timeout chờ
 * đúng mốc đó. Khác usePhaseTimeline: KHÔNG nhảy thẳng tới cuối khi giảm
 * chuyển động — dùng cho thứ phải hiện đúng một khoảng thời gian dù có
 * animation hay không (thẻ phát bắn của Thợ săn hiện tĩnh 0–4,2 s rồi mới gỡ).
 */
export function usePhaseMoment(startedAt: number, at: number): boolean {
  const [tick, setTick] = useState(0);
  const past = serverNow() - startedAt >= at;
  useEffect(() => {
    if (past) return;
    const t = setTimeout(() => setTick((n) => n + 1), Math.max(0, at - (serverNow() - startedAt)));
    return () => clearTimeout(t);
    // `tick`: chạy lại sau mỗi lần thức dậy, kể cả khi timer bắn sớm một chút.
  }, [startedAt, at, past, tick]);
  return past;
}
