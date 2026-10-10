'use client';

import { useEffect, useRef, type RefObject } from 'react';

// Keyboard and focus behaviour of a modal: focus moves inside when it opens,
// Tab and Shift+Tab stay inside, Escape closes it, and focus goes back to
// what had it when it closes. Put the returned ref on the dialog's panel and
// give that panel `role="dialog"` (or `alertdialog`), `aria-modal="true"` and a
// label — the panel is focusable itself (tabIndex -1) so a dialog without a
// control still takes the focus.
//
// Dialogs can stack (a confirmation over a settings modal): only the topmost
// one handles the keys.
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const stack: symbol[] = [];

export function useDialog<T extends HTMLElement>(
  onClose: () => void,
  initialFocus?: RefObject<HTMLElement | null>
): RefObject<T | null> {
  const ref = useRef<T>(null);
  // The latest onClose without re-running the effect (and refocusing) on every render.
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    const panel = ref.current;
    if (!panel) return;
    const id = Symbol('dialog');
    stack.push(id);
    const previous = document.activeElement as HTMLElement | null;

    const focusables = () =>
      Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.getClientRects().length > 0);
    (initialFocus?.current ?? focusables()[0] ?? panel).focus();

    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== id) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        close.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const list = focusables();
      if (list.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = list[0];
      const last = list[list.length - 1];
      const active = document.activeElement;
      if (!panel.contains(active)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (e.shiftKey && (active === first || active === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      const at = stack.indexOf(id);
      if (at >= 0) stack.splice(at, 1);
      previous?.focus?.();
    };
    // `initialFocus` is a ref object: stable.
  }, [initialFocus]);

  return ref;
}
