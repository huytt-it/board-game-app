// Helpers for the paper-cut scenes: each builds a flat silhouette as an SVG
// path string. They run once at module load and are seeded, so the art is
// identical on every device and on the server (no hydration mismatch).
import type { ComponentType, ReactNode, SVGProps } from 'react';
import { mulberry32 } from './journey';

/** Every scene layer is drawn in this box (see SceneBackdrop for the framing). */
export const W = 1600;
export const H = 900;

export type Rand = () => number;
export const rng = (seed: number): Rand => mulberry32(seed);
export const between = (rand: Rand, a: number, b: number) => a + (b - a) * rand();

// One decimal is plenty at this scale and keeps the paths short.
const n = (v: number) => String(Math.round(v * 10) / 10);
const pt = (x: number, y: number) => `${n(x)} ${n(y)}`;

/** A scene layer: one full-frame SVG. Swappable for an image in the registry. */
export function sceneLayer(
  name: string,
  content: ReactNode
): ComponentType<SVGProps<SVGSVGElement>> {
  function Layer(props: SVGProps<SVGSVGElement>) {
    return (
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMax slice"
        aria-hidden="true"
        focusable="false"
        {...props}
      >
        {content}
      </svg>
    );
  }
  Layer.displayName = name;
  return Layer;
}

/** Rolling ground line across the frame, closed down to `bottom`. Smoothed with
 *  quadratic curves through the midpoints of random control points. */
export function ridge(
  rand: Rand,
  { y, amp, step = 120, x0 = -40, x1 = W + 40, bottom = H }: {
    y: number;
    amp: number;
    step?: number;
    x0?: number;
    x1?: number;
    bottom?: number;
  }
): string {
  const pts: [number, number][] = [];
  for (let x = x0; x < x1 + step; x += step) pts.push([Math.min(x, x1), y + between(rand, -amp, amp)]);
  let d = `M${pt(x0, bottom)}L${pt(pts[0][0], pts[0][1])}`;
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = pts[i - 1];
    const [x, yy] = pts[i];
    d += `Q${pt(px, py)} ${pt((px + x) / 2, (py + yy) / 2)}`;
  }
  const [lx, ly] = pts[pts.length - 1];
  d += `L${pt(lx, ly)}L${pt(x1, bottom)}Z`;
  return d;
}

/** A pine: stacked triangular tiers on a short trunk. */
export function pine(x: number, base: number, h: number, w: number, tiers = 3): string {
  // Every shape is wound clockwise, so overlapping pieces always merge (nonzero fill).
  let d = `M${pt(x - w * 0.06, base)}v${n(-h * 0.18)}h${n(w * 0.12)}v${n(h * 0.18)}Z`;
  const tierH = (h * 0.95) / (tiers * 0.7 + 0.3);
  for (let i = 0; i < tiers; i++) {
    const b = base - h * 0.12 - i * tierH * 0.7;
    const half = (w / 2) * (1 - i * 0.22);
    d += `M${pt(x - half, b)}L${pt(x, b - tierH)}L${pt(x + half, b)}Z`;
  }
  return d;
}

/** A row of pines standing on a flat band of ground that runs to `bottom`.
 *  `gap` keeps a stretch of the row empty (a clearing, a path). */
export function pineRow(
  rand: Rand,
  opts: {
    base: number;
    minH: number;
    maxH: number;
    minW: number;
    maxW: number;
    spacing: [number, number];
    x0?: number;
    x1?: number;
    gap?: [number, number];
    jitter?: number;
    bottom?: number;
  }
): string {
  const { base, minH, maxH, minW, maxW, spacing, x0 = -60, x1 = W + 60, gap, jitter = 12, bottom = H } = opts;
  let d = `M${pt(x0, base)}H${n(x1)}V${n(bottom)}H${n(x0)}Z`;
  for (let x = x0 + between(rand, 0, spacing[1]); x < x1; x += between(rand, spacing[0], spacing[1])) {
    if (gap && x > gap[0] && x < gap[1]) continue;
    const h = between(rand, minH, maxH);
    d += pine(x, base + between(rand, -jitter, jitter * 0.3), h, between(rand, minW, maxW), h > (minH + maxH) / 2 ? 4 : 3);
  }
  return d;
}

/** Union of circles (a canopy, a cloud, a bush) as one path. */
export function blobs(circles: readonly [number, number, number][]): string {
  return circles
    .map(([cx, cy, r]) => `M${pt(cx - r, cy)}a${n(r)} ${n(r)} 0 1 0 ${n(2 * r)} 0a${n(r)} ${n(r)} 0 1 0 ${n(-2 * r)} 0Z`)
    .join('');
}

/** Gothic (two-centred) arch outline: springs at `spring`, straight jambs down to `bottom`. */
export function archPath(cx: number, w: number, spring: number, bottom: number, ratio = 0.7): string {
  const r = ratio * w;
  const l = cx - w / 2;
  const apex = spring - Math.sqrt(r * r - (r - w / 2) * (r - w / 2));
  return `M${pt(l, bottom)}L${pt(l, spring)}A${n(r)} ${n(r)} 0 0 1 ${pt(cx, apex)}A${n(r)} ${n(r)} 0 0 1 ${pt(l + w, spring)}L${pt(l + w, bottom)}Z`;
}

/** Scattered static dots (stars). */
export function scatter(
  rand: Rand,
  count: number,
  [x0, y0, x1, y1]: readonly [number, number, number, number],
  [rMin, rMax]: [number, number],
  avoid?: { x: number; y: number; r: number }
): { x: number; y: number; r: number; o: number }[] {
  const out: { x: number; y: number; r: number; o: number }[] = [];
  while (out.length < count) {
    const x = between(rand, x0, x1);
    const y = between(rand, y0, y1);
    if (avoid && Math.hypot(x - avoid.x, y - avoid.y) < avoid.r) continue;
    out.push({ x: Math.round(x), y: Math.round(y), r: Math.round(between(rand, rMin, rMax) * 10) / 10, o: Math.round(between(rand, 0.35, 0.9) * 100) / 100 });
  }
  return out;
}
