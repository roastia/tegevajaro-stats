// ランキングの変動：節ごとの順位を記録しておき、前の節とくらべて ↑↓・NEW を出す
// - 記録は src/data/rank_history.json（{ "13": { "決勝ゴール": { "奥村 晃司": 1, … } … } … }。キーは記録の id）
// - 試合データを更新したら `npm run snapshot` でその節の順位を書き足す
import { computeAll } from './calcs.js';
import { RECORDS, rankRows } from './meta.js';

const n = v => Number(v) || 0;

/** 計算済みデータ（computeAll の結果）→ { 記録id: { 名前: 順位 } } */
export function ranksOf(all) {
  const out = {};
  for (const meta of RECORDS) {
    const rows = rankRows(meta, all.records);
    if (rows.length) out[meta.id] = Object.fromEntries(rows.map(r => [r.name, r._rank]));
  }
  return out;
}

/**
 * 第R節までの元データを作り直す（節ごとのデータ：試合・出場・ゴールを R 節までにしぼり、
 * players.csv の出場・先発・分・得点・警告・退場を出場記録とゴール一覧から数え直す）。
 * 節ごとにわからない値（アシスト・シュート・Football LAB・累積警告）は keep=true なら今の値のまま、false なら空にする。
 */
export function dataUntil(D, R, keep = true) {
  const upto = rows => rows.filter(r => n(r.round) <= R);
  const ap = upto(D.appearances), gl = upto(D.goals);
  const players = D.players.map(p => {
    const mine = ap.filter(a => a.name === p.name);
    const starts = mine.filter(a => n(a.started) === 1).length;
    return { ...p, apps: String(mine.length), starts: String(starts), subs: String(mine.length - starts),
      minutes: String(mine.reduce((s, a) => s + n(a.minutes), 0)), goals: String(gl.filter(g => g.scorer === p.name).length),
      yellow: String(mine.reduce((s, a) => s + n(a.yellow), 0)), red: String(mine.reduce((s, a) => s + n(a.red), 0)),
      ...(keep ? {} : { assists: '0', shots: '0', last_passes: '' }) };
  });
  return { ...D, players, matches: upto(D.matches), appearances: ap, goals: gl, goals_all: upto(D.goals_all),
    ...(keep ? {} : { xg: [], cbp: [], pass_pairs: [], suspension: [] }) };
}

/** 第R節までの順位。節ごとにわからない値で順位が変わる記録は入れない（まちがった矢印を出さないため） */
export function ranksUntil(D, R, asOf) {
  const a = ranksOf(computeAll(dataUntil(D, R, true), asOf));
  const b = ranksOf(computeAll(dataUntil(D, R, false), asOf));
  const same = (x, y) => JSON.stringify(x || {}) === JSON.stringify(y || {});
  return Object.fromEntries(Object.entries(a).filter(([id]) => same(a[id], b[id])));
}

/**
 * 今の順位と前の節の順位をくらべる → { 記録id: { 名前: { move, isNew } } }
 * 前の節にその記録がない（記録を始めた節・節ごとにわからない記録）ときは何も付けない
 */
export function movesOf(now, prev) {
  const out = {};
  for (const [id, cur] of Object.entries(now)) {
    const p = prev && prev[id];
    if (!p) continue;
    out[id] = Object.fromEntries(Object.entries(cur).map(([name, rk]) => [name, name in p ? { move: p[name] - rk, isNew: false } : { move: 0, isNew: true }]));
  }
  return out;
}

/** 前の節で1位でなかった人が1位になった記録（「首位浮上」） */
export function newLeaders(now, prev) {
  const out = [];
  for (const [id, cur] of Object.entries(now)) {
    const p = prev && prev[id];
    if (!p) continue;
    for (const [name, rk] of Object.entries(cur)) if (rk === 1 && p[name] !== 1) out.push({ id, name, from: p[name] || null });
  }
  return out;
}
