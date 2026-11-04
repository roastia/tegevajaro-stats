// Jリーグ公式の試合ページ（…/match/j2/2026/〇〇〇〇〇〇/stats/）を開いたブラウザで実行し、
// 試合の記録を短い JSON 1行で返す。結果は private/matches/<節>.json に保存して tools/apply_match.mjs に渡す
// （ページ全体を読むより、ずっと少ない量で済む）
// 返す内容：日時・相手・ホーム/アウェイ・宮崎の布陣（背番号と位置）・出来事（得点・交代・警告・退場）・アシスト・観客・天候・気温・チームスタッツ
(async () => {
  for (let k = 0; k < 20 && !/チームスタッツ/.test(document.body.innerText); k++) await new Promise(r => setTimeout(r, 300));
  const h = [...document.scripts].filter(s => !s.src).map(s => s.textContent).join('\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  const val = key => {
    const i = h.indexOf(`"${key}":`); if (i < 0) return null;
    const j = i + key.length + 3; let d = 0, k = j;
    for (; k < h.length; k++) {
      const c = h[k];
      if (c === '"') { k++; while (h[k] !== '"') { if (h[k] === '\\') k++; k++; } continue; }
      if (c === '[' || c === '{') d++; else if (c === ']' || c === '}') { d--; if (!d) break; }
    }
    return JSON.parse(h.slice(j, k + 1));
  };
  const f = val('formations')[0];
  const MZ = '宮崎';
  const homeIsMz = f.homeTeam.teamName.includes(MZ);
  const mz = homeIsMz ? f.homeTeam : f.awayTeam, op = homeIsMz ? f.awayTeam : f.homeTeam;
  const minute = (period, t, x) => (period === '後半' ? 45 : 0) + Number(t) + Number(x || 0);
  // 出来事は「分|前半◯分|M or O|種類|名前」の短い文字列。宮崎の出来事と、相手の得点だけ（相手の交代・警告は使わない）
  const T = { goal: 'g', 'own-goal': 'og', 'sub-in': 'in', 'sub-out': 'out', 'yellow-card': 'y', 'red-card': 'r', 'second-yellow-card': 'y2' };
  const ev = (val('events') || []).flatMap(e => [...(e.homePlayers || []).map(p => ['H', p]), ...(e.awayPlayers || []).map(p => ['A', p])]
    .map(([s, p]) => [(s === 'H') === homeIsMz ? 'M' : 'O', p, `${e.period}${e.time}分${e.extraTime ? '+' + e.extraTime : ''}`, minute(e.period, e.time, e.extraTime)]))
    .filter(([side, p]) => side === 'M' || /goal/.test(p.eventType))
    .map(([side, p, label, min]) => `${min}|${label}|${side}|${T[p.eventType] || p.eventType}|${p.name}`).reverse();
  // アシスト：得点の解説ウィジェット（分ごと）にある assistPlayer
  const assists = {}; const re = /widget-container-(\d+)'(?:\+?(\d+))?[\s\S]{0,4000}?"assistPlayer":\{"name":"([^"]+)"/g; let m;
  while ((m = re.exec(h))) assists[Number(m[1]) + Number(m[2] || 0)] = m[3];
  const t = document.body.innerText;
  const pick = rx => (t.match(rx) || [])[1] || '';
  const block = t.slice(t.indexOf('チームスタッツ'), t.indexOf('チームスタッツ') + 400).replace(/\s+/g, ' ');
  const nums = block.match(/-?\d+(?:\.\d+)?%?/g) || [];
  // 並び：シュート数・枠内・支配率・パス成功率・CK・FK・オフサイド・ファウル・警告・退場（ホームの10個 → アウェイの10個）
  const hs = nums.slice(0, 10), as = nums.slice(10, 20);
  const st = a => ({ shots: a[0], on: a[1], poss: (a[2] || '').replace('%', ''), yc: a[8], rc: a[9] });
  const title = document.title;
  return JSON.stringify({
    url: location.pathname.replace(/[^/]*\/?$/, ''), date: (title.match(/(\d{4})年(\d+)月(\d+)日/) || []).slice(1).map(x => x.padStart(2, '0')).join('-'),
    ha: homeIsMz ? 'H' : 'A', opponent: op.teamName, formation: mz.formation,
    starters: mz.players.map(p => `${p.id}:${p.positionX}:${p.positionY}`).join(' '),
    ev, assists,
    att: pick(/入場者数[:：]\s*([\d,]+)/).replace(/,/g, ''), weather: pick(/天候[:：]\s*([^｜|\s]+)/), temp: pick(/気温[:：]\s*([\d.]+)/),
    mz: st(homeIsMz ? hs : as), op: st(homeIsMz ? as : hs),
  });
})()
