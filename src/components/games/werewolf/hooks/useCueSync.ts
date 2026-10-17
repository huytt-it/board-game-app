'use client';

import { useEffect, useState } from 'react';
import { serverNow } from '@/lib/serverClock';

/**
 * Bù độ trễ dựng cho các hoạt cảnh theo đồng hồ chung của một bước (GĐ4).
 *
 * useCue lấy mốc lúc component RENDER, nhưng CSS animation chỉ bắt đầu ở khung
 * hình vẽ đầu tiên sau đó: thường vài chục ms, vài trăm ms khi tải lại trang
 * giữa chừng (đo được ~0,3 s). Ngay sau khung đầu, hook này kéo mọi animation
 * cued vừa tạo (có animation-delay inline, không lặp vô hạn, bắt đầu sau mốc
 * render) về đúng mốc: currentTime = thời gian đã trôi từ lúc render. Nhờ vậy
 * reload / vào trễ nhảy ĐÚNG khung, và các máy khớp nhau hơn.
 *
 * Gọi MỘT lần ở cấp màn của bước (PhaseView), cùng lượt render với các useCue
 * của bước (panel, lớp phủ, cảnh nền). Hạt trang trí (lặp vô hạn) và chuyển
 * động cục bộ (không có delay inline) không bị đụng tới.
 */
export function useCueSync(startedAt: number): void {
  // Mốc render trên đồng hồ chung, lấy y như useCue.
  const [base, setBase] = useState(() => ({ startedAt, t: serverNow() }));
  if (base.startedAt !== startedAt) {
    // Điều chỉnh state trong lúc render (như useCue): bước mới, mốc mới.
    setBase({ startedAt, t: serverNow() });
  }
  useEffect(() => {
    if (typeof document.getAnimations !== 'function') return;
    const sync = () => {
      // Mốc render trên dòng thời gian của tài liệu (performance.now), rồi thời gian
      // từ mốc đó tới "giờ" của dòng thời gian — giờ của khung hình đang vẽ, có thể
      // trễ hơn performance.now() vài ms. currentTime đặt theo giờ đó thì
      // startTime của animation rơi đúng vào mốc render.
      const basePerf = performance.now() - (serverNow() - base.t);
      const tl = Number(document.timeline.currentTime ?? performance.now());
      const since = tl - basePerf;
      for (const a of document.getAnimations()) {
        const effect = a.effect as KeyframeEffect | null;
        const target = effect?.target as HTMLElement | null;
        if (!effect || !target?.style?.animationDelay || a.playState === 'paused') continue;
        if (effect.getComputedTiming().iterations === Infinity) continue;
        if (a.startTime !== null && Number(a.startTime) < basePerf - 5) continue; // có từ trước bước này
        a.currentTime = since;
      }
    };
    // Vài lượt (khung kế, khung sau nữa, 0,3 s): animation nào được tạo muộn một
    // khung cũng được kéo về; lượt lặp lại không đổi gì với animation đã khớp.
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      sync();
      raf2 = requestAnimationFrame(sync);
    });
    const late = setTimeout(sync, 300);
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(late);
    };
  }, [base]);
}
