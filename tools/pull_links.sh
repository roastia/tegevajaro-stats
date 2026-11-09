#!/bin/sh
# リンク集への情報提供（裏にたまった URL）を手元に取り出す。公開しないフォルダ private/ に保存する
# 事前に：cd worker && npx wrangler@4.150.0 login
set -e
mkdir -p private
cd worker
npx --yes wrangler@4.150.0 d1 execute tegesta-spots --remote --json \
  --command "SELECT id, created_at, url, status FROM link_submissions ORDER BY id" > ../private/links-inbox.json
echo "private/links-inbox.json に保存しました（$(date '+%Y-%m-%d %H:%M')）"
