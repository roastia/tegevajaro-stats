// 直近5試合のまとめ：連勝数は5試合の枠ではなく、本当に続いている数で出す
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formSummary } from '../src/lib/form.js';
import { readCsv } from '../src/lib/data.js';

const m = (round, result) => ({ round: String(round), result, gf: result === '負' ? '0' : '1', ga: result === '勝' ? '0' : '1', opponent: 'X' });

test('6連勝中なら「6連勝！」と出し、「5連勝」とは出さない', () => {
  const f = formSummary([m(1, '負'), ...[2, 3, 4, 5, 6, 7].map(r => m(r, '勝'))]);
  assert.equal(f.show, '6連勝！止まらない！');
  assert.ok(!f.badges.some(b => b.includes('連勝')), '見出しと同じ連勝のバッジは出さない');
  assert.ok(f.text.startsWith('6連勝！'));
});

test('5試合ちょうどの連勝は「5連勝！」', () => {
  const f = formSummary([m(1, '負'), ...[2, 3, 4, 5, 6].map(r => m(r, '勝'))]);
  assert.equal(f.show, '5連勝！止まらない！');
});

test('今のデータで、見出しの連勝数が試合結果から数えた連勝数と一致する', () => {
  const ms = readCsv('matches').sort((a, b) => a.round - b.round);
  let run = 0; for (let i = ms.length - 1; i >= 0 && ms[i].result === '勝'; i--) run++;
  const f = formSummary(ms);
  const shown = [f.show, ...f.badges].join(' ').match(/(\d+)連勝/);
  if (run >= 2) assert.equal(Number(shown?.[1]), run);
  else assert.ok(!shown);
});
