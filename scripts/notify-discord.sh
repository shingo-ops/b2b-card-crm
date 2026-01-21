#!/bin/bash

# Discord通知スクリプト（用途別チャンネル対応）
# 使い方: ./notify-discord.sh [タイプ] "[メッセージ]"
#
# チャンネル:
#   - バグ報告用: DISCORD_BUGREPORT_WEBHOOK（異常検知、エラー通知）
#   - 依頼用: DISCORD_REQUEST_WEBHOOK（承認依頼、人間への依頼）
#
# 設定方法:
#   .envファイルに両方のWebhook URLを設定

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# .envファイルがあれば読み込む
if [ -f "$PROJECT_ROOT/.env" ]; then
  source "$PROJECT_ROOT/.env"
fi

TYPE=$1
MESSAGE=$2

# タイプに応じてWebhook URLとメッセージ形式を選択
case $TYPE in
  # ===== バグ報告チャンネル（異常検知系）=====
  "error")
    WEBHOOK_URL="$DISCORD_BUGREPORT_WEBHOOK"
    CONTENT="❌ **エラー発生**\n\n🚨 $MESSAGE\n👉 確認が必要です"
    ;;
  "bug")
    WEBHOOK_URL="$DISCORD_BUGREPORT_WEBHOOK"
    CONTENT="🐛 **バグ検知**\n\n$MESSAGE"
    ;;
  "security")
    WEBHOOK_URL="$DISCORD_BUGREPORT_WEBHOOK"
    CONTENT="🔐 **セキュリティ警告**\n\n$MESSAGE"
    ;;
  "failure")
    WEBHOOK_URL="$DISCORD_BUGREPORT_WEBHOOK"
    CONTENT="🚨 **異常検知**\n\n$MESSAGE"
    ;;
  "recovery")
    WEBHOOK_URL="$DISCORD_BUGREPORT_WEBHOOK"
    CONTENT="✅ **復旧完了**\n\n$MESSAGE"
    ;;

  # ===== 依頼チャンネル（人間への依頼系）=====
  "start")
    WEBHOOK_URL="$DISCORD_REQUEST_WEBHOOK"
    CONTENT="🚀 **離席モード開始**\n\n📋 タスク: $MESSAGE"
    ;;
  "complete")
    WEBHOOK_URL="$DISCORD_REQUEST_WEBHOOK"
    CONTENT="✅ **作業完了**\n\n$MESSAGE"
    ;;
  "waiting")
    WEBHOOK_URL="$DISCORD_REQUEST_WEBHOOK"
    CONTENT="⏸️ **承認待ち**\n\n❓ $MESSAGE\n👉 Claude Codeで確認してください"
    ;;
  "auth")
    WEBHOOK_URL="$DISCORD_REQUEST_WEBHOOK"
    CONTENT="🔐 **認証が必要です**\n\n📍 $MESSAGE\n👉 ターミナルで認証を完了してください"
    ;;
  "request")
    WEBHOOK_URL="$DISCORD_REQUEST_WEBHOOK"
    CONTENT="📨 **依頼**\n\n$MESSAGE"
    ;;
  "finish")
    WEBHOOK_URL="$DISCORD_REQUEST_WEBHOOK"
    CONTENT="🎉 **全作業完了**\n\n$MESSAGE"
    ;;

  # ===== デフォルト（依頼チャンネル）=====
  *)
    WEBHOOK_URL="$DISCORD_REQUEST_WEBHOOK"
    CONTENT="📢 $MESSAGE"
    ;;
esac

# Webhook URLが設定されていない場合
if [ -z "$WEBHOOK_URL" ]; then
  echo "エラー: Webhook URLが設定されていません"
  echo ""
  echo "タイプ '$TYPE' に必要な環境変数:"
  case $TYPE in
    error|bug|security|failure|recovery)
      echo "  DISCORD_BUGREPORT_WEBHOOK（バグ報告用）"
      ;;
    *)
      echo "  DISCORD_REQUEST_WEBHOOK（依頼用）"
      ;;
  esac
  echo ""
  echo "設定方法: .envファイルに追加"
  echo "  DISCORD_BUGREPORT_WEBHOOK=https://discord.com/api/webhooks/..."
  echo "  DISCORD_REQUEST_WEBHOOK=https://discord.com/api/webhooks/..."
  exit 1
fi

# 通知送信
curl -s -H "Content-Type: application/json" \
  -d "{\"content\": \"$CONTENT\"}" \
  "$WEBHOOK_URL" > /dev/null

echo "Discord notification sent: $TYPE"
