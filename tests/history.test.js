// ランキングの変動と記録まであと少しの検算
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { readCsv, DATASETS, getData } from '../src/lib/data.js';
import { dataUntil, movesOf, newLeaders } from '../src/lib/history.js';
import { milestones } from '../src/lib/milestones.js';

const D = Object.fromEntries(DATASETS.map(n => [n, readCsv(n)]));
const latest = Math.max(...D.matches.map(m => Number(m.round)));

test('節ごとのデータから数え直した出場・先発・分・得点・警告が players.csv と一致', () => {
  const d = dataUntil(D, latest);
  for (const p of D.players) {
    const q = d.players.find(x => x.name === p.name);
    for (const k of ['apps', 'starts', 'subs', 'minutes', 'goals', 'yellow', 'red']) assert.equal(q[k], String(Number(p[k]) || 0), `${p.name} ${k}`);
  }
});

test('rank_history.json に最新の節がある（なければ npm run snapshot）', () => {
  const h = JSON.parse(fs.readFileSync('src/data/rank_history.json', 'utf8'));
  assert.ok(String(latest) in h, `第${latest}節の順位がない。npm run snapshot を実行する`);
});

test('順位の動き：↑↓と NEW、首位浮上', () => {
  const prev = { a: { X: 2, Y: 1, Z: 3 } }, now = { a: { X: 1, Y: 2, W: 3 }, b: { X: 1 } };
  assert.deepEqual(movesOf(now, prev), { a: { X: { move: 1, isNew: false }, Y: { move: -1, isNew: false }, W: { move: 0, isNew: true } } });
  assert.deepEqual(newLeaders(now, prev), [{ id: 'a', name: 'X', from: 2 }]);
  const d = getData();
  for (const { rows } of d.rankings) for (const r of rows) if (r._move !== undefined) assert.ok(Number.isInteger(r._move));
});

test('記録まであと少し：区切りの手前・到達の判定', () => {
  const players = [{ name: 'A', apps: '3', starts: '3', minutes: '480', goals: '4', assists: '2' }];
  const matches = [1, 2, 3].map(r => ({ round: String(r), gf: '1', ga: '0', result: '勝' }));
  const appearances = [1, 2, 3].map(r => ({ round: String(r), name: 'A', started: '1', minutes: r === 3 ? '90' : '195' }));
  const goals = [{ round: '1', scorer: 'A' }, { round: '2', scorer: 'A' }, { round: '3', scorer: 'A' }, { round: '3', scorer: 'A' }];
  const m = milestones({ players, matches, appearances, goals });
  const txt = m.near.map(x => x.who + x.text);
  assert.ok(txt.includes('Aあと1点で今季5ゴール'));
  assert.ok(txt.includes('Aあと1アシストで今季3アシスト'));
  assert.ok(txt.includes('Aあと20分で今季500分出場'));
  assert.ok(txt.includes('A次も決めれば4試合連続ゴール'));
  assert.ok(m.done.some(x => x.who === 'A' && x.text === '今季3ゴール到達！'));
  assert.equal(m.round, 3);
});

test('記録まであと少し：次がアウェイなら、ホームでしか届かない区切り（観客・ホーム勝利）は出さない', () => {
  const matches = [1, 2, 3, 4].map(r => ({ round: String(r), ha: 'H', gf: '1', ga: '0', result: '勝', attendance: '2400' }));
  const base = { players: [], matches, appearances: [], goals: [] };
  const kinds = ha => milestones({ ...base, nextHa: ha }).near.map(x => x.kind);
  assert.ok(kinds('H').includes('team_attend'));
  assert.ok(kinds('H').includes('team_homewin'));
  assert.ok(!kinds('A').includes('team_attend'));
  assert.ok(!kinds('A').includes('team_homewin'));
});
