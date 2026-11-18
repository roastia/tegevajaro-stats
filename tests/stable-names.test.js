// CSS・JS のファイル名から記号を外す（integrations/stable-names.mjs）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stableName, withVersion } from '../integrations/stable-names.mjs';

test('ファイル名の記号（.AbCd1234）を外す', () => {
  assert.equal(stableName('Base.DJQrAFRl.css'), 'Base.css');
  assert.equal(stableName('page.B3sWyS9n.js'), 'page.js');
  assert.equal(stableName('Base.astro_astro_type_script_index_0_lang.DJQrAFRl.js'), 'Base.astro_astro_type_script_index_0_lang.js');
  assert.equal(stableName('Base.css'), 'Base.css');
  assert.equal(stableName('logo.png'), 'logo.png');
});

test('参照に中身から作った ?v= を付ける（名前は同じでも、中身が変わったら新しく読む）', () => {
  assert.equal(withVersion('<script type="module" src="/_astro/page.js"></script><link href="/_astro/Base.css">', 'ab12cd34', false),
    '<script type="module" src="/_astro/page.js?v=ab12cd34"></script><link href="/_astro/Base.css?v=ab12cd34">');
  assert.equal(withVersion('import{a}from"./util.js";import "./page.js";', 'ab12cd34', true), 'import{a}from"./util.js?v=ab12cd34";import "./page.js?v=ab12cd34";');
  assert.equal(withVersion('import{a}from"./util.js";', 'ab12cd34', false), 'import{a}from"./util.js";');
});
