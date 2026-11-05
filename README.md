# テゲスタ！ テゲバのスタッツ

テゲバジャーロ宮崎（J2 2026/27）の公開データから作った、テゲサポのための**非公式サポーターサイト**です。クラブ・Jリーグとは関係ありません。広告・収益化はしていません。

- 公開先：https://tegestats.com/（GitHub Pages・独自ドメイン。リポジトリは roastia/tegevajaro-stats）
- 作り：Astro（静的サイト）＋ GitHub Pages
- 出典：Jリーグ公式サイト／Football LAB（©DataStadium Inc.）／各メディア

## 使い方

```sh
npm ci          # 部品を入れる（Node 22 以上）
npm test        # 数字の検算
npm run dev     # 手元で確認（http://localhost:4321/）
npm run build   # dist/ に出力（ポスト用画像も生成）
npm run preview # ビルド結果を確認（CSP もここで効く）
```

更新手順や守るルールは [CLAUDE.md](CLAUDE.md) を参照。

## ライセンス
- フォント：Noto Sans JP（SIL Open Font License 1.1、`src/assets/fonts/OFL.txt`）
- 試合・選手のデータの権利は各出典元にあります。
