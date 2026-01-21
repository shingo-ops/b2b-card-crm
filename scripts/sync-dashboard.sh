#!/bin/bash
# sync-dashboard.sh - ダッシュボードデータ同期スクリプト
#
# 使用方法:
#   ./scripts/sync-dashboard.sh <action> [options]
#
# アクション:
#   conversation  - 会話ログを同期
#   gemini        - Gemini使用状況を同期
#   claude        - Claude使用状況を同期
#   health        - ヘルスチェック
#
# 環境変数:
#   GAS_DASHBOARD_URL  - GAS Web App URL (必須)
#   GAS_SYNC_API_KEY   - API キー (オプション)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# 設定ファイルから読み込み
CONFIG_FILE="$PROJECT_ROOT/.dashboard-sync.env"
if [ -f "$CONFIG_FILE" ]; then
  source "$CONFIG_FILE"
fi

# デフォルト値
GAS_DASHBOARD_URL="${GAS_DASHBOARD_URL:-}"
GAS_SYNC_API_KEY="${GAS_SYNC_API_KEY:-}"

# 色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ヘルプ表示
show_help() {
  cat << EOF
Usage: $(basename "$0") <action> [options]

Actions:
  conversation  Sync conversation log
  gemini        Sync Gemini usage
  claude        Sync Claude usage
  health        Health check

Options:
  -p, --project     Project name (for conversation)
  -c, --category    Category (指摘/依頼/説明 for conversation, audit/search/etc for gemini/claude)
  -m, --message     Human message (for conversation)
  -r, --response    Claude response (for conversation)
  -d, --description Description (for gemini/claude)
  -h, --help        Show this help

Environment Variables:
  GAS_DASHBOARD_URL   GAS Web App deployment URL
  GAS_SYNC_API_KEY    API key for authentication

Examples:
  # Sync conversation log
  $0 conversation -p "CRM Dashboard" -c "依頼" -m "機能追加してほしい"

  # Sync Gemini usage
  $0 gemini -c "audit" -d "コード監査実行"

  # Sync Claude usage
  $0 claude -c "development" -d "新機能開発"

  # Health check
  $0 health
EOF
}

# URLチェック
check_url() {
  if [ -z "$GAS_DASHBOARD_URL" ]; then
    echo -e "${YELLOW}Warning: GAS_DASHBOARD_URL is not set.${NC}"
    echo "Please set the environment variable or create .dashboard-sync.env file."
    echo ""
    echo "Example .dashboard-sync.env:"
    echo "  GAS_DASHBOARD_URL=\"https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec\""
    echo "  GAS_SYNC_API_KEY=\"your-api-key\""
    exit 1
  fi
}

# APIリクエスト送信
send_request() {
  local action="$1"
  local data="$2"

  local payload=$(cat << EOF
{
  "action": "$action",
  "api_key": "$GAS_SYNC_API_KEY",
  "data": $data
}
EOF
)

  # GAS Web AppはPOSTに対して302リダイレクトを返す
  # リダイレクト先URLを取得してGETでアクセスする必要がある
  local redirect_url=$(curl -s -X POST "$GAS_DASHBOARD_URL" \
    -H "Content-Type: application/json" \
    -d "$payload" \
    -w "%{redirect_url}" \
    -o /dev/null)

  if [ -n "$redirect_url" ]; then
    # リダイレクト先からレスポンスを取得
    local response=$(curl -s "$redirect_url")
    echo "$response"
  else
    # リダイレクトがない場合は直接レスポンスを取得
    local response=$(curl -s -X POST "$GAS_DASHBOARD_URL" \
      -H "Content-Type: application/json" \
      -d "$payload")
    echo "$response"
  fi
}

# 会話ログ同期
sync_conversation() {
  local project=""
  local category=""
  local message=""
  local response=""

  while [[ $# -gt 0 ]]; do
    case $1 in
      -p|--project)
        project="$2"
        shift 2
        ;;
      -c|--category)
        category="$2"
        shift 2
        ;;
      -m|--message)
        message="$2"
        shift 2
        ;;
      -r|--response)
        response="$2"
        shift 2
        ;;
      *)
        shift
        ;;
    esac
  done

  if [ -z "$project" ] || [ -z "$category" ]; then
    echo -e "${RED}Error: --project and --category are required for conversation sync${NC}"
    exit 1
  fi

  # JSONエスケープ
  message=$(echo "$message" | jq -Rs .)
  response=$(echo "$response" | jq -Rs .)

  local data=$(cat << EOF
{
  "project_name": "$project",
  "category": "$category",
  "human_message": $message,
  "claude_response": $response
}
EOF
)

  echo -e "${BLUE}Syncing conversation log...${NC}"
  local result=$(send_request "sync_conversation" "$data")

  if echo "$result" | jq -e '.success' > /dev/null 2>&1; then
    echo -e "${GREEN}Conversation synced successfully!${NC}"
    echo "$result" | jq .
  else
    echo -e "${RED}Sync failed: $result${NC}"
    exit 1
  fi
}

# Gemini使用状況同期
sync_gemini() {
  local category="other"
  local description=""

  while [[ $# -gt 0 ]]; do
    case $1 in
      -c|--category)
        category="$2"
        shift 2
        ;;
      -d|--description)
        description="$2"
        shift 2
        ;;
      *)
        shift
        ;;
    esac
  done

  # JSONエスケープ
  description=$(echo "$description" | jq -Rs .)

  local data=$(cat << EOF
{
  "category": "$category",
  "description": $description
}
EOF
)

  echo -e "${BLUE}Syncing Gemini usage...${NC}"
  local result=$(send_request "sync_gemini" "$data")

  if echo "$result" | jq -e '.success' > /dev/null 2>&1; then
    echo -e "${GREEN}Gemini usage synced successfully!${NC}"
    echo "$result" | jq .
  else
    echo -e "${RED}Sync failed: $result${NC}"
    exit 1
  fi
}

# Claude使用状況同期
sync_claude() {
  local category="development"
  local description=""

  while [[ $# -gt 0 ]]; do
    case $1 in
      -c|--category)
        category="$2"
        shift 2
        ;;
      -d|--description)
        description="$2"
        shift 2
        ;;
      *)
        shift
        ;;
    esac
  done

  # JSONエスケープ
  description=$(echo "$description" | jq -Rs .)

  local data=$(cat << EOF
{
  "category": "$category",
  "description": $description
}
EOF
)

  echo -e "${BLUE}Syncing Claude usage...${NC}"
  local result=$(send_request "sync_claude" "$data")

  if echo "$result" | jq -e '.success' > /dev/null 2>&1; then
    echo -e "${GREEN}Claude usage synced successfully!${NC}"
    echo "$result" | jq .
  else
    echo -e "${RED}Sync failed: $result${NC}"
    exit 1
  fi
}

# ヘルスチェック
health_check() {
  echo -e "${BLUE}Running health check...${NC}"
  local result=$(send_request "health_check" "{}")

  if echo "$result" | jq -e '.success' > /dev/null 2>&1; then
    echo -e "${GREEN}Health check passed!${NC}"
    echo "$result" | jq .
  else
    echo -e "${RED}Health check failed: $result${NC}"
    exit 1
  fi
}

# メイン処理
main() {
  if [ $# -eq 0 ]; then
    show_help
    exit 0
  fi

  local action="$1"
  shift

  case "$action" in
    conversation)
      check_url
      sync_conversation "$@"
      ;;
    gemini)
      check_url
      sync_gemini "$@"
      ;;
    claude)
      check_url
      sync_claude "$@"
      ;;
    health)
      check_url
      health_check
      ;;
    -h|--help|help)
      show_help
      ;;
    *)
      echo -e "${RED}Unknown action: $action${NC}"
      show_help
      exit 1
      ;;
  esac
}

main "$@"
