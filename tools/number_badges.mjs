// 背番号アイコン（無地のシャツの線画の中に背番号）を、選手全員分 SVG で作る
// 特定のクラブのユニフォームのデザイン（柄・ロゴ・スポンサー）は描かない、一般的なシャツの形だけ
// 使い方：node tools/number_badges.mjs → public/chars/numbers/<背番号>.svg
// 線の色は currentColor（ページ側でポジション色などに変えられる）。背景は透過。
import fs from 'node:fs';
import { getData } from '../src/lib/data.js';

// 丸首・袖にライン・まっすぐな胴のシンプルなサッカーシャツ（このサイト用に描いたオリジナル）
const face = `
  <path d="M37 14 L20 21 L7 47 L21 52 L27 40 L27 90 L73 90 L73 40 L79 52 L93 47 L80 21 L63 14" />
  <path d="M37 14 Q50 30 63 14" />
  <path d="M37 14 Q50 20 63 14" />
  <path d="M24 26 L13 46 M76 26 L87 46" />`;
const svg = no => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="背番号${no}">
<g fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="butt" stroke-linejoin="round">${face}
</g>
<text x="50" y="${no.length > 1 ? 74 : 76}" text-anchor="middle" font-family="'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic', sans-serif" font-weight="500" font-size="${no.length > 1 ? 30 : 34}" fill="currentColor">${no}</text>
</svg>
`;
const nos = [...new Set(getData().profiles.map(p => String(p.no)).filter(Boolean))].sort((a, b) => a - b);
for (const no of nos) fs.writeFileSync(`public/chars/numbers/${no}.svg`, svg(no));
console.log(nos.length, 'badges');
