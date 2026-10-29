// テゲスタ！ おすすめスポットの投稿受付（Cloudflare Workers + D1 + Turnstile）
// - 受け付けるのは POST /api/spots だけ。投稿の中身を返す API は作らない（中身は wrangler で取り出す）
// - IP アドレスは保存しない（日ごとの鍵でハッシュ化した値だけを2日間だけ置く）
// - 連投の対策：Turnstile を毎回必須・同じ回線から1日 IP_DAILY_LIMIT 件まで・同じ日の同じ内容は受けない
import { validateSubmission, jstDay, ipHash, contentKey, sha256, LIMITS } from './validate.js';

const SECURITY_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
};

const json = (status, body, origin) => new Response(JSON.stringify(body), {
  status,
  headers: { ...SECURITY_HEADERS, ...(origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}) },
});

// hosts：Turnstile を解いたページのホスト名がこの中にあるかも確かめる（ほかのサイトで取ったトークンを使い回させない）
async function verifyTurnstile(token, secret, ip, hosts) {
  if (!token || typeof token !== 'string' || token.length > 2048) return false;
  const form = new FormData();
  form.append('secret', secret);
  form.append('response', token);
  if (ip) form.append('remoteip', ip);
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
    if (!r.ok) return false;
    const d = await r.json();
    return d.success === true && (!d.action || d.action === 'spot') && hosts.includes(d.hostname);
  } catch { return false; }  // 確認できないときは受け付けない
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const allowed = String(env.ALLOWED_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
    const okOrigin = allowed.includes(origin) ? origin : '';

    if (url.pathname !== '/api/spots') return json(404, { ok: false, error: 'not found' });

    if (request.method === 'OPTIONS') {
      if (!okOrigin) return new Response(null, { status: 403 });
      return new Response(null, { status: 204, headers: {
        'Access-Control-Allow-Origin': okOrigin, 'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400', Vary: 'Origin' } });
    }
    if (request.method !== 'POST') return json(405, { ok: false, error: 'method not allowed' }, okOrigin);
    // サイト以外からの送信は受けない
    if (!okOrigin) return json(403, { ok: false, error: '送信できませんでした' });
    if (!(request.headers.get('Content-Type') || '').startsWith('application/json')) return json(415, { ok: false, error: '送信できませんでした' }, okOrigin);
    const len = Number(request.headers.get('Content-Length') || 0);
    if (len > LIMITS.body) return json(413, { ok: false, error: '内容が長すぎます' }, okOrigin);

    let input;
    try {
      const text = await request.text();
      if (text.length > LIMITS.body) return json(413, { ok: false, error: '内容が長すぎます' }, okOrigin);
      input = JSON.parse(text);
    } catch { return json(400, { ok: false, error: '送信内容を読み取れませんでした' }, okOrigin); }

    const v = validateSubmission(input);
    if (!v.ok) return json(400, { ok: false, error: v.error }, okOrigin);

    const ip = request.headers.get('CF-Connecting-IP') || '';
    if (!(await verifyTurnstile(input.turnstile, env.TURNSTILE_SECRET, ip, allowed.map(o => new URL(o).hostname)))) {
      return json(403, { ok: false, error: '確認に失敗しました。ページを開き直してもう一度お試しください' }, okOrigin);
    }

    const day = jstDay();
    const s = v.value;

    // 同じ日に、場所の名前とひとことが同じ投稿は受けない
    const dup = await sha256(contentKey(s.name, s.info));
    const seen = await env.DB.prepare('SELECT 1 FROM dup_hashes WHERE day = ? AND hash = ?').bind(day, dup).first();
    if (seen) return json(409, { ok: false, error: '同じ内容の投稿が、今日すでに届いています。ありがとうございます！' }, okOrigin);

    // 同じ回線（IP）からは1日 IP_DAILY_LIMIT 件まで（日本時間）。上限に届いていたら数えない
    const max = Math.max(1, Number(env.IP_DAILY_LIMIT) || 10);
    const hash = await ipHash(ip, env.IP_HASH_SECRET, day);
    const cnt = await env.DB.prepare(
      'INSERT INTO ip_counts (day, ip_hash, n) VALUES (?, ?, 1) ON CONFLICT(day, ip_hash) DO UPDATE SET n = n + 1 WHERE n < ? RETURNING n'
    ).bind(day, hash, max).first();
    if (!cnt) return json(429, { ok: false, error: `この回線からの投稿は、今日はいっぱいです（1日${max}件まで）。また明日お願いします` }, okOrigin);

    await env.DB.batch([
      env.DB.prepare('INSERT OR IGNORE INTO dup_hashes (day, hash) VALUES (?, ?)').bind(day, dup),
      env.DB.prepare('INSERT INTO submissions (created_at, name, area, info, x_handle) VALUES (?, ?, ?, ?, ?)')
        .bind(new Date().toISOString(), s.name, s.area, s.info, s.x_handle),
    ]);
    return json(201, { ok: true }, okOrigin);
  },

  // 毎日、2日より前の制限記録（ハッシュ）を消す
  async scheduled(_event, env) {
    const keep = jstDay(new Date(Date.now() - 86400e3));
    await env.DB.batch([
      env.DB.prepare('DELETE FROM ip_counts WHERE day < ?').bind(keep),
      env.DB.prepare('DELETE FROM dup_hashes WHERE day < ?').bind(keep),
    ]);
  },
};
