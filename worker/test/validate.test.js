import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateSubmission, jstDay, ipHash } from '../src/validate.js';

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
