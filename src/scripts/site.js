// すべてのページで動く小さなスクリプト：表示モード・誕生日・紙吹雪・数字のカウントアップ
import confetti from 'canvas-confetti';
import { icon, xIntent, X_MARK } from '../lib/util.js';
import { SITE } from '../config/site.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- 表示モード（自動 → ライト → ダーク） ---------- */
const store = {
  get: k => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch { /* 保存できなくても動く */ } },
};
const modes = ['', 'light', 'dark'];
function applyTheme(m) {
  if (m) document.documentElement.dataset.theme = m; else delete document.documentElement.dataset.theme;
  const btn = document.getElementById('themeBtn');
  if (btn) {
    btn.innerHTML = icon(m === 'light' ? 'sun' : m === 'dark' ? 'moon' : 'sparkle');
    btn.title = m === 'light' ? 'ライト表示' : m === 'dark' ? 'ダーク表示' : '端末の設定に合わせる';
  }
}
applyTheme(store.get('theme') || '');
document.getElementById('themeBtn')?.addEventListener('click', () => {
  const next = modes[(modes.indexOf(store.get('theme') || '') + 1) % modes.length];
  store.set('theme', next); applyTheme(next);
});

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
const postLink = (text, label, cls = 'bpost') => { const a = h('a', cls); a.href = xIntent(text, SITE.url + '/'); a.target = '_blank'; a.rel = 'noopener noreferrer'; a.innerHTML = X_MARK; a.append(label); return a; };

const hbd = document.getElementById('hbd');
if (hbd && today.length) {
  const names = today.map(({ p }) => `${p.name}選手`).join('・');
  const cake = h('div', 'cake'); cake.innerHTML = icon('cake');
  hbd.append(cake, h('div', 'msg', 'お誕生日おめでとう！'), h('div', 'who', today.map(({ p, b }) => `${p.no} ${p.name}選手　${b.turning}歳`).join('　／　')),
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
    if (b.days === 0) c.append(h('span', 'cd', 'TODAY'), h('span', 'nm', `${p.no} ${p.name}`), h('span', 'bg2', 'おめでとう！'), h('span', 'cd', `今日で${b.turning}歳`));
    else c.append(h('span', 'cd', `あと${b.days}日`), h('span', 'nm', `${p.no} ${p.name}`), h('span', 'cd', `${b.m}月${b.d}日で`), h('span', 'bg2', `${b.turning}歳`));
    const text = b.days === 0
      ? `今日${b.m}月${b.d}日は${p.name}選手の${b.turning}歳の誕生日！おめでとうございます🎂 テゲサポみんなでお祝いしよう！\n${SITE.hashtags}`
      : `${b.m}月${b.d}日は${p.name}選手の${b.turning}歳の誕生日🎂 あと${b.days}日！ みんなでお祝いしよう\n${SITE.hashtags}`;
    c.append(postLink(text, b.days === 0 ? `${p.name}選手をXでお祝い` : `${p.name}選手の誕生日をXでポスト`));
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
