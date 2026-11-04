# ファイルの構成

## 構成
- `src/data/*.csv` … データ（唯一の元データ）
- `src/lib/calcs.js` … ランキング計算（純粋関数）。ダッシュボード版で検算済みのロジック
- `src/lib/meta.js` … ランキングの定義（タイトル・応援のひとこと・説明・出典）、アイコン、称号キャラ
- `src/lib/data.js` … CSV 読み込み → 計算 → ページへ。`getShareables()` がポストできるもの（トピック・ランキング・背景）
- `src/lib/og.js` … リンクのサムネイル画像（1200×630 PNG、テゲスタ！のロゴ。全ページ共通の `/og/site.png`）を Satori + resvg でビルド時に生成
- `src/pages/` … 注目トピック（/）・ランキング・選手（`players.astro`：上段に選手の背景、下段に選手の称号。前の `/roots/` は `/players/` へ移す）・ハイライト（`goals.astro`：試合ごとのハイライト・ゴール・スタメン図。スタメンの計算は `src/lib/lineups.js`。前の `/lineups/` は `/goals/` へ移す）、個別ページ `/t/` `/r/` `/b/`（ポストに付くリンク先）、サムネイル画像 `/og/site.png`
- `public/logo-tegesta.svg` … サイトのロゴ（テゲスタ！の手描き文字をなぞった SVG）。ヘッダーとポスト用画像（白にして）で使う。`favicon.svg`・`apple-touch-icon.png` はロゴの「テ」
- `src/scripts/site.js` … スクロール位置・誕生日（日本時間の今日から計算）・紙吹雪・カウントアップ
- `src/pages/spots.astro` … メニューの「みやざき情報」（オレンジ色の項目）のページ。上にアプリコットの面の「ようこそみやざきへ！」の手描き文字（`public/welcome-miyazaki.svg`。画像をなぞった SVG）と（あいさつと「おすすめスポットを見る」「おすすめを教える」のボタン）。案内はアイコンつきのタイル（ボタンはピンクの枠つき）。アウェイから来た人向けのあいさつと「アウェイからお越しのみなさんへ」（スタジアム＝Google マップ・アクセス・スタグル・観戦ルール・来場案内）。飛行機・電車・車・駐車場・スタグル・観戦ルール・来場案内の中身はこのサイトに書かず、すべてクラブ公式のページ（アクセス https://www.tegevajaro.com/club/stadium/access ・観戦ガイド・お知らせ）へ案内する。その下に載せたおすすめスポット、下に投稿フォーム（スタジアムから近い順の一覧・投稿フォーム）。押すと Google マップが開き、いちご宮崎新富サッカー場からの直線距離を出す（位置は `src/lib/util.js` の `STADIUM`）。載せるのは `src/data/spots.csv` だけ
- `worker/` … おすすめスポットの投稿受付（Cloudflare Workers + D1 + Turnstile）。準備の手順は `worker/README.md`
- `src/lib/history.js` … ランキングの変動（前の節とくらべた ↑↓・NEW、首位浮上）。順位の記録は `src/data/rank_history.json`（`tools/rank_snapshot.mjs`）。第12節の分は節ごとのデータから作り直したもので、アシスト・シュート・Football LAB など節ごとにわからない値を使う記録は入っていない（その記録は第14節から動きが出る）
- `src/lib/milestones.js` … 記録まであと少し（今季のゴール・アシスト・出場・先発・出場時間・連続ゴール・全試合出場、チームの得点・勝利・勝ち点・負けなしが区切りに近い／前の節で届いた）。キャリア通算はデータがないので扱わない。トップの「記録まであと少し」
- `tests/` … 検算テスト（Node 標準のテストランナー）。`worker/test/` も `npm test` で動く
