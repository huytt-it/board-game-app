import type { ReactNode } from 'react';

// Identity colours. Each player keeps one colour everywhere (hash of the id).
// None is a pure blue or red, so an avatar never reads as a team colour. Each
// is dark enough for the white initial to reach 4.5:1 (all ≥ 4.8).
const AVATAR_COLORS = [
  '#a4602a', // đồng
  '#877011', // vàng đất
  '#677922', // ô liu
  '#2f7d4f', // xanh rừng
  '#23736e', // xanh mòng két
  '#6a4bb0', // tím
  '#8a3f9e', // tím mận
  '#a63b7a', // hồng sẫm
  '#5b6573', // xám đá
  '#7a5a3c', // nâu
] as const;

// FNV-1a: tiny, stable across devices and reloads.
function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function avatarColor(playerId: string): string {
  return AVATAR_COLORS[hashString(playerId) % AVATAR_COLORS.length];
}

export function avatarInitial(name: string): string {
  // Array.from keeps a surrogate pair (emoji, rare CJK) in one piece.
  return (Array.from(name.trim())[0] ?? '?').toUpperCase();
}

// The seat size on the round table — table/TableTokens.tsx draws its tokens on
// boxes of exactly this size, centred on the same seat points.
export const TABLE_AVATAR_BOX = 'av-seat-box h-12 w-12 sm:h-14 sm:w-14';

const SIZE_CLS = {
  xs: 'h-5 w-5 text-[10px]',
  sm: 'h-9 w-9 text-sm',
  table: `${TABLE_AVATAR_BOX} text-base`,
  lg: 'h-14 w-14 text-lg',
  xl: 'h-24 w-24 text-4xl',
} as const;

export type PlayerAvatarSize = keyof typeof SIZE_CLS;

interface PlayerAvatarProps {
  player: { id: string; name: string };
  size?: PlayerAvatarSize;
  /** In the proposed team / picked by the Leader. */
  selected?: boolean;
  /** Being aimed at: by the Lady of the Lake, or by the Assassin. */
  aim?: 'lady' | 'assassin' | null;
  /** The viewer's own seat. A neutral dashed outline — never a team colour. */
  isMe?: boolean;
  /** Make the ring (selection / aim) throb. Only the glow pulses — the letter
   *  keeps full contrast (Tailwind's animate-pulse would dim it too). */
  pulse?: boolean;
  /** Lit up in gold: a seat the night shows to the viewer while they hold
   *  the night card (never anything a neighbour could read as a team). */
  glow?: boolean;
  className?: string;
  /** Badges positioned absolutely around the circle (Leader, Lady, hints…). */
  children?: ReactNode;
}

export default function PlayerAvatar({
  player,
  size = 'sm',
  selected = false,
  aim = null,
  isMe = false,
  pulse = false,
  glow = false,
  className = '',
  children,
}: PlayerAvatarProps) {
  // Aim beats selection: the Assassin's target matters more than team membership.
  const ring =
    aim === 'assassin'
      ? 'ring-[3px] ring-(--av-evil) shadow-[0_0_16px_var(--av-evil)]'
      : aim === 'lady'
        ? 'ring-[3px] ring-(--av-lady) shadow-[0_0_16px_var(--av-lady)]'
        : selected
          ? 'ring-[3px] ring-(--av-team) shadow-[0_0_14px_var(--av-team)]'
          : glow
            ? 'ring-[3px] ring-(--av-gold) shadow-[0_0_18px_var(--av-gold)]'
            : '';
  const me = isMe ? 'outline-2 outline-dashed outline-offset-4 outline-(--av-parchment)/80' : '';
  const pulseColor =
    aim === 'assassin'
      ? 'var(--av-evil)'
      : aim === 'lady'
        ? 'var(--av-lady)'
        : selected
          ? 'var(--av-team)'
          : glow
            ? 'var(--av-gold)'
            : null;
  const throb = (pulse || glow) && pulseColor ? 'av-pulse-ring' : '';

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center rounded-full font-black text-white inset-ring-2 inset-ring-white/20 transition-shadow ${SIZE_CLS[size]} ${ring} ${me} ${throb} ${className}`}
      style={{ backgroundColor: avatarColor(player.id), ...(throb ? { ['--av-pulse' as string]: pulseColor } : {}) }}
    >
      <span className="leading-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.45)]">
        {avatarInitial(player.name)}
      </span>
      {children}
    </div>
  );
}
