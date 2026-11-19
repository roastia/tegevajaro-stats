// てげ好きの書き込みフォーム（src/components/SukiForm.astro）
// - お題ボタン：本文が空（または前に入れた書き出しのまま）なら書き出しを入れる。書きかけなら、改行して足す
// - つなげる：スレの「つなげる」ボタンから >>番号 を本文に入れる（window の 'suki:link' イベント）
// - Turnstile（ボット対策）は、フォームが見えてきてから読み込む
const TS_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const whenTs = () => new Promise(res => {
  if (window.turnstile) return res(window.turnstile);
  if (!document.getElementById('ts-js')) {
    const s = document.createElement('script');
    s.id = 'ts-js'; s.src = TS_SRC; s.async = true;
    document.head.append(s);
  }
  const t = setInterval(() => { if (window.turnstile) { clearInterval(t); res(window.turnstile); } }, 150);
});

for (const form of document.querySelectorAll('form[data-suki-form]')) {
  const ta = form.querySelector('textarea[name="body"]');
  const len = form.querySelector('[data-len]');
  const msg = form.querySelector('.spot-msg'), send = form.querySelector('.spot-send');
  const say = (t, ok = false) => { msg.textContent = t; msg.classList.toggle('ok', ok); };
  const count = () => { len.textContent = String([...ta.value.trim()].length); };
  ta.addEventListener('input', count);
  let lastStart = '';
  const put = (text, replace) => {
    const cur = ta.value.trim();
    ta.value = replace || !cur || cur === lastStart.trim() ? text : `${ta.value.replace(/\s+$/, '')}\n${text}`;
    ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
    count();
  };
  form.querySelectorAll('[data-start]').forEach(b => b.addEventListener('click', () => {
    form.querySelectorAll('[data-start]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    put(b.dataset.start); lastStart = b.dataset.start;
  }));
  addEventListener('suki:link', e => {
    const a = `>>${e.detail.no} `;
    if (!ta.value.includes(a.trim())) put(a);
    form.scrollIntoView({ block: 'start', behavior: 'smooth' });
  });

  // Turnstile：見えてきたら用意する
  const st = { id: undefined, token: '' };
  const render = async () => {
    if (st.id !== undefined) return;
    const ts = await whenTs();
    st.id = ts.render(form.querySelector('.ts'), {
      sitekey: form.dataset.sitekey, action: 'suki', language: 'ja', appearance: 'interaction-only',
      callback: t => { st.token = t; }, 'expired-callback': () => { st.token = ''; }, 'error-callback': () => { st.token = ''; },
    });
  };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => { if (es.some(x => x.isIntersecting)) { io.disconnect(); render(); } }, { rootMargin: '300px' });
    io.observe(form);
  } else render();

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const f = new FormData(form);
    const body = String(f.get('body') || '').trim(), nickname = String(f.get('nickname') || '').trim();
    if ([...body].length < 5) { say('もうひとこと、書いてみてください（5文字から）'); return; }
    if ([...body].length > 600) { say('600字までで書いてください'); return; }
    if (!f.get('agree')) { say('ページに載ることへの同意にチェックを入れてください'); return; }
    if (!st.token) { render(); say('確認中です。少し待ってから、もう一度「書き込む」を押してください'); return; }
    send.disabled = true; say('送っています…');
    try {
      const r = await fetch(form.dataset.api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'omit', referrerPolicy: 'no-referrer',
        body: JSON.stringify({ nickname, body, agree: true, website: String(f.get('website') || ''), turnstile: st.token }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) { form.reset(); count(); lastStart = ''; say('ありがとうございます！確認してから、てげ好きに載せます。', true); }
      else say(d.error || '送れませんでした。時間をおいて、もう一度お試しください');
    } catch { say('送れませんでした。電波のよいところで、もう一度お試しください'); }
    finally {
      send.disabled = false; st.token = '';
      try { window.turnstile?.reset(st.id); } catch { /* 次の送信で確認し直す */ }
    }
  });
}
