// みんなのスコア予想（src/components/Yosou.astro・src/pages/yosou.astro）
// - ＋−でスコアを選んで決定 → Worker（/api/yosou）に送る。同じ回線から1試合1票、キックオフまでは変えられる
// - 自分の予想はこの端末だけに覚えておく（localStorage。名前などは送らない）
// - 予想した人と、締め切ったあとは、みんなの予想（人気の順）を見せる
import { verdict } from '../lib/yosou.js';
import { touch, preload, postImage } from './postimage.js';

const ls = {
  get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 保存できなくても続ける */ } },
};
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const pct = (n, t) => (t ? Math.round((n / t) * 100) : 0);

function left(ms) {
  const m = Math.floor(ms / 60000), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60;
  return d ? `あと${d}日${h}時間` : h ? `あと${h}時間${mm}分` : `あと${Math.max(1, mm)}分`;
}

// 紙吹雪（決定したとき）
function burst(el) {
  if (reduce) return;
  const box = document.createElement('div');
  box.className = 'ys-burst';
  box.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 14; i++) {
    const s = document.createElement('i');
    s.style.setProperty('--x', `${Math.round(Math.cos((i / 14) * Math.PI * 2) * (60 + Math.random() * 50))}px`);
    s.style.setProperty('--y', `${Math.round(Math.sin((i / 14) * Math.PI * 2) * (40 + Math.random() * 40) - 20)}px`);
    s.style.setProperty('--r', `${Math.round(Math.random() * 360)}deg`);
    box.append(s);
  }
  el.append(box);
  setTimeout(() => box.remove(), 1300);
}

function bars(ol, data, mine, label = 'あなた') {
  ol.replaceChildren();
  const top = data.scores.slice(0, 5);
  // 自分の予想が5番人気より下なら、いちばん下に足す
  const mineRow = mine && !top.some(s => s.gf === mine.gf && s.ga === mine.ga) && data.scores.find(s => s.gf === mine.gf && s.ga === mine.ga);
  if (mineRow) top.push(mineRow);
  const max = Math.max(1, ...top.map(s => s.n));
  top.forEach((s, i) => {
    const li = document.createElement('li');
    const me = mine && s.gf === mine.gf && s.ga === mine.ga;
    if (me) li.className = 'me';
    if (i === 0) li.classList.add('top');
    const sc = document.createElement('span'); sc.className = 'sc'; sc.textContent = `${s.gf}-${s.ga}`;
    const bar = document.createElement('span'); bar.className = 'bar';
    bar.style.setProperty('--w', `${Math.max(4, Math.round((s.n / max) * 100))}%`);
    const p = document.createElement('span'); p.className = 'p'; p.textContent = `${pct(s.n, data.total)}%`;
    li.append(sc, bar, p);
    if (me) { const t = document.createElement('span'); t.className = 'you'; t.textContent = label; li.append(t); }
    ol.append(li);
  });
}

function setupCard(card) {
  const $ = s => card.querySelector(s);
  const api = card.dataset.api, key = card.dataset.key, kickoff = Date.parse(card.dataset.kickoff), MAX = Number(card.dataset.max) || 6;
  const store = `tg:yosou:${key}`;
  const st = { gf: Number($('[data-gf]').textContent), ga: Number($('[data-ga]').textContent) };
  const closed = () => Date.now() >= kickoff;

  const draw = () => {
    $('[data-gf]').textContent = st.gf; $('[data-ga]').textContent = st.ga;
    $('[data-verdict]').textContent = verdict(st.gf, st.ga);
    card.querySelectorAll('[data-step]').forEach(b => {
      const k = b.dataset.step, by = Number(b.dataset.by);
      b.disabled = by < 0 ? st[k] <= 0 : st[k] >= MAX;
    });
  };
  const nope = () => {
    const board = $('[data-board]');
    board.classList.remove('ys-nope'); void board.offsetWidth; board.classList.add('ys-nope');
    $('[data-verdict]').textContent = '負け予想はなし！テゲバを信じよう';
  };
  card.addEventListener('click', e => {
    const b = e.target.closest('[data-step]');
    if (!b) return;
    const k = b.dataset.step, by = Number(b.dataset.by);
    const next = { ...st, [k]: st[k] + by };
    if (next.gf < 0 || next.ga < 0 || next.gf > MAX || next.ga > MAX) return;
    // テゲバの点をへらして相手を下回るときは、相手もいっしょにへらす。相手の点をテゲバより上にはできない
    if (k === 'gf' && next.ga > next.gf) next.ga = next.gf;
    if (k === 'ga' && next.ga > next.gf) return nope();
    Object.assign(st, next); draw();
  });

  const msg = (t) => { const m = $('[data-msg]'); m.textContent = t || ''; m.hidden = !t; };
  const showRes = (data, mine) => {
    $('[data-form]').hidden = !!mine || closed() ? true : false;
    $('[data-res]').hidden = false;
    const mineEl = $('[data-mine]').parentElement;
    mineEl.hidden = !mine;
    $('[data-change]').hidden = !mine || closed();
    if (mine) {
      $('[data-mine]').textContent = `${mine.gf}-${mine.ga}`;
      const idx = data.scores.findIndex(s => s.gf === mine.gf && s.ga === mine.ga);
      $('[data-rank]').textContent = idx === 0 ? 'いちばん人気！' : idx > 0 ? `${idx + 1}番人気` : '';
      // 画像でポスト：スコアごとの画像（/share/y-2-1.jpg）
      const a = $('[data-share]');
      const text = `第${card.dataset.round}節 ${card.dataset.opp}戦のスコア予想は「${mine.gf}-${mine.ga}」！ ${verdict(mine.gf, mine.ga)} みんなも予想しよう ${card.dataset.tags}`;
      const url = `${card.dataset.site}/yosou/`;
      a.href = 'https://twitter.com/intent/tweet?' + new URLSearchParams({ text, url }).toString();
      a.dataset.img = `${card.dataset.imgBase}y-${mine.gf}-${mine.ga}.jpg`;
      a.dataset.text = `${text} ${url}`;
      if (touch) preload(a.dataset.img);   // 先に読んでおく（押したらすぐ共有メニューを開けるように）
      a.hidden = mine.gf > MAX;
    } else $('[data-share]').hidden = true;
    $('[data-sum]').textContent = data.total
      ? `${data.total}人が予想${closed() ? '（締め切り）' : ''}`
      : 'まだだれも予想していません';
    bars($('[data-bars]'), data, mine);
  };

  // いつも最新の数を読む（ブラウザに残った少し前の数だと、自分の予想がまだ入っていないことがある）
  const load = () => fetch(`${api}?match=${encodeURIComponent(key)}`, { cache: 'no-store' }).then(r => r.ok ? r.json() : Promise.reject(r.status));

  $('[data-go]').addEventListener('click', async () => {
    const go = $('[data-go]');
    if (closed()) { msg('キックオフを過ぎたので、予想は締め切りました'); return; }
    go.disabled = true; msg('');
    try {
      const r = await fetch(api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ match: key, gf: st.gf, ga: st.ga }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) throw new Error(d.error || '送信できませんでした。少し時間をおいてお試しください');
      const mine = { gf: st.gf, ga: st.ga };
      ls.set(store, mine);
      showRes(d, mine);
      burst($('[data-res]'));
      $('[data-res]').scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
    } catch (err) { msg(err.message); }
    finally { go.disabled = false; }
  });
  $('[data-change]').addEventListener('click', () => {
    $('[data-res]').hidden = true; $('[data-form]').hidden = false; draw();
  });

  // 画像でポスト（src/scripts/postimage.js：スマホは共有メニュー、PC は画像を保存して X の投稿画面へ）
  $('[data-share]').addEventListener('click', e => { const a = e.currentTarget; postImage(e, a, { img: a.dataset.img, text: a.dataset.text }); });

  // 締め切りまでの時間
  const dl = $('[data-dl]');
  const tick = () => {
    const ms = kickoff - Date.now();
    dl.textContent = ms > 0 ? `締め切りまで ${left(ms)}` : '締め切りました';
    dl.classList.toggle('soon', ms > 0 && ms < 3 * 3600e3);
  };
  tick(); setInterval(tick, 30000);

  // はじめに：予想ずみ・締め切りなら、みんなの予想を見せる
  const mine = ls.get(store);
  if (mine && Number.isInteger(mine.gf)) { st.gf = mine.gf; st.ga = mine.ga; $('[data-mine]').textContent = `${mine.gf}-${mine.ga}`; }
  draw();
  // ここからはスクリプトが hidden で切りかえる（表示前に決めた data-state の見せ方はやめる）
  if (mine || closed()) { $('[data-form]').hidden = true; $('[data-res]').hidden = false; }
  card.classList.add('ys-ready');
  if (mine || closed()) {
    load().then(d => showRes(d, mine)).catch(() => msg('みんなの予想を読み込めませんでした'));
  }

  // 前節の予想の答え合わせ（勝ち・引き分けのときだけ）。カードが見えてきてから読む（読まれないページで受付に問い合わせない）
  const last = card.dataset.last ? JSON.parse(card.dataset.last) : null;
  const answer = () => {
    fetch(`${api}?match=${encodeURIComponent(last.key)}`).then(r => r.ok ? r.json() : null).then(d => {
      if (!d || !d.total) return;
      const exact = d.scores.filter(s => s.gf === last.gf && s.ga === last.ga).reduce((t, s) => t + s.n, 0);
      const el = $('[data-lastline]');
      el.textContent = `前節 ${last.opp}戦 ${last.gf}-${last.ga}：ぴったり的中 ${pct(exact, d.total)}%（${d.total}人）`;
      el.hidden = false;
    }).catch(() => {});
  };
  if (last && last.gf >= last.ga) {
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); answer(); } }, { rootMargin: '200px' });
      io.observe(card);
    } else answer();
  }
}

document.querySelectorAll('[data-yosou]').forEach(setupCard);

// これまでの予想（/yosou/）：試合ごとに、みんなの1番人気・的中率をうめる
{
  const list = document.querySelector('[data-yosou-history]');
  if (list) {
    fetch(`${list.dataset.api}?all=1`).then(r => r.ok ? r.json() : Promise.reject(r.status)).then(({ matches }) => {
      let shown = 0;
      for (const li of list.querySelectorAll('[data-key]')) {
        const d = matches[li.dataset.key];
        if (!d || !d.total) { li.remove(); continue; }
        const gf = Number(li.dataset.gf), ga = Number(li.dataset.ga);
        const exact = d.scores.filter(s => s.gf === gf && s.ga === ga).reduce((t, s) => t + s.n, 0);
        const top = d.scores[0];
        li.querySelector('.yh-top').textContent = `1番人気 ${top.gf}-${top.ga}（${pct(top.n, d.total)}%）`;
        li.querySelector('.yh-hit').textContent = gf >= ga
          ? `ぴったり的中 ${pct(exact, d.total)}%`
          : 'つぎこそ！';
        li.querySelector('.yh-n').textContent = `${d.total}人が予想`;
        bars(li.querySelector('.ys-bars'), d, { gf, ga }, '結果');
        li.hidden = false; shown++;
      }
      const empty = document.querySelector('[data-yosou-empty]');
      if (empty) empty.hidden = shown > 0;
    }).catch(() => { const e = document.querySelector('[data-yosou-empty]'); if (e) { e.textContent = 'これまでの予想を読み込めませんでした'; e.hidden = false; } });
  }
}
