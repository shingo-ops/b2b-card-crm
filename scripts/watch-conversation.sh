#!/bin/bash
# watch-conversation.sh - Claude Code会話を自動記録
#
# 機能:
# 1. Claude Codeセッションを監視
# 2. 会話を抽出・分類
# 3. Spreadsheet + GitHubに同期
#
# 使用方法:
#   ./scripts/watch-conversation.sh [--once]  # --once: 1回だけ実行

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# 設定
CLAUDE_DIR="$HOME/.claude/projects"
LAST_LINE_FILE="$PROJECT_ROOT/.conversation-last-line"
CONVERSATION_LOG="$PROJECT_ROOT/docs/01_crm/CONVERSATION_LOG.md"
SYNC_SCRIPT="$SCRIPT_DIR/sync-dashboard.sh"

# 設定読み込み
if [ -f "$PROJECT_ROOT/.dashboard-sync.env" ]; then
  source "$PROJECT_ROOT/.dashboard-sync.env"
fi

# 色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# カテゴリ判定
classify_message() {
  local msg="$1"

  # 指摘パターン（修正・訂正・否定）
  if echo "$msg" | grep -qiE '違う|ちがう|間違|エラー|動かない|おかしい|修正して|直して|バグ|してない|じゃない|ではない|誤解|だけだよ|だけど'; then
    echo "指摘"
    return
  fi

  # 依頼パターン（作業依頼・確認依頼）
  if echo "$msg" | grep -qiE 'してほしい|してください|追加して|作って|実装して|変更して|できる？|調査して|確認して|チェックして|お願い'; then
    echo "依頼"
    return
  fi

  # 説明パターン（質問・理解確認）
  if echo "$msg" | grep -qiE 'なぜ|どうして|教えて|意味|説明して|わからない|どういう|どんな'; then
    echo "説明"
    return
  fi

  echo "その他"
}

# プロジェクト名を抽出
extract_project_name() {
  local path="$1"
  # -Users-xxx-sales-ops-with-claude -> sales-ops
  # -Users-xxx-sales-ops-with-claude-crm-dashboard -> crm-dashboard
  if echo "$path" | grep -q "sales-ops-with-claude$"; then
    echo "sales-ops"
  else
    echo "$path" | sed 's/.*-sales-ops-with-claude-//' | sed 's/-[a-f0-9]*$//'
  fi
}

# 最新のセッションファイルを検索
find_session() {
  find "$CLAUDE_DIR" -path "*/subagents/*" -prune -o \
    -name "*.jsonl" -type f -mmin -60 -size +500c -print \
    2>/dev/null | xargs ls -t 2>/dev/null | head -1
}

# CONVERSATION_LOG.md 初期化
init_conversation_log() {
  if [ ! -f "$CONVERSATION_LOG" ]; then
    mkdir -p "$(dirname "$CONVERSATION_LOG")"
    cat > "$CONVERSATION_LOG" << 'EOF'
# 会話ログ

Claude Codeとの会話記録。自動生成。

## 記録形式

| 日時 | プロジェクト | カテゴリ | 内容 |
|------|-------------|----------|------|

---

EOF
  fi
}

# GitHubに会話を追記
append_to_github() {
  local timestamp="$1"
  local project="$2"
  local category="$3"
  local message="$4"

  # メッセージを1行に整形（改行を除去）
  local clean_msg=$(echo "$message" | tr '\n' ' ' | sed 's/  */ /g' | cut -c1-100)

  # 日付ヘッダー
  local today=$(date +%Y-%m-%d)
  local date_header="## $today"

  # 日付ヘッダーがなければ追加
  if ! grep -q "^$date_header" "$CONVERSATION_LOG" 2>/dev/null; then
    echo "" >> "$CONVERSATION_LOG"
    echo "$date_header" >> "$CONVERSATION_LOG"
    echo "" >> "$CONVERSATION_LOG"
  fi

  # 会話を追記（UTCからJSTに変換: +9時間）
  local utc_time=$(echo "$timestamp" | cut -d'T' -f2 | cut -d'.' -f1 | cut -d'Z' -f1)
  local hour=$(echo "$utc_time" | cut -d':' -f1)
  local min_sec=$(echo "$utc_time" | cut -d':' -f2-)
  local jst_hour=$(( (10#$hour + 9) % 24 ))
  local jst_time=$(printf "%02d:%s" $jst_hour "$min_sec")
  echo "- **$jst_time** [$project] \`$category\`: $clean_msg" >> "$CONVERSATION_LOG"
}

# セッションを処理
process_session() {
  local session_file="$1"
  local project_path=$(dirname "$session_file")
  local project_name=$(extract_project_name "$project_path")

  # 最終処理行を取得
  local last_line=0
  local line_key=$(echo "$session_file" | md5 | cut -c1-8)
  local line_file="${LAST_LINE_FILE}_${line_key}"

  if [ -f "$line_file" ]; then
    last_line=$(cat "$line_file" 2>/dev/null || echo 0)
  fi

  # 現在の行数
  local current_lines=$(wc -l < "$session_file" | tr -d ' ')

  # 新しい行がなければスキップ
  if [ "$current_lines" -le "$last_line" ]; then
    return
  fi

  echo -e "${BLUE}Processing: $project_name ($((current_lines - last_line)) new lines)${NC}"

  # 新しい行を処理
  tail -n +$((last_line + 1)) "$session_file" | while IFS= read -r line; do
    # ユーザーメッセージを抽出
    local msg_type=$(echo "$line" | jq -r '.type // empty' 2>/dev/null)

    if [ "$msg_type" = "user" ]; then
      # メッセージ内容を取得
      local content=$(echo "$line" | jq -r '
        .message.content // .content // "" |
        if type == "string" then . else "" end
      ' 2>/dev/null)

      # システムメッセージを除外
      if echo "$content" | grep -qE '<local-command|<command-name>|<system-reminder>|<task-notification>'; then
        continue
      fi

      # 空メッセージをスキップ
      if [ -z "$content" ] || [ "$content" = "null" ]; then
        continue
      fi

      # タイムスタンプ取得
      local timestamp=$(echo "$line" | jq -r '.timestamp // empty' 2>/dev/null)
      if [ -z "$timestamp" ]; then
        timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
      fi

      # カテゴリ判定
      local category=$(classify_message "$content")

      # 全カテゴリを記録（その他も含む、分析用）
      echo -e "${GREEN}  [$category] ${content:0:50}...${NC}"

      # GitHubに追記
      append_to_github "$timestamp" "$project_name" "$category" "$content"

      # Spreadsheetに同期（その他以外）
      if [ "$category" != "その他" ] && [ -x "$SYNC_SCRIPT" ] && [ -n "$GAS_DASHBOARD_URL" ]; then
        "$SYNC_SCRIPT" conversation \
          -p "$project_name" \
          -c "$category" \
          -m "$content" 2>/dev/null || true
      fi
    fi
  done

  # 処理行を更新
  echo "$current_lines" > "$line_file"
}

# git commit
commit_changes() {
  cd "$PROJECT_ROOT"
  if git diff --quiet "$CONVERSATION_LOG" 2>/dev/null; then
    return
  fi

  git add "$CONVERSATION_LOG"
  git commit -m "会話ログ自動記録: $(date +%Y-%m-%d)" 2>/dev/null || true
}

# メイン処理
main() {
  local once_mode=false

  if [ "$1" = "--once" ]; then
    once_mode=true
  fi

  init_conversation_log

  echo -e "${BLUE}Watching Claude sessions...${NC}"

  while true; do
    SESSION=$(find_session)

    if [ -n "$SESSION" ]; then
      process_session "$SESSION"
      commit_changes
    fi

    if $once_mode; then
      break
    fi

    sleep 5
  done
}

main "$@"
