// 応援のひとこと（ランキング・注目トピックの見出しの下の1行）を、1日ごとに切りかえる。
// 文は src/data/cheers.csv（kind：r＝ランキング・t＝注目トピック、id、text）。1件につき10個ほど。タイトルは変えない（称号として使うため）
// 同じ日なら、ページ・ポスト文・「画像でポスト」の画像のどれも同じ文（ビルドは毎日 0:05〔日本時間〕に走るので、その日の文になる）
// 日本時間の日付で順に回す。id ごとに始まりをずらして、同じ日に全部が「1番目」にならないようにする。CSV にない id は今の文のまま
import fs from 'node:fs';
import path from 'node:path';

let lists;
const load = () => lists ||= (() => {
  const m = new Map();
  const text = fs.readFileSync(path.resolve(process.cwd(), 'src/data/cheers.csv'), 'utf8').replace(/\r/g, '').trim();
  for (const line of text.split('\n').slice(1)) {
    const [kind, id, ...rest] = line.split(',');
    const key = `${kind}:${id}`;
    if (!m.has(key)) m.set(key, []);
    m.get(key).push(rest.join(','));
  }
  return m;
})();
/** 日本時間で何日目か */
export const dayNo = (now = new Date()) => Math.floor((now.getTime() + 9 * 3600e3) / 86400e3);
const offset = s => [...s].reduce((h, c) => (h * 31 + c.codePointAt(0)) >>> 0, 7);
/** その日のひとこと（kind：'r' か 't'）。CSV になければ fallback */
export function cheerOf(kind, id, fallback = '', now = new Date()) {
  const list = load().get(`${kind}:${id}`);
  if (!list?.length) return fallback;
  return list[(dayNo(now) + offset(id)) % list.length];
}
/** 検算用：全部のひとこと */
export const allCheers = () => [...load()].flatMap(([key, list]) => list.map(text => ({ key, text })));
