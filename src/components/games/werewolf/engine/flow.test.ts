import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  afterDawn,
  afterDeal,
  afterHunter,
  afterNight,
  afterNightWitch,
  afterTalk,
  afterVote,
  afterVoteResult,
  applyLeave,
  dawnHunter,
  dealDone,
  hunterCanShoot,
  nightDone,
  startGame,
  talkDone,
  voteDone,
  witchDone,
  type NightOneInput,
} from './flow.ts';
import { tallyWolves, wolfStatus } from './night.ts';
import { presetFor, ROLE_ORDER } from './roles.ts';
import { withDeaths } from './table.ts';
import { dead, makeTable, noRng, night, rules, seededRng, table7, witch } from './testkit.ts';
import { FULL_POTIONS } from './types.ts';
import type { WwTable } from './types.ts';

// table7: w1 · seer · v1 · guard · w2 · witch · hunter (thứ tự ghế).

/** Bàn 5 người không có Phù thủy (bộ mặc định 5 người). */
function table5(deaths = [] as WwTable['deaths']): WwTable {
  return makeTable({ w1: 'werewolf', seer: 'seer', v1: 'villager', guard: 'guard', v2: 'villager' }, deaths);
}

function without<T>(map: Record<string, T>, id: string): Record<string, T> {
  return Object.fromEntries(Object.entries(map).filter(([k]) => k !== id));
}

function nightOne(over: Partial<NightOneInput> = {}): NightOneInput {
  return {
    table: table7(),
    round: 1,
    nightPicks: {},
    witchPicks: {},
    potions: FULL_POTIONS,
    guardLast: null,
    rules: rules(),
    ...over,
  };
}

describe('(sảnh) → deal: bắt đầu ván', () => {
  test('bộ vai hợp lệ: xáo ghế, chia vai, sang Xem vai ở vòng 0', () => {
    const players = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    const preset = presetFor(7);
    assert.ok(preset);
    const r = startGame(players, preset, seededRng(3));
    assert.ok(r.ok);
    assert.deepEqual([...r.seatOrder].sort(), players);
    assert.deepEqual(Object.keys(r.roles).sort(), players);
    for (const role of ROLE_ORDER) {
      assert.equal(Object.values(r.roles).filter((x) => x === role).length, preset[role]);
    }
    assert.equal(r.step.phase, 'deal');
    assert.equal(r.step.round, 0);
    // Cùng rng thì cùng kết quả: client khác không cần tính lại.
    assert.deepEqual(startGame(players, preset, seededRng(3)), r);
  });

  test('E28 bộ vai vi phạm: không cho bắt đầu, có lỗi tiếng Việt', () => {
    const r = startGame(['a', 'b', 'c', 'd', 'e'], { werewolf: 3, villager: 2 }, noRng);
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.deepEqual(
        r.errors.map((e) => e.code),
        ['too-many-wolves'],
      );
      assert.match(r.errors[0].message, /Sói thắng ngay từ đầu/);
    }
  });
});

describe('deal → night', () => {
  test('kết thúc sớm khi mọi người còn sống đã xem vai', () => {
    const acks = { w1: true, seer: true, v1: true, guard: true, w2: true, witch: true };
    assert.equal(dealDone(table7(), acks), false);
    assert.equal(dealDone(table7(), { ...acks, hunter: true }), true);
    // Người đã rời làng không chặn.
    assert.equal(dealDone(table7([dead('hunter', 0, 'left')]), acks), true);
  });

  test('sang Đêm 1', () => {
    assert.deepEqual(afterDeal(0), { phase: 'night', round: 1, newDeaths: [], log: [], winner: null, hunter: null });
  });
});

describe('night → night-witch / dawn', () => {
  const allConfirmed = {
    w1: night(1, 'v1'),
    seer: night(1, 'w1'),
    v1: night(1, 'w2'),
    guard: night(1, 'seer'),
    w2: night(1, 'v1'),
    witch: night(1, 'w1'),
    hunter: night(1, 'w2'),
  };

  test('kết thúc sớm khi mọi người còn sống đã Xác nhận và bầy Sói thống nhất', () => {
    assert.equal(nightDone(table7(), allConfirmed, 1), true);
  });

  test('chưa kết thúc khi còn người chưa Xác nhận', () => {
    assert.equal(nightDone(table7(), { ...allConfirmed, v1: night(1, 'w2', false) }, 1), false);
    assert.equal(nightDone(table7(), without(allConfirmed, 'hunter'), 1), false);
  });

  test('chưa kết thúc khi bầy Sói chọn khác nhau, dù ai cũng đã Xác nhận', () => {
    assert.equal(nightDone(table7(), { ...allConfirmed, w2: night(1, 'hunter') }, 1), false);
  });

  test('Xác nhận của đêm trước không được tính', () => {
    assert.equal(nightDone(table7(), allConfirmed, 2), false);
  });

  test('người chết không chặn đêm', () => {
    const t = table7([dead('hunter', 1, 'vote')]);
    assert.equal(nightDone(t, without(allConfirmed, 'hunter'), 1), true);
  });

  test('ván có Phù thủy: chốt người bị nhắm rồi sang Đêm ②, chưa ai chết', () => {
    const s = afterNight(nightOne({ nightPicks: allConfirmed }), noRng);
    assert.equal(s.phase, 'night-witch');
    assert.equal(s.round, 1);
    assert.equal(s.attack, 'v1');
    assert.equal(s.wolves.how, 'consensus');
    assert.deepEqual(s.newDeaths, []);
    assert.equal(s.night, null);
    assert.deepEqual(
      s.log.map((e) => e.kind),
      ['wolves', 'guard', 'seer', 'suspects'],
    );
  });

  test('ván không có Phù thủy: tính kết quả đêm và sang Bình minh', () => {
    const picks = { w1: night(1, 'v2'), guard: night(1, 'v1'), seer: night(1, 'w1') };
    const s = afterNight(nightOne({ table: table5(), nightPicks: picks }), noRng);
    assert.equal(s.phase, 'dawn');
    assert.equal(s.attack, 'v2');
    assert.deepEqual(s.newDeaths, [{ id: 'v2', round: 1, cause: 'wolf' }]);
    assert.deepEqual(s.night?.dawnDeaths, ['v2']);
    assert.equal(s.night?.guardLast, 'v1');
    assert.deepEqual(
      s.log.map((e) => e.kind),
      ['wolves', 'guard', 'seer', 'death'],
    );
  });

  test('E24 hết giờ, không ai hành động: không ai bị nhắm, Đêm ② vẫn chạy', () => {
    const s = afterNight(nightOne(), noRng);
    assert.equal(s.phase, 'night-witch');
    assert.equal(s.attack, null);
    assert.equal(s.wolves.how, 'none');
  });

  test('E26 Phù thủy đã chết: Đêm ② vẫn diễn ra', () => {
    const t = table7([dead('witch', 1, 'vote')]);
    const s = afterNight(nightOne({ table: t, round: 2, nightPicks: { w1: night(2, 'v1'), w2: night(2, 'v1') } }), noRng);
    assert.equal(s.phase, 'night-witch');
  });

  test('E11 hoà phiếu Sói khi hết giờ: rng do client chốt quyết định, ghi vào attack', () => {
    const picks = { w1: night(1, 'seer'), w2: night(1, 'hunter') };
    const a = afterNight(nightOne({ nightPicks: picks }), seededRng(1));
    const b = afterNight(nightOne({ nightPicks: picks }), seededRng(1));
    assert.equal(a.attack, b.attack);
    assert.ok(a.attack === 'seer' || a.attack === 'hunter');
    const none = afterNight(nightOne({ nightPicks: picks, rules: rules({ wolfTie: 'none' }) }), noRng);
    assert.equal(none.attack, null);
  });
});

describe('night-witch → dawn', () => {
  test('kết thúc sớm khi mọi người còn sống đã Xác nhận', () => {
    const t = table7([dead('v1', 1, 'wolf')]);
    const picks = {
      w1: witch(2),
      seer: witch(2),
      guard: witch(2),
      w2: witch(2),
      witch: witch(2, { heal: true }),
      hunter: witch(2, { confirmed: false }),
    };
    assert.equal(witchDone(t, picks, 2), false);
    assert.equal(witchDone(t, { ...picks, hunter: witch(2) }, 2), true);
    assert.equal(witchDone(t, { ...picks, hunter: witch(2) }, 3), false);
  });

  test('tính kết quả đêm, nhật ký Phù thủy / người đoán / người chết', () => {
    const s = afterNightWitch({
      table: table7(),
      round: 1,
      attack: 'seer',
      nightPicks: {},
      witchPicks: { witch: witch(1, { poisonId: 'w2' }), v1: witch(1, { guessId: 'seer' }) },
      potions: FULL_POTIONS,
      guardLast: null,
    });
    assert.equal(s.phase, 'dawn');
    assert.equal(s.round, 1);
    assert.deepEqual(s.night.dawnDeaths, ['seer', 'w2']);
    assert.deepEqual(s.newDeaths, s.night.newDeaths);
    assert.deepEqual(s.night.potions, { heal: true, poison: false });
    assert.deepEqual(
      s.log.map((e) => e.kind),
      ['witch', 'guesses', 'death', 'death'],
    );
  });

  test('E24 hết giờ, không ai Xác nhận: chỉ có kết quả của Sói', () => {
    const s = afterNightWitch({
      table: table7(),
      round: 1,
      attack: 'v1',
      nightPicks: {},
      witchPicks: {},
      potions: FULL_POTIONS,
      guardLast: null,
    });
    assert.deepEqual(s.night.dawnDeaths, ['v1']);
    assert.deepEqual(s.night.potions, FULL_POTIONS);
  });
});

describe('dawn → hunter / end / day-talk', () => {
  test('đêm bình yên: sang Thảo luận', () => {
    assert.equal(afterDawn({ table: table7(), round: 1, rules: rules() }).phase, 'day-talk');
  });

  test('Sói đạt điều kiện thắng ở bình minh (không có Thợ săn): kết thúc, Sói thắng', () => {
    const t = table5([dead('seer', 1, 'wolf'), dead('v1', 1, 'vote'), dead('guard', 2, 'wolf')]);
    const s = afterDawn({ table: t, round: 2, rules: rules() });
    assert.equal(s.phase, 'end');
    assert.deepEqual(s.winner, { winner: 'wolves', reason: 'wolf-parity' });
  });

  test('E16 Thợ săn bị cắn: sang bước Thợ săn sau bình minh', () => {
    const t = table7([dead('hunter', 1, 'wolf')]);
    const s = afterDawn({ table: t, round: 1, rules: rules() });
    assert.equal(s.phase, 'hunter');
    assert.deepEqual(s.hunter, { hunterId: 'hunter', after: 'dawn' });
  });

  test('E16 Thợ săn bắn xong: kiểm tra thắng sau phát bắn rồi sang Thảo luận', () => {
    const t = table7([dead('hunter', 1, 'wolf')]);
    const s = afterHunter(t, 1, { hunterId: 'hunter', after: 'dawn' }, 'w1');
    assert.equal(s.phase, 'day-talk');
    assert.equal(s.round, 1);
    assert.deepEqual(s.newDeaths, [{ id: 'w1', round: 1, cause: 'hunter' }]);
    assert.deepEqual(s.log, [{ kind: 'hunter', round: 1, hunterId: 'hunter', targetId: 'w1' }]);
    // Bắn trúng con Sói cuối: Dân thắng ngay sau phát bắn.
    const lastWolf = table7([dead('w2', 1, 'vote'), dead('hunter', 2, 'wolf')]);
    const end = afterHunter(lastWolf, 2, { hunterId: 'hunter', after: 'dawn' }, 'w1');
    assert.equal(end.phase, 'end');
    assert.deepEqual(end.winner, { winner: 'village', reason: 'no-wolves' });
  });

  test('E17 Thợ săn bị độc, tuỳ chọn tắt: không bắn, sang Thảo luận', () => {
    const t = table7([dead('hunter', 1, 'poison')]);
    const s = afterDawn({ table: t, round: 1, rules: rules({ hunterShootsWhenPoisoned: false }) });
    assert.equal(s.phase, 'day-talk');
    assert.equal(s.hunter, null);
  });

  test('E17 Thợ săn bị độc, tuỳ chọn bật: được bắn', () => {
    const t = table7([dead('hunter', 1, 'poison')]);
    const s = afterDawn({ table: t, round: 1, rules: rules({ hunterShootsWhenPoisoned: true }) });
    assert.equal(s.phase, 'hunter');
    assert.deepEqual(s.hunter, { hunterId: 'hunter', after: 'dawn' });
  });

  test('E19 Sói đạt điều kiện thắng ở bình minh nhưng Thợ săn chết và bắn trúng Sói: ván tiếp tục', () => {
    // Còn w1, w2, v1, witch sau đêm 2: Sói = số người còn lại.
    const t = table7([dead('seer', 1, 'wolf'), dead('guard', 1, 'vote'), dead('hunter', 2, 'wolf')]);
    const dawn = afterDawn({ table: t, round: 2, rules: rules() });
    assert.equal(dawn.phase, 'hunter');
    assert.equal(dawn.winner, null);
    const shot = afterHunter(t, 2, { hunterId: 'hunter', after: 'dawn' }, 'w1');
    assert.equal(shot.phase, 'day-talk');
    assert.equal(shot.winner, null);
    // Bắn trượt sang Dân thì Sói thắng sau phát bắn.
    const miss = afterHunter(t, 2, { hunterId: 'hunter', after: 'dawn' }, 'v1');
    assert.equal(miss.phase, 'end');
    assert.deepEqual(miss.winner, { winner: 'wolves', reason: 'wolf-parity' });
  });

  test('E20 Phù thủy độc trúng con Sói cuối cùng: Dân thắng ở bình minh, bỏ qua bước Thợ săn', () => {
    const before = table7([dead('w2', 1, 'vote')]);
    const night2 = afterNightWitch({
      table: before,
      round: 2,
      attack: 'hunter',
      nightPicks: {},
      witchPicks: { witch: witch(2, { poisonId: 'w1' }) },
      potions: FULL_POTIONS,
      guardLast: null,
    });
    assert.deepEqual(night2.night.dawnDeaths, ['w1', 'hunter']);
    const s = afterDawn({ table: withDeaths(before, night2.newDeaths), round: 2, rules: rules() });
    assert.equal(s.phase, 'end');
    assert.equal(s.hunter, null);
    assert.deepEqual(s.winner, { winner: 'village', reason: 'no-wolves' });
  });

  test('E21 hai người chết cùng đêm: nhật ký và bình minh theo thứ tự ghế', () => {
    const s = afterNightWitch({
      table: table7(),
      round: 1,
      attack: 'hunter',
      nightPicks: {},
      witchPicks: { witch: witch(1, { poisonId: 'seer' }) },
      potions: FULL_POTIONS,
      guardLast: null,
    });
    assert.deepEqual(
      s.log.filter((e) => e.kind === 'death').map((e) => (e.kind === 'death' ? e.id : '')),
      ['seer', 'hunter'],
    );
  });

  test('dawnHunter chỉ nhận Thợ săn chết đêm nay vì Sói (hoặc độc khi được phép)', () => {
    assert.equal(dawnHunter(table7([dead('hunter', 1, 'wolf')]), 2, rules()), null);
    assert.equal(dawnHunter(table7([dead('hunter', 2, 'left')]), 2, rules()), null);
    assert.deepEqual(dawnHunter(table7([dead('hunter', 2, 'wolf')]), 2, rules()), { hunterId: 'hunter', after: 'dawn' });
  });
});

describe('hunter → end / day-talk / night', () => {
  test('sau khi treo: bắn xong sang Đêm mới (vòng + 1)', () => {
    const t = table7([dead('hunter', 1, 'vote')]);
    const s = afterHunter(t, 1, { hunterId: 'hunter', after: 'vote' }, 'w1');
    assert.equal(s.phase, 'night');
    assert.equal(s.round, 2);
  });

  test('E24 hết giờ chưa bắn (hoặc chọn không bắn): không ai chết', () => {
    const t = table7([dead('hunter', 1, 'wolf')]);
    const s = afterHunter(t, 1, { hunterId: 'hunter', after: 'dawn' }, null);
    assert.equal(s.phase, 'day-talk');
    assert.deepEqual(s.newDeaths, []);
    assert.deepEqual(s.log, [{ kind: 'hunter', round: 1, hunterId: 'hunter', targetId: null }]);
  });

  test('bắn người đã chết hoặc chính mình: không hợp lệ, coi như không bắn', () => {
    const t = table7([dead('v1', 1, 'wolf'), dead('hunter', 2, 'vote')]);
    assert.deepEqual(afterHunter(t, 2, { hunterId: 'hunter', after: 'vote' }, 'v1').newDeaths, []);
    assert.deepEqual(afterHunter(t, 2, { hunterId: 'hunter', after: 'vote' }, 'hunter').newDeaths, []);
  });

  test('hunterCanShoot theo nguyên nhân chết', () => {
    assert.equal(hunterCanShoot('wolf', rules()), true);
    assert.equal(hunterCanShoot('vote', rules()), true);
    assert.equal(hunterCanShoot('poison', rules()), false);
    assert.equal(hunterCanShoot('poison', rules({ hunterShootsWhenPoisoned: true })), true);
    assert.equal(hunterCanShoot('left', rules({ hunterShootsWhenPoisoned: true })), false);
  });
});

describe('day-talk → day-vote', () => {
  test('kết thúc sớm khi mọi người còn sống đã sẵn sàng', () => {
    const t = table7([dead('v1', 1, 'wolf')]);
    const acks = { w1: true, seer: true, guard: true, w2: true, witch: true };
    assert.equal(talkDone(t, acks), false);
    assert.equal(talkDone(t, { ...acks, hunter: true }), true);
  });

  test('sang Bỏ phiếu, cùng vòng', () => {
    assert.equal(afterTalk(2).phase, 'day-vote');
    assert.equal(afterTalk(2).round, 2);
  });
});

describe('day-vote → vote-result', () => {
  test('kết thúc sớm khi mọi người còn sống đã bầu (kể cả Bỏ qua)', () => {
    const t = table7([dead('v1', 1, 'wolf')]);
    const votes = { w1: 'seer', seer: 'w1', guard: 'skip', w2: 'seer', witch: 'w1' };
    assert.equal(voteDone(t, votes), false);
    assert.equal(voteDone(t, { ...votes, hunter: null }), false);
    assert.equal(voteDone(t, { ...votes, hunter: 'skip' }), true);
  });

  test('có người bị treo: chết ngay ("treo"), sang Kết quả', () => {
    const s = afterVote(table7(), 1, { w1: 'seer', w2: 'seer', v1: 'seer', witch: 'seer', guard: 'w1' });
    assert.equal(s.phase, 'vote-result');
    assert.equal(s.vote.executedId, 'seer');
    assert.deepEqual(s.newDeaths, [{ id: 'seer', round: 1, cause: 'vote' }]);
    assert.equal(s.log[0].kind, 'vote');
  });

  test('không ai bị treo: không ai chết, vẫn sang Kết quả', () => {
    const s = afterVote(table7(), 1, {});
    assert.equal(s.phase, 'vote-result');
    assert.deepEqual(s.newDeaths, []);
    assert.equal(s.winner, null);
  });
});

describe('vote-result → hunter / end / night', () => {
  test('không ai bị treo: sang Đêm mới (vòng + 1)', () => {
    const s = afterVoteResult(table7(), 1, null);
    assert.equal(s.phase, 'night');
    assert.equal(s.round, 2);
  });

  test('treo con Sói cuối: Dân thắng', () => {
    const t = table7([dead('w2', 1, 'wolf'), dead('w1', 2, 'vote')]);
    const s = afterVoteResult(t, 2, 'w1');
    assert.equal(s.phase, 'end');
    assert.deepEqual(s.winner, { winner: 'village', reason: 'no-wolves' });
  });

  test('treo Dân làm Sói đủ số: Sói thắng', () => {
    const t = table5([dead('seer', 1, 'wolf'), dead('v1', 1, 'vote'), dead('guard', 2, 'vote')]);
    const s = afterVoteResult(t, 2, 'guard');
    assert.equal(s.phase, 'end');
    assert.deepEqual(s.winner, { winner: 'wolves', reason: 'wolf-parity' });
  });

  test('E18 Thợ săn bị treo: bắn sau Kết quả, rồi kiểm tra thắng, rồi sang Đêm', () => {
    const voted = afterVote(table7(), 1, {
      w1: 'hunter',
      w2: 'hunter',
      seer: 'hunter',
      guard: 'hunter',
      witch: 'hunter',
      v1: 'w1',
    });
    assert.equal(voted.vote.executedId, 'hunter');
    const t = withDeaths(table7(), voted.newDeaths);
    const res = afterVoteResult(t, 1, 'hunter');
    assert.equal(res.phase, 'hunter');
    assert.deepEqual(res.hunter, { hunterId: 'hunter', after: 'vote' });
    assert.ok(res.hunter);
    const shot = afterHunter(t, 1, res.hunter, 'w2');
    assert.equal(shot.phase, 'night');
    assert.equal(shot.round, 2);
    assert.deepEqual(shot.newDeaths, [{ id: 'w2', round: 1, cause: 'hunter' }]);
  });

  test('E18 Thợ săn bị treo rồi bắn làm Sói đủ số: Sói thắng', () => {
    // Còn w1, w2, seer, v1, hunter → treo hunter, hunter bắn seer: còn w1, w2, v1.
    const t = table7([dead('guard', 1, 'wolf'), dead('witch', 1, 'vote'), dead('hunter', 2, 'vote')]);
    const shot = afterHunter(t, 2, { hunterId: 'hunter', after: 'vote' }, 'seer');
    assert.equal(shot.phase, 'end');
    assert.deepEqual(shot.winner, { winner: 'wolves', reason: 'wolf-parity' });
  });
});

describe('E25 chủ phòng cho rời làng', () => {
  test('E25 tính là chết ("rời làng"), giữ nguyên phase khi chưa ai thắng', () => {
    const r = applyLeave(table7(), 1, 'day-talk', 'v1');
    assert.ok(r);
    assert.deepEqual(r.newDeaths, [{ id: 'v1', round: 1, cause: 'left' }]);
    assert.deepEqual(r.log, [{ kind: 'left', round: 1, id: 'v1', during: 'day-talk' }]);
    assert.equal(r.winner, null);
  });

  test('E25 Thợ săn rời làng thì không được bắn', () => {
    const r = applyLeave(table7(), 1, 'night', 'hunter');
    assert.ok(r);
    const t = withDeaths(table7(), r.newDeaths);
    assert.equal(dawnHunter(t, 1, rules({ hunterShootsWhenPoisoned: true })), null);
    assert.equal(afterDawn({ table: t, round: 1, rules: rules() }).phase, 'day-talk');
  });

  test('E25 kiểm tra thắng ngay: Sói cuối rời làng thì Dân thắng', () => {
    const t = table7([dead('w2', 1, 'vote')]);
    const r = applyLeave(t, 2, 'night', 'w1');
    assert.deepEqual(r?.winner, { winner: 'village', reason: 'no-wolves' });
  });

  test('E25 kiểm tra thắng ngay: Dân rời làng làm Sói đủ số thì Sói thắng', () => {
    const t = table5([dead('seer', 1, 'wolf'), dead('v1', 1, 'vote')]);
    const r = applyLeave(t, 2, 'day-vote', 'guard');
    assert.deepEqual(r?.winner, { winner: 'wolves', reason: 'wolf-parity' });
  });

  test('E25 Sói rời làng giữa đêm: lựa chọn đêm nay của nó không còn được tính', () => {
    const picks = { w1: night(1, 'seer'), w2: night(1, 'hunter') };
    assert.equal(wolfStatus(table7(), picks, 1).agreed, false);
    const r = applyLeave(table7(), 1, 'night', 'w2');
    assert.ok(r);
    const t = withDeaths(table7(), r.newDeaths);
    const status = wolfStatus(t, picks, 1);
    assert.equal(status.agreed, true);
    assert.deepEqual(status.counts, [{ targetId: 'seer', votes: 1 }]);
    assert.equal(tallyWolves(t, picks, 1, 'none', noRng).targetId, 'seer');
  });

  test('người đã chết, hoặc ván đã kết thúc: không làm gì', () => {
    assert.equal(applyLeave(table7([dead('v1', 1, 'wolf')]), 1, 'day-talk', 'v1'), null);
    assert.equal(applyLeave(table7(), 3, 'end', 'v1'), null);
    assert.equal(applyLeave(table7(), 1, 'night', 'nobody'), null);
  });
});
