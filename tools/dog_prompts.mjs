// 選手の犬イラスト用プロンプト（docs/dog-illustration-prompts.md）を、最新のデータから作り直す
// 使い方：node tools/dog_prompts.mjs
import fs from 'node:fs';
import { getData } from '../src/lib/data.js';
import { SITE } from '../src/config/site.js';

const d = getData();
const ageOf = Object.fromEntries(d.ages.map(a => [a.name, a.age]));
const titles = {};
for (const { meta, rows } of d.rankings) {
  if (meta.pair || meta.warn) continue;
  for (const r of rows) if (r._rank <= 3) (titles[r.name] ||= []).push(meta.id);
}
const POSC = { GK: ['からし色', '#8C6A12'], DF: ['青', '#2F5E9E'], MF: ['緑', '#2E7D4F'], FW: ['紫', '#6A44A0'] };
const BIG = ['グレート・ピレニーズ風の大型犬', 'バーニーズ・マウンテン・ドッグ風の大型犬', 'ジャーマン・シェパード風の大型犬', 'ゴールデン・レトリーバー風の大型犬', 'ドーベルマン風のすらっとした大型犬', '秋田犬風の大型犬', 'グレート・デーン風の大型犬', 'ニューファンドランド風の大型犬', 'ボルゾイ風のすらっとした大型犬', 'セント・バーナード風の大型犬'];
const MID = ['ボーダー・コリー風の中型犬', '柴犬風の中型犬', 'ビーグル風の中型犬', 'ダルメシアン風の中型犬', 'シベリアン・ハスキー風の中型犬', 'ウィペット風の細身の中型犬', 'オーストラリアン・シェパード風の中型犬', '甲斐犬風の中型犬', 'ブリタニー・スパニエル風の中型犬', 'ラブラドール風の中型犬', '北海道犬風の中型犬', 'ブルドッグ風のがっしりした中型犬', 'ボクサー風の中型犬', 'サモエド風のもふもふの中型犬', 'ウェルシュ・テリア風の中型犬', 'バセンジー風の中型犬', 'イングリッシュ・セッター風の中型犬', 'スタンダード・シュナウザー風の中型犬', '紀州犬風の白い中型犬', 'ビズラ風の中型犬', 'ブルテリア風の中型犬', 'シャー・ペイ風の中型犬'];
const SMALL = ['コーギー風の小型犬', 'ジャック・ラッセル・テリア風の小型犬', 'パピヨン風の小型犬', 'トイ・プードル風の小型犬', 'ミニチュア・シュナウザー風の小型犬', 'シェルティ風の小型犬', 'ポメラニアン風の小型犬', 'ミニチュア・ダックスフンド風の小型犬', 'フレンチ・ブルドッグ風の小型犬', 'ボストン・テリア風の小型犬'];
// 称号・年齢・背番号のように変わるものは使わない（一度作った画像を直さなくて済むように）。
// 使うのは変わらない情報だけ：ポジション（バンダナの色・ポーズ）・身長（犬の大きさ）・出身地（宮崎出身のみワッペン）。
const POSES = {
  GK: ['両手を広げてセーブの構え', 'ボールをがっちり胸でキャッチ', '大きくジャンプしてボールをはじく', 'ゴール前で腰を落として構える'],
  DF: ['低く構えて相手をマークする守備の姿勢', 'スライディングでボールを止める', '胸を張って立ちはだかる', 'ヘディングでボールをはね返す', '前を向いて味方に声をかける', 'ボールを大きく蹴り出す', '相手の前に回り込んでボールをカットする', '腕を組んで頼もしく立つ', '高く跳んで競り合う', '仲間とハイタッチする'],
  MF: ['ボールを足もとに置き、顔を上げて周りを見渡す', '前足でやさしくパスを出す', 'ドリブルで駆け上がる', 'ボールをトラップする', '軽やかにターンする', '遠くを指さして味方に合図する', 'ボールを持って前へ走り出す', 'インサイドキックでパスを出す', 'リフティングをする', 'ボールを追いかけて走る', '両手を広げて走る', 'ヒールでボールを流す', 'ボールの上に前足をのせて一休み', 'ロングパスを蹴る'],
  FW: ['思い切りシュートを打つ', 'ゴールに向かって走り出す', 'ジャンプしてヘディングシュート', 'ゴールを決めてガッツポーズ'],
};
// 一度決めた犬種・ポーズは src/data/dogs.csv に保存し、二度と変えない（作った画像を直さなくて済むように）。
// まだ決まっていない選手（新加入）だけ、チーム内でほかと重ならない犬種と、ポジション内で重ならないポーズを割り当てる。
const DOGS = 'src/data/dogs.csv';
const saved = fs.existsSync(DOGS) ? fs.readFileSync(DOGS, 'utf8').trim().split('\n').slice(1).map(l => { const [name, breed, pose] = l.split(','); return { name, breed, pose }; }) : [];
const byName = Object.fromEntries(saved.map(r => [r.name, r]));
const idOf = Object.fromEntries(d.players.map(p => [p.name, (String(p.jl_url).match(/player\/(\d+)/) || [])[1] || '']));
const order = ['GK', 'DF', 'MF', 'FW'];
const players = [...d.profiles].sort((a, b) => order.indexOf(a.pos) - order.indexOf(b.pos) || a.name.localeCompare(b.name, 'ja'));
for (const p of players) {
  if (byName[p.name]) continue;
  const h = Number(p.height) || 0;
  const pool = h >= 186 ? BIG : h && h <= 167 ? SMALL : MID;
  const takenB = new Set(Object.values(byName).map(r => r.breed));
  const breed = pool.find(b => !takenB.has(b)) || [...BIG, ...MID, ...SMALL].find(b => !takenB.has(b)) || pool[0];
  const poses = POSES[p.pos] || POSES.MF;
  const takenP = new Set(Object.values(byName).filter(r => (d.profiles.find(x => x.name === r.name) || {}).pos === p.pos).map(r => r.pose));
  const pose = poses.find(x => !takenP.has(x)) || poses[Object.keys(byName).length % poses.length];
  byName[p.name] = { name: p.name, breed, pose };
}
fs.writeFileSync(DOGS, 'name,breed,pose\n' + Object.values(byName).map(r => [r.name, r.breed, r.pose].join(',')).join('\n') + '\n');
const blocks = players.map(p => {
  const { breed, pose } = byName[p.name];
  const h = Number(p.height) || 0;
  const body = /大型犬/.test(breed) ? '背が高く大柄' : /小型犬/.test(breed) ? '小柄ですばしっこい' : 'バランスのよい体つき';
  const file = idOf[p.name] ? `public/chars/players/${idOf[p.name]}.webp` : `public/chars/players/（Jリーグ選手IDが決まったら）.webp`;
  const c = POSC[p.pos] || ['グレー', '#8A8A8A'];
  const extra = p.birthplace === '宮崎' ? '・特徴：胸に「太陽とヤシの木」の小さなワッペン（地元・宮崎出身）\n' : '';
  return `### ${p.name}（${p.pos}）

保存先：\`${file}\`

\`\`\`
共通ルールで1匹描いてください。
・犬種：${breed}（${body}）
・バンダナの色：${c[0]}（${c[1]}）
・ポーズ：${pose}
${extra}\`\`\`
`;
});
const head = fs.readFileSync('docs/dog-illustration-prompts.md', 'utf8').split('## 選手ごとのプロンプト')[0];
fs.writeFileSync('docs/dog-illustration-prompts.md', head + `## 選手ごとのプロンプト

称号・年齢・背番号のように変わる情報は使っていないので、一度作った画像は作り直す必要がありません。使っているのは、ポジション（バンダナの色とポーズ）・身長（犬の大きさ）・出身地（宮崎出身だけワッペン）です。顔や見た目は使っていません。新しい選手が加入したら \`node tools/dog_prompts.mjs\` を実行すると、その選手のプロンプトが追加されます（既存の選手のプロンプトは変わりません）。

` + blocks.join('\n'));
console.log(blocks.length);
