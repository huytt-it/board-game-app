// The game's journey: which location each of the 5 quests takes place in.
// Shuffled per game, identical on every device: the seed is the seat order,
// which is random per game, the same everywhere and fixed for the whole game.
import { LOCATION_IDS, type LocationId } from './types';

// FNV-1a 32-bit — tiny and stable across devices.
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// mulberry32: a small seeded PRNG returning floats in [0, 1).
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Journey = readonly [LocationId, LocationId, LocationId, LocationId, LocationId];

// One-entry memo: every render of every component asks for the same journey.
let memoKey: string | null = null;
let memoJourney: Journey | null = null;

/** The game's seed: its seat order, or the room id while that is empty. Also
 *  picks the narration lines (narration.ts). */
export function journeyKey(state: { seatOrder?: string[] } | null | undefined, roomId: string): string {
  const seatOrder = state?.seatOrder ?? [];
  return seatOrder.length > 0 ? seatOrder.join('|') : `room:${roomId}`;
}

export function getJourney(state: { seatOrder?: string[] } | null | undefined, roomId: string): Journey {
  const key = journeyKey(state, roomId);
  if (key === memoKey && memoJourney) return memoJourney;

  const rand = mulberry32(hashString(key));
  const pool: LocationId[] = [...LOCATION_IDS];
  // Fisher–Yates.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const journey = pool.slice(0, 5) as unknown as Journey;

  memoKey = key;
  memoJourney = journey;
  return journey;
}
