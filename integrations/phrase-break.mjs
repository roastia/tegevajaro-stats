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

// 文（。！？／ で終わる）ごとに <span class="ss">（inline-block）で包み、文の中は文節の切れ目に <wbr>。
// → 文が行に収まらないときは文ごと次の行へ送られ、「。」の後ろで改行される。
export const splitSentences = t => t.split(/(?<=[。！？!?／])/).filter(Boolean);
// 文の中は「、」「：」で区切った節も同じく箱にする（文 → 節 → 文節 の順に優先して改行）
export const splitClauses = t => t.split(/(?<=[、，：])/).filter(Boolean);
export function breakText(text) {
  const phr = s => enc(parser.parse(s).join('\u0000')).replace(/\u0000/g, '<wbr>');
  const group = (parts, f) => parts.length < 2 ? f(parts[0] ?? '') : parts.map(p => `<span class="ss">${f(p)}</span>`).join('<wbr>');
  return group(splitSentences(text), s => group(splitClauses(s), phr));
}

export function addPhraseBreaks(html) {
  let out = '', i = 0;
  const skip = [];
  const re = /<(\/?)([a-zA-Z][\w-]*)([^>]*)>|<!--[\s\S]*?-->|<!doctype[^>]*>/gi;
  let m;
  while ((m = re.exec(html))) {
    const text = html.slice(i, m.index);
    out += skip.length || !JP.test(text) ? text : breakText(dec(text));
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
