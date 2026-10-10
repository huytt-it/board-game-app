'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import ConfirmDialog, { type ConfirmOptions } from '../ui/ConfirmDialog';

// A promise-based stand-in for window.confirm():
//
//   const { ask, dialog } = useConfirm();
//   if (await ask({ title: 'Xoá phòng?', confirmLabel: 'Xoá phòng' })) …
//   …and render {dialog} somewhere inside the .avalon-root.
//
// Only one question at a time: asking again answers the open one "no". A
// question still open when the caller unmounts is answered "no" too.
export function useConfirm(): { ask: (options: ConfirmOptions) => Promise<boolean>; dialog: ReactNode } {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const pending = useRef<((ok: boolean) => void) | null>(null);

  const ask = useCallback(
    (next: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        pending.current?.(false);
        pending.current = resolve;
        setOptions(next);
      }),
    []
  );

  const answer = useCallback((ok: boolean) => {
    const resolve = pending.current;
    pending.current = null;
    setOptions(null);
    resolve?.(ok);
  }, []);

  useEffect(() => {
    const open = pending;
    return () => open.current?.(false);
  }, []);

  return { ask, dialog: options ? <ConfirmDialog options={options} onAnswer={answer} /> : null };
}
