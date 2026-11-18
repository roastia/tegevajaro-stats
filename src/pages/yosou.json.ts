// みんなのスコア予想：受け付ける試合（キックオフで締め切る）と、これまでの試合の結果。Worker（/api/yosou）もこれを見て締め切る
import { readCsv } from '../lib/data.js';
import { yosouData } from '../lib/yosou.js';
import { clubFull } from '../config/clubs.js';
import { todayJst } from '../lib/bday.js';

export const GET = () => new Response(JSON.stringify(yosouData({ fixtures: readCsv('fixtures'), matches: readCsv('matches'), clubFull, today: todayJst().toISOString().slice(0, 10) })), {
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
});
