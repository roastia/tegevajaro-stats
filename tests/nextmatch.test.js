// 次の試合：日本時間でのカウントダウンと切り替わりの検算
import test from 'node:test';
import assert from 'node:assert/strict';
import { nextMatch, splitLeft } from '../src/lib/nextmatch.js';
import { readCsv, getData } from '../src/lib/data.js';

const fixtures = readCsv('fixtures');
const matches = getData().matches;
const at = s => new Date(s);   // ISO（+09:00 付き）で日本時間を指定

test('日程：節が重ならず、日付順で、まだ結果のない節だけ', () => {
  const played = new Set(matches.map(m => m.round));
  const rounds = fixtures.map(f => f.round);
  assert.equal(new Set(rounds).size, rounds.length);
  for (let i = 1; i < fixtures.length; i++) assert.ok(fixtures[i - 1].date < fixtures[i].date);
  for (const f of fixtures) assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(f.date) && /^(\d{2}:\d{2})?$/.test(f.kickoff) && /^[HA]$/.test(f.ha), f.round);
});

test('カウントダウンと切り替わり（日本時間）', () => {
  const fx = [{ round: '14', date: '2026-10-31', kickoff: '14:00', opponent: '大分', opponent_full: '大分トリニータ', ha: 'H', venue: 'いちご宮崎新富サッカー場' },
              { round: '15', date: '2026-11-03', kickoff: '14:00', opponent: '栃木C', opponent_full: '栃木シティ', ha: 'H', venue: 'いちご宮崎新富サッカー場' }];
  const ms = [{ round: '13', opponent: '山形', gf: '2', ga: '0', result: '勝' }];
  assert.equal(nextMatch(fx, ms, at('2026-10-29T23:59+09:00')).big, 'あと2日');
  assert.equal(nextMatch(fx, ms, at('2026-10-30T00:00+09:00')).mode, 'tomorrow');
  const today = nextMatch(fx, ms, at('2026-10-31T11:30+09:00'));
  assert.equal(today.mode, 'today'); assert.ok(today.count);
  assert.deepEqual(splitLeft(today.target - at('2026-10-31T11:30+09:00').getTime()), { d: 0, h: 2, m: 30, s: 0 });
  assert.deepEqual(splitLeft(nextMatch(fx, ms, at('2026-10-29T10:00:05+09:00')).target - at('2026-10-29T10:00:05+09:00').getTime()), { d: 2, h: 3, m: 59, s: 55 });
  assert.equal(nextMatch(fx, ms, at('2026-10-31T15:00+09:00')).count, false);
  assert.equal(nextMatch(fx, ms, at('2026-10-31T15:00+09:00')).mode, 'live');
  assert.equal(nextMatch(fx, ms, at('2026-10-31T23:00+09:00')).mode, 'after');
  // 日付が変わったら次の節へ（結果の反映がまだでも）
  assert.equal(nextMatch(fx, ms, at('2026-11-01T00:00+09:00')).fx.round, '15');
  // 結果が入った節はとばす
  assert.equal(nextMatch(fx, [...ms, { round: '14', opponent: '大分', gf: '1', ga: '0', result: '勝' }], at('2026-10-31T23:00+09:00')).fx.round, '15');
  assert.equal(nextMatch(fx, ms, at('2026-11-04T00:00+09:00')), null);
});

test('前回の対戦をふまえたひとこと', () => {
  const fx = [{ round: '20', date: '2026-11-29', kickoff: '14:00', opponent: '鳥栖', opponent_full: 'サガン鳥栖', ha: 'H', venue: 'KUROKIRI STADIUM' }];
  const nx = nextMatch(fx, [{ round: '5', opponent: '鳥栖', gf: '0', ga: '2', result: '負' }], at('2026-11-20T12:00+09:00'));
  assert.match(nx.hook, /前回（第5節）は0-2。借りを返す/);
  assert.match(nextMatch(fx, [], at('2026-11-20T12:00+09:00')).hook, /スタジアムで一緒に勝ち点3/);
});
