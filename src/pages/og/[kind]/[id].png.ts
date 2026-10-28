import { getShareables } from '../../../lib/data.js';
import { renderPng } from '../../../lib/og.js';
export function getStaticPaths() {
  return getShareables().map(item => ({ params: { kind: item.kind, id: item.id }, props: { item } }));
}
export async function GET({ props }) {
  return new Response(await renderPng(props.item), { headers: { 'Content-Type': 'image/png' } });
}
