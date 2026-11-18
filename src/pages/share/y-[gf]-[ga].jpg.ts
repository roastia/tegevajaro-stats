// みんなのスコア予想の「わたしの予想」画像（/share/y-2-1.jpg）。次の試合について、選べるスコア（負け予想なし）の分だけビルド時に作る
import { readCsv } from '../../lib/data.js';
import { yosouData, verdict, YOSOU_UI_MAX } from '../../lib/yosou.js';
import { clubFull } from '../../config/clubs.js';
import { todayJst } from '../../lib/bday.js';
import { renderShareJpg } from '../../lib/shareimg.js';
export function getStaticPaths() {
  const { open } = yosouData({ fixtures: readCsv('fixtures'), matches: readCsv('matches'), clubFull, today: todayJst().toISOString().slice(0, 10) });
  if (!open) return [];
  const out = [];
  for (let gf = 0; gf <= YOSOU_UI_MAX; gf++) for (let ga = 0; ga <= gf; ga++) {
    out.push({ params: { gf: String(gf), ga: String(ga) }, props: { item: {
      kind: 'y', id: `${gf}-${ga}`, tag: 'YOSOU', icon: 'target', label: 'わたしのスコア予想', timeless: true,
      headline: `第${open.round}節 ${open.oppFull}戦`, big: `${gf}-${ga}`,
      sub: verdict(gf, ga),
      credit: [`${open.day} ${open.kickoffLabel}・${open.ha === 'H' ? 'ホーム' : 'アウェイ'}`, '予想は tegestats.com/yosou/'],
      cheer: 'みんなもスコアを予想しよう！',
    } } });
  }
  return out;
}
export async function GET({ props }) {
  return new Response(await renderShareJpg(props.item), { headers: { 'Content-Type': 'image/jpeg' } });
}
