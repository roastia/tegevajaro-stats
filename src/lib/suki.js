// テゲスキ！（テゲバの好きなところ）：テゲサポの声。src/data/suki.json（確認して整えた声だけ）を読む
// 1件の形：{ id: 'k1', date: 'YYYY-MM-DD', nickname: ''（空なら「テゲサポさん」）, body: '本文（改行あり）', tags: ['選手', …] }
// タグは届いた声を読んでこちらで付ける（並びと説明は下の SUKI_TAGS。ここにないタグは使わない）
import fs from 'node:fs';
import path from 'node:path';
import { SITE } from '../config/site.js';

export const SUKI_TAGS = [
  ['選手', '好きな選手・選手のプレーや人柄'],
  ['ゴール', 'ゴールや試合の名場面'],
  ['応援', 'ゴール裏・チャント・応援の熱さ'],
  ['スタジアム', 'いちご宮崎新富サッカー場など、スタジアムの雰囲気'],
  ['思い出', '忘れられない試合・はじめての観戦'],
  ['遠征', 'アウェイへの遠征'],
  ['宮崎', '宮崎の街・食べもの・人'],
  ['クラブ', 'クラブの姿勢・スタッフ・イベント'],
  ['家族・仲間', '家族や仲間と応援する楽しさ'],
  ['未来', 'これからのテゲバへの期待'],
];
export const NICK_DEFAULT = 'テゲサポさん';
export const QUOTE_LEN = 50;   // X でポストするときに引用する長さ（越えたら「～」で切る）

export function readSuki() {
  let rows = [];
  try { rows = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/data/suki.json'), 'utf8')); } catch { rows = []; }
  const tagSet = new Set(SUKI_TAGS.map(t => t[0]));
  return rows
    .filter(r => r && /^k\d+$/.test(r.id) && /^\d{4}-\d{2}-\d{2}$/.test(r.date) && typeof r.body === 'string' && r.body.trim())
    .map(r => ({ ...r, nickname: String(r.nickname || '').trim(), body: r.body.trim(), tags: (r.tags || []).filter(t => tagSet.has(t)) }))
    .sort((a, b) => b.date.localeCompare(a.date) || Number(b.id.slice(1)) - Number(a.id.slice(1)));
}

export const nickOf = r => r.nickname ? `${r.nickname}さん`.replace(/さんさん$/, 'さん') : NICK_DEFAULT;

/** X でポストする文：先頭50字を引用（長いときは「～」）。ポストする人は、この前に自分のひとことを書き足す（サイトのポストは1行にまとまる：flatPost） */
export function sukiPost(r) {
  const flat = r.body.replace(/\s*\n+\s*/g, ' ');
  const chars = [...flat];
  const q = chars.length > QUOTE_LEN ? chars.slice(0, QUOTE_LEN).join('').replace(/[、。,.!！?？\s]+$/u, '') + '～' : flat;
  return `「${q}」— ${nickOf(r)}のテゲスキ！\n${SITE.hashtags}`;
}

/** タグごとの数（多い順。0件のタグは出さない） */
export function tagCounts(rows) {
  return SUKI_TAGS.map(([t, d]) => ({ tag: t, desc: d, n: rows.filter(r => r.tags.includes(t)).length })).filter(x => x.n).sort((a, b) => b.n - a.n);
}
