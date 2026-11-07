// ランキング計算（純粋関数）。ダッシュボード版で検算済みのロジックをそのまま移植。
// 入力: CSVを読み込んだ行の配列（値はすべて文字列）。出力: 各計算結果の配列。
// AS_OF: 年齢を数える基準日（YYYY-MM-DD）
// Football LAB 由来のデータが何節までの値か（毎節は更新しない）。ランキングの札・ポスト文・計算の範囲に使う
export const LAB_UPTO = { players: 13, xg: 13, pass_pairs: 13, cbp: 12 };
// 国民の祝日・休日（内閣府「国民の祝日」の一覧。2026〜2027年）。平日開催の判定に使う
export const HOLIDAYS = new Set([
  '2026-01-01', '2026-01-12', '2026-02-11', '2026-02-23', '2026-03-20', '2026-04-29', '2026-05-03', '2026-05-04', '2026-05-05', '2026-05-06',
  '2026-07-20', '2026-08-11', '2026-09-21', '2026-09-22', '2026-09-23', '2026-10-12', '2026-11-03', '2026-11-23',
  '2027-01-01', '2027-01-11', '2027-02-11', '2027-02-23', '2027-03-21', '2027-03-22', '2027-04-29', '2027-05-03', '2027-05-04', '2027-05-05',
  '2027-07-19', '2027-08-11', '2027-09-20', '2027-09-23', '2027-10-11', '2027-11-03', '2027-11-23',
]);

export function computeAll(D, AS_OF) {
  const C = {};
  const dash = { calc: (id, def) => { C[id] = def; } };


dash.calc('form', {
  inputs: ['matches'],
  title: '直近5試合の成績',
  description: '節の大きい順に5試合を取り、勝・分・敗を数える。',
  fn: (matches) => {
    const last = [...matches].sort((a, b) => Number(a.round) - Number(b.round)).slice(-5);
    const c = r => last.filter(x => x.result === r).length;
    return [{ w: c('勝'), d: c('分'), l: c('負') }];
  }
});
dash.calc('ages', {
  inputs: ['profiles'],
  title: '年齢',
  description: '生年月日から2026年10月27日時点の満年齢を出す。',
  fn: (profiles) => profiles.map(p => {
    if (!p.birth) return { name: p.name, age: '' };
    const [y, m, d] = p.birth.split('-').map(Number), [ty, tm, td] = AS_OF.split('-').map(Number);
    return { name: p.name, age: ty - y - ((tm < m || (tm === m && td < d)) ? 1 : 0) };
  })
});
dash.calc('roots', {
  inputs: ['profiles', 'ages'],
  title: '経歴のまとめ',
  description: '大学を経た選手、高校・ユース欄がJクラブのユース/U-18の選手、九州7県と宮崎県の出身者を数え、平均年齢を出す。',
  fn: (profiles, ages) => {
    const kyushu = ['福岡', '佐賀', '長崎', '熊本', '大分', '宮崎', '鹿児島'];
    const a = ages.filter(x => x.age !== '').map(x => Number(x.age));
    return [{
      total: profiles.length,
      univ: profiles.filter(p => p.university).length,
      academy: profiles.filter(p => /ユース|U-18/.test(p.hs_or_youth)).length,
      kyushu: profiles.filter(p => kyushu.includes(p.birthplace)).length,
      miyazaki: profiles.filter(p => p.birthplace === '宮崎').length,
      avg_age: a.length ? (a.reduce((s, x) => s + x, 0) / a.length).toFixed(1) + '歳' : ''
    }];
  }
});
// 経歴から宮崎との関係を読む。経歴は「宮崎に来る直前まで」の並び。
// 期限付き移籍の「宮崎 → 元のクラブ」は形式上の戻りなので、同じクラブにはさまれた宮崎は「期限付き」と判断する。
function miyazakiPath(career) {
  const st = String(career || '').split('→').map(s => s.trim()).filter(Boolean);
  const idx = st.map((s, i) => s === 'テゲバジャーロ宮崎' ? i : -1).filter(i => i >= 0);
  if (!idx.length) return { kind: '', steps: st };
  const loanOnly = idx.every(i => i > 0 && i < st.length - 1 && st[i - 1] === st[i + 1]) && st[idx[idx.length - 1] + 1] === st[st.length - 1];
  return { kind: loanOnly ? 'loan_to_perm' : 'return', steps: st, loans: idx.length };
}
// 所属チーム・学校の数（期限付き移籍の行き来で同じチームを二重に数えない）
const teamCount = career => new Set(String(career || '').split('→').map(s => s.trim()).filter(Boolean)).size;
dash.calc('roots_facts', {
  inputs: ['profiles', 'ages'],
  title: 'チームデータトピック',
  description: '選手プロフィール（生年月日・身長・出身地・高校/ユース・大学・経歴）から、ポストしたくなる背景トピックを作る。年齢は2026年10月27日時点。',
  fn: (profiles, ages) => {
    const F = [];
    const add = (id, icon, label, headline, big, sub, cheer) => F.push({ id, icon, label, headline, big, sub, cheer, post: `${headline}\n${sub}\n${cheer}\n#テゲバジャーロ宮崎 #テゲバ #テゲスタ` });
    const N = profiles.length;
    const ageOf = Object.fromEntries(ages.map(a => [a.name, a.age]));
    const kyushu = ['福岡', '佐賀', '長崎', '熊本', '大分', '宮崎', '鹿児島'];
    const avg = l => l.length ? l.reduce((s, x) => s + x, 0) / l.length : 0;
    const names = l => l.map(p => p.name).join('・');

    const univ = profiles.filter(p => p.university);
    const direct = univ.filter(p => String(p.career).trim().endsWith(p.university));
    if (univ.length) add('univ', 'cap', '大学経由', `大学経由のプロが${univ.length}人！`, `${univ.length}人`, `在籍${N}人中${univ.length}人。うち${direct.length}人は大学からテゲバでプロへ`, '4年間の成果を宮崎で');

    const ac = profiles.filter(p => /ユース|U-18/.test(p.hs_or_youth));
    if (ac.length) add('academy', 'sprout', 'アカデミー育ち', `Jクラブのアカデミー育ちが${ac.length}人`, `${ac.length}人`, `ユース・U-18で育った選手：${names(ac)}`, '磨いた技を宮崎で披露中');

    const pref = {}; profiles.forEach(p => { if (p.birthplace) (pref[p.birthplace] = pref[p.birthplace] || []).push(p); });
    const np = Object.keys(pref).length, mx = Math.max(...Object.values(pref).map(l => l.length));
    const topP = Object.keys(pref).filter(k => pref[k].length === mx);
    if (np) add('prefs', 'compass', '全国から集結', `全国${np}都道府県から宮崎に集結！`, `${np}都道府県`, `最多は${topP.join('・')}出身の${mx}人ずつ`, 'ロッカールームは方言だらけ？');

    const ky = profiles.filter(p => kyushu.includes(p.birthplace)), mz = pref['宮崎'] || [];
    if (ky.length) add('kyushu', 'pin', '九州・宮崎出身', mz.length ? `宮崎出身は${names(mz)}！` : `九州出身は${ky.length}人`, `${ky.length}人`, `九州出身は${ky.length}人（${names(ky)}）`, '地元の星に大声援を');

    const withAge = profiles.filter(p => ageOf[p.name] !== '' && ageOf[p.name] != null);
    if (withAge.length) {
      const srt = [...withAge].sort((a, b) => ageOf[a.name] - ageOf[b.name]);
      const yg = srt[0], od = srt[srt.length - 1];
      add('age', 'cake', '平均年齢', `今季のテゲバは平均${avg(withAge.map(p => Number(ageOf[p.name]))).toFixed(1)}歳！`, `${avg(withAge.map(p => Number(ageOf[p.name]))).toFixed(1)}歳`, `最年少は${yg.name}（${ageOf[yg.name]}歳）、最年長は${od.name}（${ageOf[od.name]}歳）`, '若さも経験もそろうチーム');
    }
    const y2k = profiles.filter(p => p.birth && p.birth >= '2000');
    if (y2k.length) add('y2k', 'balloon', '2000年代生まれ', `2000年以降生まれが${y2k.length}人！`, `${y2k.length}人`, `在籍${N}人中${y2k.length}人。伸び盛りがそろう`, '伸びしろしかない');

    const hp = pos => profiles.filter(p => p.pos === pos && p.height).map(p => Number(p.height));
    const tall = profiles.filter(p => Number(p.height) >= 185);
    if (hp('GK').length) add('height', 'tower', '高さ', `GK陣は平均${avg(hp('GK')).toFixed(1)}cm！`, `${avg(hp('GK')).toFixed(1)}cm`, `FW陣も平均${avg(hp('FW')).toFixed(1)}cm。185cm以上の選手が${tall.length}人`, 'ゴール前の景色、高め');

    const teams = profiles.map(p => teamCount(p.career)).filter(Boolean);
    const most = [...profiles].sort((a, b) => teamCount(b.career) - teamCount(a.career))[0];
    if (teams.length) add('career', 'suitcase', '歩んできた道', `平均${avg(teams).toFixed(1)}チームを経て、宮崎へ`, `${avg(teams).toFixed(1)}チーム`, `いちばん多いのは${most.name}の${teamCount(most.career)}チーム（少年団・学校を含む）`, 'いろんな道の合流地点が宮崎');

    const chose = profiles.filter(p => miyazakiPath(p.career).kind === 'loan_to_perm');
    if (chose.length) add('chose', 'hearts', '宮崎を選んだ男たち', `期限付きから完全移籍で残った選手が${chose.length}人！`, `${chose.length}人`, `${names(chose)}`, '宮崎を選んでくれてありがとう');
    const back = profiles.filter(p => miyazakiPath(p.career).kind === 'return');
    if (back.length) add('returnee', 'uturn', 'おかえり組', `宮崎に帰ってきた選手が${back.length}人！`, `${back.length}人`, `${names(back)}`, 'おかえり、待ってました');

    const g = new Map();
    for (const p of profiles) for (const sc of [p.hs_or_youth, p.university]) { if (!sc) continue; if (!g.has(sc)) g.set(sc, []); g.get(sc).push(p.name); }
    const links = [...g.entries()].filter(([, l]) => l.length >= 2);
    if (links.length) add('schoolmates', 'link', '同じ学校の仲間', `同じ学校・ユース出身の仲間が${links.length}組！`, `${links.length}組`, links.slice(0, 2).map(([sc, l]) => `${sc}（${l.join('・')}）`).join('、') + (links.length > 2 ? 'など' : ''), '同窓会、ピッチで開催中');

    // ---- もっとチームデータ（プロフィールから） ----
    const hh = profiles.filter(p => Number(p.height)).sort((a, b) => Number(b.height) - Number(a.height));
    if (hh.length >= 2) { const t1 = hh[0], t2 = hh[hh.length - 1]; add('heightgap', 'tower', '身長差', `いちばん高い選手と小柄な選手の差は${Number(t1.height) - Number(t2.height)}cm！`, `${Number(t1.height) - Number(t2.height)}cm`, `いちばん高いのは${t1.name}（${t1.height}cm）、いちばん小柄なのは${t2.name}（${t2.height}cm）。チームの平均は${avg(hh.map(p => Number(p.height))).toFixed(1)}cm`, '高さも小回りもそろってる'); }
    const cnt = key => { const o = {}; profiles.forEach(p => { const k = key(p); if (k) o[k] = (o[k] || 0) + 1; }); const mx = Math.max(0, ...Object.values(o)); return { mx, keys: Object.keys(o).filter(k => o[k] === mx).sort((a, b) => Number(a) - Number(b)) }; };
    const bm = cnt(p => p.birth ? String(Number(p.birth.slice(5, 7))) : '');
    if (bm.mx >= 2) add('birthmonth', 'cake', '誕生月', `いちばん多い誕生月は${bm.keys.join('・')}月！`, `${bm.mx}人${bm.keys.length > 1 ? 'ずつ' : ''}`, bm.keys.length === 1 ? `${bm.keys[0]}月生まれ：${profiles.filter(p => p.birth && Number(p.birth.slice(5, 7)) === Number(bm.keys[0])).map(p => p.name).join('・')}` : `${bm.keys.join('月・')}月に${bm.mx}人ずつ。在籍${N}人の誕生月をかぞえると、この${bm.keys.length}か月が同点で最多`, 'お祝いポストの準備を');
    const by = cnt(p => p.birth ? p.birth.slice(0, 4) : '');
    if (by.mx >= 3) add('birthyear', 'balloon', '同い年', `${by.keys.join('年・')}年生まれが${by.mx}人${by.keys.length > 1 ? 'ずつ' : ''}！`, `${by.mx}人`, by.keys.length <= 2 ? by.keys.map(k => `${k}年生まれ：${profiles.filter(p => p.birth && p.birth.startsWith(k)).map(p => p.name).join('・')}`).join('／') : `在籍${N}人の生まれ年をかぞえると、${by.keys.join('年・')}年が同点で最多`, '同学年トーク、聞いてみたい');
    const PO = ['GK', 'DF', 'MF', 'FW'], pc = PO.map(p => profiles.filter(x => x.pos === p).length);
    if (N) { const mi = pc.indexOf(Math.max(...pc)); add('posmix', 'network', 'ポジションの顔ぶれ', `いちばん層が厚いのは${PO[mi]}の${pc[mi]}人！`, `${pc[mi]}人`, PO.map((p, i) => `${p} ${pc[i]}人`).join('／') + `（在籍${N}人）`, 'ポジション争いも見どころ'); }
    return F.map((f, i) => ({ ...f, order: i + 1 }));
  }
});
dash.calc('school_links', {
  inputs: ['profiles'],
  title: '同じ母校・ユース出身',
  description: '高校・ユース欄と大学欄が同じ選手を集め、2人以上いるものを並べる。',
  fn: (profiles) => {
    const g = new Map();
    for (const p of profiles) for (const s of [p.hs_or_youth, p.university]) {
      if (!s) continue;
      if (!g.has(s)) g.set(s, []);
      g.get(s).push(p.name);
    }
    return [...g].filter(([, v]) => v.length > 1)
      .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], 'ja'))
      .map(([school, v]) => ({ school, members: v.join('、'), count: v.length }));
  }
});
dash.calc('prefs', {
  inputs: ['profiles'],
  title: '出身地別の人数',
  description: '出身地（都道府県）ごとに選手を数える。',
  fn: (profiles) => {
    const c = {};
    for (const p of profiles) if (p.birthplace) c[p.birthplace] = (c[p.birthplace] || 0) + 1;
    return Object.entries(c).sort((a, b) => b[1] - a[1]).map(([pref, n]) => ({ pref, n }));
  }
});
dash.calc('records', {
  inputs: ['players', 'goals', 'matches', 'ages', 'cbp', 'xg', 'pass_pairs', 'suspension', 'profiles', 'appearances', 'goals_all'],
  title: '個人記録ランキング',
  description: '試合結果・ゴール一覧・選手データから、連続ゴール・決勝ゴール・先制ゴール・時間帯別ゴール・出場時間などの記録を選手ごとに出す。決勝ゴール＝勝った試合で宮崎の（相手の得点＋1）点目。稼いだ勝ち点＝そのゴールがなければ失っていた勝ち点（1点差勝利の得点は2、1-1など同点の得点は1）。',
  fn: (players, goals, matches, ages, cbp, xg, pass_pairs, suspension, profiles, appearances, goals_all) => {
    const n = v => Number(v) || 0;
    const ms = [...matches].sort((a, b) => n(a.round) - n(b.round));
    const R = ms.length;
    const gs = [...goals].sort((a, b) => n(a.round) - n(b.round) || n(a.minute) - n(b.minute));
    // GK は1人がフル出場し続けることが多く、出場時間やチーム成績の比較では有利になりすぎるため、
    // 出場時間系・チーム貢献系のランキングから外し、GK同士の「守護神」で別に比べる
    const posOf = {}; players.forEach(p => { posOf[p.name] = p.pos; }); profiles.forEach(p => { posOf[p.name] = posOf[p.name] || p.pos; });
    const isGK = nm => posOf[nm] === 'GK';
    const byRound = {};
    gs.forEach(g => { (byRound[String(g.round)] = byRound[String(g.round)] || []).push(g); });
    const haOf = {}; ms.forEach(m => { haOf[String(m.round)] = m.ha; });
    const out = [];
    const add = (record, name, value, display) => out.push({ rid: record + ':' + name, record, name, value, display });
    const countBy = list => { const c = {}; list.forEach(s => { c[s] = (c[s] || 0) + 1; }); return c; };
    const addCounts = (record, list, unit) => Object.entries(countBy(list)).forEach(([nm, c]) => add(record, nm, c, c + unit));

    [...new Set(gs.map(g => g.scorer))].forEach(s => {
      let cur = 0, best = 0, st = 0, bs = 0, be = 0;
      ms.forEach(m => {
        if ((byRound[String(m.round)] || []).some(g => g.scorer === s)) {
          if (cur === 0) st = n(m.round);
          cur++;
          if (cur > best) { best = cur; bs = st; be = n(m.round); }
        } else cur = 0;
      });
      const lastRound = ms.length ? n(ms[ms.length - 1].round) : 0;
      const bestLive = cur > 0 && be === lastRound && cur === best;   // the record streak itself is still going
      let disp = `${best}試合連続（第${bs}〜${be}節）` + (bestLive ? '・継続中' : '');
      if (!bestLive && cur >= 2) disp += `／第${st}節から再び${cur}試合連続で継続中`;
      if (best >= 2) add('streak', s, best, disp);
    });
    addCounts('winner', ms.filter(m => m.result === '勝').map(m => ((byRound[String(m.round)] || [])[n(m.ga)] || {}).scorer).filter(Boolean), '点');
    addCounts('opener', ms.filter(m => m.first_goal === '宮崎').map(m => ((byRound[String(m.round)] || [])[0] || {}).scorer).filter(Boolean), '回');
    const wins = new Set(ms.filter(m => m.result === '勝').map(m => String(m.round)));
    addCounts('win_contrib', gs.filter(g => wins.has(String(g.round))).map(g => g.scorer), '点');
    addCounts('early', gs.filter(g => n(g.minute) <= 15).map(g => g.scorer), '点');
    addCounts('late', gs.filter(g => n(g.minute) >= 75).map(g => g.scorer), '点');
    addCounts('home_hero', gs.filter(g => haOf[String(g.round)] === 'H').map(g => g.scorer), '点');
    addCounts('away_hero', gs.filter(g => haOf[String(g.round)] === 'A').map(g => g.scorer), '点');

    const ageOf = {}; ages.forEach(a => { ageOf[a.name] = a.age; });
    players.forEach(p => {
      const m = n(p.minutes), g = n(p.goals), a = n(p.assists);
      if (g + a > 0) add('ga', p.name, g + a, `${g + a}（${g}得点・${a}アシスト）`);
      if (m > 0 && !isGK(p.name)) add('iron', p.name, m, `${m.toLocaleString()}分（出場率${Math.round(m / (R * 90) * 100)}%）`);
      if (n(p.apps) === R && R > 0 && !isGK(p.name)) add('allgames', p.name, n(p.starts), `先発${n(p.starts)}試合（全${R}試合に出場）`);
      if (g >= 2) add('per_goal', p.name, Math.round(m / g), `${Math.round(m / g)}分に1点`);
      if (n(p.subs) > 0) add('super_sub', p.name, n(p.subs) * 100 + g, `途中出場${n(p.subs)}回（${g}得点）`);
      if (ageOf[p.name] !== '' && ageOf[p.name] != null && n(ageOf[p.name]) <= 23 && m > 0 && !isGK(p.name)) add('young', p.name, m, `${m.toLocaleString()}分（${ageOf[p.name]}歳）`);
      if (n(p.shots) > 0) add('shooter', p.name, n(p.shots), `${n(p.shots)}本`);
      // 決定力：シュート（Football LAB）が第 LAB_UPTO.players 節までなので、得点も同じ節までで割る
      const gLab = gs.filter(x => x.scorer === p.name && n(x.round) <= LAB_UPTO.players).length;
      if (n(p.shots) >= 10) add('finisher', p.name, gLab / n(p.shots), `${(gLab / n(p.shots) * 100).toFixed(1)}%`);
      if (n(p.last_passes) > 0) add('creator', p.name, n(p.last_passes), `${n(p.last_passes)}本`);
    });
    xg.forEach(x => { const d = n(x.goals) - n(x.xg); add('xg_over', x.name, d, `${d >= 0 ? '+' : ''}${d.toFixed(1)}点`); });
    cbp.forEach(c => { if (n(c.win) > 0) add('ball', c.name, n(c.win), '奪取ポイント'); });
    pass_pairs.forEach(p => add('combo', `${p.from} → ${p.to}`, n(p.count), `${n(p.count)}本`));
    suspension.forEach(s => { if (n(s.yellow_counted) > 0) add('reach', s.name, n(s.yellow_counted), n(s.yellow_counted) >= 3 ? `累積${n(s.yellow_counted)}枚（次で出場停止）` : `累積${n(s.yellow_counted)}枚`); });

    // 稼いだ勝ち点：そのゴールがなければ失っていた勝ち点
    const pts = {};
    ms.forEach(m => {
      const d = n(m.gf) - n(m.ga);
      const lost = d === 1 ? 2 : (d === 0 && n(m.gf) > 0 ? 1 : 0);
      if (lost) (byRound[String(m.round)] || []).forEach(g => { pts[g.scorer] = (pts[g.scorer] || 0) + lost; });
    });
    const teamPts = ms.reduce((s, m) => s + (m.result === '勝' ? 3 : m.result === '分' ? 1 : 0), 0);
    Object.entries(pts).forEach(([nm, v]) => add('points', nm, v, `勝ち点${v}（チームの${Math.round(v / teamPts * 100)}%）`));

    // ゴールを決めた試合の成績（不敗神話）
    const scoredRounds = {};
    gs.forEach(g => { (scoredRounds[g.scorer] = scoredRounds[g.scorer] || new Set()).add(String(g.round)); });
    Object.entries(scoredRounds).forEach(([nm, set]) => {
      const list = ms.filter(m => set.has(String(m.round)));
      if (list.length < 2) return;
      const w = list.filter(m => m.result === '勝').length, d = list.filter(m => m.result === '分').length, l = list.length - w - d;
      const ppg = (w * 3 + d) / list.length;
      add('scored_record', nm, Math.round(ppg * 100) * 100 + list.length, `${w}勝${d}分${l}敗（ゴールを決めた${list.length}試合）`);
    });

    // 後半のゴール、チーム得点に占める割合
    addCounts('second_half', gs.filter(g => String(g.time).startsWith('後半')).map(g => g.scorer), '点');
    const teamGoals = gs.length;
    Object.entries(countBy(gs.map(g => g.scorer))).forEach(([nm, c]) => add('share', nm, c / teamGoals, `${Math.round(c / teamGoals * 100)}%（${teamGoals}点中${c}点）`));

    // 90分あたり
    players.forEach(p => {
      const m = n(p.minutes);
      if (m < 300) return;
      const ga = n(p.goals) + n(p.assists);
      if (ga > 0) add('ga90', p.name, ga / m * 90, `90分あたり${(ga / m * 90).toFixed(2)}`);
      // シュート意欲：シュート（Football LAB）が第 LAB_UPTO.players 節までなので、出場時間も同じ節までで割る
      const mLab = appearances.filter(a => a.name === p.name && n(a.round) <= LAB_UPTO.players).reduce((s, a) => s + n(a.minutes), 0);
      if (n(p.shots) > 0 && mLab >= 300) add('shot90', p.name, n(p.shots) / mLab * 90, `90分あたり${(n(p.shots) / mLab * 90).toFixed(1)}本`);
      if (n(p.yellow) === 0 && n(p.red) === 0 && !isGK(p.name)) add('clean', p.name, m, `${m.toLocaleString()}分（警告ゼロ）`);
      if (ageOf[p.name] !== '' && ageOf[p.name] != null && n(ageOf[p.name]) >= 28 && !isGK(p.name)) add('veteran', p.name, m, `${m.toLocaleString()}分（${ageOf[p.name]}歳）`);
    });

    // シュート1本の質（xG÷シュート）
    const shotsOf = {}; players.forEach(p => { shotsOf[p.name] = n(p.shots); });
    xg.forEach(x => { const sh = shotsOf[x.name]; if (sh >= 5) add('chance_q', x.name, n(x.xg) / sh, `1本あたり${(n(x.xg) / sh).toFixed(2)}`); });

    // パス回しの中心
    const hub = {};
    pass_pairs.forEach(p => { [p.from, p.to].forEach(nm => { hub[nm] = (hub[nm] || 0) + n(p.count); }); });
    Object.entries(hub).forEach(([nm, v]) => add('hub', nm, v, `${v}本（よくつながるパス上位10組への関与）`));

    // トリビア
    const LL = { 北海道: [43.06, 141.35], 青森: [40.82, 140.74], 宮城: [38.27, 140.87], 東京: [35.69, 139.69], 神奈川: [35.45, 139.64], 千葉: [35.61, 140.12], 埼玉: [35.86, 139.65], 栃木: [36.57, 139.88], 群馬: [36.39, 139.06], 茨城: [36.34, 140.45], 新潟: [37.90, 139.02], 静岡: [34.98, 138.38], 愛知: [35.18, 136.91], 京都: [35.02, 135.76], 大阪: [34.69, 135.52], 兵庫: [34.69, 135.18], 奈良: [34.69, 135.83], 広島: [34.40, 132.46], 山口: [34.19, 131.47], 福岡: [33.61, 130.42], 佐賀: [33.25, 130.30], 長崎: [32.74, 129.87], 熊本: [32.79, 130.74], 大分: [33.24, 131.61], 宮崎: [31.91, 131.42], 鹿児島: [31.56, 130.56], 沖縄: [26.21, 127.68] };
    const km = (a, b) => { const r = Math.PI / 180, x = Math.sin((b[0] - a[0]) * r / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin((b[1] - a[1]) * r / 2) ** 2; return 2 * 6371 * Math.asin(Math.sqrt(x)); };
    profiles.forEach(p => {
      if (LL[p.birthplace]) { const d = Math.round(km(LL[p.birthplace], LL['宮崎']) / 10) * 10; add('distance', p.name, d, `約${d.toLocaleString()}km（${p.birthplace}から）`); }
      const steps = String(p.career || '').split('→').map(s => s.trim()).filter(Boolean);
      const tc = teamCount(p.career);
      if (tc) add('career_len', p.name, tc, `${tc}チーム・学校`);
      const mp = miyazakiPath(p.career);
      if (mp.kind === 'loan_to_perm') add('chose', p.name, mp.loans, `期限付き${mp.loans}シーズン（そのあと完全移籍）`);
      if (mp.kind === 'return') add('returnee', p.name, 1, '以前にも在籍');
      if (n(p.height) > 0) add('tall', p.name, n(p.height), `${n(p.height)}cm`);
    });

    // ---- 出場記録×試合結果×全ゴールから ----
    const resOf = {}; ms.forEach(m => { resOf[String(m.round)] = m.result; });
    const allByRound = {};
    [...goals_all].sort((a, b) => n(a.round) - n(b.round) || n(a.minute) - n(b.minute)).forEach(g => { (allByRound[String(g.round)] = allByRound[String(g.round)] || []).push(g); });
    const rec3 = list => { const w = list.filter(r => r === '勝').length, d = list.filter(r => r === '分').length; return { w, d, l: list.length - w - d, ppg: list.length ? (w * 3 + d) / list.length : 0 }; };
    const byPlayer = {};
    appearances.forEach(a => { (byPlayer[a.name] = byPlayer[a.name] || []).push(a); });
    Object.entries(byPlayer).forEach(([nm, list]) => {
      if (isGK(nm)) {
        // 守護神：GKだけで、ピッチにいた時間の90分あたり失点を比べる
        let ga = 0, mins = 0, cs = 0;
        list.forEach(a => {
          mins += n(a.minutes);
          const c = (allByRound[String(a.round)] || []).filter(g => g.team !== '宮崎' && n(g.minute) >= n(a.on) && n(g.minute) <= n(a.off)).length;
          ga += c;
          if (c === 0 && n(a.minutes) >= 90) cs++;
        });
        if (mins >= 180) add('keeper', nm, ga / mins * 90, `90分あたり失点${(ga / mins * 90).toFixed(2)}（出場${list.length}試合・無失点${cs}試合）`);
        return;
      }
      const all = rec3(list.map(a => resOf[String(a.round)]));
      if (list.length >= 5) add('lucky', nm, Math.round(all.ppg * 100) * 100 + list.length, `${all.w}勝${all.d}分${all.l}敗（出場${list.length}試合）`);
      const st = list.filter(a => n(a.started) === 1);
      const s = rec3(st.map(a => resOf[String(a.round)]));
      if (st.length >= 5) add('starter', nm, Math.round(s.ppg * 100) * 100 + st.length, `${s.w}勝${s.d}分${s.l}敗（先発${st.length}試合）`);
      let gf = 0, ga = 0, mins = 0, subGf = 0;
      list.forEach(a => {
        mins += n(a.minutes);
        (allByRound[String(a.round)] || []).forEach(g => {
          const t = n(g.minute);
          if (t >= n(a.on) && t <= n(a.off)) {
            if (g.team === '宮崎') { gf++; if (n(a.started) === 0) subGf++; } else ga++;
          }
        });
      });
      if (mins >= 300) {
        const d = gf - ga;
        add('plusminus', nm, d, `${d > 0 ? '+' : ''}${d}（ピッチにいる間 得点${gf}・失点${ga}）`);
        if (mins >= 450) add('wall', nm, ga / mins * 90, `90分あたり失点${(ga / mins * 90).toFixed(2)}`);
      }
      if (subGf > 0) add('impact', nm, subGf, `${subGf}得点（途中出場してピッチにいた間のチームの得点）`);
    });
    // 先発同時出場コンビ
    const startersBy = {};
    appearances.filter(a => n(a.started) === 1).forEach(a => { (startersBy[String(a.round)] = startersBy[String(a.round)] || []).push(a.name); });
    const pairs = {};
    Object.entries(startersBy).forEach(([r, names]) => {
      const s = [...names].sort();
      for (let i = 0; i < s.length; i++) for (let j = i + 1; j < s.length; j++) { const k = s[i] + '＆' + s[j]; (pairs[k] = pairs[k] || []).push(resOf[r]); }
    });
    Object.entries(pairs).forEach(([k, list]) => {
      if (list.length < 6 || k.split('＆').some(isGK)) return;
      const r = rec3(list);
      add('golden_pair', k, Math.round(r.ppg * 100) * 100 + list.length, `${r.w}勝${r.d}分${r.l}敗（一緒に先発${list.length}試合）`);
    });
    // 試合の流れを変えたゴール
    Object.values(allByRound).forEach(list => {
      let us = 0, them = 0;
      list.forEach(g => {
        if (g.team === '宮崎') {
          if (us === them) add('go_ahead_raw', g.scorer, 1, '');
          if (us === them - 1) add('equalizer_raw', g.scorer, 1, '');
          us++;
        } else them++;
      });
    });
    ['go_ahead', 'equalizer'].forEach(id => {
      const raw = out.filter(o => o.record === id + '_raw');
      Object.entries(countBy(raw.map(o => o.name))).forEach(([nm, c]) => add(id, nm, c, c + '点'));
    });
    return out.filter(o => !o.record.endsWith('_raw'));
  }
});
dash.calc('team_records', {
  inputs: ['matches', 'goals'],
  title: 'チームの記録',
  description: '最新の試合からさかのぼって負けなし・得点した試合・ホームで負けなしの数を数え、先制した試合の敗戦数とゴールを決めた選手の人数を出す。',
  fn: (matches, goals) => {
    const ms = [...matches].sort((a, b) => Number(a.round) - Number(b.round));
    const back = (list, ok) => { let c = 0; for (let i = list.length - 1; i >= 0 && ok(list[i]); i--) c++; return c; };
    const unbeaten = back(ms, m => m.result !== '負');
    const lead = ms.filter(m => m.first_goal === '宮崎');
    return [{
      unbeaten,
      unbeaten_from: unbeaten ? ms[ms.length - unbeaten].round : '',
      scoring: back(ms, m => Number(m.gf) > 0),
      home_unbeaten: back(ms.filter(m => m.ha === 'H'), m => m.result !== '負'),
      lead_l: lead.filter(m => m.result === '負').length,
      scorers: new Set(goals.map(g => g.scorer)).size
    }];
  }
});

dash.calc('topics', {
  inputs: ['matches', 'goals_all', 'records', 'team_records', 'players', 'appearances'],
  title: 'SNS用トピック',
  description: '試合結果・全ゴール・個人記録から、拡散しやすい見出しと数字を作る。デーゲーム＝18時より前のキックオフ。遠征距離＝ホームスタジアムからアウェイ会場までの直線距離の往復。',
  fn: (matches, goals_all, records, team_records, players, appearances) => {
    const n = v => Number(v) || 0;
    const ms = [...matches].sort((a, b) => n(a.round) - n(b.round));
    const rec = list => { const w = list.filter(m => m.result === '勝').length, d = list.filter(m => m.result === '分').length; return { w, d, l: list.length - w - d, c: list.length, ppg: list.length ? (w * 3 + d) / list.length : 0, s: `${w}勝${d}分${list.length - w - d}敗` }; };
    const top = id => records.filter(r => r.record === id).sort((a, b) => b.value - a.value)[0];
    const T = [];
    const add = (id, emoji, label, headline, big, sub, cheer) => T.push({ id, emoji, label, headline, big, sub, cheer: cheer || '' });
    const tr = team_records[0] || {};

    const pt = top('points');
    if (pt) { const pct = (pt.display.match(/チームの(\d+)%/) || [])[1]; add('points', '💰', '大黒柱', `${pt.name}、勝ち点の${pct}%を稼ぐ大黒柱！`, `${pct}%`, `この人のゴールで積み上げた勝ち点は${pt.value}`, '背中に声援をどっさり！'); }
    if (tr.unbeaten) add('unbeaten', '🛡️', '無敗街道', `リーグ戦${tr.unbeaten}試合、負け方を忘れ中！`, `${tr.unbeaten}試合`, `第${tr.unbeaten_from}節から一度も負けていない`, 'このまま突き進もう！');
    const lead = rec(ms.filter(m => m.first_goal === '宮崎'));
    if (lead.c) add('lead', '🥇', '先制の法則', lead.l === 0 ? '先に決めたら、もう負けない！' : '先制した試合の成績', lead.s, `先に点を取った${lead.c}試合は${lead.s}`, 'キックオフから声を出そう！');
    if (n(tr.scoring) >= 2) add('scoring', '⚽', '連続得点', `${tr.scoring}試合連続ゴール中！`, `${tr.scoring}試合`, `第${ms[ms.length - n(tr.scoring)].round}節から、毎試合ゴールを奪い続けている`, 'ノドの準備をしてスタジアムへ');
    const homeRec = rec(ms.filter(m => m.ha === 'H'));
    if (n(tr.home_unbeaten) >= 2) add('home', '🏟️', 'ホーム無敗', `いちごで${tr.home_unbeaten}試合負けなし！`, `${tr.home_unbeaten}試合`, `いちごはテゲバの砦。今季のホームは${homeRec.s}`, '砦をスタンドの声で守ろう');
    if (n(tr.scorers) > 0) add('scorers', '🎉', 'みんなで取る', `${tr.scorers}人がゴール！誰でも決められるチーム`, `${tr.scorers}人`, `今季の${ms.reduce((s, m) => s + n(m.gf), 0)}得点を${tr.scorers}人で分け合う`, '次は誰が決める？');
    const sr = {};
    goals_all.filter(g => g.team === '宮崎').forEach(g => { (sr[g.scorer] = sr[g.scorer] || new Set()).add(String(g.round)); });
    const myth = Object.entries(sr).map(([nm, set]) => ({ nm, r: rec(ms.filter(m => set.has(String(m.round)))) })).filter(x => x.r.l === 0 && x.r.c >= 3).sort((a, b) => b.r.c - a.r.c)[0];
    if (myth) add('myth', '🙏', '不敗神話', `${myth.nm}が決めれば負けない！`, myth.r.s, `ゴールを決めた${myth.r.c}試合はすべて負けなし。不敗神話は続く`, '神話はまだまだ続く');
    const st = top('streak');
    if (st) add('streak', '🔥', '連続ゴール', /・継続中/.test(st.display) ? `${st.name}、${st.value}試合連続ゴール継続中！` : /再び/.test(st.display) ? `${st.name}、${st.value}試合連続ゴール！そして再び連続ゴール中` : `${st.name}、${st.value}試合連続ゴールを記録！`, `${st.value}試合`, st.display, 'どこまで伸びるか楽しみ！');
    const day = rec(ms.filter(m => n(String(m.kickoff).slice(0, 2)) < 18)), night = rec(ms.filter(m => n(String(m.kickoff).slice(0, 2)) >= 18));
    if (day.c) add('daygame', '☀️', '昼の宮崎', day.l === 0 ? 'デーゲーム負けなし！太陽は味方' : 'デーゲームの成績', day.s, `18時より前のキックオフは${day.s}`, '明るいうちからスタジアムへ');
    // 平日＝月〜金で、祝日・休日でない日
    const wk = rec(ms.filter(m => ['月', '火', '水', '木', '金'].includes(m.weekday) && !HOLIDAYS.has(m.date)));
    if (wk.c) add('weekday', '🏢', '平日の宮崎', wk.l === 0 && wk.d === 0 ? `平日開催は${wk.c}戦全勝！` : '平日開催の成績', wk.s, `平日（祝日をのぞく）の試合は${wk.s}`, '平日だって、声は届く');
    const byMonth = {};
    ms.forEach(m => { const k = n(String(m.date).slice(5, 7)); (byMonth[k] = byMonth[k] || []).push(m); });
    const mk = Object.keys(byMonth).map(Number).sort((a, b) => a - b);
    if (mk.length >= 2) { const f = rec(byMonth[mk[0]]), l = rec(byMonth[mk[mk.length - 1]]); add('monthly', '📈', '右肩上がり', `${mk[mk.length - 1]}月は${l.l === 0 ? '無敗' : l.s}！右肩上がり中`, `${l.s}`, mk.map(k => `${k}月 ${rec(byMonth[k]).s}`).join('／'), '乗るなら今です'); }
    const lo = rec(ms.filter(m => n(m.possession) < 50)), hi = rec(ms.filter(m => n(m.possession) >= 50));
    if (lo.c && hi.c) add('possession', '🎯', '持たせて勝つ', lo.ppg > hi.ppg ? 'ボールは貸しても、勝ち点は貸さない！' : 'ボール保持と勝敗', lo.s, `保持率50%未満の試合は${lo.s}、50%以上は${hi.s}`, 'したたかさも武器');
    const out = rec(ms.filter(m => n(m.shots_for) < n(m.shots_against)));
    if (out.w) add('outshot', '🥊', 'シュート数じゃない', `少ないシュートで${out.w}勝！決めきる力`, `${out.w}勝`, `シュートが相手より少ない${out.c}試合で${out.s}。チャンスを決めきる勝負強さ`, '最後に笑うのはテゲバ');
    const R = Math.PI / 180, km = (a, b) => { const x = Math.sin((b[0] - a[0]) * R / 2) ** 2 + Math.cos(a[0] * R) * Math.cos(b[0] * R) * Math.sin((b[1] - a[1]) * R / 2) ** 2; return 2 * 6371 * Math.asin(Math.sqrt(x)); };
    const home = ms.find(m => m.ha === 'H');
    if (home) {
      // 会場の位置が入っていない試合は数えない（空の位置を 0,0 として計算しないように）
      const aw = ms.filter(m => m.ha === 'A' && n(m.venue_lat) && n(m.venue_lng));
      const total = Math.round(aw.reduce((s, m) => s + 2 * km([n(home.venue_lat), n(home.venue_lng)], [n(m.venue_lat), n(m.venue_lng)]), 0));
      const far = aw.map(m => ({ m, d: km([n(home.venue_lat), n(home.venue_lng)], [n(m.venue_lat), n(m.venue_lng)]) })).sort((a, b) => b.d - a.d)[0];
      add('travel', '✈️', 'アウェイ遠征', `今季のアウェイ遠征は往復約${total.toLocaleString()}km！`, `${total.toLocaleString()}km`, `地球${(total / 40075 * 100).toFixed(0)}%周分（直線距離）。最遠は${far.m.opponent}戦の約${Math.round(far.d).toLocaleString()}km`, '声はどこまでも届く');
    }
    const avg = list => list.length ? Math.round(list.reduce((s, m) => s + n(m.attendance), 0) / list.length) : 0;
    const ha = avg(ms.filter(m => m.ha === 'H')), aa = avg(ms.filter(m => m.ha === 'A'));
    const big = [...ms].sort((a, b) => n(b.attendance) - n(a.attendance))[0];
    if (big) add('crowd', '🏟️', '大観衆', `最多観客は${big.opponent}戦の${n(big.attendance).toLocaleString()}人！`, `${n(big.attendance).toLocaleString()}人`, `ホームの平均観客は${ha.toLocaleString()}人、アウェイは${aa.toLocaleString()}人`, 'この記録を塗り替えよう');
    // ラスト15分（後半30分以降）の宮崎のゴール
    const mine = goals_all.filter(g => g.team === '宮崎');
    const late = mine.filter(g => n(g.minute) >= 75).length;
    if (late) add('late', '⏰', 'ラスト15分', `ラスト15分で${late}ゴール！最後まで目が離せない`, `${late}点`, `今季${mine.length}得点のうち${late}点が後半30分以降`, '最後の笛まで声援を！');
    const used = new Set();
    const lk = top('lucky');
    if (lk) {
      const s = (lk.display.match(/(\d+勝\d+分\d+敗)/) || [])[1] || '';
      const unbeatenLk = /0敗$/.test(s);
      add('lucky', '🍀', '勝利の女神', unbeatenLk ? `${lk.name}が出れば負けない！` : `${lk.name}が出ると勝つ！`, s, `出場${(lk.display.match(/出場(\d+)試合/) || [])[1] || ''}試合で${s}`, 'まずこの名前を探したくなる');
      used.add(lk.name);
    }
    const sorted = id => records.filter(r => r.record === id).sort((a, b) => b.value - a.value);
    const pm = sorted('plusminus').find(r => !used.has(r.name));
    if (pm) { add('plusminus', '➕', '影のMVP', `${pm.name}がいると点差が開く！`, `${pm.value > 0 ? '+' : ''}${pm.value}`, pm.display.replace(/^[+-]?\d+/, '').replace(/[（）]/g, ''), '数字が貢献を証明'); used.add(pm.name); }
    const gp = sorted('golden_pair').find(r => r.name.split('＆').every(nm => !used.has(nm))) || sorted('golden_pair').find(r => !lk || !r.name.split('＆').includes(lk.name));
    if (gp) add('pair', '💞', '黄金コンビ', /0敗/.test(gp.display.split('（')[0]) ? `${gp.name.replace('＆', '×')}、2人そろえば負けない！` : `${gp.name.replace('＆', '×')}、2人そろえば勝ち点が積み上がる！`, gp.display.split('（')[0], `${gp.display.split('（')[1].replace('）', '')}で${gp.display.split('（')[0]}`, 'この2人、セットで見たい');

    // ---- もっと話題（試合・ゴール・出場の記録から） ----
    const lastOf = (list, ok) => { let c = 0; for (let i = list.length - 1; i >= 0 && ok(list[i]); i--) c++; return c; };
    // 完封
    const cs = ms.filter(m => n(m.ga) === 0), csRun = lastOf(ms, m => n(m.ga) === 0);
    if (cs.length) add('cleansheet', '🧤', '完封', csRun >= 2 ? `${csRun}試合連続で完封中！` : `今季${cs.length}試合で完封！`, `${cs.length}試合`, `失点ゼロの${cs.length}試合は${rec(cs).s}${csRun >= 2 ? `。第${ms[ms.length - csRun].round}節からゴールを割らせていない` : ''}`, '守備陣にも大きな拍手を');
    // 連勝
    const wRun = lastOf(ms, m => m.result === '勝');
    let wBest = 0, wCur = 0; ms.forEach(m => { wCur = m.result === '勝' ? wCur + 1 : 0; wBest = Math.max(wBest, wCur); });
    if (wRun >= 2) add('winstreak', '🚀', '連勝', `${wRun}連勝中！止まらないテゲバ`, `${wRun}連勝`, `第${ms[ms.length - wRun].round}節から勝ち続けている${wBest > wRun ? `。今季の最長は${wBest}連勝` : wRun >= 3 ? '。今季いちばんの連勝' : ''}`, '次も勝って記録を伸ばそう');
    // 2点取れば
    const two = rec(ms.filter(m => n(m.gf) >= 2));
    if (two.c >= 2) add('twogoals', '✌️', '2点の法則', two.l === 0 ? '2点取れば、もう負けない！' : `2点取れば${two.w}勝！`, two.s, `2点以上取った${two.c}試合は${two.s}`, '2点目のチャントは大きめに');
    // 1点差
    const close = rec(ms.filter(m => Math.abs(n(m.gf) - n(m.ga)) === 1));
    if (close.c >= 2) add('close', '🤏', '1点差ゲーム', close.ppg >= 2 ? '1点差の勝負に強い！' : '1点差ゲームの成績', close.s, `1点差で決着した${close.c}試合は${close.s}`, '最後の1点まで声を枯らそう');
    // 先制されても
    const conc = ms.filter(m => m.first_goal === '相手'), concR = rec(conc), concOk = concR.w + concR.d;
    if (concOk) add('comeback', '💪', '粘り腰', `先制されても${concOk}試合で勝ち点をもぎ取った！`, `${concOk}試合`, `相手に先に決められた${concR.c}試合は${concR.s}`, '1点取られてからが本番');
    // ゴールの時間割（前後半それぞれ15分ずつ）
    const mine2 = goals_all.filter(g => g.team === '宮崎');
    const SLOT = ['前半0〜15分', '前半16〜30分', '前半31分〜', '後半0〜15分', '後半16〜30分', '後半31分〜'];
    const slotOf = g => { const h2 = /^後半/.test(String(g.time)) || (!/^前半/.test(String(g.time)) && n(g.minute) > 45); const t = h2 ? n(g.minute) - 45 : n(g.minute); return (h2 ? 3 : 0) + Math.min(2, Math.max(0, Math.floor((t - 1) / 15))); };
    const sc = [0, 0, 0, 0, 0, 0]; mine2.forEach(g => sc[slotOf(g)]++);
    if (mine2.length >= 5) { const bi = sc.indexOf(Math.max(...sc)); add('timezone', '🕒', 'ゴールの時間割', `いちばん決めるのは${SLOT[bi]}！`, `${sc[bi]}点`, SLOT.map((l, i) => `${l} ${sc[i]}点`).join('／'), `${SLOT[bi]}は目が離せない`); }
    // 最速ゴール
    const fast = [...mine2].sort((a, b) => n(a.minute) - n(b.minute))[0];
    if (fast) { const fm = ms.find(m => String(m.round) === String(fast.round)); const q = mine2.filter(g => slotOf(g) === 0).length; add('fastest', '⚡', '最速ゴール', `今季の最速ゴールは${fast.time}！`, fast.time.replace(/^前半/, ''), `第${fast.round}節${fm ? `の${fm.opponent}戦` : ''}で${fast.scorer}が決めた。開始15分までのゴールは今季${q}点`, 'キックオフの瞬間から見逃せない'); }
    // お天気
    // 晴れ＝主な天気が晴れ（「晴」で始まり、雨がない）。「曇り時々晴」は晴れに入れない。雨＝雨が入る（にわか雨をふくむ）
    const sunny = rec(ms.filter(m => /^晴/.test(m.weather) && !/雨/.test(m.weather))), rainy = rec(ms.filter(m => /雨/.test(m.weather)));
    if (sunny.c >= 3 && rainy.c >= 2) { const s = sunny.ppg >= rainy.ppg; add('weather', s ? '🌤️' : '☔', 'お天気と勝敗', s ? '晴れたらテゲバ日和！' : '雨の日のテゲバは強い！', s ? sunny.s : rainy.s, `晴れの日は${sunny.s}、雨（にわか雨をふくむ）の日は${rainy.s}`, s ? '日焼け止めを持ってスタジアムへ' : 'カッパを持ってスタジアムへ'); }
    // ホームの得点力
    const hm = ms.filter(m => m.ha === 'H'), am = ms.filter(m => m.ha === 'A'), sum = (l, k) => l.reduce((s, m) => s + n(m[k]), 0);
    if (hm.length && am.length && sum(hm, 'gf') / hm.length > sum(am, 'gf') / am.length) add('homegoals', '🏠', 'ホームの得点力', `いちごでは1試合平均${(sum(hm, 'gf') / hm.length).toFixed(1)}得点！`, `${(sum(hm, 'gf') / hm.length).toFixed(1)}点`, `ホーム${hm.length}試合で${sum(hm, 'gf')}得点・${sum(hm, 'ga')}失点、アウェイ${am.length}試合で${sum(am, 'gf')}得点・${sum(am, 'ga')}失点`, 'ゴールの瞬間はいちごで見よう');
    // 総力戦
    const usedP = new Set(appearances.map(a => a.name)), startP = new Set(appearances.filter(a => n(a.started) === 1).map(a => a.name));
    if (usedP.size) add('squad', '👥', '総力戦', `${usedP.size}人が出場！全員で戦う総力戦`, `${usedP.size}人`, `今季の出場は${usedP.size}人、そのうち先発は${startP.size}人`, 'ベンチもスタンドも全員で');
    // アシスト
    const ast = players.filter(p => n(p.assists) > 0), astMax = Math.max(0, ...ast.map(p => n(p.assists)));
    if (ast.length >= 2) { const kings = ast.filter(p => n(p.assists) === astMax).map(p => p.name); add('assists', '🎁', 'お膳立て', `${ast.length}人がアシスト！ラストパスの名手は${kings.join('・')}`, `${astMax}アシスト`, `今季のアシストは合わせて${ast.reduce((s, p) => s + n(p.assists), 0)}本。${ast.length}人がゴールをお膳立て`, 'ゴールの前のパスにも拍手を'); }
    // シュート数
    const sf = sum(ms, 'shots_for'), sa = sum(ms, 'shots_against');
    if (sf > sa && ms.length) add('shots', '🎯', '打ち勝つ', `シュート数で相手を${sf - sa}本上回る！`, `${sf}本`, `1試合平均${(sf / ms.length).toFixed(1)}本（相手は${(sa / ms.length).toFixed(1)}本）`, '打てば入る、打たなきゃ入らない');
    return T.map((t, i) => ({ ...t, order: i + 1, post: `${t.headline}\n${t.sub}\n${t.cheer}\n#テゲバジャーロ宮崎 #テゲバ #テゲスタ` }));
  }
});


  const out = { ...D };
  const pending = Object.keys(C);
  let guard = 0;
  while (pending.length && guard++ < 100) {
    const id = pending.shift();
    const def = C[id];
    if (!def.inputs.every(k => k in out)) { pending.push(id); continue; }
    out[id] = def.fn(...def.inputs.map(k => out[k]));
  }
  if (pending.length) throw new Error('未解決の計算: ' + pending.join(', '));
  return out;
}
