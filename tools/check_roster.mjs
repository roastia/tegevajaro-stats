// 選手名簿の点検：新加入・退団・背番号変更のあとに実行して、足りないものを一覧にする
// 使い方：npm run roster
import fs from 'node:fs';
import { readCsv } from '../src/lib/data.js';

const profiles = readCsv('profiles'), players = readCsv('players');
const problems = [], notes = [];
const byName = new Map(players.map(p => [p.name, p]));
const nos = new Map();
for (const p of profiles) {
  const who = `${p.name}（背番号${p.no || '？'}）`;
  if (!/^\d+$/.test(p.no)) problems.push(`${who}：背番号が数字ではありません`);
  if (nos.has(p.no)) problems.push(`${who}：背番号が ${nos.get(p.no)} と重なっています`); else nos.set(p.no, p.name);
  if (!['GK', 'DF', 'MF', 'FW'].includes(p.pos)) problems.push(`${who}：ポジションは GK/DF/MF/FW のどれかにしてください`);
  if (p.birth && !/^\d{4}-\d{2}-\d{2}$/.test(p.birth)) problems.push(`${who}：生年月日は YYYY-MM-DD で`);
  if (!p.birth) notes.push(`${who}：生年月日が空です（年齢・誕生日に出ません）`);
  if (!p.height) notes.push(`${who}：身長が空です（「空の支配者」に出ません）`);
  if (!p.birthplace) notes.push(`${who}：出身地が空です`);
  if (!p.career) notes.push(`${who}：経歴が空です（「歩んできた道」に出ません）`);
  const pl = byName.get(p.name);
  if (!pl) problems.push(`${who}：players.csv に行がありません（出場0でも 0 を入れた行を追加）`);
  else if (!/^https:\/\/www\.jleague\.jp\/player\/\d+\/$/.test(pl.jl_url || '')) notes.push(`${who}：Jリーグ公式の選手ページURLが未設定です（名前のリンクが出ません）`);
  for (const dir of ['numbers', 'numbers-s']) if (p.no && !fs.existsSync(`public/chars/${dir}/${p.no}.png`)) problems.push(`${who}：背番号イラストがありません → python3 tools/jersey_numbers.py`);
}
for (const pl of players) if (!profiles.some(p => p.name === pl.name)) notes.push(`${pl.name}：players.csv にあるが profiles.csv にない（退団した選手なら問題なし。今季の記録として残ります）`);

console.log(`在籍 ${profiles.length} 人`);
if (problems.length) { console.log('\n■ 直す必要があるもの'); problems.forEach(x => console.log('・' + x)); }
if (notes.length) { console.log('\n■ 確認（空でも動きます）'); notes.forEach(x => console.log('・' + x)); }
if (!problems.length) console.log('\n名簿は問題ありません。');
process.exitCode = problems.length ? 1 : 0;
