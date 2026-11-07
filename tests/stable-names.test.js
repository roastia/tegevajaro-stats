// CSS・JS のファイル名から記号を外す（integrations/stable-names.mjs）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stableName } from '../integrations/stable-names.mjs';

test('ファイル名の記号（.AbCd1234）を外す', () => {
  assert.equal(stableName('Base.DJQrAFRl.css'), 'Base.css');
  assert.equal(stableName('page.B3sWyS9n.js'), 'page.js');
  assert.equal(stableName('Base.astro_astro_type_script_index_0_lang.DJQrAFRl.js'), 'Base.astro_astro_type_script_index_0_lang.js');
  assert.equal(stableName('Base.css'), 'Base.css');
  assert.equal(stableName('logo.png'), 'logo.png');
});
