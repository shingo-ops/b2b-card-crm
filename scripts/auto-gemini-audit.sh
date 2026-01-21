#!/bin/bash
# auto-gemini-audit.sh - 自動Gemini監査トリガー
# TPS検証フェーズ自動化

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# 色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 監査条件
AUDIT_TRIGGERS=(
  "*.gs"           # GASファイル変更
  "CLAUDE.md"      # ルール変更
  "COMMON_RULES.md" # 共通ルール変更
  "TROUBLE_LOG.md" # 過去トラ追加
)

# 監査不要パターン
AUDIT_SKIP=(
  "*.md"           # 一般的なMarkdown（特定ファイル以外）
  "*.json"         # 設定ファイル
  "*.log"          # ログファイル
)

usage() {
  echo "Usage: $0 [check|trigger|status]"
  echo ""
  echo "Commands:"
  echo "  check   - 監査が必要かチェック（デフォルト）"
  echo "  trigger - 監査をトリガー（Gemini MCP呼び出し）"
  echo "  status  - 監査履歴を表示"
  exit 1
}

# 変更されたファイルをチェック
check_audit_needed() {
  local changed_files=""
  local needs_audit=false
  local audit_reason=""

  # git diffで変更ファイルを取得
  if git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    changed_files=$(git diff --cached --name-only 2>/dev/null || git diff --name-only HEAD~1 2>/dev/null || echo "")
  fi

  if [ -z "$changed_files" ]; then
    echo -e "${BLUE}[INFO]${NC} 変更ファイルなし"
    return 1
  fi

  # 監査トリガーに該当するファイルがあるかチェック
  for file in $changed_files; do
    # GASファイル
    if [[ "$file" == *.gs ]]; then
      needs_audit=true
      audit_reason="GASファイル変更: $file"
      break
    fi

    # CLAUDE.md
    if [[ "$file" == *"CLAUDE.md" ]]; then
      needs_audit=true
      audit_reason="ルールファイル変更: $file"
      break
    fi

    # COMMON_RULES.md
    if [[ "$file" == *"COMMON_RULES.md" ]]; then
      needs_audit=true
      audit_reason="共通ルール変更: $file"
      break
    fi

    # TROUBLE_LOG.md
    if [[ "$file" == *"TROUBLE_LOG.md" ]]; then
      needs_audit=true
      audit_reason="過去トラ追加: $file"
      break
    fi

    # ポカヨケ関連
    if [[ "$file" == *"POKAYOKE"* ]]; then
      needs_audit=true
      audit_reason="ポカヨケ変更: $file"
      break
    fi
  done

  if [ "$needs_audit" = true ]; then
    echo -e "${YELLOW}[AUDIT NEEDED]${NC} $audit_reason"
    echo "$audit_reason" > /tmp/audit_reason.txt
    return 0
  else
    echo -e "${GREEN}[OK]${NC} 監査不要"
    return 1
  fi
}

# 監査履歴を記録
record_audit() {
  local result="$1"
  local reason="$2"
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  local audit_log="$PROJECT_ROOT/docs/00_common/AUDIT_LOG.md"

  # 監査ログファイルがなければ作成
  if [ ! -f "$audit_log" ]; then
    cat > "$audit_log" << 'EOF'
# Gemini監査ログ

自動Gemini監査の実行履歴

---

| 日時 | 結果 | 理由 |
|------|------|------|
EOF
  fi

  # 履歴追記
  echo "| $timestamp | $result | $reason |" >> "$audit_log"
}

# 監査をトリガー
trigger_audit() {
  local reason=""

  if [ -f /tmp/audit_reason.txt ]; then
    reason=$(cat /tmp/audit_reason.txt)
    rm /tmp/audit_reason.txt
  else
    reason="手動トリガー"
  fi

  echo -e "${BLUE}========================================${NC}"
  echo -e "${BLUE}  GEMINI AUTO-AUDIT${NC}"
  echo -e "${BLUE}========================================${NC}"
  echo ""
  echo -e "理由: ${YELLOW}$reason${NC}"
  echo ""

  # Gemini MCP呼び出しはClaude Code内で行う必要があるため、
  # ここでは通知のみ
  echo -e "${YELLOW}[ACTION REQUIRED]${NC}"
  echo "Claude Codeで以下を実行してください:"
  echo ""
  echo "  /gemini-audit"
  echo ""
  echo "または手動で Gemini MCP を呼び出してください。"

  # Discord通知（設定されている場合）
  if [ -f "$SCRIPT_DIR/notify-discord.sh" ]; then
    "$SCRIPT_DIR/notify-discord.sh" info "Gemini監査が必要です: $reason"
  fi

  # 監査記録
  record_audit "pending" "$reason"
}

# 監査履歴を表示
show_status() {
  local audit_log="$PROJECT_ROOT/docs/00_common/AUDIT_LOG.md"

  if [ -f "$audit_log" ]; then
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  GEMINI AUDIT HISTORY${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    tail -20 "$audit_log"
  else
    echo -e "${YELLOW}[INFO]${NC} 監査履歴がありません"
  fi
}

# メイン処理
case "${1:-check}" in
  check)
    check_audit_needed
    ;;
  trigger)
    trigger_audit
    ;;
  status)
    show_status
    ;;
  *)
    usage
    ;;
esac
