// J参入（2021年）からの全試合（歴史のページと同じデータ）から作る話題と歴代ランキング。ビルド時だけ使う
// - 話題：公式戦の通算勝利（節目まで）、この日のテゲバ、次の相手との通算成績、曜日・月の成績、負けたことのない相手、トリビア
// - ランキング：J通算ゴール・ハットトリック（今チームにいない選手も含む）
// 数え方は歴史のページと同じ：PK戦で決まった試合は引き分け。オウンゴールは選手の得点に数えない
// 前向きな話題だけを出す（成績のよい曜日・月だけ。苦手な月や負け越しの話題は作らない）
import { loadHistory, record, headToHead } from './clubhistory.js';
import { matchLabel } from './hsrecords.js';
import { CLUB_LIST } from '../config/clubs.js';

const WD = ['日', '月', '火', '水', '木', '金', '土'];
const md = d => `${Number(d.slice(5, 7))}月${Number(d.slice(8, 10))}日`;
const ymd = d => `${d.slice(0, 4)}年${md(d)}`;
const min = g => Number(String(g.minute).split('+')[0]) || 0;
const ppg = r => (r.p ? r.pts / r.p : 0);
const RES = { 勝: '勝利', 分: '引き分け', 負: '敗戦' };
const scorerText = m => m.goals.map(g => (g.og ? 'オウンゴール' : g.scorer)).filter((v, i, a) => a.indexOf(v) === i).join('・');
/** 日本時間の今日（YYYY-MM-DD） */
const todayJst = (now = new Date()) => new Date(now.getTime() + 9 * 3600e3).toISOString().slice(0, 10);

/** 選手ごとのゴール（オウンゴールを除く）とハットトリック */
export function careerGoals(ms) {
  const goals = new Map(), hat = new Map();
  for (const m of ms) {
    const c = {};
    for (const g of m.goals) if (!g.og && g.scorer) { c[g.scorer] = (c[g.scorer] || 0) + 1; goals.set(g.scorer, (goals.get(g.scorer) || 0) + 1); }
    for (const [n, k] of Object.entries(c)) if (k >= 3) hat.set(n, [...(hat.get(n) || []), m]);
  }
  return { goals, hat };
}

/** 歴代ランキングの行（computeAll の records と同じ形） */
export function historyRecords() {
  const { matches } = loadHistory();
  const { goals, hat } = careerGoals(matches);
  return [
    ...[...goals].map(([name, v]) => ({ record: 'j_goals', name, value: v, display: `${v}点` })),
    ...[...hat].map(([name, list]) => ({ record: 'hattrick', name, value: list.length, display: `${list.length}回（${[...new Set(list.map(m => m.date.slice(0, 4)))].join('・')}年）` })),
  ];
}

/**
 * 話題の一覧。nextFx は次の試合（fixtures の1行）、now はビルドの時刻（日本時間の日付で「この日」を決める）
 * 返す形は calcs.js の注目トピックと同じ（id・emoji・label・headline・big・sub・cheer）＋ group（'main'＝今季の話題の先頭、'hist'＝J参入からの話題）
 */
export function historyTopics({ nextFx, now = new Date() } = {}) {
  const { matches: ms } = loadHistory();
  if (!ms.length) return [];
  const T = [];
  // 決まった過去の出来事・歴代の記録は「第〇節時点」を付けない（試合ごとに数が増える通算の数字には付ける）
  const TIMELESS = new Set(['onthisday', 'h_maxgoals', 'h_crowd']);
  const add = (group, id, emoji, label, headline, big, sub, cheer) => T.push({ group, id, emoji, label, headline, big, sub, cheer, timeless: TIMELESS.has(id) });
  const all = record(ms);

  // この日のテゲバ：過去の同じ日付の試合（負けた試合は出さない）。なければ前後3日まで
  {
    const today = todayJst(now), y = Number(today.slice(0, 4)), key = today.slice(5);
    const dayDiff = d => { const a = Date.UTC(2000, Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10))), b = Date.UTC(2000, Number(key.slice(0, 2)) - 1, Number(key.slice(3, 5))); return Math.round((a - b) / 86400e3); };
    const past = ms.filter(m => Number(m.date.slice(0, 4)) < y && m.result !== '負');
    const exact = past.filter(m => m.date.slice(5) === key);
    const near = exact.length ? exact : past.filter(m => Math.abs(dayDiff(m.date)) <= 3);
    // 勝ちを先に、点の多い試合、新しい試合の順に選ぶ
    const m = [...near].sort((a, b) => (b.result === '勝') - (a.result === '勝') || b.gf - a.gf || b.date.localeCompare(a.date))[0];
    if (m) {
      const yrs = y - Number(m.date.slice(0, 4));
      const when = m.date.slice(5) === key ? `${yrs}年前の今日` : `${yrs}年前の今ごろ`;
      add('hist', 'onthisday', '📅', 'この日のテゲバ',
        `${when}（${ymd(m.date)}）、${m.oppFull}に${m.gf}-${m.ga}で${RES[m.result]}${m.result === '勝' ? '！' : ''}`,
        `${m.gf}-${m.ga}`, `${matchLabel(m)}（${m.ha === 'H' ? 'ホーム' : 'アウェイ'}）${m.goals.length ? `。得点は${scorerText(m)}` : ''}`,
        'あの日の思い出をシェアしよう');
    }
  }

  // 次の相手との通算成績（初めての相手は「初対戦」）
  if (nextFx) {
    const h = headToHead(ms).find(x => x.opp === nextFx.opponent || x.full === nextFx.opponent_full);
    const full = nextFx.opponent_full || nextFx.opponent;
    if (h) add('hist', 'nextopp', '🤝', '次の相手との通算成績',
      `次の相手${full}とは、J参入から通算${h.p}試合${h.w}勝${h.d}分${h.l}敗`,
      `${h.w}勝${h.d}分${h.l}敗`, `前回は${ymd(h.last.date)}の${matchLabel(h.last)}で${h.last.gf}-${h.last.ga}。通算${h.gf}得点${h.ga}失点`,
      h.w > h.l ? 'この相性、次も見せよう' : '次こそ勝ち点3をつかもう');
    else add('hist', 'nextopp', '🤝', '次の相手との通算成績', `次の相手${full}とは、公式戦で初めての対戦！`, '初対戦', `${md(nextFx.date)}・${nextFx.ha === 'H' ? 'ホーム' : 'アウェイ'}`, '記念すべき初対戦を勝利で');
  }

  // 曜日：次の試合の曜日の成績が、通算の平均より良いときだけ（10試合以上）
  if (nextFx) {
    const wd = new Date(`${nextFx.date}T00:00:00Z`).getUTCDay();
    const list = ms.filter(m => new Date(`${m.date}T00:00:00Z`).getUTCDay() === wd);
    const r = record(list);
    if (r.p >= 10 && ppg(r) > ppg(all)) add('hist', 'h_weekday', '🗓️', `${WD[wd]}曜日のテゲバ`,
      `次の試合は${WD[wd]}曜日。J参入から${WD[wd]}曜日は${r.w}勝${r.d}分${r.l}敗！`,
      `${Math.round((r.w / r.p) * 100)}%`, `${WD[wd]}曜日の勝率。1試合の平均勝ち点は${ppg(r).toFixed(2)}で、通算の${ppg(all).toFixed(2)}より高い`, `${WD[wd]}曜日はテゲバの日`);
  }

  // 月：今月の成績が通算の平均より良いときだけ（10試合以上）
  {
    const mo = Number(todayJst(now).slice(5, 7));
    const byM = m => Number(m.date.slice(5, 7));
    const r = record(ms.filter(m => byM(m) === mo));
    const best = Math.max(...Array.from({ length: 12 }, (_, i) => { const x = record(ms.filter(m => byM(m) === i + 1)); return x.p >= 10 ? ppg(x) : 0; }));
    if (r.p >= 10 && ppg(r) > ppg(all)) add('hist', 'h_month', '🍂', `${mo}月のテゲバ`,
      `J参入から${mo}月は${r.w}勝${r.d}分${r.l}敗。${ppg(r) >= best ? '1年でいちばん強い月！' : '得意な月です！'}`,
      `${ppg(r).toFixed(2)}`, `${mo}月の1試合の平均勝ち点（通算は${ppg(all).toFixed(2)}）`, `${mo}月も勝ち点を積み上げよう`);
  }

  // 負けたことのない相手：今季の J2 の相手の中から（2試合以上）
  {
    const now2 = new Set(CLUB_LIST.map(c => c[0]));
    const list = headToHead(ms).filter(h => now2.has(h.opp) && h.p >= 2 && h.l === 0).sort((a, b) => b.p - a.p || b.w - a.w);
    if (list.length) add('hist', 'h_unbeaten', '🛡️', '負けたことのない相手',
      `今季の相手で、J参入から一度も負けていないのは${list.slice(0, 3).map(h => h.opp).join('・')}${list.length > 3 ? `ほか${list.length - 3}クラブ` : ''}`,
      `${list.length}クラブ`, list.slice(0, 3).map(h => `${h.opp} ${h.w}勝${h.d}分`).join('／'), 'この記録、守っていこう');
  }

  // トリビア：いちばんゴールが多い時間帯
  {
    const g = ms.flatMap(m => m.goals.filter(x => !x.og));
    const bands = [[1, 15], [16, 30], [31, 45], [46, 60], [61, 75], [76, 90]].map(([a, b]) => ({ a, b, n: g.filter(x => { const v = min(x); return b === 90 ? v >= a : (b === 45 ? v >= a && v <= 45 : v >= a && v <= b); }).length }));
    const top = [...bands].sort((x, y) => y.n - x.n)[0];
    add('hist', 'h_goaltime', '⏱️', 'ゴールが多い時間帯',
      `J参入からのゴールがいちばん多いのは${top.a}〜${top.b}分${top.b === 90 ? '（後半アディショナルタイムも含む）' : ''}`,
      `${top.n}点`, `通算${g.length}点のうち。${top.b === 90 ? '最後まで目が離せない' : 'この時間帯に注目'}`, '最後の笛まで声援を');
  }

  // トリビア：1-0の勝利
  {
    const list = ms.filter(m => m.gf === 1 && m.ga === 0), n = list.length, last = list.at(-1);
    if (n) add('hist', 'h_unozero', '🎯', '1-0の勝利', `J参入から、1-0で勝った試合は${n}回！`, `${n}回`, `いちばん最近は${Number(last.date.slice(0, 4))}年${Number(last.date.slice(5, 7))}月${Number(last.date.slice(8, 10))}日の${last.oppFull}戦`, '1点を守り切る強さ');
  }

  // トリビア：1試合の最多得点
  {
    const mx = Math.max(...ms.map(m => m.gf)), list = ms.filter(m => m.gf === mx);
    add('hist', 'h_maxgoals', '🎉', '1試合の最多得点', `J参入から、1試合の最多得点は${mx}点（${list.length}回）`,
      `${mx}点`, list.map(m => `${m.date.slice(0, 4)}年 ${m.oppFull}戦 ${m.gf}-${m.ga}`).join('／'), '次の大量得点はいつ？');
  }

  // トリビア：ゴールを決めた選手の数
  {
    const n = new Set(ms.flatMap(m => m.goals.filter(x => !x.og).map(x => x.scorer))).size;
    add('hist', 'h_scorers', '👟', 'ゴールを決めた選手', `J参入から公式戦でゴールを決めた選手は${n}人`, `${n}人`, 'みんなでつないできたゴール', '次の初ゴールは誰だ');
  }

  // トリビア：いちばん多い観客の前での試合
  {
    const m = [...ms].filter(x => x.att).sort((a, b) => b.att - a.att || a.date.localeCompare(b.date))[0];
    if (m) add('hist', 'h_crowd', '🏟️', 'いちばん多い観客', `J参入から、いちばん多い観客の前での試合は${m.att.toLocaleString()}人`,
      `${m.att.toLocaleString()}人`, `${ymd(m.date)} ${matchLabel(m)} ${m.oppFull}戦（${m.ha === 'H' ? 'ホーム' : 'アウェイ'}）${m.gf}-${m.ga}`, 'たくさんの声援が力になる');
  }
  return T;
}
