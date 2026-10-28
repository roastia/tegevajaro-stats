// @ts-check
import { defineConfig } from 'astro/config';
import phraseBreak from './integrations/phrase-break.mjs';

export default defineConfig({
  site: 'https://roastia.github.io',
  base: '/tegevajaro-stats',
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
        "connect-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'none'",
        'upgrade-insecure-requests',
      ],
      styleDirective: { resources: ["'self'", 'https://fonts.googleapis.com'] },
    },
  },
});
