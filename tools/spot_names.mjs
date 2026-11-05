// おすすめスポットの「番号→名前」を Cloudflare の D1 に入れる（Studio でハートを名前つきで見るため）
// 使い方：npm run spots:names（事前に cd worker && npx wrangler@4.150.0 login）
// 入れるのはサイトに公開している spots.csv の id・name・area だけ。Worker はこの表を読まない
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readCsv } from '../src/lib/data.js';

const q = s => `'${String(s).replace(/'/g, "''")}'`;

/** spots.csv の行から、対応表とビューを作り直す SQL を作る */
export function buildSpotNamesSql(spots) {
  const rows = spots.filter(s => s.id && s.name);
  return [
    'CREATE TABLE IF NOT EXISTS spot_names (id TEXT PRIMARY KEY, name TEXT NOT NULL, area TEXT NOT NULL DEFAULT \'\');',
    'CREATE VIEW IF NOT EXISTS hearts_named AS SELECT s.id AS spot, s.name, s.area, COALESCE(h.n, 0) AS n FROM spot_names s LEFT JOIN hearts h ON h.spot = s.id ORDER BY n DESC, s.id;',
    'DELETE FROM spot_names;',
    ...rows.map(s => `INSERT INTO spot_names (id, name, area) VALUES (${q(s.id)}, ${q(s.name)}, ${q(s.area ?? '')});`),
  ].join('\n') + '\n';
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const spots = readCsv('spots');
  fs.mkdirSync(path.join(root, 'private'), { recursive: true });
  const file = path.join(root, 'private', 'spot-names.sql');
  fs.writeFileSync(file, buildSpotNamesSql(spots));
  console.log(`${spots.length}件のスポットの名前を D1 に入れます`);
  const r = spawnSync('npx', ['--yes', 'wrangler@4.150.0', 'd1', 'execute', 'tegesta-spots', '--remote', '--file', file],
    { cwd: path.join(root, 'worker'), stdio: 'inherit' });
  process.exit(r.status ?? 1);
}
