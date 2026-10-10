'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useCue } from '../hooks/useCue';

// An element whose CSS animation (from `className`) plays `at` ms into the
// phase, on the server clock — see useCue. The delay is fixed when THIS
// element mounts, so mount it together with the phase (or key it) rather than
// toggling its class later. Its static style must be the animation's end
// state (reduced motion shows only that).
export default function Cued({
  startedAt,
  at,
  className = '',
  style,
  children,
  ...data
}: {
  startedAt: number;
  at: number;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
} & { [k: `data-${string}`]: string | number | undefined }) {
  const cue = useCue(startedAt);
  return (
    <div className={className} style={{ ...style, animationDelay: cue(at) }} {...data}>
      {children}
    </div>
  );
}
