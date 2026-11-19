// テスト用サイト（npm run build:test）のときだけ true。本番に出す前に、新しい機能を tegesta-test.pages.dev で確かめる（docs/test-site.md）
// ブラウザでは import.meta.env、astro.config.mjs（Node）では process.env から読む
const ENV = import.meta.env || (typeof process !== 'undefined' ? process.env : {});
const TEST = ENV.PUBLIC_TEGESTA_TEST === '1';

// サイト全体の設定。試合ごとの更新では、ここの「時点」の項目も書き換える（CLAUDE.md 参照）。
export const SITE = {
  name: 'テゲスタ！',
  test: TEST,
  tagline: 'テゲバのスタッツ',
  short: 'テゲスタ！',
  // テゲスタ！のURL（まだ仮）。ポストに付くリンクとポスト用画像のページに使う。
  // 決まったら、ここと astro.config.mjs の site・base、ダッシュボード版の SITE_URL をそろえて変える（CLAUDE.md「公開URLが決まったら」）
  url: 'https://tegestats.com',
  // データの時点
  asOf: '2026-11-16',          // 年齢を数える基準日（最新の更新日）
  roundLabel: '第17節',        // 「第13節時点」の表記
  lastMatch: '11/14 新潟戦',   // ページ冒頭の「〜までの記録」
  rank: 3,                     // J2 の現在の順位（Jリーグ公式の順位表の値）
  // 順位が暫定のとき（同じ節のほかの試合がまだ残っている）：残り試合の日付と、その結果で下がりうるいちばん下の順位。確定なら null
  // シーズンの全日程が fixtures.csv に入ったら true（日程ページに「残り〇試合」を出す。途中までしか発表されていないあいだは false）
  fixturesAll: false,
  rankPending: null,
  // 検索（SEO）：検索結果やリンクに出る説明。「テゲバジャーロ宮崎」を必ず入れる
  team: 'テゲバジャーロ宮崎',
  // Google Search Console の「HTML タグ」で確認するときの content の値（空なら出さない）
  googleSiteVerification: '',
  hashtags: '#テゲバジャーロ宮崎 #テゲバ #テゲスタ',
  // 誕生日を一緒にお祝いするマスコット（年齢は出さない。birth は「月-日」だけ）
  mascots: [{ name: 'ジャーロくん', birth: '11-11' }],
  // Football LAB 由来のデータを表示するか（問い合わせ結果で切り替える）
  footballLab: true,
  // おすすめスポットの投稿受付（Cloudflare Workers。worker/README.md の手順で用意してから入れる）
  // 空のあいだは投稿フォームが「準備中」になる
  // アクセス解析：Cloudflare Web Analytics（Cookie を使わない）のトークン（公開してよい値）。空にすると読み込まない
  cfBeacon: TEST ? '' : '3953572eef154b1fb9d1de10f39b4c4a',  // テスト用サイトは数えない
  spots: {
    // テスト用サイトは、本番と別の Worker・データベースに送る（本番の投稿・予想・いいね！の数を汚さない）
    api: TEST ? 'https://tegesta-spots-test.tegestats.workers.dev/api/spots' : 'https://tegesta-spots.tegestats.workers.dev/api/spots',
    // Cloudflare Turnstile のサイトキー（公開してよい値）。テスト用は Cloudflare が用意している「いつも通る」テスト用キー
    turnstileSiteKey: TEST ? '1x00000000000000000000AA' : '0x4AAAAAAF01OOzpZSjTEVm4',
  },
};
