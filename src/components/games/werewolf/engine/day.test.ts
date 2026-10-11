import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeBallots, tallyDayVote } from './day.ts';
import { dead, table7 } from './testkit.ts';

// table7: w1 · seer · v1 · guard · w2 · witch · hunter (thứ tự ghế).

describe('bỏ phiếu ban ngày (rules §5.9)', () => {
  test('người đạt M bị treo khi M > B và không hoà', () => {
    const r = tallyDayVote(table7(), {
      w1: 'v1',
      seer: 'w1',
      v1: 'w1',
      guard: 'w1',
      w2: 'v1',
      witch: 'skip',
      hunter: 'w1',
    });
    assert.equal(r.outcome, 'executed');
    assert.equal(r.executedId, 'w1');
    assert.equal(r.top, 4);
    assert.equal(r.skips, 1);
    assert.deepEqual(r.counts, [
      { targetId: 'w1', votes: 4 },
      { targetId: 'v1', votes: 2 },
    ]);
  });

  test('E22 hoà M: không ai bị treo', () => {
    const r = tallyDayVote(table7(), { w1: 'v1', w2: 'v1', seer: 'w1', v1: 'w1', guard: 'skip' });
    assert.equal(r.outcome, 'tie');
    assert.equal(r.executedId, null);
  });

  test('E22 B ≥ M: không ai bị treo (kể cả B = M)', () => {
    const equal = tallyDayVote(table7(), { w1: 'v1', w2: 'v1', seer: 'skip', v1: 'skip', guard: 'skip', witch: 'skip', hunter: 'skip' });
    assert.equal(equal.top, 2);
    assert.equal(equal.skips, 5);
    assert.equal(equal.outcome, 'skips');
    assert.equal(equal.executedId, null);

    const t = table7([dead('witch', 1, 'wolf'), dead('hunter', 1, 'wolf'), dead('guard', 2, 'wolf')]);
    // Còn 4 người: 2 phiếu cho w1, 2 bỏ qua → B = M.
    const tie = tallyDayVote(t, { seer: 'w1', v1: 'w1', w1: 'skip', w2: 'skip' });
    assert.equal(tie.top, 2);
    assert.equal(tie.skips, 2);
    assert.equal(tie.executedId, null);
  });

  test('E22 M = 0 (ai cũng bỏ qua / không bầu): không ai bị treo', () => {
    const r = tallyDayVote(table7(), {});
    assert.equal(r.top, 0);
    assert.equal(r.skips, 7);
    assert.equal(r.outcome, 'no-votes');
    assert.equal(r.executedId, null);
  });

  test('E23 người không bầu tính là Bỏ qua', () => {
    const r = tallyDayVote(table7(), { w1: 'v1', w2: 'v1', seer: 'v1' });
    assert.equal(r.skips, 4);
    assert.equal(r.top, 3);
    assert.equal(r.executedId, null); // B = 4 ≥ M = 3
    assert.equal(r.ballots.hunter, 'skip');
  });

  test('E23 không được tự bầu mình: phiếu đó tính là Bỏ qua', () => {
    const r = tallyDayVote(table7(), { w1: 'w1', seer: 'w1', v1: 'w1', guard: 'w1', w2: 'w1' });
    assert.equal(r.ballots.w1, 'skip');
    assert.deepEqual(r.counts, [{ targetId: 'w1', votes: 4 }]);
    assert.equal(r.skips, 3);
    assert.equal(r.executedId, 'w1');
  });

  test('người chết không bầu, không bị bầu', () => {
    const t = table7([dead('v1', 1, 'wolf')]);
    const ballots = normalizeBallots(t, { v1: 'w1', seer: 'v1', w1: 'seer' });
    assert.equal('v1' in ballots, false);
    assert.equal(ballots.seer, 'skip');
    assert.equal(ballots.w1, 'seer');
    assert.deepEqual(Object.keys(ballots), ['w1', 'seer', 'guard', 'w2', 'witch', 'hunter']);
  });

  test('E24 hết giờ, chưa ai bầu: tất cả là Bỏ qua, không ai bị treo', () => {
    const r = tallyDayVote(table7(), { w1: null, seer: undefined });
    assert.equal(Object.values(r.ballots).every((b) => b === 'skip'), true);
    assert.equal(r.executedId, null);
  });
});
