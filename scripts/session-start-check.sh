#!/bin/bash
# session-start-check.sh - Claude Codeセッション開始時チェック
# 目的: 必須ファイル読了のリマインダーと、過去トラ件数の通知

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
echo -e "${BLUE}  SESSION START CHECK${NC}"
echo "========================================"
echo ""

# 1. 必須読了ファイルリマインダー
echo -e "${YELLOW}[必須読了ファイル - Section 0.2]${NC}"
echo ""

REQUIRED_FILES=(
  "docs/00_common/COMMON_RULES.md"
  "CLAUDE.md"
  "docs/01_crm/TROUBLE_LOG.md"
  "docs/01_crm/PROJECT_SPECIFICATION.md"
)

for file in "${REQUIRED_FILES[@]}"; do
  if [ -f "$PROJECT_ROOT/$file" ]; then
    LINE_COUNT=$(wc -l < "$PROJECT_ROOT/$file" | tr -d ' ')
    echo -e "  ${GREEN}✅${NC} $file (${LINE_COUNT}行)"
  else
    echo -e "  ${RED}❌${NC} $file - 見つかりません"
  fi
done

echo ""

# 2. 過去トラ件数と最新情報
TROUBLE_LOG="$PROJECT_ROOT/docs/01_crm/TROUBLE_LOG.md"
if [ -f "$TROUBLE_LOG" ]; then
  TROUBLE_COUNT=$(grep -c "^### TROUBLE-" "$TROUBLE_LOG" 2>/dev/null || echo "0")
  LATEST_TROUBLE=$(grep "^### TROUBLE-" "$TROUBLE_LOG" | tail -1 | sed 's/### //' | cut -d':' -f1)

  echo -e "${YELLOW}[過去トラ情報]${NC}"
  echo -e "  総件数: ${RED}${TROUBLE_COUNT}件${NC}"
  echo -e "  最新: ${LATEST_TROUBLE}"
  echo ""
fi

# 3. ポカヨケ件数
CLAUDE_MD="$PROJECT_ROOT/CLAUDE.md"
if [ -f "$CLAUDE_MD" ]; then
  SECTION_COUNT=$(grep -c "^## [0-9]" "$CLAUDE_MD" 2>/dev/null || echo "0")
  echo -e "${YELLOW}[CLAUDE.md Sectionn数]${NC}"
  echo -e "  ポカヨケSection: ${GREEN}${SECTION_COUNT}件${NC}"
  echo ""
fi

# 4. 今日の日付と最終コミット
echo -e "${YELLOW}[環境情報]${NC}"
echo -e "  今日: $(date '+%Y-%m-%d %H:%M')"
LAST_COMMIT=$(cd "$PROJECT_ROOT" && git log -1 --format="%h %s" 2>/dev/null || echo "取得失敗")
echo -e "  最終コミット: $LAST_COMMIT"
echo ""

# 5. リマインダー出力
echo "========================================"
echo -e "${RED}[重要] 作業開始前に必ず上記4ファイルを全文読了${NC}"
echo -e "${RED}       省略・要約読み禁止（Section 0.2）${NC}"
echo "========================================"
echo ""

exit 0
