import type { HTMLAttributes } from 'react';

// Accent of a panel: only its edge and a faint wash from the top change, so
// every panel reads as the same dark glass from a distance. `good` / `evil`
// are for PUBLIC team information only (quest results, the lineup, the end) —
// never for something only the viewer knows (ux-plan 2.9).
export type GlassTone =
  | 'neutral'
  | 'gold'
  | 'leader'
  | 'team'
  | 'lady'
  | 'approve'
  | 'reject'
  | 'success'
  | 'warning'
  | 'mystic'
  | 'good'
  | 'evil';

const EDGE: Record<GlassTone, string> = {
  neutral: 'border-(--av-glass-border)',
  gold: 'border-(--av-gold)/45',
  leader: 'border-(--av-leader)/40',
  team: 'border-(--av-team)/40',
  lady: 'border-(--av-lady)/45',
  approve: 'border-(--av-approve)/50',
  reject: 'border-(--av-reject)/50',
  success: 'border-emerald-400/40',
  warning: 'border-amber-400/45',
  mystic: 'border-purple-400/35',
  good: 'border-(--av-good)/50',
  evil: 'border-(--av-evil)/50',
};

const WASH: Record<GlassTone, string> = {
  neutral: '',
  gold: 'from-(--av-gold)/10',
  leader: 'from-(--av-leader)/10',
  team: 'from-(--av-team)/10',
  lady: 'from-(--av-lady)/12',
  approve: 'from-(--av-approve)/15',
  reject: 'from-(--av-reject)/15',
  success: 'from-emerald-400/10',
  warning: 'from-amber-400/10',
  mystic: 'from-purple-400/10',
  good: 'from-(--av-good)/15',
  evil: 'from-(--av-evil)/15',
};

interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  tone?: GlassTone;
  /** Thicker edge, for the one panel that carries the phase's main message. */
  emphasis?: boolean;
}

// The card every section sits in: a dark, mostly opaque glass over the scene.
// Deliberately no backdrop-filter blur — the scene behind has moving particles
// and a weak phone would re-blur every frame (ux-plan, "Phong cách vẽ").
// Pass padding / layout (and a `rounded-*` to override the default radius)
// through `className`; leave colours, borders and shadow to the props.
export default function GlassPanel({ tone = 'neutral', emphasis = false, className = '', children, ...rest }: GlassPanelProps) {
  const wash = WASH[tone] ? `bg-linear-to-b ${WASH[tone]} to-transparent to-70%` : '';
  const radius = /(^|\s)rounded-/.test(className) ? '' : 'rounded-2xl';
  return (
    <div
      className={`${radius} ${emphasis ? 'border-2' : 'border'} bg-(color:--av-glass-bg) shadow-lg shadow-black/30 ${EDGE[tone]} ${wash} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
