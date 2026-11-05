// サイト全体の設定。試合ごとの更新では、ここの「時点」の項目も書き換える（CLAUDE.md 参照）。
export const SITE = {
  name: 'テゲスタ！',
  tagline: 'テゲバのスタッツ',
  short: 'テゲスタ！',
  // テゲスタ！のURL（まだ仮）。ポストに付くリンクとポスト用画像のページに使う。
  // 決まったら、ここと astro.config.mjs の site・base、ダッシュボード版の SITE_URL をそろえて変える（CLAUDE.md「公開URLが決まったら」）
  url: 'https://tegestats.com',
  // データの時点
  asOf: '2026-11-04',          // 年齢を数える基準日（最新の更新日）
  roundLabel: '第15節',        // 「第13節時点」の表記
  lastMatch: '11/3 栃木C戦',   // ページ冒頭の「〜までの記録」
  rank: 6,                     // J2 の現在の順位（Jリーグ公式の順位表の値）
  // 検索（SEO）：検索結果やリンクに出る説明。「テゲバジャーロ宮崎」を必ず入れる
  team: 'テゲバジャーロ宮崎',
  // Google Search Console の「HTML タグ」で確認するときの content の値（空なら出さない）
  googleSiteVerification: '',
  hashtags: '#テゲバジャーロ宮崎 #テゲバ #テゲスタ',
  // Football LAB 由来のデータを表示するか（問い合わせ結果で切り替える）
  footballLab: true,
  // おすすめスポットの投稿受付（Cloudflare Workers。worker/README.md の手順で用意してから入れる）
  // 空のあいだは投稿フォームが「準備中」になる
  spots: {
    api: '',               // 例：'https://tegesta-spots.〇〇.workers.dev/api/spots'
    turnstileSiteKey: '',  // Cloudflare Turnstile のサイトキー（公開してよい値）
  },
};
