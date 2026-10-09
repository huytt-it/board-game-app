// Animation timelines of the quest loop (ux-plan GĐ3, budgets in Phụ lục D).
// Every moment is in ms after state.phaseStartedAt, so all devices play the
// same frame and a reload lands on the right one (usePhaseTimeline / useCue).
// The stage arrays are module-level constants: usePhaseTimeline needs them
// referentially stable.
import type { TimelineStage } from '../hooks/usePhaseTimeline';
import { mulberry32 } from '../scenes/journey';

// ─── lineup-preview (60 s on screen, animation ~4 s) — GĐ4 ─────────
export const LINEUP = {
  /** 0–1.2 s: the seats slide from the order people joined in to the
   *  game's seat order (seatOrder). */
  shuffleMs: 1200,
  /** 1.2–3.2 s: the crown circles the table, slows down and stops on the
   *  first Leader. It starts on seat 0 and goes `spinTurns` full turns plus
   *  the Leader's seat index — the same on every device. */
  spinAt: 1200,
  spinMs: 2000,
  spinTurns: 2,
  /** 3.2 s: the Lady of the Lake is set down (7+ players). */
  ladyAt: 3200,
  /** 0–0.6 s: the parchment of roles unrolls; from 0.6 s the role chips
   *  fly onto it, 80 ms apart (≤ 10 chips: done by ~1.8 s). */
  unrollMs: 600,
  chipsAt: 600,
  chipGapMs: 80,
} as const;

// ─── night-* (45 s each, animation ~1.5 s) — GĐ4 ──────────────────
export const NIGHT = {
  /** The veil settles over the table, then the call ("… mở mắt") rises. */
  veilMs: 600,
  callAt: 300,
} as const;

// ─── team-vote-result (8 s on screen, animation ≤ 5 s) ─────────────
export const VOTE_RESULT = {
  /** 0–0.6 s: the title comes in. */
  titleMs: 600,
  /** 0.6–2.6 s: the two tallies roll up. */
  countAt: 600,
  countMs: 2000,
  /** 2.8 s: the APPROVED / REJECTED stamp. */
  stampAt: 2800,
  /** 3.5 s: a rejected team snuffs out one candle of the reject track. */
  candleAt: 3500,
  /** Everything has settled — a second and a half before the 5 s budget. */
  doneAt: 4200,
} as const;

export type VoteResultStage = 'count' | 'stamp' | 'candle' | 'done';
export const VOTE_RESULT_STAGES: readonly TimelineStage<VoteResultStage>[] = [
  { id: 'count', at: 0 },
  { id: 'stamp', at: VOTE_RESULT.stampAt },
  { id: 'candle', at: VOTE_RESULT.candleAt },
  { id: 'done', at: VOTE_RESULT.doneAt },
];

// ─── quest-result (8 s on screen, animation ≤ 5.5 s) ───────────────
// 0–0.8 s the pile is shuffled and dealt into a row; then the cards are turned
// one by one, 0.6 s apart (0.4 s per flip); 0.4 s after the last one the
// SUCCESS / FAILED stamp lands and the quest's tile on the table is sealed.
export const QUEST_RESULT = {
  shuffleMs: 800,
  flipGapMs: 600,
  flipMs: 400,
  stampGapMs: 400,
  stampMs: 450,
} as const;

export type QuestResultStage = 'reveal' | 'stamp' | 'done';

export interface QuestResultTimeline {
  /** When card `i` (0-based, in reveal order) starts turning over. */
  flipAt: (i: number) => number;
  stampAt: number;
  doneAt: number;
  stages: readonly TimelineStage<QuestResultStage>[];
}

const questTimelines = new Map<number, QuestResultTimeline>();

/** The timeline for a team of `cards` (2–5). Memoised: stable per size. */
export function questResultTimeline(cards: number): QuestResultTimeline {
  const n = Math.max(1, Math.min(5, Math.round(cards) || 1));
  let tl = questTimelines.get(n);
  if (!tl) {
    const flipAt = (i: number) => QUEST_RESULT.shuffleMs + QUEST_RESULT.flipGapMs * i;
    const stampAt = flipAt(n - 1) + QUEST_RESULT.flipMs + QUEST_RESULT.stampGapMs;
    const doneAt = stampAt + 600;
    tl = {
      flipAt,
      stampAt,
      doneAt,
      stages: [
        { id: 'reveal', at: 0 },
        { id: 'stamp', at: stampAt },
        { id: 'done', at: doneAt },
      ],
    };
    questTimelines.set(n, tl);
  }
  return tl;
}

/**
 * The order the quest's cards are turned over in. The database only keeps the
 * NUMBER of fail cards (failCount), never who played what — so the row is
 * rebuilt from the counts and shuffled with the phase's start time as the seed
 * (ux-plan 2.4): the same on every device, unrelated to the players.
 */
export function questRevealOrder(teamSize: number, failCount: number, seed: number): ('success' | 'fail')[] {
  const fails = Math.max(0, Math.min(teamSize, failCount));
  const cards: ('success' | 'fail')[] = [
    ...Array<'success'>(Math.max(0, teamSize - fails)).fill('success'),
    ...Array<'fail'>(fails).fill('fail'),
  ];
  const rand = mulberry32(seed % 4294967296);
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

// ─── The two moments the table / roster / top bar wait for ─────────
/** team-vote-result (rejected): the new candle goes out. */
export const CANDLE_STAGES: readonly TimelineStage<'lit' | 'out'>[] = [
  { id: 'lit', at: 0 },
  { id: 'out', at: VOTE_RESULT.candleAt },
];

const sealStages = new Map<number, readonly TimelineStage<'hidden' | 'sealed'>[]>();
/** quest-result: the quest's result is shown (sealed) at the stamp. */
export function questSealStages(cards: number): readonly TimelineStage<'hidden' | 'sealed'>[] {
  const tl = questResultTimeline(cards);
  let st = sealStages.get(tl.stampAt);
  if (!st) {
    st = [
      { id: 'hidden', at: 0 },
      { id: 'sealed', at: tl.stampAt },
    ];
    sealStages.set(tl.stampAt, st);
  }
  return st;
}

// Phases without a timeline of their own on the table.
export const IDLE_STAGES: readonly TimelineStage<'idle'>[] = [{ id: 'idle', at: 0 }];

// ─── end (no time limit) — GĐ5 ─────────────────────────────────────
// When the Assassin struck, the assassination overlay plays first
// (panel/AssassinRevealOverlay, 0–7.95 s); the end itself starts at the
// "reveal" moment R = the end of the overlay — or 0 when the game ended any
// other way (three failed quests, five rejected teams, the Assassin's time
// ran out). A player who taps the overlay away moves R to that moment on
// their own screen only (decorative, local).
export const END = {
  /** The assassination overlay (its last stage, "done"). */
  overlayMs: 7950,
  /** R: the personal banner ("Bạn thắng!" / "Bạn thua…") rises. */
  bannerMs: 600,
  /** R … R+3 s: gold sparks (Good won) or embers (Evil won), ≤ 30. */
  sparksMs: 3000,
  /** R+0.3 s: the seats turn over to their roles, in seat order, 150 ms
   *  apart (10 seats: the last one lands at R+2.15 s). */
  flipAt: 300,
  flipGapMs: 150,
  flipMs: 500,
  /** R+0.5 s: the assassination card; R+0.7 s: the journey, one leg every
   *  120 ms; then the list of roles. */
  stabAt: 500,
  summaryAt: 700,
  legGapMs: 120,
  rolesAt: 1500,
  /** Everything has settled (the sparks are the last to go). */
  doneMs: 3000,
} as const;

export type EndStage = 'overlay' | 'reveal' | 'done';

const endStages = new Map<number, readonly TimelineStage<EndStage>[]>();
/** The end's stages for a reveal moment `revealAt` (memoised: stable per R). */
export function endTimeline(revealAt: number): readonly TimelineStage<EndStage>[] {
  const r = Math.max(0, Math.round(revealAt));
  let st = endStages.get(r);
  if (!st) {
    st = [
      ...(r > 0 ? [{ id: 'overlay' as const, at: 0 }] : []),
      { id: 'reveal', at: r },
      { id: 'done', at: r + END.doneMs },
    ];
    endStages.set(r, st);
  }
  return st;
}
