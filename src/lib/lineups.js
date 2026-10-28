// スタメンとフォーメーション（lineups.csv）
// line：0=GK、1=最終ライン、2=その前… / slot：宮崎が上に攻める向きで左から1。
// 出典は Jリーグ公式の試合ページ（フォーメーション図の位置）。左右がわからない試合だけ CB を 2-3・ボランチを 1-2 と書き、同じ行に並べる

const ROLE = {
  '0:1': 'GK',
  '1:1': '左SB', '1:2-3': 'CB', '1:2': 'CB', '1:3': 'CB', '1:4': '右SB',
  '2:1-2': 'ボランチ', '2:1': 'ボランチ', '2:2': 'ボランチ',
  '3:1': '左SH', '3:2': 'トップ下', '3:3': '右SH',
  '4:1': 'CF',
};
const ROLE_ORDER = ['GK', '左SB', 'CB', '右SB', 'ボランチ', '左SH', 'トップ下', '右SH', 'CF'];
export const roleOf = r => ROLE[`${r.line}:${r.slot}`] || '';

/** 同じ XI に同じ苗字がいるときだけフルネーム、ほかは苗字だけ */
function shortNames(names) {
  const fam = n => n.split(' ')[0];
  const cnt = {};
  names.forEach(n => { cnt[fam(n)] = (cnt[fam(n)] || 0) + 1; });
  return new Map(names.map(n => [n, cnt[fam(n)] > 1 ? n : fam(n)]));
}
const slotKey = s => Number(String(s).split('-')[0]);

/**
 * 試合ごとのスタメン（新しい順）と、ポジション別の顔ぶれ
 * @param {{lineups:any[], matches:any[], players:any[]}} D
 */
export function buildLineups(D) {
  const noOf = new Map(D.players.map(p => [p.name, p.no]));
  const byRound = new Map();
  for (const r of D.lineups) (byRound.get(r.round) || byRound.set(r.round, []).get(r.round)).push(r);
  const games = [...D.matches].sort((a, b) => Number(b.round) - Number(a.round)).filter(m => byRound.has(String(m.round))).map(m => {
    const rows = byRound.get(String(m.round));
    const short = shortNames(rows.map(r => r.name));
    const lines = [];
    for (const r of rows) (lines[Number(r.line)] ||= []).push(r);
    return {
      round: m.round, date: m.date, opponent: m.opponent, ha: m.ha, gf: m.gf, ga: m.ga, result: m.result,
      formation: rows[0].formation,
      // 上（前線）から下（GK）へ
      lines: lines.filter(Boolean).reverse().map(l => l.sort((a, b) => slotKey(a.slot) - slotKey(b.slot))
        .map(r => ({ name: r.name, short: short.get(r.name), no: noOf.get(r.name) || '', role: roleOf(r) }))),
    };
  });
  const forms = {};
  D.lineups.filter(r => r.line === '0').forEach(r => { forms[r.formation] = (forms[r.formation] || 0) + 1; });
  const formations = Object.entries(forms).sort((a, b) => b[1] - a[1]).map(([f, n]) => ({ formation: f, games: n }));
  // ポジション別：誰が何試合
  const roles = ROLE_ORDER.map(role => {
    const c = {};
    D.lineups.filter(r => roleOf(r) === role).forEach(r => { c[r.name] = (c[r.name] || 0) + 1; });
    return { role, players: Object.entries(c).sort((a, b) => b[1] - a[1]).map(([name, games]) => ({ name, games })) };
  });
  // 全試合スタメン
  const starts = {};
  D.lineups.forEach(r => { starts[r.name] = (starts[r.name] || 0) + 1; });
  const total = games.length;
  const ironmen = Object.entries(starts).filter(([, n]) => n === total).map(([n]) => n);
  // 左右がわからないまま並べている試合
  const unsure = [...new Set(D.lineups.filter(r => String(r.slot).includes('-')).map(r => Number(r.round)))].sort((a, b) => a - b);
  return { games, formations, roles, ironmen, total, unsure };
}
