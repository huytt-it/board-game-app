// "Diễn biến ván" (rules §5.10): dựng mục nhật ký từ kết quả của engine, và
// đổi thành câu tiếng Việt cho màn kết thúc. Nhật ký lộ hết vai và lựa chọn,
// nên chỉ hiện đầy đủ ở màn kết thúc (hoặc cho hồn ma khi luật cho phép).

import type { WolfTally, GuardChoice, SeerLook, WitchAction } from './night.ts';
import type { DayVoteResult } from './day.ts';
import type { DeathCause, WwDeath, WwLogEntry, WwPhase } from './types.ts';

/** Mục của Đêm ①: bầy Sói, Bảo vệ, Tiên tri, người nghi. */
export function nightOneLog(
  round: number,
  wolves: WolfTally,
  guard: GuardChoice | null,
  seer: SeerLook | null,
  suspects: Record<string, string>,
): WwLogEntry[] {
  const out: WwLogEntry[] = [{ kind: 'wolves', round, targetId: wolves.targetId, how: wolves.how }];
  if (guard) out.push({ kind: 'guard', round, guardId: guard.guardId, targetId: guard.targetId });
  if (seer) out.push({ kind: 'seer', round, seerId: seer.seerId, targetId: seer.targetId, isWolf: seer.isWolf });
  if (Object.keys(suspects).length > 0) out.push({ kind: 'suspects', round, picks: suspects });
  return out;
}

/**
 * Mục của Đêm ② (Phù thủy, người đoán) và người chết đêm nay. Người chết vì
 * treo / Thợ săn / rời làng đã nằm trong mục 'vote' / 'hunter' / 'left'.
 */
export function nightTwoLog(
  round: number,
  witch: WitchAction | null,
  guesses: Record<string, string>,
  deaths: WwDeath[],
): WwLogEntry[] {
  const out: WwLogEntry[] = [];
  if (witch) out.push({ kind: 'witch', round, witchId: witch.witchId, healedId: witch.healedId, poisonId: witch.poisonId });
  if (Object.keys(guesses).length > 0) out.push({ kind: 'guesses', round, picks: guesses });
  return [...out, ...deathLog(deaths)];
}

export function deathLog(deaths: WwDeath[]): WwLogEntry[] {
  return deaths.map((d) => ({ kind: 'death', round: d.round, id: d.id, cause: d.cause }));
}

export function voteLog(round: number, vote: DayVoteResult): WwLogEntry[] {
  return [{ kind: 'vote', round, ballots: vote.ballots, executedId: vote.executedId }];
}

export function hunterLog(round: number, hunterId: string, targetId: string | null): WwLogEntry[] {
  return [{ kind: 'hunter', round, hunterId, targetId }];
}

export function leftLog(round: number, id: string, during: WwPhase): WwLogEntry[] {
  return [{ kind: 'left', round, id, during }];
}

// ── Câu tiếng Việt ───────────────────────────────────────────────────────

export const DEATH_CAUSE_TEXT: Record<DeathCause, string> = {
  wolf: 'bị Sói cắn',
  poison: 'trúng độc',
  vote: 'bị treo',
  hunter: 'bị Thợ săn bắn',
  left: 'rời làng',
};

export interface LogLine {
  round: number;
  /** Đêm hay ngày của vòng `round`, để màn kết thúc chia nhóm "Đêm 1", "Ngày 1"… */
  part: 'night' | 'day';
  text: string;
}

const NIGHT_PHASES: readonly WwPhase[] = ['deal', 'night', 'night-witch'];

function pairs(picks: Record<string, string>, nameOf: (id: string) => string): string {
  return Object.entries(picks)
    .map(([from, to]) => `${nameOf(from)} → ${nameOf(to)}`)
    .join(', ');
}

/** Một câu cho mỗi mục nhật ký, giữ đúng thứ tự xảy ra. */
export function describeLog(entries: readonly WwLogEntry[], nameOf: (id: string) => string): LogLine[] {
  return entries.map((e): LogLine => {
    switch (e.kind) {
      case 'wolves': {
        const target = e.targetId ? nameOf(e.targetId) : '';
        const text = {
          consensus: `Bầy Sói thống nhất cắn ${target}.`,
          majority: `Bầy Sói chưa thống nhất, theo đa số cắn ${target}.`,
          random: `Bầy Sói hoà phiếu, bốc ngẫu nhiên cắn ${target}.`,
          'tie-none': 'Bầy Sói hoà phiếu, đêm nay không cắn ai.',
          none: 'Không Sói nào chọn, đêm nay không cắn ai.',
        }[e.how];
        return { round: e.round, part: 'night', text };
      }
      case 'guard':
        return { round: e.round, part: 'night', text: `Bảo vệ ${nameOf(e.guardId)} che ${nameOf(e.targetId)}.` };
      case 'seer':
        return {
          round: e.round,
          part: 'night',
          text: `Tiên tri ${nameOf(e.seerId)} soi ${nameOf(e.targetId)}: ${e.isWolf ? 'là Sói' : 'không phải Sói'}.`,
        };
      case 'witch': {
        const acts = [
          e.healedId ? `cứu ${nameOf(e.healedId)}` : null,
          e.poisonId ? `độc ${nameOf(e.poisonId)}` : null,
        ].filter(Boolean);
        return { round: e.round, part: 'night', text: `Phù thủy ${nameOf(e.witchId)} ${acts.join(' và ')}.` };
      }
      case 'suspects':
        return { round: e.round, part: 'night', text: `Người mình nghi: ${pairs(e.picks, nameOf)}.` };
      case 'guesses':
        return { round: e.round, part: 'night', text: `Đoán Sói nhắm ai: ${pairs(e.picks, nameOf)}.` };
      case 'death':
        return {
          round: e.round,
          part: e.cause === 'wolf' || e.cause === 'poison' ? 'night' : 'day',
          text: `${nameOf(e.id)} chết: ${DEATH_CAUSE_TEXT[e.cause]}.`,
        };
      case 'vote': {
        const ballots = Object.entries(e.ballots)
          .map(([from, to]) => `${nameOf(from)} → ${to === 'skip' ? 'bỏ qua' : nameOf(to)}`)
          .join(', ');
        const verdict = e.executedId ? `${nameOf(e.executedId)} bị treo.` : 'Không ai bị treo.';
        return { round: e.round, part: 'day', text: ballots ? `Bỏ phiếu: ${ballots}. ${verdict}` : verdict };
      }
      case 'hunter':
        return {
          round: e.round,
          part: 'day',
          text: e.targetId
            ? `Thợ săn ${nameOf(e.hunterId)} bắn ${nameOf(e.targetId)}.`
            : `Thợ săn ${nameOf(e.hunterId)} không bắn.`,
        };
      case 'left':
        return {
          round: e.round,
          part: NIGHT_PHASES.includes(e.during) ? 'night' : 'day',
          text: `${nameOf(e.id)} rời làng.`,
        };
    }
  });
}
