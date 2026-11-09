// robots.txt：すべて許可し、サイトマップの場所を知らせる。検索・AI のクローラーも名前を挙げて許可する（AI の要約で正しく紹介してもらうため）
// （robots.txt はドメインの直下でしか読まれない。独自ドメインにして base を '/' にすると有効になる）
import { SITE } from '../config/site.js';

const BOTS = ['Googlebot', 'Google-Extended', 'Bingbot', 'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Applebot', 'Applebot-Extended'];

export const GET = () => new Response(
  BOTS.map(b => `User-agent: ${b}\nAllow: /\n`).join('\n') +
  `\nUser-agent: *\nAllow: /\n\nSitemap: ${SITE.url}/sitemap.xml\n`, {
  headers: { 'Content-Type': 'text/plain; charset=utf-8' },
});
