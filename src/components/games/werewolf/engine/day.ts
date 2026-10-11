// Bỏ phiếu ban ngày (rules §5.9).

import { isValidTarget } from './night.ts';
import { aliveIds, inSeatOrder } from './table.ts';
import type { DayBallot, WwTable } from './types.ts';

export interface DayVoteCount {
  targetId: string;
  votes: number;
}

export type DayVoteOutcome =
  | 'executed'
  | 'no-votes' // M = 0
  | 'tie' // từ hai người cùng đạt M
  | 'skips'; // B ≥ M

export interface DayVoteResult {
  /**
   * Phiếu của mọi người còn sống, công khai ở bước Kết quả. Không bầu, hoặc
   * bầu sai (tự bầu mình, bầu người chết), tính là 'skip' (E23).
   */
  ballots: Record<string, DayBallot>;
  /** Phiếu theo người bị bầu (> 0), theo thứ tự ghế. */
  counts: DayVoteCount[];
  /** B: số phiếu Bỏ qua. */
  skips: number;
  /** M: số phiếu cao nhất của một người. */
  top: number;
  executedId: string | null;
  outcome: DayVoteOutcome;
}

/** Phiếu đã chuẩn hoá của mọi người còn sống, theo thứ tự ghế. */
export function normalizeBallots(table: WwTable, votes: Record<string, DayBallot | null | undefined>): Record<string, DayBallot> {
  const out: Record<string, DayBallot> = {};
  for (const voterId of aliveIds(table)) {
    const v = votes[voterId];
    out[voterId] = v && v !== 'skip' && isValidTarget(table, voterId, 'vote', v) ? v : 'skip';
  }
  return out;
}

/**
 * Gọi M là số phiếu cao nhất, B là số Bỏ qua. M = 0, hoặc từ hai người cùng
 * đạt M, hoặc B ≥ M thì không ai bị treo (E22). Không thì người đạt M bị treo.
 */
export function tallyDayVote(table: WwTable, votes: Record<string, DayBallot | null | undefined>): DayVoteResult {
  const ballots = normalizeBallots(table, votes);
  const tally = new Map<string, number>();
  let skips = 0;
  for (const v of Object.values(ballots)) {
    if (v === 'skip') skips++;
    else tally.set(v, (tally.get(v) ?? 0) + 1);
  }
  const counts = inSeatOrder(table, tally.keys()).map((targetId) => ({ targetId, votes: tally.get(targetId) ?? 0 }));
  const top = counts.reduce((m, c) => Math.max(m, c.votes), 0);
  const leaders = counts.filter((c) => c.votes === top);
  let outcome: DayVoteOutcome = 'executed';
  if (top === 0) outcome = 'no-votes';
  else if (leaders.length > 1) outcome = 'tie';
  else if (skips >= top) outcome = 'skips';
  return {
    ballots,
    counts,
    skips,
    top,
    executedId: outcome === 'executed' ? leaders[0].targetId : null,
    outcome,
  };
}
