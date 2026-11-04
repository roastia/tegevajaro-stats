// 試合1つ分の記録（tools/jleague_extract.js の結果を private/matches/<節>.json に保存したもの）を、CSV と site.js に書き込む
// 使い方：node tools/apply_match.mjs <節> [--rank 6] [--video https://www.youtube.com/watch?v=…]
// 書き込む：matches・appearances・goals・goals_all・lineups・players（出場・先発・分・得点・警告・退場を数え直し、アシストを足す）・suspension（警告を足す）・site.js
// 同じ節をもう一度流すと、その節の行を入れかえる（二重にならない）
import fs from 'node:fs';
import path from 'node:path';

const D = path.resolve('src/data');
const args = process.argv.slice(2);
const R = Number(args[0]);
const opt = k => { const i = args.indexOf('--' + k); return i > 0 ? args[i + 1] : ''; };
if (!R) { console.error('使い方：node tools/apply_match.mjs <節> [--rank 6] [--video URL]'); process.exit(1); }
const J = JSON.parse(fs.readFileSync(`private/matches/${R}.json`, 'utf8'));

// ---- CSV の読み書き（カンマは値に使わないルール） ----
const read = n => { const [h, ...rows] = fs.readFileSync(`${D}/${n}.csv`, 'utf8').replace(/\r/g, '').trim().split('\n'); const k = h.split(','); return { k, rows: rows.map(l => { const v = l.split(','); return Object.fromEntries(k.map((x, i) => [x, v[i] ?? ''])); }) }; };
const write = (n, t) => fs.writeFileSync(`${D}/${n}.csv`, [t.k.join(','), ...t.rows.map(r => t.k.map(x => String(r[x] ?? '').replace(/,/g, '')).join(','))].join('\n') + '\n');
const replaceRound = (t, rows, key = 'round') => { t.rows = [...t.rows.filter(r => Number(r[key]) !== R), ...rows]; return t; };

const players = read('players'), fixtures = read('fixtures'), matches = read('matches');
const fx = fixtures.rows.find(f => Number(f.round) === R);
if (!fx) throw new Error(`fixtures.csv に第${R}節がない`);
const idName = Object.fromEntries(players.rows.map(p => [(p.jl_url.match(/player\/(\d+)/) || [])[1], p.name]));
const known = new Set(players.rows.map(p => p.name));

// ---- 出来事 ----
const ev = J.ev.map(s => { const [min, label, side, type, name] = s.split('|'); return { min: Number(min), label: label.replace(/分\+(\d+)$/, '+$1分'), side, type, name }; });
const mzGoals = ev.filter(e => (e.side === 'M' && e.type === 'g') || (e.side === 'O' && e.type === 'og'));
const opGoals = ev.filter(e => (e.side === 'O' && e.type === 'g') || (e.side === 'M' && e.type === 'og'));
const unknown = [...new Set(ev.filter(e => e.side === 'M').map(e => e.name))].filter(n => !known.has(n));
if (unknown.length) throw new Error('players.csv にない選手：' + unknown.join('・') + '（新加入なら先に名簿へ）');

// ---- 出場（先発は布陣、途中出場は交代の出来事から） ----
const starters = J.starters.split(' ').map(s => { const [id, x, y] = s.split(':'); return { name: idName[id], x: Number(x), y: Number(y), id }; });
if (starters.some(s => !s.name)) throw new Error('先発の選手IDが players.csv の jl_url にない：' + starters.filter(s => !s.name).map(s => s.id).join(' '));
const mzEv = ev.filter(e => e.side === 'M');
const offAt = n => (mzEv.find(e => e.type === 'out' && e.name === n) || {}).min;
const count = (n, t) => mzEv.filter(e => e.name === n && e.type === t).length;
const cards = n => ({ yellow: count(n, 'y') + count(n, 'y2'), red: count(n, 'r') + count(n, 'y2') });
const apRows = [
  ...starters.map(s => { const off = offAt(s.name); return { round: R, name: s.name, started: 1, minutes: Math.min(90, off ?? 90), on: 0, off: off ?? 99, ...cards(s.name) }; }),
  ...mzEv.filter(e => e.type === 'in').map(e => { const off = offAt(e.name); return { round: R, name: e.name, started: 0, minutes: Math.max(0, Math.min(90, off ?? 90) - Math.min(90, e.min)), on: e.min, off: off ?? 99, ...cards(e.name) }; }),
];
// 赤紙で退場した先発・途中出場は、その分で出場終わり
for (const a of apRows) { const r = mzEv.find(e => e.name === a.name && (e.type === 'r' || e.type === 'y2')); if (r) { a.off = r.min; a.minutes = Math.max(0, Math.min(90, r.min) - (a.started ? 0 : Math.min(90, a.on))); } }

// ---- 試合 ----
const gf = mzGoals.length, ga = opGoals.length;
const result = gf > ga ? '勝' : gf < ga ? '負' : '分';
const first = [...mzGoals.map(g => ['宮崎', g.min]), ...opGoals.map(g => ['相手', g.min])].sort((a, b) => a[1] - b[1])[0];
const family = n => n.split(' ')[0];
const short = n => { const fam = family(n); const same = players.rows.filter(p => family(p.name) === fam).length > 1; return same ? fam + (n.split(' ')[1] || '').slice(0, 1) : fam; };
const byScorer = new Map(); for (const g of mzGoals.filter(g => g.type === 'g')) byScorer.set(g.name, (byScorer.get(g.name) || 0) + 1);
const scorers = [...byScorer].map(([n, c]) => short(n) + (c > 1 ? c : '')).join('・') || 'なし';
const prevVenue = matches.rows.find(m => m.venue === fx.venue) || {};
const [y, mo, d] = J.date.split('-').map(Number);
const wd = '日月火水木金土'[new Date(Date.UTC(y, mo - 1, d)).getUTCDay()];
const mrow = { round: R, date: J.date, opponent: fx.opponent, ha: J.ha, gf, ga, result, first_goal: first ? first[0] : '', scorers,
  match_url: `https://www.jleague.jp${J.url}`, video_url: opt('video') || (matches.rows.find(m => Number(m.round) === R) || {}).video_url || '',
  kickoff: fx.kickoff, weekday: wd, venue: fx.venue, venue_lat: prevVenue.venue_lat || '', venue_lng: prevVenue.venue_lng || '',
  attendance: J.att, weather: J.weather.replace(/れ$/, ''), temp: J.temp, possession: J.mz.poss, xg_for: '', xg_against: '', shots_for: J.mz.shots, shots_against: J.op.shots };
write('matches', replaceRound(matches, [mrow]));

// ---- ゴール ----
const goals = read('goals');
goals.rows = goals.rows.filter(g => Number(g.round) !== R);
for (const g of mzGoals) goals.rows.push({ goal_id: '', round: R, time: g.label, minute: g.min, scorer: g.type === 'og' ? 'オウンゴール' : g.name });
// 番号は節・分の順にふり直す（流し直しても同じ番号になる）
goals.rows.sort((a, b) => a.round - b.round || a.minute - b.minute).forEach((g, i) => { g.goal_id = 'G' + String(i + 1).padStart(2, '0'); });
write('goals', goals);
write('goals_all', replaceRound(read('goals_all'), [...mzGoals.map(g => ({ round: R, minute: g.min, time: g.label, team: '宮崎', scorer: g.type === 'og' ? 'オウンゴール' : g.name })),
  ...opGoals.map(g => ({ round: R, minute: g.min, time: g.label, team: '相手', scorer: fx.opponent }))].sort((a, b) => a.minute - b.minute)));

// ---- 出場・スタメンの配置 ----
const apBefore = read('appearances');
const already = apBefore.rows.some(a => Number(a.round) === R);   // もう入れた節（流し直し）なら、アシスト・累積警告は足さない
const ap = replaceRound(apBefore, apRows); write('appearances', ap);
const xs = [...new Set(starters.map(s => s.x))].sort((a, b) => a - b);
const luRows = xs.flatMap((x, line) => starters.filter(s => s.x === x).sort((a, b) => a.y - b.y).map((s, i) => ({ round: R, formation: J.formation, line, slot: i + 1, name: s.name })));
write('lineups', replaceRound(read('lineups'), luRows));

// ---- 選手の累計（出場記録とゴール一覧から数え直す。アシストはこの節の分を足す） ----
const allGoals = read('goals').rows;
for (const p of players.rows) {
  const mine = ap.rows.filter(a => a.name === p.name);
  const starts = mine.filter(a => Number(a.started) === 1).length;
  Object.assign(p, { apps: mine.length, starts, subs: mine.length - starts, minutes: mine.reduce((s, a) => s + Number(a.minutes), 0),
    goals: allGoals.filter(g => g.scorer === p.name).length, yellow: mine.reduce((s, a) => s + Number(a.yellow), 0), red: mine.reduce((s, a) => s + Number(a.red), 0) });
}
if (!already) {
  for (const n of Object.values(J.assists || {})) { const p = players.rows.find(x => x.name === n); if (p) p.assists = Number(p.assists || 0) + 1; else console.warn('アシストの選手が名簿にない：' + n); }
}
write('players', players);

// ---- 累積警告（この節の警告を足す。出場停止で数え直すときは手で直す） ----
const sus = read('suspension');
if (!already) {
  for (const a of apRows.filter(a => a.yellow > 0 && !a.red)) {
    let s = sus.rows.find(x => x.name === a.name);
    if (!s) { s = { name: a.name, pos: (players.rows.find(p => p.name === a.name) || {}).pos || '', yellow_total: 0, yellow_counted: 0, note: '' }; sus.rows.push(s); }
    s.yellow_total = Number(s.yellow_total) + a.yellow; s.yellow_counted = Number(s.yellow_counted) + a.yellow;
    if (s.yellow_counted >= 4) console.warn(`${a.name}：累積${s.yellow_counted}枚（出場停止の確認を）`);
  }
}
write('suspension', sus);

// ---- site.js ----
const sitePath = path.resolve('src/config/site.js');
let site = fs.readFileSync(sitePath, 'utf8');
site = site.replace(/asOf: '[^']*'/, `asOf: '${new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10)}'`)
  .replace(/roundLabel: '[^']*'/, `roundLabel: '第${R}節'`).replace(/lastMatch: '[^']*'/, `lastMatch: '${mo}/${d} ${fx.opponent}戦'`);
if (opt('rank')) site = site.replace(/rank: \d+/, `rank: ${Number(opt('rank'))}`);
fs.writeFileSync(sitePath, site);

console.log(`第${R}節 ${fx.opponent}（${J.ha === 'H' ? 'ホーム' : 'アウェイ'}）${gf}-${ga} ${result}｜得点：${scorers}｜出場${apRows.length}人｜${mrow.video_url ? '' : 'ハイライト動画URLなし（--video で入れる）'}`);
