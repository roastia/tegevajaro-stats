// 歴史のページ：Jリーグに入った2021年からの全試合（リーグ戦・プレーオフ・百年構想リーグ・天皇杯・ルヴァンカップ）
// 過去の試合は history_matches.csv・history_goals.csv（Jリーグ公式の試合ページから）。
// 今のシーズン（2026/27）のリーグ戦は matches.csv・goals.csv から、毎節の更新でそのまま増える
// PK戦で決まった試合は引き分けとして数える（スコアの横に PK を書く）
import { readCsv } from './data.js';
import { CLUB_LIST } from '../config/clubs.js';
import { COMP, resultOf } from './hsrecords.js';
export { COMP, resultOf, record, scorers, headToHead, bests } from './hsrecords.js';
// 今季の相手（略称）→ 正式名・公式サイト
const CUR = new Map(CLUB_LIST.map(([s, f, u]) => [s, { full: f, url: u }]));

const n = v => Number(v) || 0;

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
  // シーズンごとの最終順位表（Jリーグ公式データサイト）。数字は数に
  const standings = readCsv('history_standings').map(r => ({ ...r, ...Object.fromEntries(['rank', 'pts', 'p', 'w', 'd', 'l', 'gf', 'ga', 'pkw', 'pkl'].map(k => [k, Number(r[k] || 0)])) }));
  const seasons = readCsv('history_seasons').map(s => ({ ...s, table: standings.filter(r => r.season === s.season) }));
  return { matches, seasons };
}
