// 日程のカレンダー（src/lib/ics.js）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildIcs, fold } from '../src/lib/ics.js';
import { readCsv } from '../src/lib/data.js';

const o = { url: 'https://tegestats.com', stamp: '2026-11-07', team: 'テゲバジャーロ宮崎' };

test('カレンダー：日本時間のキックオフを UTC にし、2時間の予定にする', () => {
  const s = buildIcs([{ round: '17', date: '2026-11-14', kickoff: '14:00', opponent: '新潟', opponent_full: 'アルビレックス新潟', ha: 'A', venue: 'デンカビッグスワンスタジアム' }], o);
  assert.match(s, /DTSTART:20261114T050000Z\r\n/);
  assert.match(s, /DTEND:20261114T070000Z\r\n/);
  assert.match(s, /UID:j2-2026-r17@tegestats\.com/);
  assert.ok(s.endsWith('END:VCALENDAR\r\n'));
});

test('カレンダー：キックオフ未定は終日、カンマは逃がす', () => {
  const s = buildIcs([{ round: '30', date: '2027-03-31', kickoff: '', opponent: 'X', ha: 'H', venue: 'A,B' }], o);
  assert.match(s, /DTSTART;VALUE=DATE:20270331\r\n/);
  assert.match(s, /DTEND;VALUE=DATE:20270401\r\n/);
  assert.match(s, /LOCATION:A\\,B/);
});

test('カレンダー：1行は75バイトまで、全試合が入る', () => {
  const fx = readCsv('fixtures');
  const s = buildIcs(fx, o);
  for (const line of s.split('\r\n')) assert.ok(new TextEncoder().encode(line).length <= 75, line);
  assert.equal((s.match(/BEGIN:VEVENT/g) || []).length, fx.length);
  assert.equal(fold('あ'.repeat(30)).split('\r\n').length, 2);
});
