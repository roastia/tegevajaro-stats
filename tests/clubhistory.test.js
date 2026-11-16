// 歴史のページの検算：得点者の数とスコア、シーズンの成績が公式の値と合うか
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readCsv } from '../src/lib/data.js';
import { loadHistory, record, COMP } from '../src/lib/clubhistory.js';

const { matches, seasons } = loadHistory();

test('過去の試合：得点者の数がスコアと一致する', () => {
  for (const m of matches) assert.equal(m.goals.length, m.gf, `${m.id} の得点者 ${m.goals.length}人 ≠ ${m.gf}点`);
});

test('過去の試合：大会・ホーム/アウェイ・日付の形がそろっている', () => {
  for (const m of readCsv('history_matches')) {
    assert.ok(COMP[m.comp], `大会のコード ${m.comp}`);
    assert.match(m.ha, /^[HA]$/);
    assert.match(m.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(m.pk_for === '', m.pk_against === '', `${m.id} の PK はそろえて入れる`);
    if (m.pk_for !== '') assert.equal(m.gf, m.ga, `${m.id} PK戦は同点のときだけ`);
  }
});

// Football LAB のシーズン比較（https://www.football-lab.jp/myzk/season/）と同じ成績になるか
test('J3 のシーズン成績が公式の値と一致する', () => {
  const want = { 2021: [16, 5, 7, 44, 31], 2022: [12, 10, 12, 45, 47], 2023: [9, 12, 17, 31, 52], 2024: [12, 10, 16, 46, 50], 2025: [19, 10, 9, 61, 45] };
  for (const [y, v] of Object.entries(want)) {
    const r = record(matches.filter(m => m.season === y && m.comp === 'j3'));
    assert.deepEqual([r.w, r.d, r.l, r.gf, r.ga], v, `${y}年`);
  }
});

test('シーズンの表に、試合のあるシーズンがすべてある', () => {
  const have = new Set(seasons.map(s => s.season));
  for (const s of new Set(matches.map(m => m.season))) assert.ok(have.has(s), `history_seasons.csv に ${s} がない`);
});

// カップ戦・プレーオフ（Jリーグ公式の試合ページと、JFA・Goal・ゲキサカ・サッカーキングの記事で確かめた試合数と勝敗）
test('カップ戦・プレーオフの試合数と勝敗', () => {
  const want = { emperor: [7, 4, 0, 3], leaguecup: [3, 0, 0, 3], j2playoff: [2, 2, 0, 0] };
  for (const [c, v] of Object.entries(want)) {
    const r = record(matches.filter(m => m.comp === c));
    assert.deepEqual([r.p, r.w, r.d, r.l], v, c);
  }
});
