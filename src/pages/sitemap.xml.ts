// サイトマップ：検索エンジンに載せてほしいページの一覧（移転用の /roots/・/lineups/ は入れない）
import { SITE } from '../config/site.js';

export const GET = () => {
  const pages = ['', 'ranking/', 'players/', 'goals/', 'schedule/', 'spots/'];
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const body = pages.map(p => `  <url><loc>${esc(SITE.url + '/' + p)}</loc><lastmod>${SITE.asOf}</lastmod></url>`).join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
