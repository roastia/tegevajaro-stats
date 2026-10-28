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
  assert.ok(!files.some(f => /\.(jpe?g|png|webp|avif|gif)$/i.test(f) && !f.startsWith('chars') && f !== 'apple-touch-icon.png'), 'public/ に写真がある（キャラ画像は public/chars/ に置く）');
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

test('名簿：背番号が重ならず、全員に背番号イラストと players.csv の行がある', async () => {
  const fs = await import('node:fs');
  const nos = profiles.map(p => p.no);
  assert.equal(new Set(nos).size, nos.length, '背番号の重複');
  for (const p of profiles) {
    assert.ok(['GK', 'DF', 'MF', 'FW'].includes(p.pos), `${p.name} のポジション`);
    assert.ok(players.some(x => x.name === p.name), `${p.name} が players.csv にない`);
    for (const dir of ['numbers', 'numbers-s']) assert.ok(fs.existsSync(`public/chars/${dir}/${p.no}.png`), `${p.name}（${p.no}）の背番号イラストがない → python3 tools/jersey_numbers.py`);
  }
});

test('選手名の検索：よみ（ひらがな）とローマ字がそろい、漢字・かな・ローマ字で見つかる', async () => {
  const { kanaToRomaji, nameKeys, matchName } = await import('../src/lib/namesearch.js');
  for (const p of profiles) {
    assert.match(p.kana, /^[ぁ-ゖー]+( [ぁ-ゖー]+)+$/, `${p.name} の kana`);
    assert.equal(p.romaji, kanaToRomaji(p.kana), `${p.name} の romaji`);
  }
  const find = q => profiles.filter(p => matchName(nameKeys(p), q)).map(p => p.name);
  assert.deepEqual(find('奥村'), ['奥村 晃司']);
  assert.deepEqual(find('おくむら'), ['奥村 晃司']);
  assert.deepEqual(find('オクムラ'), ['奥村 晃司']);
  assert.deepEqual(find('okumura'), ['奥村 晃司']);
  assert.deepEqual(find('Koji Okumura'), ['奥村 晃司']);
  assert.deepEqual(find('kouji'), ['奥村 晃司']);
  assert.deepEqual(find('mogi syu'), ['茂木 秀']);
  assert.deepEqual(find('ohkuma'), ['大熊 健太']);
  assert.deepEqual(find('tutumi'), ['堤 奏一郎']);
  assert.deepEqual(find('inoue'), ['井上 怜']);
  assert.deepEqual(find('tizanga'), ['松本 ケン チザンガ']);
  assert.ok(find('ch').includes('松本 ケン チザンガ'), '打ちかけの ch でも出る');
  assert.ok(find('ch').length < 5, '打ちかけの ch で関係ない選手まで出ない');
  assert.ok(find('けんた').length === 2);
  assert.equal(find('xyz').length, 0);
});

test('スタメン：各試合11人・出場記録の先発と一致・フォーメーションの人数どおりに並ぶ', async () => {
  const { buildLineups } = await import('../src/lib/lineups.js');
  const lu = readCsv('lineups'), apps = readCsv('appearances'), matches = readCsv('matches');
  for (const m of matches) {
    const rows = lu.filter(r => r.round === m.round);
    assert.equal(rows.length, 11, `第${m.round}節は11人`);
    const starters = apps.filter(a => a.round === m.round && a.started === '1').map(a => a.name).sort();
    assert.deepEqual(rows.map(r => r.name).sort(), starters, `第${m.round}節の先発`);
    const per = rows[0].formation.split('-').map(Number);
    assert.equal(rows.filter(r => r.line === '0').length, 1, `第${m.round}節のGKは1人`);
    per.forEach((n, i) => assert.equal(rows.filter(r => Number(r.line) === i + 1).length, n, `第${m.round}節 ${rows[0].formation} の${i + 1}列目`));
  }
  const L = buildLineups({ lineups: lu, matches, players: readCsv('players') });
  assert.equal(L.games.length, matches.length);
  assert.ok(L.games.every(g => g.lines.flat().every(p => p.role)), 'すべての選手にポジション名');
});

test('おすすめスポット：載せる場所のデータの形（緯度経度は宮崎近辺の数字・X アカウントの形）', () => {
  const rows = readCsv('spots');
  const ids = new Set();
  for (const r of rows) {
    assert.ok(r.id && !ids.has(r.id), `id がない・重なっている：${r.name}`); ids.add(r.id);
    assert.ok(r.name && r.info, `名前とひとことは必須：${r.id}`);
    assert.ok(+r.lat > 24 && +r.lat < 46 && +r.lng > 122 && +r.lng < 154, `緯度経度が日本の範囲にない：${r.name}`);
    assert.ok(!r.x_handle || /^[A-Za-z0-9_]{1,15}$/.test(r.x_handle), `X アカウントの形：${r.name}`);
    assert.ok(![r.name, r.area, r.info].some(v => /https?:|<|>/.test(v || '')), `URL やタグは入れない：${r.name}`);
  }
});
