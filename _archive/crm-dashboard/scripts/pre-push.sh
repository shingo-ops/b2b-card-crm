#!/bin/bash
#
# pre-push.sh - clasp push前に実行するスクリプト
#
# 使い方:
#   ./scripts/pre-push.sh
#   または
#   npm run push
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo ""
echo "========================================"
echo "  Pre-Push チェック"
echo "========================================"
echo ""

# 1. API整合性チェック
echo "1. API整合性チェックを実行中..."
node scripts/check-api-integrity.js

if [ $? -ne 0 ]; then
  echo ""
  echo "API整合性チェックに失敗しました。"
  echo "上記のエラーを修正してから再度実行してください。"
  exit 1
fi

echo ""
echo "2. clasp pushを実行中..."
clasp push

echo ""
echo "========================================"
echo "  完了"
echo "========================================"
echo ""
