// 背番号バッジ（オリジナルの犬の顔の線画の中に背番号）を、選手全員分 SVG で作る
// 使い方：node tools/number_badges.mjs → public/chars/numbers/<背番号>.svg
// 線の色は currentColor（ページ側でポジション色などに変えられる）。背景は透過。
import fs from 'node:fs';
import { getData } from '../src/lib/data.js';

const face = `
  <path d="M22 38 Q17 20 23 8 Q26 5 30 8 L42 21 Q50 19 58 21 L70 8 Q74 5 77 8 Q83 20 78 38" />
  <path d="M26 13 L33 23 M74 13 L67 23" />
  <path d="M22 38 Q10 55 15 70 Q21 88 50 92 Q79 88 85 70 Q90 55 78 38" />
  <path d="M33 62 Q36 59 39 62 M61 62 Q64 59 67 62" />
  <path d="M45 70 Q50 67 55 70 Q55 74 50 76 Q45 74 45 70 Z" fill="currentColor" />
  <path d="M50 76 L50 79 M43 78 Q46.5 82 50 79 Q53.5 82 57 78" />`;
const svg = no => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="背番号${no}">
<g fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">${face}
</g>
<text x="50" y="${no.length > 1 ? 52 : 53}" text-anchor="middle" font-family="'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic', sans-serif" font-weight="700" font-size="${no.length > 1 ? 21 : 24}" fill="currentColor">${no}</text>
</svg>
`;
const nos = [...new Set(getData().profiles.map(p => String(p.no)).filter(Boolean))].sort((a, b) => a - b);
for (const no of nos) fs.writeFileSync(`public/chars/numbers/${no}.svg`, svg(no));
console.log(nos.length, 'badges');
