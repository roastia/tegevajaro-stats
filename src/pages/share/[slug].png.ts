// 「画像でポスト」用の画像（/share/t-〇〇.png・/share/r-〇〇.png）。注目トピック・ランキングの1件ずつ、ビルド時に作る
import { getShareables } from '../../lib/data.js';
import { renderSharePng, shareImgPath } from '../../lib/shareimg.js';
export function getStaticPaths() {
  return getShareables().filter(s => s.kind === 't' || s.kind === 'r')
    .map(item => ({ params: { slug: shareImgPath(item).replace(/^share\//, '').replace(/\.png$/, '') }, props: { item } }));
}
export async function GET({ props }) {
  return new Response(await renderSharePng(props.item), { headers: { 'Content-Type': 'image/png' } });
}
