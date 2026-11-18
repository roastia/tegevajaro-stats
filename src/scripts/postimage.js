// 「画像でポスト」の動き（注目トピック・ランキング・スコア予想で共用）
// - スマホ・タブレット（指で操作する端末）：押したらまずリンクを止め、画像つきの共有メニューを開く。
//   共有メニューで画像を渡せない端末だけ、リンクどおり X の投稿画面（文だけ）へ。
// - PC：画像をダウンロードし、リンクはそのまま X の投稿画面（文入り）を開く。
// 押してすぐ共有メニューを開けるよう、画像は preload で先に読んでおける（同じ画像は1回だけ読む）
export const touch = matchMedia('(pointer: coarse)').matches;

const files = new Map();
export const imageFile = (src, name) => {
  if (!files.has(src)) files.set(src, fetch(src).then(r => (r.ok ? r.blob() : Promise.reject(r.status))).then(b => new File([b], name || src.split('/').pop().split('?')[0], { type: 'image/jpeg' })));
  return files.get(src);
};
export const preload = (src, name) => { imageFile(src, name).catch(() => {}); };

/** a：ボタン（href は X の投稿画面）。img：画像の URL。text：共有メニューに渡す文 */
export async function postImage(e, a, { img, name, text }) {
  if (touch) {
    e.preventDefault();   // 先にリンクを止める（止めないと X の投稿画面が先に開いてしまう）
    try {
      const file = await imageFile(img, name);
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share({ files: [file], text });
        return;
      }
    } catch (err) {
      if (err && err.name === 'AbortError') return;   // 共有をやめた
    }
    location.href = a.href;   // 画像を共有できない端末：X の投稿画面（文だけ）
    return;
  }
  // PC：画像をダウンロード（リンクはそのまま X の投稿画面を開く）
  imageFile(img, name).then(file => {
    const d = document.createElement('a');
    d.href = URL.createObjectURL(file); d.download = file.name;
    document.body.append(d); d.click(); d.remove();
    setTimeout(() => URL.revokeObjectURL(d.href), 10000);
  }).catch(() => {});
}
