#!/bin/bash
# session-end-check.sh - Claude Codeセッション終了時チェック
# 目的: 指摘回数とTROUBLE記録数の整合性チェック + KPIレポート生成
# TROUBLE-059対応: 過去トラ記録漏れの強制チェック機構

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "========================================"
echo -e "${BLUE}  SESSION END CHECK${NC}"
echo "========================================"
echo ""

WARNINGS=0

# 1. 今日のTROUBLE記録数を確認
TROUBLE_LOG="$PROJECT_ROOT/docs/01_crm/TROUBLE_LOG.md"
TODAY=$(date '+%Y-%m-%d')

if [ -f "$TROUBLE_LOG" ]; then
  # 今日の日付が含まれるTROUBLE数をカウント
  TODAY_TROUBLE_COUNT=$(grep -c "### 発生日: $TODAY" "$TROUBLE_LOG" 2>/dev/null || echo "0")

  echo -e "${YELLOW}[過去トラ記録状況]${NC}"
  echo -e "  今日の新規TROUBLE: ${GREEN}${TODAY_TROUBLE_COUNT}件${NC}"
  echo ""
fi

# 2. 会話ログから「指摘」カテゴリのカウント（オプション）
CONVERSATION_LOG="$PROJECT_ROOT/docs/01_crm/CONVERSATION_LOG.md"
if [ -f "$CONVERSATION_LOG" ]; then
  # 今日の指摘カウント
  TODAY_FEEDBACK_COUNT=$(grep -c "$TODAY.*\`指摘\`" "$CONVERSATION_LOG" 2>/dev/null || echo "0")

  echo -e "${YELLOW}[会話ログ - 指摘カテゴリ]${NC}"
  echo -e "  今日の指摘回数: ${RED}${TODAY_FEEDBACK_COUNT}件${NC}"
  echo ""

  # 整合性チェック
  if [ "$TODAY_FEEDBACK_COUNT" -gt "$TODAY_TROUBLE_COUNT" ]; then
    echo -e "${RED}[警告] 指摘回数(${TODAY_FEEDBACK_COUNT})がTROUBLE記録数(${TODAY_TROUBLE_COUNT})より多い${NC}"
    echo -e "${RED}       未記録の過去トラがある可能性があります${NC}"
    WARNINGS=$((WARNINGS + 1))
  fi
fi

# 3. KPIレポート生成
echo -e "${YELLOW}[KPIレポート - 本セッション]${NC}"
echo ""

# TROUBLE総数
TOTAL_TROUBLE=$(grep -c "^### TROUBLE-" "$TROUBLE_LOG" 2>/dev/null || echo "0")

# 今日のコミット数
TODAY_COMMITS=$(cd "$PROJECT_ROOT" && git log --oneline --since="$TODAY 00:00:00" 2>/dev/null | wc -l | tr -d ' ')

echo "| KPI | 値 |"
echo "|-----|-----|"
echo "| 今日のTROUBLE記録 | ${TODAY_TROUBLE_COUNT}件 |"
echo "| 今日の指摘回数 | ${TODAY_FEEDBACK_COUNT}件 |"
echo "| 今日のコミット数 | ${TODAY_COMMITS}件 |"
echo "| TROUBLE総数 | ${TOTAL_TROUBLE}件 |"
echo ""

# 4. 未対応の確認
echo -e "${YELLOW}[未対応チェック]${NC}"

# 「対策中」状態のTROUBLE
IN_PROGRESS=$(grep -c "状態: 対策中" "$TROUBLE_LOG" 2>/dev/null || echo "0")
if [ "$IN_PROGRESS" -gt 0 ]; then
  echo -e "  ${YELLOW}対策中のTROUBLE: ${IN_PROGRESS}件${NC}"
  grep -B5 "状態: 対策中" "$TROUBLE_LOG" | grep "^## TROUBLE-" | sed 's/^/    /'
else
  echo -e "  ${GREEN}対策中のTROUBLE: 0件${NC}"
fi
echo ""

# 5. 結果判定
echo "========================================"
if [ $WARNINGS -gt 0 ]; then
  echo -e "${RED}[警告] セッション終了前に確認が必要です${NC}"
  echo ""
  echo -e "${RED}過去トラ記録漏れの可能性:${NC}"
  echo "  1. 指摘があった場合はTROUBLE_LOG.mdに記録したか確認"
  echo "  2. 不具合が発生した場合はTROUBLE-XXXを発番したか確認"
  echo ""
  echo -e "${YELLOW}記録漏れがない場合はそのまま終了してOK${NC}"
else
  echo -e "${GREEN}[OK] セッション終了チェック完了${NC}"
fi
echo "========================================"
echo ""

exit 0
