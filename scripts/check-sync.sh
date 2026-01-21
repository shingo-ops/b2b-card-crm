#!/bin/bash
# ローカル ↔ GitHub 同期チェックスクリプト
# KGI: ローカルとGitHubのファイルずれ0件

set -e

echo "=========================================="
echo "ローカル ↔ GitHub 同期チェック"
echo "=========================================="
echo ""

# 1. 未コミットファイルのチェック
echo "=== 1. 未コミットファイルチェック ==="
UNCOMMITTED=$(git status --porcelain 2>/dev/null)
if [ -n "$UNCOMMITTED" ]; then
  echo "⚠️  未コミットファイルがあります:"
  echo "$UNCOMMITTED"
  echo ""
  UNCOMMITTED_COUNT=$(echo "$UNCOMMITTED" | wc -l | tr -d ' ')
else
  echo "✅ 未コミットファイルなし"
  UNCOMMITTED_COUNT=0
fi
echo ""

# 2. 未pushコミットのチェック
echo "=== 2. 未pushコミットチェック ==="
git fetch origin main --quiet 2>/dev/null || true
UNPUSHED=$(git log origin/main..HEAD --oneline 2>/dev/null)
if [ -n "$UNPUSHED" ]; then
  echo "⚠️  未pushコミットがあります:"
  echo "$UNPUSHED"
  echo ""
  UNPUSHED_COUNT=$(echo "$UNPUSHED" | wc -l | tr -d ' ')
else
  echo "✅ 未pushコミットなし"
  UNPUSHED_COUNT=0
fi
echo ""

# 3. リモートとの差分チェック
echo "=== 3. リモートとの差分チェック ==="
BEHIND=$(git log HEAD..origin/main --oneline 2>/dev/null)
if [ -n "$BEHIND" ]; then
  echo "⚠️  リモートに未取得のコミットがあります:"
  echo "$BEHIND"
  echo ""
  echo "git pull を実行してください"
  BEHIND_COUNT=$(echo "$BEHIND" | wc -l | tr -d ' ')
else
  echo "✅ リモートと同期済み"
  BEHIND_COUNT=0
fi
echo ""

# 4. 結果サマリー
echo "=========================================="
echo "同期チェック結果"
echo "=========================================="
echo ""
echo "| 項目 | 件数 | 状態 |"
echo "|------|------|------|"
echo "| 未コミットファイル | $UNCOMMITTED_COUNT | $([ $UNCOMMITTED_COUNT -eq 0 ] && echo '✅' || echo '⚠️') |"
echo "| 未pushコミット | $UNPUSHED_COUNT | $([ $UNPUSHED_COUNT -eq 0 ] && echo '✅' || echo '⚠️') |"
echo "| 未取得コミット | $BEHIND_COUNT | $([ $BEHIND_COUNT -eq 0 ] && echo '✅' || echo '⚠️') |"
echo ""

TOTAL=$((UNCOMMITTED_COUNT + UNPUSHED_COUNT + BEHIND_COUNT))
if [ $TOTAL -eq 0 ]; then
  echo "✅ ローカルとGitHubは完全に同期されています"
  exit 0
else
  echo "⚠️  同期ずれが $TOTAL 件あります"
  exit 1
fi
