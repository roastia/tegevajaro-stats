// テゲスタ！ おすすめスポットの投稿受付（Cloudflare Workers + D1 + Turnstile）
// - 受け付けるのは POST /api/spots（投稿）・POST /api/links（リンク集への情報提供：URL だけ）・POST /api/removal（掲載をやめる依頼）と /api/hearts（ハート：POST で押す・外す、GET で並び順だけ）・/api/yosou（スコア予想：POST で予想、GET で集計）・POST /api/suki（テゲスキ！：テゲバの好きなところ）・/api/likes（テゲスキ！のいいね！）。投稿の中身やハートの数を返す API は作らない（中身は wrangler で取り出す）
// - IP アドレスは保存しない（日ごとの鍵でハッシュ化した値だけを2日間だけ置く）
// - 連投の対策：Turnstile を毎回必須・同じ回線から1日 IP_DAILY_LIMIT 件まで・同じ日の同じ内容は受けない
import { validateSubmission, validateLink, validateRemoval, validateHeart, validateYosou, validateSuki, jstDay, ipHash, contentKey, sha256, LIMITS } from './validate.js';

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
// Turnstile の確認で受け入れるホスト名。テスト用の Worker（TEST_MODE=1）では、テスト用キーが返す example.com も受け入れる
const tsHosts = (allowed, env) => [...allowed.map(o => new URL(o).hostname), ...(env.TEST_MODE === '1' ? ['example.com'] : [])];

async function verifyTurnstile(token, secret, ip, hosts, action = 'spot') {
  if (!token || typeof token !== 'string' || token.length > 2048) return false;
  const form = new FormData();
  form.append('secret', secret);
  form.append('response', token);
  if (ip) form.append('remoteip', ip);
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
    if (!r.ok) return false;
    const d = await r.json();
    return d.success === true && (!d.action || d.action === action) && hosts.includes(d.hostname);
  } catch { return false; }  // 確認できないときは受け付けない
}

// ---- ハート（noteのスキのように、ログインなしで押せる） ----
// GET  /api/hearts → { order: ['s2', 's1', …] }（ハートが多い順。数は返さない）
// POST /api/hearts { id, on } → 押す（on: true）・外す（on: false）。同じ回線から同じスポットへは1日1回まで数える
async function hearts(request, env, okOrigin) {
  if (request.method === 'OPTIONS') {
    if (!okOrigin) return new Response(null, { status: 403 });
    return new Response(null, { status: 204, headers: {
      'Access-Control-Allow-Origin': okOrigin, 'Access-Control-Allow-Methods': 'GET, POST',
      'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400', Vary: 'Origin' } });
  }
  if (!okOrigin) return json(403, { ok: false });
  if (request.method === 'GET') {
    const { results } = await env.DB.prepare("SELECT spot FROM hearts WHERE spot LIKE 's%' AND n > 0 ORDER BY n DESC, spot ASC LIMIT 500").all();
    return new Response(JSON.stringify({ order: results.map(r => r.spot) }), { status: 200, headers: {
      ...SECURITY_HEADERS, 'Cache-Control': 'public, max-age=60', 'Access-Control-Allow-Origin': okOrigin, Vary: 'Origin' } });
  }
  if (request.method !== 'POST') return json(405, { ok: false }, okOrigin);
  if (!(request.headers.get('Content-Type') || '').startsWith('application/json')) return json(415, { ok: false }, okOrigin);
  let input;
  try { const text = await request.text(); if (text.length > 200) return json(413, { ok: false }, okOrigin); input = JSON.parse(text); }
  catch { return json(400, { ok: false }, okOrigin); }
  const v = validateHeart(input);
  if (!v.ok) return json(400, { ok: false }, okOrigin);
  const { id, on } = v.value;
  const day = jstDay();
  const hash = await ipHash(request.headers.get('CF-Connecting-IP') || '', env.IP_HASH_SECRET, day);
  if (on) {
    // 今日まだ押していなければ +1
    const r = await env.DB.prepare('INSERT OR IGNORE INTO heart_marks (day, ip_hash, spot) VALUES (?, ?, ?)').bind(day, hash, id).run();
    if (r.meta.changes) await env.DB.prepare('INSERT INTO hearts (spot, n) VALUES (?, 1) ON CONFLICT(spot) DO UPDATE SET n = n + 1').bind(id).run();
  } else {
    // 今日押した分だけ -1（前の日に押した分は数えたまま）
    const r = await env.DB.prepare('DELETE FROM heart_marks WHERE day = ? AND ip_hash = ? AND spot = ?').bind(day, hash, id).run();
    if (r.meta.changes) await env.DB.prepare('UPDATE hearts SET n = MAX(0, n - 1) WHERE spot = ?').bind(id).run();
  }
  return json(200, { ok: true }, okOrigin);
}

// ---- テゲスキ！のいいね！（ハートと同じしくみ・同じ表。id は声の番号 r〇） ----
// GET  /api/likes → { counts: { r2: 3, … } }（数も返す）
// POST /api/likes { id: 'r12', on } → 押す・外す。同じ回線から同じ声へは1日1回まで数える
async function likes(request, env, okOrigin) {
  if (request.method === 'OPTIONS') {
    if (!okOrigin) return new Response(null, { status: 403 });
    return new Response(null, { status: 204, headers: {
      'Access-Control-Allow-Origin': okOrigin, 'Access-Control-Allow-Methods': 'GET, POST',
      'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400', Vary: 'Origin' } });
  }
  if (!okOrigin) return json(403, { ok: false });
  if (request.method === 'GET') {
    const { results } = await env.DB.prepare("SELECT spot, n FROM hearts WHERE spot LIKE 'r%' AND n > 0 LIMIT 5000").all();
    return new Response(JSON.stringify({ counts: Object.fromEntries(results.map(r => [r.spot, r.n])) }), { status: 200, headers: {
      ...SECURITY_HEADERS, 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': okOrigin, Vary: 'Origin' } });
  }
  if (request.method !== 'POST') return json(405, { ok: false }, okOrigin);
  if (!(request.headers.get('Content-Type') || '').startsWith('application/json')) return json(415, { ok: false }, okOrigin);
  let input;
  try { const text = await request.text(); if (text.length > 200) return json(413, { ok: false }, okOrigin); input = JSON.parse(text); }
  catch { return json(400, { ok: false }, okOrigin); }
  const v = validateHeart(input, 'r', 5);
  if (!v.ok) return json(400, { ok: false }, okOrigin);
  const { id, on } = v.value;
  const day = jstDay();
  const hash = await ipHash(request.headers.get('CF-Connecting-IP') || '', env.IP_HASH_SECRET, day);
  if (on) {
    const r = await env.DB.prepare('INSERT OR IGNORE INTO heart_marks (day, ip_hash, spot) VALUES (?, ?, ?)').bind(day, hash, id).run();
    if (r.meta.changes) await env.DB.prepare('INSERT INTO hearts (spot, n) VALUES (?, 1) ON CONFLICT(spot) DO UPDATE SET n = n + 1').bind(id).run();
  } else {
    const r = await env.DB.prepare('DELETE FROM heart_marks WHERE day = ? AND ip_hash = ? AND spot = ?').bind(day, hash, id).run();
    if (r.meta.changes) await env.DB.prepare('UPDATE hearts SET n = MAX(0, n - 1) WHERE spot = ?').bind(id).run();
  }
  const row = await env.DB.prepare('SELECT n FROM hearts WHERE spot = ?').bind(id).first();
  return json(200, { ok: true, n: row ? row.n : 0 }, okOrigin);
}

// ---- スコア予想（みんなの予想。ログインなし・名前なし） ----
// 受け付ける試合とキックオフの時刻は、サイトの /yosou.json（毎日のビルドで作る）を正とする。キックオフを過ぎたら受け付けない
// GET  /api/yosou?match=YYYY-MM-DD → { match, total, scores: [{ gf, ga, n }] }（数の多い順）
// GET  /api/yosou?all=1            → { matches: { 'YYYY-MM-DD': { total, scores } } }（これまでの予想）
// POST /api/yosou { match, gf, ga } → 予想する・変える（同じ回線から1試合1票）。返すのは GET と同じ集計
async function openMatch(env, siteOrigin) {
  try {
    const r = await fetch(new URL('/yosou.json', siteOrigin).href, { cf: { cacheTtl: 300, cacheEverything: true } });
    if (!r.ok) return null;
    const d = await r.json();
    return d && d.open && typeof d.open.key === 'string' && typeof d.open.kickoff === 'string' ? d.open : null;
  } catch { return null; }
}
async function tally(env, match) {
  const live = await env.DB.prepare('SELECT gf, ga, COUNT(*) AS n FROM yosou_votes WHERE match = ? GROUP BY gf, ga').bind(match).all();
  const done = await env.DB.prepare('SELECT gf, ga, n FROM yosou_tally WHERE match = ?').bind(match).all();
  const m = new Map();
  for (const r of [...done.results, ...live.results]) { const k = `${r.gf}-${r.ga}`; m.set(k, { gf: r.gf, ga: r.ga, n: (m.get(k)?.n || 0) + r.n }); }
  const scores = [...m.values()].sort((a, b) => b.n - a.n || b.gf - a.gf || a.ga - b.ga);
  return { match, total: scores.reduce((t, s) => t + s.n, 0), scores };
}
async function yosou(request, env, okOrigin, allowed) {
  if (request.method === 'OPTIONS') {
    if (!okOrigin) return new Response(null, { status: 403 });
    return new Response(null, { status: 204, headers: {
      'Access-Control-Allow-Origin': okOrigin, 'Access-Control-Allow-Methods': 'GET, POST',
      'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400', Vary: 'Origin' } });
  }
  if (!okOrigin) return json(403, { ok: false });
  const url = new URL(request.url);
  if (request.method === 'GET') {
    let body;
    if (url.searchParams.get('all') === '1') {
      const { results } = await env.DB.prepare(
        'SELECT match, gf, ga, SUM(n) AS n FROM (SELECT match, gf, ga, n FROM yosou_tally UNION ALL SELECT match, gf, ga, COUNT(*) AS n FROM yosou_votes GROUP BY match, gf, ga) GROUP BY match, gf, ga'
      ).all();
      const matches = {};
      for (const r of results) {
        const t = (matches[r.match] ||= { total: 0, scores: [] });
        t.scores.push({ gf: r.gf, ga: r.ga, n: r.n }); t.total += r.n;
      }
      for (const t of Object.values(matches)) t.scores.sort((a, b) => b.n - a.n || b.gf - a.gf || a.ga - b.ga);
      body = { matches };
    } else {
      const match = url.searchParams.get('match') || '';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(match)) return json(400, { ok: false }, okOrigin);
      body = await tally(env, match);
    }
    return new Response(JSON.stringify(body), { status: 200, headers: {
      ...SECURITY_HEADERS, 'Cache-Control': 'public, max-age=20', 'Access-Control-Allow-Origin': okOrigin, Vary: 'Origin' } });
  }
  if (request.method !== 'POST') return json(405, { ok: false }, okOrigin);
  if (!(request.headers.get('Content-Type') || '').startsWith('application/json')) return json(415, { ok: false }, okOrigin);
  let input;
  try { const text = await request.text(); if (text.length > 200) return json(413, { ok: false }, okOrigin); input = JSON.parse(text); }
  catch { return json(400, { ok: false }, okOrigin); }
  const v = validateYosou(input);
  if (!v.ok) return json(400, { ok: false, error: 'この予想は受け付けられません' }, okOrigin);
  const { match, gf, ga } = v.value;
  const open = await openMatch(env, allowed[0]);
  if (!open || open.key !== match) return json(409, { ok: false, error: 'この試合の予想は受け付けていません' }, okOrigin);
  if (Date.now() >= Date.parse(open.kickoff)) return json(409, { ok: false, error: 'キックオフを過ぎたので、予想は締め切りました' }, okOrigin);
  // 同じ回線から1試合1票：試合ごとの鍵でハッシュ化（日が変わっても同じ値。試合が違えば別の値）
  const voter = await ipHash(request.headers.get('CF-Connecting-IP') || '', env.IP_HASH_SECRET, 'yosou:' + match);
  await env.DB.prepare(
    'INSERT INTO yosou_votes (match, voter, gf, ga, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(match, voter) DO UPDATE SET gf = excluded.gf, ga = excluded.ga, updated_at = excluded.updated_at'
  ).bind(match, voter, gf, ga, new Date().toISOString()).run();
  return json(200, { ok: true, ...(await tally(env, match)) }, okOrigin);
}

// ---- リンク集への情報提供（URL だけ。おすすめスポットと同じルール：Turnstile・1日10件・同じ内容は1日1回） ----
async function links(request, env, okOrigin, allowed) {
  if (request.method === 'OPTIONS') {
    if (!okOrigin) return new Response(null, { status: 403 });
    return new Response(null, { status: 204, headers: {
      'Access-Control-Allow-Origin': okOrigin, 'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400', Vary: 'Origin' } });
  }
  if (request.method !== 'POST') return json(405, { ok: false, error: 'method not allowed' }, okOrigin);
  if (!okOrigin) return json(403, { ok: false, error: '送信できませんでした' });
  if (!(request.headers.get('Content-Type') || '').startsWith('application/json')) return json(415, { ok: false, error: '送信できませんでした' }, okOrigin);
  if (Number(request.headers.get('Content-Length') || 0) > LIMITS.body) return json(413, { ok: false, error: '内容が長すぎます' }, okOrigin);
  let input;
  try {
    const text = await request.text();
    if (text.length > LIMITS.body) return json(413, { ok: false, error: '内容が長すぎます' }, okOrigin);
    input = JSON.parse(text);
  } catch { return json(400, { ok: false, error: '送信内容を読み取れませんでした' }, okOrigin); }
  const v = validateLink(input);
  if (!v.ok) return json(400, { ok: false, error: v.error }, okOrigin);
  const ip = request.headers.get('CF-Connecting-IP') || '';
  if (!(await verifyTurnstile(input.turnstile, env.TURNSTILE_SECRET, ip, tsHosts(allowed, env), 'link'))) {
    return json(403, { ok: false, error: '確認に失敗しました。ページを開き直してもう一度お試しください' }, okOrigin);
  }
  const day = jstDay();
  const dup = await sha256('link|' + v.value.url.toLowerCase().replace(/\/+$/, ''));
  if (await env.DB.prepare('SELECT 1 FROM dup_hashes WHERE day = ? AND hash = ?').bind(day, dup).first()) {
    return json(409, { ok: false, error: '同じ URL が、今日すでに届いています。ありがとうございます！' }, okOrigin);
  }
  // 1日の件数は、おすすめスポットの投稿とは別に数える（同じ IP_DAILY_LIMIT 件まで）
  const max = Math.max(1, Number(env.IP_DAILY_LIMIT) || 10);
  const hash = await ipHash(ip + '|link', env.IP_HASH_SECRET, day);
  const cnt = await env.DB.prepare(
    'INSERT INTO ip_counts (day, ip_hash, n) VALUES (?, ?, 1) ON CONFLICT(day, ip_hash) DO UPDATE SET n = n + 1 WHERE n < ? RETURNING n'
  ).bind(day, hash, max).first();
  if (!cnt) return json(429, { ok: false, error: `この回線からの送信は、今日はいっぱいです（1日${max}件まで）。また明日お願いします` }, okOrigin);
  await env.DB.batch([
    env.DB.prepare('INSERT OR IGNORE INTO dup_hashes (day, hash) VALUES (?, ?)').bind(day, dup),
    env.DB.prepare('INSERT INTO link_submissions (created_at, url) VALUES (?, ?)').bind(new Date().toISOString(), v.value.url),
  ]);
  return json(201, { ok: true }, okOrigin);
}

// ---- テゲスキ！（テゲバの好きなところ）：ニックネーム（任意）と本文だけ。ルールはリンク集と同じ（Turnstile・同じ文は1日1回・回線ごとに1日の上限） ----
async function suki(request, env, okOrigin, allowed) {
  if (request.method === 'OPTIONS') {
    if (!okOrigin) return new Response(null, { status: 403 });
    return new Response(null, { status: 204, headers: {
      'Access-Control-Allow-Origin': okOrigin, 'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400', Vary: 'Origin' } });
  }
  if (request.method !== 'POST') return json(405, { ok: false, error: 'method not allowed' }, okOrigin);
  if (!okOrigin) return json(403, { ok: false, error: '送信できませんでした' });
  if (!(request.headers.get('Content-Type') || '').startsWith('application/json')) return json(415, { ok: false, error: '送信できませんでした' }, okOrigin);
  if (Number(request.headers.get('Content-Length') || 0) > LIMITS.body) return json(413, { ok: false, error: '内容が長すぎます' }, okOrigin);
  let input;
  try {
    const text = await request.text();
    if (text.length > LIMITS.body) return json(413, { ok: false, error: '内容が長すぎます' }, okOrigin);
    input = JSON.parse(text);
  } catch { return json(400, { ok: false, error: '送信内容を読み取れませんでした' }, okOrigin); }
  const v = validateSuki(input);
  if (!v.ok) return json(400, { ok: false, error: v.error }, okOrigin);
  const ip = request.headers.get('CF-Connecting-IP') || '';
  if (!(await verifyTurnstile(input.turnstile, env.TURNSTILE_SECRET, ip, tsHosts(allowed, env), 'suki'))) {
    return json(403, { ok: false, error: '確認に失敗しました。ページを開き直してもう一度お試しください' }, okOrigin);
  }
  const day = jstDay();
  const dup = await sha256('suki|' + v.value.body.replace(/\s+/g, ''));
  if (await env.DB.prepare('SELECT 1 FROM dup_hashes WHERE day = ? AND hash = ?').bind(day, dup).first()) {
    return json(409, { ok: false, error: '同じ内容が、今日すでに届いています。ありがとうございます！' }, okOrigin);
  }
  const max = Math.max(1, Number(env.IP_DAILY_LIMIT) || 10);
  const hash = await ipHash(ip + '|suki', env.IP_HASH_SECRET, day);
  const cnt = await env.DB.prepare(
    'INSERT INTO ip_counts (day, ip_hash, n) VALUES (?, ?, 1) ON CONFLICT(day, ip_hash) DO UPDATE SET n = n + 1 WHERE n < ? RETURNING n'
  ).bind(day, hash, max).first();
  if (!cnt) return json(429, { ok: false, error: `この回線からの送信は、今日はいっぱいです（1日${max}件まで）。また明日お願いします` }, okOrigin);
  await env.DB.batch([
    env.DB.prepare('INSERT OR IGNORE INTO dup_hashes (day, hash) VALUES (?, ?)').bind(day, dup),
    env.DB.prepare('INSERT INTO suki_submissions (created_at, nickname, body) VALUES (?, ?, ?)').bind(new Date().toISOString(), v.value.nickname, v.value.body),
  ]);
  return json(201, { ok: true }, okOrigin);
}

// ---- 掲載をやめる依頼（対象と理由だけ。連絡先は受け取らない。ルールはほかの受付と同じ） ----
async function removal(request, env, okOrigin, allowed) {
  if (request.method === 'OPTIONS') {
    if (!okOrigin) return new Response(null, { status: 403 });
    return new Response(null, { status: 204, headers: {
      'Access-Control-Allow-Origin': okOrigin, 'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400', Vary: 'Origin' } });
  }
  if (request.method !== 'POST') return json(405, { ok: false, error: 'method not allowed' }, okOrigin);
  if (!okOrigin) return json(403, { ok: false, error: '送信できませんでした' });
  if (!(request.headers.get('Content-Type') || '').startsWith('application/json')) return json(415, { ok: false, error: '送信できませんでした' }, okOrigin);
  if (Number(request.headers.get('Content-Length') || 0) > LIMITS.body) return json(413, { ok: false, error: '内容が長すぎます' }, okOrigin);
  let input;
  try {
    const text = await request.text();
    if (text.length > LIMITS.body) return json(413, { ok: false, error: '内容が長すぎます' }, okOrigin);
    input = JSON.parse(text);
  } catch { return json(400, { ok: false, error: '送信内容を読み取れませんでした' }, okOrigin); }
  const v = validateRemoval(input);
  if (!v.ok) return json(400, { ok: false, error: v.error }, okOrigin);
  const ip = request.headers.get('CF-Connecting-IP') || '';
  if (!(await verifyTurnstile(input.turnstile, env.TURNSTILE_SECRET, ip, tsHosts(allowed, env), 'removal'))) {
    return json(403, { ok: false, error: '確認に失敗しました。ページを開き直してもう一度お試しください' }, okOrigin);
  }
  const day = jstDay();
  const dup = await sha256('removal|' + v.value.item);
  if (await env.DB.prepare('SELECT 1 FROM dup_hashes WHERE day = ? AND hash = ?').bind(day, dup).first()) {
    return json(409, { ok: false, error: 'この掲載への依頼は、今日すでに届いています。確認して対応します' }, okOrigin);
  }
  const max = Math.max(1, Number(env.IP_DAILY_LIMIT) || 10);
  const hash = await ipHash(ip + '|removal', env.IP_HASH_SECRET, day);
  const cnt = await env.DB.prepare(
    'INSERT INTO ip_counts (day, ip_hash, n) VALUES (?, ?, 1) ON CONFLICT(day, ip_hash) DO UPDATE SET n = n + 1 WHERE n < ? RETURNING n'
  ).bind(day, hash, max).first();
  if (!cnt) return json(429, { ok: false, error: `この回線からの送信は、今日はいっぱいです（1日${max}件まで）。また明日お願いします` }, okOrigin);
  await env.DB.batch([
    env.DB.prepare('INSERT OR IGNORE INTO dup_hashes (day, hash) VALUES (?, ?)').bind(day, dup),
    env.DB.prepare('INSERT INTO removal_requests (created_at, item, reason, note) VALUES (?, ?, ?, ?)').bind(new Date().toISOString(), v.value.item, v.value.reason, v.value.note),
  ]);
  return json(201, { ok: true }, okOrigin);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const allowed = String(env.ALLOWED_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
    const okOrigin = allowed.includes(origin) ? origin : '';

    if (url.pathname === '/api/hearts') return hearts(request, env, okOrigin);
    if (url.pathname === '/api/likes') return likes(request, env, okOrigin);
    if (url.pathname === '/api/yosou') return yosou(request, env, okOrigin, allowed);
    if (url.pathname === '/api/links') return links(request, env, okOrigin, allowed);
    if (url.pathname === '/api/suki') return suki(request, env, okOrigin, allowed);
    if (url.pathname === '/api/removal') return removal(request, env, okOrigin, allowed);
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
    if (!(await verifyTurnstile(input.turnstile, env.TURNSTILE_SECRET, ip, tsHosts(allowed, env)))) {
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

  // 毎日、2日より前の制限記録（ハッシュ）を消す。スコア予想は試合の3日後に数だけ残して、回線のハッシュを消す
  async scheduled(_event, env) {
    const keep = jstDay(new Date(Date.now() - 86400e3));
    const old = jstDay(new Date(Date.now() - 3 * 86400e3));
    await env.DB.batch([
      env.DB.prepare('INSERT INTO yosou_tally (match, gf, ga, n) SELECT match, gf, ga, COUNT(*) FROM yosou_votes WHERE match < ? GROUP BY match, gf, ga ON CONFLICT(match, gf, ga) DO UPDATE SET n = n + excluded.n').bind(old),
      env.DB.prepare('DELETE FROM yosou_votes WHERE match < ?').bind(old),
      env.DB.prepare('DELETE FROM heart_marks WHERE day < ?').bind(keep),
      env.DB.prepare('DELETE FROM ip_counts WHERE day < ?').bind(keep),
      env.DB.prepare('DELETE FROM dup_hashes WHERE day < ?').bind(keep),
    ]);
  },
};
