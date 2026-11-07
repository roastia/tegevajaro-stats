# ダッシュボード版の控え（2026-11-07 時点）

Claude のダッシュボード版（https://claude.ai/artifact/9PEyRKrTQfm5tX8m6LVxdo 「テゲスタ！ テゲバのスタッツ」）の中身を、そのまま控えたもの。
ダッシュボード版を作ったチャットを消しても作り直せるように置いている。公開版（Astro）のビルドには使わない。

- `files/` … ダッシュボードのページ（ダッシュボードの `files` に入っている3つ）
  - `index.html` … ページ本体。公開用に縮めた版（`tools/minify_dash.py` の出力）。読みやすい元の版は残っていないので、直すときはこれを直接直す
  - `budoux.js` … 文節で改行するための辞書
  - `fonts.js` … Noto Sans JP を文字の範囲ごとに読み込む
- `store/datasets/` … データセット（どの CSV を読むか・説明・更新日時）。`source.url` の `/_blob/…` は、その時点でダッシュボードにアップロードした CSV（中身は `src/data/` の CSV の第15節時点の版）
- `store/dash/meta.json` … ダッシュボードのタイトル

## 作り直すとき
1. ダッシュボード型（Dashboard）の作品を新しく作る
2. `src/data/` の CSV（matches・appearances・goals・goals_all・lineups・players・profiles・suspension・spots・xg・cbp・pass_pairs）をアップロードし、返ってきた `/_blob/…` を `store/datasets/*.json` の `source.url` に入れて、`datasets` に書き込む
3. `store/dash/meta.json` を `dash/meta` に、`files/` の3つを `files/<名前>`（`{text}`）に書き込む
4. あとは `docs/dashboard.md` の「まとめて最新にする手順」で最新にする
