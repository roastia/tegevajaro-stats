// 背番号アイコン（無地のシャツの線画の中に背番号）を、選手全員分 SVG で作る
// 特定のクラブのユニフォームのデザイン（柄・ロゴ・スポンサー）は描かない、一般的なシャツの形だけ
// 使い方：node tools/number_badges.mjs → public/chars/numbers/<背番号>.svg
// 線の色は currentColor（ページ側でポジション色などに変えられる）。背景は透過。
import fs from 'node:fs';
import { getData } from '../src/lib/data.js';

// 丸首・袖にライン・まっすぐな胴のシンプルなサッカーシャツ（このサイト用に描いたオリジナル）
const face = `
  <path d="M37 13 L19 20 L6 48 L22 54 L28 41 L28 92 L72 92 L72 41 L78 54 L94 48 L81 20 L63 13" />
  <path d="M37 13 Q50 31 63 13" />
  <path d="M37 13 Q50 19 63 13" />
  <path d="M26 22 L13 51 M74 22 L87 51" />`;
const svg = no => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="背番号${no}">
<g fill="none" stroke="currentColor" stroke-width="4.6" stroke-linecap="butt" stroke-linejoin="round">${face}
</g>
<text x="50" y="${no.length > 1 ? 78 : 82}" text-anchor="middle" font-family="'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic', sans-serif" font-weight="500" letter-spacing="${no.length > 1 ? -1 : 0}" font-size="${no.length > 1 ? 31 : 44}" fill="currentColor">${no}</text>
</svg>
`;
const nos = [...new Set(getData().profiles.map(p => String(p.no)).filter(Boolean))].sort((a, b) => a - b);
for (const no of nos) fs.writeFileSync(`public/chars/numbers/${no}.svg`, svg(no));
console.log(nos.length, 'badges');
