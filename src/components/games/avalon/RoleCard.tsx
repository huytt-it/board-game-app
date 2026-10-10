'use client';

import { AvalonRole } from './types';
import AvIcon from './assets/AvIcon';
import GlassPanel from './ui/GlassPanel';
import RoleLetter from './ui/RoleLetter';
import { useDialog } from './hooks/useDialog';

interface RoleCardProps {
  role: AvalonRole;
  onClose: () => void;
}

// "Vai của tôi": the same sealed letter as the role reveal — press and hold to
// read, let go to cover it. The modal itself is identical for every role
// (ux-plan 2.4, GĐ4), so opening it in the middle of the table gives nothing away.
export default function RoleCard({ role, onClose }: RoleCardProps) {
  const dialog = useDialog<HTMLDivElement>(onClose);
  return (
    <div
      ref={dialog}
      role="dialog"
      aria-modal="true"
      aria-label="Vai của tôi"
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in outline-none"
    >
      <GlassPanel tone="gold" emphasis className="relative w-full max-w-sm overflow-hidden rounded-3xl px-4 pb-4 pt-3">
        <div className="flex items-center gap-2 pl-1">
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-(--av-gold)">
            <AvIcon name="eye" /> Vai của tôi
          </p>
          <button
            onClick={onClose}
            className="ml-auto flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Đóng"
          >
            <AvIcon name="close" size={20} />
          </button>
        </div>

        <div className="mt-1">
          <RoleLetter role={role} />
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full rounded-2xl border border-(--av-gold)/60 bg-(--av-gold)/20 py-3.5 text-base font-black text-(--av-parchment) transition-all hover:bg-(--av-gold)/30 active:scale-[0.98]"
        >
          ✓ Đã rõ
        </button>
      </GlassPanel>
    </div>
  );
}
