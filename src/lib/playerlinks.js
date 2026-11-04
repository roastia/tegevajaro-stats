// 選手名を Jリーグ公式の選手ページへのリンクにする（ブラウザで、表示されている文字の中から名簿の名前を探して包む）
// ダッシュボード版の index.html にも同じもの（linkPlayers）
// urls：{ 名前: 'https://www.jleague.jp/player/〇〇/' }、sel：名前が入っている要素、pitch：スタメン図の選手（data-name を持つ）とその名前の要素
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function linkPlayers(root, urls, sel, pitch) {
  const names = Object.keys(urls).filter(n => /^https:\/\/www\.jleague\.jp\/player\/\d+\/$/.test(urls[n])).sort((a, b) => b.length - a.length);
  if (!names.length) return;
  const re = new RegExp(names.map(esc).join('|'), 'g');
  const doc = root.ownerDocument || root;
  const make = (name, text) => {
    const a = doc.createElement('a');
    a.className = 'pl-link'; a.href = urls[name]; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = text;
    return a;
  };
  for (const el of root.querySelectorAll(sel)) {
    const hidden = !!el.closest('[aria-hidden="true"]');
    const walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) if (!n.parentElement.closest('a, button, small, .mv, .climb')) nodes.push(n);
    for (const n of nodes) {
      const t = n.nodeValue; re.lastIndex = 0;
      if (!re.test(t)) continue;
      re.lastIndex = 0;
      const f = doc.createDocumentFragment(); let i = 0, m;
      while ((m = re.exec(t))) { f.append(t.slice(i, m.index)); const a = make(m[0], m[0]); if (hidden) a.tabIndex = -1; f.append(a); i = m.index + m[0].length; }
      f.append(t.slice(i));
      n.replaceWith(f);
    }
  }
  // スタメン図：名字だけのこともあるので data-name で引く
  if (pitch) for (const p of root.querySelectorAll(pitch[0])) {
    const u = urls[p.dataset.name], nm = p.querySelector(pitch[1]);
    if (!u || !nm || nm.closest('a') || nm.querySelector('a')) continue;
    const a = make(p.dataset.name, nm.textContent); a.setAttribute('aria-label', p.dataset.name);
    nm.textContent = ''; nm.appendChild(a);
  }
}
