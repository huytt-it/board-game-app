// Vai mở rộng + 12 người (rules §4, §11): mỗi mã E29–E55 có ít nhất một test
// mang mã đó, cùng bộ mặc định 11–12 người và các tổ hợp vai (plan §10).

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  afterDawn,
  afterHunter,
  afterNight,
  afterNightWitch,
  afterVote,
  afterVoteResult,
  applyLeave,
  dawnHunter,
  nightDone,
  startGame,
  type NightOneInput,
} from './flow.ts';
import { DEATH_CAUSE_TEXT, describeLog } from './log.ts';
import {
  CUPID_PICK_ERROR_TEXT,
  WITCH_PICK_ERROR_TEXT,
  resolveNight,
  seerLook,
  tallyBites,
  validTargets,
  validateCupidPick,
  validateWitchPick,
  wolfBitesFor,
  wolfStatus,
  type NightInput,
} from './night.ts';
import {
  ALL_ROLES,
  EXTRA_ROLES,
  MAX_PLAYERS,
  MIN_PLAYERS,
  ROLE_BLURB,
  ROLE_NAME,
  ROLE_ORDER,
  ROLE_POINTS,
  ROLE_TEAM,
  TEAM_NAME,
  balanceScore,
  cupidPairsTonight,
  dealRoles,
  fullCounts,
  nightActionOf,
  presetFor,
  seenAsWolf,
  totalRoles,
  validateSetup,
  wolfCount,
} from './roles.ts';
import { aliveIds, countsAsLeft, isWolf, loverOf, loversOf, wolfIds, withDeaths } from './table.ts';
import { WIN_REASON_TEXT, checkWinner, isLoversTeam, teamOf, wonGame } from './win.ts';
import { bite, cupid, dead, fixedRng, makeTable, noRng, night, rules, seededRng, table12, table7, witch, withLovers } from './testkit.ts';
import { FULL_POTIONS } from './types.ts';
import type { DayBallot, RoleCounts, WwLogEntry, WwRole, WwTable, WwTeam } from './types.ts';

// table12: w1 · seer · elder · cub · guard · lycan · witch · minion · hunter · tanner · cupid · v1
// (Ma Sói · Tiên tri · Già làng · Sói con · Bảo vệ · Người hoá sói · Phù thủy · Tay sai · Thợ săn ·
//  Kẻ chán đời · Cupid · Dân làng), theo thứ tự ghế.

const ids = (n: number) => Array.from({ length: n }, (_, i) => `p${i + 1}`);

const codes = (n: number, counts: RoleCounts) => validateSetup(n, counts).map((e) => e.code);

function nightInput(over: Partial<NightInput> = {}): NightInput {
  return {
    table: table12(),
    round: 1,
    attack: null,
    nightPicks: {},
    witchPicks: {},
    potions: FULL_POTIONS,
    guardLast: null,
    ...over,
  };
}

function nightOne(over: Partial<NightOneInput> = {}): NightOneInput {
  return {
    table: table12(),
    round: 1,
    nightPicks: {},
    witchPicks: {},
    potions: FULL_POTIONS,
    guardLast: null,
    rules: rules(),
    ...over,
  };
}

/** Mọi người còn sống (trừ chính người đó) bầu `targetId`: chắc chắn bị treo. */
function everyoneVotes(table: WwTable, targetId: string): Record<string, DayBallot> {
  return Object.fromEntries(aliveIds(table).filter((id) => id !== targetId).map((id) => [id, targetId]));
}

/** Bộ 12 người, mỗi vai đúng 1 người (đủ 6 vai mở rộng). */
const COUNTS_12: RoleCounts = {
  werewolf: 1,
  wolfcub: 1,
  minion: 1,
  seer: 1,
  guard: 1,
  witch: 1,
  hunter: 1,
  elder: 1,
  lycan: 1,
  tanner: 1,
  cupid: 1,
  villager: 1,
};

const hasUndefined = (v: unknown): boolean =>
  v === undefined || (typeof v === 'object' && v !== null && Object.values(v).some(hasUndefined));

describe('vai mở rộng: định nghĩa và bộ vai (rules §4, §11)', () => {
  test('6 vai mở rộng: tên, phe, điểm như bảng rules §11, có câu mô tả', () => {
    const expected: Record<string, [string, WwTeam, number]> = {
      elder: ['Già làng', 'village', 3],
      lycan: ['Người hoá sói', 'village', -1],
      minion: ['Tay sai', 'wolves', -6],
      tanner: ['Kẻ chán đời', 'tanner', -2],
      cupid: ['Cupid', 'village', -3],
      wolfcub: ['Sói con', 'wolves', -8],
    };
    assert.deepEqual([...EXTRA_ROLES], Object.keys(expected));
    for (const role of EXTRA_ROLES) {
      const [name, team, points] = expected[role];
      assert.equal(ROLE_NAME[role], name);
      assert.equal(ROLE_TEAM[role], team);
      assert.equal(ROLE_POINTS[role], points);
      assert.match(ROLE_BLURB[role], /\S/);
    }
    assert.deepEqual([...ALL_ROLES], [...ROLE_ORDER, ...EXTRA_ROLES]);
    assert.equal(TEAM_NAME.tanner, 'Kẻ chán đời');
    assert.equal(TEAM_NAME.lovers, 'Tình nhân');
  });

  test('bộ mặc định 5–12 người chỉ dùng 6 vai gốc', () => {
    assert.equal(MAX_PLAYERS, 12);
    for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n++) {
      const full = fullCounts(presetFor(n) as RoleCounts);
      for (const role of EXTRA_ROLES) assert.equal(full[role], 0, `${n} người, vai ${role}`);
    }
  });

  test('bộ 12 người đủ 6 vai mở rộng: hợp lệ, điểm tính cả vai mở rộng, chia mỗi vai đúng 1 người', () => {
    assert.equal(totalRoles(COUNTS_12), 12);
    assert.deepEqual(validateSetup(12, COUNTS_12), []);
    // −6 −8 −6 +7 +3 +4 +3 +3 −1 −2 −3 +1
    assert.equal(balanceScore(COUNTS_12), -5);
    const dealt = dealRoles(ids(12), COUNTS_12, seededRng(5));
    assert.deepEqual(Object.values(dealt).sort(), [...ALL_ROLES].sort());
    const started = startGame(ids(12), COUNTS_12, seededRng(5));
    assert.ok(started.ok);
    // Bộ 9 người mặc định (+1), đổi một Dân thành Già làng: +1 − 1 + 3.
    assert.equal(balanceScore({ ...(presetFor(9) as RoleCounts), villager: 1, elder: 1 }), 3);
  });

  test('Sói = Ma Sói + Sói con khi kiểm tra bộ vai; Tay sai không tính là Sói', () => {
    assert.deepEqual(codes(5, { wolfcub: 1, seer: 1, guard: 1, villager: 2 }), []);
    assert.deepEqual(codes(6, { werewolf: 2, wolfcub: 1, seer: 1, villager: 2 }), ['too-many-wolves']);
    assert.deepEqual(codes(6, { werewolf: 2, minion: 1, seer: 1, villager: 2 }), []);
    assert.deepEqual(codes(5, { minion: 1, seer: 1, guard: 1, villager: 2 }), ['no-wolf']);
    assert.equal(wolfCount({ werewolf: 2, wolfcub: 1, minion: 1 }), 3);
  });

  test('E55 vai mở rộng nhiều hơn 1 người: không cho bắt đầu, báo lỗi tiếng Việt', () => {
    for (const role of EXTRA_ROLES) {
      const counts: RoleCounts = role === 'wolfcub' ? { wolfcub: 2 } : { werewolf: 1, [role]: 2 };
      counts.villager = 8 - totalRoles(counts);
      const errors = validateSetup(8, counts);
      assert.deepEqual(
        errors.map((e) => e.code),
        ['special-limit'],
        role,
      );
      assert.match(errors[0].message, new RegExp(`${ROLE_NAME[role]} \\(2\\)`));
      assert.equal(startGame(ids(8), counts, noRng).ok, false);
    }
  });

  test('E55 trên 12 người: không cho bắt đầu', () => {
    const counts13 = { ...COUNTS_12, villager: 2 };
    const errors = validateSetup(13, counts13);
    assert.deepEqual(
      errors.map((e) => e.code),
      ['player-count'],
    );
    assert.match(errors[0].message, /từ 5 đến 12 người, đang có 13/);
    assert.equal(startGame(ids(13), counts13, noRng).ok, false);
  });

  test('việc Đêm ①: Sói con cắn như Ma Sói, vai mở rộng khác chọn người nghi, Cupid ghép đôi ở đêm 1', () => {
    assert.equal(nightActionOf('wolfcub'), 'wolf');
    for (const role of ['elder', 'lycan', 'minion', 'tanner', 'cupid'] as const) assert.equal(nightActionOf(role), 'suspect');
    assert.equal(cupidPairsTonight('cupid', 1), true);
    assert.equal(cupidPairsTonight('cupid', 2), false);
    assert.equal(cupidPairsTonight('villager', 1), false);
  });

  test('Sói là Ma Sói + Sói con; Tay sai thấy bầy, bầy không thấy Tay sai; Sói cắn được Tay sai', () => {
    const t = table12();
    assert.deepEqual(wolfIds(t), ['w1', 'cub']);
    assert.equal(isWolf(t, 'cub'), true);
    assert.equal(isWolf(t, 'minion'), false);
    assert.deepEqual(validTargets(t, 'cub', 'wolf'), ['seer', 'elder', 'guard', 'lycan', 'witch', 'minion', 'hunter', 'tanner', 'cupid', 'v1']);
  });
});

describe('Già làng (rules §11.2)', () => {
  test('E29 Già làng bị cắn lần đầu, không ai che hay cứu: sống, mất mạng phụ, bình minh "bình yên"', () => {
    const r = resolveNight(nightInput({ attack: 'elder' }));
    assert.deepEqual(r.newDeaths, []);
    assert.deepEqual(r.dawnDeaths, []);
    assert.equal(r.elderLife, false);
    assert.equal(r.elderHitId, 'elder');
    const s = afterNightWitch(nightInput({ attack: 'elder' }));
    assert.deepEqual(s.night.dawnDeaths, []);
    assert.deepEqual(s.log, [{ kind: 'elder', round: 1, elderId: 'elder' }]);
  });

  test('E30 Già làng bị cắn trúng lần thứ hai: chết vì Sói', () => {
    const first = resolveNight(nightInput({ attack: 'elder' }));
    const r = resolveNight(nightInput({ round: 3, attack: 'elder', elderLife: first.elderLife }));
    assert.deepEqual(r.newDeaths, [{ id: 'elder', round: 3, cause: 'wolf' }]);
    assert.equal(r.elderLife, false);
    assert.equal(r.elderHitId, null);
  });

  test('E31 Già làng bị cắn lần đầu nhưng được che hoặc được cứu: mạng phụ còn nguyên', () => {
    const guarded = resolveNight(nightInput({ attack: 'elder', nightPicks: { guard: night(1, 'elder') } }));
    assert.deepEqual(guarded.newDeaths, []);
    assert.equal(guarded.elderLife, true);
    assert.equal(guarded.elderHitId, null);
    const healed = resolveNight(nightInput({ attack: 'elder', witchPicks: { witch: witch(1, { heal: true }) } }));
    assert.deepEqual(healed.newDeaths, []);
    assert.equal(healed.elderLife, true);
    // Bình cứu vẫn mất, như E2.
    assert.deepEqual(healed.potions, { heal: false, poison: true });
  });

  test('E32 Già làng bị độc: chết ngay, mạng phụ không có tác dụng (kể cả khi cũng bị cắn)', () => {
    const poisoned = resolveNight(nightInput({ witchPicks: { witch: witch(1, { poisonId: 'elder' }) } }));
    assert.deepEqual(poisoned.newDeaths, [{ id: 'elder', round: 1, cause: 'poison' }]);
    const both = resolveNight(nightInput({ attack: 'elder', witchPicks: { witch: witch(1, { poisonId: 'elder' }) } }));
    assert.deepEqual(both.newDeaths, [{ id: 'elder', round: 1, cause: 'poison' }]);
    assert.equal(both.elderHitId, null);
  });

  test('E32 Già làng bị treo, bị bắn, chết theo người yêu: chết ngay', () => {
    const hanged = afterVote(table12(), 1, everyoneVotes(table12(), 'elder'));
    assert.deepEqual(hanged.newDeaths, [{ id: 'elder', round: 1, cause: 'vote' }]);
    const shot = afterHunter(table12([dead('hunter', 1, 'wolf')]), 1, { hunterId: 'hunter', after: 'dawn' }, 'elder');
    assert.deepEqual(shot.newDeaths, [{ id: 'elder', round: 1, cause: 'hunter' }]);
    const love = resolveNight(nightInput({ table: withLovers(table12(), 'elder', 'v1'), attack: 'v1' }));
    assert.deepEqual(love.newDeaths, [
      { id: 'elder', round: 1, cause: 'love' },
      { id: 'v1', round: 1, cause: 'wolf' },
    ]);
    assert.equal(love.elderLife, true);
  });
});

describe('Người hoá sói, Tay sai, Kẻ chán đời khi bị soi (rules §11.3, §11.4, §11.6)', () => {
  test('E33 Tiên tri soi Người hoá sói: "Là Sói"', () => {
    assert.equal(seerLook(table12(), 'seer', 'lycan')?.isWolf, true);
    assert.equal(seerLook(table12(), 'seer', 'cub')?.isWolf, true);
    assert.equal(seenAsWolf('lycan'), true);
  });

  test('E34 Tiên tri soi Tay sai, Kẻ chán đời: "Không phải Sói"', () => {
    assert.equal(seerLook(table12(), 'seer', 'minion')?.isWolf, false);
    assert.equal(seerLook(table12(), 'seer', 'tanner')?.isWolf, false);
  });

  test('Người hoá sói là Dân: không chặn làng thắng, không được đếm là Sói', () => {
    const t = makeTable({ w: 'werewolf', l: 'lycan', a: 'villager', b: 'villager' }, [dead('w', 2, 'vote')]);
    assert.deepEqual(checkWinner(t), { winner: 'village', reason: 'no-wolves' });
    assert.equal(isWolf(t, 'l'), false);
  });
});

describe('phe và thắng thua (rules §11.1, §11.6, §11.8)', () => {
  test('E35 hết Sói, Tay sai còn sống: Dân thắng, Tay sai thua', () => {
    const t = table12([dead('w1', 1, 'vote'), dead('cub', 2, 'poison')]);
    const res = checkWinner(t);
    assert.deepEqual(res, { winner: 'village', reason: 'no-wolves' });
    assert.ok(res);
    assert.equal(wonGame(t, 'minion', res), false);
    assert.equal(wonGame(t, 'tanner', res), false);
    assert.equal(wonGame(t, 'v1', res), true);
    assert.equal(wonGame(t, 'lycan', res), true);
  });

  test('E36 còn 1 Sói, Tay sai, 1 Dân: ván tiếp tục (Tay sai không tính là Sói)', () => {
    assert.equal(checkWinner(makeTable({ w: 'werewolf', m: 'minion', v: 'villager' })), null);
    // Tay sai tính vào "người còn lại": còn Sói + Tay sai thì Sói đủ số, Tay sai thắng cùng.
    const t = makeTable({ w: 'werewolf', m: 'minion', v: 'villager' }, [dead('v', 2, 'vote')]);
    const res = checkWinner(t);
    assert.deepEqual(res, { winner: 'wolves', reason: 'wolf-parity' });
    assert.ok(res);
    assert.equal(wonGame(t, 'm', res), true);
  });

  test('E37 Kẻ chán đời bị treo: Kẻ chán đời thắng một mình, ván kết thúc', () => {
    const voted = afterVote(table12(), 1, everyoneVotes(table12(), 'tanner'));
    assert.equal(voted.vote.executedId, 'tanner');
    const t = withDeaths(table12(), voted.newDeaths);
    const s = afterVoteResult(t, 1, 'tanner');
    assert.equal(s.phase, 'end');
    assert.deepEqual(s.winner, { winner: 'tanner', reason: 'tanner-hanged' });
    assert.ok(s.winner);
    assert.equal(wonGame(t, 'tanner', s.winner), true);
    for (const id of ['w1', 'minion', 'v1', 'seer']) assert.equal(wonGame(t, id, s.winner), false, id);
  });

  test('E38 treo Kẻ chán đời làm Sói đủ số: Kẻ chán đời thắng (bước 1 trước bước 4)', () => {
    const base = makeTable({ w1: 'werewolf', w2: 'werewolf', t: 'tanner', a: 'villager', b: 'villager' }, [dead('b', 1, 'wolf')]);
    const t = withDeaths(base, [dead('t', 2, 'vote')]);
    // Còn w1, w2, a: không tính lần treo thì Sói đủ số.
    assert.deepEqual(checkWinner(t), { winner: 'wolves', reason: 'wolf-parity' });
    assert.deepEqual(checkWinner(t, 't'), { winner: 'tanner', reason: 'tanner-hanged' });
    assert.deepEqual(afterVoteResult(t, 2, 't').winner, { winner: 'tanner', reason: 'tanner-hanged' });
  });

  test('E39 Kẻ chán đời bị cắn / độc / bắn: thua, ván tiếp tục', () => {
    const bitten = afterNightWitch(nightInput({ attack: 'tanner' }));
    assert.deepEqual(bitten.newDeaths, [{ id: 'tanner', round: 1, cause: 'wolf' }]);
    assert.equal(afterDawn({ table: withDeaths(table12(), bitten.newDeaths), round: 1, rules: rules() }).phase, 'day-talk');
    const poisoned = afterNightWitch(nightInput({ witchPicks: { witch: witch(1, { poisonId: 'tanner' }) } }));
    assert.deepEqual(poisoned.newDeaths, [{ id: 'tanner', round: 1, cause: 'poison' }]);
    assert.equal(afterDawn({ table: withDeaths(table12(), poisoned.newDeaths), round: 1, rules: rules() }).phase, 'day-talk');
    const shot = afterHunter(table12([dead('hunter', 1, 'vote')]), 1, { hunterId: 'hunter', after: 'vote' }, 'tanner');
    assert.equal(shot.phase, 'night');
    assert.equal(shot.winner, null);
    // Ván kết thúc sau đó: Kẻ chán đời không thắng cùng ai.
    assert.equal(wonGame(table12(), 'tanner', { winner: 'village', reason: 'no-wolves' }), false);
    assert.equal(wonGame(table12(), 'tanner', { winner: 'wolves', reason: 'wolf-parity' }), false);
  });

  test('cặp cùng phe hết Sói: Dân thắng như thường; cặp Sói + Tay sai: phe Sói thắng như thường', () => {
    const village = withLovers(makeTable({ w1: 'werewolf', v1: 'villager', a: 'seer' }, [dead('w1', 2, 'vote')]), 'v1', 'a');
    assert.equal(isLoversTeam(village), false);
    assert.deepEqual(checkWinner(village), { winner: 'village', reason: 'no-wolves' });
    const wolves = withLovers(makeTable({ w1: 'werewolf', m: 'minion', a: 'villager' }, [dead('a', 2, 'wolf')]), 'w1', 'm');
    assert.equal(isLoversTeam(wolves), false);
    const res = checkWinner(wolves);
    assert.deepEqual(res, { winner: 'wolves', reason: 'wolf-parity' });
    assert.ok(res);
    assert.equal(wonGame(wolves, 'm', res), true);
  });
});

describe('Cupid và cặp đôi (rules §11.5)', () => {
  test('E40 Cupid ghép cặp hợp lệ (gồm cả mình): lưu cặp đôi, hai người thấy nhau', () => {
    const picks = { cupid: cupid(1, ['cupid', 'w1'], 'v1'), w1: night(1, 'seer'), cub: night(1, 'seer') };
    assert.equal(validateCupidPick(table12(), 'cupid', ['cupid', 'w1'], 1), null);
    const s = afterNight(nightOne({ nightPicks: picks }), noRng);
    assert.equal(s.phase, 'night-witch');
    assert.deepEqual(s.lovers, ['w1', 'cupid']);
    assert.deepEqual(
      s.log.find((e) => e.kind === 'lovers'),
      { kind: 'lovers', round: 1, cupidId: 'cupid', loverIds: ['w1', 'cupid'], mixed: true },
    );
    // "Người mình nghi" của Cupid vẫn được ghi.
    assert.deepEqual(
      s.log.find((e) => e.kind === 'suspects'),
      { kind: 'suspects', round: 1, picks: { cupid: 'v1' } },
    );
    const t = withLovers(table12(), 'w1', 'cupid');
    assert.equal(loverOf(t, 'w1'), 'cupid');
    assert.equal(loverOf(t, 'cupid'), 'w1');
    assert.equal(loverOf(t, 'v1'), null);
    // Khác phe (Sói + Dân): cả hai thành phe Tình nhân.
    assert.equal(teamOf(t, 'w1'), 'lovers');
    assert.equal(teamOf(t, 'cupid'), 'lovers');
    assert.equal(teamOf(t, 'v1'), 'village');
  });

  test('E40 cặp cùng phe: vẫn ở phe cũ, chỉ thêm luật chết theo', () => {
    const s = afterNight(nightOne({ nightPicks: { cupid: cupid(1, ['v1', 'seer']) } }), noRng);
    assert.deepEqual(s.lovers, ['seer', 'v1']);
    assert.deepEqual(
      s.log.find((e) => e.kind === 'lovers'),
      { kind: 'lovers', round: 1, cupidId: 'cupid', loverIds: ['seer', 'v1'], mixed: false },
    );
    const t = withLovers(table12(), 'seer', 'v1');
    assert.equal(isLoversTeam(t), false);
    assert.equal(teamOf(t, 'seer'), 'village');
  });

  test('E41 Cupid chưa chọn đủ 2 người hoặc chưa Xác nhận: ván không có cặp đôi', () => {
    const lovers = (pick: ReturnType<typeof cupid>) => afterNight(nightOne({ nightPicks: { cupid: pick } }), noRng);
    for (const pick of [
      cupid(1, ['seer', 'v1'], null, false),
      cupid(1, ['seer']),
      cupid(1, []),
      cupid(1, ['seer', 'seer']),
      cupid(1, ['seer', 'v1', 'w1']),
      night(1, 'v1'),
    ]) {
      const s = lovers(pick);
      assert.equal(s.lovers, null);
      assert.equal(
        s.log.some((e) => e.kind === 'lovers'),
        false,
      );
    }
  });

  test('E41 lý do không ghép được: thiếu người, trùng người, người đã chết, không phải đêm 1, không phải Cupid', () => {
    const t = table12([dead('seer', 1, 'left')]);
    assert.equal(validateCupidPick(t, 'cupid', ['v1'], 1), 'need-two');
    assert.equal(validateCupidPick(t, 'cupid', ['v1', 'v1'], 1), 'same-person');
    assert.equal(validateCupidPick(t, 'cupid', ['v1', 'seer'], 1), 'lover-invalid');
    assert.equal(validateCupidPick(t, 'cupid', ['v1', 'w1'], 2), 'not-first-night');
    assert.equal(validateCupidPick(t, 'v1', ['v1', 'w1'], 1), 'not-cupid');
    for (const text of Object.values(CUPID_PICK_ERROR_TEXT)) assert.match(text, /\S/);
    // Cupid rời làng trước khi Đêm ① kết thúc; hoặc chọn ở đêm 2: không có cặp.
    const gone = table12([dead('cupid', 1, 'left')]);
    assert.equal(afterNight(nightOne({ table: gone, nightPicks: { cupid: cupid(1, ['seer', 'v1']) } }), noRng).lovers, null);
    assert.equal(afterNight(nightOne({ round: 2, nightPicks: { cupid: cupid(2, ['seer', 'v1']) } }), noRng).lovers, null);
  });

  test('cặp đôi trong state không hợp lệ thì bị bỏ qua', () => {
    assert.equal(loversOf({ ...table12(), lovers: ['v1', 'v1'] }), null);
    assert.equal(loversOf({ ...table12(), lovers: ['v1', 'nobody'] }), null);
    assert.equal(loversOf({ ...table12(), lovers: null }), null);
    assert.equal(loversOf(table12()), null);
  });

  test('E42 một người trong cặp bị cắn chết: người kia chết theo, công bố cùng bình minh, theo thứ tự ghế', () => {
    const t = withLovers(table12(), 'seer', 'v1');
    const s = afterNightWitch(nightInput({ table: t, attack: 'v1' }));
    assert.deepEqual(s.night.dawnDeaths, ['seer', 'v1']);
    assert.deepEqual(s.newDeaths, [
      { id: 'seer', round: 1, cause: 'love' },
      { id: 'v1', round: 1, cause: 'wolf' },
    ]);
    assert.deepEqual(s.log, [
      { kind: 'death', round: 1, id: 'v1', cause: 'wolf' },
      { kind: 'love', round: 1, id: 'seer', loverId: 'v1', part: 'night' },
    ]);
  });

  test('E42 cặp vừa ghép ở đêm 1 (ván không có Phù thủy): chết theo có hiệu lực ngay đêm đó', () => {
    const t = makeTable({ w1: 'werewolf', seer: 'seer', cupid: 'cupid', v1: 'villager', v2: 'villager', v3: 'villager' });
    const s = afterNight(nightOne({ table: t, nightPicks: { w1: night(1, 'v1'), cupid: cupid(1, ['v2', 'v1']) } }), noRng);
    assert.equal(s.phase, 'dawn');
    assert.deepEqual(s.lovers, ['v1', 'v2']);
    assert.deepEqual(s.night?.dawnDeaths, ['v1', 'v2']);
    assert.deepEqual(s.newDeaths, [
      { id: 'v1', round: 1, cause: 'wolf' },
      { id: 'v2', round: 1, cause: 'love' },
    ]);
  });

  test('chết theo người yêu: không ai che hay cứu được', () => {
    const t = withLovers(table12(), 'seer', 'v1');
    const r = resolveNight(
      nightInput({ table: t, attack: 'v1', nightPicks: { guard: night(1, 'seer') }, witchPicks: { witch: witch(1, { healId: 'seer' }) } }),
    );
    // Bình cứu chỉ cứu được người bị nhắm: chọn cứu người không bị nhắm thì không có tác dụng.
    assert.equal(r.witch, null);
    assert.deepEqual(r.dawnDeaths, ['seer', 'v1']);
    assert.equal(r.newDeaths[0].cause, 'love');
  });

  test('E43 một người trong cặp bị treo: người kia chết theo ngay ở Kết quả phiếu', () => {
    const t = withLovers(table12(), 'seer', 'v1');
    const s = afterVote(t, 2, everyoneVotes(t, 'v1'));
    assert.equal(s.vote.executedId, 'v1');
    assert.deepEqual(s.newDeaths, [
      { id: 'v1', round: 2, cause: 'vote' },
      { id: 'seer', round: 2, cause: 'love' },
    ]);
    assert.deepEqual(s.log[1], { kind: 'love', round: 2, id: 'seer', loverId: 'v1', part: 'day' });
  });

  test('E44 người chết theo là Thợ săn (sau bình minh): được bắn', () => {
    const t = withLovers(table12(), 'hunter', 'v1');
    const s = afterNightWitch(nightInput({ table: t, attack: 'v1' }));
    assert.deepEqual(s.night.dawnDeaths, ['hunter', 'v1']);
    const dawn = afterDawn({ table: withDeaths(t, s.newDeaths), round: 1, rules: rules() });
    assert.equal(dawn.phase, 'hunter');
    assert.deepEqual(dawn.hunter, { hunterId: 'hunter', after: 'dawn' });
  });

  test('E44 người chết theo là Thợ săn (sau khi treo): được bắn, rồi sang Đêm', () => {
    const t = withLovers(table12(), 'hunter', 'v1');
    const voted = afterVote(t, 1, everyoneVotes(t, 'v1'));
    const after = withDeaths(t, voted.newDeaths);
    const res = afterVoteResult(after, 1, 'v1');
    assert.equal(res.phase, 'hunter');
    assert.deepEqual(res.hunter, { hunterId: 'hunter', after: 'vote' });
    assert.ok(res.hunter);
    const shot = afterHunter(after, 1, res.hunter, 'w1');
    assert.equal(shot.phase, 'night');
    assert.equal(shot.round, 2);
  });

  test('E45 Thợ săn bắn một người trong cặp: người kia chết theo', () => {
    const t = withLovers(table12([dead('hunter', 1, 'wolf')]), 'seer', 'v1');
    const s = afterHunter(t, 1, { hunterId: 'hunter', after: 'dawn' }, 'v1');
    assert.deepEqual(s.newDeaths, [
      { id: 'v1', round: 1, cause: 'hunter' },
      { id: 'seer', round: 1, cause: 'love' },
    ]);
    assert.deepEqual(s.log, [
      { kind: 'hunter', round: 1, hunterId: 'hunter', targetId: 'v1' },
      { kind: 'love', round: 1, id: 'seer', loverId: 'v1', part: 'day' },
    ]);
  });

  test('E46 một người trong cặp rời làng: người kia chết theo ("chết theo người yêu")', () => {
    const t = withLovers(table12(), 'seer', 'v1');
    const r = applyLeave(t, 2, 'day-talk', 'v1');
    assert.ok(r);
    assert.deepEqual(r.newDeaths, [
      { id: 'v1', round: 2, cause: 'left' },
      { id: 'seer', round: 2, cause: 'love' },
    ]);
    assert.deepEqual(r.log, [
      { kind: 'left', round: 2, id: 'v1', during: 'day-talk' },
      { kind: 'love', round: 2, id: 'seer', loverId: 'v1', part: 'day' },
    ]);
    assert.equal(r.winner, null);
    // Rời làng lúc đêm thì mục chết theo cũng tính là đêm.
    assert.deepEqual(applyLeave(t, 2, 'night', 'v1')?.log[1], { kind: 'love', round: 2, id: 'seer', loverId: 'v1', part: 'night' });
  });

  test('E46 Thợ săn chết theo người yêu bị cho rời làng: coi như rời làng, không bắn (rules §11.5)', () => {
    const t = withLovers(table12(), 'hunter', 'v1');
    const r = applyLeave(t, 2, 'night', 'v1');
    assert.ok(r);
    const after = withDeaths(t, r.newDeaths);
    assert.equal(countsAsLeft(after, 'hunter'), true);
    assert.equal(countsAsLeft(after, 'v1'), true);
    assert.equal(dawnHunter(after, 2, rules()), null);
    assert.equal(afterDawn({ table: after, round: 2, rules: rules() }).phase, 'day-talk');
  });

  test('E47 cặp khác phe là 2 người cuối còn sống: Tình nhân thắng', () => {
    const roles = { w1: 'werewolf', w2: 'werewolf', v1: 'villager', a: 'seer', b: 'villager' } as const;
    const t = withLovers(makeTable(roles, [dead('w2', 1, 'vote'), dead('a', 2, 'wolf'), dead('b', 2, 'vote')]), 'w1', 'v1');
    const res = checkWinner(t);
    assert.deepEqual(res, { winner: 'lovers', reason: 'lovers' });
    assert.ok(res);
    assert.equal(wonGame(t, 'w1', res), true);
    assert.equal(wonGame(t, 'v1', res), true);
    assert.equal(wonGame(t, 'w2', res), false);
    assert.equal(wonGame(t, 'a', res), false);
    // Qua luồng ván: treo người thứ ba thì Tình nhân thắng ở Kết quả phiếu.
    const before = withLovers(makeTable(roles, [dead('w2', 1, 'vote'), dead('a', 2, 'wolf')]), 'w1', 'v1');
    assert.equal(checkWinner(before), null);
    const voted = afterVote(before, 2, { w1: 'b', v1: 'b' });
    assert.equal(voted.vote.executedId, 'b');
    assert.deepEqual(afterVoteResult(withDeaths(before, voted.newDeaths), 2, 'b').winner, { winner: 'lovers', reason: 'lovers' });
  });

  test('E48 cặp Sói + Dân, các Sói khác đã chết, còn 2 người khác: ván tiếp tục', () => {
    const roles = { w1: 'werewolf', w2: 'werewolf', v1: 'villager', a: 'seer', b: 'villager' } as const;
    const t = withLovers(makeTable(roles, [dead('w2', 1, 'vote')]), 'w1', 'v1');
    // Sói-người-yêu chặn làng thắng, nhưng không được đếm khi xét "Sói đủ số".
    assert.equal(checkWinner(t), null);
    assert.equal(teamOf(t, 'w1'), 'lovers');
    // Còn một Sói không ở trong cặp: chỉ Sói đó được đếm (1 < 3). Không có cặp thì 2 ≥ 2, Sói đã thắng.
    const w3 = makeTable({ w1: 'werewolf', w3: 'werewolf', v1: 'villager', a: 'seer' });
    assert.deepEqual(checkWinner(w3), { winner: 'wolves', reason: 'wolf-parity' });
    assert.equal(checkWinner(withLovers(w3, 'w1', 'v1')), null);
  });
});

describe('Sói con và đêm cắn 2 (rules §11.7)', () => {
  // 3 Sói (Sói con đã bị treo ngày 1) và 6 người khác: đêm 2 bầy cắn 2 người.
  const pack = makeTable(
    { w1: 'werewolf', a: 'villager', w2: 'werewolf', b: 'seer', cub: 'wolfcub', c: 'guard', d: 'villager', e: 'elder', f: 'witch' },
    [dead('cub', 1, 'vote')],
  );

  test('E49 Sói con chết ban ngày ở vòng r: đêm r + 1 cắn 2 người', () => {
    const t = table12([dead('cub', 2, 'vote')]);
    assert.equal(wolfBitesFor(t, 2), 1);
    assert.equal(wolfBitesFor(t, 3), 2);
    assert.equal(wolfBitesFor(t, 4), 1);
    assert.equal(wolfBitesFor(table12([dead('cub', 2, 'hunter')]), 3), 2);
    assert.equal(wolfStatus(t, {}, 3).bites, 2);
  });

  test('E50 Sói con chết ban đêm ở vòng r (bị độc): đêm r + 1 cắn 2 người', () => {
    const night2 = afterNightWitch(nightInput({ round: 2, witchPicks: { witch: witch(2, { poisonId: 'cub' }) } }));
    assert.deepEqual(night2.newDeaths, [{ id: 'cub', round: 2, cause: 'poison' }]);
    assert.equal(wolfBitesFor(withDeaths(table12(), night2.newDeaths), 3), 2);
  });

  test('E51 Sói con rời làng: không kích hoạt cắn 2', () => {
    const r = applyLeave(table12(), 2, 'day-talk', 'cub');
    assert.ok(r);
    assert.equal(wolfBitesFor(withDeaths(table12(), r.newDeaths), 3), 1);
  });

  test('E51 Sói con chết theo người yêu bị cắn: vẫn kích hoạt; chết theo người yêu bị cho rời làng: không (rules §11.7)', () => {
    const t = withLovers(table12(), 'cub', 'v1');
    const bitten = afterNightWitch(nightInput({ table: t, round: 2, attack: 'v1' }));
    assert.deepEqual(bitten.night.dawnDeaths, ['cub', 'v1']);
    assert.equal(wolfBitesFor(withDeaths(t, bitten.newDeaths), 3), 2);
    const left = applyLeave(t, 2, 'day-talk', 'v1');
    assert.ok(left);
    assert.equal(wolfBitesFor(withDeaths(t, left.newDeaths), 3), 1);
  });

  test('đêm cắn 2: thống nhất là mọi Sói còn sống chọn cùng một cặp', () => {
    const same = { w1: bite(2, ['b', 'a']), w2: bite(2, ['a', 'b']) };
    const status = wolfStatus(pack, same, 2);
    assert.equal(status.bites, 2);
    assert.equal(status.agreed, true);
    assert.deepEqual(status.agreedIds, ['a', 'b']);
    assert.equal(status.agreedId, null);
    assert.deepEqual(status.sets, { w1: ['a', 'b'], w2: ['a', 'b'] });
    assert.deepEqual(status.counts, [
      { targetId: 'a', votes: 2 },
      { targetId: 'b', votes: 2 },
    ]);
    const everyone = { ...same, a: night(2, 'b'), b: night(2, 'w1'), c: night(2, 'a'), d: night(2, 'w2'), e: night(2, 'b'), f: night(2, 'a') };
    assert.equal(nightDone(pack, everyone, 2), true);
    // Một Sói mới chọn 1 người, hoặc hai Sói chọn hai cặp khác nhau: chưa thống nhất.
    assert.equal(wolfStatus(pack, { w1: bite(2, ['a', 'b']), w2: bite(2, ['a']) }, 2).agreed, false);
    assert.equal(wolfStatus(pack, { w1: bite(2, ['a', 'b']), w2: bite(2, ['a', 'c']) }, 2).agreed, false);
    assert.equal(nightDone(pack, { ...everyone, w2: bite(2, ['a', 'c']) }, 2), false);
  });

  test('đêm cắn 2: còn một Sói thì Sói đó chọn đủ 2 người là thống nhất (như E13)', () => {
    const t = table12([dead('cub', 1, 'vote')]);
    const full = wolfStatus(t, { w1: bite(2, ['v1', 'seer']) }, 2);
    assert.equal(full.agreed, true);
    assert.deepEqual(full.agreedIds, ['seer', 'v1']);
    assert.equal(wolfStatus(t, { w1: bite(2, ['v1']) }, 2).agreed, false);
  });

  test('đêm cắn 2: bỏ lựa chọn không hợp lệ (chọn Sói, trùng, quá 2 người); thiếu biteIds thì dùng ô đã chọn', () => {
    const messy = wolfStatus(pack, { w1: bite(2, ['w2', 'a', 'a', 'b', 'c']), w2: bite(2, ['a', 'b']) }, 2);
    assert.deepEqual(messy.sets.w1, ['a', 'b']);
    assert.equal(messy.agreed, true);
    const grid = wolfStatus(pack, { w1: night(2, 'a'), w2: night(2, 'a') }, 2);
    assert.deepEqual(grid.sets, { w1: ['a'], w2: ['a'] });
    assert.equal(grid.agreed, false);
    // Chỉ có 1 người được chọn thì chỉ cắn 1.
    assert.deepEqual(tallyBites(pack, { w1: night(2, 'a'), w2: night(2, 'a') }, 2, 'random', noRng).targetIds, ['a']);
  });

  test('đêm cắn 1 thì bỏ qua biteIds', () => {
    const status = wolfStatus(pack, { w1: bite(3, ['b', 'a']), w2: bite(3, ['b', 'c']) }, 3);
    assert.equal(status.bites, 1);
    assert.deepEqual(status.sets, { w1: ['b'], w2: ['b'] });
    assert.equal(status.agreedId, 'b');
  });

  test('đêm cắn 2, hết giờ: lấy 2 người nhiều phiếu nhất', () => {
    const tally = tallyBites(pack, { w1: bite(2, ['a', 'b']), w2: bite(2, ['a']) }, 2, 'none', noRng);
    assert.deepEqual(tally.targetIds, ['a', 'b']);
    assert.equal(tally.how, 'majority');
    assert.equal(tally.bites, 2);
  });

  test('E53 đêm cắn 2: Sói chọn 3 người khác nhau, hoà ở ranh giới → theo "Sói hoà phiếu"', () => {
    // b: 2 phiếu (chắc chắn), a và c: 1 phiếu, tranh chỗ thứ hai.
    const split = { w1: bite(2, ['a', 'b']), w2: bite(2, ['b', 'c']) };
    const lowRng = tallyBites(pack, split, 2, 'random', fixedRng(0));
    assert.deepEqual(lowRng.targetIds, ['a', 'b']);
    assert.equal(lowRng.how, 'random');
    assert.deepEqual(tallyBites(pack, split, 2, 'random', fixedRng(0.99)).targetIds, ['b', 'c']);
    const none = tallyBites(pack, split, 2, 'none', noRng);
    assert.deepEqual(none.targetIds, ['b']);
    assert.equal(none.how, 'tie-none');
    // Cả ba hoà: "Ngẫu nhiên" bốc 2 trong 3, "Không cắn" thì không ai chắc chắn lọt top.
    const three = { w1: bite(2, ['a', 'b']), w2: bite(2, ['c']) };
    assert.deepEqual(tallyBites(pack, three, 2, 'random', fixedRng(0)).targetIds, ['a', 'b']);
    assert.deepEqual(tallyBites(pack, three, 2, 'random', fixedRng(0.99)).targetIds, ['b', 'c']);
    assert.deepEqual(tallyBites(pack, three, 2, 'none', noRng).targetIds, []);
  });

  test('E52 đêm cắn 2: Phù thủy cứu một người, Bảo vệ che người kia → cả hai sống', () => {
    const r = resolveNight(
      nightInput({ attacks: ['seer', 'v1'], nightPicks: { guard: night(1, 'v1') }, witchPicks: { witch: witch(1, { healId: 'seer' }) } }),
    );
    assert.deepEqual(r.newDeaths, []);
    assert.deepEqual(r.attacks, ['seer', 'v1']);
    assert.deepEqual(r.witch, { witchId: 'witch', healedId: 'seer', poisonId: null });
    assert.deepEqual(r.potions, { heal: false, poison: true });
    // Không ai che: Phù thủy cứu một người, người kia chết.
    const r2 = resolveNight(nightInput({ attacks: ['seer', 'v1'], witchPicks: { witch: witch(1, { healId: 'v1' }) } }));
    assert.deepEqual(r2.newDeaths, [{ id: 'seer', round: 1, cause: 'wolf' }]);
  });

  test('E52 Phù thủy ở đêm 2 người bị nhắm: phải chọn cứu ai (healId)', () => {
    const t = table12();
    const two = ['seer', 'v1'];
    assert.equal(validateWitchPick(t, 'witch', { heal: true, poisonId: null }, two, FULL_POTIONS), 'heal-which');
    assert.equal(validateWitchPick(t, 'witch', { heal: false, poisonId: null, healId: 'w1' }, two, FULL_POTIONS), 'heal-invalid');
    assert.equal(validateWitchPick(t, 'witch', { heal: false, poisonId: 'v1', healId: 'v1' }, two, FULL_POTIONS), 'poison-healed');
    assert.equal(validateWitchPick(t, 'witch', { heal: false, poisonId: 'seer', healId: 'v1' }, two, FULL_POTIONS), null);
    assert.equal(validateWitchPick(t, 'witch', { heal: false, poisonId: null, healId: 'v1' }, two, { heal: false, poison: true }), 'no-heal-potion');
    assert.match(WITCH_PICK_ERROR_TEXT['heal-which'], /chọn cứu một người/);
    assert.match(WITCH_PICK_ERROR_TEXT['heal-invalid'], /\S/);
    // Lỡ ghi `heal: true` không kèm healId: engine không cứu ai, bình còn nguyên.
    const r = resolveNight(nightInput({ attacks: two, witchPicks: { witch: witch(1, { heal: true }) } }));
    assert.deepEqual(r.dawnDeaths, ['seer', 'v1']);
    assert.deepEqual(r.potions, FULL_POTIONS);
    // healId cũng dùng được ở đêm thường.
    assert.deepEqual(resolveNight(nightInput({ attack: 'v1', witchPicks: { witch: witch(1, { healId: 'v1' }) } })).newDeaths, []);
  });

  test('E54 đêm cắn 2 trúng Già làng (lần đầu) và một người khác: Già làng mất mạng phụ, người kia chết', () => {
    const r = resolveNight(nightInput({ attacks: ['elder', 'v1'] }));
    assert.deepEqual(r.newDeaths, [{ id: 'v1', round: 1, cause: 'wolf' }]);
    assert.equal(r.elderLife, false);
    assert.equal(r.elderHitId, 'elder');
  });

  test('đêm cắn 2 qua luồng ván: ván không có Phù thủy tính luôn, Bình minh công bố 2 người theo ghế', () => {
    const t = makeTable({ w1: 'werewolf', a: 'villager', cub: 'wolfcub', b: 'seer', c: 'villager', d: 'guard', e: 'villager' }, [
      dead('cub', 1, 'vote'),
    ]);
    const s = afterNight(nightOne({ table: t, round: 2, nightPicks: { w1: bite(2, ['c', 'a']), d: night(2, 'b') } }), noRng);
    assert.equal(s.phase, 'dawn');
    assert.deepEqual(s.attacks, ['a', 'c']);
    assert.equal(s.attack, 'a');
    assert.equal(s.wolves.bites, 2);
    assert.equal(s.wolves.how, 'consensus');
    assert.deepEqual(s.night?.dawnDeaths, ['a', 'c']);
    assert.deepEqual(s.log[0], { kind: 'wolves', round: 2, targetId: 'a', how: 'consensus', targetIds: ['a', 'c'] });
    assert.equal(hasUndefined(s), false);
  });

  test('đêm cắn 2 qua luồng ván có Phù thủy: Đêm ② nhận cả hai người bị nhắm', () => {
    const t = table12([dead('cub', 1, 'vote')]);
    const n1 = afterNight(nightOne({ table: t, round: 2, nightPicks: { w1: bite(2, ['v1', 'seer']) } }), noRng);
    assert.equal(n1.phase, 'night-witch');
    assert.deepEqual(n1.attacks, ['seer', 'v1']);
    const n2 = afterNightWitch(
      nightInput({ table: t, round: 2, attack: n1.attack, attacks: n1.attacks, witchPicks: { witch: witch(2, { healId: 'v1' }) } }),
    );
    assert.deepEqual(n2.night.dawnDeaths, ['seer']);
    assert.equal(hasUndefined(n2), false);
  });

  test('không còn Sói thì đêm cắn 2 không có gì xảy ra', () => {
    const t = table12([dead('cub', 1, 'vote'), dead('w1', 1, 'hunter')]);
    assert.equal(wolfStatus(t, {}, 2).agreed, true);
    assert.deepEqual(tallyBites(t, {}, 2, 'random', noRng).targetIds, []);
  });

  test('đêm thường: mục nhật ký của bầy giữ đúng dạng v1 (không có targetIds)', () => {
    const s = afterNight(
      { table: table7(), round: 1, nightPicks: { w1: night(1, 'v1'), w2: night(1, 'v1') }, witchPicks: {}, potions: FULL_POTIONS, guardLast: null, rules: rules() },
      noRng,
    );
    assert.deepEqual(s.log[0], { kind: 'wolves', round: 1, targetId: 'v1', how: 'consensus' });
    assert.deepEqual(s.attacks, ['v1']);
    assert.equal(s.lovers, null);
  });
});

describe('tổ hợp vai mở rộng (plan §10)', () => {
  test('Cupid ghép Sói con với Thợ săn: treo Sói con → Thợ săn chết theo và bắn → đêm sau bầy cắn 2', () => {
    const t = withLovers(table12(), 'cub', 'hunter');
    assert.equal(isLoversTeam(t), true);
    const voted = afterVote(t, 1, everyoneVotes(t, 'cub'));
    assert.deepEqual(voted.newDeaths, [
      { id: 'cub', round: 1, cause: 'vote' },
      { id: 'hunter', round: 1, cause: 'love' },
    ]);
    const t1 = withDeaths(t, voted.newDeaths);
    const res = afterVoteResult(t1, 1, 'cub');
    assert.deepEqual(res.hunter, { hunterId: 'hunter', after: 'vote' });
    assert.ok(res.hunter);
    const shot = afterHunter(t1, 1, res.hunter, 'minion');
    assert.equal(shot.phase, 'night');
    assert.equal(shot.round, 2);
    const t2 = withDeaths(t1, shot.newDeaths);
    assert.equal(wolfBitesFor(t2, 2), 2);
  });

  test('đêm cắn 2 trúng Già làng + người yêu của Già làng: mất mạng phụ nhưng vẫn chết theo người yêu', () => {
    const t = withLovers(table12([dead('cub', 1, 'vote')]), 'elder', 'v1');
    const r = resolveNight(nightInput({ table: t, round: 2, attacks: ['elder', 'v1'] }));
    assert.deepEqual(r.newDeaths, [
      { id: 'elder', round: 2, cause: 'love' },
      { id: 'v1', round: 2, cause: 'wolf' },
    ]);
    assert.equal(r.elderHitId, 'elder');
    // Người yêu là người khác: Già làng chỉ mất mạng phụ, người yêu của người bị cắn chết theo.
    const t2 = withLovers(table12([dead('cub', 1, 'vote')]), 'seer', 'v1');
    const r2 = resolveNight(nightInput({ table: t2, round: 2, attacks: ['elder', 'v1'] }));
    assert.deepEqual(r2.dawnDeaths, ['seer', 'v1']);
    assert.equal(r2.elderLife, false);
  });

  test('Tay sai trong cặp Tình nhân: thua khi Sói thắng; cặp Tay sai + Sói vẫn ở phe Sói', () => {
    const wolfWin = { winner: 'wolves', reason: 'wolf-parity' } as const;
    const mixed = withLovers(table12(), 'minion', 'v1');
    assert.equal(isLoversTeam(mixed), true);
    assert.equal(teamOf(mixed, 'minion'), 'lovers');
    assert.equal(wonGame(mixed, 'minion', wolfWin), false);
    assert.equal(wonGame(table12(), 'minion', wolfWin), true);
    const same = withLovers(table12(), 'minion', 'w1');
    assert.equal(isLoversTeam(same), false);
    assert.equal(teamOf(same, 'minion'), 'wolves');
  });

  test('Kẻ chán đời trong cặp Tình nhân: bị treo thì không thắng (rules §11.6)', () => {
    const t = withLovers(table12(), 'tanner', 'v1');
    const voted = afterVote(t, 1, everyoneVotes(t, 'tanner'));
    const res = afterVoteResult(withDeaths(t, voted.newDeaths), 1, 'tanner');
    assert.equal(res.phase, 'night');
    assert.equal(res.winner, null);
  });
});

describe('nhật ký vai mở rộng (rules §5.10)', () => {
  const NAMES: Record<string, string> = {
    w1: 'An',
    seer: 'Bình',
    elder: 'Cường',
    cub: 'Dung',
    witch: 'Khánh',
    cupid: 'Oanh',
    v1: 'Phúc',
  };
  const nameOf = (id: string) => NAMES[id] ?? id;

  test('câu tiếng Việt cho ghép đôi, mất mạng phụ, chết theo, đêm cắn 2', () => {
    const entries: WwLogEntry[] = [
      { kind: 'lovers', round: 1, cupidId: 'cupid', loverIds: ['w1', 'v1'], mixed: true },
      { kind: 'lovers', round: 1, cupidId: 'cupid', loverIds: ['seer', 'v1'], mixed: false },
      { kind: 'elder', round: 2, elderId: 'elder' },
      { kind: 'love', round: 2, id: 'seer', loverId: 'v1', part: 'night' },
      { kind: 'love', round: 2, id: 'seer', loverId: 'v1', part: 'day' },
      { kind: 'wolves', round: 3, targetId: 'seer', how: 'consensus', targetIds: ['seer', 'v1'] },
      { kind: 'wolves', round: 3, targetId: 'seer', how: 'majority', targetIds: ['seer'] },
      { kind: 'wolves', round: 3, targetId: 'seer', how: 'random', targetIds: ['seer', 'v1'] },
      { kind: 'wolves', round: 3, targetId: 'seer', how: 'tie-none', targetIds: ['seer'] },
      { kind: 'wolves', round: 3, targetId: null, how: 'tie-none', targetIds: [] },
      { kind: 'wolves', round: 3, targetId: null, how: 'none', targetIds: [] },
    ];
    assert.deepEqual(
      describeLog(entries, nameOf).map((l) => [l.part, l.text]),
      [
        ['night', 'Cupid Oanh ghép đôi An và Phúc. Hai người khác phe nên thành phe Tình nhân.'],
        ['night', 'Cupid Oanh ghép đôi Bình và Phúc.'],
        ['night', 'Già làng Cường bị Sói cắn, mất mạng phụ.'],
        ['night', 'Bình chết theo người yêu Phúc.'],
        ['day', 'Bình chết theo người yêu Phúc.'],
        ['night', 'Đêm cắn 2: bầy Sói thống nhất cắn Bình và Phúc.'],
        ['night', 'Đêm cắn 2: bầy Sói chưa thống nhất, theo số phiếu cắn Bình.'],
        ['night', 'Đêm cắn 2: bầy Sói hoà phiếu, bốc ngẫu nhiên cắn Bình và Phúc.'],
        ['night', 'Đêm cắn 2: bầy Sói hoà phiếu, chỉ cắn Bình.'],
        ['night', 'Đêm cắn 2: bầy Sói hoà phiếu, đêm nay không cắn ai.'],
        ['night', 'Đêm cắn 2: không Sói nào chọn, đêm nay không cắn ai.'],
      ],
    );
  });

  test('nguyên nhân chết, lý do thắng và phe mới có câu tiếng Việt', () => {
    assert.equal(DEATH_CAUSE_TEXT.love, 'chết theo người yêu');
    assert.match(WIN_REASON_TEXT['tanner-hanged'], /Kẻ chán đời bị treo/);
    assert.match(WIN_REASON_TEXT.lovers, /Tình nhân/);
  });

  test('một ván có vai mở rộng: nhật ký đúng thứ tự, đúng câu', () => {
    const roles: Record<string, WwRole> = {
      w1: 'werewolf',
      seer: 'seer',
      elder: 'elder',
      cub: 'wolfcub',
      witch: 'witch',
      cupid: 'cupid',
      v1: 'villager',
    };
    const log: WwLogEntry[] = [];
    // Đêm 1: Cupid ghép Bình + Phúc, bầy cắn Già làng, Tiên tri soi Sói con.
    const t0 = makeTable(roles);
    const picks1 = { w1: night(1, 'elder'), cub: night(1, 'elder'), cupid: cupid(1, ['v1', 'seer'], 'w1'), seer: night(1, 'cub') };
    const n1 = afterNight(nightOne({ table: t0, nightPicks: picks1 }), noRng);
    assert.equal(hasUndefined(n1), false);
    log.push(...n1.log);
    assert.ok(n1.lovers);
    const t1 = withLovers(t0, ...n1.lovers);
    // Đêm ②: Phù thủy độc Sói con. Già làng mất mạng phụ.
    const n2 = afterNightWitch(
      nightInput({ table: t1, attack: n1.attack, attacks: n1.attacks, nightPicks: picks1, witchPicks: { witch: witch(1, { poisonId: 'cub' }) } }),
    );
    log.push(...n2.log);
    const t2 = withDeaths(t1, n2.newDeaths);
    assert.equal(afterDawn({ table: t2, round: 1, rules: rules() }).phase, 'day-talk');
    // Ngày 1: treo Phúc, Bình chết theo.
    const vote = afterVote(t2, 1, { w1: 'v1', seer: 'skip', elder: 'v1', witch: 'v1', cupid: 'v1', v1: 'w1' });
    log.push(...vote.log);
    const t3 = withDeaths(t2, vote.newDeaths);
    assert.equal(afterVoteResult(t3, 1, 'v1').phase, 'night');
    // Đêm 2: Sói con chết ở vòng 1 nên bầy cắn 2; Phù thủy tự cứu, Già làng hết mạng phụ.
    const n3 = afterNight(nightOne({ table: t3, round: 2, nightPicks: { w1: bite(2, ['witch', 'elder']) } }), noRng);
    log.push(...n3.log);
    const n4 = afterNightWitch(
      nightInput({
        table: t3,
        round: 2,
        attack: n3.attack,
        attacks: n3.attacks,
        witchPicks: { witch: witch(2, { healId: 'witch' }) },
        potions: n2.night.potions,
        elderLife: n2.night.elderLife,
      }),
    );
    log.push(...n4.log);
    assert.equal(afterDawn({ table: withDeaths(t3, n4.newDeaths), round: 2, rules: rules() }).phase, 'day-talk');

    assert.deepEqual(describeLog(log, nameOf), [
      { round: 1, part: 'night', text: 'Bầy Sói thống nhất cắn Cường.' },
      { round: 1, part: 'night', text: 'Cupid Oanh ghép đôi Bình và Phúc.' },
      { round: 1, part: 'night', text: 'Tiên tri Bình soi Dung: là Sói.' },
      { round: 1, part: 'night', text: 'Người mình nghi: Oanh → An.' },
      { round: 1, part: 'night', text: 'Phù thủy Khánh độc Dung.' },
      { round: 1, part: 'night', text: 'Già làng Cường bị Sói cắn, mất mạng phụ.' },
      { round: 1, part: 'night', text: 'Dung chết: trúng độc.' },
      { round: 1, part: 'day', text: 'Bỏ phiếu: An → Phúc, Bình → bỏ qua, Cường → Phúc, Khánh → Phúc, Oanh → Phúc, Phúc → An. Phúc bị treo.' },
      { round: 1, part: 'day', text: 'Bình chết theo người yêu Phúc.' },
      { round: 2, part: 'night', text: 'Đêm cắn 2: bầy Sói thống nhất cắn Cường và Khánh.' },
      { round: 2, part: 'night', text: 'Phù thủy Khánh cứu Khánh.' },
      { round: 2, part: 'night', text: 'Cường chết: bị Sói cắn.' },
    ]);
  });
});
