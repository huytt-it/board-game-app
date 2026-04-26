'use client';

import { useEffect, useRef } from 'react';
import {
  ROLE_ICONS,
  ROLE_SHORT_DESC,
  ROLE_NIGHT_INSTRUCTIONS,
  type ClocktowerRole,
} from '@/types/games/clocktower';

interface InfoOnlyActionProps {
  role: ClocktowerRole;
  hasSubmitted: boolean;
  onSubmit: () => void;
}

/**
 * For roles that receive information from the Storyteller without picking a target.
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
    <div className="flex flex-col items-center gap-5 py-6 animate-slide-up px-2">
      {/* Role display */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <span className="text-7xl block animate-float">{ROLE_ICONS[role]}</span>
          {/* Glow behind icon */}
          <div className="absolute inset-0 -z-10 blur-2xl opacity-40 text-7xl flex items-center justify-center">
            {ROLE_ICONS[role]}
          </div>
        </div>
        <div className="text-center">
          <h3 className="text-xl font-black text-white">{role}</h3>
          <p className="text-sm text-purple-300 mt-0.5">{ROLE_SHORT_DESC[role]}</p>
        </div>
      </div>

      {/* Instruction box */}
      {instruction && (
        <div className="w-full rounded-2xl border border-purple-500/20 bg-purple-900/10 px-5 py-4">
          <p className="text-[11px] uppercase tracking-wider text-purple-400 font-bold mb-2">
            Hướng dẫn đêm nay
          </p>
          <p className="text-sm text-slate-200 leading-relaxed">{instruction}</p>
        </div>
      )}

      {/* Status */}
      <div className="w-full rounded-2xl border border-white/8 bg-white/5 px-5 py-4 text-center space-y-3">
        <div className="flex items-center justify-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-purple-500" />
          </span>
          <p className="text-sm font-semibold text-slate-300">Đã báo hiệu Quản trò</p>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          Quản trò đang chuẩn bị thông tin cho bạn. Giữ điện thoại và chờ tin nhắn riêng tư.
        </p>
      </div>

      {/* Animated dots */}
      <div className="flex gap-2">
        {[0, 200, 400].map((delay) => (
          <div
            key={delay}
            className="h-2 w-2 animate-bounce rounded-full bg-purple-500/70"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
