'use client';

import { useEffect, useState } from 'react';
import { serverNow } from '@/lib/serverClock';
import { avalonDisplayFont } from '../assets/fonts';
import { sceneLine } from './narration';
import { SCENE_NAMES_VI, type SceneId, type SceneResult } from './types';

// How long a title stays up (fade in, hold, fade out) — the `av-scene-title`
// keyframes in avalon.css last as long.
const SHOW_MS = 2600;
// A title only appears in the first 3 s of a phase, so a device that reloads
// (or whose state arrives late) does not replay it.
const FRESH_MS = 3000;

const ROMAN = ['I', 'II', 'III', 'IV', 'V'] as const;

interface Title {
  id: SceneId;
  /** phaseStartedAt of the phase that brought the scene in. */
  at: number;
  /** How far into the title we already are when it mounts (negative delay). */
  late: number;
  kicker: string | null;
  heading: string;
  line: string;
}

function titleFor(scene: SceneResult, quest: number, seedKey: string): Pick<Title, 'kicker' | 'heading' | 'line'> {
  const q = ROMAN[Math.min(Math.max(quest, 0), 4)];
  const line = sceneLine(scene.id, seedKey);
  if (scene.id === 'camp') {
    return {
      kicker: `Trước Quest ${q}`,
      heading: scene.location ? `Dựng trại trước ${SCENE_NAMES_VI[scene.location]}` : SCENE_NAMES_VI.camp,
      line,
    };
  }
  if (scene.location === scene.id) return { kicker: `Quest ${q}`, heading: SCENE_NAMES_VI[scene.id], line };
  return { kicker: null, heading: SCENE_NAMES_VI[scene.id], line };
}

// When the scene changes, the place's name and one line of narration appear
// near the top for ~2.5 s. Decorative and the same on every device: the scene
// comes from the shared state, the line from the game's seed, and the timing
// from phaseStartedAt on the server clock. Never blocks a tap
// (pointer-events: none). With reduced motion the title still shows, without
// moving, for the same time.
export default function SceneTitle({
  scene,
  startedAt,
  quest,
  seedKey,
}: {
  scene: SceneResult;
  /** state.phaseStartedAt — null in the lobby, where no title is shown. */
  startedAt: number | null;
  /** state.currentQuest (0-based). */
  quest: number;
  /** Identifies the game (journeyKey), to pick the narration line. */
  seedKey: string;
}) {
  const [seen, setSeen] = useState<SceneId | null>(null);
  const [title, setTitle] = useState<Title | null>(null);
  if (scene.id !== seen) {
    // Adjusting state while rendering ("derived state"): the scene changed, or
    // this is the first one this component sees.
    setSeen(scene.id);
    const late = startedAt === null ? Infinity : serverNow() - startedAt;
    setTitle(
      startedAt !== null && late < FRESH_MS
        ? { id: scene.id, at: startedAt, late: Math.max(0, late), ...titleFor(scene, quest, seedKey) }
        : null
    );
  }

  useEffect(() => {
    if (!title) return;
    const t = setTimeout(() => setTitle((cur) => (cur === title ? null : cur)), Math.max(0, title.at + SHOW_MS - serverNow()));
    return () => clearTimeout(t);
  }, [title]);

  return (
    <div
      aria-live="polite"
      className={`avalon-root ${avalonDisplayFont.variable} pointer-events-none fixed inset-x-0 top-[max(4.5rem,11vh)] z-40 flex justify-center px-4`}
    >
      {title && (
        <div
          key={`${title.id}:${title.at}`}
          data-scene-title={title.id}
          className="av-scene-title max-w-xl px-8 py-3 text-center"
          style={{ animationDelay: `${-Math.round(title.late)}ms` }}
          suppressHydrationWarning
        >
          {title.kicker && (
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-(--av-gold)">{title.kicker}</p>
          )}
          <h2 className="av-display text-balance text-[1.75rem] leading-tight text-(--av-parchment) sm:text-4xl">{title.heading}</h2>
          <p className="mt-1 text-balance text-sm italic leading-snug text-slate-200">{title.line}</p>
        </div>
      )}
    </div>
  );
}
