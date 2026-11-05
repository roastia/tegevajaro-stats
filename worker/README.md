# おすすめスポットの投稿受付（Cloudflare）— 準備の手順

サイト本体（GitHub Pages）は静的なままです。投稿を受け取る部分だけを Cloudflare の無料枠に置きます。

- **Workers**：投稿を受け取る小さなプログラム（`src/index.js`）
- **D1**：投稿をためておくデータベース（公開しない）
- **Turnstile**：ボット対策（画像を選ばせない、目立たない確認）

このプログラムは投稿を「受け取ってためる」だけです。ためた投稿を外に返す入り口は作っていません。中身を見るときは、Cloudflare にログインした手元の端末から取り出します（下の 6）。

## 1. Cloudflare のアカウントを作る
https://dash.cloudflare.com/sign-up でアカウントを作ります（無料プラン）。

## 2. Turnstile のキーを作る
1. Cloudflare のダッシュボードで「Turnstile」→「ウィジェットを追加」を開く
2. ドメインに `tegestats.com` を入れる（手元で試すなら `localhost` も）
3. ウィジェットのモードは「マネージド」
4. 表示された **サイトキー**（公開してよい）と **シークレットキー**（秘密）を控える

## 3. ログインとデータベースの作成（Mac のターミナル）
```sh
cd worker
npx wrangler@4.150.0 login                      # ブラウザで Cloudflare にログイン
npx wrangler@4.150.0 d1 create tegesta-spots    # 出てきた database_id を wrangler.toml に貼る
npx wrangler@4.150.0 d1 execute tegesta-spots --remote --file schema.sql
```

## 4. 秘密の値を登録する（wrangler.toml には書かない）
```sh
npx wrangler@4.150.0 secret put TURNSTILE_SECRET   # 2 のシークレットキーを貼る
openssl rand -hex 32                               # 出てきた文字列を次で使う
npx wrangler@4.150.0 secret put IP_HASH_SECRET     # 上の文字列を貼る
```

## 5. 公開して、サイトにつなぐ
```sh
npx wrangler@4.150.0 deploy     # https://tegesta-spots.〇〇.workers.dev が出る
```
`src/config/site.js` の `spots` に、次の2つを入れます。
- `api`：`https://tegesta-spots.〇〇.workers.dev/api/spots`
- `turnstileSiteKey`：2 のサイトキー

入れたあとは `npm run build` で確認して、コミット・push します。入れるまでのあいだ、フォームは「準備中」と表示されます。

## 6. たまった投稿を取り出す
```sh
npm run spots:pull     # リポジトリ直下の private/spots-inbox.json に保存（private/ は git に入らない）
```
取り出したら Claude に「おすすめスポットの投稿を整えて載せて」と頼みます。手順は CLAUDE.md の「おすすめスポットの掲載」に書いてあります。

載せた・見送ったのメモをデータベースに残すとき：
```sh
npx wrangler@4.150.0 d1 execute tegesta-spots --remote --command "UPDATE submissions SET status='approved' WHERE id IN (1,2)"
npx wrangler@4.150.0 d1 execute tegesta-spots --remote --command "UPDATE submissions SET status='rejected' WHERE id IN (3)"
```

## 守りのしくみ
- 受け付けるのは `POST /api/spots` だけです。送り元は `ALLOWED_ORIGIN`（サイトのドメイン）に限ります。
- Turnstile の確認に通らない送信は受けません。確認サービスにつながらないときも受けません。
- 連投の対策は3つです。
  - Turnstile の確認を毎回必須にしています。確認の合格証は1回しか使えません。
  - 同じ回線（IP）からの投稿は、1日 `IP_DAILY_LIMIT` 件（初期値10）までです（日本時間）。IP アドレスそのものは保存しません。その日だけ有効な鍵で HMAC-SHA256 にした値（元には戻せない）と件数を2日間だけ置き、毎日自動で消します。
  - 同じ日に、場所の名前とひとことが同じ投稿は受けません。空白・記号・大文字小文字・全角半角のちがいは同じとみなします。比べるための値は2日で消します。
- 上限の件数を変えるときは `wrangler.toml` の `IP_DAILY_LIMIT` を書き換えて deploy し、`src/pages/spots.astro` の説明文の数字もそろえます。
- 中身の点検：
  - 長さの上限（名前60・ひとこと300文字、送信全体4KB）を設けています。エリアの欄は今のフォームにはありません（受け取り側は空でも受け付けます）。
  - URL・見えない文字・制御文字は受けません。
  - X アカウントの形を確認します（英数字と _ の15文字まで）。
  - ボット用のおとり欄を置いています。
- データベースへの書き込みは、値を埋め込まない形（プレースホルダー）で行います。

## 弱いところ（知っておくこと）
- **同じ回線の人が多いと、上限に届くことがあります。** スタジアムの Wi-Fi などで同じ日に10件を超えると、その回線からはその日投稿できなくなります。
- **回線を変えると、上限はすり抜けられます。** VPN や回線の切り替えで別の IP になるからです。Turnstile を毎回必須にしていることと、載せる前の確認で補っています。
- **X アカウントは本人か確かめられません。** 入力どおりに載せる設定なので、なりすましに気づいたら消してください。

## 料金
Workers・D1・Turnstile とも無料プランで始められます。このサイトの投稿数なら無料枠に収まる見込みですが、上限の数字は変わることがあるので、Cloudflare の料金ページで確かめてください。
