// リンクのサムネイル画像（1200×630）をビルド時に作る。中身はテゲスタ！のロゴだけ（全ページ共通）。
// Satori で SVG を作り、resvg で PNG にする
import fs from 'node:fs';
import path from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { SITE } from '../config/site.js';

const FONT_DIR = path.resolve(process.cwd(), 'src/assets/fonts');
let fonts;
const loadFonts = () => fonts ||= [
  { name: 'NotoSansJP', data: fs.readFileSync(path.join(FONT_DIR, 'NotoSansJP-Regular.subset.ttf')), weight: 400, style: 'normal' },
  { name: 'NotoSansJP', data: fs.readFileSync(path.join(FONT_DIR, 'NotoSansJP-Bold.subset.ttf')), weight: 700, style: 'normal' },
];

const h = (type, style, ...children) => ({ type, props: { style, children: children.flat().filter(c => c !== null && c !== undefined && c !== false && c !== '') } });
// サイトのロゴ（そのままの色）
const logoSrc = () => 'data:image/svg+xml;base64,' + Buffer.from(
  fs.readFileSync(path.resolve(process.cwd(), 'public/logo-tegesta.svg'), 'utf8')).toString('base64');

export function logoTree() {
  return h('div', { width: 1200, height: 630, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', fontFamily: 'NotoSansJP' },
    { type: 'img', props: { src: logoSrc(), width: 900, height: 202 } },
    h('div', { display: 'flex', marginTop: 36, fontSize: 34, fontWeight: 700, color: '#7A6E73', letterSpacing: 4 }, `${SITE.tagline}（非公式サポーターサイト）`));
}

export async function renderLogoPng() {
  const svg = await satori(logoTree(), { width: 1200, height: 630, fonts: loadFonts() });
  return new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
}
