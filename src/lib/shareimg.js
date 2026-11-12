// 「画像でポスト」用の画像（1080×1440・縦長 3:4。X のスマホのタイムラインで切れずに出るいちばん縦長の形）をビルド時に作る。注目トピック・ランキングの1件ずつ
// 中身はページのポスト用カードと同じ（見出し・大きな数字・補足・応援）。画像だけ広まっても出どころがわかるよう、
// 下の帯に「テゲスタ！ テゲバのスタッツ・非公式サポーターサイト・時点・データ元」を入れる。写真・エンブレムは使わない
import fs from 'node:fs';
import path from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { SITE } from '../config/site.js';
import { ICONS } from './meta.js';

const W = 1080, H = 1440, PAD = 72;
const C = { bg: '#FFF1F4', ink: '#C23F63', fg: '#3A3236', muted: '#7A6E73', line: '#F3D3DC', brand: '#F16682', gold: '#F5C451' };
const FONT_DIR = path.resolve(process.cwd(), 'src/assets/fonts');
let fonts;
// 字体（画像だけで使う。どれも SIL Open Font License）
//   日本語：Noto Sans JP（Black。小さな文字は Bold）／数字：Anton（太く細長い、スポーツの見出しのような数字）
//   英字ラベル（RANKING・TOPIC）：Saira Semi Condensed Black
const ff = n => fs.readFileSync(path.join(FONT_DIR, n));
const loadFonts = () => fonts ||= [
  { name: 'Jp', data: ff('NotoSansJP-Bold.subset.ttf'), weight: 700, style: 'normal' },
  { name: 'Jp', data: ff('NotoSansJP-Black.subset.ttf'), weight: 900, style: 'normal' },
  { name: 'Num', data: ff('Anton-Regular.ttf'), weight: 900, style: 'normal' },
  { name: 'SairaLabel', data: ff('SairaSemiCondensed-Black.ttf'), weight: 900, style: 'normal' },
];
// 数字の入る文字：数字・英字は Anton、日本語は Noto Sans JP（字ごとに足りない方へ回る）
const NUM = 'Num, Jp';
// 大きな数字の文字の大きさ：Anton の数字・英字は細いので 0.53 字ぶん、日本語は 1 字ぶんで数え、1行に収める
// 数字を目立たせる：数字（と % ・ , . + など）は大きく、単位や漢字（勝・分・本・人など）は小さく。下の線でそろえる
const UNIT = .5;   // 単位の大きさ（数字に対して）
const NUM_RE = /([+＋−-]?\d[\d,.]*%?)/;
const numParts = t => String(t).split(NUM_RE).filter(Boolean).map(p => ({ t: p, num: NUM_RE.test(p) && /\d/.test(p) }));
// 「90分あたり5.1本」のような「〜あたり」の前は、条件なので小さいまま
const numEl = (text, size, color, unitColor = color) => {
  const m = String(text).match(/^(.*あたり)(.+)$/);
  const pre = m ? [{ t: m[1], num: false }] : [];
  const parts = [...pre, ...numParts(m ? m[2] : text)];
  return h('div', { display: 'flex', alignItems: 'baseline', whiteSpace: 'nowrap', fontFamily: NUM, fontWeight: 900, color, lineHeight: 1 },
    ...parts.map(p => h('div', { display: 'flex', fontSize: p.num ? size : Math.round(size * UNIT), color: p.num ? color : unitColor, marginLeft: p.num ? 0 : 2 }, p.t)));
};
// 大きな数字の文字の大きさ：数字は 0.53 字ぶん、単位（日本語）は UNIT 字ぶんで数え、1行に収める
const numWidth = t => numParts(t).reduce((a, p) => a + [...p.t].reduce((b, c) => b + (p.num ? .53 : (c.codePointAt(0) > 0xff ? 1 : .53) * UNIT), 0), 0);
const bigSize = (s, width, max, min) => Math.max(min, Math.min(max, Math.floor(width * .94 / Math.max(1, numWidth(s)))));
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
const nameEl = (name, size, color, weight = 900) => h('div', { display: 'flex', alignItems: 'baseline', fontSize: size, fontWeight: weight, color },
  ...String(name).split('＆').flatMap((p, i) => [i > 0 && h('div', { display: 'flex', fontSize: Math.round(size * .7), fontWeight: 700, color: C.muted, margin: '0 6px' }, '＆'), h('div', { display: 'flex' }, p)]));
// 文を「、。！？／・空白」のあとで区切り（「テゲスタ！」の！では区切らない）、区切りごとに折り返す（単語の途中で改行しにくくする）
const chunks = text => String(text).split(/(?<=[、。／・]|(?<!テゲスタ)[！？])/).filter(Boolean);
// いちばん長い区切りが1行に収まるよう、文字の大きさを上限で抑える（区切りの途中で折り返さないように）
const fitChunks = (text, size, min, width = W - PAD * 2) => Math.max(min, Math.min(size, Math.floor(width * .95 / Math.max(1, ...chunks(text).map(len)))));
const wrapEl = (text, size, color, weight = 700) => h('div', { display: 'flex', flexWrap: 'wrap', fontSize: size, fontWeight: weight, color, lineHeight: 1.4 },
  ...chunks(text).map(p => h('div', { display: 'flex' }, p)));

/* ---------- デザイン：背景はユニフォームの布の画像。数字は白ふちの黒で大きく ---------- */
const P = { base: '#EFA9B8', panel: '#F8D0D8', deep: '#D2405F', dark: '#2E2629', patch: '#D9536F', stitch: '#FFF4F6', yellow: '#F2C14E' };
// 背景：もらった布の画像（1080×1440。襟・丸いワッペン・筆の帯・網点・当て布・縫い目が描いてある）
let bg;
const bgUri = () => bg ||= 'data:image/jpeg;base64,' + fs.readFileSync(path.resolve(process.cwd(), 'src/assets/share/bg.jpg')).toString('base64');
// 背景の丸いワッペンの中心と大きさ（アイコンをここに置く）
const BADGE = { x: 915, y: 154, size: 96 };
// 白いふち（文字のまわりを白で縁取る）＋右下の影
const outline = (w, shadow = 'rgba(120,20,45,.35)') => {
  const s = [];
  for (let a = 0; a < 16; a++) s.push(`${(Math.cos(a / 8 * Math.PI) * w).toFixed(1)}px ${(Math.sin(a / 8 * Math.PI) * w).toFixed(1)}px 0 #FFFFFF`);
  s.push(`${w + 4}px ${w + 6}px 0 ${shadow}`);
  return s.join(', ');
};
// 下に引く黄色の筆の線
const underline = w => svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="26" viewBox="0 0 ${w} 26"><path d="M6 15 C ${w * .3} 6, ${w * .6} 20, ${w - 8} 10" stroke="${P.yellow}" stroke-width="11" fill="none" stroke-linecap="round"/></svg>`);
// 応援のひとことの最後の文字の右上に付ける「ぱっ」（文字のほうから外へ広がる向き）
const burst = svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="90" height="90" viewBox="0 0 90 90"><g transform="translate(90 0) scale(-1 1)" stroke="${P.yellow}" stroke-width="9" stroke-linecap="round"><line x1="12" y1="52" x2="42" y2="44"/><line x1="18" y1="22" x2="44" y2="36"/><line x1="44" y1="6" x2="54" y2="30"/></g></svg>`);

// 大きな数字（白ふちの黒い数字＋白ふちのピンクの単位）
const heroNum = (text, size) => {
  const m = String(text).match(/^(.*あたり)(.+)$/);
  const parts = [...(m ? [{ t: m[1], num: false }] : []), ...numParts(m ? m[2] : text)];
  return h('div', { display: 'flex', alignItems: 'baseline', whiteSpace: 'nowrap', fontWeight: 900, lineHeight: 1 },
    ...parts.map(p => h('div', { display: 'flex', fontFamily: p.num ? 'Num' : 'Jp', fontSize: p.num ? size : Math.round(size * UNIT * .82),
      color: p.num ? P.dark : P.deep, textShadow: outline(p.num ? Math.max(6, size / 26) : 5), marginLeft: p.num ? 0 : 10 }, p.t)));
};

function topicBody(item) {
  const big = String(item.big || '');
  return [
    h('div', { display: 'flex', marginTop: 22, paddingRight: 190 }, wrapEl(item.headline, fitChunks(item.headline, fit(item.headline, 1500, 72, 48), 38, W - PAD * 2 - 190), P.dark, 900)),
    h('div', { display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 10 }, heroNum(big, bigSize(big, W - PAD * 2 - 40, 440, 120))),
    item.sub && h('div', { display: 'flex', flexDirection: 'column', alignItems: 'center', alignSelf: 'center', marginTop: 4 },
      // 背景の筆の線にかかっても読めるよう、白いふちを付ける
      h('div', { display: 'flex', justifyContent: 'center', textAlign: 'center', textShadow: outline(4, 'rgba(0,0,0,0)') }, wrapEl(item.sub, fitChunks(item.sub, fit(item.sub, 2600, 46, 32), 28), P.dark, 900)),
      img(underline(Math.min(W - PAD * 2, Math.round(len(item.sub) * 30))), Math.min(W - PAD * 2, Math.round(len(item.sub) * 30)), 26, { marginTop: -4 })),
  ];
}

// ランキング：1位はいつも主役。人数や数字のあり・なしに関係なく、帯の上に白ふちの大きな名前と数字で出す。
// 2位から下は、縫い目つきの白い当て布に並べる
function rankBody(item) {
  const rows = (item.top5 || item.top || []).slice(0, 5);
  const firsts = rows.filter(r => r.rank === 1);
  const rest = rows.filter(r => r.rank !== 1);
  const n = firsts.length;
  // 1位の数字：全員同じなら1つだけ大きく
  const shared = firsts.every(r => r.display === firsts[0].display) ? firsts[0].display : '';
  // 下に2位以下が多いときは、1位を少しだけ小さくして、ぜんぶ収める
  const tight = rest.length >= 3 ? .86 : 1;
  const nameMax = Math.round((n === 1 ? (shared ? 104 : 124) : n === 2 ? 84 : n === 3 ? 68 : 58) * tight);
  const nameW = W - PAD * 2 - 40;
  const badge = (size) => h('div', { display: 'flex', width: size, height: size, borderRadius: size, flex: 'none', backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center',
    fontFamily: 'Num', fontSize: Math.round(size * .66), fontWeight: 900, color: P.dark, paddingTop: 2, boxShadow: '0 0 0 6px #FFFFFF, 6px 8px 0 6px rgba(120,20,45,.3)' }, '1');
  const out = [
    h('div', { display: 'flex', marginTop: 22, paddingRight: 190 }, wrapEl(`${item.label} 1位は…`, fitChunks(`${item.label} 1位は…`, 68, 40, W - PAD * 2 - 190), P.dark, 900)),
    h('div', { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: rest.length ? 'none' : 1, marginTop: 12, gap: n >= 4 ? 2 : 8 },
      // 「1」の丸（1人のときは名前の上に大きく、何人かのときは「1位タイ」の札）
      n === 1
        ? badge(Math.round(96 * tight))
        : h('div', { display: 'flex', alignItems: 'center', gap: 14 }, badge(72),
            h('div', { display: 'flex', fontFamily: 'Jp', fontWeight: 900, fontSize: 44, color: '#FFFFFF', backgroundColor: P.dark, padding: '4px 20px' }, `${n}${item.big?.includes('＆') || firsts[0]?.name.includes('＆') ? '組' : '人'}が1位タイ！`)),
      ...firsts.map(r => h('div', { display: 'flex', alignItems: 'baseline', gap: 18 },
        h('div', { display: 'flex', textShadow: outline(n === 1 ? 7 : 5) }, nameEl(r.name, fit(r.name, shared ? nameW : nameW - 220, nameMax, 40), P.dark)),
        !shared && r.display && numEl(r.display, Math.round(nameMax * .9), P.deep, P.deep))),
      shared && h('div', { display: 'flex', marginTop: n === 1 ? 4 : 10 }, heroNum(shared, bigSize(shared, W - PAD * 2 - 60, Math.round((n === 1 ? 250 : 180) * tight), 90)))),
  ];
  if (rest.length) {
    const rowH = rest.length >= 4 ? 56 : 66;
    out.push(h('div', { display: 'flex', flexDirection: 'column', marginTop: 'auto', padding: '10px 26px', backgroundColor: 'rgba(255,248,250,.93)', border: `3px dashed ${P.deep}`, borderRadius: 18 },
      ...rest.map((r, i) => {
        const vSize = 46;
        const vW = r.display ? Math.ceil(numWidth(r.display) * vSize) + 10 : 0;
        return h('div', { display: 'flex', alignItems: 'center', gap: 18, height: rowH, borderTop: i ? '2px dotted #E7A9B7' : 'none' },
          h('div', { display: 'flex', width: 46, height: 46, borderRadius: 46, flex: 'none', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FBE0E7', fontFamily: 'Num', fontSize: 34, fontWeight: 900, color: P.dark, paddingTop: 2 }, String(r.rank)),
          h('div', { display: 'flex', flex: 1, minWidth: 0 }, nameEl(r.name, fit(r.name, W - PAD * 2 - 130 - vW, 40, 26), P.dark)),
          r.display && h('div', { display: 'flex', flex: 'none' }, numEl(r.display, vSize, P.dark, '#8A6B74')));
      })));
  }
  return out;
}

export function shareTree(item, asOf = SITE.roundLabel) {
  const isRank = item.kind === 'r';
  const tag = isRank ? 'RANKING' : 'TOPIC';
  const body = h('div', { display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', padding: `${PAD}px ${PAD}px 0`, position: 'relative' },
    h('div', { display: 'flex', alignItems: 'center', gap: 16, paddingRight: 220, marginTop: 20 },
      h('div', { display: 'flex', fontFamily: 'SairaLabel', fontWeight: 900, fontSize: 40, letterSpacing: 3, color: '#FFFFFF', backgroundColor: P.deep, padding: '2px 18px 0', lineHeight: 1.2 }, tag),
      img(iconUri(item.icon, P.deep), 44, 44),
      h('div', { display: 'flex', fontSize: 38, color: P.deep, fontWeight: 900 }, item.label)),
    ...(isRank ? rankBody(item) : topicBody(item)),
    item.cheer && h('div', { display: 'flex', flex: 'none', alignItems: 'center', justifyContent: 'center', marginTop: isRank ? 22 : 'auto', paddingTop: 16, marginBottom: 46 },
      h('div', { display: 'flex', textShadow: outline(4, 'rgba(0,0,0,0)') }, wrapEl(item.cheer, Math.min(isRank ? fit(item.cheer, W - PAD * 2 - 90, 56, 34) : fitChunks(item.cheer, fit(item.cheer, 1500, 66, 40), 34), Math.floor((W - PAD * 2 - 100) * .95 / Math.max(1, ...chunks(item.cheer).map(len)))), P.deep, 900)),
      img(burst, 60, 60, { alignSelf: 'flex-start', marginLeft: -22, marginTop: -22 })),
  );
  const foot = h('div', { display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 150, padding: `0 ${PAD}px`, backgroundColor: '#FFFFFF', position: 'relative' },
    h('div', { display: 'flex', alignItems: 'center', gap: 22 },
      img(logoUri(), 286, 64),
      h('div', { display: 'flex', flexDirection: 'column', lineHeight: 1.35 },
        h('div', { display: 'flex', fontSize: 27, fontWeight: 900, color: '#6B6066' }, SITE.tagline),
        h('div', { display: 'flex', fontSize: 20, fontWeight: 700, color: C.muted }, '非公式サポーターサイト'))),
    h('div', { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: 22, fontWeight: 700, color: C.muted, lineHeight: 1.4 },
      h('div', { display: 'flex', fontWeight: 900, color: C.fg, fontSize: 28 }, `${item.upto ? `第${item.upto}節まで` : `${asOf}時点`}`),
      ...creditOf(item).map(t => h('div', { display: 'flex' }, t))));
  return h('div', { width: W, height: H, display: 'flex', flexDirection: 'column', fontFamily: 'Jp', fontWeight: 700, position: 'relative', backgroundColor: P.base },
    img(bgUri(), W, H, { position: 'absolute', left: 0, top: 0 }),
    // 背景の右上の丸いワッペンの中にアイコン
    img(iconUri(item.icon, P.deep), BADGE.size, BADGE.size, { position: 'absolute', left: BADGE.x - BADGE.size / 2, top: BADGE.y - BADGE.size / 2 }),
    body, foot);
}

export async function renderShareJpg(item) {
  const svg = await satori(shareTree(item), { width: W, height: H, fonts: loadFonts() });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng();
  // 布の写真の質感を残したまま軽くするため JPEG にする（sharp は Astro が使っている部品）
  const { default: sharp } = await import('sharp');
  return await sharp(png).jpeg({ quality: 86, mozjpeg: true, chromaSubsampling: '4:4:4' }).toBuffer();
}

/** 画像のファイル名（/share/t-〇〇.jpg・/share/r-〇〇.jpg） */
export const shareImgPath = item => `share/${item.kind}-${item.id}.jpg`;

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
