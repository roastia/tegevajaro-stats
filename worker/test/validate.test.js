import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateSubmission, validateLink, validateRemoval, REMOVAL_REASONS, jstDay, ipHash, contentKey, sha256 } from '../src/validate.js';

test('ふつうの投稿は通る', () => {
  const r = validateSubmission({ name: '道の駅 日向', area: '日向市', info: '試合前の腹ごしらえに', x_handle: '@tegesapo_1' });
  assert.equal(r.ok, true);
  assert.deepEqual(r.value, { name: '道の駅 日向', area: '日向市', info: '試合前の腹ごしらえに', x_handle: 'tegesapo_1' });
});
test('必須・長さ・URL・X アカウントの形', () => {
  assert.equal(validateSubmission({ name: '', info: 'a' }).ok, false);
  assert.equal(validateSubmission({ name: 'a', info: '' }).ok, false);
  assert.equal(validateSubmission({ name: 'あ'.repeat(61), info: 'a' }).ok, false);
  assert.equal(validateSubmission({ name: 'a', info: 'い'.repeat(301) }).ok, false);
  assert.equal(validateSubmission({ name: 'a', info: '詳しくは https://example.com' }).ok, false);
  assert.equal(validateSubmission({ name: 'a', info: 'b', x_handle: 'bad handle!' }).ok, false);
  assert.equal(validateSubmission({ name: 'a', info: 'b', x_handle: 'x'.repeat(16) }).ok, false);
});
test('おとり欄に何か入っていたら受けない', () => {
  assert.equal(validateSubmission({ name: 'a', info: 'b', website: 'spam' }).ok, false);
});
test('見えない文字や制御文字は取り除く', () => {
  const r = validateSubmission({ name: 'カフェ​‮テゲ', info: 'おいしい\n\n\tコーヒー' });
  assert.equal(r.value.name, 'カフェ テゲ');
  assert.equal(r.value.info, 'おいしい コーヒー');
});
test('IP のハッシュは日が変わると別の値になり、元の IP は含まない', async () => {
  const a = await ipHash('203.0.113.5', 'secret', '2026-10-29');
  const b = await ipHash('203.0.113.5', 'secret', '2026-10-30');
  assert.notEqual(a, b);
  assert.match(a, /^[0-9a-f]{64}$/);
  assert.equal(jstDay(new Date('2026-10-29T15:30:00Z')), '2026-10-30');
});

test('同じ内容の判定：空白・記号・大文字小文字・全角半角のちがいは同じとみなす', async () => {
  assert.equal(contentKey('テゲバ食堂', 'チキン南蛮が おいしい！'), contentKey(' テゲバ食堂 ', 'チキン南蛮がおいしい!!'));
  assert.equal(contentKey('Cafe ABC', 'Good'), contentKey('ｃａｆｅ　abc', 'good.'));
  assert.notEqual(contentKey('テゲバ食堂', 'チキン南蛮'), contentKey('テゲバ食堂', 'からあげ'));
  assert.match(await sha256('x'), /^[0-9a-f]{64}$/);
});
import { validateHeart } from '../src/validate.js';
test('ハート：スポットの id と押した・外したの形', () => {
  assert.deepEqual(validateHeart({ id: 's1', on: true }), { ok: true, value: { id: 's1', on: true } });
  assert.equal(validateHeart({ id: 's12345', on: true }).ok, false);
  assert.equal(validateHeart({ id: 'x1', on: true }).ok, false);
  assert.equal(validateHeart({ id: 's1', on: 'yes' }).ok, false);
  assert.equal(validateHeart(null).ok, false);
});

test('リンク集の情報提供：URL の形だけ受け、https:// がなければ補う', () => {
  assert.deepEqual(validateLink({ url: 'https://www.youtube.com/@tatsu51' }), { ok: true, value: { url: 'https://www.youtube.com/@tatsu51' } });
  assert.equal(validateLink({ url: 'note.com/someone' }).value.url, 'https://note.com/someone');
  assert.equal(validateLink({ url: '' }).ok, false);
  assert.equal(validateLink({ url: 'テゲバ最高' }).ok, false);
  assert.equal(validateLink({ url: 'javascript:alert(1)' }).ok, false);
  assert.equal(validateLink({ url: 'https://user:pass@example.com/' }).ok, false);
  assert.equal(validateLink({ url: 'https://example.com/' + 'a'.repeat(300) }).ok, false);
  assert.equal(validateLink({ url: 'https://example.com', website: 'spam' }).ok, false);
});

test('掲載をやめる依頼：対象は s〇・l〇、理由は決めた中から、ひとことは200文字まで', () => {
  assert.deepEqual(validateRemoval({ item: 's5', reason: REMOVAL_REASONS[1], note: '' }), { ok: true, value: { item: 's5', reason: REMOVAL_REASONS[1], note: '' } });
  assert.equal(validateRemoval({ item: 'l12', reason: 'その他', note: 'お願いします' }).ok, true);
  assert.equal(validateRemoval({ item: 'x1', reason: 'その他' }).ok, false);
  assert.equal(validateRemoval({ item: 's1', reason: 'なんとなく' }).ok, false);
  assert.equal(validateRemoval({ item: 's1', reason: 'その他', note: 'あ'.repeat(201) }).ok, false);
  assert.equal(validateRemoval({ item: 's1', reason: 'その他', website: 'spam' }).ok, false);
});
