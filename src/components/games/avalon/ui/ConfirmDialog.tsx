'use client';

import { useId, useRef, type ReactNode } from 'react';
import { useDialog } from '../hooks/useDialog';
import AvIcon, { type IconName } from '../assets/AvIcon';
import AvButton from './AvButton';
import GlassPanel from './GlassPanel';

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

// The Avalon look for "are you sure?" — replaces the browser's confirm(),
// which is unstyled, blocks the page (and the shared clock's timers), and is
// dismissed on its own by some in-app browsers. Use it through useConfirm().
//
// A bottom sheet on phones, centred from `sm`: one solid panel, "Huỷ" as a
// secondary button and the answer as the danger (red edge) or the primary
// (gold) one. Focus starts on the safe button (cancel); Escape or a tap
// outside cancels; Tab stays inside.
export default function ConfirmDialog({
  options,
  onAnswer,
}: {
  options: ConfirmOptions;
  onAnswer: (ok: boolean) => void;
}) {
  const tone = options.tone ?? 'danger';
  const gold = tone === 'gold';
  const titleId = useId();
  const messageId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  // Focus starts on the safe button; Tab stays inside, Escape cancels, focus
  // goes back when it closes (a stack-aware dialog: it sits above any modal).
  const panel = useDialog<HTMLDivElement>(() => onAnswer(false), cancelRef);

  return (
    <div
      className="av-dialog fixed inset-0 z-[60] flex items-end justify-center p-3 sm:items-center"
      onClick={() => onAnswer(false)}
      data-confirm-dialog=""
    >
      <div className="av-dialog-backdrop absolute inset-0 bg-black/70" aria-hidden />
      <GlassPanel
        ref={panel}
        solid
        role="alertdialog"
        aria-modal="true"
        tabIndex={-1}
        aria-labelledby={titleId}
        aria-describedby={options.message ? messageId : undefined}
        className="av-dialog-panel relative w-full max-w-sm p-5 outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          {options.icon && (
            <AvIcon name={options.icon} size={28} className={`mt-0.5 ${gold ? 'text-(--av-gold)' : 'text-(--av-evil-light)'}`} />
          )}
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="av-display text-2xl leading-tight text-(--av-text)">
              {options.title}
            </h2>
            {options.message && (
              <p id={messageId} className="mt-1.5 text-sm leading-relaxed text-(--av-text-2)">
                {options.message}
              </p>
            )}
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <AvButton ref={cancelRef} variant="secondary" onClick={() => onAnswer(false)} data-confirm="cancel">
            {options.cancelLabel ?? 'Huỷ'}
          </AvButton>
          <AvButton variant={gold ? 'primary' : 'danger'} onClick={() => onAnswer(true)} data-confirm="ok">
            {options.confirmLabel}
          </AvButton>
        </div>
      </GlassPanel>
    </div>
  );
}
