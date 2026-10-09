'use client';

import { createContext, useEffect } from 'react';

// "Đến lượt bạn" (visual only — no sound, no vibration): PlayerPanel works out
// from the state whether the table is waiting for the viewer (panel/myTurn.ts)
// and tells the ActionDock through this context, which blinks a gold edge
// around itself; `useTurnTitle` puts a "● " in front of the tab's title so a
// player who looked away sees it from the tab bar.
export const MyTurnContext = createContext(false);

const MARK = '● ';

export function useTurnTitle(active: boolean) {
  useEffect(() => {
    if (!active) return;
    if (!document.title.startsWith(MARK)) document.title = MARK + document.title;
    return () => {
      if (document.title.startsWith(MARK)) document.title = document.title.slice(MARK.length);
    };
  }, [active]);
}
