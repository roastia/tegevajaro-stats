// 「画像でポスト」用の画像（1080×1350・縦長 4:5）をビルド時に作る。注目トピック・ランキングの1件ずつ
// 中身はページのポスト用カードと同じ（見出し・大きな数字・補足・応援）。画像だけ広まっても出どころがわかるよう、
// 下の帯に「テゲスタ！ テゲバのスタッツ・非公式サポーターサイト・時点・データ元」を入れる。写真・エンブレムは使わない
import fs from 'node:fs';
import path from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { SITE } from '../config/site.js';
import { ICONS } from './meta.js';

const W = 1080, H = 1350, PAD = 72;
const C = { bg: '#FFF1F4', ink: '#C23F63', fg: '#3A3236', muted: '#7A6E73', line: '#F3D3DC', brand: '#F16682', gold: '#F5C451' };
const FONT_DIR = path.resolve(process.cwd(), 'src/assets/fonts');
let fonts;
const loadFonts = () => fonts ||= [
  { name: 'NotoSansJP', data: fs.readFileSync(path.join(FONT_DIR, 'NotoSansJP-Regular.subset.ttf')), weight: 400, style: 'normal' },
  { name: 'NotoSansJP', data: fs.readFileSync(path.join(FONT_DIR, 'NotoSansJP-Bold.subset.ttf')), weight: 700, style: 'normal' },
];
const h = (type, style, ...children) => ({ type, props: { style, children: children.flat().filter(c => c !== null && c !== undefined && c !== false && c !== '') } });
const img = (src, width, height, style = {}) => ({ type: 'img', props: { src, width, height, style } });
const svgUri = s => 'data:image/svg+xml;base64,' + Buffer.from(s).toString('base64');
const iconUri = (name, color) => svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ICONS.sparkle}</svg>`);
let logo;
const logoUri = () => logo ||= svgUri(fs.readFileSync(path.resolve(process.cwd(), 'public/logo-tegesta.svg'), 'utf8'));
// 文字数で大きさを変える（全角1・半角0.62で数え、少し余裕を見る）
const len = s => [...String(s || '')].reduce((n, c) => n + (c.codePointAt(0) > 0xff ? 1 : .62), 0);
const fit = (s, width, max, min) => Math.max(min, Math.min(max, Math.floor(width * .92 / Math.max(1, len(s)))));

/** データ元の表記 */
export const creditOf = item => item.src === 'Football LAB' ? ['データ：Football LAB', '©DataStadium Inc.']
  : item.src ? ['データ：Jリーグ公式'] : ['データ：Jリーグ公式・Football LAB', '©DataStadium Inc.'];

// 名前（2人組の「＆」は細く小さく。名前の途中で改行しない）
const nameEl = (name, size, color, weight = 700) => h('div', { display: 'flex', alignItems: 'baseline', fontSize: size, fontWeight: weight, color },
  ...String(name).split('＆').flatMap((p, i) => [i > 0 && h('div', { display: 'flex', fontSize: Math.round(size * .7), fontWeight: 400, color: C.muted, margin: '0 6px' }, '＆'), h('div', { display: 'flex' }, p)]));
// 文を「、。！？／・空白」のあとで区切り、区切りごとに折り返す（単語の途中で改行しにくくする）
const wrapEl = (text, size, color, weight = 400) => h('div', { display: 'flex', flexWrap: 'wrap', fontSize: size, fontWeight: weight, color, lineHeight: 1.4 },
  ...String(text).split(/(?<=[、。！？／・ ])/).filter(Boolean).map(p => h('div', { display: 'flex' }, p)));

function topicBody(item) {
  const big = String(item.big || '');
  // 見出し・大きな数字・補足は、上下の真ん中あたりに置く（下の余白が空きすぎないように）
  return [h('div', { display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center', paddingBottom: 20 },
    h('div', { display: 'flex', marginTop: 40 }, wrapEl(item.headline, fit(item.headline, 1800, 60, 44), C.fg, 700)),
    h('div', { display: 'flex', marginTop: 24, fontSize: fit(big, W - PAD * 2, 260, 80), fontWeight: 700, color: C.ink, lineHeight: 1.1, letterSpacing: -2 }, big),
    item.sub && h('div', { display: 'flex', marginTop: 20 }, wrapEl(item.sub, fit(item.sub, 3400, 42, 32), C.fg)),
  )];
}

// ランキング：上位5行まで。1位は黄色の印で大きく。名前の下に数字
function rankBody(item) {
  const rows = (item.top5 || item.top || []).slice(0, 5);
  const firsts = rows.filter(r => r.rank === 1).length;   // 1位が何人（何組）いるか。多いときは小さめに
  const gap = rows.length >= 5 ? 16 : 26;
  return [h('div', { display: 'flex', marginTop: 34, fontSize: 58, fontWeight: 700, color: C.fg }, `${item.label} 1位は…`),
    h('div', { display: 'flex', flexDirection: 'column', gap, marginTop: 36 },
    ...rows.map(r => {
      const first = r.rank === 1, big = first && firsts <= 2;
      const size = big ? fit(r.name, W - PAD * 2 - 120, 72, 48) : fit(r.name, W - PAD * 2 - 110, first ? 52 : 48, 36);
      const badge = big ? 92 : 68;
      return h('div', { display: 'flex', alignItems: 'center', gap: 26 },
        h('div', { display: 'flex', alignItems: 'center', justifyContent: 'center', width: badge, height: badge, borderRadius: badge, flex: 'none',
          backgroundColor: first ? C.gold : '#FFFFFF', color: C.fg, fontSize: Math.round(badge * .5), fontWeight: 700 }, String(r.rank)),
        h('div', { display: 'flex', flexDirection: 'column' },
          nameEl(r.name, size, first ? C.ink : C.fg),
          r.display && h('div', { display: 'flex', fontSize: big ? 38 : 28, color: C.muted, marginTop: 2 }, String(r.display))));
    }))];
}

export function shareTree(item, asOf = SITE.roundLabel) {
  const isRank = item.kind === 'r';
  const kicker = isRank ? `ランキング｜${item.label}` : item.label;
  const body = h('div', { display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', padding: `${PAD}px ${PAD}px 0`, position: 'relative' },
    h('div', { display: 'flex', alignItems: 'center', gap: 14, fontSize: 38, color: C.ink, fontWeight: 700, paddingRight: 200, marginTop: 30 }, img(iconUri(item.icon, C.ink), 46, 46), kicker),
    ...(isRank ? rankBody(item) : topicBody(item)),
    item.cheer && h('div', { display: 'flex', flex: 'none', marginTop: 'auto', paddingTop: 20, marginBottom: 52 }, wrapEl(item.cheer, fit(item.cheer, 1900, 52, 36), C.ink, 700)),
  );
  const foot = h('div', { display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 150, padding: `0 ${PAD}px`, backgroundColor: '#FFFFFF', borderTop: `3px solid ${C.line}` },
    // サイトのヘッダーと同じ並び：ロゴの右に「テゲバのスタッツ」「非公式サポーターサイト」の2行
    h('div', { display: 'flex', alignItems: 'center', gap: 22 },
      img(logoUri(), 286, 64),
      h('div', { display: 'flex', flexDirection: 'column', lineHeight: 1.35 },
        h('div', { display: 'flex', fontSize: 27, fontWeight: 700, color: '#6B6066' }, SITE.tagline),
        h('div', { display: 'flex', fontSize: 20, fontWeight: 700, color: C.muted }, '非公式サポーターサイト'))),
    h('div', { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: 22, color: C.muted, lineHeight: 1.4 },
      h('div', { display: 'flex', fontWeight: 700, color: C.fg, fontSize: 28 }, `${item.upto ? `第${item.upto}節まで` : `${asOf}時点`}`),
      ...creditOf(item).map(t => h('div', { display: 'flex' }, t))));
  return h('div', { width: W, height: H, display: 'flex', flexDirection: 'column', backgroundColor: C.bg, fontFamily: 'NotoSansJP', position: 'relative' },
    // 右上の大きな丸（ページのカードと同じ飾り）とアイコン
    h('div', { display: 'flex', position: 'absolute', right: -120, top: -120, width: 440, height: 440, borderRadius: 220, backgroundColor: '#FBE0E7' }),
    h('div', { display: 'flex', position: 'absolute', right: PAD, top: PAD, width: 150, height: 150, borderRadius: 75, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }, img(iconUri(item.icon, C.ink), 90, 90)),
    body, foot);
}

export async function renderSharePng(item) {
  const svg = await satori(shareTree(item), { width: W, height: H, fonts: loadFonts() });
  return new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng();
}

/** 画像のファイル名（/share/t-〇〇.png・/share/r-〇〇.png） */
export const shareImgPath = item => `share/${item.kind}-${item.id}.png`;

/** 画像でポストするときの短い文（見出し1行＋ハッシュタグ）。中身は画像にあるので、自分のコメントを書く余白を残す */
export function shortPost(item) {
  if (item.kind !== 'r') return `${item.headline.split('\n')[0]}\n${SITE.hashtags}`;
  // ランキング：1位が3人（組）以上のときは「〇〇ほか〇人（組）」にまとめる
  const firsts = (item.top5 || item.top || []).filter(r => r.rank === 1);
  const all = String(item.big || '').split('・');
  const n = Math.max(firsts.length, all.length);
  const who = n > 2 ? `${all[0]}ほか${n - 1}${all[0].includes('＆') ? '組' : '人'}` : all.join('・');
  return `${item.label} 1位は${who}！\n${SITE.hashtags}`;
}
