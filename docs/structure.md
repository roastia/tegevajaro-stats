# ファイルの構成

## 構成
- `src/data/*.csv` … データ（唯一の元データ）
- `src/lib/calcs.js` … ランキング計算（純粋関数）。ダッシュボード版で検算済みのロジック
- `src/lib/meta.js` … ランキングの定義（タイトル・応援のひとこと・説明・出典）、アイコン、称号キャラ
- `src/lib/data.js` … CSV 読み込み → 計算 → ページへ。`getShareables()` がポストできるもの（トピック・ランキング・背景）
- `src/lib/bday.js` … 誕生日のお祝い（ページ上の「お誕生日おめでとう！」・「もうすぐ誕生日」`src/components/BdaySoon.astro`）。ビルド時（毎日 0:05 日本時間）とブラウザで同じ HTML を作り、ブラウザの今日がビルドの日と違うときだけ site.js が作り直す（あとから枠が出て画面がずれる・ちらつくのを防ぐ）。マスコットは `SITE.mascots`（年齢なし）
- `src/lib/shareimg.js` ＋ `src/pages/share/[slug].png.ts` … 「画像でポスト」用の画像（1080×1350・縦長 4:5。注目トピック・ランキング・首位浮上の1件ずつ。`/share/t-〇〇.png`・`/share/r-〇〇.png`）を Satori + resvg でビルド時に生成。下の帯にロゴ・テゲバのスタッツ・非公式サポーターサイト・時点・データ元。ボタンは `PostBox` に `img`・`short` を渡すと「画像でポスト」になり、スマホは共有メニュー（X を選ぶと画像つき）、PC は画像のダウンロード＋X の投稿画面（短い文）。動きは `src/scripts/site.js` の最後
- `src/lib/og.js` … リンクのサムネイル画像（1200×630 PNG、テゲスタ！のロゴ。全ページ共通の `/og/site.png`）を Satori + resvg でビルド時に生成
- `dashboard/` … ダッシュボード版（Claude のダッシュボード）の中身の控え。公開版のビルドには使わない（`dashboard/README.md`）
- `integrations/stable-names.mjs` … ビルド後に `_astro/` の CSS・JS のファイル名から記号（.AbCd1234）を外し、ページの中の参照も書きかえる。公開のたびに名前が変わると、ブラウザに残った古いページ（GitHub Pages は10分ほど覚える・先読み）が消えたファイルを探してデザインなしになるため
- `src/pages/updates.astro` … 更新履歴（フッターの「更新履歴」から）。中身は `src/data/updates.json`（日付ごとの項目と関係するページ）、ポスト文は `src/lib/updates.js`
- `src/pages/schedule.astro` … メニューの「日程」。「残り〇試合（ホーム〇・アウェイ〇）」は、シーズンの全日程が `fixtures.csv` に入って `site.js` の `fixturesAll` を true にしたときだけ出す。`fixtures.csv` のうち結果がまだ入っていない試合を月ごとに並べ、相手クラブの公式サイト・会場・今季の前回の対戦を添える。下に「カレンダーに追加」（webcal:// で `/schedule.ics` を購読。iPhone・Mac）と「ファイルで取り込む（.ics）」。カレンダーのファイルは `src/pages/schedule.ics.ts`・`src/lib/ics.js` が `fixtures.csv` から作る。試合の日が誕生日の選手がいれば「この日は〇〇選手の〇歳の誕生日！」（黄色の札）。日付が過ぎて結果が未反映の試合には「結果は更新待ち」（ブラウザで日本時間の今日とくらべる）
- `src/pages/` … 注目トピック（/）・ランキング・選手（`players.astro`：上から選手名鑑・年齢一覧・出身都道府県・同じ母校・ユース出身・チームデータ。前の `/roots/` は `/players/` へ移す）・ハイライト（`goals.astro`：試合ごとのハイライト・ゴール・スタメン図。スタメンの計算は `src/lib/lineups.js`。前の `/lineups/` は `/goals/` へ移す）、サムネイル画像 `/og/site.png`
- `public/logo-tegesta.svg` … サイトのロゴ（テゲスタ！の手描き文字をなぞった SVG）。ヘッダーとポスト用画像（白にして）で使う。`favicon.svg`・`apple-touch-icon.png` はロゴの「テ」
- `src/scripts/site.js` … スクロール位置・誕生日（日本時間の今日から計算）・紙吹雪
- `src/pages/spots.astro` … メニューの「みやざき情報」（オレンジ色の項目）のページ。上にアプリコットの面の「ようこそみやざきへ！」の手描き文字（`public/welcome-miyazaki.svg`。画像をなぞった SVG）と（あいさつ）。案内はアイコンつきのタイル（ボタンはピンクの枠つき）。アウェイから来た人向けのあいさつ、いちばん下に「アウェイからお越しのみなさんへ」（スタジアム＝Google マップ・アクセス・スタグル・観戦ルール・来場案内）。飛行機・電車・車・駐車場・スタグル・観戦ルール・来場案内の中身はこのサイトに書かず、すべてクラブ公式のページ（アクセス https://www.tegevajaro.com/club/stadium/access ・観戦ガイド・お知らせ）へ案内する。その下に載せたおすすめスポット、下に投稿フォーム（スタジアムから近い順の一覧・投稿フォーム）。おすすめスポットは、ふだんは「名前・スタジアムからの距離・開く印・ハート」の1行だけ（押すと、ひとこと・リンクが開く。`#spot-〇〇` で来たら開いておく）。押すと Google マップが開き、いちご宮崎新富サッカー場からの直線距離を出す（位置は `src/lib/util.js` の `STADIUM`）。載せるのは `src/data/spots.csv` だけ
- `worker/` … おすすめスポットの投稿受付（Cloudflare Workers + D1 + Turnstile）。準備の手順は `worker/README.md`
- `src/lib/history.js` … ランキングの変動（前の節とくらべた ↑↓・NEW、首位浮上）。順位の記録は `src/data/rank_history.json`（`tools/rank_snapshot.mjs`）。第12節の分は節ごとのデータから作り直したもので、アシスト・シュート・Football LAB など節ごとにわからない値を使う記録は入っていない（その記録は第14節から動きが出る）
- `src/lib/milestones.js` … 記録まであと少し（今季のゴール・アシスト・出場・先発・出場時間・連続ゴール・全試合出場、チームの得点・勝利・勝ち点・負けなしが区切りに近い／前の節で届いた）。キャリア通算はデータがないので扱わない。トップの「記録まであと少し」
- `tests/` … 検算テスト（Node 標準のテストランナー）。`worker/test/` も `npm test` で動く

## アコーディオン（大項目の開け閉め）
- 部品は `src/components/Acc.astro`（`id`・`title`・`icon`・`count`・`open`）。開け閉めは同じタブの間だけ覚え、`#id` や中の要素へのリンクで自動で開く（`src/scripts/site.js` のおわり）。
- 大項目：注目トピック＝今季の話題・記録まであと少し／ランキング＝ゴール・出場・貢献・プレー・トリビア／選手＝選手名鑑・年齢一覧・出身都道府県・同じ母校・ユース出身・チームデータ／ハイライト＝月ごと（絞り込むと該当のある月を開き、0試合の月は隠す）／みやざき情報＝おすすめスポット・おすすめを教えて！・アウェイからお越しのみなさんへ。**はじめはすべて開いておき**、閉じた状態はスクロール位置と同じく同じタブの間だけ覚える。見出しの右に「開く／閉じる」のボタン（文字と矢印）を出して、開け閉めできるとひと目でわかるようにする。
- 直近5試合・誕生日・首位浮上・順位の動きの説明・ハイライトの絞り込みは、たたまずに上に出す。ダッシュボード版も同じ（`accBox()` と `details.tg-acc`）。
- 選手名のリンク：表示された文字の中の選手名を、ブラウザで Jリーグ公式の選手ページへのリンクに包む（`src/lib/playerlinks.js`。名前→URL は Base.astro の `#pl-urls`、対象の場所は site.js の最後）。新しい場所に選手名を出したら、そこのセレクタを足す。ダッシュボード版は `linkPlayers`（描き直しのたびに包む）

- `src/pages/chants.astro` ＋ `src/data/chants.csv`：チャント（歌詞は載せない。くわしくは docs/chants.md）
- `src/pages/links.astro` ＋ `src/data/links.csv`：リンク集（id・group・name・url。ひとことは、まちがいやすく中身も変わるので載せない）。公式は公式サイト1つだけ、サポーター団体・サポーターのYouTubeを中心に。足すときは URL を開いて、テゲバのサポーターが発信しているか・今も動いているかを確かめてから

- 検索・AI 向け（AIO）：`src/lib/seo.js` が構造化データ（WebSite・WebPage〔dateModified=asOf〕・FAQPage・試合日程の SportsEvent・選手・リンク・スポット）と「よくある質問」を、サイトの数字だけから作る。`/llms.txt`（`src/pages/llms.txt.ts`）は AI 向けのサイト紹介。`/robots.txt` は検索・AI のクローラーを名前で許可。数字を変えたら（試合後の更新）自動で追従する。推測や外の情報は足さない
