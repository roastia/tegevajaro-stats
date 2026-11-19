// テスト用サイト（test-tegesta.pages.dev）の入口：ID とパスワードを知っている人だけ見られるようにする（Basic 認証）
// ID は tegesta。パスワードは Cloudflare Pages の秘密の値 TEST_SITE_PASSWORD（docs/test-site.md）
// 本番（GitHub Pages）では使わない。npm run deploy:test のときだけ、このフォルダから一緒に送られる
const USER = 'tegesta';

const digest = async s => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
// 長さや一致した文字数から推測されないよう、ハッシュどうしを全部くらべる
async function same(a, b) {
  const [x, y] = await Promise.all([digest(a), digest(b)]);
  let d = 0;
  for (let i = 0; i < x.length; i++) d |= x[i] ^ y[i];
  return d === 0;
}

const NOINDEX = { 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'private, no-store' };

export async function onRequest({ request, env, next }) {
  const pass = env.TEST_SITE_PASSWORD;
  if (!pass) return new Response('テスト用サイトのパスワードがまだ設定されていません（docs/test-site.md）', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8', ...NOINDEX } });
  let ok = false;
  const [scheme, enc] = (request.headers.get('Authorization') || '').split(' ');
  if (scheme === 'Basic' && enc) {
    try {
      const raw = new TextDecoder().decode(Uint8Array.from(atob(enc), c => c.charCodeAt(0)));
      const i = raw.indexOf(':');
      const [u, p] = await Promise.all([same(raw.slice(0, i), USER), same(raw.slice(i + 1), pass)]);
      ok = i > 0 && u && p;
    } catch { ok = false; }
  }
  if (!ok) {
    return new Response('テスト用サイトです。ID とパスワードを入れてください。', { status: 401, headers: {
      'WWW-Authenticate': 'Basic realm="tegesta test", charset="UTF-8"', 'Content-Type': 'text/plain; charset=utf-8', ...NOINDEX } });
  }
  const res = await next();
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(NOINDEX)) out.headers.set(k, v);
  return out;
}
