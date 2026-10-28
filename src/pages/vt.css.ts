// ページ移動でカードがつながって見えるよう、カードごとに View Transition の名前を付ける
import { getShareables } from '../lib/data.js';
export function GET() {
  const css = getShareables().map(s => `.vt-${s.kind}-${s.id}{view-transition-name:vt-${s.kind}-${s.id}}`).join('\n');
  return new Response(css, { headers: { 'Content-Type': 'text/css; charset=utf-8' } });
}
