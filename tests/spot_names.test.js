// おすすめスポットの名前の対応表（tools/spot_names.mjs）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readCsv } from '../src/lib/data.js';
import { buildSpotNamesSql } from '../tools/spot_names.mjs';

test('スポットの名前の対応表：spots.csv の全スポットが入り、id は重ならない', () => {
  const spots = readCsv('spots');
  const ids = spots.map(s => s.id);
  assert.equal(new Set(ids).size, ids.length);
  const sql = buildSpotNamesSql(spots);
  for (const s of spots) assert.ok(sql.includes(`VALUES ('${s.id}', `), s.id);
  assert.match(sql, /CREATE VIEW IF NOT EXISTS hearts_named/);
});

test("スポットの名前の対応表：' を含む名前も SQL を壊さない", () => {
  const sql = buildSpotNamesSql([{ id: 's9', name: "Bob's 珈琲", area: '宮崎市' }, { id: '', name: 'x' }]);
  assert.ok(sql.includes("'Bob''s 珈琲'"));
  assert.equal((sql.match(/INSERT/g) || []).length, 1);
});
