'use client';

import { useEffect, useRef } from 'react';
import { ROLE_ICONS, ROLE_NIGHT_INSTRUCTIONS, type ClocktowerRole } from '@/types/games/clocktower';
import PlayerWaiting from '../PlayerWaiting';

interface InfoOnlyActionProps {
  role: ClocktowerRole;
  hasSubmitted: boolean;
  onSubmit: () => void;
}

/**
 * For roles that receive information from the Storyteller without picking a target.
 * (Washerwoman, Librarian, Investigator, Chef, Empath, Undertaker, Spy)
 * Auto-submits a request so the host sees a pending action to respond to.
 */
export default function InfoOnlyAction({ role, hasSubmitted, onSubmit }: InfoOnlyActionProps) {
  const submitted = useRef(false);

  useEffect(() => {
    if (!submitted.current && !hasSubmitted) {
      submitted.current = true;
      onSubmit();
    }
  }, [hasSubmitted, onSubmit]);

  const instruction = ROLE_NIGHT_INSTRUCTIONS[role];

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="rounded-xl border border-purple-500/20 bg-purple-900/10 p-4">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">{ROLE_ICONS[role]}</span>
          <div>
            <h3 className="font-bold text-white">{role}</h3>
            <p className="text-xs text-purple-300">Đang chờ thông tin từ Quản trò</p>
          </div>
        </div>
        {instruction && (
          <div className="rounded-lg bg-black/20 border border-white/5 p-3">
            <p className="text-xs text-slate-300 leading-relaxed">{instruction}</p>
          </div>
        )}
      </div>
      <PlayerWaiting message="Quản trò đang chuẩn bị thông tin cho bạn..." />
    </div>
  );
}
