// @ts-check
import { defineConfig } from 'astro/config';
import phraseBreak from './integrations/phrase-break.mjs';
import stableNames from './integrations/stable-names.mjs';
import { createHash } from 'node:crypto';
import { SITE } from './src/config/site.js';
import { YOSOU_EARLY } from './src/config/inline.js';

// おすすめスポット：投稿の送り先（Cloudflare Workers）とボット対策（Turnstile）だけ外部を許可する
const spotsApiOrigin = SITE.spots.api ? new URL(SITE.spots.api).origin : '';
const TURNSTILE = 'https://challenges.cloudflare.com';
// アクセス解析（Cloudflare Web Analytics）：スクリプトの読み込み先と、数えた結果の送り先
const CF_BEACON = 'https://static.cloudflareinsights.com';
const CF_RUM = 'https://cloudflareinsights.com';

export default defineConfig({
  site: 'https://tegestats.com',
  base: '/',
  trailingSlash: 'always',
  build: { format: 'directory' },
  markdown: { syntaxHighlight: false },
  // ページの先読み：サイト内のリンクはマウスが乗ったら、メニューは画面に見えたら（データセーバー・遅い回線では自動で休む）
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  // 日本語を文節で改行する（BudouX で <wbr> を入れる）
  // CSS・JS のファイル名を公開のたびに変えない（integrations/stable-names.mjs）
  integrations: [phraseBreak(), stableNames()],
  // CSP：ページで使うスクリプト・スタイルだけを許可（GitHub Pages はヘッダーを設定できないので meta で出す）
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        "font-src 'self'",
        `connect-src 'self'${spotsApiOrigin ? ' ' + spotsApiOrigin : ''}${SITE.cfBeacon ? ' ' + CF_RUM : ''}`,
        `frame-src ${TURNSTILE}`,
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'none'",
        'upgrade-insecure-requests',
      ],
      styleDirective: { resources: ["'self'"] },
      scriptDirective: {
        resources: ["'self'", TURNSTILE, ...(SITE.cfBeacon ? [CF_BEACON] : [])],
        // ページに直接書く小さなスクリプト（src/config/inline.js）は、中身のハッシュで1つずつ許可する
        hashes: [`sha256-${createHash('sha256').update(YOSOU_EARLY).digest('base64')}`],
      },
    },
  },
});
