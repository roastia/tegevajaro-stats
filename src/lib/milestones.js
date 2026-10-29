// 記録まであと少し（マイルストーン）：今季の記録が区切りの数字に近い・前の節で区切りに届いた、を探す
// ビルド時とブラウザ（ダッシュボード版の index.html にも同じもの）で使う。入力は CSV の行そのまま
// - 個人：今季のゴール・アシスト・出場・先発・出場時間、連続ゴール、全試合出場
// - チーム：今季の得点・勝利・勝ち点、負けなし
// キャリア通算の記録はデータがないので扱わない

const n = v => Number(v) || 0;
const nextStep = (v, steps) => steps.find(s => s > v);
const every = (k, upto = 200) => Array.from({ length: Math.floor(upto / k) }, (_, i) => (i + 1) * k);

const P_STEPS = {
  goals: [3, 5, 10, 15, 20, 25, 30],
  assists: [3, 5, 10, 15],
  apps: [10, 20, 30, 38],
  starts: [10, 20, 30],
  minutes: [500, 1000, 1500, 2000, 2500, 3000],
};

/**
 * @returns {{ near: Array<{kind,who,text,icon,score}>, done: Array<{kind,who,text,icon}>, round:number }}
 *   near：次の試合で届くかもしれない区切り（score が大きいほど上に出す）
 *   done：最新の節で届いた区切り
 */
export function milestones({ players, matches, appearances, goals }) {
  const ms = [...matches].sort((a, b) => n(a.round) - n(b.round));
  const R = ms.length ? n(ms.at(-1).round) : 0;
  const near = [], done = [];
  if (!R) return { near, done, round: R };

  const lastAp = appearances.filter(a => n(a.round) === R);
  const lastGoals = goals.filter(g => n(g.round) === R);
  const before = (name, key) => {   // 最新の節より前の値（出場・先発・分・ゴール）
    const p = players.find(x => x.name === name);
    const a = lastAp.find(x => x.name === name);
    if (key === 'goals') return n(p.goals) - lastGoals.filter(g => g.scorer === name).length;
    if (!a) return n(p[key]);
    if (key === 'apps') return n(p.apps) - 1;
    if (key === 'starts') return n(p.starts) - n(a.started);
    if (key === 'minutes') return n(p.minutes) - n(a.minutes);
    return null;
  };

  // ---- 個人 ----
  for (const p of players) {
    const who = p.name;
    const g = n(p.goals), a = n(p.assists), ap = n(p.apps), st = n(p.starts), mi = n(p.minutes);
    if (!ap) continue;
    // ゴール
    const tg = nextStep(g, P_STEPS.goals);
    if (tg && tg - g === 1) near.push({ kind: 'goals', who, icon: 'ball', score: 90 + tg, text: `あと1点で今季${tg}ゴール` });
    const pg = before(who, 'goals');
    for (const s of P_STEPS.goals) if (pg < s && g >= s) done.push({ kind: 'goals', who, icon: 'ball', text: `今季${s}ゴール到達！` });
    // アシスト（節ごとの記録がないので「あと少し」だけ）
    const ta = nextStep(a, P_STEPS.assists);
    if (ta && ta - a === 1) near.push({ kind: 'assists', who, icon: 'gift', score: 70 + ta, text: `あと1アシストで今季${ta}アシスト` });
    // 出場・先発
    const tp = nextStep(ap, P_STEPS.apps);
    if (tp && tp - ap === 1) near.push({ kind: 'apps', who, icon: 'calendar', score: 50 + tp, text: `次に出れば今季${tp}試合出場` });
    const ts = nextStep(st, P_STEPS.starts);
    if (ts && ts - st === 1) near.push({ kind: 'starts', who, icon: 'shield', score: 45 + ts, text: `次に先発すれば今季${ts}試合先発` });
    for (const [key, steps, unit] of [['apps', P_STEPS.apps, '試合出場'], ['starts', P_STEPS.starts, '試合先発']]) {
      const b = before(who, key), v = key === 'apps' ? ap : st;
      for (const s of steps) if (b < s && v >= s) done.push({ kind: key, who, icon: key === 'apps' ? 'calendar' : 'shield', text: `今季${s}${unit}到達！` });
    }
    // 出場時間（あと90分以内）
    const tm = nextStep(mi, P_STEPS.minutes);
    if (tm && tm - mi <= 90) near.push({ kind: 'minutes', who, icon: 'stopwatch', score: 40 + tm / 100, text: `あと${tm - mi}分で今季${tm.toLocaleString()}分出場` });
    const bm = before(who, 'minutes');
    for (const s of P_STEPS.minutes) if (bm < s && mi >= s) done.push({ kind: 'minutes', who, icon: 'stopwatch', text: `今季${s.toLocaleString()}分出場に到達！` });
    // 全試合出場
    if (ap === R && R >= 5) near.push({ kind: 'allgames', who, icon: 'dumbbell', score: 60, text: `次も出れば開幕から${R + 1}試合連続出場` });
  }
  // 連続ゴール（最新の節から数えて2試合以上続いている）
  const scorersBy = r => new Set(goals.filter(g => n(g.round) === r).map(g => g.scorer));
  for (const who of scorersBy(R)) {
    let k = 0;
    for (let i = ms.length - 1; i >= 0 && scorersBy(n(ms[i].round)).has(who); i--) k++;
    if (k >= 2) near.push({ kind: 'streak', who, icon: 'flame', score: 120 + k, text: `次も決めれば${k + 1}試合連続ゴール` });
  }

  // ---- チーム ----
  const sum = (arr, f) => arr.reduce((s, m) => s + f(m), 0);
  const team = arr => ({ gf: sum(arr, m => n(m.gf)), w: arr.filter(m => m.result === '勝').length,
    pts: sum(arr, m => m.result === '勝' ? 3 : m.result === '分' ? 1 : 0) });
  const now = team(ms), prev = team(ms.slice(0, -1));
  const who = 'チーム';
  const tg = nextStep(now.gf, every(10));
  if (tg - now.gf <= 2) near.push({ kind: 'team_goals', who, icon: 'net', score: 100, text: `あと${tg - now.gf}点で今季${tg}ゴール` });
  const tw = nextStep(now.w, [5, 10, 15, 20, 25]);
  if (tw && tw - now.w === 1) near.push({ kind: 'team_wins', who, icon: 'trophy', score: 105, text: `次に勝てば今季${tw}勝` });
  const tp = nextStep(now.pts, every(10));
  if (tp - now.pts <= 3) near.push({ kind: 'team_pts', who, icon: 'coin', score: 104, text: `${tp - now.pts === 1 ? '引き分け以上' : '勝てば'}で勝ち点${tp}到達` });
  let unb = 0; for (let i = ms.length - 1; i >= 0 && ms[i].result !== '負'; i--) unb++;
  if (unb >= 3) near.push({ kind: 'team_unbeaten', who, icon: 'shield', score: 103, text: `負けなければ${unb + 1}試合負けなし` });
  for (const s of every(10)) if (prev.gf < s && now.gf >= s) done.push({ kind: 'team_goals', who, icon: 'net', text: `今季${s}ゴール到達！` });
  for (const s of [5, 10, 15, 20, 25]) if (prev.w < s && now.w >= s) done.push({ kind: 'team_wins', who, icon: 'trophy', text: `今季${s}勝到達！` });
  for (const s of every(10)) if (prev.pts < s && now.pts >= s) done.push({ kind: 'team_pts', who, icon: 'coin', text: `勝ち点${s}到達！` });

  // 同じ区切りの人はまとめる（例：4人が「次も出れば開幕から14試合連続出場」）
  const group = arr => {
    const m = new Map();
    for (const x of arr) { const k = x.kind + '|' + x.text; if (m.has(k)) m.get(k).names.push(x.who); else m.set(k, { ...x, names: [x.who] }); }
    return [...m.values()].map(x => ({ ...x, who: x.names.join('・') }));
  };
  const KIND_ORDER = ['team_wins', 'team_pts', 'team_goals', 'goals', 'apps', 'starts', 'minutes'];
  return {
    near: group(near).sort((a, b) => b.score - a.score),
    done: group(done).sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind)),
    round: R,
  };
}

/** ポスト文（改行は flatPost が「。」や空白でつなぐ） */
// fits(text)：X に収まるか。収まるまで載せる数を減らす
export function milestonePost(ms, fits = () => true) {
  const fmt = x => `${x.who}：${x.text}`;
  const make = (nd, nn) => {
    const lines = [];
    if (nd) lines.push(`第${ms.round}節で達成！ ${ms.done.slice(0, nd).map(fmt).join('／')}`);
    if (nn) lines.push(`次の試合で記録がかかる！ ${ms.near.slice(0, nn).map(fmt).join('／')}`);
    lines.push('記録の瞬間を見逃すな！');
    return lines.join('\n');
  };
  for (let nn = Math.min(3, ms.near.length); nn >= 0; nn--)
    for (let nd = Math.min(2, ms.done.length); nd >= 0; nd--) {
      if (!nn && !nd) continue;
      const t = make(nd, nn);
      if (fits(t)) return t;
    }
  return make(0, Math.min(1, ms.near.length));
}
