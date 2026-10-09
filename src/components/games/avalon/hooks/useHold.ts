'use client';

import { useEffect, useState, type HTMLAttributes, type PointerEvent as ReactPointerEvent } from 'react';

// "Press and hold to see": `held` is true only while a finger, the mouse
// button or Space / Enter is down on the element that spreads `bind`. Letting
// go — or the pointer being cancelled, the element losing focus, the tab being
// hidden — covers the secret again. Used for everything only one player may
// see (the role letter, "my role", the night's information): until someone
// holds, every screen at the table looks the same (ux-plan 2.4).
//
// `resetKey`: a new value (the next phase) lets go as well.
export function useHold(resetKey?: unknown): {
  held: boolean;
  bind: HTMLAttributes<HTMLElement>;
} {
  const [state, setState] = useState({ key: resetKey, held: false });
  if (state.key !== resetKey) {
    // Adjusting state while rendering: a new phase starts covered.
    setState({ key: resetKey, held: false });
  }
  const held = state.key === resetKey && state.held;
  const set = (v: boolean) => setState((s) => (s.held === v ? s : { ...s, held: v }));

  useEffect(() => {
    if (!held) return;
    const hide = () => {
      if (document.hidden) setState((s) => ({ ...s, held: false }));
    };
    const up = () => setState((s) => ({ ...s, held: false }));
    document.addEventListener('visibilitychange', hide);
    // A release outside the element (capture failed, synthetic events).
    window.addEventListener('pointerup', up);
    window.addEventListener('blur', up);
    return () => {
      document.removeEventListener('visibilitychange', hide);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('blur', up);
    };
  }, [held]);

  const bind: HTMLAttributes<HTMLElement> = {
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      try {
        // Keep the hold when the finger slides a little off the element.
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Synthetic or already-released pointer: the window listener covers it.
      }
      set(true);
    },
    onPointerUp: () => set(false),
    onPointerCancel: () => set(false),
    onLostPointerCapture: () => set(false),
    onKeyDown: (e) => {
      if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
        e.preventDefault();
        set(true);
      }
    },
    onKeyUp: (e) => {
      if (e.key === ' ' || e.key === 'Enter') set(false);
    },
    onBlur: () => set(false),
    // A long press must not open the context menu / callout on phones.
    onContextMenu: (e) => e.preventDefault(),
  };
  return { held, bind };
}
