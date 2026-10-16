import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  ROLE_ORDER,
  BALANCE_WARN,
  ROLE_PRESETS,
  balanceLean,
  balanceScore,
  balanceWarning,
  dealRoles,
  nightActionOf,
  presetFor,
  totalRoles,
  validateSetup,
} from './roles.ts';
import { pickOne, shuffle } from './random.ts';
import { fixedRng, seededRng } from './testkit.ts';
import type { RoleCounts, WwRole } from './types.ts';

// Bảng rules §4: [Sói, Tiên tri, Bảo vệ, Phù thủy, Thợ săn, Dân, Điểm].
const TABLE: Record<number, [number, number, number, number, number, number, number]> = {
  5: [1, 1, 1, 0, 0, 2, 6],
  6: [2, 1, 1, 1, 0, 1, 3],
  7: [2, 1, 1, 1, 0, 2, 4],
  8: [2, 1, 1, 1, 0, 3, 5],
  9: [3, 1, 1, 1, 1, 2, 1],
  10: [3, 1, 1, 1, 1, 3, 2],
};

const ids = (n: number) => Array.from({ length: n }, (_, i) => `p${i + 1}`);

describe('bộ vai mặc định 5–10 người (rules §4)', () => {
  for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n++) {
    test(`${n} người: đúng bảng, tổng = ${n}, hợp lệ, điểm như bảng`, () => {
      const preset = presetFor(n);
      assert.ok(preset);
      const [wolf, seer, guard, witch, hunter, villager, score] = TABLE[n];
      assert.deepEqual(preset, { werewolf: wolf, seer, guard, witch, hunter, villager });
      assert.equal(totalRoles(preset), n);
      assert.deepEqual(validateSetup(n, preset), []);
      assert.equal(balanceScore(preset), score);
    });
  }

  test('ngoài 5–10 người thì không có bộ mặc định', () => {
    assert.equal(presetFor(4), null);
    assert.equal(presetFor(11), null);
  });

  test('presetFor trả bản sao, sửa không ảnh hưởng bảng gốc', () => {
    const p = presetFor(5);
    assert.ok(p);
    p.werewolf = 9;
    assert.equal(ROLE_PRESETS[5].werewolf, 1);
  });
});

describe('E28 — bộ vai vi phạm ràng buộc', () => {
  const codes = (n: number, counts: RoleCounts) => validateSetup(n, counts).map((e) => e.code);

  test('E28 tổng số vai khác số người', () => {
    assert.deepEqual(codes(6, { werewolf: 1, seer: 1, villager: 3 }), ['total']);
  });

  test('E28 không có Sói', () => {
    assert.deepEqual(codes(5, { seer: 1, guard: 1, villager: 3 }), ['no-wolf']);
  });

  test('E28 2 × số Sói ≥ số người (Sói thắng ngay)', () => {
    assert.deepEqual(codes(6, { werewolf: 3, seer: 1, villager: 2 }), ['too-many-wolves']);
    assert.deepEqual(codes(7, { werewolf: 3, seer: 1, villager: 3 }), []);
  });

  test('E28 vai đặc biệt nhiều hơn 1 người', () => {
    assert.deepEqual(codes(7, { werewolf: 2, seer: 2, villager: 3 }), ['special-limit']);
    assert.deepEqual(codes(8, { werewolf: 2, guard: 2, hunter: 2, villager: 2 }), ['special-limit']);
  });

  test('E28 số người ngoài 5–10', () => {
    assert.deepEqual(codes(4, { werewolf: 1, villager: 3 }), ['player-count']);
    assert.deepEqual(codes(11, { werewolf: 3, villager: 8 }), ['player-count']);
  });

  test('E28 số lượng âm hoặc lẻ', () => {
    assert.ok(codes(5, { werewolf: 2, seer: -1, villager: 4 }).includes('bad-count'));
    assert.ok(codes(5, { werewolf: 1, villager: 3.5, seer: 0.5 }).includes('bad-count'));
  });

  test('E28 báo nhiều lỗi cùng lúc, mỗi lỗi một câu tiếng Việt', () => {
    const errors = validateSetup(6, { werewolf: 0, seer: 2, villager: 1 });
    assert.deepEqual(
      errors.map((e) => e.code),
      ['total', 'no-wolf', 'special-limit'],
    );
    for (const e of errors) assert.match(e.message, /\S/);
    assert.match(errors[0].message, /Tổng số vai \(3\) phải bằng số người \(6\)/);
    assert.match(errors[1].message, /ít nhất 1 Ma Sói/);
    assert.match(errors[2].message, /Tiên tri \(2\)/);
  });
});

describe('dealRoles', () => {
  test('đúng số lượng mỗi vai, mỗi ghế một vai', () => {
    for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n++) {
      const preset = presetFor(n);
      assert.ok(preset);
      const seats = ids(n);
      const roles = dealRoles(seats, preset, seededRng(n));
      assert.deepEqual(Object.keys(roles).sort(), [...seats].sort());
      const got: Record<string, number> = {};
      for (const r of Object.values(roles)) got[r] = (got[r] ?? 0) + 1;
      for (const role of ROLE_ORDER) assert.equal(got[role] ?? 0, preset[role], `${n} người, vai ${role}`);
    }
  });

  test('rng cố định cho kết quả cố định', () => {
    const preset = presetFor(7);
    assert.ok(preset);
    const a = dealRoles(ids(7), preset, seededRng(42));
    const b = dealRoles(ids(7), preset, seededRng(42));
    assert.deepEqual(a, b);
    // rng luôn trả 0: Fisher–Yates đẩy phần tử đầu túi về cuối mỗi lượt.
    const zero = dealRoles(['a', 'b', 'c', 'd', 'e'], { werewolf: 1, seer: 1, guard: 1, villager: 2 }, fixedRng(0));
    const expected: Record<string, WwRole> = { a: 'seer', b: 'guard', c: 'villager', d: 'villager', e: 'werewolf' };
    assert.deepEqual(zero, expected);
  });

  test('seed khác nhau thì (ít nhất có lúc) chia khác nhau', () => {
    const preset = presetFor(10);
    assert.ok(preset);
    const seen = new Set<string>();
    for (let seed = 1; seed <= 20; seed++) seen.add(JSON.stringify(dealRoles(ids(10), preset, seededRng(seed))));
    assert.ok(seen.size > 1);
  });

  test('số vai khác số ghế thì báo lỗi', () => {
    assert.throws(() => dealRoles(ids(5), { werewolf: 1, villager: 3 }, seededRng(1)));
  });
});

describe('random', () => {
  test('shuffle là hoán vị, không đổi mảng gốc', () => {
    const src = ids(10);
    const copy = [...src];
    const out = shuffle(src, seededRng(7));
    assert.deepEqual(src, copy);
    assert.deepEqual([...out].sort(), [...src].sort());
  });

  test('pickOne theo rng, rng gần 1 vẫn trong mảng', () => {
    assert.equal(pickOne(['a', 'b', 'c'], fixedRng(0)), 'a');
    assert.equal(pickOne(['a', 'b', 'c'], fixedRng(0.5)), 'b');
    assert.equal(pickOne(['a', 'b', 'c'], fixedRng(0.9999999999)), 'c');
    assert.throws(() => pickOne([], fixedRng(0)));
  });
});

test('việc Đêm ① của từng vai', () => {
  assert.equal(nightActionOf('werewolf'), 'wolf');
  assert.equal(nightActionOf('seer'), 'seer');
  assert.equal(nightActionOf('guard'), 'guard');
  for (const role of ['villager', 'witch', 'hunter'] as const) assert.equal(nightActionOf(role), 'suspect');
});

describe('cảnh báo cân bằng (rules §4, ±BALANCE_WARN)', () => {
  test('ngưỡng là 6', () => {
    assert.equal(BALANCE_WARN, 6);
  });

  test('bộ mặc định 5–10 người không bao giờ bị cảnh báo', () => {
    for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n++) {
      assert.equal(balanceWarning(presetFor(n) as RoleCounts), null, `${n} người`);
    }
  });

  test('đúng ±6 thì không cảnh báo, quá ±6 thì cảnh báo (không phải lỗi bắt đầu)', () => {
    // +6: 1 Sói, Tiên tri, Bảo vệ, 2 Dân (bộ 5 người).
    assert.equal(balanceWarning({ werewolf: 1, seer: 1, guard: 1, villager: 2 }), null);
    // −6: 3 Sói, Tiên tri, Bảo vệ, 2 Dân (7 người) = −18 + 7 + 3 + 2.
    assert.equal(balanceScore({ werewolf: 3, seer: 1, guard: 1, villager: 2 }), -6);
    assert.equal(balanceWarning({ werewolf: 3, seer: 1, guard: 1, villager: 2 }), null);
    // +7: 1 Sói, Tiên tri, Bảo vệ, 3 Dân (6 người).
    const many = { werewolf: 1, seer: 1, guard: 1, villager: 3 };
    assert.equal(balanceScore(many), 7);
    assert.match(balanceWarning(many) ?? '', /phía Dân \(điểm \+7\)/);
    assert.deepEqual(validateSetup(6, many), []);
    // −7: 2 Sói, 5 Dân (7 người).
    const wolfy = { werewolf: 2, villager: 5 };
    assert.equal(balanceScore(wolfy), -7);
    assert.match(balanceWarning(wolfy) ?? '', /phía Sói \(điểm -7\)/);
    assert.deepEqual(validateSetup(7, wolfy), []);
  });

  test('nhãn lợi Dân / cân / lợi Sói', () => {
    assert.equal(balanceLean(6), 'village');
    assert.equal(balanceLean(3), 'village');
    assert.equal(balanceLean(2), 'even');
    assert.equal(balanceLean(0), 'even');
    assert.equal(balanceLean(-2), 'even');
    assert.equal(balanceLean(-3), 'wolves');
  });
});
