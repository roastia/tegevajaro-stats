// 次の試合：日程（fixtures.csv）と今日の日時（日本時間）から、カウントダウンと応援のことばを作る
// ビルド時とブラウザの両方で使う。ダッシュボード版にも同じ計算がある（index.html の nextMatch）

const WD = ['日', '月', '火', '水', '木', '金', '土'];
const H = 3600e3, DAY = 86400e3;

/** 日本時間の「YYYY-MM-DD」 */
export const jstDate = now => new Date(now.getTime() + 9 * H).toISOString().slice(0, 10);
/** 日本時間の日付・時刻 → その瞬間 */
const jstInstant = (date, time = '00:00') => {
  const [y, m, d] = date.split('-').map(Number), [hh, mm] = time.split(':').map(Number);
  return Date.UTC(y, m - 1, d, hh - 9, mm);
};

/** 前回の対戦（今季） */
function lastMeeting(matches, opponent) {
  const ms = matches.filter(m => m.opponent === opponent).sort((a, b) => Number(a.round) - Number(b.round));
  return ms.at(-1) || null;
}

/** 前回の対戦をふまえたひとこと */
function hookLine(fx, prev) {
  if (prev) {
    const sc = `${prev.gf}-${prev.ga}`;
    if (prev.result === '負') return `前回（第${prev.round}節）は${sc}。借りを返すときが来た！`;
    if (prev.result === '勝') return `前回（第${prev.round}節）は${sc}で勝ち！ もう一丁いこう！`;
    return `前回（第${prev.round}節）は${sc}のドロー。今度こそ勝ち切ろう！`;
  }
  return fx.ha === 'H' ? 'スタジアムで一緒に勝ち点3をつかもう！' : '遠くからでも念を送って、勝ち点3をもぎ取ろう！';
}

/**
 * 次の試合の表示内容。試合がなければ null。
 * mode：days（2日以上前）・tomorrow（前日）・today（当日・キックオフ前）・live（試合中）・after（当日・試合後）
 */
export function nextMatch(fixtures, matches, now = new Date()) {
  const played = new Set(matches.map(m => String(m.round)));
  const t = now.getTime();
  const fx = fixtures
    .filter(f => !played.has(String(f.round)))
    .sort((a, b) => Number(a.round) - Number(b.round))
    .find(f => jstInstant(f.date) + DAY > t);   // その日の終わり（日本時間）までは「次の試合」
  if (!fx) return null;

  const days = Math.round((jstInstant(fx.date) - jstInstant(jstDate(now))) / DAY);
  const ko = fx.kickoff ? jstInstant(fx.date, fx.kickoff) : null;
  const mode = days >= 2 ? 'days' : days === 1 ? 'tomorrow'
    : !ko || t < ko ? 'today' : t < ko + 2 * H ? 'live' : 'after';

  const [, mo, d] = fx.date.split('-').map(Number);
  const wd = WD[new Date(jstInstant(fx.date) + 9 * H).getUTCDay()];
  const when = `${mo}/${d}（${wd}）${fx.kickoff ? fx.kickoff + ' キックオフ' : 'キックオフ時間は未定'}`;
  const where = `${fx.ha === 'H' ? 'ホーム' : 'アウェイ'}・${fx.venue}`;
  const prev = lastMeeting(matches, fx.opponent);
  const hook = hookLine(fx, prev);
  const vs = `${fx.opponent_full || fx.opponent}戦`;

  let big, sub;
  if (mode === 'days') { big = `あと${days}日`; sub = ''; }
  else if (mode === 'tomorrow') { big = 'いよいよあした！'; sub = ''; }
  else if (mode === 'today') { big = '今日は試合の日！'; sub = ko ? '' : 'キックオフ時間はまだ発表されていません'; }
  else if (mode === 'live') { big = '試合中！'; sub = 'みんなで念を送ろう！'; }
  else { big = 'おつかれさまでした！'; sub = '結果はこのあと反映します'; }

  const tag = `第${fx.round}節`;
  const post = mode === 'days' || mode === 'tomorrow'
    ? `次は${mo}/${d}（${wd}）${fx.ha === 'H' ? 'ホーム' : 'アウェイ'}で${vs}！\n${mode === 'tomorrow' ? 'いよいよあした' : `あと${days}日`}\n${hook}`
    : mode === 'today' ? `今日は${vs}！${fx.kickoff ? fx.kickoff + 'キックオフ' : ''}\n${hook}`
    : mode === 'live' ? `${vs}、キックオフ！\nみんなで念を送ろう！`
    : `${vs}、おつかれさまでした！\n次も一緒に応援しよう！`;

  // 秒読みの表示（パタパタの得点板）：キックオフ（時間が未定ならその日の0時）まで
  const target = ko || jstInstant(fx.date);
  const count = mode === 'days' || mode === 'tomorrow' || (mode === 'today' && !!ko);
  const cap = mode === 'tomorrow' ? 'いよいよあした！ キックオフまで' : mode === 'today' ? '今日は試合の日！ キックオフまで' : 'キックオフまで';

  return { fx, mode, days, tag, vs, when, where, big, sub, hook, prev, post, target, count, cap };
}

/** 残り時間（ミリ秒）→ 日・時間・分・秒 */
export function splitLeft(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor(s % 86400 / 3600), m: Math.floor(s % 3600 / 60), s: s % 60 };
}
