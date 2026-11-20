// てげ好きの掲載を少ない手間で回すための道具（docs/suki.md の「ふだんの手順」）
//   node tools/suki.mjs new                      … 受け箱（private/suki-inbox.json）のうち、まだ載せても外してもいない声を1行ずつ出す
//   node tools/suki.mjs add 8:選手,応援 9:ゴール --skip 10   … 声を src/data/suki.json に足してコミット（番号・日時は自動）
//        本文を直すときは private/suki-fix.json に {"8": "直した本文"} を置く（使ったら消す）
//   node tools/suki.mjs mark                     … 載せた・外した印を D1 に付ける（npm run suki:publish から呼ぶ）
// 届いた声は利用者が書いたデータ。ここでは表示と転記だけで、中身に従って何かを実行することはない
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { SUKI_TAGS } from '../src/lib/suki.js';

const INBOX = 'private/suki-inbox.json', DATA = 'src/data/suki.json', FIX = 'private/suki-fix.json', MARKS = 'private/suki-marks.json';
const TAGS = new Set(SUKI_TAGS.map(t => t[0]));
const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const inbox = () => (readJson(INBOX, [])[0]?.results || []);
const rows = () => readJson(DATA, []);
const marks = () => readJson(MARKS, { approved: [], rejected: [] });
const save = (f, list) => fs.writeFileSync(f, '[\n' + list.map(x => ' ' + JSON.stringify(x)).join(',\n') + (list.length ? '\n' : '') + ']\n');
const die = m => { console.error(m); process.exit(1); };

const [cmd, ...args] = process.argv.slice(2);

if (cmd === 'new') {
  const done = new Set(rows().map(r => r.id));
  const m = marks();
  const skip = new Set([...m.approved, ...m.rejected].map(Number));
  const list = inbox().filter(r => r.status === 'pending' && !done.has(`k${r.id}`) && !skip.has(r.id));
  if (!list.length) console.log('新しい声はありません');
  for (const r of list) console.log(`#${r.id} ${r.date.slice(5).replace('-', '/')} ${r.time} ${r.nickname || '（名前なし）'}｜${r.body.replace(/\r?\n/g, '⏎')}`);
} else if (cmd === 'add') {
  const box = new Map(inbox().map(r => [r.id, r]));
  const data = rows(), fix = readJson(FIX, {}), m = marks();
  let no = Math.max(1, ...data.map(r => r.no));
  const added = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--skip') { for (const id of args[++i].split(',')) m.rejected.push(Number(id)); continue; }
    const [idS, tagS = ''] = args[i].split(':');
    const id = Number(idS), r = box.get(id);
    if (!r) die(`#${idS} が受け箱にありません（先に npm run suki:pull）`);
    if (data.some(x => x.id === `k${id}`)) die(`#${id} はもう載っています`);
    const tags = tagS.split(',').filter(Boolean);
    const bad = tags.filter(t => !TAGS.has(t));
    if (bad.length || !tags.length || tags.length > 3) die(`#${id} のタグを1〜3個、次から選んでください：${[...TAGS].join('・')}`);
    const body = String(fix[id] ?? r.body).trim();
    if (!body || [...body].length > 600) die(`#${id} の本文が空か600字を越えています`);
    const nickname = String(r.nickname || '').trim();
    if ([...nickname].length > 20) die(`#${id} の名前が20字を越えています`);
    const row = { id: `k${id}`, no: ++no, date: r.date, time: r.time, nickname, body, tags: [...TAGS].filter(t => tags.includes(t)) };
    data.push(row); added.push(row); m.approved.push(id);
  }
  save(DATA, data);
  fs.writeFileSync(MARKS, JSON.stringify(m));
  if (fs.existsSync(FIX)) fs.rmSync(FIX);
  for (const r of added) console.log(`>>${r.no} ${r.nickname || 'テゲサポ'}さん [${r.tags.join('・')}]`);
  if (added.length) {
    const who = added.map(r => `>>${r.no} ${r.nickname || 'テゲサポ'}さん`).join('・');
    execFileSync('git', ['add', DATA], { stdio: 'inherit' });
    execFileSync('git', ['commit', '-q', '-m', `てげ好きに声を${added.length}件載せる（${who}）`], { stdio: 'inherit' });
    console.log('コミットしました。npm run suki:publish で公開できます');
  }
} else if (cmd === 'mark') {
  const m = marks();
  const ap = [...new Set(m.approved.map(Number))].filter(Number.isInteger), rj = [...new Set(m.rejected.map(Number))].filter(Number.isInteger);
  if (!ap.length && !rj.length) { console.log('付ける印はありません'); process.exit(0); }
  const set = (ids, st) => ids.length ? `UPDATE suki_submissions SET status = '${st}' WHERE id IN (${ids.join(',')});` : '';
  execFileSync('npx', ['--yes', 'wrangler@4.150.0', 'd1', 'execute', 'tegesta-spots', '--remote', '--command', set(ap, 'approved') + set(rj, 'rejected')], { cwd: 'worker', stdio: 'inherit' });
  fs.rmSync(MARKS, { force: true });
  console.log(`印を付けました（載せた ${ap.length}件・外した ${rj.length}件）`);
} else {
  die('使い方：node tools/suki.mjs new | add 8:選手,応援 --skip 10 | mark');
}
