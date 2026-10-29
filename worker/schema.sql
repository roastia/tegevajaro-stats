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
