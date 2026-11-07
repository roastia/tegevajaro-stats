// 組み上がった _astro/ の JavaScript・CSS のファイル名から、中身から作った記号（.AbCd1234）を外して固定の名前にする。
// 名前が公開のたびに変わると、ブラウザに残った古いページ（GitHub Pages は10分ほど覚える・先読みしたページ）が
// 消えた古いファイルを探して、デザインなし・動きなしで表示されてしまうため（2026-11 iPhone の Safari で発生）。
// ページ（HTML）とスクリプトの中の参照も、新しい名前に書きかえる。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const stableName = f => f.replace(/\.[\w-]{8}(\.(?:js|css))$/, '$1');

export function stabilize(root) {
  const dir = path.join(root, '_astro');
  if (!fs.existsSync(dir)) return 0;
  const map = new Map();
  for (const f of fs.readdirSync(dir)) {
    const n = stableName(f);
    if (n === f) continue;
    if (map.has(n) || [...map.values()].includes(n) || fs.existsSync(path.join(dir, n))) throw new Error(`stable-names：同じ名前になるファイルがある（${f} → ${n}）`);
    map.set(f, n);
  }
  if (!map.size) return 0;
  const re = new RegExp([...map.keys()].map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');
  for (const f of fs.readdirSync(root, { recursive: true }).map(String).filter(f => /\.(html|js|css)$/.test(f))) {
    const p = path.join(root, f), s = fs.readFileSync(p, 'utf8'), t = s.replace(re, m => map.get(m));
    if (t !== s) fs.writeFileSync(p, t);
  }
  for (const [a, b] of map) fs.renameSync(path.join(dir, a), path.join(dir, b));
  return map.size;
}

export default function stableNames() {
  return { name: 'stable-names', hooks: { 'astro:build:done': ({ dir }) => { stabilize(fileURLToPath(dir)); } } };
}
