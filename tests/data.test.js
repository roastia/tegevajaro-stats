// 数字の検算。1つでも失敗したら公開しない（GitHub Actions で実行）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readCsv, getData, getShareables } from '../src/lib/data.js';
import { RECORDS } from '../src/lib/meta.js';
import { xLength } from '../src/lib/util.js';
import { SITE } from '../src/config/site.js';

const n = v => Number(v) || 0;
const players = readCsv('players'), apps = readCsv('appearances'), matches = readCsv('matches');
const goals = readCsv('goals'), goalsAll = readCsv('goals_all'), profiles = readCsv('profiles');

test('試合ごとの出場記録の合計が、選手のシーズン記録と一致する', () => {
  for (const p of players) {
    const a = apps.filter(x => x.name === p.name);
    assert.equal(a.length, n(p.apps), `${p.name} の出場数`);
    assert.equal(a.filter(x => x.started === '1').length, n(p.starts), `${p.name} の先発数`);
    assert.equal(a.reduce((s, x) => s + n(x.minutes), 0), n(p.minutes), `${p.name} の出場時間`);
    assert.equal(a.reduce((s, x) => s + n(x.yellow), 0), n(p.yellow), `${p.name} の警告数`);
  }
});

test('ゴール一覧の数が、各試合のスコアと一致する', () => {
  for (const m of matches) {
    const r = String(m.round);
    assert.equal(goalsAll.filter(g => String(g.round) === r && g.team === '宮崎').length, n(m.gf), `第${r}節 宮崎の得点`);
    assert.equal(goalsAll.filter(g => String(g.round) === r && g.team === '相手').length, n(m.ga), `第${r}節 相手の得点`);
  }
  assert.equal(goals.length, matches.reduce((s, m) => s + n(m.gf), 0), '宮崎のゴール一覧の総数');
});

test('勝敗の記号がスコアと合っている', () => {
  for (const m of matches) {
    const exp = n(m.gf) > n(m.ga) ? '勝' : n(m.gf) < n(m.ga) ? '負' : '分';
    assert.equal(m.result, exp, `第${m.round}節`);
  }
});

test('連続ゴールの「継続中」は、最新の試合で決めているときだけ', () => {
  const last = String(Math.max(...matches.map(m => n(m.round))));
  for (const r of getData().records.filter(x => x.record === 'streak')) {
    if (/継続中/.test(r.display)) assert.ok(goals.some(g => String(g.round) === last && g.scorer === r.name), `${r.name}: ${r.display}`);
  }
});

test('期限付き移籍→完全移籍の選手を「帰ってきた」と数えない', () => {
  const d = getData();
  const back = d.records.filter(x => x.record === 'returnee').map(x => x.name);
  for (const name of back) {
    const steps = profiles.find(p => p.name === name).career.split('→').map(s => s.trim());
    const i = steps.lastIndexOf('テゲバジャーロ宮崎');
    assert.ok(!(steps[i - 1] === steps[i + 1] && i + 1 === steps.length - 1), `${name} は期限付きからの完全移籍`);
  }
});

test('ランキングの定義：id が重複せず、応援のひとことと説明がある', () => {
  const ids = RECORDS.map(r => r.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const r of RECORDS) { assert.ok(r.cheer, `${r.id} cheer`); assert.ok(r.note, `${r.id} note`); }
});

test('ポスト文がXの文字数（280）に収まる', () => {
  for (const s of getShareables()) {
    const url = `${SITE.url}/${s.kind}/${s.id}/`;
    assert.ok(xLength(s.text, url) <= 280, `${s.kind}/${s.id}: ${xLength(s.text, url)}`);
  }
});

test('Football LAB を切ると、その出典のランキングが消える', async () => {
  const lab = RECORDS.filter(r => r.src === 'Football LAB').map(r => r.id);
  assert.ok(lab.length > 0);
  const shown = getData().rankings.map(r => r.meta.id);
  if (SITE.footballLab) assert.ok(lab.every(id => shown.includes(id)));
  else assert.ok(lab.every(id => !shown.includes(id)));
});

test('選手の写真・エンブレム画像を使っていない（ルール4）', async () => {
  const fs = await import('node:fs');
  const files = fs.readdirSync('public', { recursive: true }).map(String);
  assert.ok(!files.some(f => /\.(jpe?g|png|webp|avif|gif)$/i.test(f) && !f.startsWith('chars')), 'public/ に写真がある（キャラ画像は public/chars/ に置く）');
});

test('GK は出場時間系・チーム貢献系のランキングに入らず、「守護神」で別に比べる', () => {
  const d = getData();
  const gk = new Set(profiles.filter(p => p.pos === 'GK').map(p => p.name));
  for (const id of ['plusminus', 'lucky', 'starter', 'golden_pair', 'wall', 'iron', 'allgames', 'young', 'veteran', 'clean']) {
    for (const r of d.records.filter(x => x.record === id)) assert.ok(!r.name.split('＆').some(n => gk.has(n)), `${id}: ${r.name}`);
  }
  const keepers = d.records.filter(x => x.record === 'keeper');
  assert.ok(keepers.length > 0 && keepers.every(r => gk.has(r.name)));
});
