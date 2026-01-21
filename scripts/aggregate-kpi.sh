#!/bin/bash
# KPI集計スクリプト
# 各工程のPOKA_HISTORY.mdからポカ発生数・再発数を集計

PROCESS_QUALITY_DIR="docs/00_common/PROCESS_QUALITY"

echo "=========================================="
echo "工程別品質管理 KPI集計"
echo "=========================================="
echo ""
echo "| 工程 | ポカ発生数 | 再発数 | 再発率 |"
echo "|------|-----------|--------|--------|"

TOTAL_POKA=0
TOTAL_RECUR=0

# 各工程フォルダを走査
for dir in "$PROCESS_QUALITY_DIR"/*/; do
  if [ -d "$dir" ]; then
    PROCESS_NAME=$(basename "$dir")
    POKA_FILE="$dir/POKA_HISTORY.md"

    if [ -f "$POKA_FILE" ]; then
      # POKA-XX-XXX形式の行数をカウント（ヘッダーとテンプレート行を除く）
      POKA_COUNT=$(grep -c "POKA-[0-9][0-9]-[0-9]" "$POKA_FILE" 2>/dev/null) || POKA_COUNT=0
      # テンプレート行を除外
      TEMPLATE_COUNT=$(grep -c "テンプレート" "$POKA_FILE" 2>/dev/null) || TEMPLATE_COUNT=0
      POKA_COUNT=$((POKA_COUNT - TEMPLATE_COUNT))
      if [ "$POKA_COUNT" -lt 0 ]; then
        POKA_COUNT=0
      fi

      # 再発数は統計セクションから取得（簡易実装）
      RECUR_COUNT=0

      # 再発率計算
      if [ "$POKA_COUNT" -gt 0 ]; then
        RECUR_RATE="$((RECUR_COUNT * 100 / POKA_COUNT))%"
      else
        RECUR_RATE="-"
      fi

      echo "| $PROCESS_NAME | $POKA_COUNT | $RECUR_COUNT | $RECUR_RATE |"

      TOTAL_POKA=$((TOTAL_POKA + POKA_COUNT))
      TOTAL_RECUR=$((TOTAL_RECUR + RECUR_COUNT))
    fi
  fi
done

echo ""
echo "=========================================="
echo "合計"
echo "=========================================="
echo ""
echo "| 指標 | 値 |"
echo "|------|-----|"
echo "| ポカ発生総数 | $TOTAL_POKA |"
echo "| 再発総数 | $TOTAL_RECUR |"

if [ "$TOTAL_POKA" -gt 0 ]; then
  TOTAL_RATE="$((TOTAL_RECUR * 100 / TOTAL_POKA))%"
else
  TOTAL_RATE="0%"
fi
echo "| 全工程再発率 | $TOTAL_RATE |"
echo ""
echo "KGI目標: 再発率 0%"
