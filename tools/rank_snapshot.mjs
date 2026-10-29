// ランキングの順位を節ごとに記録する（src/data/rank_history.json）。試合データを更新したら `npm run snapshot`
// 使い方：
//   npm run snapshot              … 最新の節の順位を記録（すべての記録）
//   npm run snapshot -- --rebuild 12 … 第12節の順位を、節ごとのデータから作り直して記録（節ごとにわからない記録は入れない）
import fs from 'node:fs';
import path from 'node:path';
import { readCsv, DATASETS } from '../src/lib/data.js';
import { computeAll } from '../src/lib/calcs.js';
import { ranksOf, ranksUntil } from '../src/lib/history.js';
import { SITE } from '../src/config/site.js';

const FILE = path.resolve('src/data/rank_history.json');
const D = Object.fromEntries(DATASETS.map(n => [n, readCsv(n)]));
const latest = Math.max(...D.matches.map(m => Number(m.round)));
const hist = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8')) : {};
const i = process.argv.indexOf('--rebuild');
if (i > 0) {
  const R = Number(process.argv[i + 1]);
  hist[R] = ranksUntil(D, R, SITE.asOf);
  console.log(`第${R}節：${Object.keys(hist[R]).length}件のランキングを作り直して記録しました`);
} else {
  hist[latest] = ranksOf(computeAll(D, SITE.asOf));
  console.log(`第${latest}節：${Object.keys(hist[latest]).length}件のランキングを記録しました`);
}
const sorted = Object.fromEntries(Object.keys(hist).map(Number).sort((a, b) => a - b).map(k => [k, hist[k]]));
fs.writeFileSync(FILE, JSON.stringify(sorted) + '\n');
