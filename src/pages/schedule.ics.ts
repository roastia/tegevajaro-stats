// カレンダーのファイル（/schedule.ics）。日程ページの「カレンダーに追加」から使う
import { SITE } from '../config/site.js';
import { readCsv } from '../lib/data.js';
import { buildIcs } from '../lib/ics.js';

export const GET = () => new Response(buildIcs(readCsv('fixtures'), { url: SITE.url, stamp: SITE.asOf, team: SITE.team }), {
  headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
});
