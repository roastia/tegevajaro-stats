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
