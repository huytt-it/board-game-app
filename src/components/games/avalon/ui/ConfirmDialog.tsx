'use client';

import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import AvIcon, { type IconName } from '../assets/AvIcon';

export interface ConfirmOptions {
  title: string;
  message?: ReactNode;
  /** Label of the button that goes ahead ("Xoá phòng", "Đâm"…). */
  confirmLabel: string;
  cancelLabel?: string;
  /** `danger`: leaving / deleting / removing someone. `evil`: the stab.
   *  `gold`: starting over. */
  tone?: 'danger' | 'evil' | 'gold';
  icon?: IconName;
}

const CONFIRM_CLS: Record<NonNullable<ConfirmOptions['tone']>, string> = {
  danger: 'bg-orange-400 text-(--av-ink) hover:bg-orange-300',
  evil: 'bg-(--av-evil) text-(--av-ink) hover:brightness-110',
  gold: 'bg-(--av-gold) text-(--av-ink) hover:brightness-110',
};
const ICON_CLS: Record<NonNullable<ConfirmOptions['tone']>, string> = {
  danger: 'text-orange-300',
  evil: 'text-(--av-evil-light)',
  gold: 'text-(--av-gold)',
};

// The Avalon look for "are you sure?" — replaces the browser's confirm(),
// which is unstyled, blocks the page (and the shared clock's timers), and is
// dismissed on its own by some in-app browsers. Use it through useConfirm().
//
// A bottom sheet on phones, centred from `sm`. Focus starts on the safe
// button (cancel); Escape or a tap outside cancels; Tab stays inside.
export default function ConfirmDialog({
  options,
  onAnswer,
}: {
  options: ConfirmOptions;
  onAnswer: (ok: boolean) => void;
}) {
  const tone = options.tone ?? 'danger';
  const titleId = useId();
  const messageId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const okRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    return () => previous?.focus?.();
  }, []);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onAnswer(false);
    } else if (e.key === 'Tab') {
      // Two buttons: Tab and Shift+Tab just go back and forth.
      e.preventDefault();
      (document.activeElement === okRef.current ? cancelRef : okRef).current?.focus();
    }
  };

  return (
    <div
      className="av-dialog fixed inset-0 z-[60] flex items-end justify-center p-3 sm:items-center"
      onClick={() => onAnswer(false)}
      data-confirm-dialog=""
    >
      <div className="av-dialog-backdrop absolute inset-0 bg-black/70" aria-hidden />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={options.message ? messageId : undefined}
        className="av-dialog-panel relative w-full max-w-sm rounded-2xl border-2 border-(--av-gold)/45 bg-(color:--av-bar-bg) p-5 shadow-2xl shadow-black/60"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="flex items-start gap-3">
          {options.icon && <AvIcon name={options.icon} size={28} className={`mt-0.5 ${ICON_CLS[tone]}`} />}
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="av-display text-2xl leading-tight text-white">
              {options.title}
            </h2>
            {options.message && (
              <p id={messageId} className="mt-1.5 text-sm leading-relaxed text-slate-300">
                {options.message}
              </p>
            )}
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={() => onAnswer(false)}
            className="rounded-xl border border-white/15 bg-white/5 py-3 text-sm font-black text-slate-200 hover:bg-white/10 active:scale-[0.98]"
            data-confirm="cancel"
          >
            {options.cancelLabel ?? 'Huỷ'}
          </button>
          <button
            ref={okRef}
            type="button"
            onClick={() => onAnswer(true)}
            className={`rounded-xl py-3 text-sm font-black shadow-lg shadow-black/40 active:scale-[0.98] ${CONFIRM_CLS[tone]}`}
            data-confirm="ok"
          >
            {options.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
