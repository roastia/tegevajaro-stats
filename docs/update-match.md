# 試合後の更新（第〇節を反映）

## 手順（トークンを使わない順に）
1. **試合の記録を取る（1試合 = ブラウザで1回）**：Chrome で Jリーグ公式の試合ページの `stats/`（例：`https://www.jleague.jp/match/j2/2026/103122/stats/`。番号は `https://www.jleague.jp/club/miyazaki/day/` の試合リンク）を開き、`tools/jleague_extract.js` の中身をそのまま実行する（javascript_tool に `await` を付けて渡す）。返ってきた1行の JSON を `private/matches/<節>.json` に保存する。**ページ本文を読み込まない**（重い）。
2. **順位**：`https://www.jleague.jp/standings/j2/` で「宮崎」の前後だけを取り出す（`document.body.innerText` の「テゲバジャーロ宮崎」の前40字）。
   - **暫定かどうか**：順位表の「試合数」が宮崎より少ないクラブがあれば、その節の試合が残っている（暫定）。そのクラブのうち、勝てば宮崎の勝ち点を上回る（勝ち点＋3 ＞ 宮崎）・並ぶ（＝ 宮崎。得失点で抜かれうるので数える）クラブの数を、今の順位に足したものが「下がりうるいちばん下の順位」。残り試合の日付は日程（`https://www.jleague.jp/match/` の節の一覧）で確かめる。4 の書き込みで `--pending <日付>:<いちばん下の順位>`（例：`--pending 11/8:6`）を付けると、ヘッダーの順位に「暫定」の札が出る（説明文は出さない）。付けなければ確定の表示に戻る
   - 残り試合が終わって順位が決まったら、`site.js` の `rank` を確定の順位に、`rankPending` を `null` にしてコミットする（頼まれたとき）
3. **ハイライト動画**：YouTube の検索結果ページ（「宮崎×相手 ハイライト 明治安田J2リーグ第〇節 2026/27」）で、チャンネルが DAZN Japan の動画IDだけを取り出す（Jリーグ公式の試合ページの動画は別チャンネルなので使わない）。1回の検索で2試合分出ることもある。
4. **書き込み**：`node tools/apply_match.mjs <節> --rank <順位> [--pending <日付>:<いちばん下の順位>] --video <URL>` → matches・appearances・goals・goals_all・lineups・players（出場・先発・分・得点・警告・退場は数え直し、アシストを足す）・suspension・site.js が一度に更新される。流し直しても二重にならない。累積警告が4枚に届いたら注意が出る（出場停止の数え直しは手で）。
5. `npm run snapshot` → `npm test` → `npm run build`。表示はスクリーンショットではなく、`dist/index.html` から今季の成績・記録まであと少し・直近5試合の文字だけを取り出して確かめる。
6. `src/data/updates.json` に「第〇節（〇/〇 〇〇戦）の結果を反映」（`path`: `goals/`）を足す（同じ日の分があればそこに足す）。
7. コミット（push は人）。メッセージは「第14節（10/31 大分戦）を反映」のように。
8. **ダッシュボード版は、頼まれたときだけ**更新する（確認用なので毎節はしない。→ `docs/dashboard.md`）。
10. **Football LAB をまとめて更新するとき**（頼まれたとき）：シーズンサマリー（https://www.football-lab.jp/myzk/ ：CBP の選手表・ゴール期待値の上位10人）、ランキング（/myzk/ranking/ ：パス交換・ラストパスが載る表の上位10人）、選手ページ（/player/〇〇/ の 2026/27 J2 の行：シュート）から取る。**それぞれ何節までの値かを確かめる**（選手の出場試合数・出場時間が、こちらの `appearances.csv` の第〇節までと一致するか／ゴール期待値の表のゴール数が第〇節までの得点と一致するか）。そのうえで `src/lib/calcs.js` の `LAB_UPTO` を書きかえる（札・ポスト文・決定力などの計算範囲がそろう）。ゴール期待値とシュートの節がちがうあいだは「決定機の質」は出ない。ラストパスは上位10人の表に出た人だけ（ほかは空欄）
9. Football LAB 由来の値（`xg.csv`・`cbp.csv`・`pass_pairs.csv`、`players.csv` の shots / last_passes、`matches.csv` の xg 列）は、この手順では変えない（空のまま）。まとめて更新するよう頼まれたときだけ入れる。

## データの意味（くわしく）
1. `src/data/` の CSV を更新する（カンマは値に使わない。改行は LF）。
   - `matches.csv`：試合結果（節・日付・相手・H/A・スコア・勝敗・先制・ハイライトURL・観客数など）
     - ハイライトURL（`video_url`）は YouTube の試合ハイライト。すべて DAZN Japan の動画にそろえる（タイトルは【A×B｜ハイライト】明治安田J2リーグ第○節｜2026/27シーズン｜Jリーグ）。ゴールだけの動画はないので、メニューの「ハイライト」（`goals.astro`）で試合ごとにハイライト・その試合のゴール・スタメン図（開閉式）をまとめる（選手で絞り込める）
   - `appearances.csv`：選手ごとの出場（先発・出場分・交代・警告・退場）
   - `goals.csv`（宮崎の得点）・`goals_all.csv`（両チームの得点）
   - `players.csv`：シーズン累計（出場・先発・分・得点・アシスト・警告など）
   - `suspension.csv`：累積警告
   - `lineups.csv`：スタメンの配置（`round,formation,line,slot,name`）。line は 0=GK・1=最終ライン…、slot は宮崎が上に攻める向きで左から1。出典は Jリーグ公式の試合ページ（`https://www.jleague.jp/match/j2/2026/月日番号/`）のフォーメーション図。ページの中のデータに宮崎の `formation` と各選手の `playerNumber`・`positionX`（小さいほど後ろ。GK がいちばん小さい）・`positionY`（マイナスが宮崎の左）が入っているので、positionX で列に分け、列の中を positionY の小さい順に 1, 2, … と番号をふる。背番号は `players.csv` で名前にする。図だけ見るときは、宮崎が下に攻める向きで描かれている試合があるので左右を入れかえて読む。確かめられないときだけ CB を `2-3`、ボランチを `1-2` と書く（同じ行に並べるだけになる）
   - Football LAB 由来：`xg.csv`・`cbp.csv`・`pass_pairs.csv`、`players.csv` の shots / last_passes、`matches.csv` の xg 列
   - 選手の加入・退団があれば `profiles.csv`（経歴は「宮崎に来る直前まで」を `→` でつなぐ）
   - `venues.csv`：会場の位置（`venue,lat,lng`。アウェイ遠征の距離に使う）。`apply_match.mjs` はここから試合の位置を入れ、表にない会場なら止まる。日程に新しい会場が出たら、地図で確かめて小数2けたで足す（`npm test` が日程の会場の入れ忘れを知らせる）
   - `fixtures.csv`：これからの試合の日程（`round,date,kickoff,opponent,opponent_full,ha,venue`）。出典はクラブ公式の試合日程（https://www.tegevajaro.com/matches?type=all&year=2026）。`opponent` は `matches.csv` と同じ略称（前回の対戦を探すのに使う）。キックオフ時間が未定なら空。日程が発表されたら足し、変更があれば直す。結果が入った節は表示されないので消さなくてよい。全ページのヘッダー（今季の成績の横）の「次の試合」（節・日時・ホーム／アウェイ・相手。`src/lib/nextmatch.js`）が、ブラウザで日本時間の今からキックオフまでの秒読み（パタパタめくれる得点板ふうの表示。`src/lib/flipboard.js`）と「試合中！」「おつかれさまでした！」を切り替える。ダッシュボード版は `index.html` の `FIXTURES` に同じ日程を入れる
   - 相手チーム名（次の試合・直近5試合・ハイライト）は相手クラブの公式サイトへのリンク。URL は `src/config/clubs.js`（J2 全クラブ分を持っている。略称と正式名のどちらでも引ける）。ダッシュボード版は `index.html` の `CLUB_URL` に同じもの。`apply_match.mjs` は日程に clubs.js にない相手がいると知らせるので、そのときは Jリーグ公式のクラブページ（jleague.jp/club/〇〇/）の公式サイトのリンクを確かめて足す（昇格・降格でクラブが入れかわったときも同じ）
2. `src/config/site.js` の `asOf`・`roundLabel`・`lastMatch`・`rank`（Jリーグ公式の順位表の現在順位）を書き換える。
   - 背番号の変更・新加入があったら `python3 tools/jersey_numbers.py` で背番号入りシャツのイラスト（`public/chars/numbers/`・小さい表示用 `numbers-s/`）を作り直す。
3. `npm run snapshot` でその節のランキングの順位を `src/data/rank_history.json` に記録する（次の節で「↑2」「↓1」「NEW」「首位浮上」を出すのに使う。忘れると `npm test` が知らせる）。ダッシュボード版は `index.html` の `RANK_PREV` を、最新の節の1つ前の順位に入れかえる（名前を番号にした形。作り方は前回と同じ）
4. `npm test` で検算する（出場時間の合計・スコアとゴール数・勝敗・ポスト文の長さなど）。失敗したらデータを直す。
5. `npm run build` → `npm run preview` で表示を確認する。
6. 変更をコミットする（**push は人が行う**）。コミットメッセージは「第14節（10/31 大分戦）を反映」のように。
