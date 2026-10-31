'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useCue } from '@/components/games/shared/hooks/useCue';
import { useReducedMotion } from '@/components/games/shared/hooks/useReducedMotion';
import { between, H, rng, W } from '@/components/games/avalon/scenes/paper';
import { hashString } from '@/components/games/avalon/scenes/journey';
import { SCENES, type SceneLayerDef } from '../assets/registry';
import type { ParticleGroup, SceneId, SceneTint } from './types';

// Cảnh cắt giấy phủ kín màn hình, phía sau giao diện Ma Sói (mẫu: Avalon
// scenes/SceneBackdrop). Cảnh do getScene(state) chọn theo phase, nên mọi máy
// và mọi vai thấy như nhau; component này chỉ vẽ. Chồng lớp, xa → gần: các lớp
// của cảnh, hạt hiệu ứng, rồi vignette + lớp tối để chữ phía trên đọc được.
//
// Đổi cảnh: crossfade 700 ms (cảnh cũ nằm dưới tới khi cảnh mới hiện xong).
// Lần mount đầu (hay reload) cảnh hiện ngay; đổi cảnh trong 1,5 s đầu sau khi
// mount (sảnh "đang tải" nhường cho cảnh thật) cũng hiện ngay. Giảm chuyển
// động: đổi ngay, không hạt.
//
// Chuyển động của cảnh (GĐ4): `motionAt` = phaseStartedAt của bước có chuyển
// động (getSceneMotion), null = đứng yên. Chỉ cảnh đang lên trên cùng nhận nó;
// lớp `motion: 'rise'` (mặt trời / trăng) và lớp "trời sáng dần" mount lại theo
// mốc đó và chạy theo đồng hồ chung (useCue): reload giữa chừng thì vào đúng
// khung. Khung tĩnh = khung cuối, nên giảm chuyển động chỉ thấy khung cuối.
const SETTLE_MS = 1500;

export default function SceneBackdrop({ sceneId, motionAt = null }: { sceneId: SceneId; motionAt?: number | null }) {
  const reduced = useReducedMotion();
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSettled(true), SETTLE_MS);
    return () => clearTimeout(t);
  }, []);
  const [stack, setStack] = useState<{ id: SceneId; key: number; fade?: boolean }[]>([{ id: sceneId, key: 0 }]);
  const top = stack[stack.length - 1];
  if (top.id !== sceneId) {
    // Điều chỉnh state trong lúc render (mẫu "derived state" của React): giữ
    // nhiều nhất cảnh trước nằm dưới trong lúc cảnh mới mờ dần lên.
    const next = { id: sceneId, key: top.key + 1, fade: settled && !reduced };
    setStack(next.fade ? [top, next] : [next]);
  }

  return (
    <div
      aria-hidden="true"
      data-ww-scene={top.id}
      className="ww-scene pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{ backgroundColor: SCENES[stack[0].id].palette.base }}
    >
      {stack.map((s) => (
        <SceneView
          key={s.key}
          id={s.id}
          motionAt={s.key === top.key ? motionAt : null}
          fadeIn={!!s.fade}
          onShown={() => setStack((list) => list.filter((x) => x.key >= s.key))}
        />
      ))}
      <div className="ww-scene-shade absolute inset-0" />
    </div>
  );
}

function SceneView({ id, motionAt, fadeIn, onShown }: { id: SceneId; motionAt: number | null; fadeIn: boolean; onShown: () => void }) {
  const def = SCENES[id];
  return (
    <div
      className={`absolute inset-0 ${fadeIn ? 'ww-scene-enter' : ''}`}
      style={{ backgroundColor: def.palette.base }}
      data-ww-scene-view={id}
      onAnimationEnd={(e) => {
        if (e.target === e.currentTarget) onShown();
      }}
    >
      <div className="ww-scene-stage">
        {def.layers.map((layer, i) =>
          layer.motion && motionAt !== null ? (
            <MovingLayer key={`${i}@${motionAt}`} src={layer} startedAt={motionAt} />
          ) : (
            <SceneLayer key={i} src={layer} />
          )
        )}
        {def.tint && <SceneTintLayer tint={def.tint} />}
        {def.particles && <Particles sceneId={id} groups={def.particles} />}
        {def.intro === 'brighten' && motionAt !== null && <Brighten key={motionAt} startedAt={motionAt} />}
      </div>
    </div>
  );
}

function SceneLayer({ src, className = '', style }: { src: SceneLayerDef; className?: string; style?: CSSProperties }) {
  if (src.kind === 'image') {
    return (
      // Ảnh trang trí phủ kín khung; next/image không thêm được gì.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src.src} alt="" draggable={false} className={`absolute inset-0 h-full w-full object-cover object-bottom ${className}`} style={style} />
    );
  }
  const Svg = src.Component;
  return <Svg className={`absolute inset-0 h-full w-full ${className}`} style={style} />;
}

/** Đổi bảng màu của cả chồng lớp (GĐ5b): lớp màu phẳng hoà trộn lên các lớp phía dưới. */
export function SceneTintLayer({ tint }: { tint: SceneTint }) {
  return <div className="absolute inset-0" style={{ backgroundColor: tint.color, mixBlendMode: tint.blend, opacity: tint.opacity }} data-ww-scene-tint="" />;
}

// Mặt trời / trăng nhô lên sau đồi (scenes/timelines.ts: DAWN.sunMs, NIGHTFALL.moonMs).
function MovingLayer({ src, startedAt }: { src: SceneLayerDef; startedAt: number }) {
  const cue = useCue(startedAt);
  return <SceneLayer src={src} className="ww-a-rise" style={{ animationDelay: cue(0) }} />;
}

// Bình minh: trời sáng dần (lớp tối phủ cả cảnh mờ đi trong DAWN.sunMs).
function Brighten({ startedAt }: { startedAt: number }) {
  const cue = useCue(startedAt);
  return <div className="ww-a-brighten absolute inset-0" style={{ animationDelay: cue(0) }} />;
}

// Cỡ hạt (px) và độ dài một vòng animation (s) mặc định theo loại.
const KIND: Record<ParticleGroup['kind'], { size: number; dur: [number, number] }> = {
  twinkle: { size: 3, dur: [2.4, 5] },
  firefly: { size: 4, dur: [6, 10] },
  mote: { size: 3, dur: [12, 18] },
  flicker: { size: 120, dur: [0.9, 1.6] },
};

// Hạt hiệu ứng (CSS, chỉ transform + opacity). Rải theo seed là id cảnh, nên vị
// trí giống hệt nhau mỗi lần render, trên mọi máy. Delay âm: mỗi hạt bắt đầu
// giữa chừng một vòng thay vì cùng lúc.
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
          className: `ww-particle ww-particle-${g.kind}`,
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
