// ポスト用画像（1200×630）をビルド時に作る。Satori で SVG を作り、resvg で PNG にする
import fs from 'node:fs';
import path from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { ICONS } from './meta.js';
import { loadDefaultJapaneseParser } from 'budoux';
import { SITE } from '../config/site.js';

const FONT_DIR = path.resolve(process.cwd(), 'src/assets/fonts');
let fonts;
const loadFonts = () => fonts ||= [
  { name: 'NotoSansJP', data: fs.readFileSync(path.join(FONT_DIR, 'NotoSansJP-Regular.subset.ttf')), weight: 400, style: 'normal' },
  { name: 'NotoSansJP', data: fs.readFileSync(path.join(FONT_DIR, 'NotoSansJP-Bold.subset.ttf')), weight: 700, style: 'normal' },
];

const h = (type, style, ...children) => ({ type, props: { style, children: children.flat().filter(c => c !== null && c !== undefined && c !== false && c !== '') } });
// サイトのロゴ（白）。ポスト用画像の背景はピンクなので白で載せる
let logoSrc;
const loadLogo = () => logoSrc ||= 'data:image/svg+xml;base64,' + Buffer.from(
  fs.readFileSync(path.resolve(process.cwd(), 'public/logo-tegesta.svg'), 'utf8').replace(/fill="#[0-9A-Fa-f]{6}"/, 'fill="#ffffff"')).toString('base64');
const iconSrc = name => 'data:image/svg+xml;base64,' + Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ICONS.sparkle}</svg>`).toString('base64');

/** 文字数に合わせて大きな数字のサイズを決める */
const bigSize = s => { const n = [...String(s)].reduce((a, c) => a + (c.codePointAt(0) > 0xff ? 2 : 1), 0); return n <= 6 ? 140 : n <= 10 ? 112 : n <= 16 ? 84 : 60; };

// 文節ごとの塊にして並べ、塊の途中では改行しない（BudouX）
const budoux = loadDefaultJapaneseParser();
const phrases = (t, style = {}) => budoux.parse(String(t)).map(p => ({ type: 'span', props: { style: { ...style }, children: p } }));
// 文（。！？／ で終わる）ごとの箱に入れ、収まらない文は箱ごと次の行へ
const sentences = t => String(t).split(/(?<=[。！？!?／])/).filter(Boolean);
const clauses = t => String(t).split(/(?<=[、，：])/).filter(Boolean);
const box = children => ({ type: 'div', props: { style: { display: 'flex', flexWrap: 'wrap', maxWidth: '100%' }, children } });
// 文 → 節（、）→ 文節 の順に、収まらない塊を次の行へ送る
const group = (parts, f) => parts.length < 2 ? f(parts[0] ?? '') : parts.map(p => box(f(p)));
const para = (style, text) => ({ type: 'div', props: { style: { display: 'flex', flexWrap: 'wrap', ...style },
  children: group(sentences(text), s => group(clauses(s), phrases)) } });
const cut = (t, n) => { const a = [...String(t)]; return a.length > n ? a.slice(0, n - 1).join('') + '…' : a.join(''); };

export function ogTree(item) {
  const kicker = item.kind === 'r' ? `ランキング｜${item.label}` : item.label;
  const headline = item.kind === 'r' ? `${item.label} 1位` : item.headline;
  const extra = item.top && item.top.length > 1 ? item.top.slice(1).map(t => `${t.rank}位 ${t.name}`).join('　') : '';
  return h('div', { width: 1200, height: 630, display: 'flex', flexDirection: 'column', color: '#fff', fontFamily: 'NotoSansJP',
      backgroundImage: 'linear-gradient(150deg, #7A1F45 0%, #C8375F 55%, #F16682 100%)', position: 'relative' },
    h('div', { position: 'absolute', left: 900, top: -140, width: 440, height: 440, borderRadius: 9999, background: 'rgba(255,255,255,0.08)', display: 'flex' }),
    h('div', { position: 'absolute', left: 1024, top: 44, width: 116, height: 116, borderRadius: 9999, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
      { type: 'img', props: { src: iconSrc(item.icon), width: 68, height: 68 } }),
    h('div', { position: 'absolute', left: 60, top: 48, width: 920, display: 'flex', flexDirection: 'column' },
      h('div', { display: 'flex', fontSize: 28, opacity: 0.92, letterSpacing: 2 }, kicker),
      para({ fontSize: 44, fontWeight: 700, lineHeight: 1.3, marginTop: 8 }, cut(headline, 44))),
    h('div', { position: 'absolute', left: 60, bottom: 76, width: 1080, display: 'flex', flexDirection: 'column' },
      h('div', { display: 'flex', fontSize: bigSize(item.big), fontWeight: 700, color: '#FFF4C2', lineHeight: 1.05 }, cut(item.big, 18)),
      item.sub ? para({ fontSize: 26, opacity: 0.95, marginTop: 10, lineHeight: 1.4 }, cut(item.sub, 52)) : null,
      extra ? para({ fontSize: 24, opacity: 0.9, marginTop: 4 }, cut(extra, 50)) : null,
      item.cheer ? para({ fontSize: 30, fontWeight: 700, marginTop: 8 }, cut(item.cheer, 34)) : null),
    h('div', { position: 'absolute', left: 60, top: 572, width: 1080, display: 'flex', justifyContent: 'space-between', fontSize: 20, color: 'rgba(255,255,255,0.8)', borderTop: '2px solid rgba(255,255,255,0.25)', paddingTop: 10 },
      h('div', { display: 'flex', alignItems: 'center' }, { type: 'img', props: { src: loadLogo(), width: 116, height: 26 } }, h('span', { marginLeft: 8 }, '（非公式サポーターサイト）')), h('span', {}, `${SITE.roundLabel}時点`)),
  );
}

export async function renderPng(item) {
  const svg = await satori(ogTree(item), { width: 1200, height: 630, fonts: loadFonts() });
  return new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
}
