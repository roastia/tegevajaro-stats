// 選手名の検索：漢字・ひらがな・カタカナ・ローマ字のどれで打っても、打つそばから絞り込む
// ビルド時（テスト・名簿の点検）とブラウザの両方で使う

const DIGRAPH = { き: 'ky', ぎ: 'gy', し: 'sh', じ: 'j', ち: 'ch', ぢ: 'j', に: 'ny', ひ: 'hy', び: 'by', ぴ: 'py', み: 'my', り: 'ry' };
const SMALL = { ゃ: 'a', ゅ: 'u', ょ: 'o' };
const BASE = {
  あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o', か: 'ka', き: 'ki', く: 'ku', け: 'ke', こ: 'ko', が: 'ga', ぎ: 'gi', ぐ: 'gu', げ: 'ge', ご: 'go',
  さ: 'sa', し: 'shi', す: 'su', せ: 'se', そ: 'so', ざ: 'za', じ: 'ji', ず: 'zu', ぜ: 'ze', ぞ: 'zo', た: 'ta', ち: 'chi', つ: 'tsu', て: 'te', と: 'to',
  だ: 'da', ぢ: 'ji', づ: 'zu', で: 'de', ど: 'do', な: 'na', に: 'ni', ぬ: 'nu', ね: 'ne', の: 'no', は: 'ha', ひ: 'hi', ふ: 'fu', へ: 'he', ほ: 'ho',
  ば: 'ba', び: 'bi', ぶ: 'bu', べ: 'be', ぼ: 'bo', ぱ: 'pa', ぴ: 'pi', ぷ: 'pu', ぺ: 'pe', ぽ: 'po', ま: 'ma', み: 'mi', む: 'mu', め: 'me', も: 'mo',
  や: 'ya', ゆ: 'yu', よ: 'yo', ら: 'ra', り: 'ri', る: 'ru', れ: 're', ろ: 'ro', わ: 'wa', を: 'o', ん: 'n', ゔ: 'vu',
};

/** カタカナ → ひらがな（全角・半角のゆれもそろえる） */
export const toHiragana = s => String(s || '').normalize('NFKC').replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));

/** ひらがな1語 → ヘボン式ローマ字（長音は省く：しゅう→shu、そういちろう→soichiro、おおくま→okuma。いのうえ→inoue） */
export function wordToRomaji(kana) {
  const k = [...toHiragana(kana)];
  let out = '';
  for (let i = 0; i < k.length; i++) {
    const c = k[i], n = k[i + 1];
    if (c === 'っ') { const nx = wordToRomaji(k.slice(i + 1).join('')); out += nx.startsWith('ch') ? 't' : (nx[0] || ''); continue; }
    if (c === 'ー') continue;
    let r;
    if (SMALL[n] && DIGRAPH[c]) { r = DIGRAPH[c] + SMALL[n]; i++; }
    else r = BASE[c] ?? '';
    // 長音：う・お が前の音の「お段・う段」をのばしているときは省く（後ろに え・お が続く「いのうえ」などは残す）
    const prevV = out.slice(-1);
    if (c === 'う' && (prevV === 'o' || prevV === 'u') && !['え', 'お'].includes(n)) continue;
    if (c === 'お' && prevV === 'o' && out.length > 0) continue;
    if (c === 'ん' && /^[aiueoy]/.test(BASE[n] || '')) r = 'n';
    out += r;
  }
  return out;
}

/** 「もぎ しゅう」→「mogi shu」 */
export const kanaToRomaji = kana => toHiragana(kana).trim().split(/\s+/).map(wordToRomaji).join(' ');

/** ローマ字のゆれ（ヘボン式・訓令式・長音の書き方）を吸収したキー */
export function looseRoma(s) {
  const raw = String(s || '').normalize('NFKC').toLowerCase().replace(/[^a-z]/g, '');
  let t = raw
    .replace(/tch/g, 'tty').replace(/sh/g, 'sy').replace(/ch/g, 'ty').replace(/ts/g, 't').replace(/j/g, 'zy').replace(/f/g, 'h')
    .replace(/m(?=[bmp])/g, 'n').replace(/yy/g, 'y')
    .replace(/syi/g, 'si').replace(/tyi/g, 'ti').replace(/zyi/g, 'zi')
    .replace(/nn/g, 'n').replace(/oh(?![aiueoy])/g, 'o').replace(/o[ou]/g, 'o').replace(/uu/g, 'u');
  return t;
}

/** 1人分の検索キー（漢字・ひらがな・ローマ字。ローマ字は 姓名・名姓 の両方） */
export function nameKeys({ name, kana, romaji }) {
  const kanji = String(name || '').replace(/\s+/g, '');
  const hira = toHiragana(kana).replace(/\s+/g, '');
  const parts = String(romaji || kanaToRomaji(kana)).trim().split(/\s+/).filter(Boolean);
  const roma = parts.length ? [looseRoma(parts.join('')), looseRoma([...parts.slice(1), parts[0]].join(''))] : [];
  return { kanji, hira, roma };
}

/** 打った文字が、その選手に合うか */
export function matchName(keys, query) {
  const q = String(query || '').normalize('NFKC').trim();
  if (!q) return true;
  const qs = q.replace(/\s+/g, '');
  if (keys.kanji.includes(qs)) return true;
  const qh = toHiragana(qs);
  if (keys.hira && keys.hira.includes(qh)) return true;
  if (/^[a-z\s'-]+$/i.test(q)) {
    const ql = looseRoma(q);
    // 打ちかけの「sh」「ch」「j」は、次が i の形（si・ti・zi）とも合わせる
    const alt = /(sh|ch|j)$/i.test(q) ? ql.replace(/y$/, 'i') : '';
    return !!ql && keys.roma.some(r => r.includes(ql) || (!!alt && r.includes(alt)));
  }
  return false;
}
