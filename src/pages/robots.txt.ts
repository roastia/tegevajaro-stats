// robots.txt：すべて許可し、サイトマップの場所を知らせる
// （robots.txt はドメインの直下でしか読まれない。独自ドメインにして base を '/' にすると有効になる）
import { SITE } from '../config/site.js';

export const GET = () => new Response(`User-agent: *\nAllow: /\n\nSitemap: ${SITE.url}/sitemap.xml\n`, {
  headers: { 'Content-Type': 'text/plain; charset=utf-8' },
});
