// 背番号アイコン（無地のシャツの線画の中に背番号）を、選手全員分 SVG で作る
// 特定のクラブのユニフォームのデザイン（柄・ロゴ・スポンサー）は描かない、一般的なシャツの形だけ
// 使い方：node tools/number_badges.mjs → public/chars/numbers/<背番号>.svg
// 線の色は currentColor（ページ側でポジション色などに変えられる）。背景は透過。
import fs from 'node:fs';
import { getData } from '../src/lib/data.js';

// 丸首・袖にライン・まっすぐな胴のシンプルなサッカーシャツ（このサイト用に描いたオリジナル）
// よくあるサッカーシャツのアイコンの要素（太い丸首・帯状の袖ライン・袖と離れた胴の線）を、このサイト用に独自の比率で描いたもの
const face = `
  <path d="M36 12 Q50 27 64 12" />
  <path d="M36 12 L16 20 L5 46 L19 52 L26 37" />
  <path d="M64 12 L84 20 L95 46 L81 52 L74 37" />
  <path d="M23 24 L13 44 L19.5 47 L30 27 Z" />
  <path d="M77 24 L87 44 L80.5 47 L70 27 Z" />
  <path d="M27 44 L27 93 L73 93 L73 44" />`;
const svg = no => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="背番号${no}">
<g fill="none" stroke="currentColor" stroke-width="4.6" stroke-linecap="butt" stroke-linejoin="round">${face}
</g>
<text x="50" y="${no.length > 1 ? 78 : 82}" text-anchor="middle" font-family="'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic', sans-serif" font-weight="700" letter-spacing="${no.length > 1 ? -1 : 0}" font-size="${no.length > 1 ? 31 : 44}" fill="currentColor">${no}</text>
</svg>
`;
const nos = [...new Set(getData().profiles.map(p => String(p.no)).filter(Boolean))].sort((a, b) => a - b);
for (const no of nos) fs.writeFileSync(`public/chars/numbers/${no}.svg`, svg(no));
console.log(nos.length, 'badges');
