'use client';

import { AvalonRole } from './types';
import GlassPanel from './ui/GlassPanel';
import AvButton from './ui/AvButton';
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-fade-in outline-none"
    >
      <GlassPanel solid className="relative w-full max-w-sm overflow-hidden px-4 pb-4 pt-2">
        <div className="flex items-center gap-2 pl-1">
          <h2 className="av-display text-xl text-(--av-text)">Vai của tôi</h2>
          <AvButton variant="ghost" icon="close" onClick={onClose} className="ml-auto" aria-label="Đóng" title="Đóng" />
        </div>

        <div className="mt-1">
          <RoleLetter role={role} />
        </div>

        <AvButton variant="secondary" size="lg" block onClick={onClose} className="mt-4">
          Đã rõ
        </AvButton>
      </GlassPanel>
    </div>
  );
}
