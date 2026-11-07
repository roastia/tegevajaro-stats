// パタパタ（めくり式）の得点板ふうカウントダウン。数字が変わると上半分が倒れて下半分が出てくる
// ブラウザだけで使う。ダッシュボード版にも同じもの（index.html の makeFlipBoard）
// 動きを減らす設定の端末では、めくらずに数字だけ変える

const UNITS = [['d', '日'], ['h', '時間'], ['m', '分'], ['s', '秒']];

// めくり終わったら下半分を新しい数字にする
const wire = f => f.addEventListener('animationend', e => {
  if (e.target.classList.contains('fl-fb')) { f.querySelector('.fl-b').textContent = f.dataset.v; f.classList.remove('go'); }
});

function flap(doc) {
  const f = doc.createElement('span'); f.className = 'fl';
  for (const c of ['fl-t', 'fl-b', 'fl-ft', 'fl-fb']) { const x = doc.createElement('span'); x.className = c; x.textContent = '0'; f.appendChild(x); }
  wire(f);
  f.dataset.v = '0';
  return f;
}

function flip(f, v, still) {
  if (f.dataset.v === v) return;
  const [t, b, ft, fb] = f.children;
  const old = f.dataset.v;
  f.dataset.v = v;
  if (still) { t.textContent = b.textContent = v; return; }
  t.textContent = v; b.textContent = old; ft.textContent = old; fb.textContent = v;
  f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');   // めくりの動きをはじめから
}

/** 得点板を作る。set({d,h,m,s}) で数字を変える。
 *  existing にページに書き出してある空の得点板（.fb）を渡すと、作り直さずにそれを使う（チラつかないように） */
export function makeFlipBoard(doc = document, existing = null) {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const groups = {};
  let el = existing;
  if (el) {
    el.querySelectorAll('.fb-ds').forEach((ds, i) => { groups[UNITS[i][0]] = ds; });
    el.querySelectorAll('.fl').forEach(wire);
  } else {
    el = doc.createElement('div'); el.className = 'fb'; el.setAttribute('role', 'timer');
    for (const [k, label] of UNITS) {
      const g = doc.createElement('div'); g.className = 'fb-g';
      const ds = doc.createElement('div'); ds.className = 'fb-ds';
      const u = doc.createElement('span'); u.className = 'fb-u'; u.textContent = label;
      g.append(ds, u); el.appendChild(g);
      groups[k] = ds;
    }
  }
  let first = true;
  const set = parts => {
    for (const [k] of UNITS) {
      const str = String(parts[k]).padStart(2, '0');
      const ds = groups[k];
      while (ds.children.length < str.length) ds.appendChild(flap(doc));   // 100日をこえたら3けた
      while (ds.children.length > str.length) ds.lastChild.remove();
      [...str].forEach((c, i) => flip(ds.children[i], c, still || first));
    }
    first = false;
    el.classList.remove('fb-wait');
    el.setAttribute('aria-label', `キックオフまで${parts.d}日${parts.h}時間${parts.m}分`);
  };
  return { el, set };
}
