'use client';

import { useEffect, useRef, useState } from 'react';
import { useDialog } from '../hooks/useDialog';
import AvButton from './AvButton';

// The "⋯" of the top bar: the rarely used room actions ("Các vai trong ván",
// "Rời phòng" / "Xoá phòng") folded out of the way. It looks the same for
// every player (only the host's item reads "Xoá phòng", which is public).
// Escape and a tap outside close it; focus stays inside while it is open and
// goes back to "⋯" afterwards (useDialog).
export default function RoomMenu({
  onShowRoles,
  onLeaveRoom,
  isHost = false,
}: {
  onShowRoles?: () => void;
  onLeaveRoom?: () => void;
  isHost?: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (!onShowRoles && !onLeaveRoom) return null;
  return (
    <div className="relative">
      <AvButton
        variant="ghost"
        icon="more"
        onClick={() => setOpen((o) => !o)}
        aria-label="Menu phòng"
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Menu phòng"
        data-room-menu-button=""
      />
      {open && (
        <MenuPanel
          onClose={() => setOpen(false)}
          onShowRoles={onShowRoles}
          onLeaveRoom={onLeaveRoom}
          isHost={isHost}
        />
      )}
    </div>
  );
}

function MenuPanel({
  onClose,
  onShowRoles,
  onLeaveRoom,
  isHost,
}: {
  onClose: () => void;
  onShowRoles?: () => void;
  onLeaveRoom?: () => void;
  isHost: boolean;
}) {
  const dialog = useDialog<HTMLDivElement>(onClose);
  const wrap = useRef<HTMLDivElement>(null);

  // A tap anywhere else closes the menu (the "⋯" toggles it itself).
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const box = wrap.current?.parentElement;
      if (box && !box.contains(e.target as Node)) onClose();
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [onClose]);

  const pick = (action?: () => void) => () => {
    onClose();
    action?.();
  };

  return (
    <div ref={wrap} className="absolute right-0 top-full z-40 mt-2">
      {/* Opaque (not glass): it opens over the table and must read at once. */}
      <div
        ref={dialog}
        role="dialog"
        aria-label="Menu phòng"
        tabIndex={-1}
        className="flex w-56 flex-col gap-1 rounded-2xl border border-(--av-line) bg-(--av-ink) p-2 shadow-lg shadow-black/50 outline-none"
        data-room-menu=""
      >
        {onShowRoles && (
          <AvButton variant="ghost" block icon="roles" onClick={pick(onShowRoles)}>
            Các vai trong ván
          </AvButton>
        )}
        {onLeaveRoom && (
          <AvButton
            variant={isHost ? 'danger' : 'ghost'}
            block
            align="start"
            icon={isHost ? 'delete' : 'leave'}
            onClick={pick(onLeaveRoom)}
            data-room-exit=""
          >
            {isHost ? 'Xoá phòng' : 'Rời phòng'}
          </AvButton>
        )}
      </div>
    </div>
  );
}
