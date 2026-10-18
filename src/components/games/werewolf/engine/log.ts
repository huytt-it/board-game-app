// "Diễn biến ván" (rules §5.10): dựng mục nhật ký từ kết quả của engine, và
// đổi thành câu tiếng Việt cho màn kết thúc. Nhật ký lộ hết vai và lựa chọn,
// nên chỉ hiện đầy đủ ở màn kết thúc (hoặc cho hồn ma khi luật cho phép).

import type { BiteTally, CupidPair, GuardChoice, SeerLook, WitchAction } from './night.ts';
import type { DayVoteResult } from './day.ts';
import { loverOf } from './table.ts';
import type { DeathCause, WwDeath, WwLogEntry, WwPhase, WwTable } from './types.ts';

const NIGHT_PHASES: readonly WwPhase[] = ['deal', 'night', 'night-witch'];

/** Một việc xảy ra ở `phase` thuộc đêm hay ngày của vòng (lúc xem vai tính là đêm). */
export function phasePart(phase: WwPhase): 'night' | 'day' {
  return NIGHT_PHASES.includes(phase) ? 'night' : 'day';
}

/** Mục của Đêm ①: bầy Sói, Cupid ghép đôi (đêm 1), Bảo vệ, Tiên tri, người nghi. */
export function nightOneLog(
  round: number,
  wolves: BiteTally,
  guard: GuardChoice | null,
  seer: SeerLook | null,
  suspects: Record<string, string>,
  lovers: (CupidPair & { mixed: boolean }) | null = null,
): WwLogEntry[] {
  const out: WwLogEntry[] = [
    {
      kind: 'wolves',
      round,
      targetId: wolves.targetIds[0] ?? null,
      how: wolves.how,
      // Đêm cắn 2 mới có `targetIds`: mục của đêm thường giữ đúng dạng v1.
      ...(wolves.bites === 2 ? { targetIds: wolves.targetIds } : {}),
    },
  ];
  if (lovers) out.push({ kind: 'lovers', round, cupidId: lovers.cupidId, loverIds: lovers.loverIds, mixed: lovers.mixed });
  if (guard) out.push({ kind: 'guard', round, guardId: guard.guardId, targetId: guard.targetId });
  if (seer) out.push({ kind: 'seer', round, seerId: seer.seerId, targetId: seer.targetId, isWolf: seer.isWolf });
  if (Object.keys(suspects).length > 0) out.push({ kind: 'suspects', round, picks: suspects });
  return out;
}

/**
 * Mục của Đêm ② (Phù thủy, người đoán), Già làng mất mạng phụ, và người chết
 * đêm nay: chết vì Sói / độc là mục 'death', chết theo người yêu là mục
 * 'love'. Người chết vì treo / Thợ săn / rời làng đã nằm trong mục 'vote' /
 * 'hunter' / 'left'.
 */
export function nightTwoLog(
  table: WwTable,
  round: number,
  witch: WitchAction | null,
  guesses: Record<string, string>,
  deaths: WwDeath[],
  elderHitId: string | null = null,
): WwLogEntry[] {
  const out: WwLogEntry[] = [];
  if (witch) out.push({ kind: 'witch', round, witchId: witch.witchId, healedId: witch.healedId, poisonId: witch.poisonId });
  if (Object.keys(guesses).length > 0) out.push({ kind: 'guesses', round, picks: guesses });
  if (elderHitId) out.push({ kind: 'elder', round, elderId: elderHitId });
  return [...out, ...deathLog(deaths.filter((d) => d.cause !== 'love')), ...loveLog(table, deaths, 'night')];
}

export function deathLog(deaths: WwDeath[]): WwLogEntry[] {
  return deaths.map((d) => ({ kind: 'death', round: d.round, id: d.id, cause: d.cause }));
}

/** Mục 'love' cho những người chết theo người yêu trong `deaths` (rules §11.5). */
export function loveLog(table: WwTable, deaths: readonly WwDeath[], part: 'night' | 'day'): WwLogEntry[] {
  return deaths.flatMap((d): WwLogEntry[] => {
    const loverId = d.cause === 'love' ? loverOf(table, d.id) : null;
    return loverId ? [{ kind: 'love', round: d.round, id: d.id, loverId, part }] : [];
  });
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
  love: 'chết theo người yêu',
};

export interface LogLine {
  round: number;
  /** Đêm hay ngày của vòng `round`, để màn kết thúc chia nhóm "Đêm 1", "Ngày 1"… */
  part: 'night' | 'day';
  text: string;
}

function pairs(picks: Record<string, string>, nameOf: (id: string) => string): string {
  return Object.entries(picks)
    .map(([from, to]) => `${nameOf(from)} → ${nameOf(to)}`)
    .join(', ');
}

function wolvesText(e: Extract<WwLogEntry, { kind: 'wolves' }>, nameOf: (id: string) => string): string {
  if (e.targetIds) {
    // Đêm cắn 2 (rules §11.7).
    const names = e.targetIds.map(nameOf).join(' và ');
    return {
      consensus: `Đêm cắn 2: bầy Sói thống nhất cắn ${names}.`,
      majority: `Đêm cắn 2: bầy Sói chưa thống nhất, theo số phiếu cắn ${names}.`,
      random: `Đêm cắn 2: bầy Sói hoà phiếu, bốc ngẫu nhiên cắn ${names}.`,
      'tie-none': names ? `Đêm cắn 2: bầy Sói hoà phiếu, chỉ cắn ${names}.` : 'Đêm cắn 2: bầy Sói hoà phiếu, đêm nay không cắn ai.',
      none: 'Đêm cắn 2: không Sói nào chọn, đêm nay không cắn ai.',
    }[e.how];
  }
  const target = e.targetId ? nameOf(e.targetId) : '';
  return {
    consensus: `Bầy Sói thống nhất cắn ${target}.`,
    majority: `Bầy Sói chưa thống nhất, theo đa số cắn ${target}.`,
    random: `Bầy Sói hoà phiếu, bốc ngẫu nhiên cắn ${target}.`,
    'tie-none': 'Bầy Sói hoà phiếu, đêm nay không cắn ai.',
    none: 'Không Sói nào chọn, đêm nay không cắn ai.',
  }[e.how];
}

/** Một câu cho mỗi mục nhật ký, giữ đúng thứ tự xảy ra. */
export function describeLog(entries: readonly WwLogEntry[], nameOf: (id: string) => string): LogLine[] {
  return entries.map((e): LogLine => {
    switch (e.kind) {
      case 'wolves':
        return { round: e.round, part: 'night', text: wolvesText(e, nameOf) };
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
        return { round: e.round, part: phasePart(e.during), text: `${nameOf(e.id)} rời làng.` };
      case 'lovers': {
        const [a, b] = e.loverIds.map(nameOf);
        const team = e.mixed ? ' Hai người khác phe nên thành phe Tình nhân.' : '';
        return { round: e.round, part: 'night', text: `Cupid ${nameOf(e.cupidId)} ghép đôi ${a} và ${b}.${team}` };
      }
      case 'elder':
        return { round: e.round, part: 'night', text: `Già làng ${nameOf(e.elderId)} bị Sói cắn, mất mạng phụ.` };
      case 'love':
        return { round: e.round, part: e.part, text: `${nameOf(e.id)} chết theo người yêu ${nameOf(e.loverId)}.` };
    }
  });
}
