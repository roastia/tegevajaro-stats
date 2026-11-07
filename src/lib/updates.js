// 更新履歴（src/data/updates.json）のポスト文
import { postText } from './util.js';

const md = s => { const [, m, d] = s.split('-').map(Number); return `${m}/${d}`; };

/** 1日分の更新 → ボタンの名前とポスト文 */
export function updatePost(u) {
  return {
    what: `${md(u.date)}の更新`,
    text: postText(`テゲスタ！を更新しました（${md(u.date)}）`, u.items.map(i => i.text).join('／'), ''),
  };
}
