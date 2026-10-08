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

/** A jagged mountain range (sharp peaks, no smoothing), closed down to `bottom`.
 *  `caps` (0–1) also returns a snow cap on each peak: that fraction of the way
 *  down both flanks, with a ragged lower edge. */
export function peaks(
  rand: Rand,
  { y, amp, step = 140, x0 = -60, x1 = W + 60, bottom = H, caps = 0 }: {
    y: number;
    amp: number;
    step?: number;
    x0?: number;
    x1?: number;
    bottom?: number;
    caps?: number;
  }
): { d: string; caps: string } {
  const pts: [number, number][] = [];
  let up = rand() < 0.5;
  for (let x = x0; x < x1 + step; x += step * between(rand, 0.55, 1.1)) {
    pts.push([Math.min(x, x1), up ? y - between(rand, 0.45, 1) * amp : y + between(rand, 0, 0.55) * amp]);
    up = !up;
  }
  return mountainPath(rand, pts, { bottom, caps });
}

/** `peaks` through hand-placed points (left → right), for a range whose main
 *  peak must sit at a given spot. */
export function mountainPath(
  rand: Rand,
  pts: readonly (readonly [number, number])[],
  { bottom = H, caps = 0 }: { bottom?: number; caps?: number } = {}
): { d: string; caps: string } {
  let d = `M${pt(pts[0][0], bottom)}`;
  for (const [x, yy] of pts) d += `L${pt(x, yy)}`;
  d += `L${pt(pts[pts.length - 1][0], bottom)}Z`;

  let c = '';
  if (caps > 0) {
    for (let i = 1; i < pts.length - 1; i++) {
      const [px, py] = pts[i];
      if (py > pts[i - 1][1] || py > pts[i + 1][1]) continue;
      const t = caps * between(rand, 0.7, 1.15);
      const lx = px + (pts[i - 1][0] - px) * t;
      const ly = py + (pts[i - 1][1] - py) * t;
      const rx = px + (pts[i + 1][0] - px) * t;
      const ry = py + (pts[i + 1][1] - py) * t;
      // Peak → right flank → ragged edge back to the left flank.
      c += `M${pt(px, py)}L${pt(rx, ry)}`;
      const teeth = 4;
      for (let k = 1; k < teeth; k++) {
        const f = k / teeth;
        const ex = rx + (lx - rx) * f;
        const ey = ry + (ly - ry) * f + (k % 2 ? 1 : -0.4) * between(rand, 6, 16);
        c += `L${pt(ex, ey)}`;
      }
      c += `L${pt(lx, ly)}Z`;
    }
  }
  return { d, caps: c };
}

/** A tapered segment (branch, blade, spar) from (x0,y0) to (x1,y1), w0 → w1 wide.
 *  Always wound the same way (counter-clockwise on screen, like `blobs`), so
 *  segments and blobs can share one path. */
export function taper(x0: number, y0: number, x1: number, y1: number, w0: number, w1: number): string {
  const len = Math.hypot(x1 - x0, y1 - y0) || 1;
  const nx = -(y1 - y0) / len;
  const ny = (x1 - x0) / len;
  return (
    `M${pt(x0 + (nx * w0) / 2, y0 + (ny * w0) / 2)}` +
    `L${pt(x1 + (nx * w1) / 2, y1 + (ny * w1) / 2)}` +
    `L${pt(x1 - (nx * w1) / 2, y1 - (ny * w1) / 2)}` +
    `L${pt(x0 - (nx * w0) / 2, y0 - (ny * w0) / 2)}Z`
  );
}

/** A bare, gnarled tree: a trunk that forks again and again into thinning
 *  branches. `lean` tilts it (radians, negative = left). One path, one winding. */
export function deadTree(
  rand: Rand,
  x: number,
  base: number,
  h: number,
  { width = h * 0.08, depth = 5, spread = 0.55, lean = 0 }: { width?: number; depth?: number; spread?: number; lean?: number } = {}
): string {
  let d = '';
  const grow = (x0: number, y0: number, angle: number, len: number, w: number, level: number) => {
    const w1 = w * 0.68;
    let x1: number;
    let y1: number;
    if (w < 4) {
      // Twigs: one straight stroke, no joints — most segments are twigs, and
      // this keeps the path (and the scene file) short.
      x1 = x0 + Math.cos(angle) * len;
      y1 = y0 + Math.sin(angle) * len;
      d += taper(x0, y0, x1, y1, w, w1);
    } else {
      // A slight kink halfway makes the limbs gnarled rather than straight.
      const kink = between(rand, -0.25, 0.25);
      const mx = x0 + Math.cos(angle + kink) * len * 0.5;
      const my = y0 + Math.sin(angle + kink) * len * 0.5;
      x1 = mx + Math.cos(angle - kink * 0.6) * len * 0.5;
      y1 = my + Math.sin(angle - kink * 0.6) * len * 0.5;
      const wm = w * 0.85;
      d += taper(x0, y0, mx, my, w, wm) + taper(mx, my, x1, y1, wm, w1);
      if (w > 5) d += blobs([[mx, my, wm / 2]]);
    }
    if (level <= 0 || len < 14) return;
    if (w1 > 3) d += blobs([[x1, y1, w1 / 2]]);
    const forks = level > 2 && rand() < 0.4 ? 3 : 2;
    for (let i = 0; i < forks; i++) {
      const side = forks === 2 ? (i === 0 ? -1 : 1) : i - 1;
      const a = angle + side * spread * between(rand, 0.6, 1.2) + between(rand, -0.15, 0.15);
      grow(x1, y1, a, len * between(rand, 0.62, 0.8), w1 * between(rand, 0.6, 0.78), level - 1);
    }
  };
  // Root flare, then the trunk.
  d += `M${pt(x + width * 1.4, base)}C${pt(x + width * 0.6, base - 6)} ${pt(x + width * 0.5, base - h * 0.08)} ${pt(x + width * 0.5, base - h * 0.16)}L${pt(x - width * 0.5, base - h * 0.16)}C${pt(x - width * 0.5, base - h * 0.08)} ${pt(x - width * 0.6, base - 6)} ${pt(x - width * 1.4, base)}Z`;
  grow(x, base, -Math.PI / 2 + lean, h * 0.36, width, depth);
  return d;
}

/** A clump of reeds / grass blades rising from `base`, between x0 and x1.
 *  `heads` > 0 tops that share of the blades with a cattail (returned apart:
 *  the heads are drawn in a second path). */
export function reeds(
  rand: Rand,
  { x0, x1, base, minH, maxH, count, w = 7, lean = 0.25, heads = 0 }: {
    x0: number;
    x1: number;
    base: number;
    minH: number;
    maxH: number;
    count: number;
    w?: number;
    lean?: number;
    heads?: number;
  }
): { d: string; heads: string } {
  let d = '';
  let hd = '';
  for (let i = 0; i < count; i++) {
    const x = between(rand, x0, x1);
    const h = between(rand, minH, maxH);
    const tilt = between(rand, -lean, lean) * h;
    const tipX = x + tilt;
    const tipY = base - h;
    const cx = x + tilt * 0.15;
    const cy = base - h * 0.6;
    const bw = w * between(rand, 0.7, 1.2);
    // Base right → tip → base left: counter-clockwise like `taper`.
    d += `M${pt(x + bw / 2, base)}Q${pt(cx + bw * 0.3, cy)} ${pt(tipX, tipY)}Q${pt(cx - bw * 0.3, cy)} ${pt(x - bw / 2, base)}Z`;
    if (heads > 0 && rand() < heads) {
      const hx = x + tilt * 0.62;
      const hy = base - h * 0.62;
      const hl = Math.min(46, h * 0.18);
      hd += `M${pt(hx - bw * 0.75, hy)}h${n(bw * 1.5)}v${n(-hl)}a${n(bw * 0.75)} ${n(bw * 0.75)} 0 0 0 ${n(-bw * 1.5)} 0Z`;
    }
  }
  return { d, heads: hd };
}

/** Rectangle wound counter-clockwise (like `blobs` / `taper`). */
export function box(x0: number, y0: number, x1: number, y1: number): string {
  return `M${pt(x0, y0)}V${n(y1)}H${n(x1)}V${n(y0)}Z`;
}

/** Horizontal capsule (a mist band, a cloud streak, a plank), counter-clockwise. */
export function pill(x0: number, y: number, x1: number, h: number): string {
  const r = h / 2;
  return `M${pt(x1 - r, y)}H${n(x0 + r)}A${n(r)} ${n(r)} 0 0 0 ${pt(x0 + r, y + h)}H${n(x1 - r)}A${n(r)} ${n(r)} 0 0 0 ${pt(x1 - r, y)}Z`;
}

/** A small bird in flight (a gull, a crow): two swept wings. */
export function bird(x: number, y: number, s: number): string {
  return (
    `M${pt(x, y)}C${pt(x - s * 0.35, y - s * 0.45)} ${pt(x - s * 0.75, y - s * 0.4)} ${pt(x - s, y - s * 0.05)}` +
    `C${pt(x - s * 0.7, y - s * 0.22)} ${pt(x - s * 0.35, y - s * 0.12)} ${pt(x, y + s * 0.14)}` +
    `C${pt(x + s * 0.35, y - s * 0.12)} ${pt(x + s * 0.7, y - s * 0.22)} ${pt(x + s, y - s * 0.05)}` +
    `C${pt(x + s * 0.75, y - s * 0.4)} ${pt(x + s * 0.35, y - s * 0.45)} ${pt(x, y)}Z`
  );
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
