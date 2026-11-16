// 歴史のページの記録の計算と表示（ビルド時とブラウザの両方で使う。fs などは使わない）
// 「どの試合で数えるか」（シーズン×大会の種類）を選ぶと、ブラウザがこの関数で作り直す
import { categoryOf, CATEGORY_SEASON } from '../config/categories.js';
const catCls = c => ({ J1: 'j1', J2: 'j2', J3: 'j3', JFL: 'jfl' }[c] || 'ot');
export const COMP = {
  j3: { name: 'J3リーグ', league: true },
  j2: { name: 'J2リーグ', league: true },
  j2playoff: { name: 'J2昇格プレーオフ', league: false },
  j2j3: { name: '百年構想リーグ', league: false },
  emperor: { name: '天皇杯', league: false },
  leaguecup: { name: 'ルヴァンカップ', league: false },
};
export const resultOf = m => (m.gf > m.ga ? '勝' : m.gf < m.ga ? '負' : '分');

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

/* ---------- 表示（HTML の文字列） ---------- */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const md = s => { const [, m, dd] = s.split('-').map(Number); return `${m}/${dd}`; };
const haWord = h => (h === 'H' ? 'ホーム' : 'アウェイ');
export const matchLabel = m => (COMP[m.comp].league ? `第${m.round}節` : `${COMP[m.comp].name} ${m.round}`);
export const tilt = h => (h.w > h.l ? 'up' : h.w < h.l ? 'down' : 'even');
export const TILT = { up: '勝ち越し', even: '五分', down: '負け越し' };
const link = (url, text, cls = '') => url ? `<a${cls ? ` class="${cls}"` : ''} href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(text)}</a>` : `<span>${esc(text)}</span>`;
const rangeText = (a, b) => `${a.date.slice(0, 4)}年${md(a.date)}〜${b.date.slice(0, 4) !== a.date.slice(0, 4) ? b.date.slice(0, 4) + '年' : ''}${md(b.date)}`;

/** 得点ランキング：上から順に。1位は金の札（1行）、2・3位は1行ずつのカード、4位から下は棒グラフつきの列 */
function renderScorers(top, playerUrl) {
  if (!top.length) return '<p class="note">得点はありません。</p>';
  const rank = p => top.findIndex(x => x.goals === p.goals) + 1;
  const max = top[0].goals;
  const nm = p => link(playerUrl[p.name], p.name, 'pl-link');
  const list = top.slice(0, 10).map(p => ({ ...p, r: rank(p) }));
  const kings = list.filter(p => p.r === 1), podium = list.filter(p => p.r === 2 || p.r === 3), rest = list.filter(p => p.r > 3);
  return `<div class="hs-sc">
<div class="hs-king card">${kings.map(p => `<div class="hs-king-p"><span class="hs-king-rk" aria-label="1位">1</span><span class="hs-king-nm">${nm(p)}<span class="hs-king-t">${kings.length > 1 ? '1位タイ' : '得点王'}</span></span><span class="hs-king-v">${p.goals}<small>ゴール</small></span></div>`).join('')}</div>
${podium.map(p => `<div class="card hs-pod r${p.r}"><span class="hs-pod-rk">${p.r}</span><span class="hs-pod-nm">${nm(p)}</span><span class="hs-pod-v">${p.goals}<small>ゴール</small></span></div>`).join('')}
${rest.length ? `<ol class="card hs-rest">${rest.map(p => `<li><span class="bar w${Math.max(4, Math.round(p.goals / max * 100))}"></span><span class="hs-n">${p.r}</span><span class="hs-rest-nm">${nm(p)}</span><b>${p.goals}<small>ゴール</small></b></li>`).join('')}</ol>` : ''}
</div>`;
}

/** 選んだ試合の記録（成績・最多記録・得点ランキング・相手ごとの対戦成績）を HTML にする。playerUrl は 選手名→Jリーグ公式のページ */
export function renderRecords(ms, { playerUrl = {}, note = '' } = {}) {
  if (!ms.length) return '<p class="card hs-total hs-empty">この組み合わせの試合はありません。</p>';
  const rec = record(ms), top = scorers(ms), h2h = headToHead(ms), best = bests(ms);
  const span = `${ms[0].date.slice(0, 4)}年${md(ms[0].date)}〜${ms.at(-1).date.slice(0, 4)}年${md(ms.at(-1).date)}`;
  const cnt = k => h2h.filter(h => tilt(h) === k).length;
  return `<p class="hs-total card"><b>${rec.p}</b>試合　<b>${rec.w}</b>勝<b>${rec.d}</b>分<b>${rec.l}</b>敗　${rec.gf}得点・${rec.ga}失点<span class="note">（${span}${note}）</span></p>
<div class="grid hs-best">${best.map(b => `<div class="card hs-bcard"><span class="hs-bl">${esc(b.label)}</span><b class="hs-bv">${esc(b.value)}</b><span class="hs-bm">${esc(b.m
    ? `${b.m.date.slice(0, 4)}年 ${matchLabel(b.m)} ${b.m.oppFull}戦（${haWord(b.m.ha)}） ${b.m.gf}-${b.m.ga}${b.ties > 1 ? `など${b.ties}試合` : ''}`
    : rangeText(b.range[0], b.range[1]))}</span></div>`).join('')}</div>
<h3 class="hs-h3">得点ランキング</h3>
${renderScorers(top, playerUrl)}
<h3 class="hs-h3">相手ごとの対戦成績</h3>
<p class="note hs-h2h-note">勝ちが負けより多い相手は「勝ち越し」、少ない相手は「負け越し」、同じ数なら「五分」。得点・失点は、その相手との試合での宮崎の合計です。クラブ名の横は、その相手の${CATEGORY_SEASON}シーズンのカテゴリ（J1・J2・J3・JFLなど）です。</p>
<div class="hs-h2h-tools"><div class="seg hs-tilt" role="group" aria-label="対戦成績で絞り込む">${[['', 'すべて', h2h.length], ['up', '勝ち越し', cnt('up')], ['even', '五分', cnt('even')], ['down', '負け越し', cnt('down')]]
    .map(([k, name, n], i) => `<button type="button" data-tilt="${k}" aria-pressed="${i === 0}">${name}<span class="hs-tn">${n}</span></button>`).join('')}</div>
<input class="hs-search" type="search" placeholder="クラブ名で探す" aria-label="対戦相手を探す">
<label class="hs-sortl">並び順 <select class="hs-sort" aria-label="対戦成績の並び順"><option value="p">試合数</option><option value="w">勝ち</option><option value="d">引き分け</option><option value="l">負け</option><option value="gf">得点</option><option value="ga">失点</option></select></label></div>
<ul class="card hs-h2h">${h2h.map(h => `<li data-name="${esc(`${h.full} ${h.opp}`)}" data-tilt="${tilt(h)}" data-p="${h.p}" data-w="${h.w}" data-d="${h.d}" data-l="${h.l}" data-gf="${h.gf}" data-ga="${h.ga}"><span class="hs-tag ${tilt(h)}">${TILT[tilt(h)]}</span><span class="hs-ho">${link(h.url, h.full, 'club-link')}</span><span class="hs-cat c-${catCls(categoryOf(h.full))}">${categoryOf(h.full) || '－'}</span><span class="hs-hp">${h.p}試合</span><span class="hs-hr">${h.w}勝${h.d}分${h.l}敗</span><span class="hs-hg">${h.gf}得点 ${h.ga}失点</span></li>`).join('')}</ul>`;
}

/** 種類で試合を選ぶ（league：J3・J2のリーグ戦、other：それ以外、all：すべて） */
export const pickKind = (ms, kind) => kind === 'league' ? ms.filter(m => m.league) : kind === 'other' ? ms.filter(m => !m.league) : ms;
