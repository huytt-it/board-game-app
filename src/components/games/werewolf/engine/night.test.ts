import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  guardChoiceOf,
  guessPicksOf,
  isValidTarget,
  resolveNight,
  seerLook,
  seerLookOf,
  suspectPicksOf,
  tallyWolves,
  validTargets,
  validateWitchPick,
  witchActionOf,
  wolfStatus,
  type NightInput,
} from './night.ts';
import { dead, fixedRng, makeTable, noRng, night, table7, witch } from './testkit.ts';
import { FULL_POTIONS } from './types.ts';
import type { NightPick, PickMap, WitchPick, WwTable } from './types.ts';

// table7: w1 · seer · v1 · guard · w2 · witch · hunter (thứ tự ghế).

function nightInput(over: Partial<NightInput> & { table?: WwTable } = {}): NightInput {
  return {
    table: table7(),
    round: 1,
    attack: null,
    nightPicks: {},
    witchPicks: {},
    potions: FULL_POTIONS,
    guardLast: null,
    ...over,
  };
}

describe('validTargets', () => {
  test('Tiên tri soi người sống khác mình', () => {
    const t = table7([dead('v1', 1, 'wolf')]);
    assert.deepEqual(validTargets(t, 'seer', 'seer'), ['w1', 'guard', 'w2', 'witch', 'hunter']);
  });

  test('Bảo vệ được tự che', () => {
    assert.ok(validTargets(table7(), 'guard', 'guard').includes('guard'));
  });

  test('người chết không chọn gì', () => {
    const t = table7([dead('seer', 1, 'wolf')]);
    for (const kind of ['seer', 'suspect', 'guess', 'vote'] as const) assert.deepEqual(validTargets(t, 'seer', kind), []);
  });

  test('đoán Sói nhắm ai: mọi người sống, kể cả mình', () => {
    assert.deepEqual(validTargets(table7(), 'v1', 'guess'), table7().seatOrder);
  });

  test('Thợ săn đã chết vẫn bắn được người sống khác mình', () => {
    const t = table7([dead('hunter', 1, 'wolf')]);
    assert.deepEqual(validTargets(t, 'hunter', 'shoot'), ['w1', 'seer', 'v1', 'guard', 'w2', 'witch']);
  });

  test('E14 Sói không được chọn Sói (kể cả mình) hay người đã chết', () => {
    const t = table7([dead('v1', 1, 'vote')]);
    assert.deepEqual(validTargets(t, 'w1', 'wolf'), ['seer', 'guard', 'witch', 'hunter']);
    assert.equal(isValidTarget(t, 'w1', 'wolf', 'w2'), false);
    assert.equal(isValidTarget(t, 'w1', 'wolf', 'w1'), false);
    assert.equal(isValidTarget(t, 'w1', 'wolf', 'v1'), false);
  });

  test('E14 lựa chọn Sói không hợp lệ không được tính phiếu', () => {
    const t = table7([dead('v1', 1, 'vote')]);
    const picks = { w1: night(2, 'w2'), w2: night(2, 'v1') };
    const status = wolfStatus(t, picks, 2);
    assert.deepEqual(status.counts, []);
    assert.deepEqual(status.picks, { w1: null, w2: null });
    assert.deepEqual(tallyWolves(t, picks, 2, 'random', noRng), { targetId: null, how: 'none', counts: [] });
  });

  test('E8 Bảo vệ không được che cùng một người hai đêm liên tiếp', () => {
    assert.equal(isValidTarget(table7(), 'guard', 'guard', 'v1', { guardLast: 'v1' }), false);
    assert.equal(isValidTarget(table7(), 'guard', 'guard', 'seer', { guardLast: 'v1' }), true);
  });

  test('E8 đêm trước không che ai thì đêm nay che ai cũng được', () => {
    assert.deepEqual(validTargets(table7(), 'guard', 'guard', { guardLast: null }), table7().seatOrder);
  });

  test('E5 E6 Phù thủy không độc mình, không độc người vừa chọn cứu', () => {
    const targets = validTargets(table7(), 'witch', 'poison', { attack: 'v1', healing: true });
    assert.deepEqual(targets, ['w1', 'seer', 'guard', 'w2', 'hunter']);
    assert.ok(validTargets(table7(), 'witch', 'poison', { attack: 'v1', healing: false }).includes('v1'));
  });
});

describe('bầy Sói thống nhất (rules §5.3)', () => {
  test('cả bầy chọn cùng một người: thống nhất, kể cả khi chưa Xác nhận', () => {
    const picks = { w1: night(1, 'v1', false), w2: night(1, 'v1') };
    const status = wolfStatus(table7(), picks, 1);
    assert.equal(status.agreed, true);
    assert.equal(status.agreedId, 'v1');
    assert.deepEqual(tallyWolves(table7(), picks, 1, 'random', noRng), {
      targetId: 'v1',
      how: 'consensus',
      counts: [{ targetId: 'v1', votes: 2 }],
    });
  });

  test('một Sói chưa chọn thì chưa thống nhất', () => {
    const status = wolfStatus(table7(), { w1: night(1, 'v1') }, 1);
    assert.equal(status.agreed, false);
    assert.deepEqual(status.picks, { w1: 'v1', w2: null });
  });

  test('lựa chọn của đêm trước không được tính', () => {
    const status = wolfStatus(table7(), { w1: night(1, 'v1'), w2: night(1, 'v1') }, 2);
    assert.deepEqual(status.counts, []);
    assert.equal(status.agreed, false);
  });

  test('E10 Sói chọn khác nhau, hết giờ: người nhiều phiếu nhất bị nhắm (tính cả lựa chọn chưa Xác nhận)', () => {
    const t = makeTable({ w1: 'werewolf', a: 'villager', w2: 'werewolf', b: 'villager', w3: 'werewolf', c: 'seer', d: 'guard', e: 'villager', f: 'villager' });
    const picks = { w1: night(1, 'b', false), w2: night(1, 'a'), w3: night(1, 'b', false) };
    const status = wolfStatus(t, picks, 1);
    assert.equal(status.agreed, false);
    assert.deepEqual(status.counts, [
      { targetId: 'a', votes: 1 },
      { targetId: 'b', votes: 2 },
    ]);
    assert.deepEqual(tallyWolves(t, picks, 1, 'none', noRng), { targetId: 'b', how: 'majority', counts: status.counts });
  });

  test('E11 Sói hoà phiếu, "Ngẫu nhiên": bốc bằng rng trong số người hoà (theo thứ tự ghế)', () => {
    const picks = { w1: night(1, 'hunter'), w2: night(1, 'seer') };
    assert.equal(tallyWolves(table7(), picks, 1, 'random', fixedRng(0)).targetId, 'seer');
    assert.equal(tallyWolves(table7(), picks, 1, 'random', fixedRng(0.99)).targetId, 'hunter');
    assert.equal(tallyWolves(table7(), picks, 1, 'random', fixedRng(0)).how, 'random');
  });

  test('E11 Sói hoà phiếu, "Không cắn": không ai bị nhắm', () => {
    const picks = { w1: night(1, 'hunter'), w2: night(1, 'seer') };
    const tally = tallyWolves(table7(), picks, 1, 'none', noRng);
    assert.equal(tally.targetId, null);
    assert.equal(tally.how, 'tie-none');
  });

  test('E12 không Sói nào chọn: không ai bị nhắm', () => {
    const tally = tallyWolves(table7(), { seer: night(1, 'w1'), v1: night(1, 'w2') }, 1, 'random', noRng);
    assert.deepEqual(tally, { targetId: null, how: 'none', counts: [] });
  });

  test('E13 chỉ còn một Sói: lựa chọn của Sói đó là thống nhất', () => {
    const t = table7([dead('w2', 1, 'vote')]);
    const picks = { w1: night(2, 'hunter', false), w2: night(2, 'seer') };
    const status = wolfStatus(t, picks, 2);
    assert.deepEqual(status.wolves, ['w1']);
    assert.equal(status.agreedId, 'hunter');
    assert.deepEqual(tallyWolves(t, picks, 2, 'none', noRng).how, 'consensus');
  });

  test('không còn Sói thì coi như thống nhất (không chặn đêm)', () => {
    const t = table7([dead('w1', 1, 'vote'), dead('w2', 2, 'vote')]);
    assert.equal(wolfStatus(t, {}, 3).agreed, true);
  });
});

describe('Tiên tri, Bảo vệ, người nghi', () => {
  test('seerLook: thấy "là Sói" / "không phải Sói"', () => {
    assert.deepEqual(seerLook(table7(), 'seer', 'w2'), { seerId: 'seer', targetId: 'w2', isWolf: true });
    assert.deepEqual(seerLook(table7(), 'seer', 'witch'), { seerId: 'seer', targetId: 'witch', isWolf: false });
    assert.equal(seerLook(table7(), 'seer', 'seer'), null);
    assert.equal(seerLook(table7(), 'v1', 'w1'), null);
  });

  test('E15 Tiên tri soi đêm nay rồi bị cắn chết: vẫn có kết quả soi của đêm đó', () => {
    const picks = { seer: night(1, 'w1'), w1: night(1, 'seer'), w2: night(1, 'seer') };
    // Kết quả ghi lúc Xác nhận, trước khi đêm được tính.
    const atConfirm = seerLook(table7(), 'seer', 'w1');
    const result = resolveNight(nightInput({ attack: 'seer', nightPicks: picks }));
    assert.deepEqual(result.dawnDeaths, ['seer']);
    assert.deepEqual(atConfirm, { seerId: 'seer', targetId: 'w1', isWolf: true });
    // Nhật ký Đêm ① (tính khi Đêm ① kết thúc) cũng còn lần soi.
    assert.deepEqual(seerLookOf(table7(), picks, 1), atConfirm);
  });

  test('Tiên tri chưa Xác nhận thì không soi (E24)', () => {
    assert.equal(seerLookOf(table7(), { seer: night(1, 'w1', false) }, 1), null);
  });

  test('guardChoiceOf: chỉ lựa chọn đã Xác nhận, hợp lệ, của Bảo vệ còn sống', () => {
    assert.deepEqual(guardChoiceOf(table7(), { guard: night(1, 'v1') }, 1, null), { guardId: 'guard', targetId: 'v1' });
    assert.equal(guardChoiceOf(table7(), { guard: night(1, 'v1', false) }, 1, null), null);
    assert.equal(guardChoiceOf(table7(), { guard: night(1, 'v1') }, 1, 'v1'), null);
    assert.equal(guardChoiceOf(table7([dead('guard', 1, 'left')]), { guard: night(1, 'v1') }, 1, null), null);
  });

  test('người nghi (Đêm ①) và người đoán (Đêm ②) chỉ để tổng kết', () => {
    const picks: PickMap<NightPick> = {
      w1: night(1, 'v1'),
      seer: night(1, 'w1'),
      v1: night(1, 'w2', false),
      guard: night(1, 'v1'),
      witch: night(1, 'hunter'),
      hunter: night(1, 'hunter'), // tự nghi mình: không hợp lệ
    };
    assert.deepEqual(suspectPicksOf(table7(), picks, 1), { v1: 'w2', witch: 'hunter' });
    const guesses: PickMap<WitchPick> = {
      v1: witch(1, { guessId: 'v1' }),
      witch: witch(1, { guessId: 'seer' }),
      w1: witch(1, { guessId: 'hunter' }),
      seer: witch(0, { guessId: 'v1' }),
    };
    assert.deepEqual(guessPicksOf(table7(), guesses, 1), { w1: 'hunter', v1: 'v1' });
  });
});

describe('Phù thủy (rules §5.4)', () => {
  test('E5 chọn cứu X rồi độc X: engine từ chối', () => {
    assert.equal(validateWitchPick(table7(), 'witch', { heal: true, poisonId: 'v1' }, 'v1', FULL_POTIONS), 'poison-healed');
  });

  test('E5 lỡ ghi cứu X + độc X thì chỉ cứu, bình độc còn nguyên', () => {
    const r = resolveNight(nightInput({ attack: 'v1', witchPicks: { witch: witch(1, { heal: true, poisonId: 'v1' }) } }));
    assert.deepEqual(r.newDeaths, []);
    assert.deepEqual(r.witch, { witchId: 'witch', healedId: 'v1', poisonId: null });
    assert.deepEqual(r.potions, { heal: false, poison: true });
  });

  test('E6 Phù thủy bị nhắm và tự cứu: hợp lệ, sống', () => {
    assert.equal(validateWitchPick(table7(), 'witch', { heal: true, poisonId: null }, 'witch', FULL_POTIONS), null);
    const r = resolveNight(nightInput({ attack: 'witch', witchPicks: { witch: witch(1, { heal: true }) } }));
    assert.deepEqual(r.newDeaths, []);
  });

  test('E6 tự độc thì không hợp lệ', () => {
    assert.equal(validateWitchPick(table7(), 'witch', { heal: false, poisonId: 'witch' }, 'v1', FULL_POTIONS), 'poison-self');
    const r = resolveNight(nightInput({ attack: null, witchPicks: { witch: witch(1, { poisonId: 'witch' }) } }));
    assert.deepEqual(r.newDeaths, []);
    assert.deepEqual(r.potions, FULL_POTIONS);
  });

  test('validateWitchPick: hết bình, không có người bị nhắm, độc người chết, không phải Phù thủy', () => {
    const t = table7([dead('seer', 1, 'wolf')]);
    assert.equal(validateWitchPick(t, 'witch', { heal: true, poisonId: null }, 'v1', { heal: false, poison: true }), 'no-heal-potion');
    assert.equal(validateWitchPick(t, 'witch', { heal: true, poisonId: null }, null, FULL_POTIONS), 'no-attack');
    assert.equal(validateWitchPick(t, 'witch', { heal: false, poisonId: 'w1' }, null, { heal: true, poison: false }), 'no-poison-potion');
    assert.equal(validateWitchPick(t, 'witch', { heal: false, poisonId: 'seer' }, null, FULL_POTIONS), 'poison-invalid');
    assert.equal(validateWitchPick(t, 'v1', { heal: false, poisonId: 'w1' }, null, FULL_POTIONS), 'not-witch');
    assert.equal(validateWitchPick(t, 'witch', { heal: false, poisonId: null }, null, FULL_POTIONS), null);
  });

  test('E7 dùng cả cứu và độc trong một đêm: cả hai có hiệu lực', () => {
    const r = resolveNight(
      nightInput({ attack: 'v1', witchPicks: { witch: witch(1, { heal: true, poisonId: 'w2' }) } }),
    );
    assert.deepEqual(r.newDeaths, [{ id: 'w2', round: 1, cause: 'poison' }]);
    assert.deepEqual(r.potions, { heal: false, poison: false });
  });

  test('E26 Phù thủy đã chết: không ai được cứu hay bị độc', () => {
    const t = table7([dead('witch', 1, 'vote')]);
    const picks = { witch: witch(2, { heal: true, poisonId: 'w1' }) };
    assert.equal(witchActionOf(t, picks, 2, 'v1', FULL_POTIONS), null);
    const r = resolveNight(nightInput({ table: t, round: 2, attack: 'v1', witchPicks: picks }));
    assert.deepEqual(r.newDeaths, [{ id: 'v1', round: 2, cause: 'wolf' }]);
    assert.deepEqual(r.potions, FULL_POTIONS);
  });

  test('E26 Phù thủy hết bình: không ai được cứu hay bị độc', () => {
    const r = resolveNight(
      nightInput({
        attack: 'v1',
        potions: { heal: false, poison: false },
        witchPicks: { witch: witch(1, { heal: true, poisonId: 'w1' }) },
      }),
    );
    assert.equal(r.witch, null);
    assert.deepEqual(r.newDeaths, [{ id: 'v1', round: 1, cause: 'wolf' }]);
  });

  test('E24 Phù thủy hết giờ mà chưa Xác nhận: coi như không làm gì', () => {
    const r = resolveNight(
      nightInput({ attack: 'v1', witchPicks: { witch: witch(1, { heal: true, poisonId: 'w1', confirmed: false }) } }),
    );
    assert.equal(r.witch, null);
    assert.deepEqual(r.dawnDeaths, ['v1']);
    assert.deepEqual(r.potions, FULL_POTIONS);
  });

  test('quyết định của đêm trước không được tính sang đêm sau', () => {
    const r = resolveNight(nightInput({ round: 2, attack: 'v1', witchPicks: { witch: witch(1, { heal: true }) } }));
    assert.deepEqual(r.dawnDeaths, ['v1']);
  });
});

describe('tính kết quả đêm (rules §5.5)', () => {
  test('không ai bị nhắm, không ai bị độc: đêm bình yên', () => {
    const r = resolveNight(nightInput());
    assert.deepEqual(r.newDeaths, []);
    assert.deepEqual(r.dawnDeaths, []);
  });

  test('bị nhắm, không ai che, không ai cứu: chết vì Sói', () => {
    const r = resolveNight(nightInput({ attack: 'hunter' }));
    assert.deepEqual(r.newDeaths, [{ id: 'hunter', round: 1, cause: 'wolf' }]);
  });

  test('E1 Bảo vệ che đúng người bị nhắm: người đó sống, Phù thủy vẫn thấy người đó bị nhắm', () => {
    const picks = { w1: night(1, 'v1'), w2: night(1, 'v1'), guard: night(1, 'v1') };
    // Người bị nhắm được chốt từ lựa chọn của Sói, không phụ thuộc Bảo vệ.
    const attack = tallyWolves(table7(), picks, 1, 'random', noRng).targetId;
    assert.equal(attack, 'v1');
    const r = resolveNight(nightInput({ attack, nightPicks: picks }));
    assert.deepEqual(r.newDeaths, []);
    assert.equal(r.attack, 'v1');
    assert.equal(r.guardLast, 'v1');
  });

  test('E2 Phù thủy cứu người đã được Bảo vệ che: sống, bình cứu vẫn mất', () => {
    const r = resolveNight(
      nightInput({ attack: 'v1', nightPicks: { guard: night(1, 'v1') }, witchPicks: { witch: witch(1, { heal: true }) } }),
    );
    assert.deepEqual(r.newDeaths, []);
    assert.deepEqual(r.potions, { heal: false, poison: true });
  });

  test('E3 Phù thủy độc người được Bảo vệ che: người đó chết', () => {
    const r = resolveNight(
      nightInput({ nightPicks: { guard: night(1, 'seer') }, witchPicks: { witch: witch(1, { poisonId: 'seer' }) } }),
    );
    assert.deepEqual(r.newDeaths, [{ id: 'seer', round: 1, cause: 'poison' }]);
  });

  test('E4 Phù thủy độc chính người bị nhắm (không cứu): chết một lần, nguyên nhân "độc"', () => {
    const r = resolveNight(nightInput({ attack: 'v1', witchPicks: { witch: witch(1, { poisonId: 'v1' }) } }));
    assert.deepEqual(r.newDeaths, [{ id: 'v1', round: 1, cause: 'poison' }]);
    assert.deepEqual(r.dawnDeaths, ['v1']);
  });

  test('E8 Bảo vệ cố che lại người đêm trước: không che được, người đó chết', () => {
    const r = resolveNight(nightInput({ round: 2, attack: 'v1', guardLast: 'v1', nightPicks: { guard: night(2, 'v1') } }));
    assert.deepEqual(r.dawnDeaths, ['v1']);
    assert.equal(r.guardLast, null);
  });

  test('E9 Bảo vệ tự che và bị nhắm: sống', () => {
    const r = resolveNight(nightInput({ attack: 'guard', nightPicks: { guard: night(1, 'guard') } }));
    assert.deepEqual(r.newDeaths, []);
    assert.equal(r.guardLast, 'guard');
  });

  test('E21 hai người chết cùng đêm: theo thứ tự ghế, không theo nguyên nhân', () => {
    const r = resolveNight(nightInput({ attack: 'hunter', witchPicks: { witch: witch(1, { poisonId: 'seer' }) } }));
    assert.deepEqual(r.dawnDeaths, ['seer', 'hunter']);
    assert.deepEqual(r.newDeaths, [
      { id: 'seer', round: 1, cause: 'poison' },
      { id: 'hunter', round: 1, cause: 'wolf' },
    ]);
  });

  test('E24 Bảo vệ chọn mà chưa Xác nhận khi hết giờ: không che', () => {
    const r = resolveNight(nightInput({ attack: 'v1', nightPicks: { guard: night(1, 'v1', false) } }));
    assert.deepEqual(r.dawnDeaths, ['v1']);
    assert.equal(r.guardLast, null);
  });

  test('người bị nhắm đã rời làng trong lúc đêm: không chết thêm lần nữa', () => {
    const t = table7([dead('v1', 1, 'left')]);
    const r = resolveNight(nightInput({ table: t, attack: 'v1' }));
    assert.deepEqual(r.newDeaths, []);
    assert.equal(r.attack, null);
  });

  test('Phù thủy cứu người bị nhắm nhưng người đó rời làng giữa Đêm ②: bình cứu còn nguyên', () => {
    const t = table7([dead('v1', 1, 'left')]);
    const r = resolveNight(nightInput({ table: t, attack: 'v1', witchPicks: { witch: witch(1, { heal: true }) } }));
    assert.deepEqual(r.newDeaths, []);
    assert.equal(r.witch, null);
    assert.deepEqual(r.potions, FULL_POTIONS);
  });

  test('Phù thủy độc người đã rời làng giữa Đêm ②: không ai chết thêm, bình độc còn nguyên', () => {
    const t = table7([dead('seer', 1, 'left')]);
    const r = resolveNight(nightInput({ table: t, witchPicks: { witch: witch(1, { poisonId: 'seer' }) } }));
    assert.deepEqual(r.newDeaths, []);
    assert.deepEqual(r.potions, FULL_POTIONS);
  });
});
