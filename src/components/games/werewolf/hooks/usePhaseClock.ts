'use client';

import { useEffect, useState } from 'react';
import { serverNow } from '@/lib/serverClock';
import { phaseTimeoutMs, type WerewolfGameState } from '../types';

// Thời gian còn lại của phase trên đồng hồ chung (serverNow), không phải đồng
// hồ của máy. Nhảy mỗi giây, ngay sau mỗi giây tròn của phase, nên mọi máy lật
// số cùng lúc. Thời lượng là số ván này đã chốt lúc bắt đầu (phaseTimeoutMs).
export function usePhaseRemaining(state: Pick<WerewolfGameState, 'phase' | 'phaseStartedAt' | 'timeouts'>): number {
  const startedAt = state.phaseStartedAt ?? 0;
  const [clock, setClock] = useState(() => ({ startedAt, now: serverNow() }));
  if (clock.startedAt !== startedAt) {
    // Phase mới: đọc lại giờ ngay, không chờ nhịp sau.
    setClock({ startedAt, now: serverNow() });
  }
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const arm = () => {
      const into = (((serverNow() - startedAt) % 1000) + 1000) % 1000;
      t = setTimeout(() => {
        setClock({ startedAt, now: serverNow() });
        arm();
      }, 1000 - into + 20);
    };
    arm();
    return () => clearTimeout(t);
  }, [startedAt]);
  return Math.max(0, phaseTimeoutMs(state) - (clock.now - startedAt));
}

/** `m:ss`, làm tròn LÊN theo giây: chỉ hiện 0:00 khi đã hết giờ. */
export function formatCountdown(ms: number): string {
  const total = Math.ceil(Math.max(0, ms) / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
