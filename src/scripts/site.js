// すべてのページで動く小さなスクリプト：スクロール位置・誕生日・紙吹雪・数字のカウントアップ
import confetti from 'canvas-confetti';
import { icon, xIntent, X_MARK, href } from '../lib/util.js';
import { SITE } from '../config/site.js';
import { nextMatch, splitLeft } from '../lib/nextmatch.js';
import { makeFlipBoard } from '../lib/flipboard.js';
import { clubUrl } from '../config/clubs.js';
import { linkPlayers } from '../lib/playerlinks.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// 表示は白背景だけ（ダーク表示はなし）
try { localStorage.removeItem('theme'); } catch { /* 保存できなくても動く */ }

/* ---------- メニューで移ったときのスクロール位置（スマホ・パソコン共通） ----------
   メニューがまだ上に張り付いていない（上にロゴなどが見えている）とき：スクロールはそのまま。メニューは画面の同じ位置に残る。
   メニューが上に張り付いているとき：メニューは上のまま。下は、初めてのページはページの頭から、一度見たページは前に見ていた位置から。 */
const ss = {
  get: k => { try { return sessionStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { v === null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch { /* 保存できなくても動く */ } },
};
const posKey = () => 'tg:scroll:' + location.pathname;
const savePos = () => ss.set(posKey(), String(Math.round(scrollY)));
const navTopY = () => { const a = document.querySelector('.navtop'); return a ? Math.round(a.getBoundingClientRect().top + scrollY) : 0; };
// メニューを押した瞬間の位置を覚える（ページを離れるまでの間に高さが変わって位置がずれても、押したときの位置を使う）
let navClicked = false;
document.querySelectorAll('.site-nav a').forEach(a => a.addEventListener('click', () => { navClicked = true; savePos(); ss.set('tg:navfrom', String(Math.round(scrollY))); ss.set('tg:navjump', '1'); }));
addEventListener('pagehide', () => { if (!navClicked) savePos(); });
addEventListener('pageshow', () => { navClicked = false; });
{
  const nav = performance.getEntriesByType('navigation')[0];
  const fromY = ss.get('tg:navfrom');
  if (ss.get('tg:navjump') && fromY !== null && (!nav || nav.type === 'navigate')) {
    const from = Number(fromY);
    const savedRaw = ss.get(posKey());
    const target = () => {
      const top = navTopY();
      if (from < top) return from;                                   // メニューは画面の同じ位置のまま
      return savedRaw !== null ? Math.max(Number(savedRaw), top) : top; // メニューは上のまま
    };
    const go = () => scrollTo({ top: target(), behavior: 'instant' });
    go(); requestAnimationFrame(go);
    // 文字や誕生日の表示でページの高さが変わったあとに、もう一度合わせる（その間に自分でスクロールしていたら何もしない）
    let moved = false;
    const mark = () => { moved = true; };
    addEventListener('touchstart', mark, { once: true, passive: true });
    addEventListener('wheel', mark, { once: true, passive: true });
    addEventListener('keydown', mark, { once: true });
    addEventListener('load', () => { if (!moved) go(); }, { once: true });
  }
  ss.set('tg:navjump', null); ss.set('tg:navfrom', null);
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

/* ---------- ランキング・ゴール集の名前：長い名前は文字を少し小さくして1行に収める（省略しない） ---------- */
{
  const fit = n => {
    n.style.fontSize = ''; n.style.lineHeight = '';
    if (!n.clientWidth) return;
    let k = 1;
    const lh = n.getBoundingClientRect().height + 'px';  // 文字を小さくしても行の高さは変えない
    while (n.scrollWidth > n.clientWidth + 1 && k > 0.7) { n.style.lineHeight = lh; k -= 0.04; n.style.fontSize = k.toFixed(2) + 'em'; }
  };
  const ro = new ResizeObserver(es => es.forEach(e => { const w = Math.round(e.contentRect.width); if (e.target._fitW !== w) { e.target._fitW = w; fit(e.target); } }));
  document.querySelectorAll('.rank li > span:nth-child(3), .vlist .gh').forEach(n => ro.observe(n));
}

/* ---------- 絞り込みのチップ ---------- */
{
  const SEL = '.seg button';
// チップの幅を整数の px にそろえる（幅が半端だと、iPhone で枠の右の線だけ細く見えるため）
const snapChips = root => {
  const bs = [...root.querySelectorAll(SEL)].filter(b => b.offsetParent);
  bs.forEach(b => { b.style.width = ''; });
  const ws = bs.map(b => b.getBoundingClientRect().width);
  bs.forEach((b, i) => { b.style.width = Math.ceil(ws[i]) + 'px'; });
};
  const run = () => snapChips(document);
  run();
  document.fonts?.ready.then(run);
  let t; addEventListener('resize', () => { clearTimeout(t); t = setTimeout(run, 100); });
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
const postLink = (text, label, cls = 'bpost') => { const a = h('a', cls); a.href = xIntent(text, SITE.url + '/', ''); a.target = '_blank'; a.rel = 'noopener noreferrer'; a.innerHTML = X_MARK; a.append(label); return a; };

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
  a.href = xIntent(`私も${who}と同じ${m}月${d}日生まれ！🎂\n同じ誕生日の選手を応援しよう！\n${SITE.hashtags}`, SITE.url + '/players/', '');
  a.innerHTML = X_MARK; const lb = h('span'); lb.append(h('b', 'nw', '「同じ誕生日」'), h('span', 'nw', 'をXでポスト')); a.append(lb);
  bdPop.append(a);
  bdPop.showPopover();
  close.focus({ preventScroll: true });
}
document.addEventListener('click', e => {
  const b = e.target.closest?.('[data-bday-open]');
  if (b) { e.preventDefault(); e.stopPropagation(); openBday(b.dataset.bdayOpen); }
});


/* ---------- 次の試合（ヘッダーの今季の成績の横）：日本時間の今に合わせて秒読みを書き換える ---------- */
{
  const box = document.getElementById('seasonNext');
  let data = null;
  try { data = JSON.parse(document.getElementById('next-data')?.textContent || 'null'); } catch { data = null; }
  if (box && data) {
    const q = k => box.querySelector(`[data-sn="${k}"]`);
    const set = (k, v) => { const e = q(k); if (e) e.textContent = v; };
    const boardBox = q('board');
    const board = makeFlipBoard();
    boardBox?.appendChild(board.el);
    let nx = null;
    const tick = () => { if (nx?.count) board.set(splitLeft(nx.target - Date.now())); };
    const draw = () => {
      nx = nextMatch(data.fixtures, data.matches, new Date());
      if (!nx) { box.hidden = true; return; }
      box.dataset.mode = nx.mode;
      box.classList.toggle('is-count', nx.count);
      if (boardBox) boardBox.hidden = !nx.count;
      set('when', `${nx.tag}・${nx.when.replace(' キックオフ', '')}`);
      set('ha', nx.fx.ha === 'H' ? 'ホーム' : 'アウェイ');
      const haEl = q('ha'); if (haEl) haEl.className = 'sn-ha ' + (nx.fx.ha === 'H' ? 'h' : 'a');
      set('club', nx.vs.replace(/戦$/, ''));
      const clubEl = q('club'), cu = clubUrl(nx.fx.opponent_full) || clubUrl(nx.fx.opponent);
      if (clubEl) { if (cu) clubEl.href = cu; else clubEl.removeAttribute('href'); }
      set('big', nx.count ? (nx.mode === 'today' ? '今日！キックオフまで' : 'キックオフまで') : nx.big);
    };
    draw(); tick();
    // 秒読み：毎秒めくる。表示の切り替わり（当日・試合中など）は1分ごとに見直す
    let last = -1;
    setInterval(() => {
      const sec = Math.floor(Date.now() / 1000);
      if (sec === last) return;
      if (sec % 60 === 0 || (nx && nx.count && nx.target <= Date.now())) draw();
      last = sec; tick();
    }, 200);
  }
}


/* ---------- アコーディオン：開け閉めを覚える（同じタブの間）・#id へのリンクで中を開く ---------- */
{
  // 開いているアコーディオンの見出しは、上のメニューのすぐ下に貼りつく（--stick にメニューの高さ）
  const nav = document.querySelector('.site-nav');
  const stickH = () => (nav ? nav.getBoundingClientRect().height : 0);
  const setStick = () => document.documentElement.style.setProperty('--stick', `${Math.round(stickH())}px`);
  setStick();
  if (nav && 'ResizeObserver' in window) new ResizeObserver(setStick).observe(nav);
  // 貼りついている見出しに .stuck（見た目を平らな帯に変える）
  const heads = [...document.querySelectorAll('details.acc > .acc-h')];
  let rq = 0;
  const markStuck = () => { rq = 0; const top = stickH() + 1; for (const h of heads) { const d = h.parentElement; h.classList.toggle('stuck', d.open && d.getBoundingClientRect().top < top - 1 && h.getBoundingClientRect().top <= top); } };
  addEventListener('scroll', () => { if (!rq) rq = requestAnimationFrame(markStuck); }, { passive: true });
  addEventListener('resize', markStuck); document.addEventListener('toggle', markStuck, true); markStuck();
  const accs = [...document.querySelectorAll('details[data-acc][id]')];
  const key = (d) => `tg:acc:${location.pathname}:${d.id}`;
  for (const d of accs) {
    const v = ss.get(key(d));
    if (v !== null) d.open = v === '1';
    d.addEventListener('toggle', () => {
      ss.set(key(d), d.open ? '1' : '0');
      // 上に貼りついた見出しで閉じたら、閉じた見出しが画面の上に来るように戻す（中身の分だけ飛ばない）
      if (!d.open && d.getBoundingClientRect().top < stickH()) d.scrollIntoView({ block: 'start' });
    });
  }
  // リンク先（#rank-〇〇 など）がたたまれた中にあれば、まわりを開いてからそこへ
  const reveal = (hash, smooth) => {
    if (!hash || hash === '#') return;
    let t = null;
    try { t = document.getElementById(decodeURIComponent(hash.slice(1))); } catch { t = null; }
    if (!t) return;
    for (let p = t; p; p = p.parentElement) if (p instanceof HTMLDetailsElement && !p.open) p.open = true;
    requestAnimationFrame(() => t.scrollIntoView({ block: 'start', behavior: smooth && !reduced ? 'smooth' : 'auto' }));
  };
  reveal(location.hash, false);
  addEventListener('hashchange', () => reveal(location.hash, true));
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (a && a.getAttribute('href').length > 1) { e.preventDefault(); history.replaceState(null, '', a.getAttribute('href')); reveal(a.getAttribute('href'), true); }
  });
}


/* ---------- ランキングの「?」：PC（マウス）はカーソルを重ねると説明が吹き出しで出る。押すと出たままになる ---------- */
if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
  const place = (b, p) => {
    const r = b.getBoundingClientRect(), w = p.offsetWidth, h = p.offsetHeight;
    // 吹き出しの左下を「?」の右上に合わせる（画面からはみ出すときだけずらす）
    const left = Math.max(8, Math.min(r.right, innerWidth - w - 8));
    const top = r.top - h < 8 ? r.bottom : r.top - h;
    Object.assign(p.style, { position: 'fixed', inset: 'auto', margin: '0', left: `${left}px`, top: `${top}px` });
  };
  for (const b of document.querySelectorAll('button.info[popovertarget]')) {
    const p = document.getElementById(b.getAttribute('popovertarget'));
    if (!p || !p.showPopover) continue;
    let t = 0;
    b.addEventListener('mouseenter', () => {
      clearTimeout(t);
      if (p.matches(':popover-open')) return;
      p.classList.add('hov'); p.showPopover(); place(b, p);
    });
    b.addEventListener('mouseleave', () => { if (p.classList.contains('hov')) t = setTimeout(() => { if (p.classList.contains('hov')) p.hidePopover(); }, 100); });
    // 重ねて出ているときに押したら、閉じずに出したままにする
    b.addEventListener('click', e => { if (p.classList.contains('hov')) { e.preventDefault(); p.classList.remove('hov'); } });
    p.addEventListener('toggle', e => { if (e.newState === 'closed') { p.classList.remove('hov'); p.removeAttribute('style'); } else place(b, p); });
  }
}


/* ---------- 選手名 → Jリーグ公式の選手ページ（ランキング・チャンピオン・首位交代・年齢一覧・出身地・同じ母校・記録まであと少し・スタメン図） ---------- */
{
  let urls = {};
  try { urls = JSON.parse(document.getElementById('pl-urls')?.textContent || '{}'); } catch { urls = {}; }
  linkPlayers(document, urls, '.rank .nm, .champ .nm, .cl-name, .ages .nm, .pref-tip .nm, .school-links td:nth-child(2), .ms-list .who', ['.pitch .pl[data-name]', '.pl-n']);
}
