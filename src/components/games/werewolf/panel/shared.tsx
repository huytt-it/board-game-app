'use client';

import type { HTMLAttributes, ReactNode } from 'react';
import type { Player } from '@/types/player';
import { describeLog } from '@/components/games/werewolf/engine/log.ts';
import { ROLE_NAME, ROLE_TEAM } from '@/components/games/werewolf/engine/roles.ts';
import { formatCountdown } from '../hooks/usePhaseClock';
import { dataOf, isDead } from '../state';
import WwIcon, { type IconName } from '../assets/WwIcon';
import type { WerewolfGameData, WerewolfGameState, WwLogEntry, WwRole, WwTable, WwTeam } from '../types';

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

/** Màu chữ theo phe (lớp Tailwind viết nguyên văn để được sinh ra). */
export const TEAM_TEXT: Record<WwTeam, string> = {
  wolves: 'text-(--ww-wolf-light)',
  village: 'text-(--ww-village-light)',
  tanner: 'text-(--ww-tanner-light)',
  lovers: 'text-(--ww-lovers-light)',
};

/** Màu chữ của một vai (vai đã lộ công khai, danh sách vai): theo phe của VAI (Tay sai, Sói con: màu Sói). */
export function roleText(role: WwRole): string {
  return TEAM_TEXT[ROLE_TEAM[role]];
}

const TEAM_CHIP: Record<WwTeam, string> = {
  wolves: 'bg-(--ww-wolf)/15 text-(--ww-wolf-light)',
  village: 'bg-(--ww-village)/15 text-(--ww-village-light)',
  tanner: 'bg-(--ww-tanner)/15 text-(--ww-tanner-light)',
  lovers: 'bg-(--ww-lovers)/15 text-(--ww-lovers-light)',
};

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
 * Người chết (kể cả người rời làng) ở mọi bước trừ màn kết thúc có một thẻ giữ
 * để xem (GhostPanel). Khi không giữ thì màn của họ giống hệt nhau, dù vai gì,
 * dù luật "Hồn ma xem hết vai" bật hay tắt (rules §6).
 */
export function hasGhostCard(ctx: Pick<PanelCtx, 'state' | 'me'>): boolean {
  return ctx.state.phase !== 'end' && isDead(ctx.state, ctx.me.id);
}

/**
 * Giữ thẻ của người chết thì thấy gì (chỉ khi đang giữ):
 *  - 'all': hồn ma xem hết vai (luật bật): vai của mọi người, lựa chọn đêm, nhật ký.
 *  - 'wait': luật bật nhưng Thợ săn chưa xong lượt bắn: chỉ vai của mình.
 *  - 'own': luật tắt: chỉ vai của mình.
 */
export function ghostView(ctx: Pick<PanelCtx, 'state' | 'me' | 'myData'>): 'all' | 'wait' | 'own' {
  if (!ctx.state.rules.ghostsSeeAll) return 'own';
  return shotPending(ctx) ? 'wait' : 'all';
}

/** Tiêu đề của bước (chữ display, một mỗi màn) + đồng hồ bên phải nếu bước có giờ, rồi MỘT câu. */
export function PhaseHeader({
  title,
  remaining,
  warn = true,
  children,
}: {
  title: string;
  remaining?: number;
  /** Đồng hồ đổi màu cảnh báo khi còn ≤ 10 giây. Tắt ở bước tự chạy không ai phải làm gì (Bình minh 8 giây). */
  warn?: boolean;
  children?: ReactNode;
}) {
  return (
    <header className="mb-4" data-ww-header="">
      <div className="flex items-center justify-between gap-3">
        <h2 className="ww-display text-3xl leading-tight text-(--ww-text)">{title}</h2>
        {remaining !== undefined && (
          <span
            className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-(--ww-raised) px-3 text-base font-semibold tabular-nums ${warn && remaining <= 10_000 ? 'text-(--ww-wolf-light)' : 'text-(--ww-text)'}`}
            aria-label="Thời gian còn lại"
            data-ww-clock=""
          >
            <WwIcon name="clock" size={16} className="text-(--ww-text-3)" />
            {formatCountdown(remaining)}
          </span>
        )}
      </div>
      {children && <p className="mt-1.5 text-sm text-(--ww-text-2)">{children}</p>}
    </header>
  );
}

/**
 * Bố cục một bước: điện thoại xếp dọc (tiêu đề → "sân khấu" → phần còn lại);
 * từ `lg` hai cột: sân khấu (người chơi trong làng) bên trái, tiêu đề + phần
 * còn lại thành một khung kính bên phải. Thứ tự DOM giữ nguyên ở mọi cỡ.
 * `stageOnPhone=false`: sân khấu chỉ hiện ở màn rộng (điện thoại đã có một câu tóm tắt).
 */
export function PhaseLayout({
  section,
  header,
  stage,
  stageOnPhone = true,
  children,
  ...attrs
}: {
  section: string;
  header: ReactNode;
  stage: ReactNode;
  stageOnPhone?: boolean;
  children: ReactNode;
} & Record<`data-${string}`, string | undefined>) {
  const side = 'lg:col-start-2 lg:border-(--ww-line) lg:bg-(color:--ww-glass-bg) lg:px-6';
  return (
    <section data-phase-section={section} {...attrs} className="lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:grid-rows-[auto_1fr] lg:gap-x-10">
      <div className={`${side} lg:row-start-1 lg:rounded-t-2xl lg:border lg:border-b-0 lg:pt-6`}>{header}</div>
      <div className={`lg:col-start-1 lg:row-span-2 lg:row-start-1 ${stageOnPhone ? '' : 'hidden lg:block'}`} data-ww-stage="">
        {stage}
      </div>
      <div className={`${side} lg:row-start-2 lg:self-start lg:rounded-b-2xl lg:border lg:border-t-0 lg:pb-6 lg:shadow-lg lg:shadow-black/30`}>{children}</div>
    </section>
  );
}

// Màu nhận diện của từng người: băm id ra một bảng "giấy nhuộm" trầm, cùng độ
// sáng (chữ trắng ≥ 5,7 : 1), không đỏ / xanh lá thuần để không lẫn màu phe.
const AVATAR_COLORS = ['#5a5f8f', '#6a5585', '#7a5272', '#80584a', '#76643a', '#5e6a3e', '#3e6c66', '#3f6582', '#5c6470', '#7b5a5f'] as const;

function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function avatarColor(key: string): string {
  return AVATAR_COLORS[hashString(key) % AVATAR_COLORS.length];
}

/** Vòng tròn chữ cái đầu, màu theo người (`id`, thiếu thì theo tên). `dim`: người đã chết. */
export function Avatar({ name, id, dim = false, size = 'sm' }: { name: string; id?: string; dim?: boolean; size?: 'sm' | 'md' }) {
  return (
    <span
      aria-hidden="true"
      data-ww-avatar=""
      className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ${size === 'md' ? 'size-10 text-base' : 'size-8 text-sm'} ${dim ? 'opacity-45 grayscale' : ''}`}
      style={{ backgroundColor: avatarColor(id ?? name) }}
    >
      {(Array.from(name.trim())[0] ?? '?').toUpperCase()}
    </span>
  );
}

/**
 * Vai đã lộ CÔNG KHAI của một người (luật "Lộ vai khi chết"): icon + tên vai, màu
 * phe của vai, chữ nhỏ. Màn kết thúc (mọi thứ đã công khai): `team` = phe lúc
 * kết thúc (teamOf, tô màu), `lover` = người trong cặp đôi (thêm icon trái tim).
 */
export function RoleLine({ role, team, lover = false }: { role: WwRole; team?: WwTeam | null; lover?: boolean }) {
  return (
    <span
      className={`flex min-w-0 items-center gap-1 truncate text-xs font-semibold ${team ? TEAM_TEXT[team] : roleText(role)}`}
      data-ww-tile-role={role}
      data-ww-end-team={team ?? undefined}
    >
      <WwIcon name={role} size={13} />
      {ROLE_NAME[role]}
      {lover && <WwIcon name="lovers" size={13} title={team === 'lovers' ? 'Phe Tình nhân' : 'Cặp đôi'} />}
    </span>
  );
}

/**
 * Ô một người trong lưới chọn. Ô nào cũng cùng một kiểu với mọi vai (plan §2.3):
 * không làm mờ hay khoá theo vai. Mặt nổi đặc, không viền; ô đang chọn có vòng
 * đèn lồng.
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
  /** Vai hiện dưới tên: chỉ vai đã lộ khi chết (revealedRole), không bao giờ vai ẩn. */
  role?: WwRole | null;
  /** Dấu nhỏ góc phải (vd. "bạn", "đã bầu"), công khai. */
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
      className={`relative flex min-h-14 items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm font-semibold shadow-md shadow-black/25 transition-colors select-none disabled:cursor-default ${
        selected ? 'bg-(--ww-raised-hi) text-(--ww-text) ring-2 ring-(--ww-accent)' : 'bg-(--ww-raised) text-(--ww-text)'
      }`}
    >
      <Avatar name={player.name} id={player.id} />
      <span className="min-w-0 flex-1">
        <span className="block truncate">{player.name}</span>
        {role && <RoleLine role={role} />}
      </span>
      {mark && <span className="absolute -top-2 -right-1.5">{mark}</span>}
    </button>
  );
}

/** Dấu "bạn" trên ô của chính người xem (công khai: ai cũng có trên ô của mình). */
export function MeMark() {
  return (
    <span className="inline-flex h-5 items-center rounded-full bg-(--ww-text) px-2 text-xs font-bold text-(--ww-ink)" data-ww-me="">
      bạn
    </span>
  );
}

/**
 * Một người trong làng, chỉ để xem (sảnh, màn rộng của Xem vai / Bình minh):
 * avatar (bia mộ nếu đã chết), tên, một dòng phụ, dấu công khai ở góc. Không phải nút.
 */
export function Seat({
  player,
  dead = false,
  sub,
  mark,
  action,
  onSelect,
  selected = false,
  fall,
}: {
  player: Player;
  dead?: boolean;
  /**
   * Hoạt cảnh (GĐ4): người này chết NGAY trong bước này. Ghế hiện như người sống
   * rồi thành bia mộ lúc `fall` (animation-delay từ useCue). Khung tĩnh = bia mộ.
   */
  fall?: string;
  /** Dòng nhỏ dưới tên (vai đã lộ, "chủ phòng"…). */
  sub?: ReactNode;
  mark?: ReactNode;
  /** Nút phụ bên phải (chủ phòng mời ra ở sảnh). */
  action?: ReactNode;
  /** Chạm vào ghế (chủ phòng ở sảnh: hiện nút mời ra). Phần avatar + tên thành một nút. */
  onSelect?: () => void;
  selected?: boolean;
}) {
  const body = (
    <>
      {dead ? (
        <span className="flex size-8 shrink-0 items-center justify-center text-(--ww-text-3)" aria-hidden="true">
          <WwIcon name="dead" size={26} />
        </span>
      ) : (
        <Avatar name={player.name} id={player.id} />
      )}
      <span className="min-w-0 flex-1">
        <span className={`block truncate ${dead ? 'line-through decoration-1' : ''}`}>{player.name}</span>
        {sub}
      </span>
    </>
  );
  return (
    <div
      data-player-id={player.id}
      data-ww-dead-seat={dead ? '' : undefined}
      className={`relative flex min-h-14 items-center gap-2.5 rounded-xl py-2 pl-2.5 text-sm font-semibold shadow-md shadow-black/25 ${action ? 'pr-1' : 'pr-2.5'} ${
        dead ? 'bg-(--ww-ink) text-(--ww-text-3)' : selected ? 'bg-(--ww-raised-hi) text-(--ww-text)' : 'bg-(--ww-raised) text-(--ww-text)'
      }`}
    >
      {onSelect ? (
        <button type="button" aria-expanded={selected} aria-label={`Chọn ${player.name}`} onClick={onSelect} className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-xl text-left">
          {body}
        </button>
      ) : (
        body
      )}
      {dead && fall && (
        // Lớp "còn sống" phủ lên ghế bia mộ, tan đi đúng lúc người này chết.
        <span
          aria-hidden="true"
          className="ww-a-gone absolute inset-0 flex items-center gap-2.5 rounded-xl bg-(--ww-raised) py-2 pr-2.5 pl-2.5 text-(--ww-text)"
          style={{ animationDelay: fall }}
          data-ww-fall=""
        >
          <Avatar name={player.name} id={player.id} />
          <span className="min-w-0 flex-1 truncate">{player.name}</span>
        </span>
      )}
      {action}
      {mark && <span className="absolute -top-2 -right-1.5">{mark}</span>}
    </div>
  );
}

/**
 * Thẻ "giữ để xem" (useHold): khi không giữ, giống hệt nhau với mọi vai; phần
 * riêng chỉ render khi đang giữ. Chiều cao cố định để bố cục không đổi. Mặt nổi
 * đặc, không viền; nền như nhau dù đang giữ hay không.
 */
export function HoldCard({
  held,
  bind,
  children,
  hint,
  className = 'h-40',
}: {
  held: boolean;
  bind: HTMLAttributes<HTMLElement>;
  /** Phần riêng của vai, chỉ gọi khi đang giữ. */
  children: () => ReactNode;
  /** Một dòng nhỏ dưới "Nhấn giữ để xem" (giống nhau với mọi vai); mặc định không có — câu của bước đã nói. */
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
      className={`flex w-full touch-none flex-col items-center justify-center overflow-hidden rounded-2xl bg-(--ww-raised) px-4 py-3 text-center shadow-lg shadow-black/30 select-none [-webkit-touch-callout:none] [-webkit-tap-highlight-color:transparent] ${className}`}
    >
      {held ? (
        <div className="w-full text-sm text-(--ww-text)" data-ww-hold-panel="">
          {children()}
        </div>
      ) : (
        <>
          <span className="mb-2 flex size-11 items-center justify-center rounded-full bg-(--ww-ink) text-(--ww-moon)">
            <WwIcon name="hold" size={24} />
          </span>
          <span className="text-base font-semibold text-(--ww-text)">Nhấn giữ để xem</span>
          {hint && <span className="mt-1 text-xs text-(--ww-text-3)">{hint}</span>}
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
  /** Vòng khi đang bật: cứu (màu Dân) / độc (màu Sói) — chỉ hiện trong thẻ đang giữ. */
  tone?: 'neutral' | 'heal' | 'poison';
  disabled?: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  const on = { neutral: 'ring-(--ww-accent)', heal: 'ring-(--ww-village)', poison: 'ring-(--ww-wolf)' }[tone];
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
      className={`flex min-h-11 w-full items-center justify-center rounded-xl px-3 text-sm font-semibold text-(--ww-text) disabled:opacity-50 ${
        pressed ? `bg-(--ww-raised-hi) ring-2 ${on}` : 'bg-(--ww-ink) ring-1 ring-(--ww-line)'
      }`}
    >
      {children}
    </button>
  );
}

/** Tên vai kèm phe, cho các danh sách công khai (vai đã lộ). */
export function RoleTag({ role }: { role: WwRole }) {
  return (
    <span
      className={`inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2 text-xs font-semibold ${TEAM_CHIP[ROLE_TEAM[role]]}`}
      data-ww-role-tag={role}
    >
      <WwIcon name={role} size={14} />
      {ROLE_NAME[role]}
    </span>
  );
}

/**
 * Một dòng trạng thái công khai (đếm người đã xong, Chưa / Đã xác nhận…): viên
 * kính tối, để đọc được trên mọi cảnh (dải mây sáng của ban ngày). `accent`:
 * việc còn chờ chính người xem.
 */
export function StatusLine({
  icon,
  accent = false,
  className = '',
  children,
  ...attrs
}: { icon: IconName; accent?: boolean; className?: string; children: ReactNode } & Record<`data-${string}`, string | undefined>) {
  return (
    <p className={`flex justify-center ${className}`} {...attrs}>
      <span
        className={`inline-flex min-h-8 items-center gap-1.5 rounded-full bg-(color:--ww-glass-bg) px-3 text-sm ${accent ? 'font-semibold text-(--ww-accent)' : 'text-(--ww-text-2)'}`}
      >
        <WwIcon name={icon} size={16} className={accent ? '' : 'text-(--ww-text-3)'} />
        {children}
      </span>
    </p>
  );
}

/**
 * Màn cho người đã chết ở các bước cần hành động. Một câu duy nhất cho mọi
 * người chết, dù vai gì, dù hồn ma bật hay tắt (rules §6).
 */
export function DeadNote() {
  return (
    <p
      className="flex items-center justify-center gap-2 rounded-2xl border border-(--ww-line) bg-(color:--ww-glass-bg) px-4 py-3 text-center text-sm text-(--ww-text-2)"
      data-ww-dead-note=""
    >
      <WwIcon name="dead" size={18} className="shrink-0 text-(--ww-text-3)" />
      Bạn đã chết. Ngồi im lặng, không ra hiệu đến hết ván nhé.
    </p>
  );
}

/** "Diễn biến ván": các câu của nhật ký, gom theo "Đêm N" / "Ngày N". `compact`: dòng khít (trong thẻ giữ của hồn ma). */
export function LogList({ log, players, compact = false }: { log: readonly WwLogEntry[]; players: Player[]; compact?: boolean }) {
  const lines = describeLog(log, (id) => nameOf(players, id));
  const groups: Array<{ label: string; texts: string[] }> = [];
  for (const line of lines) {
    const label = `${line.part === 'night' ? 'Đêm' : 'Ngày'} ${line.round}`;
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.texts.push(line.text);
    else groups.push({ label, texts: [line.text] });
  }
  if (groups.length === 0) return <p className="text-sm text-(--ww-text-3)">Chưa có gì.</p>;
  return (
    <ol className={compact ? 'space-y-2' : 'space-y-3'} data-ww-log="">
      {groups.map((g, i) => (
        <li key={i}>
          <p className={`${compact ? 'mb-0.5' : 'mb-1'} flex items-center gap-1.5 text-xs font-bold text-(--ww-text-2)`}>
            <WwIcon name={g.label.startsWith('Đêm') ? 'night' : 'day'} size={13} className="text-(--ww-text-3)" />
            {g.label}
          </p>
          <ul className={`${compact ? 'space-y-0.5 leading-snug' : 'space-y-1'} text-sm text-(--ww-text)`}>
            {g.texts.map((t, j) => (
              <li key={j}>{t}</li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}

/** Thanh nút cố định ở đáy màn điện thoại (dải mực mờ dần); từ `lg` nằm yên cuối khung bên phải. */
export function Dock({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-20 -mx-4 mt-4 bg-linear-to-t from-(--ww-ink) from-40% to-transparent px-4 pt-6 pb-[max(1rem,env(safe-area-inset-bottom))] lg:static lg:mx-0 lg:bg-none lg:px-0 lg:pt-2 lg:pb-0">
      {children}
    </div>
  );
}
