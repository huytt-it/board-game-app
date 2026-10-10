import { SCENES, type AssetSource } from '../assets/registry';
import type { SceneId } from './types';

// The part of the 1600×900 frame a thumbnail shows: the middle, lower half,
// where every scene keeps its focal point (4:3).
const CROP = { x: 440, y: 300, w: 720, h: 540 };

// A small picture of a scene — its layers (no particles) cropped to the focal
// area. Goes through the same registry as the backdrop, so a layer swapped for
// an image shows in the thumbnail too. Fills its (relatively positioned,
// 4:3) parent.
export default function SceneThumb({ id, className = '' }: { id: SceneId; className?: string }) {
  const def = SCENES[id];
  return (
    <span
      aria-hidden="true"
      className={`absolute inset-0 overflow-hidden ${className}`}
      style={{ backgroundColor: def.palette.base }}
    >
      {def.layers.map((layer, i) => (
        <ThumbLayer key={i} src={layer} />
      ))}
    </span>
  );
}

function ThumbLayer({ src }: { src: AssetSource }) {
  if (src.kind === 'image') {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src.src}
        alt=""
        draggable={false}
        className="absolute max-w-none"
        style={{
          width: `${(1600 / CROP.w) * 100}%`,
          height: `${(900 / CROP.h) * 100}%`,
          left: `${(-CROP.x / CROP.w) * 100}%`,
          top: `${(-CROP.y / CROP.h) * 100}%`,
        }}
      />
    );
  }
  const Svg = src.Component;
  return (
    <Svg
      viewBox={`${CROP.x} ${CROP.y} ${CROP.w} ${CROP.h}`}
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
    />
  );
}
