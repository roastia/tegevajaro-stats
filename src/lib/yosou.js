// みんなのスコア予想：次の試合（予想を受け付ける試合）と、これまでの試合の結果。ビルドとブラウザで共用（ブラウザ側は判定の文だけ）
// 受け付ける試合とキックオフの時刻は /yosou.json に出し、Worker（worker/src/index.js の /api/yosou）もそれを見て締め切る
export const YOSOU_UI_MAX = 6;   // ＋−で選べる点の上限（画像もこの範囲で作る）

const WD = ['日', '月', '火', '水', '木', '金', '土'];
export const jpDay = d => { const [y, m, dd] = d.split('-').map(Number); return `${m}/${dd}（${WD[new Date(Date.UTC(y, m - 1, dd)).getUTCDay()]}）`; };

/** 予想のスコアにひとこと（負け予想はない） */
export function verdict(gf, ga) {
  if (gf === 0 && ga === 0) return 'スコアレスドロー。守り合いの90分';
  if (gf === ga) return gf === 1 ? '1-1の引き分け。粘って勝ち点1' : `${gf}-${ga}の打ち合いでドロー`;
  const d = gf - ga;
  if (gf >= 5) return `${gf}点のゴールラッシュ！`;
  if (ga === 0) return d === 1 ? '1-0で守り切る完封勝ち！' : d >= 3 ? `${gf}-0の大勝で完封！` : `${gf}-0の完封勝ち！`;
  if (d === 1) return '1点差の競り勝ち！';
  if (d === 2) return '2点差で快勝！';
  return `${d}点差の大勝！`;
}

/** 予想を受け付ける試合（まだ結果のない、いちばん近い試合）と、これまでの試合（新しい順） */
export function yosouData({ fixtures, matches, clubFull, today }) {
  const played = new Set(matches.map(m => String(m.round)));
  const next = fixtures.filter(f => !played.has(String(f.round)) && f.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0];
  const open = next ? {
    key: next.date,
    // キックオフ未定のときは、その日の11時で締め切る
    kickoff: `${next.date}T${/^\d{1,2}:\d{2}$/.test(next.kickoff || '') ? next.kickoff.padStart(5, '0') : '11:00'}:00+09:00`,
    kickoffLabel: next.kickoff || '時刻未定',
    round: Number(next.round), opp: next.opponent, oppFull: next.opponent_full || clubFull(next.opponent),
    ha: next.ha, venue: next.venue, day: jpDay(next.date),
  } : null;
  const past = [...matches].sort((a, b) => b.date.localeCompare(a.date)).map(m => ({
    key: m.date, round: Number(m.round), opp: m.opponent, oppFull: clubFull(m.opponent), ha: m.ha,
    gf: Number(m.gf), ga: Number(m.ga), day: jpDay(m.date),
  }));
  return { open, past };
}
