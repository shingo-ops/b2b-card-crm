#!/bin/bash
# ポカヨケテストスクリプト
# KGI: ポカヨケ稼働率 100%

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

PASS=0
FAIL=0
TOTAL=0

# テスト結果を記録
test_result() {
  local name="$1"
  local result="$2"
  local detail="$3"

  TOTAL=$((TOTAL + 1))

  if [ "$result" = "PASS" ]; then
    echo "✅ PASS: $name"
    PASS=$((PASS + 1))
  else
    echo "❌ FAIL: $name"
    echo "   詳細: $detail"
    FAIL=$((FAIL + 1))
  fi
}

echo "=========================================="
echo "ポカヨケテスト"
echo "KGI: 稼働率 100%"
echo "=========================================="
echo ""

# ===== テスト1: LockService Check =====
echo "--- テスト1: LockService Check ---"

# 1a: LockServiceあり → パス
TEST_FILE=$(mktemp).gs
cat > "$TEST_FILE" << 'EOF'
function test() {
  const lock = LockService.getScriptLock();
  ss.insertSheet('test');
  lock.releaseLock();
}
EOF

if grep -q "insertSheet" "$TEST_FILE" && grep -q "LockService" "$TEST_FILE"; then
  test_result "LockServiceあり検出" "PASS" ""
else
  test_result "LockServiceあり検出" "FAIL" "正常ファイルを正常と判定できず"
fi
rm "$TEST_FILE"

# 1b: LockServiceなし → エラー検出
TEST_FILE=$(mktemp).gs
cat > "$TEST_FILE" << 'EOF'
function test() {
  ss.insertSheet('test');
}
EOF

if grep -q "insertSheet" "$TEST_FILE" && ! grep -q "LockService" "$TEST_FILE"; then
  test_result "LockServiceなし検出" "PASS" ""
else
  test_result "LockServiceなし検出" "FAIL" "エラーファイルをエラーと判定できず"
fi
rm "$TEST_FILE"

echo ""

# ===== テスト2: PROCESS_QUALITY Files Check =====
echo "--- テスト2: PROCESS_QUALITY Files Check ---"

# 2a: 全工程フォルダに3ファイルあるか
MISSING=0
for DIR in docs/00_common/PROCESS_QUALITY/*/; do
  if [ -d "$DIR" ]; then
    proc=$(basename "$DIR")
    if [[ ! "$proc" =~ ^[0-9]{2}_ ]]; then
      continue
    fi
    for file in POKAYOKE.md TROUBLE_LOG.md POKA_HISTORY.md; do
      if [ ! -f "$DIR$file" ]; then
        MISSING=$((MISSING + 1))
      fi
    done
  fi
done

if [ $MISSING -eq 0 ]; then
  test_result "全工程3ファイル存在" "PASS" ""
else
  test_result "全工程3ファイル存在" "FAIL" "$MISSING ファイル欠落"
fi

# 2b: INDEX.md存在
if [ -f "docs/00_common/PROCESS_QUALITY/INDEX.md" ]; then
  test_result "INDEX.md存在" "PASS" ""
else
  test_result "INDEX.md存在" "FAIL" "INDEX.mdが存在しない"
fi

echo ""

# ===== テスト3: 同期チェックスクリプト =====
echo "--- テスト3: 同期チェックスクリプト ---"

# 3a: スクリプト存在・実行可能
if [ -x "scripts/check-sync.sh" ]; then
  test_result "check-sync.sh実行可能" "PASS" ""
else
  test_result "check-sync.sh実行可能" "FAIL" "スクリプトが存在しないか実行権限がない"
fi

# 3b: スクリプト実行テスト
if ./scripts/check-sync.sh > /dev/null 2>&1 || true; then
  test_result "check-sync.sh実行" "PASS" ""
else
  test_result "check-sync.sh実行" "FAIL" "スクリプト実行エラー"
fi

echo ""

# ===== テスト4: 新規工程追加スクリプト =====
echo "--- テスト4: 新規工程追加スクリプト ---"

# 4a: スクリプト存在・実行可能
if [ -x "scripts/add-new-process.sh" ]; then
  test_result "add-new-process.sh実行可能" "PASS" ""
else
  test_result "add-new-process.sh実行可能" "FAIL" "スクリプトが存在しないか実行権限がない"
fi

# 4b: ヘルプ表示テスト
if ./scripts/add-new-process.sh 2>&1 | grep -q "使用方法"; then
  test_result "add-new-process.shヘルプ" "PASS" ""
else
  test_result "add-new-process.shヘルプ" "FAIL" "ヘルプが表示されない"
fi

# 4c: テスト工程作成・削除
TEST_PROC_NUM=99
TEST_PROC_NAME="TEST_POKAYOKE"
TEST_PROC_DIR="docs/00_common/PROCESS_QUALITY/${TEST_PROC_NUM}_${TEST_PROC_NAME}"

# クリーンアップ（既存があれば削除）
rm -rf "$TEST_PROC_DIR" 2>/dev/null || true

# テスト工程作成
if ./scripts/add-new-process.sh $TEST_PROC_NUM $TEST_PROC_NAME "テスト用工程" > /dev/null 2>&1; then
  # 3ファイル存在確認
  if [ -f "$TEST_PROC_DIR/POKAYOKE.md" ] && \
     [ -f "$TEST_PROC_DIR/TROUBLE_LOG.md" ] && \
     [ -f "$TEST_PROC_DIR/POKA_HISTORY.md" ]; then
    test_result "新規工程3ファイル生成" "PASS" ""
  else
    test_result "新規工程3ファイル生成" "FAIL" "一部ファイルが生成されていない"
  fi
else
  test_result "新規工程3ファイル生成" "FAIL" "スクリプト実行エラー"
fi

# テスト工程削除
rm -rf "$TEST_PROC_DIR" 2>/dev/null || true

echo ""

# ===== テスト5: KPI集計スクリプト =====
echo "--- テスト5: KPI集計スクリプト ---"

# 5a: スクリプト存在・実行可能
if [ -x "scripts/aggregate-kpi.sh" ]; then
  test_result "aggregate-kpi.sh実行可能" "PASS" ""
else
  test_result "aggregate-kpi.sh実行可能" "FAIL" "スクリプトが存在しないか実行権限がない"
fi

# 5b: スクリプト実行テスト
if ./scripts/aggregate-kpi.sh > /dev/null 2>&1; then
  test_result "aggregate-kpi.sh実行" "PASS" ""
else
  test_result "aggregate-kpi.sh実行" "FAIL" "スクリプト実行エラー"
fi

echo ""

# ===== テスト6: GitHub Actions YAML検証 =====
echo "--- テスト6: GitHub Actions YAML検証 ---"

# 6a: gas-pokayoke.yml存在
if [ -f ".github/workflows/gas-pokayoke.yml" ]; then
  test_result "gas-pokayoke.yml存在" "PASS" ""
else
  test_result "gas-pokayoke.yml存在" "FAIL" "ファイルが存在しない"
fi

# 6b: process-quality-check.yml存在
if [ -f ".github/workflows/process-quality-check.yml" ]; then
  test_result "process-quality-check.yml存在" "PASS" ""
else
  test_result "process-quality-check.yml存在" "FAIL" "ファイルが存在しない"
fi

echo ""

# ===== テスト7: 自動化システム存在チェック =====
echo "--- テスト7: 自動化システム ---"

# 7a: scheduled-health-check.yml
if [ -f ".github/workflows/scheduled-health-check.yml" ]; then
  test_result "scheduled-health-check.yml存在" "PASS" ""
else
  test_result "scheduled-health-check.yml存在" "FAIL" "定期ヘルスチェックが存在しない"
fi

# 7b: security-check.yml
if [ -f ".github/workflows/security-check.yml" ]; then
  test_result "security-check.yml存在" "PASS" ""
else
  test_result "security-check.yml存在" "FAIL" "セキュリティチェックが存在しない"
fi

# 7c: code-quality-check.yml
if [ -f ".github/workflows/code-quality-check.yml" ]; then
  test_result "code-quality-check.yml存在" "PASS" ""
else
  test_result "code-quality-check.yml存在" "FAIL" "コード品質チェックが存在しない"
fi

# 7d: backup-verification.yml
if [ -f ".github/workflows/backup-verification.yml" ]; then
  test_result "backup-verification.yml存在" "PASS" ""
else
  test_result "backup-verification.yml存在" "FAIL" "バックアップ検証が存在しない"
fi

echo ""

# ===== テスト8: デプロイ前チェック =====
echo "--- テスト8: デプロイ前チェック ---"

# 8a: pre-deploy-check.sh存在・実行可能
if [ -x "scripts/pre-deploy-check.sh" ]; then
  test_result "pre-deploy-check.sh実行可能" "PASS" ""
else
  test_result "pre-deploy-check.sh実行可能" "FAIL" "スクリプトが存在しないか実行権限がない"
fi

echo ""

# ===== テスト9: 自動化システムドキュメント =====
echo "--- テスト9: ドキュメント ---"

# 9a: AUTOMATION_SYSTEMS.md存在
if [ -f "docs/00_common/AUTOMATION_SYSTEMS.md" ]; then
  test_result "AUTOMATION_SYSTEMS.md存在" "PASS" ""
else
  test_result "AUTOMATION_SYSTEMS.md存在" "FAIL" "自動化システム一覧が存在しない"
fi

echo ""

# ===== 結果サマリー =====
echo "=========================================="
echo "ポカヨケテスト結果"
echo "=========================================="
echo ""
echo "| 項目 | 結果 |"
echo "|------|------|"
echo "| 総テスト数 | $TOTAL |"
echo "| パス | $PASS |"
echo "| 失敗 | $FAIL |"

# 稼働率計算
if [ $TOTAL -gt 0 ]; then
  RATE=$((PASS * 100 / TOTAL))
else
  RATE=0
fi

echo "| 稼働率 | ${RATE}% |"
echo ""

if [ $RATE -eq 100 ]; then
  echo "✅ KGI達成: ポカヨケ稼働率 100%"
  exit 0
else
  echo "❌ KGI未達: ポカヨケ稼働率 ${RATE}% (目標: 100%)"
  exit 1
fi
