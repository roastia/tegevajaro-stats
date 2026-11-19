# テスト用サイト（公開前の確認）

新しい機能を本番（tegestats.com）に出す前に、**https://test-tegesta.pages.dev** で、サイト全体の動きを確かめる。

## しくみ
- 本番と同じ全ページを、テスト用の設定で作る（`npm run build:test` → `dist-test/`。`SITE.test` が true）。
- **入るには ID とパスワードが要る**（Basic 認証。`test-site/functions/_middleware.js`）。ID は `tegesta`、パスワードは Cloudflare Pages の秘密の値 `TEST_SITE_PASSWORD`。URL を知っているだけでは見られない。
- ページの上に「テスト用サイトです」の帯。検索には出さない（全ページ noindex・X-Robots-Tag・robots.txt で全部お断り）。アクセス解析も数えない。
- 投稿・予想・いいね！・ハート・掲載をやめる依頼など、**送る部分はすべてテスト用**に送る。本番のデータには入らない。

| | 本番 | テスト用 |
|---|---|---|
| サイト | tegestats.com（GitHub Pages） | test-tegesta.pages.dev（Cloudflare Pages・パスワードつき） |
| Worker | tegesta-spots | **test-tegesta-api** |
| データベース（D1） | tegesta-spots | **test-tegesta-db** |
| Turnstile | 本番のキー | Cloudflare のテスト用キー（いつも通る） |

- テゲスキ！にまだ声がないあいだは、見本のレス（`src/data/suki-sample.json`）を並べる（本番には出ない）。
- テスト用サイトは git push しなくても出せる（Mac から直接 Cloudflare Pages に送る）。

## はじめの1回だけ（Mac のターミナル）

```sh
cd ~/Documents/tegevajaro-stats/worker
# 1. テスト用のデータベースを作る → 出てきた database_id を wrangler.toml の [env.test] の「ここに貼る」に貼る
npx wrangler@4.150.0 d1 create test-tegesta-db
# 2. 表を作る
npx wrangler@4.150.0 d1 execute test-tegesta-db --remote --file schema.sql
# 3. テスト用 Worker を出し、秘密の値を入れる（Turnstile はテスト用の値・IP_HASH_SECRET は長いランダムな文字列）
npx wrangler@4.150.0 deploy --env test
echo 1x0000000000000000000000000000000AA | npx wrangler@4.150.0 secret put TURNSTILE_SECRET --env test
openssl rand -hex 32 | npx wrangler@4.150.0 secret put IP_HASH_SECRET --env test
# 4. テスト用サイトの置き場所を作り、パスワードを決める（聞かれたら入力。英数字で）
npx wrangler@4.150.0 pages project create test-tegesta --production-branch main
npx wrangler@4.150.0 pages secret put TEST_SITE_PASSWORD --project-name test-tegesta
```

4 で名前が使えないと言われたら、別の名前にして、`package.json` の deploy:test と wrangler.toml の ALLOWED_ORIGIN を合わせて変える。

## 確かめたいとき（毎回）

```sh
cd ~/Documents/tegevajaro-stats && npm run deploy:test
```

Worker を変えたときは、先に `cd worker && npx wrangler@4.150.0 deploy --env test`。
テストで届いたものを見るとき：`npm run test:pull` → `private/test-*.json`（本番の受け箱とは別のファイル）。

## 本番に出す

テストで問題がなければ、いつもどおり本番の Worker を deploy して git push。
