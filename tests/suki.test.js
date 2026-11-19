// テゲスキ！：X でポストする文（先頭50字の引用）と、タグの数え方
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sukiPost, sukiQuote, tagCounts, nickOf, QUOTE_LEN, MORE } from '../src/lib/suki.js';
import { flatPost } from '../src/lib/util.js';

test('X でポスト：長いときは文の切れ目で切って「続きはテゲスキ！で」＋ #テゲスキ とハッシュタグ。かぎかっこ・名前は付けない', () => {
  const base = { id: 'k1', no: 2, date: '2026-11-20', nickname: 'テゲ太郎', tags: [] };
  // 50字までに文の終わりがある → そこまで
  const a = sukiPost({ ...base, body: 'チャントを覚えて歌えるようになったら、試合がもっと楽しくなりました。まだ全部は覚えてないけど、隣の人が教えてくれます。' });
  assert.match(flatPost(a, ''), /^チャントを覚えて歌えるようになったら、試合がもっと楽しくなりました。（続きはテゲスキ！で） #テゲスキ #テゲバジャーロ宮崎/);
  assert.ok(!/[「」]/.test(a.replace(MORE, '')) && !a.includes('テゲ太郎'));
  // 文の終わりがない → 読点の前で「…」
  const b = sukiQuote('あ'.repeat(30) + '、' + 'い'.repeat(40));
  assert.equal(b, 'あ'.repeat(30) + '…' + MORE);
  // どちらもない → 50字で「…」
  assert.equal(sukiQuote('う'.repeat(80)), 'う'.repeat(QUOTE_LEN) + '…' + MORE);
  // 短いときはそのまま（>>番号は外す）
  assert.match(flatPost(sukiPost({ ...base, nickname: '', body: '>>3\nテゲスタが大好き！' }), ''), /^テゲスタが大好き！ #テゲスキ #テゲバジャーロ宮崎/);
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
