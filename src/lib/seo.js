// 検索・AI 向けの説明（構造化データ・Q&A・llms.txt）。どれもサイトに載っている数字だけから作る（推測を足さない）
import { SITE } from '../config/site.js';
import { STADIUM, playerUrl, siteUrl } from './util.js';
import { seasonRecord } from './form.js';
import { nextMatch } from './nextmatch.js';

export const TEAM = {
  '@type': 'SportsTeam',
  name: SITE.team,
  sport: 'サッカー',
  url: 'https://www.tegevajaro.com/',
  sameAs: ['https://www.tegevajaro.com/', 'https://www.jleague.jp/club/miyazaki/day/'],
  location: { '@type': 'Place', name: '宮崎県' },
};

const WD = ['日', '月', '火', '水', '木', '金', '土'];
const md = s => { const [y, m, d] = s.split('-').map(Number); return `${m}月${d}日（${WD[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]}）`; };

/** 今季の要点（Q&A と llms.txt で使う）。ビルドした日の時点 */
export function facts(d, fixtures, now = new Date()) {
  const sr = seasonRecord(d.matches);
  const maxG = Math.max(0, ...d.players.map(p => Number(p.goals) || 0));
  const scorers = maxG ? d.players.filter(p => Number(p.goals) === maxG).map(p => p.name) : [];
  const lite = d.matches.map(m => ({ round: m.round, opponent: m.opponent, gf: m.gf, ga: m.ga, result: m.result }));
  const nx = nextMatch(fixtures, lite, now);
  return { sr, maxG, scorers, nx: nx && nx.fx };
}

/** よくある質問（トップページに見える形で出し、FAQPage にもする） */
export function faqItems(d, fixtures, now = new Date()) {
  const { sr, maxG, scorers, nx } = facts(d, fixtures, now);
  const at = `${SITE.roundLabel}時点`;
  const q = [];
  if (SITE.rank) q.push({ q: `${SITE.team}の今の順位は？`, a: `J2で${SITE.rank}位${SITE.rankPending ? '（暫定）' : ''}です（${at}）。成績は${sr.w}勝${sr.d}分${sr.l}敗、勝ち点${sr.pts}、${sr.gf}得点・${sr.ga}失点。` });
  if (scorers.length) q.push({ q: `${SITE.team}の今季のチーム得点王は？`, a: `${scorers.join('・')}選手の${maxG}得点です（J2リーグ戦、${at}）。` });
  if (nx) q.push({ q: `${SITE.team}の次の試合は？`, a: `第${nx.round}節、${md(nx.date)}${nx.kickoff ? nx.kickoff + 'キックオフ' : '（キックオフ時間は未定）'}、${nx.ha === 'H' ? 'ホーム' : 'アウェイ'}の${nx.opponent_full || nx.opponent}戦です。会場は${nx.venue}。` });
  q.push({ q: `${SITE.team}のホームスタジアムは？`, a: `宮崎県児湯郡新富町の「${STADIUM.name}」です。` });
  q.push({ q: `${SITE.name}とは？`, a: `${SITE.team}を応援する個人が運営する、非公式のサポーターサイトです。Jリーグ公式サイトなどの公開データから、選手ランキング・注目トピック・試合ハイライト・日程・宮崎の観戦情報をまとめています。クラブ公式のサイトではありません。` });
  return q;
}

export const faqLd = items => ({ '@context': 'https://schema.org', '@type': 'FAQPage',
  mainEntity: items.map(x => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: x.a } })) });

/** これからの試合（SportsEvent）。日本時間で書く */
export function eventsLd(fixtures) {
  return { '@context': 'https://schema.org', '@type': 'ItemList', name: `${SITE.team}の試合日程`,
    itemListElement: fixtures.map((f, i) => {
      const other = { '@type': 'SportsTeam', name: f.opponent_full || f.opponent };
      return { '@type': 'ListItem', position: i + 1, item: {
        '@type': 'SportsEvent',
        name: `明治安田J2リーグ 第${f.round}節 ${f.ha === 'H' ? `${SITE.team} vs ${other.name}` : `${other.name} vs ${SITE.team}`}`,
        startDate: f.kickoff ? `${f.date}T${f.kickoff}:00+09:00` : f.date,
        eventStatus: 'https://schema.org/EventScheduled',
        sport: 'サッカー',
        location: { '@type': 'Place', name: f.venue },
        homeTeam: f.ha === 'H' ? TEAM : other,
        awayTeam: f.ha === 'H' ? other : TEAM,
      } };
    }) };
}

/** 選手（名前・Jリーグ公式の選手ページ・所属） */
export function playersLd(profiles, players) {
  const urlOf = new Map(players.map(p => [p.name, playerUrl(p.jl_url)]));
  return { '@context': 'https://schema.org', '@type': 'ItemList', name: `${SITE.team}の選手`,
    itemListElement: profiles.map((p, i) => ({ '@type': 'ListItem', position: i + 1, item: {
      '@type': 'Person', name: p.name, ...(urlOf.get(p.name) ? { url: urlOf.get(p.name) } : {}),
      memberOf: { '@type': 'SportsTeam', name: SITE.team }, description: `${p.pos}・背番号${p.no}`,
    } })) };
}

/** リンク集 */
export const linksLd = rows => ({ '@context': 'https://schema.org', '@type': 'ItemList', name: `${SITE.team}のリンク集`,
  itemListElement: rows.map((r, i) => ({ '@type': 'ListItem', position: i + 1, name: r.name, url: siteUrl(r.url) })) });

/** おすすめスポット（名前・市町村・位置） */
export const spotsLd = rows => ({ '@context': 'https://schema.org', '@type': 'ItemList', name: '宮崎のおすすめスポット（テゲサポ推薦）',
  itemListElement: rows.map((s, i) => ({ '@type': 'ListItem', position: i + 1, item: {
    '@type': 'Place', name: s.name, address: { '@type': 'PostalAddress', addressRegion: '宮崎県', addressLocality: s.area },
    geo: { '@type': 'GeoCoordinates', latitude: Number(s.lat), longitude: Number(s.lng) },
  } })) });
