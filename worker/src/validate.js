// 投稿の中身の点検（Worker とテストの両方で使う純粋関数）

export const LIMITS = { name: 60, area: 30, info: 300, body: 4096 };

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
