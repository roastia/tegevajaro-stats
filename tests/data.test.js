// 数字の検算。1つでも失敗したら公開しない（GitHub Actions で実行）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readCsv, getData, getShareables, sharePath } from '../src/lib/data.js';
import { RECORDS } from '../src/lib/meta.js';
import { xLength } from '../src/lib/util.js';
import { SITE } from '../src/config/site.js';
import fs from 'node:fs';
import { updatePost } from '../src/lib/updates.js';

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
    const url = `${SITE.url}/${sharePath(s)}`;
    assert.ok(xLength(s.text, url) <= 280, `${s.kind}/${s.id}: ${xLength(s.text, url)}`);
  }
});

test('更新履歴：日付が正しく重ならず、ポスト文がXの文字数（280）に収まる', () => {
  const ups = JSON.parse(fs.readFileSync(new URL('../src/data/updates.json', import.meta.url), 'utf8'));
  const dates = ups.map(u => u.date);
  assert.equal(new Set(dates).size, dates.length);
  for (const u of ups) {
    assert.match(u.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(u.items.length > 0, u.date);
    const { text } = updatePost(u);
    assert.ok(xLength(text, `${SITE.url}/updates/#u-${u.date}`) <= 280, `${u.date}: ${xLength(text, 'x')}`);
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

test('おすすめスポット：載せる場所のデータの形（緯度経度は宮崎近辺の数字・X アカウントの形・Google マップの place_id）', () => {
  const rows = readCsv('spots');
  const ids = new Set();
  for (const r of rows) {
    assert.ok(r.id && !ids.has(r.id), `id がない・重なっている：${r.name}`); ids.add(r.id);
    assert.ok(r.name && r.info, `名前とひとことは必須：${r.id}`);
    assert.ok(+r.lat > 24 && +r.lat < 46 && +r.lng > 122 && +r.lng < 154, `緯度経度が日本の範囲にない：${r.name}`);
    assert.ok(!r.x_handle || /^[A-Za-z0-9_]{1,15}$/.test(r.x_handle), `X アカウントの形：${r.name}`);
    assert.ok(![r.name, r.area, r.info].some(v => /https?:|<|>/.test(v || '')), `URL やタグは入れない：${r.name}`);
    assert.ok(!r.url || /^https:\/\/[^\s<>"']+$/.test(r.url), `公式サイトは https の URL：${r.name}`);
    assert.ok(/^ChIJ[A-Za-z0-9_-]{10,}$/.test(r.place_id || ''), `Google マップの place_id がない：${r.name}`);
  }
});

test('スタジアムからの距離の計算と表示', async () => {
  const { STADIUM, distanceKm, distanceLabel } = await import('../src/lib/util.js');
  assert.equal(distanceKm(STADIUM.lat, STADIUM.lng, STADIUM.lat, STADIUM.lng), 0);
  const km = distanceKm(STADIUM.lat, STADIUM.lng, STADIUM.lat + 0.1, STADIUM.lng);  // 緯度0.1度 ≒ 11.1km
  assert.ok(km > 11 && km < 11.2, String(km));
  assert.equal(distanceLabel(0.34), '約300m');
  assert.equal(distanceLabel(0.02), '約100m');
  assert.equal(distanceLabel(3.456), '約3.5km');
  assert.equal(distanceLabel(24.6), '約25km');
});

test('会場の位置：全試合に日本の中の位置が入っていて、日程の会場はすべて venues.csv にある', () => {
  const inJapan = (lat, lng) => lat > 24 && lat < 46 && lng > 122 && lng < 146;
  for (const m of matches) assert.ok(inJapan(Number(m.venue_lat), Number(m.venue_lng)), `第${m.round}節 ${m.venue}：${m.venue_lat},${m.venue_lng}`);
  const venues = readCsv('venues');
  for (const v of venues) assert.ok(inJapan(Number(v.lat), Number(v.lng)), v.venue);
  const known = new Set(venues.map(v => v.venue));
  for (const f of readCsv('fixtures')) assert.ok(known.has(f.venue), `第${f.round}節の会場「${f.venue}」の位置が venues.csv にない`);
});

test('アウェイ遠征：最遠の会場は宮崎から2,000km以内（位置の入れ忘れで地球の裏まで行かない）', () => {
  const t = getData().topics.find(x => x.id === 'travel');
  if (!t) return;
  const far = Number((t.sub.match(/最遠は.*?約([\d,]+)km/) || [])[1]?.replace(/,/g, '') || 0);
  assert.ok(far > 0 && far < 2000, t.sub);
});

test('Football LAB 由来のランキングは、何節までの値かを持つ（ほかのデータと節をそろえる）', () => {
  for (const r of RECORDS.filter(r => r.src === 'Football LAB')) assert.ok(Number.isInteger(r.upto) && r.upto > 0, `${r.id} に upto がない`);
  const d = getData();
  const fin = d.rankings.find(x => x.meta.id === 'finisher');
  const lab = RECORDS.find(r => r.id === 'finisher').upto;
  for (const row of fin?.rows || []) {
    const p = players.find(x => x.name === row.name);
    const g = goals.filter(x => x.scorer === row.name && Number(x.round) <= lab).length;
    assert.equal(row.display, `${(g / Number(p.shots) * 100).toFixed(1)}%`, row.name);
  }
});

test('トピック：平日開催は祝日をのぞき、晴れは主な天気が晴れの試合だけ', () => {
  const d = getData();
  const wk = d.topics.find(t => t.id === 'weekday');
  const n = matches.filter(m => '月火水木金'.includes(m.weekday) && !['2026-11-03', '2026-09-22', '2026-09-23', '2026-11-23'].includes(m.date)).length;
  if (wk) assert.ok(wk.sub.includes(`${n}`) || wk.big.includes(`${n}`), wk.sub);
  const w = d.topics.find(t => t.id === 'weather');
  const sunny = matches.filter(m => /^晴/.test(m.weather) && !/雨/.test(m.weather)).length;
  if (w) { const m = w.sub.match(/晴れの日は(\d+)勝(\d+)分(\d+)敗/); assert.equal(Number(m[1]) + Number(m[2]) + Number(m[3]), sunny, w.sub); }
});

test('Football LAB 由来のランキングは、↑↓・首位交代の対象にしない（毎節は中身が変わらないため）', () => {
  const d = getData();
  const lab = new Set(RECORDS.filter(r => r.upto).map(r => r.id));
  assert.ok(!d.climbs.some(c => lab.has(c.id)), d.climbs.map(c => c.id).join(','));
  for (const { meta, rows } of d.rankings) if (lab.has(meta.id)) for (const r of rows) assert.equal(r._move, undefined, `${meta.id} ${r.name}`);
});

test('新しいランキング：フル出場は「先発して交代なし」の数、プレー指標の項目別は GK を入れない', () => {
  const d = getData();
  const rows = id => (d.rankings.find(r => r.meta.id === id) || { rows: [] }).rows;
  for (const r of rows('full90')) assert.equal(r.value, apps.filter(a => a.name === r.name && a.started === '1' && a.off === '99').length, r.name);
  const gk = new Set(readCsv('cbp').filter(c => c.pos === 'GK').map(c => c.name));
  for (const id of ['dribble', 'cross', 'defense']) assert.ok(!rows(id).some(r => gk.has(r.name)), id);
});

test('新しいトピック：前半リードは負けがないときだけ出し、ホームの観客数は合計と一致する', () => {
  const d = getData();
  const ht = d.topics.find(t => t.id === 'halftime');
  if (ht) assert.match(ht.big, /0敗$/);
  const hc = d.topics.find(t => t.id === 'homecrowd');
  const total = matches.filter(m => m.ha === 'H').reduce((s, m) => s + n(m.attendance), 0);
  if (hc) assert.ok(hc.big.includes(total.toLocaleString()), hc.big);
});
