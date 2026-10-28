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
const BIG = ['グレート・ピレニーズ風の大型犬', 'バーニーズ・マウンテン・ドッグ風の大型犬', 'ジャーマン・シェパード風の大型犬', 'ゴールデン・レトリーバー風の大型犬', 'ドーベルマン風のすらっとした大型犬', '秋田犬風の大型犬'];
const MID = ['ボーダー・コリー風の中型犬', '柴犬風の中型犬', 'ビーグル風の中型犬', 'ダルメシアン風の中型犬', 'シベリアン・ハスキー風の中型犬', 'ウィペット風の細身の中型犬', 'オーストラリアン・シェパード風の中型犬', '甲斐犬風の中型犬', 'ブリタニー・スパニエル風の中型犬', 'ラブラドール風の中型犬'];
const SMALL = ['コーギー風の小型犬', 'ジャック・ラッセル・テリア風の小型犬', 'パピヨン風の小型犬', 'トイ・プードル風の小型犬', 'ミニチュア・シュナウザー風の小型犬', 'シェルティ風の小型犬'];
// ポーズ（1つだけ）と、小物・表情（2つまで）。上にあるものほど優先
const POSE = [
  ['keeper', '大きなゴールキーパーグローブで、両手を広げてセーブの構え'],
  ['tall', '高くジャンプしてヘディングする姿（背の高さが伝わる）'],
  ['points', 'シュートを決めた直後のガッツポーズ'],
  ['shooter', '思い切りシュートを打つ瞬間'],
  ['iron', 'リストバンドを付け、汗をきらりと光らせて走り続ける姿'],
  ['wall', '胸を張って立ちはだかる守備の姿勢'],
  ['hub', '前足でやさしくパスを出し、点線のパスコースが伸びている'],
  ['creator', '前足でやさしくパスを出し、点線のパスコースが伸びている'],
  ['impact', 'ベンチから勢いよく飛び出してくる姿'],
  ['super_sub', 'ベンチから勢いよく飛び出してくる姿'],
  ['ball', '素早くボールを奪い取る瞬間'],
];
const ACC = [
  ['streak', '足もとのボールに小さな炎のエフェクト（ゴールが止まらない）'],
  ['lucky', '耳に四つ葉のクローバーをさしている'],
  ['chose', '胸に「太陽とヤシの木」の小さなワッペン（宮崎を選んだ）'],
  ['career_len', 'ステッカーがたくさん貼られた小さなスーツケースを持っている'],
  ['distance', '小さなリュックと地図を持っている（遠くから宮崎へ）'],
  ['clean', 'さわやかな笑顔'],
  ['veteran', '落ち着いた頼れる表情'],
  ['young', '元気いっぱいの若々しい表情'],
];
const DEFAULT_POSE = { GK: 'ゴールキーパーグローブでボールをがっちりキャッチ', DF: '低く構えて相手をマークする守備の姿勢', MF: 'ボールを足もとに置き、顔を上げて周りを見渡す姿', FW: 'ゴールに向かって走り出す前のめりの姿勢' };
let bi = 0, mi = 0, si = 0;
const blocks = [...d.profiles].sort((a, b) => Number(a.no) - Number(b.no)).map(p => {
  const h = Number(p.height) || 0, age = ageOf[p.name], ts = titles[p.name] || [];
  const breed = h >= 186 ? BIG[bi++ % BIG.length] : h && h <= 167 ? SMALL[si++ % SMALL.length] : MID[mi++ % MID.length];
  const body = h >= 186 ? '背が高く大柄' : h && h <= 167 ? '小柄ですばしっこい' : 'バランスのよい体つき';
  const pose = (POSE.find(([k]) => ts.includes(k)) || [, DEFAULT_POSE[p.pos]])[1];
  const acc = ACC.filter(([k]) => ts.includes(k)).map(([, v]) => v);
  if (p.birthplace === '宮崎' && !acc.some(v => v.includes('ヤシ'))) acc.unshift('胸に「太陽とヤシの木」の小さなワッペン（地元・宮崎出身）');
  if (age !== '' && age != null && Number(age) <= 21) acc.push('まだ子犬らしい丸い体つき');
  const c = POSC[p.pos] || ['グレー', '#8A8A8A'];
  return `### 背番号${p.no} ${p.name}（${p.pos}）

\`\`\`
共通ルールで1匹描いてください。
・犬種：${breed}（${body}）
・バンダナの色：${c[0]}（${c[1]}）
・首輪タグの背番号：${p.no}
・ポーズ：${pose}
${acc.length ? `・特徴：${acc.slice(0, 2).join('／')}` : '・特徴：にっこり笑顔'}
\`\`\`
`;
});
const head = fs.readFileSync('docs/dog-illustration-prompts.md', 'utf8').split('## 選手ごとのプロンプト')[0];
fs.writeFileSync('docs/dog-illustration-prompts.md', head + `## 選手ごとのプロンプト

ポーズと特徴は、このサイトのランキングで3位以内に入った称号（${SITE.roundLabel}時点）・背の高さ・年齢・出身地から自動で作っています。顔や見た目は使っていません。作り直すときは \`node tools/dog_prompts.mjs\` を実行します。

` + blocks.join('\n'));
console.log(blocks.length);
