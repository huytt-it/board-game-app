'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useReducedMotion } from '@/components/games/shared/hooks/useReducedMotion';
import { between, H, rng, W } from '@/components/games/avalon/scenes/paper';
import { hashString } from '@/components/games/avalon/scenes/journey';
import { SCENES, type AssetSource } from '../assets/registry';
import type { ParticleGroup, SceneId } from './types';

// Cảnh cắt giấy phủ kín màn hình, phía sau giao diện Ma Sói (mẫu: Avalon
// scenes/SceneBackdrop). Cảnh do getScene(state) chọn theo phase, nên mọi máy
// và mọi vai thấy như nhau; component này chỉ vẽ. Chồng lớp, xa → gần: các lớp
// của cảnh, hạt hiệu ứng, rồi vignette + lớp tối để chữ phía trên đọc được.
//
// Đổi cảnh: crossfade 700 ms (cảnh cũ nằm dưới tới khi cảnh mới hiện xong).
// Lần mount đầu (hay reload) cảnh hiện ngay; đổi cảnh trong 1,5 s đầu sau khi
// mount (sảnh "đang tải" nhường cho cảnh thật) cũng hiện ngay. Giảm chuyển
// động: đổi ngay, không hạt.
const SETTLE_MS = 1500;

export default function SceneBackdrop({ sceneId }: { sceneId: SceneId }) {
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
          fadeIn={!!s.fade}
          onShown={() => setStack((list) => list.filter((x) => x.key >= s.key))}
        />
      ))}
      <div className="ww-scene-shade absolute inset-0" />
    </div>
  );
}

function SceneView({ id, fadeIn, onShown }: { id: SceneId; fadeIn: boolean; onShown: () => void }) {
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
      // Ảnh trang trí phủ kín khung; next/image không thêm được gì.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src.src} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover object-bottom" />
    );
  }
  const Svg = src.Component;
  return <Svg className="absolute inset-0 h-full w-full" />;
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
