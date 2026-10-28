// ビルド時に CSV を読み込み、ランキングを計算して各ページへ渡す
import fs from 'node:fs';
import path from 'node:path';
import { computeAll } from './calcs.js';
import { RECORDS, rankRows } from './meta.js';
import { SITE } from '../config/site.js';

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

let cache;
export function getData() {
  if (cache) return cache;
  const D = Object.fromEntries(DATASETS.map(n => [n, readCsv(n)]));
  const all = computeAll(D, SITE.asOf);
  const records = RECORDS
    .filter(r => SITE.footballLab || r.src !== 'Football LAB')
    .map(meta => ({ meta, rows: rankRows(meta, all.records) }));
  cache = { ...all, rankings: records };
  return cache;
}

// ---- ポストできるもの（トピック・ランキング・背景）を一つの形にそろえる ----
import { ICON_OF_TOPIC, ICON_OF_RECORD, plainTitle } from './meta.js';
import { postText } from './util.js';

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
    const val = champs.length > 1 || meta.hideValue ? '' : champs[0].display;
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
