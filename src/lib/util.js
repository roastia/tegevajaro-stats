// 表示まわりの小さな道具（ビルド時とブラウザの両方で使う）
import { ICONS } from './meta.js';
import { SITE } from '../config/site.js';

/** 線画アイコンの SVG 文字列 */
export function icon(name, cls = 'ic') {
  const body = ICONS[name] || ICONS.sparkle;
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

/** 文の中の「X」をロゴにしたもの（「〇〇を X でポスト」の X。読み上げでは「X」と読む） */
export const xLabel = label => label.split('X').join(X_MARK.replace('class="xm"', 'class="xm xin"').replace('aria-hidden="true"', 'role="img" aria-label="X"'));
export const X_MARK = '<svg class="xm" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>';

/** サイト内のパス（GitHub Pages のサブパスを付ける） */
export const href = p => (import.meta.env?.BASE_URL || '/').replace(/\/$/, '') + '/' + String(p).replace(/^\//, '');

/** X の投稿画面へのリンク。url を付けるとリンクカード（画像つき）が出る */
/** ポスト文は改行を使わず1行に（最後に「（第〇節時点）」を付ける）：行の終わりに句点（。）を足し、！？のあとは空白、ハッシュタグの前は空白でつなぐ */
export const flatPost = (text, asOf = '') => {
  const parts = String(text || '').split('\n').map(s => s.trim()).filter(Boolean);
  const tag = asOf ? `（${asOf}時点）` : '';
  if (tag && !parts.some(p => p.startsWith('#'))) parts.push(parts.pop() + tag);
  return parts.map((p, i) => {
    const next = parts[i + 1];
    if (!next) return p;
    if (next.startsWith('#') && !p.startsWith('#')) return p + tag + ' ';
    if (next.startsWith('#') || p.startsWith('#')) return p + ' ';
    if (/[。]$/.test(p)) return p;
    if (/[！？!?]$/.test(p)) return p + ' ';
    return p + '。';
  }).join('');
};
// asOf：本文の最後に付ける「（第〇節時点）」。チームデータ・誕生日のポストは '' で付けない
export function xIntent(text, url, asOf = SITE.roundLabel) {
  const q = new URLSearchParams({ text: flatPost(text, asOf) });
  if (url) q.set('url', url);
  return 'https://twitter.com/intent/tweet?' + q.toString();
}

/** ポスト文。見出し・補足・応援・ハッシュタグ */
export const postText = (headline, sub, cheer) =>
  `${headline}\n${sub}${cheer ? '\n' + cheer : ''}\n${SITE.hashtags}`;

/** X の文字数（全角は2として数え、URL は23） */
export const xLength = (text, url) => [...text].reduce((n, c) => n + (c.codePointAt(0) > 0x10ff ? 2 : 1), 0) + (url ? 24 : 0);

// ポジションの色：ブランドのピンクと被らない4色（白文字で 4.5:1 以上）
export const POS_COLOR = { GK: '#8C6A12', DF: '#2F5E9E', MF: '#2E7D4F', FW: '#6A44A0' };

/** 公式サイト・YouTube 以外の URL は出さない */
export const safeUrl = u => /^https:\/\/(www\.)?(youtube\.com|youtu\.be|jleague\.jp)\//.test(u || '') ? u : '';
export const playerUrl = u => /^https:\/\/www\.jleague\.jp\/player\/\d+\/$/.test(u || '') ? u : '';

/** 「メインの数字（内訳）」をメインと内訳に分ける。内訳はタップしたときだけ見せる */
export function splitDisp(s) {
  s = String(s || '');
  const i = s.indexOf('（');
  if (i < 0) return [s, ''];
  return [s.slice(0, i), s.slice(i).replace(/）／/g, '／').replace(/）・/g, '・').replace(/[（）]/g, ' ').replace(/\s+/g, ' ').trim()];
}

/** X のアカウント名（英数字と _ の15文字まで）なら https://x.com/〇〇、それ以外は空 */
export const xUrl = h => /^[A-Za-z0-9_]{1,15}$/.test(String(h || '')) ? `https://x.com/${h}` : '';
/** 緯度経度から Google マップのリンク */
/** おすすめスポットの公式サイト（https だけ。確かめて spots.csv の url に入れたもの） */
export const siteUrl = u => /^https:\/\/[^\s<>"']+$/.test(u || '') ? u : '';
// Google マップ：place_id があればそのお店・施設のページを開く（緯度経度だけだと、ただのピンになる）
export const mapsUrl = (lat, lng, name = '', placeId = '') => {
  if (/^[A-Za-z0-9_-]{10,}$/.test(placeId || '') && name) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${placeId}`;
  return Number.isFinite(+lat) && Number.isFinite(+lng) && lat !== '' && lng !== '' ? `https://www.google.com/maps/search/?api=1&query=${+lat},${+lng}` : '';
};

/** ホームスタジアム（Google マップの施設の位置。いちご宮崎新富サッカー場の公式サイトの地図リンクから） */
export const STADIUM = { name: 'いちご宮崎新富サッカー場', lat: 32.0737818, lng: 131.4909384 };
/** 2点の直線距離（km）。地球を半径6371kmの球として計算 */
export function distanceKm(lat1, lng1, lat2, lng2) {
  const r = d => d * Math.PI / 180, R = 6371;
  const a = Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lng2 - lng1) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
/** 「約1.2km」「約300m」「約25km」の形 */
export function distanceLabel(km) {
  if (!Number.isFinite(km)) return '';
  if (km < 1) return `約${Math.max(100, Math.round(km * 10) * 100)}m`;
  if (km < 10) return `約${km.toFixed(1)}km`;
  return `約${Math.round(km)}km`;
}
