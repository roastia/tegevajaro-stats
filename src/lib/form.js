// 直近5試合のまとめ（見出し・連勝/無敗バッジ・応援のひとこと・ポスト文）
import { postText } from './util.js';
export const RES_WORD = { '勝': '勝ち', '分': '引き分け', '負': '負け' };
export function formSummary(matches) {
  const ms = [...matches].sort((a, b) => Number(a.round) - Number(b.round));
  const last = ms.slice(-5);
  const cnt = r => last.filter(m => m.result === r).length;
  const w = cnt('勝'), d = cnt('分'), l = cnt('負');
  const gf = last.reduce((s, m) => s + Number(m.gf), 0), ga = last.reduce((s, m) => s + Number(m.ga), 0);
  const back = ok => { let c = 0; for (let i = ms.length - 1; i >= 0 && ok(ms[i]); i--) c++; return c; };
  const winRun = back(m => m.result === '勝'), unbeaten = back(m => m.result !== '負');
  const title = w === last.length ? `${w}連勝！止まらない！` : l === 0 ? '直近5試合 負けなし！' : w >= 3 ? `直近5試合で${w}勝！` : '直近5試合';
  const badges = [];
  if (winRun >= 2) badges.push(`${winRun}連勝中`);
  if (unbeaten >= 3) badges.push(`${unbeaten}試合負けなし`);
  const cheer = winRun >= 2 ? 'この勢いで次も勝ち点3を！' : unbeaten >= 3 ? '負けない強さで、次は勝ち切ろう！' : '次こそ勝ち点3を！みんなで後押ししよう！';
  const range = last.length ? `第${last[0].round}節〜第${last.at(-1).round}節` : '';
  const sub = `${range}は${w}勝${d}分${l}敗（${gf}得点・${ga}失点）`;
  const line = last.map(m => `${m.opponent} ${m.gf}-${m.ga} ${RES_WORD[m.result] || m.result}`).join('／');
  const head = `${title}${badges.length ? '（' + badges.join('・') + '）' : ''}`;
  return { last, title, badges, sub, cheer, text: postText(head, `${sub}\n${line}`, cheer) };
}

/** 今季の成績（勝・分・敗・勝ち点・得失点） */
export function seasonRecord(matches) {
  const c = r => matches.filter(m => m.result === r).length;
  const w = c('勝'), d = c('分'), l = c('負');
  const gf = matches.reduce((s, m) => s + Number(m.gf), 0), ga = matches.reduce((s, m) => s + Number(m.ga), 0);
  return { played: matches.length, w, d, l, pts: w * 3 + d, gf, ga, gd: gf - ga };
}
