// 背番号アイコン（無地のシャツの線画の中に背番号）を、選手全員分 SVG で作る
// 特定のクラブのユニフォームのデザイン（柄・ロゴ・スポンサー）は描かない、一般的なシャツの形だけ
// 使い方：node tools/number_badges.mjs → public/chars/numbers/<背番号>.svg
// 線の色は currentColor（ページ側でポジション色などに変えられる）。背景は透過。
import fs from 'node:fs';
import { getData } from '../src/lib/data.js';

const face = `
  <path d="M38 12 Q50 22 62 12 L80 19 L94 38 L81 48 L76 42 L76 90 Q50 94 24 90 L24 42 L19 48 L6 38 L20 19 Z" />
  <path d="M38 12 L50 26 L62 12" />`;
const svg = no => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="背番号${no}">
<g fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">${face}
</g>
<text x="50" y="${no.length > 1 ? 72 : 74}" text-anchor="middle" font-family="'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic', sans-serif" font-weight="700" font-size="${no.length > 1 ? 30 : 34}" fill="currentColor">${no}</text>
</svg>
`;
const nos = [...new Set(getData().profiles.map(p => String(p.no)).filter(Boolean))].sort((a, b) => a - b);
for (const no of nos) fs.writeFileSync(`public/chars/numbers/${no}.svg`, svg(no));
console.log(nos.length, 'badges');
