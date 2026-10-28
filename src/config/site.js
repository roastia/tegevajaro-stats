// サイト全体の設定。試合ごとの更新では、ここの「時点」の項目も書き換える（CLAUDE.md 参照）。
export const SITE = {
  name: 'テゲスタ！',
  tagline: 'テゲバのスタッツ',
  short: 'テゲスタ！',
  url: 'https://roastia.github.io/tegevajaro-stats',
  // データの時点
  asOf: '2026-10-27',          // 年齢を数える基準日（最新の更新日）
  roundLabel: '第13節',        // 「第13節時点」の表記
  lastMatch: '10/25 山形戦',   // ページ冒頭の「〜までの記録」
  rank: 7,                     // J2 の現在の順位（Jリーグ公式の順位表の値）
  hashtags: '#テゲバジャーロ宮崎 #テゲバ',
  // Football LAB 由来のデータを表示するか（問い合わせ結果で切り替える）
  footballLab: true,
};
