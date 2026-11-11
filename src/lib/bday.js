// 誕生日のお祝い（ページ上の「お誕生日おめでとう！」と「もうすぐ誕生日」）。
// ビルド時（Astro）とブラウザ（site.js）の両方で同じ HTML を作る。
// ビルドは毎日 0:05（日本時間）に走るので、ふだんはビルドした HTML のまま表示し、
// ブラウザの「今日」がビルドの日と違うとき（日付をまたいで古いページを開いたときなど）だけ、ブラウザで作り直す。
// → ページを開くたび・メニューで移るたびに、お祝いの枠があとから出てきて画面がずれる（ちらつく）のを防ぐ
import { icon, xIntent, xLabel, href } from './util.js';
import { SITE } from '../config/site.js';

/** 日本時間の今日（UTC の 0 時にそろえた Date） */
export function todayJst(now = new Date()) {
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** 次の誕生日まで何日・何歳になるか（birth は YYYY-MM-DD。マスコットは 0000-MM-DD） */
export function bdayInfo(birth, t = todayJst()) {
  if (!birth) return null;
  const [y, m, d] = birth.split('-').map(Number);
  let next = new Date(Date.UTC(t.getUTCFullYear(), m - 1, d));
  if (next < t) next = new Date(Date.UTC(t.getUTCFullYear() + 1, m - 1, d));
  const age = t.getUTCFullYear() - y - ((t.getUTCMonth() + 1 < m || (t.getUTCMonth() + 1 === m && t.getUTCDate() < d)) ? 1 : 0);
  return { days: Math.round((next - t) / 86400000), turning: next.getUTCFullYear() - y, age, m, d };
}

/** お祝いする人（選手＋マスコット） */
export const bdayPeople = (profiles, mascots = SITE.mascots || []) => [
  ...profiles.filter(p => p.birth).map(p => ({ no: p.no, name: p.name, pos: p.pos, birth: p.birth })),
  ...mascots.map(m => ({ name: m.name, birth: `0000-${m.birth}`, mascot: true })),
];

/** 31日以内の誕生日（近い順）と、今日の誕生日 */
export function bdayState(people, t = todayJst()) {
  const soon = people.map(p => ({ p, b: bdayInfo(p.birth, t) })).filter(x => x.b && x.b.days <= 31).sort((a, b) => a.b.days - b.b.days);
  return { soon, today: soon.filter(x => x.b.days === 0) };
}
/** 表示が同じかどうかを見分ける印（名前と日数） */
export const bdayKey = list => list.map(({ p, b }) => `${p.name}:${b.days}`).join('|');

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const callName = p => p.mascot ? p.name : `${p.name}選手`;
const ageText = (p, b) => p.mascot ? '' : `${b.turning}歳`;
const post = (text, label, cls = 'bpost') => `<a class="${cls}" href="${esc(xIntent(text, SITE.url + '/', ''))}" target="_blank" rel="noopener noreferrer"><span>${xLabel(label)}</span></a>`;
const shirt = p => p.mascot
  ? `<span class="bmascot">${icon('party')}</span>`
  : `<img class="jersey jersey-sm on-color" src="${esc(href(`chars/numbers-s/${p.no}.png`))}" alt="背番号${esc(p.no)}" width="44" height="44" decoding="async" />`;

/** ページ上の「お誕生日おめでとう！」の中身（今日の誕生日がなければ空） */
export function hbdHtml(today, plUrls = {}) {
  if (!today.length) return '';
  const names = today.map(({ p }) => callName(p)).join('・');
  const who = today.map(({ p, b }) => {
    const url = !p.mascot && plUrls[p.name];
    const nm = url ? `<a class="pl-link hbd-nm" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(p.name)}選手</a>` : `<span class="hbd-nm">${esc(callName(p))}</span>`;
    return `<span class="hbd-p">${shirt(p)}${nm}<span class="hbd-age">${p.mascot ? 'おめでとう！' : `${b.turning}歳`}</span></span>`;
  }).join('');
  const text = `今日は${names}の誕生日！${today.length === 1 && !today[0].p.mascot ? `${today[0].b.turning}歳、` : ''}おめでとうございます🎂🎉 テゲサポみんなでお祝いしよう！\n${SITE.hashtags}`;
  return `<div class="cake">${icon('cake')}</div><div class="msg">お誕生日おめでとう！</div><div class="who">${who}</div>${post(text, 'お祝いをXでポスト')}`;
}

/** 「もうすぐ誕生日」の中身（31日以内に誕生日がなければ空） */
export function soonHtml(soon) {
  if (!soon.length) return '';
  const cards = soon.map(({ p, b }) => {
    const nm = `<span class="nm">${shirt(p)}<span>${esc(p.name)}</span></span>`;
    const text = b.days === 0
      ? `今日${b.m}月${b.d}日は${callName(p)}の${ageText(p, b)}${p.mascot ? '' : 'の'}誕生日！おめでとうございます🎂 テゲサポみんなでお祝いしよう！\n${SITE.hashtags}`
      : `${b.m}月${b.d}日は${callName(p)}の${ageText(p, b)}${p.mascot ? '' : 'の'}誕生日🎂 あと${b.days}日！ みんなでお祝いしよう\n${SITE.hashtags}`;
    const inner = b.days === 0
      ? `<span class="cd">TODAY</span>${nm}<span class="bg2">おめでとう！</span><span class="cd">${p.mascot ? '今日が誕生日' : `今日で${b.turning}歳`}</span>`
      : `<span class="cd">あと${b.days}日</span>${nm}<button class="bdbtn" type="button" data-bday-open="${esc(p.birth)}">${icon('cake')}${b.m}月${b.d}日${p.mascot ? '' : 'で'}</button><span class="bg2">${p.mascot ? 'お誕生日' : `${b.turning}歳`}</span>`;
    return `<div class="bcard${b.days === 0 ? ' today' : ''}">${inner}${post(text, b.days === 0 ? 'Xでお祝い' : 'Xでポスト')}</div>`;
  }).join('');
  return `<h2>${icon('cake')}${soon[0].b.days === 0 ? '今日は誕生日！' : 'もうすぐ誕生日'}</h2><div class="row">${cards}</div>`;
}
