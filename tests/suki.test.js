// テゲスキ！：X でポストする文（先頭50字の引用）と、タグの数え方
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sukiPost, tagCounts, nickOf, QUOTE_LEN } from '../src/lib/suki.js';
import { flatPost } from '../src/lib/util.js';

test('X でポスト：先頭50字（長いときは「～」）＋ #テゲスキ とハッシュタグ。かぎかっこ・名前は付けない', () => {
  const long = { id: 'k1', no: 2, date: '2026-11-20', nickname: 'テゲ太郎', body: 'あ'.repeat(30) + '\n' + 'い'.repeat(40), tags: [] };
  const t = sukiPost(long);
  const q = t.split('\n')[0];
  assert.equal([...q].length, QUOTE_LEN + 1);
  assert.ok(q.endsWith('～'));
  assert.ok(!/[「」]/.test(t) && !t.includes('テゲ太郎'));
  assert.match(flatPost(t, ''), /～ #テゲスキ #テゲバジャーロ宮崎/);
  const short = { ...long, nickname: '', body: '>>3\nテゲスタが大好き！' };
  assert.match(flatPost(sukiPost(short), ''), /^テゲスタが大好き！ #テゲスキ #テゲバジャーロ宮崎/);
  assert.equal(nickOf({ nickname: 'みやざきさん' }), 'みやざきさん');
});

test('タグの数：多い順、0件は出さない', () => {
  const rows = [{ tags: ['選手', '応援'] }, { tags: ['応援'] }];
  assert.deepEqual(tagCounts(rows).map(t => [t.tag, t.n]), [['応援', 2], ['選手', 1]]);
});

test('本文の >>12 は、あるレスだけリンクに。ほかの文字はエスケープ', async () => {
  const { bodyHtml, anchorsOf, matchTheme } = await import('../src/lib/suki.js');
  assert.equal(bodyHtml('>>2 わかる！<b>', new Set([2])), '<a class="anc" href="#r2" data-no="2">&gt;&gt;2</a> わかる！&lt;b&gt;');
  assert.equal(bodyHtml('>>9 ない', new Set([2])), '&gt;&gt;9 ない');
  assert.deepEqual(anchorsOf('>>2 と ＞＞3'), [2, 3]);
  assert.equal(matchTheme('2026-11-21', ['2026-11-21']).t, '今日の試合');
  assert.equal(matchTheme('2026-11-22', ['2026-11-21']).t, '昨日の試合');
  assert.equal(matchTheme('2026-11-23', ['2026-11-21']), null);
});
