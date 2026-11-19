#!/bin/sh
# テスト用データベース（test-tegesta-db）に届いたものを、まとめて手元に取り出す。本番の受け箱（private/*-inbox.json）とは別のファイルにする
# 事前に：cd worker && npx wrangler@4.150.0 login
set -e
mkdir -p private
cd worker
q() { npx --yes wrangler@4.150.0 d1 execute test-tegesta-db --remote --json --command "$2" > "../private/test-$1.json"; echo "private/test-$1.json"; }
q suki     "SELECT id, created_at, strftime('%Y-%m-%d', created_at, '+9 hours') AS date, strftime('%H:%M', created_at, '+9 hours') AS time, nickname, body, status FROM suki_submissions ORDER BY id"
q spots    "SELECT * FROM submissions ORDER BY id"
q links    "SELECT * FROM link_submissions ORDER BY id"
q removals "SELECT * FROM removal_requests ORDER BY id"
q yosou    "SELECT match, gf, ga, COUNT(*) AS n FROM yosou_votes GROUP BY match, gf, ga ORDER BY match, n DESC"
q likes    "SELECT spot, n FROM hearts ORDER BY spot"
echo "テスト用データベースから取り出しました（$(date '+%Y-%m-%d %H:%M')）"
