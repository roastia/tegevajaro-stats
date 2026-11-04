// 対戦相手のクラブ公式サイト（相手チーム名から開く）。
// Jリーグ公式のクラブページ（jleague.jp/club/〇〇/）にある公式サイトのリンクを https で開けることを確かめて入れる。
// キーは試合データの略称（matches / fixtures の opponent）と正式名（opponent_full）の両方
const C = [
  ['札幌', '北海道コンサドーレ札幌', 'https://www.consadole-sapporo.jp/'],
  ['八戸', 'ヴァンラーレ八戸', 'https://www.vanraure.net/'],
  ['仙台', 'ベガルタ仙台', 'https://www.vegalta.co.jp/'],
  ['秋田', 'ブラウブリッツ秋田', 'https://blaublitz.jp/'],
  ['山形', 'モンテディオ山形', 'https://www.montedioyamagata.jp/'],
  ['いわき', 'いわきFC', 'https://iwakifc.com/'],
  ['栃木C', '栃木シティ', 'https://tochigi-city.com/'],
  ['大宮', 'RB大宮アルディージャ', 'https://www.rbomiya.com/'],
  ['横浜FC', '横浜FC', 'https://www.yokohamafc.com/'],
  ['湘南', '湘南ベルマーレ', 'https://www.bellmare.co.jp/'],
  ['甲府', 'ヴァンフォーレ甲府', 'https://www.ventforet.jp/'],
  ['新潟', 'アルビレックス新潟', 'https://www.albirex.co.jp/'],
  ['富山', 'カターレ富山', 'https://www.kataller.co.jp/'],
  ['磐田', 'ジュビロ磐田', 'https://www.jubilo-iwata.co.jp/'],
  ['藤枝', '藤枝MYFC', 'https://myfc.co.jp/'],
  ['徳島', '徳島ヴォルティス', 'https://www.vortis.jp/'],
  ['今治', 'FC今治', 'https://www.fcimabari.com/'],
  ['鳥栖', 'サガン鳥栖', 'https://www.sagan-tosu.net/'],
  ['大分', '大分トリニータ', 'https://www.oita-trinita.co.jp/'],
];
const MAP = new Map(C.flatMap(([s, f, u]) => [[s, u], [f, u]]));
/** 相手チーム名（略称・正式名）→ 公式サイトの URL（ないときは ''） */
export const clubUrl = name => MAP.get(String(name || '').trim()) || '';
export const CLUB_LIST = C;
