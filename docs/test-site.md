# テスト用サイト（公開前の確認）

新しい機能を本番（tegestats.com）に出す前に、**https://tegesta-test.pages.dev** で動きを確かめる。

- 本番と同じページを、テスト用の設定で作る（`npm run build:test` → `dist-test/`）。
- ページの上に「テスト用サイトです」の帯が出る。検索には出さない（全ページ noindex・robots.txt で全部お断り）。アクセス解析も数えない。
- 声・予想・いいね！・おすすめの送り先は、テスト用の Worker（`tegesta-spots-test`）とデータベース（`tegesta-spots-test`）。**本番のデータには入らない。**
- テゲスキ！にまだ声がないあいだは、見本のレス（`src/data/suki-sample.json`）を並べる（本番には出ない）。
- Turnstile は Cloudflare のテスト用キー（いつも通る）を使う。
- テスト用サイトは git push しなくても出せる（Mac から直接 Cloudflare Pages に送る）。

## はじめの1回だけ（Mac のターミナル）

```sh
cd ~/Documents/tegevajaro-stats/worker
# 1. テスト用のデータベースを作る → 出てきた database_id を wrangler.toml の [env.test] の「ここに貼る」に貼る
npx wrangler@4.150.0 d1 create tegesta-spots-test
# 2. 表を作る
npx wrangler@4.150.0 d1 execute tegesta-spots-test --remote --file schema.sql
# 3. テスト用 Worker を出す
npx wrangler@4.150.0 deploy --env test
# 4. 秘密の値（Turnstile はテスト用の値・IP_HASH_SECRET は何でもよい長い文字列）
echo 1x0000000000000000000000000000000AA | npx wrangler@4.150.0 secret put TURNSTILE_SECRET --env test
openssl rand -hex 32 | npx wrangler@4.150.0 secret put IP_HASH_SECRET --env test
# 5. テスト用サイトの置き場所を作る
npx wrangler@4.150.0 pages project create tegesta-test --production-branch main
```

5 で名前が使えないと言われたら、別の名前にして、`package.json` の deploy:test と wrangler.toml の ALLOWED_ORIGIN、`src/config/site.js` を合わせて変える。

## 確かめたいとき（毎回）

```sh
cd ~/Documents/tegevajaro-stats && npm run deploy:test
```

Worker を変えたときは、先に `cd worker && npx wrangler@4.150.0 deploy --env test`。

## 本番に出す

テストで問題がなければ、いつもどおり本番の Worker を deploy して git push。
