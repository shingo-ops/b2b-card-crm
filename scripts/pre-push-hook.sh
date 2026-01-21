#!/bin/bash
# pre-push hook: push前に未コミットファイルを警告
# インストール: cp scripts/pre-push-hook.sh .git/hooks/pre-push && chmod +x .git/hooks/pre-push

# 未コミットファイルがあれば警告
UNCOMMITTED=$(git status --porcelain 2>/dev/null)
if [ -n "$UNCOMMITTED" ]; then
  echo ""
  echo "=========================================="
  echo "⚠️  警告: 未コミットファイルがあります"
  echo "=========================================="
  echo ""
  echo "$UNCOMMITTED"
  echo ""
  echo "これらのファイルはpushされません。"
  echo ""
  read -p "このままpushしますか？ (y/N): " answer
  if [ "$answer" != "y" ] && [ "$answer" != "Y" ]; then
    echo "pushをキャンセルしました"
    exit 1
  fi
fi

exit 0
