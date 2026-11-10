// llms.txt：AI 向けのサイト紹介（https://llmstxt.org の形）。数字はビルドした日の時点で、サイトに載っているものだけ
import { SITE } from '../config/site.js';
import { getData, readCsv } from '../lib/data.js';
import { facts, faqItems } from '../lib/seo.js';

export const GET = () => {
  const d = getData();
  const fixtures = readCsv('fixtures');
  const { sr } = facts(d, fixtures);
  const page = (p, name, what) => `- [${name}](${SITE.url}/${p}): ${what}`;
  const body = [
    `# ${SITE.name}（${SITE.tagline}）`,
    '',
    `> ${SITE.team}（J2）を応援する個人が運営する、非公式のサポーターサイト。Jリーグ公式サイトなどの公開データから、選手ランキング・注目トピック・試合ハイライト・日程・宮崎の観戦情報をまとめています。クラブ・Jリーグの公式サイトではありません。`,
    '',
    `- データの時点：${SITE.roundLabel}（${SITE.lastMatch}まで、${SITE.asOf}更新）。試合のあとに更新します`,
    `- 今季の成績：J2${SITE.rank ? ` ${SITE.rank}位${SITE.rankPending ? '（暫定）' : ''}` : ''}・${sr.w}勝${sr.d}分${sr.l}敗・勝ち点${sr.pts}・${sr.gf}得点${sr.ga}失点`,
    '- 出典：Jリーグ公式サイト（試合結果・出場記録・選手情報）、Football LAB（シュート・ゴール期待値などのプレーデータ）、クラブ公式サイト・各メディア',
    '- ランキングは公開データをもとに独自に集計したもので、公式記録ではありません',
    '',
    '## ページ',
    page('', '注目トピック', '今季の記録から作った話題・直近5試合の成績・よくある質問'),
    page('ranking/', '選手ランキング', '得点・アシスト・出場時間・決勝ゴールなど、選手ごとのランキング'),
    page('players/', '選手名鑑・チームデータ', '背番号・年齢・出身地・出身校、平均年齢などのチームデータ'),
    page('goals/', '試合ハイライト・スタメン', '各試合のハイライト動画・ゴール・スタメン'),
    page('schedule/', '試合日程', 'これからの試合（節・日時・ホーム／アウェイ・会場・前回の対戦）'),
    page('links/', 'リンク', 'テゲバを応援・発信している団体やYouTubeチャンネル'),
    page('chants/', 'チャント', '選手チャント・チームチャントのコール・原曲・音源（チャントは宮崎ブーゲンビリーバー作）'),
    page('spots/', 'みやざき情報', 'スタジアムへのアクセスと、テゲサポおすすめの宮崎のスポット'),
    page('updates/', '更新履歴', 'いつ何を更新したか'),
    '',
    '## よくある質問',
    ...faqItems(d, fixtures).map(x => `- ${x.q} ${x.a}`),
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
