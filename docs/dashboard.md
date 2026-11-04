# ダッシュボード版（Claude のダッシュボード）

- 毎節の更新はしない。頼まれたときに、まとめて最新にする（データセットの CSV・`RANK_PREV`・`FIXTURES` など）。

## まとめて最新にする手順（少ない手数で）
1. 変わった CSV だけを、Artifact の `asset: true` でアップロードする（1ファイル1回。返ってくる `/_blob/…` を控える）。ふつうは matches・appearances・goals・goals_all・lineups・players。警告があれば suspension、名簿が変われば profiles、日程は index.html の `FIXTURES`。
2. ArtifactData の `batch` 1回で、`datasets` の各ドキュメントの `source`（name・url）・`description`（節の範囲）・`updated` を書きかえる（`if_version` は list で見た値）。
3. index.html の `RANK_PREV`（`src/data/rank_history.json` の最新の1つ前の節を、名前を番号にした形）と `SEASON_RANK`（順位）を入れかえる。
4. `python3 tools/minify_dash.py` で縮めて、`files/index.html` に set する。確認はテスト用のページで、今季の成績・記録まであと少し・直近5試合・首位浮上の文字だけを取り出して、公開版と同じかを見る。

## ダッシュボード版（Claude のダッシュボード）の容量
- ページ（`files/index.html`）は 262,144 バイトまで。公開するときはコメント・字下げ・空行をとった版を出す（読みやすい元の index.html はそのまま手元に残し、`python3 tools/minify_dash.py 元 出力先` で作る。約2割小さくなる）。
- 辞書などの大きなデータは別のファイル（`files/budoux.js` など）に分けられる。ただしダッシュボードは別のファイルを**ページのスクリプトより後に読み込むことがある**ので、分けたデータはページの読み込み時にすぐ使わず、使うときに「まだなければ使わない」形にする（`budouxParse` のように）。読み込み順に頼る分け方をすると、ページ全体が止まる。
- 新しい機能はまず公開版（Astro）に入れる。ダッシュボード版は確認用なので、容量が足りないときは載せない機能があってもよい。
