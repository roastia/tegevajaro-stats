// リンクのサムネイル画像（テゲスタ！のロゴ）。すべてのページで共通
import { renderLogoPng } from '../../lib/og.js';
export async function GET() {
  return new Response(await renderLogoPng(), { headers: { 'Content-Type': 'image/png' } });
}
