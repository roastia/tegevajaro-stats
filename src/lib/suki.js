// テゲスキ！（テゲバの好きなところ）：テゲサポの声をスレッドのように並べる。src/data/suki.json（確認して整えた声だけ）を読む
// 1件の形：{ id: 'k12'（受付の番号）, no: 2（レス番号。1 はスレ立て）, date: 'YYYY-MM-DD', time: 'HH:MM'（任意）,
//            nickname: ''（空なら「テゲサポさん」）, body: '本文（改行あり。>>12 で返信）', tags: ['選手', …] }
// タグは届いた声を読んでこちらで付ける（並びと説明は下の SUKI_TAGS。ここにないタグは使わない）
import fs from 'node:fs';
import path from 'node:path';
import { SITE } from '../config/site.js';

export const SUKI_TAGS = [
  ['選手', '好きな選手・選手のプレーや人柄'],
  ['ゴール', 'ゴールや試合の名場面'],
  ['応援', 'ゴール裏・チャント・応援の熱さ'],
  ['スタジアム', 'ホームのスタジアムの雰囲気'],
  ['思い出', '忘れられない試合・はじめての観戦'],
  ['遠征', 'アウェイへの遠征'],
  ['宮崎', '宮崎の街・食べもの・人'],
  ['クラブ', 'クラブの姿勢・スタッフ・イベント'],
  ['家族・仲間', '家族や仲間と応援する楽しさ'],
  ['未来', 'これからのテゲバへの期待'],
];
export const NICK_DEFAULT = 'テゲサポさん';
export const QUOTE_LEN = 50;   // X でポストするときに引用する長さ（越えたら「～」で切る）

// 書くときのお題：押すと本文の欄に書き出しが入る（書き出しのあとを自由に）
export const SUKI_THEMES = [
  { t: 'はじめて観戦した日', s: 'はじめてテゲバの試合を見たのは、' },
  { t: '好きな選手', s: '〇〇選手が好き。なぜなら、' },
  { t: '忘れられないゴール', s: 'いちばん忘れられないゴールは、' },
  { t: 'スタジアムのここが好き', s: 'ホームのスタジアムでいちばん好きなのは、' },
  { t: '応援で鳥肌が立った瞬間', s: '応援していていちばん鳥肌が立ったのは、' },
  { t: '遠征の思い出', s: 'アウェイ遠征でいちばんの思い出は、' },
  { t: '宮崎とテゲバ', s: '宮崎にテゲバがあってよかったと思うのは、' },
  { t: 'テゲバをすすめるなら', s: 'まだテゲバを知らない人にすすめるなら、' },
];

/** 試合の日・次の日だけのお題（ビルドした日の日付で決める。毎日 0:05 に作り直す） */
export function matchTheme(today, matchDates) {
  const prev = new Date(Date.parse(today + 'T00:00:00Z') - 86400e3).toISOString().slice(0, 10);
  if (matchDates.includes(today)) return { t: '今日の試合', s: '今日の試合でグッときたのは、', live: '試合の日のお題' };
  if (matchDates.includes(prev)) return { t: '昨日の試合', s: '昨日の試合でグッときたのは、', live: '試合のあとのお題' };
  return null;
}

export function readSuki() {
  let rows = [];
  const load = f => { try { return JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/data', f), 'utf8')); } catch { return []; } };
  rows = load('suki.json');
  // テスト用サイトで、まだ声が1件もないときは見本（src/data/suki-sample.json）を並べて見た目を確かめる。本番では使わない
  if (SITE.test && !rows.length) rows = load('suki-sample.json');
  const tagSet = new Set(SUKI_TAGS.map(t => t[0]));
  return rows
    .filter(r => r && /^k\d+$/.test(r.id) && Number.isInteger(r.no) && r.no >= 2 && /^\d{4}-\d{2}-\d{2}$/.test(r.date) && typeof r.body === 'string' && r.body.trim())
    .map(r => ({ ...r, nickname: String(r.nickname || '').trim(), time: /^\d{1,2}:\d{2}$/.test(r.time || '') ? r.time : '', body: r.body.trim(), tags: (r.tags || []).filter(t => tagSet.has(t)) }))
    .sort((a, b) => a.no - b.no);
}

export const nickOf = r => r.nickname ? `${r.nickname}さん`.replace(/さんさん$/, 'さん') : NICK_DEFAULT;

/** 本文の >>12（返信）をすべて拾う */
export const anchorsOf = body => [...String(body).matchAll(/(?:>>|＞＞)(\d{1,5})/g)].map(m => Number(m[1]));

/** 本文を HTML に：文字はエスケープし、>>12 だけをそのレスへのリンクに（改行は CSS の pre-line でそのまま） */
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export function bodyHtml(body, nos) {
  return esc(body).replace(/(?:&gt;&gt;|＞＞)(\d{1,5})/g, (m, n) => (n === '1' || nos.has(Number(n)) ? `<a class="anc" href="#r${n}" data-no="${n}">&gt;&gt;${n}</a>` : m));
}

/** X でポストする文：先頭50字を引用（長いときは「～」）。>>12 は外す。ポストする人は、この前に自分のひとことを書き足す */
export function sukiPost(r) {
  const flat = r.body.replace(/(?:>>|＞＞)\d{1,5}\s*/g, '').replace(/\s*\n+\s*/g, ' ').trim();
  const chars = [...flat];
  const q = chars.length > QUOTE_LEN ? chars.slice(0, QUOTE_LEN).join('').replace(/[、。,.!！?？\s]+$/u, '') + '～' : flat;
  return `「${q}」— ${nickOf(r)}のテゲスキ！\n${SITE.hashtags}`;
}

/** タグごとの数（多い順。0件のタグは出さない） */
export function tagCounts(rows) {
  return SUKI_TAGS.map(([t, d]) => ({ tag: t, desc: d, n: rows.filter(r => r.tags.includes(t)).length })).filter(x => x.n).sort((a, b) => b.n - a.n);
}
