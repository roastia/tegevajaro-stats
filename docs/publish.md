# 公開URL・検索（SEO）・Football LAB の切り替え

## 公開URLが決まったら
ポストのボタンを押すと X の投稿画面が開き（画像の添付や共有メニューは使わない）、文のあとにテゲスタ！のURL（トピック・ランキング・背景はそれぞれの個別ページ、ほかはトップ）が付く。X ではそのURLにテゲスタ！のロゴのサムネイルが出る。ポスト文は改行を使わず1行（句点・空白でつなぐ）、本文の最後に「（第〇節時点）」（`site.js` の `roundLabel`。ダッシュボード版は試合データの最新の節。チームの顔ぶれ・誕生日のポストには付けない）、最後に `#テゲバジャーロ宮崎 #テゲバ #テゲスタ`。URLはまだ仮（`https://roastia.github.io/tegevajaro-stats`）。決まったら次の3か所をそろえて変える。
1. `src/config/site.js` の `url`
2. `astro.config.mjs` の `site`（ドメイン）と `base`（ドメイン直下なら `/`）
3. ダッシュボード版の `SITE_URL`（`index.html` の中）
変えたら `npm run build` → 個別ページ（`/t/〇〇/`）のサムネイル（`og:image`）とポストのリンクを確認する。

## 検索（SEO）
- ページのタイトルは「ページ名｜テゲバジャーロ宮崎｜テゲスタ！」（トップは「テゲスタ！ テゲバジャーロ宮崎のスタッツ・ランキング（非公式サポーターサイト）」）。説明（description）はページごとに書き、「テゲバジャーロ宮崎」を必ず入れる。新しいページを作ったら `<Base title=… description=…>` を渡す。
- canonical はページ自身の URL（`Base.astro` が自動で決める）。移転用の `/roots/`・`/lineups/` は noindex。
- `sitemap.xml`（`src/pages/sitemap.xml.ts`。新しいページを作ったら一覧に足す）と `robots.txt`（`src/pages/robots.txt.ts`）はビルドで作る。robots.txt はドメインの直下でしか読まれないので、独自ドメインにすると有効になる。
- 構造化データ（JSON-LD）は WebSite と、トップ以外のパンくず。
- 公開したら Google Search Console にサイトを登録し、`sitemap.xml` を送信する。「HTML タグ」で確認するときは `site.js` の `googleSiteVerification` に content の値を入れる（独自ドメインなら DNS の TXT レコードでも確認できる）。

## Football LAB の切り替え
- `src/config/site.js` の `footballLab` を `false` にすると、Football LAB 出典のランキングとフッターの表記が消える。
- 問い合わせの結果「掲載不可」なら、`false` にしたうえで Football LAB 由来の CSV・列も**リポジトリから削除**する（公開リポジトリに置くこと自体が転載になるため）。
