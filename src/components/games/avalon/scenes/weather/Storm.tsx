'use client';

import { useEffect, useRef } from 'react';
import { serverNow } from '@/lib/serverClock';

// Length of one lightning cycle (two flashes, 9 s and 13 s apart); must match
// the `av-lightning` keyframes in avalon.css.
const LIGHTNING_CYCLE_MS = 22_000;

// The storm over the dangerous 4th quest (two fails needed — getScene sets
// `storm`). Laid over the location's scene: the scene darkens, two sheets of
// slanted rain slide down (each a repeating tile moved by exactly one tile,
// so it loops seamlessly), and now and then lightning lights everything up.
// CSS only, 4 elements, animating transform and opacity.
//
// The lightning cycle is phased on the shared server clock, so every device
// flashes at the same moment. With reduced motion the rain stands still and
// there is no lightning (its resting opacity is 0).
export default function Storm() {
  const lightning = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // A style tweak on mount, not state: nothing re-renders.
    if (lightning.current) lightning.current.style.animationDelay = `${-(serverNow() % LIGHTNING_CYCLE_MS)}ms`;
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden" data-storm="">
      <div className="av-storm-dim absolute inset-0" />
      <div className="av-rain av-rain-far" />
      <div className="av-rain av-rain-near" />
      <div ref={lightning} className="av-lightning absolute inset-0" />
    </div>
  );
}
