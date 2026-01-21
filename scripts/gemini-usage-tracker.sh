#!/bin/bash
#
# Gemini API Usage Tracker
#
# 概要: Gemini APIの使用量を追跡し、無料枠超過を防止する
# 設計: Claude Code + Gemini Pro（共同設計）
# 作成日: 2026-01-17
#

set -e

# ===== 設定 =====
GEMINI_DIR="$HOME/.gemini"
USAGE_FILE="$GEMINI_DIR/usage.json"
CONFIG_FILE="$GEMINI_DIR/usage-config.json"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DISCORD_SCRIPT="$SCRIPT_DIR/notify-discord.sh"

# デフォルト設定
DEFAULT_DAILY_LIMIT=1000
DEFAULT_RATE_LIMIT_REQUESTS=50
DEFAULT_RATE_LIMIT_WINDOW=60
DEFAULT_WARNING_80=80
DEFAULT_WARNING_95=95

# カラー定義
RED='\033[0;31m'
YELLOW='\033[1;33m'
ORANGE='\033[0;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# ===== ユーティリティ関数 =====

# jqの存在確認
check_jq() {
  if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq command not found. Please install jq.${NC}" >&2
    echo "  brew install jq  # macOS" >&2
    echo "  apt install jq   # Ubuntu/Debian" >&2
    exit 1
  fi
}

# ディレクトリとファイルの初期化
init_files() {
  # ディレクトリ作成
  if [ ! -d "$GEMINI_DIR" ]; then
    mkdir -p "$GEMINI_DIR"
  fi

  # usage.jsonの初期化
  if [ ! -f "$USAGE_FILE" ]; then
    local today=$(date -u +%Y-%m-%d)
    echo "{\"date\": \"$today\", \"daily_count\": 0, \"rate_limit_timestamps\": []}" > "$USAGE_FILE"
  fi

  # config.jsonの初期化（存在しない場合）
  if [ ! -f "$CONFIG_FILE" ]; then
    cat > "$CONFIG_FILE" << EOF
{
  "daily_limit": $DEFAULT_DAILY_LIMIT,
  "warnings": [
    { "threshold_percent": $DEFAULT_WARNING_95, "type": "critical" },
    { "threshold_percent": $DEFAULT_WARNING_80, "type": "warning" }
  ],
  "rate_limit": {
    "requests": $DEFAULT_RATE_LIMIT_REQUESTS,
    "window_seconds": $DEFAULT_RATE_LIMIT_WINDOW
  },
  "discord_notify_script": "$DISCORD_SCRIPT"
}
EOF
  fi
}

# 設定値の取得
get_config() {
  local key=$1
  local default=$2
  if [ -f "$CONFIG_FILE" ]; then
    local value=$(jq -r "$key // empty" "$CONFIG_FILE" 2>/dev/null)
    if [ -n "$value" ] && [ "$value" != "null" ]; then
      echo "$value"
      return
    fi
  fi
  echo "$default"
}

# 日付チェックとリセット
check_and_reset_daily() {
  local today=$(date -u +%Y-%m-%d)
  local file_date=$(jq -r '.date // ""' "$USAGE_FILE" 2>/dev/null)

  if [ "$file_date" != "$today" ]; then
    # 日付が変わったのでリセット
    echo "{\"date\": \"$today\", \"daily_count\": 0, \"rate_limit_timestamps\": []}" > "$USAGE_FILE"
  fi
}

# Discord通知（Gemini監査による改善: 失敗時の警告追加）
notify_discord() {
  local type=$1
  local message=$2
  local discord_script=$(get_config '.discord_notify_script' "$DISCORD_SCRIPT")

  if [ -x "$discord_script" ]; then
    if ! "$discord_script" "$type" "$message" 2>/dev/null; then
      echo -e "${YELLOW}Warning: Failed to send Discord notification.${NC}" >&2
    fi
  fi
}

# ===== メイン機能 =====

# check: 使用量チェック
cmd_check() {
  check_and_reset_daily

  local daily_count=$(jq -r '.daily_count // 0' "$USAGE_FILE")
  local daily_limit=$(get_config '.daily_limit' $DEFAULT_DAILY_LIMIT)

  # 日次上限チェック
  if [ "$daily_count" -ge "$daily_limit" ]; then
    echo -e "${RED}❌ [ERROR] Gemini API daily limit reached: $daily_count/$daily_limit${NC}" >&2
    notify_discord "error" "Gemini API日次上限到達: $daily_count/$daily_limit"
    exit 1
  fi

  # レート制限チェック
  local now=$(date +%s)
  local window=$(get_config '.rate_limit.window_seconds' $DEFAULT_RATE_LIMIT_WINDOW)
  local rate_limit=$(get_config '.rate_limit.requests' $DEFAULT_RATE_LIMIT_REQUESTS)
  local cutoff=$((now - window))

  # 過去window秒以内のタイムスタンプをカウント
  local recent_count=$(jq "[.rate_limit_timestamps[] | select(. >= $cutoff)] | length" "$USAGE_FILE" 2>/dev/null || echo 0)

  if [ "$recent_count" -ge 60 ]; then
    echo -e "${RED}❌ [ERROR] Gemini API rate limit reached: $recent_count/60 per minute${NC}" >&2
    # 次の分まで待機
    local wait_time=$((60 - (now % 60)))
    echo -e "${YELLOW}Waiting $wait_time seconds for rate limit reset...${NC}"
    sleep "$wait_time"
    exit 1
  elif [ "$recent_count" -ge "$rate_limit" ]; then
    echo -e "${YELLOW}⚠️ [WARNING] Approaching rate limit: $recent_count/60 per minute${NC}"
  fi

  # 正常
  exit 0
}

# increment: カウンター増加
cmd_increment() {
  check_and_reset_daily

  local now=$(date +%s)
  local daily_limit=$(get_config '.daily_limit' $DEFAULT_DAILY_LIMIT)
  local window=$(get_config '.rate_limit.window_seconds' $DEFAULT_RATE_LIMIT_WINDOW)
  local cutoff=$((now - window))

  # カウンターを増加し、古いタイムスタンプを削除
  local new_data=$(jq --argjson now "$now" --argjson cutoff "$cutoff" '
    .daily_count += 1 |
    .rate_limit_timestamps = ([.rate_limit_timestamps[] | select(. >= $cutoff)] + [$now])
  ' "$USAGE_FILE")

  # アトミックな更新（Gemini監査による改善提案）
  local temp_file=$(mktemp)
  echo "$new_data" > "$temp_file"
  mv "$temp_file" "$USAGE_FILE"

  # 新しいカウント値を取得
  local daily_count=$(echo "$new_data" | jq -r '.daily_count')
  local percent=$((daily_count * 100 / daily_limit))

  # 閾値チェック
  if [ "$percent" -ge 100 ]; then
    echo -e "${RED}❌ [ERROR] Gemini API daily limit reached: $daily_count/$daily_limit (100%)${NC}"
    notify_discord "error" "Gemini API日次上限到達: $daily_count/$daily_limit"
  elif [ "$percent" -ge 95 ]; then
    echo -e "${ORANGE}🔴 [CRITICAL] Gemini API usage: $daily_count/$daily_limit ($percent%)${NC}"
    notify_discord "waiting" "Gemini API使用量警告（重大）: $daily_count/$daily_limit ($percent%)"
  elif [ "$percent" -ge 80 ]; then
    echo -e "${YELLOW}⚠️ [WARNING] Gemini API usage: $daily_count/$daily_limit ($percent%)${NC}"
  else
    echo -e "${GREEN}✓ Gemini API usage: $daily_count/$daily_limit ($percent%)${NC}"
  fi
}

# status: 状態表示
cmd_status() {
  check_and_reset_daily

  local daily_count=$(jq -r '.daily_count // 0' "$USAGE_FILE")
  local daily_limit=$(get_config '.daily_limit' $DEFAULT_DAILY_LIMIT)
  local percent=$((daily_count * 100 / daily_limit))
  local date=$(jq -r '.date' "$USAGE_FILE")

  local now=$(date +%s)
  local window=$(get_config '.rate_limit.window_seconds' $DEFAULT_RATE_LIMIT_WINDOW)
  local cutoff=$((now - window))
  local recent_count=$(jq "[.rate_limit_timestamps[] | select(. >= $cutoff)] | length" "$USAGE_FILE" 2>/dev/null || echo 0)

  # UTC 0時までの残り時間
  local tomorrow=$(date -u -d tomorrow +%Y-%m-%d 2>/dev/null || date -u -v+1d +%Y-%m-%d)
  local reset_time=$(date -u -d "$tomorrow 00:00:00" +%s 2>/dev/null || date -u -j -f "%Y-%m-%d %H:%M:%S" "$tomorrow 00:00:00" +%s)
  local hours_left=$(( (reset_time - now) / 3600 ))
  local mins_left=$(( ((reset_time - now) % 3600) / 60 ))

  echo "======================================"
  echo "  Gemini API Usage Status"
  echo "======================================"
  echo ""
  echo "📅 Date (UTC): $date"
  echo ""
  echo "📊 Daily Usage:"
  echo "   $daily_count / $daily_limit ($percent%)"
  echo "   [$( printf '█%.0s' $(seq 1 $((percent / 5))) )$( printf '░%.0s' $(seq 1 $((20 - percent / 5))) )]"
  echo ""
  echo "⏱️ Rate Limit (per minute):"
  echo "   $recent_count / 60"
  echo ""
  echo "🔄 Reset in: ${hours_left}h ${mins_left}m"
  echo ""
  echo "======================================"
}

# reset: 手動リセット
cmd_reset() {
  local today=$(date -u +%Y-%m-%d)
  echo "{\"date\": \"$today\", \"daily_count\": 0, \"rate_limit_timestamps\": []}" > "$USAGE_FILE"
  echo -e "${GREEN}✓ Usage counter has been reset.${NC}"
}

# help: ヘルプ表示
cmd_help() {
  echo "Gemini API Usage Tracker"
  echo ""
  echo "Usage: $0 <command>"
  echo ""
  echo "Commands:"
  echo "  check      Check if API usage is within limits"
  echo "  increment  Increment the usage counter"
  echo "  status     Show current usage status"
  echo "  reset      Reset the usage counter"
  echo "  help       Show this help message"
  echo ""
  echo "Files:"
  echo "  $USAGE_FILE     - Usage data"
  echo "  $CONFIG_FILE    - Configuration"
}

# ===== メイン処理 =====

main() {
  check_jq
  init_files

  local command=${1:-help}

  case "$command" in
    check)
      cmd_check
      ;;
    increment)
      cmd_increment
      ;;
    status)
      cmd_status
      ;;
    reset)
      cmd_reset
      ;;
    help|--help|-h)
      cmd_help
      ;;
    *)
      echo -e "${RED}Error: Unknown command '$command'${NC}" >&2
      cmd_help
      exit 1
      ;;
  esac
}

main "$@"
