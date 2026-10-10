'use client';

import { useId, type ReactNode } from 'react';
import { useDialog } from '../hooks/useDialog';
import AvIcon, { type IconName } from '../assets/AvIcon';
import AvButton from './AvButton';
import GlassPanel from './GlassPanel';

// The lobby's modals (settings, the role guide): a labelled dialog that keeps
// the keyboard focus inside and closes on Escape or a tap outside
// (hooks/useDialog). A sheet at the bottom of a phone, centred from `md`; one
// solid ink panel with the thin edge — the content inside draws no frames of
// its own.
export default function Modal({
  open,
  onClose,
  icon,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  icon?: IconName;
  title: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <ModalBody onClose={onClose} icon={icon} title={title}>
      {children}
    </ModalBody>
  );
}

function ModalBody({
  onClose,
  icon,
  title,
  children,
}: {
  onClose: () => void;
  icon?: IconName;
  title: string;
  children: ReactNode;
}) {
  const dialog = useDialog<HTMLDivElement>(onClose);
  const titleId = useId();
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 animate-fade-in md:items-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} aria-hidden="true" />
      <GlassPanel
        ref={dialog}
        solid
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative flex max-h-[88dvh] w-full flex-col overflow-hidden outline-none md:max-w-2xl"
      >
        <div className="flex items-center gap-2 border-b border-(--av-line) py-2 pl-4 pr-2">
          <h2 id={titleId} className="av-display flex min-w-0 items-center gap-2 text-xl text-(--av-text)">
            {icon && <AvIcon name={icon} className="text-(--av-gold)" />}
            <span className="truncate">{title}</span>
          </h2>
          <AvButton variant="ghost" icon="close" onClick={onClose} className="ml-auto" aria-label="Đóng" title="Đóng" />
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </GlassPanel>
    </div>
  );
}
