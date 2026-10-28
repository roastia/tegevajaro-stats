// ビルド後の HTML の日本語に、文節の切れ目（BudouX）で <wbr> を入れる。
// CSS の word-break: keep-all と組み合わせて、「続/く」のような変な位置で改行しないようにする。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDefaultJapaneseParser } from 'budoux';

const parser = loadDefaultJapaneseParser();
const JP = /[぀-ヿ㐀-鿿！-｠]/;
const SKIP = /^(script|style|title|textarea|pre|code|svg)$/i;
const dec = s => s.replace(/&(amp|lt|gt|quot|#39|#x27);/g, (m, e) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", '#x27': "'" }[e]));
const enc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function addPhraseBreaks(html) {
  let out = '', i = 0;
  const skip = [];
  const re = /<(\/?)([a-zA-Z][\w-]*)([^>]*)>|<!--[\s\S]*?-->|<!doctype[^>]*>/gi;
  let m;
  while ((m = re.exec(html))) {
    const text = html.slice(i, m.index);
    out += skip.length || !JP.test(text) ? text : enc(parser.parse(dec(text)).join('\u0000')).replace(/\u0000/g, '<wbr>');
    out += m[0];
    i = re.lastIndex;
    if (m[2] && SKIP.test(m[2]) && !m[3].endsWith('/')) { if (m[1]) skip.pop(); else skip.push(m[2]); }
  }
  return out + html.slice(i);
}

export default function phraseBreak() {
  return {
    name: 'phrase-break',
    hooks: {
      'astro:build:done': ({ dir }) => {
        const root = fileURLToPath(dir);
        for (const f of fs.readdirSync(root, { recursive: true }).map(String).filter(f => f.endsWith('.html'))) {
          const p = path.join(root, f);
          fs.writeFileSync(p, addPhraseBreaks(fs.readFileSync(p, 'utf8')));
        }
      },
    },
  };
}
