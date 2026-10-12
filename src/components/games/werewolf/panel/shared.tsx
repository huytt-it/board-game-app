'use client';

import type { HTMLAttributes, ReactNode } from 'react';
import type { Player } from '@/types/player';
import { describeLog } from '@/components/games/werewolf/engine/log.ts';
import { ROLE_NAME } from '@/components/games/werewolf/engine/roles.ts';
import { formatCountdown } from '../hooks/usePhaseClock';
import { dataOf, isDead } from '../state';
import type { WerewolfGameData, WerewolfGameState, WwLogEntry, WwRole, WwTable } from '../types';

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

/**
 * Thợ săn đã chết nhưng chưa tới / chưa xong lượt bắn: chưa phải hồn ma (thấy
 * hết vai thì phát bắn mất ý nghĩa). Lượt bắn luôn để lại một mục 'hunter'
 * trong nhật ký, kể cả khi không bắn hay hết giờ.
 */
function shotPending(ctx: Pick<PanelCtx, 'state' | 'me' | 'myData'>): boolean {
  if (ctx.myData.role !== 'hunter') return false;
  const death = ctx.state.deaths.find((d) => d.id === ctx.me.id);
  if (!death || death.cause === 'left' || (death.cause === 'poison' && !ctx.state.rules.hunterShootsWhenPoisoned)) return false;
  return !ctx.state.log.some((e) => e.kind === 'hunter' && e.hunterId === ctx.me.id);
}

/**
 * Người xem là hồn ma được xem hết (luật "Hồn ma xem hết vai" bật): thấy vai
 * của mọi người, lựa chọn đêm theo thời gian thực và nhật ký. Người còn sống
 * KHÔNG BAO GIỜ thấy các phần này.
 */
export function ghostSeesAll(ctx: Pick<PanelCtx, 'state' | 'me' | 'myData'>): boolean {
  return ctx.state.rules.ghostsSeeAll && isDead(ctx.state, ctx.me.id) && ctx.state.phase !== 'end' && !shotPending(ctx);
}

/** Vai hiện cạnh tên `id` trên màn người xem: hồn ma (luật cho phép) thấy mọi vai, còn lại chỉ vai đã lộ khi chết. */
export function shownRole(ctx: Pick<PanelCtx, 'state' | 'players' | 'me' | 'myData'>, id: string): WwRole | null {
  if (ghostSeesAll(ctx)) return dataOf(ctx.players.find((p) => p.id === id)).role ?? null;
  return revealedRole(ctx, id);
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
  role = null,
  onClick,
  onPointerDown,
  disabled = false,
  label,
}: {
  player: Player;
  selected?: boolean;
  /** Vai hiện dưới tên: chỉ khi người xem được thấy (shownRole). */
  role?: WwRole | null;
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
      <span className="min-w-0 flex-1">
        <span className="block truncate">{player.name}</span>
        {role && (
          <span className={`block truncate text-[11px] font-semibold ${role === 'werewolf' ? 'text-rose-300' : 'text-emerald-300'}`} data-ww-tile-role={role}>
            {ROLE_NAME[role]}
          </span>
        )}
      </span>
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

/**
 * Nút nằm TRONG thẻ giữ-để-xem (vd. Cứu / Bỏ độc của Phù thủy): bấm bằng ngón
 * thứ hai khi ngón kia vẫn giữ thẻ (máy tính: giữ Space + bấm chuột). Chặn
 * pointerdown / pointerup lan lên thẻ và `window`, và không lấy tiêu điểm, để
 * thẻ không đóng lại (useHold).
 */
export function InHoldButton({
  pressed,
  tone = 'neutral',
  disabled = false,
  onPress,
  children,
}: {
  pressed: boolean;
  /** Màu khi đang bật: cứu (xanh) / độc (đỏ). */
  tone?: 'neutral' | 'heal' | 'poison';
  disabled?: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  const on = { neutral: 'bg-indigo-500/25 ring-indigo-400', heal: 'bg-emerald-500/20 ring-emerald-400', poison: 'bg-rose-500/25 ring-rose-400' }[tone];
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.preventDefault()}
      onClick={(e) => {
        e.stopPropagation();
        onPress();
      }}
      className={`flex min-h-11 w-full items-center justify-center rounded-xl px-3 text-sm font-semibold disabled:opacity-50 ${
        pressed ? `${on} text-white ring-2` : 'bg-slate-700 text-slate-100 ring-1 ring-slate-500'
      }`}
    >
      {children}
    </button>
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
export function DeadNote({ ghost = false }: { ghost?: boolean }) {
  return (
    <p className="rounded-xl bg-slate-800/70 px-4 py-3 text-center text-sm text-slate-300" data-ww-dead-note={ghost ? 'ghost' : 'plain'}>
      {ghost
        ? 'Bạn đã chết. Hồn ma thấy vai và lựa chọn của mọi người — giữ kín, ngồi im lặng đến hết ván nhé.'
        : 'Bạn đã chết. Ngồi im lặng, không ra hiệu đến hết ván nhé.'}
    </p>
  );
}

/** "Diễn biến ván": các câu của nhật ký, gom theo "Đêm N" / "Ngày N". */
export function LogList({ log, players }: { log: readonly WwLogEntry[]; players: Player[] }) {
  const lines = describeLog(log, (id) => nameOf(players, id));
  const groups: Array<{ label: string; texts: string[] }> = [];
  for (const line of lines) {
    const label = `${line.part === 'night' ? 'Đêm' : 'Ngày'} ${line.round}`;
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.texts.push(line.text);
    else groups.push({ label, texts: [line.text] });
  }
  if (groups.length === 0) return <p className="text-sm text-slate-400">Chưa có gì.</p>;
  return (
    <ol className="space-y-3" data-ww-log="">
      {groups.map((g, i) => (
        <li key={i}>
          <p className="mb-1 text-xs font-bold tracking-wide text-indigo-300 uppercase">{g.label}</p>
          <ul className="space-y-1 text-sm text-slate-200">
            {g.texts.map((t, j) => (
              <li key={j}>{t}</li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
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
