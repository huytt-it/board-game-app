import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { afterHunter, afterNight, afterNightWitch, afterVote, applyLeave } from './flow.ts';
import { describeLog } from './log.ts';
import { dead, noRng, night, rules, table7, witch } from './testkit.ts';
import { FULL_POTIONS } from './types.ts';
import type { WwLogEntry } from './types.ts';

// table7: w1 · seer · v1 · guard · w2 · witch · hunter (thứ tự ghế).

const NAMES: Record<string, string> = {
  w1: 'An',
  seer: 'Bình',
  v1: 'Chi',
  guard: 'Dũng',
  w2: 'Em',
  witch: 'Giang',
  hunter: 'Hoà',
};
const nameOf = (id: string) => NAMES[id] ?? id;

describe('Diễn biến ván (rules §5.10)', () => {
  test('một ván ngắn: đêm, ngày, Thợ săn, rời làng — đúng thứ tự, đúng câu', () => {
    const log: WwLogEntry[] = [];
    const t = table7();
    const n1 = afterNight(
      {
        table: t,
        round: 1,
        nightPicks: {
          w1: night(1, 'hunter'),
          w2: night(1, 'hunter'),
          guard: night(1, 'v1'),
          seer: night(1, 'w2'),
          v1: night(1, 'w1', false),
        },
        witchPicks: {},
        potions: FULL_POTIONS,
        guardLast: null,
        rules: rules(),
      },
      noRng,
    );
    log.push(...n1.log);
    const n2 = afterNightWitch({
      table: t,
      round: 1,
      attack: n1.attack,
      nightPicks: {},
      witchPicks: { witch: witch(1, { poisonId: 'seer' }), v1: witch(1, { guessId: 'hunter' }) },
      potions: FULL_POTIONS,
      guardLast: null,
    });
    log.push(...n2.log);
    const afterDawnTable = { ...t, deaths: [...t.deaths, ...n2.newDeaths] };
    const shot = afterHunter(afterDawnTable, 1, { hunterId: 'hunter', after: 'dawn' }, 'w1');
    log.push(...shot.log);
    const t2 = { ...afterDawnTable, deaths: [...afterDawnTable.deaths, ...shot.newDeaths] };
    const vote = afterVote(t2, 1, { v1: 'w2', guard: 'w2', witch: 'w2', w2: 'skip' });
    log.push(...vote.log);
    const leave = applyLeave(t2, 2, 'night', 'v1');
    assert.ok(leave);
    log.push(...leave.log);

    assert.deepEqual(describeLog(log, nameOf), [
      { round: 1, part: 'night', text: 'Bầy Sói thống nhất cắn Hoà.' },
      { round: 1, part: 'night', text: 'Bảo vệ Dũng che Chi.' },
      { round: 1, part: 'night', text: 'Tiên tri Bình soi Em: là Sói.' },
      { round: 1, part: 'night', text: 'Người mình nghi: Chi → An.' },
      { round: 1, part: 'night', text: 'Phù thủy Giang độc Bình.' },
      { round: 1, part: 'night', text: 'Đoán Sói nhắm ai: Chi → Hoà.' },
      { round: 1, part: 'night', text: 'Bình chết: trúng độc.' },
      { round: 1, part: 'night', text: 'Hoà chết: bị Sói cắn.' },
      { round: 1, part: 'day', text: 'Thợ săn Hoà bắn An.' },
      { round: 1, part: 'day', text: 'Bỏ phiếu: Chi → Em, Dũng → Em, Em → bỏ qua, Giang → Em. Em bị treo.' },
      { round: 2, part: 'night', text: 'Chi rời làng.' },
    ]);
  });

  test('các cách bầy Sói chốt mục tiêu', () => {
    const lines = describeLog(
      [
        { kind: 'wolves', round: 1, targetId: 'v1', how: 'majority' },
        { kind: 'wolves', round: 2, targetId: 'seer', how: 'random' },
        { kind: 'wolves', round: 3, targetId: null, how: 'tie-none' },
        { kind: 'wolves', round: 4, targetId: null, how: 'none' },
      ],
      nameOf,
    ).map((l) => l.text);
    assert.deepEqual(lines, [
      'Bầy Sói chưa thống nhất, theo đa số cắn Chi.',
      'Bầy Sói hoà phiếu, bốc ngẫu nhiên cắn Bình.',
      'Bầy Sói hoà phiếu, đêm nay không cắn ai.',
      'Không Sói nào chọn, đêm nay không cắn ai.',
    ]);
  });

  test('Phù thủy cứu và độc, Tiên tri soi người không phải Sói, Thợ săn không bắn, không ai bị treo', () => {
    const lines = describeLog(
      [
        { kind: 'witch', round: 1, witchId: 'witch', healedId: 'v1', poisonId: 'w1' },
        { kind: 'seer', round: 1, seerId: 'seer', targetId: 'guard', isWolf: false },
        { kind: 'hunter', round: 2, hunterId: 'hunter', targetId: null },
        { kind: 'vote', round: 2, ballots: { v1: 'skip' }, executedId: null },
        { kind: 'vote', round: 3, ballots: {}, executedId: null },
        { kind: 'left', round: 3, id: 'guard', during: 'day-vote' },
      ],
      nameOf,
    );
    assert.deepEqual(
      lines.map((l) => l.text),
      [
        'Phù thủy Giang cứu Chi và độc An.',
        'Tiên tri Bình soi Dũng: không phải Sói.',
        'Thợ săn Hoà không bắn.',
        'Bỏ phiếu: Chi → bỏ qua. Không ai bị treo.',
        'Không ai bị treo.',
        'Dũng rời làng.',
      ],
    );
    assert.equal(lines[5].part, 'day');
  });

  test('nhật ký chỉ dùng null, không có undefined (Firestore từ chối undefined)', () => {
    const t = table7([dead('v1', 1, 'wolf')]);
    const s = afterNight(
      {
        table: t,
        round: 2,
        nightPicks: { w1: night(2, 'seer'), w2: night(2, 'guard') },
        witchPicks: {},
        potions: FULL_POTIONS,
        guardLast: null,
        rules: rules({ wolfTie: 'none' }),
      },
      noRng,
    );
    const hasUndefined = (v: unknown): boolean =>
      v === undefined || (typeof v === 'object' && v !== null && Object.values(v).some(hasUndefined));
    assert.equal(hasUndefined(s), false);
  });
});
