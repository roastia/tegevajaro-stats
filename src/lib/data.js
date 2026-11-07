// ビルド時に CSV を読み込み、ランキングを計算して各ページへ渡す
import fs from 'node:fs';
import path from 'node:path';
import { computeAll } from './calcs.js';
import { RECORDS, rankRows, plainTitle as pTitle } from './meta.js';
import { ranksOf, movesOf, newLeaders } from './history.js';
import { milestones } from './milestones.js';
import { SITE } from '../config/site.js';
import { splitDisp as splitDispB } from './util.js';

// ビルドはプロジェクトの直下で実行する前提（npm run build）
const DATA_DIR = path.resolve(process.cwd(), 'src/data');
export const DATASETS = ['players', 'goals', 'matches', 'profiles', 'cbp', 'xg', 'pass_pairs', 'suspension', 'appearances', 'goals_all'];

// カンマを含まない単純な CSV のみ（データ側でカンマを使わないルール）
export function readCsv(name) {
  const text = fs.readFileSync(path.join(DATA_DIR, name + '.csv'), 'utf8').replace(/\r/g, '').trim();
  const [head, ...rows] = text.split('\n');
  const keys = head.split(',');
  return rows.map(line => { const v = line.split(','); return Object.fromEntries(keys.map((k, i) => [k, v[i] ?? ''])); });
}

function readHistory() {
  const f = path.join(DATA_DIR, 'rank_history.json');
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return {}; }
}

let cache;
export function getData() {
  if (cache) return cache;
  const D = Object.fromEntries(DATASETS.map(n => [n, readCsv(n)]));
  const all = computeAll(D, SITE.asOf);
  const records = RECORDS
    .filter(r => SITE.footballLab || r.src !== 'Football LAB')
    .map(meta => ({ meta, rows: rankRows(meta, all.records) }));

  // ランキングの変動：前の節（rank_history.json にある、今より前のいちばん新しい節）とくらべる
  const round = Math.max(0, ...D.matches.map(m => Number(m.round)));
  const hist = readHistory();
  const prevRound = Math.max(0, ...Object.keys(hist).map(Number).filter(r => r < round));
  const prev = prevRound ? hist[prevRound] : null;
  const now = ranksOf(all);
  const moves = movesOf(now, prev);
  // Football LAB 由来（upto のあるもの）は毎節は中身が変わらないので、↑↓・首位交代の対象にしない
  const fixedIds = new Set(records.filter(r => r.meta.upto).map(r => r.meta.id));
  for (const { meta, rows } of records) {
    if (fixedIds.has(meta.id)) continue;
    const mv = moves[meta.id];
    if (mv) rows.forEach(r => { const x = mv[r.name]; if (x) { r._move = x.move; r._new = x.isNew; } });
  }
  // 首位浮上（記録ごとにまとめる）→ 注目トピックの先頭に
  const shown = new Set(records.filter(r => !fixedIds.has(r.meta.id)).map(r => r.meta.id));
  const byRec = new Map();
  for (const l of newLeaders(now, prev).filter(l => shown.has(l.id))) { if (!byRec.has(l.id)) byRec.set(l.id, []); byRec.get(l.id).push(l); }
  // 1件ごとの詳しい中身（ランキングのページの「首位交代」ボードで使う）：新しい首位の記録・前の節の順位、前の節の首位
  const climbs = [...byRec.entries()].map(([id, ls]) => {
    const rec = records.find(r => r.meta.id === id);
    const val = name => { const r = rec.rows.find(x => x.name === name); return r && !rec.meta.hideValue ? splitDispB(r.display)[0] : ''; };
    const was = Object.entries(prev[id] || {}).filter(([, rk]) => rk === 1).map(([n]) => n).filter(n => !ls.some(l => l.name === n));
    return { id, title: pTitle(rec.meta.title), names: ls.map(l => l.name), from: ls[0].from,
      leaders: ls.map(l => ({ name: l.name, from: l.from, value: val(l.name) })), was };
  });
  const topics = [...all.topics];
  // 同じ記録で首位が2つ以上並んだら、ポスト文が長くなりすぎないよう1つ＋「ほか〇組／〇人」にまとめる（ランキングのページのボードは全員出す）
  const few = ns => ns.length <= 1 ? ns.join('・') : `${ns[0]} ほか${ns.length - 1}${ns[0].includes('＆') ? '組' : '人'}`;
  if (climbs.length) {
    const c = climbs[0];
    const one = climbs.length === 1;
    topics.unshift({ id: 'climb', emoji: '⤴️', label: 'ランキング首位浮上', order: 0,
      headline: one ? `${c.names.join('・')}が、テゲスタ！ランキング「${c.title}」で首位に！` : `テゲスタ！ランキングで首位交代が${climbs.length}件！`,
      big: one ? c.names.join('・') : `${climbs.length}件`,
      sub: one ? (c.from ? `第${prevRound}節の${c.from}位から一気にトップへ` : `第${prevRound}節はランク外から、一気にトップへ`)
        : climbs.slice(0, 3).map(x => `${x.title}：${few(x.names)}`).join('／') + (climbs.length > 3 ? ' ほか' : ''),
      cheer: 'テゲスタ！の選手ランキングは毎節動く。次に上がるのは誰だ？' });
  }

  // 記録まであと少し
  // 次の試合（結果がまだ入っていない、いちばん前の節）がホームかアウェイか
  const playedR = new Set(D.matches.map(m => String(m.round)));
  const nextFx = readCsv('fixtures').filter(f => !playedR.has(String(f.round))).sort((a, b) => Number(a.round) - Number(b.round))[0];
  const ms = milestones({ ...D, nextHa: nextFx?.ha });
  cache = { ...all, topics, rankings: records, prevRound, climbs, milestones: ms };
  return cache;
}

// ---- ポストできるもの（トピック・ランキング・背景）を一つの形にそろえる ----
import { ICON_OF_TOPIC, ICON_OF_RECORD, plainTitle } from './meta.js';
import { postText, splitDisp } from './util.js';

/** ポストに付けるリンク先（各ページの該当カード。サイトの URL のあとに付ける） */
export function sharePath(item) {
  if (item.kind === 'r') return `ranking/#rank-${item.id}`;
  if (item.kind === 'b') return `players/#b-${item.id}`;
  return item.id === 'climb' ? 'ranking/#t-climb' : `#t-${item.id}`;
}

export function getShareables() {
  const d = getData();
  const out = [];
  for (const t of [...d.topics].sort((a, b) => a.order - b.order)) {
    out.push({ kind: 't', id: t.id, label: t.label, icon: ICON_OF_TOPIC[t.id] || 'sparkle', headline: t.headline, big: t.big, sub: t.sub, cheer: t.cheer,
      text: postText(t.headline, t.sub, t.cheer) });
  }
  for (const { meta, rows } of d.rankings) {
    if (!rows.length || meta.warn) continue;
    const champs = rows.filter(r => r._rank === 1);
    const names = champs.map(r => r.name).join('・');
    const val = champs.length > 1 || meta.hideValue ? '' : splitDisp(champs[0].display)[0];
    const title = plainTitle(meta.title);
    out.push({ kind: 'r', id: meta.id, label: title, icon: ICON_OF_RECORD[meta.id] || 'star', headline: `${title} 1位は${names}！`,
      big: names, sub: val, cheer: meta.cheer || '', note: meta.note,
      top: rows.filter(r => r._rank <= 3).slice(0, 3).map(r => ({ rank: r._rank, name: r.name, display: meta.hideValue ? '' : r.display })),
      text: postText(`${title}\n1位は${names}${val ? `（${val}）` : ''}！`, '', meta.cheer).replace('\n\n', '\n') });
  }
  for (const f of [...d.roots_facts].sort((a, b) => a.order - b.order)) {
    out.push({ kind: 'b', id: f.id, label: f.label, icon: f.icon, headline: f.headline, big: f.big, sub: f.sub, cheer: f.cheer,
      text: postText(f.headline, f.sub, f.cheer) });
  }
  return out;
}
