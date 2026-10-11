import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { WIN_REASON_TEXT, checkWinner } from './win.ts';
import { dead, makeTable, table7 } from './testkit.ts';

// table7: w1 · seer · v1 · guard · w2 · witch · hunter (thứ tự ghế).

describe('điều kiện thắng (rules §2)', () => {
  test('đầu ván: chưa ai thắng', () => {
    assert.equal(checkWinner(table7()), null);
  });

  test('hết Sói: Dân thắng', () => {
    assert.deepEqual(checkWinner(table7([dead('w1', 1, 'vote'), dead('w2', 2, 'poison')])), {
      winner: 'village',
      reason: 'no-wolves',
    });
  });

  test('Sói = số người còn lại: Sói thắng', () => {
    // Còn w1, w2, seer, v1.
    const t = table7([dead('guard', 1, 'wolf'), dead('witch', 2, 'wolf'), dead('hunter', 2, 'vote')]);
    assert.deepEqual(checkWinner(t), { winner: 'wolves', reason: 'wolf-parity' });
  });

  test('Sói ít hơn số người còn lại: ván tiếp tục', () => {
    const t = table7([dead('guard', 1, 'wolf'), dead('witch', 2, 'wolf')]);
    assert.equal(checkWinner(t), null);
  });

  test('E27 mọi người cùng chết, không còn Sói: Dân thắng', () => {
    const t = makeTable({ w: 'werewolf', a: 'villager' }, [dead('w', 3, 'poison'), dead('a', 3, 'wolf')]);
    assert.deepEqual(checkWinner(t), { winner: 'village', reason: 'no-wolves' });
  });

  test('lý do thắng có câu tiếng Việt', () => {
    assert.match(WIN_REASON_TEXT['no-wolves'], /Ma Sói/);
    assert.match(WIN_REASON_TEXT['wolf-parity'], /Sói/);
  });
});
