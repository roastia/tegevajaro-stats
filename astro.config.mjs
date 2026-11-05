// @ts-check
import { defineConfig } from 'astro/config';
import phraseBreak from './integrations/phrase-break.mjs';
import { SITE } from './src/config/site.js';

// おすすめスポット：投稿の送り先（Cloudflare Workers）とボット対策（Turnstile）だけ外部を許可する
const spotsApiOrigin = SITE.spots.api ? new URL(SITE.spots.api).origin : '';
const TURNSTILE = 'https://challenges.cloudflare.com';

export default defineConfig({
  site: 'https://tegestats.com',
  base: '/',
  trailingSlash: 'always',
  build: { format: 'directory' },
  markdown: { syntaxHighlight: false },
  // 日本語を文節で改行する（BudouX で <wbr> を入れる）
  integrations: [phraseBreak()],
  // CSP：ページで使うスクリプト・スタイルだけを許可（GitHub Pages はヘッダーを設定できないので meta で出す）
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        "font-src https://fonts.gstatic.com",
        `connect-src 'self'${spotsApiOrigin ? ' ' + spotsApiOrigin : ''}`,
        `frame-src ${TURNSTILE}`,
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'none'",
        'upgrade-insecure-requests',
      ],
      styleDirective: { resources: ["'self'", 'https://fonts.googleapis.com'] },
      scriptDirective: { resources: ["'self'", TURNSTILE] },
    },
  },
});
