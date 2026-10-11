'use client';

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useDialog } from '@/components/games/shared/hooks/useDialog';
import Button from './Button';

// Hộp thoại của Ma Sói (bản riêng, không dùng ConfirmDialog/Modal của Avalon):
// giữ tiêu điểm bên trong, Esc hoặc chạm ra ngoài để đóng (useDialog). Ở điện
// thoại là tấm dưới đáy màn, từ `sm` thì ở giữa.
export function Modal({
  title,
  onClose,
  children,
  role = 'dialog',
  initialFocus,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  role?: 'dialog' | 'alertdialog';
  initialFocus?: React.RefObject<HTMLElement | null> | 'panel';
}) {
  const ref = useDialog<HTMLDivElement>(onClose, initialFocus);
  const titleId = useId();
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        ref={ref}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-slate-900 p-5 text-slate-100 shadow-2xl ring-1 ring-slate-700 outline-none sm:rounded-2xl pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        <h2 id={titleId} className="mb-3 text-lg font-bold">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel: string;
  danger?: boolean;
}

function ConfirmDialog({ options, onAnswer }: { options: ConfirmOptions; onAnswer: (ok: boolean) => void }) {
  // Tiêu điểm vào nút an toàn (Huỷ).
  const cancelRef = useRef<HTMLButtonElement>(null);
  return (
    <Modal title={options.title} onClose={() => onAnswer(false)} role="alertdialog" initialFocus={cancelRef}>
      {options.message && <p className="mb-4 text-sm text-slate-300">{options.message}</p>}
      <div className="flex gap-2">
        <Button ref={cancelRef} block onClick={() => onAnswer(false)}>
          Huỷ
        </Button>
        <Button block variant={options.danger ? 'danger' : 'primary'} data-confirm="ok" onClick={() => onAnswer(true)}>
          {options.confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

// Thay cho window.confirm(): `if (await ask({ … })) …`, và render {dialog}.
// Hỏi câu mới thì câu đang mở coi như "không".
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
