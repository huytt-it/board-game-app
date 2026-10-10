'use client';

import { useContext, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { MyTurnContext } from './MyTurn';

// The phase's main action (submit the team, Approve / Reject, place the card,
// confirm the Lady's look or the stab, "I'm ready"), always under the thumb.
//
// < lg : pinned to the bottom of the screen above the safe area. A spacer of
//        the same height stays at the dock's place in the flow, so the end of
//        the content can still be scrolled clear of it.
// lg+  : an ordinary block where it is rendered — the right-hand column.
//        (Relative, so a note can be anchored above the buttons on both.)
//
// One DOM for both (the buttons exist once). Padding is an arbitrary value, not
// globals.css's `pb-safe`: that class is unlayered and would beat `lg:pb-0`.
//
// When the table is waiting for the viewer (MyTurnContext) a gold edge blinks
// around the dock — `opacity` of an overlay only, the buttons keep full contrast.
export default function ActionDock({ children, className = '' }: { children: ReactNode; className?: string }) {
  const dock = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  const myTurn = useContext(MyTurnContext);

  useLayoutEffect(() => {
    const el = dock.current;
    if (!el) return;
    const measure = () => {
      // Only pinned below lg; there it is `position: fixed`.
      const pinned = getComputedStyle(el).position === 'fixed';
      setHeight(pinned ? Math.ceil(el.getBoundingClientRect().height) : 0);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <>
      {/* `order-last`: in a flex column the spacer goes to the end even when
          the dock sits higher up for the desktop layout. */}
      <div aria-hidden className="order-last lg:hidden" style={{ height }} />
      <div
        ref={dock}
        data-action-dock=""
        data-my-turn={myTurn ? '' : undefined}
        className={`${myTurn ? 'av-dock-turn ' : ''}fixed inset-x-0 bottom-0 z-30 border-t border-(--av-line) bg-(color:--av-bar-bg) px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-12px_30px_-12px_rgba(0,0,0,0.8)] lg:relative lg:z-auto lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none ${className}`}
      >
        <div className="mx-auto w-full max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-none">{children}</div>
      </div>
    </>
  );
}
