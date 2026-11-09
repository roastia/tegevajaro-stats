#!/bin/sh
# 掲載をやめる依頼（裏にたまったもの）を手元に取り出す。公開しないフォルダ private/ に保存する
# 事前に：cd worker && npx wrangler@4.150.0 login
set -e
mkdir -p private
cd worker
npx --yes wrangler@4.150.0 d1 execute tegesta-spots --remote --json \
  --command "SELECT id, created_at, item, reason, note, status FROM removal_requests ORDER BY id" > ../private/removals-inbox.json
echo "private/removals-inbox.json に保存しました（$(date '+%Y-%m-%d %H:%M')）"
