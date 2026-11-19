# ファイルの構成

## 構成
- `src/data/*.csv` … データ（唯一の元データ）
- `src/lib/calcs.js` … ランキング計算（純粋関数）。ダッシュボード版で検算済みのロジック
- `src/lib/meta.js` … ランキングの定義（タイトル・応援のひとこと・説明・出典）、アイコン、称号キャラ
- `src/lib/data.js` … CSV 読み込み → 計算 → ページへ。`getShareables()` がポストできるもの（トピック・ランキング・背景）
- `src/lib/bday.js` … 誕生日のお祝い（ページ上の「お誕生日おめでとう！」・「もうすぐ誕生日」`src/components/BdaySoon.astro`）。ビルド時（毎日 0:05 日本時間）とブラウザで同じ HTML を作り、ブラウザの今日がビルドの日と違うときだけ site.js が作り直す（あとから枠が出て画面がずれる・ちらつくのを防ぐ）。マスコットは `SITE.mascots`（年齢なし）
- `src/lib/shareimg.js` ＋ `src/pages/share/[slug].jpg.ts` … 「画像でポスト」用の画像（1080×1440・縦長 3:4。注目トピック・ランキング・首位浮上の1件ずつ。`/share/t-〇〇.jpg`・`/share/r-〇〇.jpg`）を Satori + resvg でビルド時に生成。背景はユニフォームの布の画像 `src/assets/share/bg.jpg`（1080×1440。本人が用意したもの。襟・丸いワッペン・筆の帯・網点・当て布）で、アイコンは右上の丸いワッペンの中（`BADGE`）。背景を差し替えたら `BADGE` の位置を合わせる。真ん中の大きな数字は、本人が用意した字の画像 `src/assets/share/digits/`（0〜9・dot・comma・percent・plus・minus。白ふち・影つき、背景は透明、高さ 330px で下の 30px は「,」のはみ出しぶん）を並べる。横÷縦の比は `shareimg.js` の `DIGIT_RATIO`。字を差し替えたらこの値も直す。字体は日本語 Noto Sans JP（Black。小さな文字は Bold）・数字 Anton・英字ラベル Saira Semi Condensed（`src/assets/fonts`、OFL）。下の帯にロゴ・テゲバのスタッツ・非公式サポーターサイト・時点・データ元。ボタンは `PostBox` に `img`・`short` を渡すと「画像でポスト」になり、スマホは共有メニュー（X を選ぶと画像つき）、PC は画像のダウンロード＋X の投稿画面（短い文）。動きは `src/scripts/site.js` の最後
- `src/scripts/postimage.js` … 「画像でポスト」ボタンの動き（話題・ランキング・スコア予想で共用）。スマホは押したらまずリンクを止めて画像つきの共有メニュー、共有できない端末は X の投稿画面へ。PC は画像を保存して X の投稿画面へ
- 軽く表示するための決まり：話題（`.share`）・ランキング（`.card.rec`）のカードは `content-visibility: auto`（画面の外は配置を計算しない）。#リンクで来たときは site.js の reveal が `.cv-all` でいったん全部を配置してから止める。カードを増やすときもこの2つのクラスなら何もしなくてよい。JS で大きさを測るときは「全部測ってから、まとめて書く」（交互にしない）
- `src/lib/og.js` … リンクのサムネイル画像（1200×630 PNG、テゲスタ！のロゴ。全ページ共通の `/og/site.png`）を Satori + resvg でビルド時に生成
- `dashboard/` … ダッシュボード版（Claude のダッシュボード）の中身の控え。公開版のビルドには使わない（`dashboard/README.md`）
- `integrations/stable-names.mjs` … ビルド後に `_astro/` の CSS・JS のファイル名から記号（.AbCd1234）を外し、ページの中の参照も書きかえる。公開のたびに名前が変わると、ブラウザに残った古いページ（GitHub Pages は10分ほど覚える・先読み）が消えたファイルを探してデザインなしになるため
- `src/pages/updates.astro` … 更新履歴（フッターの「更新履歴」から）。中身は `src/data/updates.json`（日付ごとの項目と関係するページ）、ポスト文は `src/lib/updates.js`
- `src/pages/schedule.astro` … メニューの「日程」。「残り〇試合（ホーム〇・アウェイ〇）」は、シーズンの全日程が `fixtures.csv` に入って `site.js` の `fixturesAll` を true にしたときだけ出す。`fixtures.csv` のうち結果がまだ入っていない試合を月ごとに並べ、相手クラブの公式サイト・会場・今季の前回の対戦を添える。下に「カレンダーに追加」（webcal:// で `/schedule.ics` を購読。iPhone・Mac）と「ファイルで取り込む（.ics）」。カレンダーのファイルは `src/pages/schedule.ics.ts`・`src/lib/ics.js` が `fixtures.csv` から作る。試合の日が誕生日の選手がいれば「この日は〇〇選手の〇歳の誕生日！」（黄色の札）。日付が過ぎて結果が未反映の試合には「結果は更新待ち」（ブラウザで日本時間の今日とくらべる）
- `src/pages/` … 注目トピック（/）・ランキング・選手（`players.astro`：上から選手名鑑・年齢一覧・出身都道府県・同じ母校・ユース出身・チームデータ。前の `/roots/` は `/players/` へ移す）・ハイライト（`goals.astro`：試合ごとのハイライト・ゴール・スタメン図。スタメンの計算は `src/lib/lineups.js`。前の `/lineups/` は `/goals/` へ移す）、サムネイル画像 `/og/site.png`
- `public/logo-tegesta.svg` … サイトのロゴ（テゲスタ！の手描き文字をなぞった SVG）。ヘッダーとポスト用画像（白にして）で使う。`favicon.svg`・`apple-touch-icon.png` はロゴの「テ」
- `src/scripts/site.js` … スクロール位置・誕生日（日本時間の今日から計算）・紙吹雪
- `src/pages/spots.astro` … メニューの「みやざき情報」（オレンジ色の項目）のページ。上にアプリコットの面の「ようこそみやざきへ！」の手描き文字（`public/welcome-miyazaki.svg`。画像をなぞった SVG）と（あいさつ）。案内はアイコンつきのタイル（ボタンはピンクの枠つき）。アウェイから来た人向けのあいさつ、いちばん下に「アウェイからお越しのみなさんへ」（スタジアム＝Google マップ・アクセス・スタグル・観戦ルール・来場案内）。飛行機・電車・車・駐車場・スタグル・観戦ルール・来場案内の中身はこのサイトに書かず、すべてクラブ公式のページ（アクセス https://www.tegevajaro.com/club/stadium/access ・観戦ガイド・お知らせ）へ案内する。その下に載せたおすすめスポット（スタジアムから近い順の一覧）と、「教えて！」への問いかけ。投稿フォームは「教えて！」ページ（`src/pages/oshiete.astro`）にある。おすすめスポットは、ふだんは「名前・スタジアムからの距離・開く印・ハート」の1行だけ（押すと、ひとこと・リンクが開く。`#spot-〇〇` で来たら開いておく）。押すと Google マップが開き、いちご宮崎新富サッカー場からの直線距離を出す（位置は `src/lib/util.js` の `STADIUM`）。載せるのは `src/data/spots.csv` だけ
- `worker/` … おすすめスポットの投稿受付（Cloudflare Workers + D1 + Turnstile）。準備の手順は `worker/README.md`
- `src/lib/history.js` … ランキングの変動（前の節とくらべた ↑↓・NEW、首位浮上）。順位の記録は `src/data/rank_history.json`（`tools/rank_snapshot.mjs`）。第12節の分は節ごとのデータから作り直したもので、アシスト・シュート・Football LAB など節ごとにわからない値を使う記録は入っていない（その記録は第14節から動きが出る）
- `src/lib/milestones.js` … 記録まであと少し（今季のゴール・アシスト・出場・先発・出場時間・連続ゴール・全試合出場、チームの得点・勝利・勝ち点・負けなしが区切りに近い／前の節で届いた）。キャリア通算はデータがないので扱わない。トップの「記録まであと少し」
- `tests/` … 検算テスト（Node 標準のテストランナー）。`worker/test/` も `npm test` で動く

## アコーディオン（大項目の開け閉め）
- 部品は `src/components/Acc.astro`（`id`・`title`・`icon`・`count`・`open`）。開け閉めは同じタブの間だけ覚え、`#id` や中の要素へのリンクで自動で開く（`src/scripts/site.js` のおわり）。
- 「すべて閉じる」ボタン（`src/layouts/Base.astro` の `.close-all`）：ページを1画面ぶん以上スクロールして、開いているまとまりがあるときだけ右下（スマホは下のメニューの上）に出る。押すと main の中の開いている details（中の小さいまとまりも）をまとめて閉じ、いま見ていたまとまりの見出しを画面の上に戻す（`site.js`）
- 大項目：注目トピック＝今季の話題・記録まであと少し／ランキング＝ゴール・出場・貢献・プレー・トリビア／選手＝選手名鑑・年齢一覧・出身都道府県・同じ母校・ユース出身・チームデータ／ハイライト＝月ごと（絞り込むと該当のある月を開き、0試合の月は隠す）／みやざき情報＝おすすめスポット・アウェイからお越しのみなさんへ。**はじめはすべて開いておき**、閉じた状態はスクロール位置と同じく同じタブの間だけ覚える。見出しの右に「開く／閉じる」のボタン（文字と矢印）を出して、開け閉めできるとひと目でわかるようにする。
- 直近5試合・誕生日・首位浮上・順位の動きの説明・ハイライトの絞り込みは、たたまずに上に出す。ダッシュボード版も同じ（`accBox()` と `details.tg-acc`）。
- 選手名のリンク：表示された文字の中の選手名を、ブラウザで Jリーグ公式の選手ページへのリンクに包む（`src/lib/playerlinks.js`。名前→URL は Base.astro の `#pl-urls`、対象の場所は site.js の最後）。新しい場所に選手名を出したら、そこのセレクタを足す。ダッシュボード版は `linkPlayers`（描き直しのたびに包む）

- `src/pages/chants.astro` ＋ `src/data/chants.csv`：チャント（歌詞は載せない。くわしくは docs/chants.md）
- `src/data/cheers.csv` ＋ `src/lib/cheers.js`：ランキング・注目トピックの「応援のひとこと」（見出しの下の1行）を1日ごとに切りかえる。kind（r＝ランキング・t＝トピック）・id・text。1件10個ずつ。タイトル（称号）は変えない。同じ日はページ・ポスト文・画像で同じ文（日本時間の日付で回す）。CSV にない id（お天気・ゴールの時間割など、文が数字で変わるもの）は今の文のまま。決まり：全角18文字まで・前向き・誰も傷つけない・汚い言葉なし・カンマなし（テストで確かめる）。足すときは、画像用の字体（`src/assets/fonts/NotoSansJP-*.subset.ttf`）にない漢字を使っていないかも確かめる
- `src/pages/oshiete.astro`：「教えて！」（/oshiete/）。宮崎のおすすめ（POST /api/spots）とテゲバの情報サイト（POST /api/links）の受付をまとめたページ。上の切りかえで片方ずつ出し、`#spot`・`#site` で来たらそちらを開く。メニューには入れず、入り口は次の3つ：①`src/components/Ask.astro`（「ここで聞かれたら答えたくなる」場所に置く1行の問いかけ＋「教えて！」。topic は spot＝オレンジ、site＝ピンク。今はみやざき〔スポット一覧の最後〕・日程〔次のホーム戦の行〕・ハイライト・歴史・チャント・リンク〔一覧の最後〕）②全ページのフッターの上のカード（教えて！・みやざき・リンクのページでは出さない）③スマホの「メニュー」の一覧の下のボタン
- `src/pages/links.astro` ＋ `src/data/links.csv`：リンク集（id・group・name・url。ひとことは、まちがいやすく中身も変わるので載せない）。公式はクラブ公式サイトのトップとパートナー・スポンサー一覧だけ、サポーター団体・サポーターのYouTubeを中心に。足すときは URL を開いて、テゲバのサポーターが発信しているか・今も動いているかを確かめてから

- 検索・AI 向け（AIO）：`src/lib/seo.js` が構造化データ（WebSite・WebPage〔dateModified=asOf〕・FAQPage・試合日程の SportsEvent・選手・リンク・スポット）と「よくある質問」を、サイトの数字だけから作る。`/llms.txt`（`src/pages/llms.txt.ts`）は AI 向けのサイト紹介。`/robots.txt` は検索・AI のクローラーを名前で許可。数字を変えたら（試合後の更新）自動で追従する。推測や外の情報は足さない
- 検索結果の説明（description）は、探す言葉に合わせて中身の先頭に具体的な答えを入れる（Search Console の 2026年11月のデータから）：トップ＝J2の順位、日程＝次の試合（日時・相手・ホーム／アウェイ・会場）、スタメン・ハイライト＝最新の試合のスタメンの形と得点ランキング1位、ランキング＝いくつかのランキングの1位、選手＝今季の人数。毎日のビルドで自動で変わる
- `src/pages/history.astro` ＋ `src/lib/clubhistory.js` … 歴史のページ（年表・シーズンごとの全試合と最終順位表・通算の記録）。過去の試合は `src/data/history_matches.csv`（id は Jリーグ公式の試合ページの `match/〇〇/年/番号`）・`history_goals.csv`（og=1 は相手のオウンゴール）、シーズンの順位は `history_seasons.csv`（出典を書く）、シーズンの最終順位表は `history_standings.csv`（Jリーグ公式データサイトの順位表。百年構想リーグは引き分けなしで pkw・pkl に PK勝・PK負）、対戦成績の相手の「いまのカテゴリ」は `src/config/categories.js`（シーズンが変わって昇格・降格があったら直す）。今季のリーグ戦は matches.csv・goals.csv からそのまま入る。PK戦は引き分けで数える。通算の記録は、はじめは全シーズンのすべての公式戦（リーグ戦以外も含める）。シーズン（全シーズン・各シーズン）と種類（すべて・リーグ戦・リーグ戦以外）を選ぶと、ブラウザが数えなおす（計算と表示は `src/lib/hsrecords.js` をビルドとブラウザで共用。試合の要点はページの `#hsData` に JSON で入れる）
- `src/lib/histtopics.js` … J参入（2021年）からの公式戦を使った話題とランキング。トップの「J参入からの話題」（この日のテゲバ・次の相手との通算成績・曜日と月の成績（勝ち点ペースが通算より良いときだけ出す）・負けたことのない相手・トリビア）、ランキングの「歴代」（J通算ゴール・ハットトリック。オウンゴールは数えない）。日程の各試合の「通算 〇勝〇分〇敗」も同じ対戦成績（`headToHead`）から出す。決まった過去の出来事・歴代の記録（この日のテゲバ・1試合の最多得点・いちばん多い観客）は `timeless` で「第〇節時点」を付けない（試合ごとに増える通算の数字には付ける）
- みんなのスコア予想：`src/components/Yosou.astro`（トップ・日程・/yosou/）＋`src/scripts/yosou.js`（＋−で選んで決定、みんなの予想の分布、前節の答え合わせ、締め切りまでの時間）。受け付ける試合とキックオフは `src/lib/yosou.js` → `/yosou.json`。受付は Worker の `/api/yosou`（`worker/README.md` の 8）。負け予想は選べない（UI は0〜6点、Worker は0〜9点まで受ける）。「わたしの予想」画像は `src/pages/share/y-[gf]-[ga].jpg.ts`（次の試合について、選べるスコアの分だけビルドで作る）。自分の予想はその端末の localStorage（`tg:yosou:日付`）にだけ覚える
- テゲスキ！（テゲバの好きなところ）：`src/pages/tegesuki.astro`（2ちゃんねる風のスレ。レス番号・>>番号 の引用ポップアップと返信一覧・いいね！（Worker `/api/likes`）・言葉でリアルタイムに絞り込み・タグ・並べかえ・1件ずつ X でポスト・下に書き込みフォーム）＋ `src/lib/suki.js`（読み込み・タグの一覧・ポスト文）。声は `src/data/suki.json`（確認して整えたものだけ）。受付フォームは `src/components/SukiForm.astro`＋`src/scripts/sukiform.js`（お題ボタン・試合の日のお題）で、スレの下と「教えて！」の #suki に置く → Worker の `/api/suki`。掲載の流れと決まりは `docs/suki.md`。AI 向けに構造化データ（CollectionPage＋Comment）と llms.txt の「テゲサポの声」にも出す
- テスト用サイト：`npm run deploy:test` で tegesta-test.pages.dev に出す（`SITE.test`。帯・noindex・テスト用 Worker）。手順は `docs/test-site.md`
