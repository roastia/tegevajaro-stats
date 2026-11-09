-- おすすめスポットの投稿（公開しない受け箱）
CREATE TABLE IF NOT EXISTS submissions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT    NOT NULL,              -- ISO 8601（UTC）
  name       TEXT    NOT NULL,              -- 場所の名前
  area       TEXT    NOT NULL DEFAULT '',   -- 市町村・エリア（任意）
  info       TEXT    NOT NULL,              -- ひとこと情報
  x_handle   TEXT    NOT NULL DEFAULT '',   -- 投稿者の X アカウント（@なし・任意）
  status     TEXT    NOT NULL DEFAULT 'pending'  -- pending / approved / rejected（載せたかどうかのメモ）
);

-- 同じ回線（IP）からは1日 IP_DAILY_LIMIT 件まで。IP アドレスそのものは保存せず、日ごとに変わる鍵でハッシュ化した値だけを置く。2日たったら消す
CREATE TABLE IF NOT EXISTS ip_counts (
  day     TEXT    NOT NULL,   -- 日本時間の日付 YYYY-MM-DD
  ip_hash TEXT    NOT NULL,
  n       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, ip_hash)
);

-- 同じ日に、場所の名前とひとことが同じ投稿は受けない。内容から作ったハッシュを2日間だけ置く
CREATE TABLE IF NOT EXISTS dup_hashes (
  day  TEXT NOT NULL,
  hash TEXT NOT NULL,
  PRIMARY KEY (day, hash)
);

-- ハート（みやざき情報のおすすめスポット）。ログインなしで押せる。数は公開しない（並び順だけ返す）
CREATE TABLE IF NOT EXISTS hearts (
  spot TEXT    PRIMARY KEY,           -- spots.csv の id（s1・s2 …）
  n    INTEGER NOT NULL DEFAULT 0
);
-- 同じ回線（IP）から同じスポットへは1日1回まで。IP はハッシュだけ、2日たったら消す
CREATE TABLE IF NOT EXISTS heart_marks (
  day     TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  spot    TEXT NOT NULL,
  PRIMARY KEY (day, ip_hash, spot)
);

-- Cloudflare の Studio でハートを名前つきで見るための対応表とビュー（Worker は読まない）
-- 中身は spots.csv から `npm run spots:names` で入れ直す（サイトに公開している名前だけ）
CREATE TABLE IF NOT EXISTS spot_names (id TEXT PRIMARY KEY, name TEXT NOT NULL, area TEXT NOT NULL DEFAULT '');
CREATE VIEW IF NOT EXISTS hearts_named AS SELECT s.id AS spot, s.name, s.area, COALESCE(h.n, 0) AS n FROM spot_names s LEFT JOIN hearts h ON h.spot = s.id ORDER BY n DESC, s.id;

-- リンク集への情報提供（公開しない受け箱）。送ってもらうのは URL だけ
CREATE TABLE IF NOT EXISTS link_submissions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT    NOT NULL,              -- ISO 8601（UTC）
  url        TEXT    NOT NULL,
  status     TEXT    NOT NULL DEFAULT 'pending'  -- pending / approved / rejected
);

-- 掲載をやめる依頼（公開しない受け箱）。対象（spots.csv の s〇・links.csv の l〇）と理由だけ。連絡先は受け取らない
CREATE TABLE IF NOT EXISTS removal_requests (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT    NOT NULL,
  item       TEXT    NOT NULL,
  reason     TEXT    NOT NULL,
  note       TEXT    NOT NULL DEFAULT '',
  status     TEXT    NOT NULL DEFAULT 'pending'  -- pending / done（取り下げた） / kept（そのまま）
);
