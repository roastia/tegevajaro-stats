# 選手の加入・退団・背番号変更

## 選手の加入・退団・背番号変更
依頼の例：「新加入：〇〇選手（MF・背番号△）。サイトに追加して」「〇〇選手が退団。サイトから外して」「〇〇選手の背番号が△に変わった」

### 新加入
1. 情報を集める（出典を確かめる。推測で埋めない）
   - Jリーグ公式の選手ページ（`https://www.jleague.jp/player/数字/`）：ポジション・背番号・生年月日・身長・出身地・経歴
   - 加入の種類（完全移籍・期限付き移籍・新加入）と前所属：クラブ公式の発表、Football LAB の移籍情報
   - 公式ページがまだないときは、クラブ公式の発表だけで入れ、わからない項目は空にしておく
2. `src/data/profiles.csv` に1行追加する：`pos,no,name,birth,height,birthplace,hs_or_youth,university,career,kana,romaji`
   - 名前は姓と名の間を半角スペース（例：`奥村 晃司`）。ほかのCSVと同じ表記にそろえる
   - `birthplace` は都道府県名の「県・府・都」なし（例：`宮崎`、`北海道`）。海外出身は国名
   - `career` は少年団から**宮崎に来る直前まで**を ` → ` でつなぐ。期限付き移籍で以前宮崎にいた場合は「元のクラブ → テゲバジャーロ宮崎 → 元のクラブ」の形（「宮崎を選んだ男」の判定に使う）
   - `kana` は名前のよみをひらがなで、姓と名の間を半角スペース（例：`おくむら こうじ`）。よみは推測しない（スポーツナビの選手ページ `https://soccer.yahoo.co.jp/jleague/category/j2/teams/31508/players/数字` にカタカナで出ている。数字は Jリーグ公式の選手ページと同じ）
   - `romaji` は `kana` から作る（`npm run roster` が正しい形を教えてくれる。例：`okumura koji`）。選手名の検索（漢字・ひらがな・ローマ字）に使う
   - 値にカンマを使わない
3. `src/data/players.csv` に1行追加する（出場がまだなら数字は 0）。`jl_url` に公式の選手ページURL
4. `python3 tools/jersey_numbers.py` で背番号イラストを作る
5. `npm run roster` で名簿を点検 → `npm test` → `npm run build` → `npm run preview` で「選手」ページの年齢一覧・選手の称号に出ることを確認
6. コミット（push は人が行う）。例：「〇〇選手（MF・背番号△）の加入を反映」

### 退団（移籍・期限付き移籍・契約満了）
1. `src/data/profiles.csv` からその選手の行を消す（選手の称号・年齢一覧・誕生日・背景のトピックから外れる）
2. `players.csv`・`appearances.csv`・`goals.csv` などの**試合の記録は消さない**（今季の記録として残り、検算も合う）
3. `npm run roster`（「players.csv にあるが profiles.csv にない」と出るのは正常）→ `npm test` → `npm run build`
4. コミット。例：「〇〇選手の退団を反映」

### 背番号の変更
1. `profiles.csv` と `players.csv` の背番号を書き換える
2. `python3 tools/jersey_numbers.py` で背番号イラストを作り直す
3. `npm run roster` → `npm test` → `npm run build` → コミット

### 試合に出たあと
新加入の選手が試合に出たら、通常の「試合後の更新手順」で `appearances.csv` と `players.csv` に記録が入る。特別な作業はいらない。
