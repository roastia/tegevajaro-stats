// スコア予想：入力の確かめと、Worker の受け付け（D1 は node:sqlite で代わりに動かす）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { validateYosou } from '../src/validate.js';
import worker from '../src/index.js';

test('予想の形：0〜9点、負け予想は受けない', () => {
  assert.deepEqual(validateYosou({ match: '2026-11-21', gf: 2, ga: 1 }), { ok: true, value: { match: '2026-11-21', gf: 2, ga: 1 } });
  assert.equal(validateYosou({ match: '2026-11-21', gf: 1, ga: 1 }).ok, true);   // 引き分けは選べる
  assert.equal(validateYosou({ match: '2026-11-21', gf: 0, ga: 1 }).ok, false);  // 負け予想
  assert.equal(validateYosou({ match: '2026-11-21', gf: 10, ga: 0 }).ok, false);
  assert.equal(validateYosou({ match: '2026-11-21', gf: 1.5, ga: 0 }).ok, false);
  assert.equal(validateYosou({ match: '11/21', gf: 1, ga: 0 }).ok, false);
  assert.equal(validateYosou(null).ok, false);
});

// D1 の代わり（prepare→bind→all/first/run と batch だけ）
function fakeD1() {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    all: async () => ({ results: db.prepare(sql).all(...args) }),
    first: async () => db.prepare(sql).get(...args) ?? null,
    run: async () => { const r = db.prepare(sql).run(...args); return { meta: { changes: Number(r.changes) } }; },
  });
  return { prepare: sql => stmt(sql), batch: async list => { for (const s of list) await s.run(); }, raw: db };
}

const SITE = 'https://tegestats.com';
const env = () => ({ DB: fakeD1(), ALLOWED_ORIGIN: SITE, IP_HASH_SECRET: 'test' });
const post = (body, ip = '1.1.1.1') => new Request('https://w.example/api/yosou', {
  method: 'POST', headers: { Origin: SITE, 'Content-Type': 'application/json', 'CF-Connecting-IP': ip }, body: JSON.stringify(body) });
const get = q => new Request('https://w.example/api/yosou?' + q, { headers: { Origin: SITE } });

// サイトの /yosou.json の代わり
function withOpen(open, fn) {
  const orig = globalThis.fetch;
  globalThis.fetch = async url => {
    if (String(url) === SITE + '/yosou.json') return new Response(JSON.stringify({ open }), { status: 200 });
    throw new Error('unexpected fetch ' + url);
  };
  return fn().finally(() => { globalThis.fetch = orig; });
}

test('予想する・変える・集計（同じ回線は1票）', () => withOpen({ key: '2026-11-21', kickoff: new Date(Date.now() + 3600e3).toISOString() }, async () => {
  const e = env();
  let r = await worker.fetch(post({ match: '2026-11-21', gf: 2, ga: 1 }), e);
  assert.equal(r.status, 200);
  await worker.fetch(post({ match: '2026-11-21', gf: 2, ga: 1 }, '2.2.2.2'), e);
  r = await worker.fetch(post({ match: '2026-11-21', gf: 3, ga: 0 }), e);   // 1.1.1.1 が予想を変える
  const d = await r.json();
  assert.equal(d.total, 2);
  assert.deepEqual(d.scores, [{ gf: 3, ga: 0, n: 1 }, { gf: 2, ga: 1, n: 1 }]);
  const g = await (await worker.fetch(get('match=2026-11-21'), e)).json();
  assert.equal(g.total, 2);
  // 負け予想・ちがう試合・ほかのサイトからは受けない
  assert.equal((await worker.fetch(post({ match: '2026-11-21', gf: 0, ga: 2 }), e)).status, 400);
  assert.equal((await worker.fetch(post({ match: '2026-11-28', gf: 1, ga: 0 }), e)).status, 409);
  const bad = new Request('https://w.example/api/yosou', { method: 'POST', headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal((await worker.fetch(bad, e)).status, 403);
}));

test('キックオフを過ぎたら締め切り。3日後に数だけ残して回線のハッシュを消す', () => withOpen({ key: '2026-11-21', kickoff: new Date(Date.now() - 60e3).toISOString() }, async () => {
  const e = env();
  e.DB.raw.prepare("INSERT INTO yosou_votes VALUES ('2000-01-01', 'a', 1, 0, 'x'), ('2000-01-01', 'b', 1, 0, 'x'), ('2000-01-01', 'c', 2, 2, 'x')").run();
  assert.equal((await worker.fetch(post({ match: '2026-11-21', gf: 1, ga: 0 }), e)).status, 409);
  await worker.scheduled({}, e);
  assert.equal(e.DB.raw.prepare('SELECT COUNT(*) AS n FROM yosou_votes').get().n, 0);
  const all = await (await worker.fetch(get('all=1'), e)).json();
  assert.deepEqual(all.matches['2000-01-01'], { total: 3, scores: [{ gf: 1, ga: 0, n: 2 }, { gf: 2, ga: 2, n: 1 }] });
}));

// ---- てげ好き ----
import { validateSuki } from '../src/validate.js';
test('てげ好きの形：同意が必要・5〜600字・URL は不可・改行は残す', () => {
  const ok = validateSuki({ agree: true, nickname: ' テゲ太郎 ', body: 'ゴール裏の\r\n\r\n\r\n声がすき！' });
  assert.deepEqual(ok, { ok: true, value: { nickname: 'テゲ太郎', body: 'ゴール裏の\n\n声がすき！' } });
  assert.equal(validateSuki({ agree: false, body: 'テゲバが大好きです' }).ok, false);
  assert.equal(validateSuki({ agree: true, body: 'すき' }).ok, false);
  assert.equal(validateSuki({ agree: true, body: 'あ'.repeat(601) }).ok, false);
  assert.equal(validateSuki({ agree: true, body: 'あ'.repeat(600) }).ok, true);
  assert.equal(validateSuki({ agree: true, body: 'くわしくは https://example.com で' }).ok, false);
  assert.equal(validateSuki({ agree: true, body: 'テゲバが大好きです', website: 'x' }).ok, false);
});

test('てげ好きの受付：届いた声は公開しない受け箱へ。同じ文は1日1回', async () => {
  const e = { DB: fakeD1(), ALLOWED_ORIGIN: SITE, IP_HASH_SECRET: 'test', TURNSTILE_SECRET: 's' };
  const orig = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ success: true, hostname: 'tegestats.com', action: 'suki' }), { status: 200 });
  try {
    const req = () => new Request('https://w.example/api/suki', { method: 'POST', headers: { Origin: SITE, 'Content-Type': 'application/json', 'CF-Connecting-IP': '1.1.1.1' },
      body: JSON.stringify({ agree: true, nickname: '', body: 'テゲスタの雰囲気がすき', turnstile: 't' }) });
    assert.equal((await worker.fetch(req(), e)).status, 201);
    assert.equal((await worker.fetch(req(), e)).status, 409);
    assert.deepEqual(e.DB.raw.prepare('SELECT nickname, body, status FROM suki_submissions').all().map(r => ({ ...r })), [{ nickname: '', body: 'テゲスタの雰囲気がすき', status: 'pending' }]);
  } finally { globalThis.fetch = orig; }
});

test('てげ好きのいいね！：押すと数が増え、同じ回線は1日1回。スポットのハートの並びには混ざらない', async () => {
  const e = { DB: fakeD1(), ALLOWED_ORIGIN: SITE, IP_HASH_SECRET: 'test' };
  const like = (id, on, ip = '1.1.1.1') => worker.fetch(new Request('https://w.example/api/likes', { method: 'POST', headers: { Origin: SITE, 'Content-Type': 'application/json', 'CF-Connecting-IP': ip }, body: JSON.stringify({ id, on }) }), e);
  assert.equal((await (await like('r2', true)).json()).n, 1);
  assert.equal((await (await like('r2', true)).json()).n, 1);          // 同じ回線・同じ日はふえない
  assert.equal((await (await like('r2', true, '2.2.2.2')).json()).n, 2);
  assert.equal((await (await like('r2', false)).json()).n, 1);         // 外す
  assert.equal((await like('s2x', true)).status, 400);
  const counts = await (await worker.fetch(new Request('https://w.example/api/likes', { headers: { Origin: SITE } }), e)).json();
  assert.deepEqual(counts, { counts: { r2: 1 } });
  const order = await (await worker.fetch(new Request('https://w.example/api/hearts', { headers: { Origin: SITE } }), e)).json();
  assert.deepEqual(order, { order: [] });
});
