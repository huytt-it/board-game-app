'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { SCENES, type AssetSource } from '../assets/registry';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { between, H, rng, W } from './paper';
import { hashString } from './journey';
import type { ParticleGroup, SceneId } from './types';

// Full-screen paper-cut scene behind the Avalon UI. The scene id comes from
// getScene(state) so every device shows the same one; this component only
// draws it. Stack, far → near: the scene's layers, its particles, the storm
// (GĐ2b; a flat placeholder for now), then a vignette + dim layer that keeps
// the text on top readable.
//
// Framing: every layer is a 1600×900 picture laid out on a "stage" that covers
// the screen and is anchored bottom-centre (= SVG `xMidYMax slice`). A phone in
// portrait sees the full height and the middle ~420 units of the width, so each
// scene keeps its focal point in the centre, lower half.
//
// A scene change crossfades (700ms): the old scene stays mounted under the new
// one until the new one has faded in. That fade is a local, decorative
// transition — on first mount (or a reload) the scene simply appears, and so
// does a change in the first moments after mount (the "loading" hall giving
// way to the game's real scene once the state arrives).
const SETTLE_MS = 1500;

export default function SceneBackdrop({ sceneId, storm = false }: { sceneId: SceneId; storm?: boolean }) {
  const reduced = useReducedMotion();
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSettled(true), SETTLE_MS);
    return () => clearTimeout(t);
  }, []);
  // Keys only grow; the scene shown on mount never fades in.
  const [stack, setStack] = useState<{ id: SceneId; key: number; fade?: boolean }[]>([{ id: sceneId, key: 0 }]);
  const top = stack[stack.length - 1];
  if (top.id !== sceneId) {
    // Adjusting state while rendering (React's "derived state" pattern): keep
    // at most the previous scene underneath while the new one fades in.
    const next = { id: sceneId, key: top.key + 1, fade: settled && !reduced };
    setStack(next.fade ? [top, next] : [next]);
  }

  return (
    <div
      aria-hidden="true"
      data-scene={top.id}
      className="avalon-root av-scene pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{ backgroundColor: SCENES[stack[0].id].palette.base }}
    >
      {stack.map((s) => (
        <SceneView
          key={s.key}
          id={s.id}
          fadeIn={!!s.fade}
          // Once this scene is fully in, drop everything underneath it.
          onShown={() => setStack((list) => list.filter((x) => x.key >= s.key))}
        />
      ))}
      {storm && <div className="av-storm-placeholder absolute inset-0" data-storm="placeholder" />}
      <div className="av-scene-shade absolute inset-0" />
    </div>
  );
}

function SceneView({ id, fadeIn, onShown }: { id: SceneId; fadeIn: boolean; onShown: () => void }) {
  const def = SCENES[id];
  return (
    <div
      className={`absolute inset-0 ${fadeIn ? 'av-scene-enter' : ''}`}
      style={{ backgroundColor: def.palette.base }}
      data-scene-view={id}
      data-placeholder={def.placeholder ? '' : undefined}
      onAnimationEnd={(e) => {
        if (e.target === e.currentTarget) onShown();
      }}
    >
      <div className="av-scene-stage">
        {def.layers.map((layer, i) => (
          <SceneLayer key={i} src={layer} />
        ))}
        {def.particles && <Particles sceneId={id} groups={def.particles} />}
      </div>
    </div>
  );
}

function SceneLayer({ src }: { src: AssetSource }) {
  if (src.kind === 'image') {
    return (
      // A full-frame decorative picture; next/image would add nothing here.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src.src}
        alt=""
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover object-bottom"
      />
    );
  }
  const Svg = src.Component;
  return <Svg className="absolute inset-0 h-full w-full" />;
}

// Per-kind defaults: particle size (px) and animation length range (s).
const KIND: Record<ParticleGroup['kind'], { size: number; dur: [number, number] }> = {
  firefly: { size: 4, dur: [6, 10] },
  ember: { size: 3, dur: [2.6, 4.4] },
  twinkle: { size: 3, dur: [2.4, 5] },
  mote: { size: 3, dur: [12, 18] },
  flicker: { size: 120, dur: [0.9, 1.6] },
};

// Ambient particles, CSS-animated (transform + opacity only). Seeded by the
// scene id, so positions are identical on every render, server and client.
// Negative delays start each one mid-cycle instead of all at once.
function Particles({ sceneId, groups }: { sceneId: SceneId; groups: readonly ParticleGroup[] }) {
  const items = useMemo(() => {
    const rand = rng(hashString(sceneId));
    const out: { key: string; className: string; style: CSSProperties }[] = [];
    groups.forEach((g, gi) => {
      const k = KIND[g.kind];
      const size = g.size ?? k.size;
      for (let i = 0; i < g.count; i++) {
        const x = between(rand, g.area[0], g.area[2]);
        const y = between(rand, g.area[1], g.area[3]);
        const dur = between(rand, k.dur[0], k.dur[1]);
        out.push({
          key: `${gi}-${i}`,
          className: `av-particle av-particle-${g.kind}`,
          style: {
            left: `${((x / W) * 100).toFixed(2)}%`,
            top: `${((y / H) * 100).toFixed(2)}%`,
            width: size,
            height: size,
            marginLeft: -size / 2,
            marginTop: -size / 2,
            color: g.color,
            animationDuration: `${dur.toFixed(2)}s`,
            animationDelay: `${(-between(rand, 0, dur)).toFixed(2)}s`,
            ['--dx' as string]: `${Math.round(between(rand, -36, 36))}px`,
            ['--dy' as string]: `${Math.round(between(rand, -40, 10))}px`,
          },
        });
      }
    });
    return out;
  }, [sceneId, groups]);

  return (
    <>
      {items.map((p) => (
        <span key={p.key} className={p.className} style={p.style} />
      ))}
    </>
  );
}
