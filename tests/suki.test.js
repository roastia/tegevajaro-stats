// テゲスキ！：X でポストする文（先頭50字の引用）と、タグの数え方
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sukiPost, tagCounts, nickOf, QUOTE_LEN } from '../src/lib/suki.js';
import { flatPost } from '../src/lib/util.js';

test('X でポスト：先頭50字を引用し、長いときは「～」で切る。名前とハッシュタグ', () => {
  const long = { id: 'k1', date: '2026-11-20', nickname: 'テゲ太郎', body: 'あ'.repeat(30) + '\n' + 'い'.repeat(40), tags: [] };
  const t = flatPost(sukiPost(long), '');
  const q = t.match(/「(.*?)」/)[1];
  assert.equal([...q].length, QUOTE_LEN + 1);
  assert.ok(q.endsWith('～'));
  assert.ok(!q.includes('\n'));
  assert.match(t, /— テゲ太郎さんのテゲスキ！ #テゲバジャーロ宮崎/);
  const short = { ...long, nickname: '', body: 'テゲスタが大好き！' };
  assert.match(flatPost(sukiPost(short), ''), /^「テゲスタが大好き！」— テゲサポさんのテゲスキ！/);
  assert.equal(nickOf({ nickname: 'みやざきさん' }), 'みやざきさん');
});

test('タグの数：多い順、0件は出さない', () => {
  const rows = [{ tags: ['選手', '応援'] }, { tags: ['応援'] }];
  assert.deepEqual(tagCounts(rows).map(t => [t.tag, t.n]), [['応援', 2], ['選手', 1]]);
});
