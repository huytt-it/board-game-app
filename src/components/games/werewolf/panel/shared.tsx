'use client';

import type { HTMLAttributes, ReactNode } from 'react';
import type { Player } from '@/types/player';
import { ROLE_NAME } from '@/components/games/werewolf/engine/roles.ts';
import { formatCountdown } from '../hooks/usePhaseClock';
import { dataOf, isDead } from '../state';
import type { WerewolfGameData, WerewolfGameState, WwRole, WwTable } from '../types';

/** Những gì mọi panel trong ván cần biết. `me` là người đang xem màn này. */
export interface PanelCtx {
  state: WerewolfGameState;
  me: Player;
  myData: Partial<WerewolfGameData>;
  /** Người chơi theo thứ tự ghế. */
  players: Player[];
  table: WwTable;
  isHost: boolean;
  /** Thời gian còn lại của phase (ms). */
  remaining: number;
}

export function nameOf(players: Player[], id: string | null | undefined): string {
  if (!id) return '—';
  return players.find((p) => p.id === id)?.name ?? '(đã rời)';
}

/** Vai lộ ra của người đã chết (luật "Lộ vai khi chết"), hoặc null. */
export function revealedRole(ctx: Pick<PanelCtx, 'state' | 'players'>, id: string): WwRole | null {
  if (!ctx.state.rules.revealOnDeath || !isDead(ctx.state, id)) return null;
  return dataOf(ctx.players.find((p) => p.id === id)).role ?? null;
}

/** Tiêu đề của bước: một câu, đồng hồ bên phải (nếu bước có giờ). */
export function PhaseHeader({ title, remaining, children }: { title: string; remaining?: number; children?: ReactNode }) {
  return (
    <header className="mb-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-2xl font-bold text-slate-50">{title}</h2>
        {remaining !== undefined && (
          <span
            className={`font-mono text-lg font-semibold tabular-nums ${remaining <= 10_000 ? 'text-amber-300' : 'text-slate-300'}`}
            aria-label="Thời gian còn lại"
            data-ww-clock=""
          >
            {formatCountdown(remaining)}
          </span>
        )}
      </div>
      {children && <p className="mt-1 text-sm text-slate-300">{children}</p>}
    </header>
  );
}

export function Avatar({ name, dim = false }: { name: string; dim?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${dim ? 'bg-slate-800 text-slate-500' : 'bg-slate-700 text-slate-100'}`}
    >
      {(name.trim()[0] ?? '?').toUpperCase()}
    </span>
  );
}

/**
 * Ô một người trong lưới chọn. Ô nào cũng cùng một kiểu với mọi vai (plan §2.3):
 * không làm mờ hay khoá theo vai.
 */
export function PlayerTile({
  player,
  selected = false,
  mark,
  onClick,
  onPointerDown,
  disabled = false,
  label,
}: {
  player: Player;
  selected?: boolean;
  /** Dấu nhỏ góc phải (vd. "đã bầu"), công khai. */
  mark?: ReactNode;
  onClick?: () => void;
  onPointerDown?: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      data-player-id={player.id}
      aria-pressed={selected}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      onPointerDown={onPointerDown}
      // Chạm ô bằng ngón thứ hai khi đang giữ thẻ: không làm thẻ đóng lại
      // (useHold đóng khi có pointerup ở window / khi thẻ mất tiêu điểm).
      onPointerUp={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.preventDefault()}
      className={`relative flex min-h-14 items-center gap-2 rounded-xl px-2 py-2 text-left text-sm font-semibold transition-colors select-none disabled:cursor-default ${
        selected ? 'bg-indigo-500/25 text-white ring-2 ring-indigo-400' : 'bg-slate-800/80 text-slate-100 ring-1 ring-slate-700'
      }`}
    >
      <Avatar name={player.name} />
      <span className="min-w-0 flex-1 truncate">{player.name}</span>
      {mark && <span className="absolute -top-1.5 -right-1.5">{mark}</span>}
    </button>
  );
}

/**
 * Thẻ "giữ để xem" (useHold): khi không giữ, giống hệt nhau với mọi vai; phần
 * riêng chỉ render khi đang giữ. Chiều cao cố định để bố cục không đổi.
 */
export function HoldCard({
  held,
  bind,
  children,
  hint = 'Ai cũng giữ — màn hình của mọi người như nhau.',
  className = 'h-40',
}: {
  held: boolean;
  bind: HTMLAttributes<HTMLElement>;
  /** Phần riêng của vai, chỉ gọi khi đang giữ. */
  children: () => ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Giữ để xem"
      data-ww-hold={held ? 'open' : 'sealed'}
      {...bind}
      className={`flex w-full touch-none flex-col items-center justify-center overflow-hidden rounded-2xl bg-slate-800/90 px-4 py-3 text-center ring-1 ring-slate-600 outline-none select-none [-webkit-touch-callout:none] [-webkit-tap-highlight-color:transparent] focus-visible:ring-2 focus-visible:ring-indigo-300 ${className}`}
    >
      {held ? (
        <div className="w-full text-sm text-slate-100" data-ww-hold-panel="">
          {children()}
        </div>
      ) : (
        <>
          <span className="text-base font-bold text-slate-100">Nhấn giữ để xem</span>
          <span className="mt-1 text-xs text-slate-400">{hint}</span>
        </>
      )}
    </div>
  );
}

/** Tên vai kèm phe, cho các danh sách công khai (vai đã lộ). */
export function RoleTag({ role }: { role: WwRole }) {
  const wolf = role === 'werewolf';
  return (
    <span className={`rounded-md px-1.5 py-0.5 text-xs font-semibold ${wolf ? 'bg-rose-500/20 text-rose-200' : 'bg-emerald-500/15 text-emerald-200'}`}>
      {ROLE_NAME[role]}
    </span>
  );
}

/** Màn cho người đã chết ở các bước cần hành động. */
export function DeadNote() {
  return (
    <p className="rounded-xl bg-slate-800/70 px-4 py-3 text-center text-sm text-slate-300">
      Bạn đã chết. Ngồi im lặng, không ra hiệu đến hết ván nhé.
    </p>
  );
}

/** Thanh nút cố định ở đáy màn điện thoại. */
export function Dock({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-20 -mx-4 mt-4 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      {children}
    </div>
  );
}
