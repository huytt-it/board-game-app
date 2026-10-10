import type { HTMLAttributes } from 'react';

// Four tones only (ux-plan 8b). Every panel is the same dark glass with ONE
// thin edge; the tone changes that edge (and, for a public result, a faint
// wash from the top):
// - `neutral` (default): --av-line.
// - `accent`: the gold edge — the panel that carries "your move" right now.
// - `good` / `evil`: PUBLIC team information only (a quest's result, the end
//   banner); `evil` also marks a warning. Never for something only the viewer
//   knows (ux-plan 2.9).
export type GlassTone = 'neutral' | 'accent' | 'good' | 'evil';

const EDGE: Record<GlassTone, string> = {
  neutral: 'border-(--av-line)',
  accent: 'border-(--av-gold)/60',
  good: 'border-(--av-good)/50',
  evil: 'border-(--av-evil)/50',
};

const WASH: Record<GlassTone, string> = {
  neutral: '',
  accent: '',
  good: 'bg-linear-to-b from-(--av-good)/12 to-transparent to-70%',
  evil: 'bg-linear-to-b from-(--av-evil)/12 to-transparent to-70%',
};

interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  tone?: GlassTone;
  /** Opaque ink instead of glass: a dialog over the game, which must not
   *  let the screen behind show through (no blur, see below). */
  solid?: boolean;
}

// The card every section sits in: a dark, mostly opaque glass over the scene.
// Deliberately no backdrop-filter blur — the scene behind has moving particles
// and a weak phone would re-blur every frame (ux-plan, "Phong cách vẽ").
// Pass padding / layout (and a `rounded-*` to override the default radius)
// through `className`; leave colours, borders and shadow to the props. Do not
// nest another bordered box inside: separate with space or a rule instead.
export default function GlassPanel({ tone = 'neutral', solid = false, className = '', children, ...rest }: GlassPanelProps) {
  const radius = /(^|\s)rounded-/.test(className) ? '' : 'rounded-2xl';
  return (
    <div
      className={`${radius} border ${solid ? 'bg-(--av-ink)' : 'bg-(color:--av-glass-bg)'} shadow-lg shadow-black/30 ${EDGE[tone]} ${WASH[tone]} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
