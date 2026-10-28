import { renderPng } from '../../lib/og.js';
import { getData } from '../../lib/data.js';
import { SITE } from '../../config/site.js';
export async function GET() {
  const tr = getData().team_records[0] || {};
  return new Response(await renderPng({
    label: 'テゲバジャーロ宮崎 26/27', icon: 'trophy', headline: '数字で見ると、今季のテゲバはもっとアツい。',
    big: `${tr.unbeaten}試合負けなし`, sub: `${SITE.roundLabel}までの記録から作った、テゲサポが語りたくなるランキング`, cheer: '',
  }), { headers: { 'Content-Type': 'image/png' } });
}
