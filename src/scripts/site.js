// すべてのページで動く小さなスクリプト：スクロール位置・誕生日・紙吹雪・数字のカウントアップ
import confetti from 'canvas-confetti';
import { icon, xIntent, X_MARK, href } from '../lib/util.js';
import { SITE } from '../config/site.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// 表示は白背景だけ（ダーク表示はなし）
try { localStorage.removeItem('theme'); } catch { /* 保存できなくても動く */ }

/* ---------- ページごとのスクロール位置 ----------
   メニューで初めて開くページは、メニューが画面の一番上に来る位置（ページの頭）から。
   一度見たページは、前に見ていた位置から（ページの頭より上にいたときは、ページの頭から）。 */
const ss = {
  get: k => { try { return sessionStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { v === null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch { /* 保存できなくても動く */ } },
};
const posKey = () => 'tg:scroll:' + location.pathname;
const savePos = () => ss.set(posKey(), String(Math.round(scrollY)));
const navTopY = () => { const a = document.querySelector('.navtop'); return a ? Math.round(a.getBoundingClientRect().top + scrollY) : 0; };
document.querySelectorAll('.site-nav a').forEach(a => a.addEventListener('click', () => { savePos(); ss.set('tg:navjump', '1'); }));
addEventListener('pagehide', savePos);
{
  const nav = performance.getEntriesByType('navigation')[0];
  if (ss.get('tg:navjump') && (!nav || nav.type === 'navigate')) {
    const saved = Number(ss.get(posKey()) || 0);
    const target = () => Math.max(saved, navTopY());
    const go = () => scrollTo({ top: target(), behavior: 'instant' });
    go(); requestAnimationFrame(go);
    // 文字や誕生日の表示でページの高さが変わったあとに、もう一度合わせる（その間に自分でスクロールしていたら何もしない）
    let moved = false;
    const mark = () => { moved = true; };
    addEventListener('touchstart', mark, { once: true, passive: true });
    addEventListener('wheel', mark, { once: true, passive: true });
    addEventListener('load', () => { if (!moved) go(); }, { once: true });
  }
  ss.set('tg:navjump', null);
}

// メニューの今いるページの項目が、横にはみ出して隠れないようにする
{
  const ul = document.querySelector('.site-nav ul'), cur = ul?.querySelector('[aria-current="page"]');
  if (ul && cur) {
    const l = cur.offsetLeft - ul.offsetLeft, r = l + cur.offsetWidth;
    if (r > ul.scrollLeft + ul.clientWidth) ul.scrollLeft = r - ul.clientWidth + 16;
    else if (l < ul.scrollLeft) ul.scrollLeft = Math.max(0, l - 16);
  }
}

/* ---------- 誕生日（日本時間の今日から数える） ---------- */
function todayJst() {
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
export function bdayInfo(birth) {
  if (!birth) return null;
  const [y, m, d] = birth.split('-').map(Number);
  const t = todayJst();
  let next = new Date(Date.UTC(t.getUTCFullYear(), m - 1, d));
  if (next < t) next = new Date(Date.UTC(t.getUTCFullYear() + 1, m - 1, d));
  const age = t.getUTCFullYear() - y - ((t.getUTCMonth() + 1 < m || (t.getUTCMonth() + 1 === m && t.getUTCDate() < d)) ? 1 : 0);
  return { days: Math.round((next - t) / 86400000), turning: next.getUTCFullYear() - y, age, m, d };
}
let people = [];
try { people = JSON.parse(document.getElementById('bday-data')?.textContent || '[]'); } catch { people = []; }
const soon = people.map(p => ({ p, b: bdayInfo(p.birth) })).filter(x => x.b && x.b.days <= 31).sort((a, b) => a.b.days - b.b.days);
const today = soon.filter(x => x.b.days === 0);

const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
// 名前の前に「背番号」バッジ（数字だけだと背番号とわかりにくいため）
// 名前の前に背番号入りシャツのイラスト
const jnoName = p => {
  const nm = h('span', 'nm');
  const img = h('img', 'jersey jersey-sm on-color'); img.src = href(`chars/numbers-s/${p.no}.png`); img.alt = `背番号${p.no}`; img.width = 44; img.height = 44; img.decoding = 'async';
  nm.append(img, h('span', null, p.name));
  return nm;
};
const bdayBtn = (birth, label) => { const b = h('button', 'bdbtn'); b.type = 'button'; b.dataset.bdayOpen = birth; b.innerHTML = icon('cake'); b.append(label); return b; };
const postLink = (text, label, cls = 'bpost') => { const a = h('a', cls); a.href = xIntent(text, SITE.url + '/'); a.target = '_blank'; a.rel = 'noopener noreferrer'; a.innerHTML = X_MARK; a.append(label); return a; };

const hbd = document.getElementById('hbd');
if (hbd && today.length) {
  const names = today.map(({ p }) => `${p.name}選手`).join('・');
  const cake = h('div', 'cake'); cake.innerHTML = icon('cake');
  hbd.append(cake, h('div', 'msg', 'お誕生日おめでとう！'), h('div', 'who', today.map(({ p, b }) => `${p.name}選手（背番号${p.no}）　${b.turning}歳`).join('　／　')),
    postLink(`今日は${names}の誕生日！${today.length === 1 ? `${today[0].b.turning}歳、` : ''}おめでとうございます🎂🎉 テゲサポみんなでお祝いしよう！\n${SITE.hashtags}`, 'お祝いをXでポスト'));
  hbd.hidden = false;
  if (!reduced && !sessionStorageGet('confetti')) {
    const colors = ['#F16682', '#F5C84A', '#FFFFFF', '#C8375F', '#F2A93B'];
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.25 }, colors, disableForReducedMotion: true });
    setTimeout(() => confetti({ particleCount: 80, angle: 60, spread: 60, origin: { x: 0, y: 0.5 }, colors, disableForReducedMotion: true }), 400);
    setTimeout(() => confetti({ particleCount: 80, angle: 120, spread: 60, origin: { x: 1, y: 0.5 }, colors, disableForReducedMotion: true }), 700);
    sessionStorageSet('confetti', '1');
  }
}
function sessionStorageGet(k) { try { return sessionStorage.getItem(k); } catch { return null; } }
function sessionStorageSet(k, v) { try { sessionStorage.setItem(k, v); } catch { /* noop */ } }

// 「もうすぐ誕生日」バナー（ページ内に .bday[data-bday] があれば）
for (const box of document.querySelectorAll('.bday[data-bday]')) {
  if (!soon.length) continue;
  const t = h('h2'); t.innerHTML = icon('cake'); t.append(soon[0].b.days === 0 ? '今日は誕生日！' : 'もうすぐ誕生日');
  const row = h('div', 'row');
  for (const { p, b } of soon) {
    const c = h('div', 'bcard' + (b.days === 0 ? ' today' : ''));
    if (b.days === 0) c.append(h('span', 'cd', 'TODAY'), jnoName(p), h('span', 'bg2', 'おめでとう！'), h('span', 'cd', `今日で${b.turning}歳`));
    else c.append(h('span', 'cd', `あと${b.days}日`), jnoName(p), bdayBtn(p.birth, `${b.m}月${b.d}日で`), h('span', 'bg2', `${b.turning}歳`));
    const text = b.days === 0
      ? `今日${b.m}月${b.d}日は${p.name}選手の${b.turning}歳の誕生日！おめでとうございます🎂 テゲサポみんなでお祝いしよう！\n${SITE.hashtags}`
      : `${b.m}月${b.d}日は${p.name}選手の${b.turning}歳の誕生日🎂 あと${b.days}日！ みんなでお祝いしよう\n${SITE.hashtags}`;
    c.append(postLink(text, b.days === 0 ? 'Xでお祝い' : 'Xでポスト'));
    row.append(c);
  }
  box.append(t, row);
  box.hidden = false;
}

// 選手カード・年齢一覧の誕生日表示
for (const e of document.querySelectorAll('[data-birth]')) {
  const b = bdayInfo(e.dataset.birth);
  if (!b) continue;
  if (e.dataset.ageOut) { const o = document.getElementById(e.dataset.ageOut); if (o) o.textContent = String(b.age); }
  if (b.days > 31) continue;
  if (e.matches('.ages li')) e.classList.add('bd');
  const slot = e.querySelector('[data-bslot]');
  if (slot) { const c = h('span', slot.dataset.bslot); c.innerHTML = icon('cake'); c.append(b.days === 0 ? '今日が誕生日！' : `あと${b.days}日`); slot.replaceWith(c); }
}

/* ---------- 数字のカウントアップ（画面に入ったとき） ---------- */
if (!reduced && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver(entries => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      io.unobserve(en.target);
      const el = en.target, final = el.textContent;
      const m = final.match(/^([^\d+-]*)([+-]?)([\d,]+(?:\.\d+)?)(.*)$/s);
      if (!m) continue;
      const target = Number(m[3].replace(/,/g, '')), dec = (m[3].split('.')[1] || '').length, comma = m[3].includes(',');
      const t0 = performance.now(), dur = 900;
      const step = now => {
        const k = Math.min(1, (now - t0) / dur), v = target * (1 - Math.pow(1 - k, 3));
        let s = v.toFixed(dec); if (comma) s = Number(s).toLocaleString('ja-JP', { minimumFractionDigits: dec, maximumFractionDigits: dec });
        el.textContent = m[1] + m[2] + s + m[4];
        if (k < 1) requestAnimationFrame(step); else el.textContent = final;
      };
      requestAnimationFrame(step);
    }
  }, { threshold: 0.6 });
  document.querySelectorAll('[data-count]').forEach(e => io.observe(e));
}

/* ---------- 同じ誕生日の人（誕生日を押すと開く。Popover API） ---------- */
let bdPop;
function openBday(birth) {
  if (!birth) return;
  const [, m, d] = birth.split('-').map(Number);
  const md = birth.slice(5);
  const same = people.filter(p => p.birth && p.birth.slice(5) === md);
  const month = people.filter(p => p.birth && Number(p.birth.slice(5, 7)) === m && p.birth.slice(5) !== md).sort((a, b) => a.birth.slice(8).localeCompare(b.birth.slice(8)));
  if (!bdPop) { bdPop = h('div', 'bdpop'); bdPop.popover = 'auto'; bdPop.id = 'bdpop'; bdPop.setAttribute('role', 'dialog'); document.body.append(bdPop); }
  bdPop.textContent = '';
  const close = h('button', 'x', '×'); close.type = 'button'; close.setAttribute('aria-label', '閉じる'); close.addEventListener('click', () => bdPop.hidePopover());
  const t = h('div', 'ttl'); t.innerHTML = icon('cake'); t.append(`${m}月${d}日生まれ`);
  bdPop.append(close, t, h('div', 'k', 'テゲバの同じ誕生日'));
  const ul = h('ul');
  same.forEach(p => { const b = bdayInfo(p.birth); ul.append(h('li', null, `${p.name}（背番号${p.no}・${p.pos}・${Number(p.birth.slice(0, 4))}年生まれ）${b && b.days === 0 ? '　今日が誕生日！' : ''}`)); });
  bdPop.append(ul);
  if (same.length === 1) bdPop.append(h('p', 'note', `チームで${m}月${d}日生まれは${same[0].name}選手だけ！`));
  if (month.length) bdPop.append(h('div', 'k', `同じ${m}月生まれのチームメイト`), h('p', null, month.map(p => `${p.name}（${m}/${Number(p.birth.slice(8))}）`).join('、')));
  const wiki = h('a', 'wiki'); wiki.innerHTML = icon('star'); wiki.append(`${m}月${d}日生まれの有名人を見る`);
  wiki.href = `https://ja.wikipedia.org/wiki/${m}%E6%9C%88${d}%E6%97%A5#%E8%AA%95%E7%94%9F%E6%97%A5`; wiki.target = '_blank'; wiki.rel = 'noopener noreferrer';
  bdPop.append(h('div', 'k', '同じ誕生日の有名人'), wiki, h('span', 'wsrc', `Wikipedia「${m}月${d}日」の誕生日の一覧が開きます`), h('div', 'k', `あなたも${m}月${d}日生まれ？`));
  const who = same.map(p => `${p.name}選手`).join('・');
  const a = h('a', 'postbtn'); a.target = '_blank'; a.rel = 'noopener noreferrer';
  a.href = xIntent(`私も${who}と同じ${m}月${d}日生まれ！🎂\n同じ誕生日の選手を応援しよう！\n${SITE.hashtags}`, SITE.url + '/roots/');
  a.innerHTML = X_MARK; const lb = h('span'); lb.append(h('b', 'nw', '「同じ誕生日」'), h('span', 'nw', 'をXでポスト')); a.append(lb);
  bdPop.append(a);
  bdPop.showPopover();
  close.focus({ preventScroll: true });
}
document.addEventListener('click', e => {
  const b = e.target.closest?.('[data-bday-open]');
  if (b) { e.preventDefault(); e.stopPropagation(); openBday(b.dataset.bdayOpen); }
});
