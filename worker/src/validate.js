// 投稿の中身の点検（Worker とテストの両方で使う純粋関数）

export const LIMITS = { name: 60, area: 30, info: 300, url: 300, body: 4096 };

// 制御文字・見えない文字（ゼロ幅・方向制御）を取り除き、空白をまとめる
const clean = (s, max) => String(s ?? '')
  .normalize('NFKC')
  .replace(/[\u0000-\u001F\u007F-\u009F​-‏‪-‮⁦-⁩﻿]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, max + 1);

const URL_RE = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|jp|io|xyz|info|org|ly|me)\b)/i;

/**
 * @returns {{ ok: true, value: {name:string, area:string, info:string, x_handle:string} } | { ok: false, error: string }}
 */
export function validateSubmission(input) {
  if (!input || typeof input !== 'object') return { ok: false, error: '送信内容を読み取れませんでした' };
  // ボット用のおとり欄（画面には出さない）。入っていたらボット
  if (String(input.website ?? '').trim() !== '') return { ok: false, error: '送信できませんでした' };
  const name = clean(input.name, LIMITS.name);
  const area = clean(input.area, LIMITS.area);
  const info = clean(input.info, LIMITS.info);
  let x = clean(input.x_handle, 20).replace(/^@/, '');
  if (!name) return { ok: false, error: '場所の名前を入れてください' };
  if (name.length > LIMITS.name) return { ok: false, error: `場所の名前は${LIMITS.name}文字までです` };
  if (area.length > LIMITS.area) return { ok: false, error: `エリアは${LIMITS.area}文字までです` };
  if (!info) return { ok: false, error: 'ひとこと情報を入れてください' };
  if (info.length > LIMITS.info) return { ok: false, error: `ひとこと情報は${LIMITS.info}文字までです` };
  if ([name, area, info].some(s => URL_RE.test(s))) return { ok: false, error: 'URL は入れられません（場所の名前で探して載せます）' };
  if (x && !/^[A-Za-z0-9_]{1,15}$/.test(x)) return { ok: false, error: 'X のユーザー名は「@」のあとの英数字（と _）を15文字まで入れてください' };
  return { ok: true, value: { name, area, info, x_handle: x } };
}

/** 同じ内容かどうかを比べるためのキー（大文字小文字・空白・記号のちがいは同じとみなす） */
export const contentKey = (name, info) => [name, info]
  .map(s => String(s || '').normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}ー〜～]/gu, ''))
  .join('|');

/** 文字列の SHA-256（16進） */
export async function sha256(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(s)));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/** 日本時間の日付 YYYY-MM-DD */
export const jstDay = (d = new Date()) => new Date(d.getTime() + 9 * 3600e3).toISOString().slice(0, 10);

/** IP を、その日だけ有効な鍵で HMAC-SHA256 にする（元の IP には戻せない。日が変わると別の値になる） */
export async function ipHash(ip, secret, day) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(`${secret}:${day}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(String(ip)));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// ハート：おすすめスポットの id（spots.csv の s1・s2 …）と、押した（true）か外した（false）か
export function validateHeart(input) {
  if (!input || typeof input !== 'object') return { ok: false };
  const id = typeof input.id === 'string' ? input.id : '';
  if (!/^s\d{1,4}$/.test(id) || typeof input.on !== 'boolean') return { ok: false };
  return { ok: true, value: { id, on: input.on } };
}

// スコア予想：試合（日付 YYYY-MM-DD）と、テゲバ・相手の点（0〜9）。負け予想（相手の点が多い）は受けない
export const YOSOU_MAX = 9;
export function validateYosou(input) {
  if (!input || typeof input !== 'object') return { ok: false };
  const { match, gf, ga } = input;
  if (typeof match !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(match)) return { ok: false };
  if (!Number.isInteger(gf) || !Number.isInteger(ga) || gf < 0 || ga < 0 || gf > YOSOU_MAX || ga > YOSOU_MAX) return { ok: false };
  if (ga > gf) return { ok: false };
  return { ok: true, value: { match, gf, ga } };
}

// リンク集への情報提供：テゲバの情報を載せているページの URL だけ
export function validateLink(input) {
  if (!input || typeof input !== 'object') return { ok: false, error: '送信内容を読み取れませんでした' };
  if (String(input.website ?? '').trim() !== '') return { ok: false, error: '送信できませんでした' };
  const raw = clean(input.url, LIMITS.url);
  if (!raw) return { ok: false, error: 'URL を入れてください' };
  if (raw.length > LIMITS.url) return { ok: false, error: `URL は${LIMITS.url}文字までです` };
  let u;
  try { u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`); } catch { return { ok: false, error: 'URL の形になっていないようです（https:// から始まるアドレスを入れてください）' }; }
  if (!/^https?:$/.test(u.protocol) || u.username || u.password || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(u.hostname) || /\s/.test(raw)) {
    return { ok: false, error: 'URL の形になっていないようです（https:// から始まるアドレスを入れてください）' };
  }
  return { ok: true, value: { url: u.href } };
}

// テゲスキ！（テゲバの好きなところ）：ニックネーム（任意・20字）と本文（600字）。改行は残す（3行以上の空きは2行に）。
// URL は受け付けない（宣伝よけ）。サイトに載せること・表現を整えることへの同意（agree: true）が必要
export const SUKI = { nick: 20, body: 600, min: 5 };
// 本文は全角の「！」「？」などをそのまま残すため NFC（NFKC だと半角になる）
const cleanText = (s, max) => String(s ?? '')
  .normalize('NFC')
  .replace(/\r\n?/g, '\n')
  .replace(/[\u0000-\u0009\u000B-\u001F\u007F-\u009F​-‏‪-‮⁦-⁩﻿]/g, ' ')
  .replace(/[ \t\u3000]+/g, m => (m.includes('\u3000') ? '\u3000' : ' '))
  .split('\n').map(l => l.trim()).join('\n')
  .replace(/\n{3,}/g, '\n\n')
  .trim()
  .slice(0, max + 1);
export function validateSuki(input) {
  if (!input || typeof input !== 'object') return { ok: false, error: '送信内容を読み取れませんでした' };
  if (String(input.website ?? '').trim() !== '') return { ok: false, error: '送信できませんでした' };
  if (input.agree !== true) return { ok: false, error: 'サイトに載せることへの同意にチェックを入れてください' };
  const nickname = clean(input.nickname, SUKI.nick);
  const body = cleanText(input.body, SUKI.body);
  if (nickname.length > SUKI.nick) return { ok: false, error: `ニックネームは${SUKI.nick}文字までです` };
  if ([...body].length < SUKI.min) return { ok: false, error: 'テゲバの好きなところを、もう少しくわしく書いてください' };
  if ([...body].length > SUKI.body) return { ok: false, error: `${SUKI.body}文字までで書いてください` };
  if (URL_RE.test(body) || URL_RE.test(nickname)) return { ok: false, error: 'URL は入れられません' };
  return { ok: true, value: { nickname, body } };
}

// 掲載をやめる依頼：対象（おすすめスポット s〇・リンク集 l〇・テゲスキ！ k〇）と理由。連絡先は受け取らない
export const REMOVAL_REASONS = ['自分が投稿した', 'お店・施設・場所の関係者', 'リンク先の運営者', '情報が古い・まちがっている', 'その他'];  // テゲスキ！の声も「自分が投稿した」などで
export function validateRemoval(input) {
  if (!input || typeof input !== 'object') return { ok: false, error: '送信内容を読み取れませんでした' };
  if (String(input.website ?? '').trim() !== '') return { ok: false, error: '送信できませんでした' };
  const item = typeof input.item === 'string' ? input.item : '';
  if (!/^[slk]\d{1,4}$/.test(item)) return { ok: false, error: '掲載をやめてほしいものを選んでください' };
  const reason = typeof input.reason === 'string' ? input.reason : '';
  if (!REMOVAL_REASONS.includes(reason)) return { ok: false, error: '理由を選んでください' };
  const note = clean(input.note, 200);
  if (note.length > 200) return { ok: false, error: 'ひとことは200文字までです' };
  return { ok: true, value: { item, reason, note } };
}
