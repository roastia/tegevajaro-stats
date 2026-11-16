// 歴史のページ：Jリーグに入った2021年からの全試合（リーグ戦・プレーオフ・百年構想リーグ・天皇杯・ルヴァンカップ）
// 過去の試合は history_matches.csv・history_goals.csv（Jリーグ公式の試合ページから）。
// 今のシーズン（2026/27）のリーグ戦は matches.csv・goals.csv から、毎節の更新でそのまま増える
// PK戦で決まった試合は引き分けとして数える（スコアの横に PK を書く）
import { readCsv } from './data.js';
import { CLUB_LIST } from '../config/clubs.js';
// 今季の相手（略称）→ 正式名・公式サイト
const CUR = new Map(CLUB_LIST.map(([s, f, u]) => [s, { full: f, url: u }]));

export const COMP = {
  j3: { name: 'J3リーグ', league: true },
  j2: { name: 'J2リーグ', league: true },
  j2playoff: { name: 'J2昇格プレーオフ', league: false },
  j2j3: { name: '百年構想リーグ', league: false },
  emperor: { name: '天皇杯', league: false },
  leaguecup: { name: 'ルヴァンカップ', league: false },
};
const n = v => Number(v) || 0;
export const resultOf = m => (m.gf > m.ga ? '勝' : m.gf < m.ga ? '負' : '分');

export function loadHistory() {
  const hm = readCsv('history_matches'), hg = readCsv('history_goals');
  const cur = readCsv('matches'), cg = readCsv('goals');
  const goalsOf = new Map();
  for (const g of hg) {
    const list = goalsOf.get(g.id) || [];
    list.push({ minute: g.minute, scorer: g.og ? 'オウンゴール' : g.scorer, og: !!g.og });
    goalsOf.set(g.id, list);
  }
  const past = hm.map(m => ({
    id: m.id, season: m.season, comp: m.comp, round: m.round, date: m.date, ha: m.ha, opponent: m.opponent,
    oppFull: m.opponent_full, oppUrl: m.opponent_url,
    gf: n(m.gf), ga: n(m.ga), pk: m.pk_for !== '' ? [n(m.pk_for), n(m.pk_against)] : null, et: m.et === '1',
    venue: m.venue, att: m.attendance === '' ? null : n(m.attendance), url: `https://www.jleague.jp/match/${m.id}/`,
    goals: goalsOf.get(m.id) || [],
  }));
  const now = cur.map(m => ({
    id: `j2/now/${m.round}`, season: '2026/27', comp: 'j2', round: m.round, date: m.date, ha: m.ha, opponent: m.opponent,
    oppFull: CUR.get(m.opponent)?.full || m.opponent, oppUrl: CUR.get(m.opponent)?.url || '',
    gf: n(m.gf), ga: n(m.ga), pk: null, et: false, venue: m.venue, att: m.attendance === '' ? null : n(m.attendance), url: m.match_url,
    goals: cg.filter(g => String(g.round) === String(m.round)).map(g => ({ minute: String(g.minute), scorer: g.scorer, og: /オウン/.test(g.scorer) })),
  }));
  const matches = [...past, ...now].map(m => ({ ...m, result: resultOf(m), league: COMP[m.comp].league }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const seasons = readCsv('history_seasons');
  return { matches, seasons };
}

// 成績のまとめ（勝・分・敗・得点・失点・勝ち点）
export function record(ms) {
  const w = ms.filter(m => m.result === '勝').length, d = ms.filter(m => m.result === '分').length, l = ms.filter(m => m.result === '負').length;
  const gf = ms.reduce((s, m) => s + m.gf, 0), ga = ms.reduce((s, m) => s + m.ga, 0);
  return { p: ms.length, w, d, l, gf, ga, gd: gf - ga, pts: w * 3 + d };
}

// 得点ランキング（オウンゴールは数えない）
export function scorers(ms) {
  const c = new Map();
  for (const m of ms) for (const g of m.goals) if (!g.og && g.scorer) c.set(g.scorer, (c.get(g.scorer) || 0) + 1);
  return [...c].map(([name, goals]) => ({ name, goals })).sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name, 'ja'));
}

// 相手ごとの対戦成績（試合の多い順）
export function headToHead(ms) {
  const by = new Map();
  for (const m of ms) { const l = by.get(m.opponent) || []; l.push(m); by.set(m.opponent, l); }
  // 名前とリンクは、いちばん新しい対戦のときの正式名
  return [...by].map(([opp, list]) => ({ opp, full: list.at(-1).oppFull, url: list.at(-1).oppUrl, ...record(list), last: list.at(-1) }))
    .sort((a, b) => b.p - a.p || b.pts / b.p - a.pts / a.p || a.opp.localeCompare(b.opp, 'ja'));
}

// いちばん長く続いた記録（連勝・負けなし・連続得点）。試合は日付順
function longest(ms, ok) {
  let best = { n: 0, from: null, to: null }, cur = 0, from = null;
  for (const m of ms) {
    if (ok(m)) { if (!cur) from = m; cur++; if (cur > best.n) best = { n: cur, from, to: m }; }
    else cur = 0;
  }
  return best;
}

// いろいろな最多記録
export function bests(ms) {
  if (!ms.length) return [];
  const top = (arr, key) => [...arr].sort((a, b) => key(b) - key(a) || a.date.localeCompare(b.date))[0];
  const wins = ms.filter(m => m.result === '勝');
  const out = [];
  // 同じ記録の試合が何試合あるか（いちばん古い試合を出して「など〇試合」と書く）
  const most = top(ms, m => m.gf);
  out.push({ k: 'most', label: '1試合の最多得点', value: `${most.gf}点`, m: most, ties: ms.filter(m => m.gf === most.gf).length });
  if (wins.length) {
    const big = top(wins, m => m.gf - m.ga), diff = big.gf - big.ga;
    out.push({ k: 'big', label: '最大得点差の勝利', value: `${diff}点差`, m: big, ties: wins.filter(m => m.gf - m.ga === diff).length });
  }
  const att = ms.filter(m => m.att);
  const home = att.filter(m => m.ha === 'H');
  if (home.length) { const h = top(home, m => m.att); out.push({ k: 'home', label: 'ホームの最多観客', value: `${h.att.toLocaleString()}人`, m: h }); }
  if (att.length) { const a = top(att, m => m.att); out.push({ k: 'att', label: 'いちばん多い観客の前で', value: `${a.att.toLocaleString()}人`, m: a }); }
  const st = (label, b, unit) => b.n >= 2 && out.push({ k: label, label, value: `${b.n}${unit}`, range: [b.from, b.to] });
  st('最長の連勝', longest(ms, m => m.result === '勝'), '連勝');
  st('最長の負けなし', longest(ms, m => m.result !== '負'), '試合');
  st('最長の連続得点', longest(ms, m => m.gf > 0), '試合');
  return out;
}
