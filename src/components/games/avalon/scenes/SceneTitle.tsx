'use client';

import { useEffect, useState } from 'react';
import { serverNow } from '@/lib/serverClock';
import { sceneLine } from './narration';
import { SCENE_NAMES_VI, type SceneId, type SceneResult } from './types';

// How long a title stays up (fade in, hold, fade out) — the `av-scene-title`
// keyframes in avalon.css last as long.
const SHOW_MS = 2600;
// A title only appears in the first 3 s of a phase, so a device that reloads
// (or whose state arrives late) does not replay it.
const FRESH_MS = 3000;
// No floating title for:
// - the great hall (the line-up and the role letter: the table is busy
//   shuffling seats and spinning the crown, and the lobby was the hall too);
// - the night (the table's veil says the night's call already);
// - the end scenes, which tell their line in the end screen's story instead
//   (EndSection; a title would sit on the seats turning over).
const NO_TITLE: ReadonlySet<SceneId> = new Set(['hall', 'night', 'end-good', 'end-evil']);

const ROMAN = ['I', 'II', 'III', 'IV', 'V'] as const;

interface Title {
  id: SceneId;
  /** phaseStartedAt of the phase that brought the scene in. */
  at: number;
  /** How far into the title we already are when it mounts (negative delay). */
  late: number;
  kicker: string | null;
  /** The place's name (all a phone shows). */
  name: string;
  /** The full heading of a wide table ("Dựng trại trước …"). */
  heading: string;
  line: string;
}

function titleFor(scene: SceneResult, quest: number, seedKey: string): Pick<Title, 'kicker' | 'name' | 'heading' | 'line'> {
  const q = ROMAN[Math.min(Math.max(quest, 0), 4)];
  const line = sceneLine(scene.id, seedKey);
  const name = SCENE_NAMES_VI[scene.id];
  if (scene.id === 'camp') {
    return {
      kicker: `Trước Quest ${q}`,
      name,
      heading: scene.location ? `Dựng trại trước ${SCENE_NAMES_VI[scene.location]}` : name,
      line,
    };
  }
  if (scene.location === scene.id) return { kicker: `Quest ${q}`, name, heading: name, line };
  return { kicker: null, name, heading: name, line };
}

// When the scene changes, the place's name appears on the table for ~2.5 s —
// on its surface, in the band between the upper seats and the quest tiles
// (RoundTable is a square size container; the band is free of every seat at
// 300–1440px and 5–10 players, measured), so it never covers a seat or a tile.
// A phone shows the name alone; a wide table (≥ 600px: a desktop or a tablet)
// adds the quest and one line of narration.
//
// Decorative and the same on every device: the scene comes from the shared
// state, the line from the game's seed, and the timing from phaseStartedAt on
// the server clock (ux-plan 2.2). Never blocks a tap (pointer-events: none).
// With reduced motion the title still shows, without moving, for the same time.
export default function SceneTitle({
  scene,
  startedAt,
  quest,
  seedKey,
}: {
  scene: SceneResult;
  /** state.phaseStartedAt. */
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
      startedAt !== null && late < FRESH_MS && !NO_TITLE.has(scene.id)
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
      className="pointer-events-none absolute inset-x-[35%] top-[24.5%] z-[5] flex h-[12%] items-center justify-center @min-[600px]:inset-x-[32%] @min-[600px]:top-[16%] @min-[600px]:h-[24%]"
      data-scene-title-band=""
    >
      {title && (
        <div
          key={`${title.id}:${title.at}`}
          data-scene-title={title.id}
          className="av-scene-title max-h-full w-full overflow-hidden px-1 py-0.5 text-center @min-[600px]:px-3 @min-[600px]:py-1.5"
          style={{ animationDelay: `${-Math.round(title.late)}ms` }}
          suppressHydrationWarning
        >
          {title.kicker && (
            <p className="hidden text-xs font-bold uppercase tracking-[0.3em] text-(--av-gold) @min-[600px]:block">{title.kicker}</p>
          )}
          <h2 className="av-display text-balance text-[clamp(12px,4.4cqw,20px)] leading-[1.1] text-(--av-parchment) @min-[600px]:hidden">
            {title.name}
          </h2>
          <h2 className="av-display hidden text-balance text-[clamp(1.25rem,3.6cqw,1.75rem)] leading-tight text-(--av-parchment) @min-[600px]:block">
            {title.heading}
          </h2>
          <div className="hidden @min-[600px]:block">
            <p className="mt-1 line-clamp-3 text-balance text-sm italic leading-snug text-(--av-text-2)">{title.line}</p>
          </div>
        </div>
      )}
    </div>
  );
}
