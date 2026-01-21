#!/bin/bash
# デプロイ前チェックスクリプト
# KGI: 本番障害 0件
# clasp deploy 前に必ず実行

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

echo "==========================================="
echo "デプロイ前チェック"
echo "KGI: 本番障害 0件"
echo "==========================================="
echo ""

PASS=0
FAIL=0
WARN=0

# 結果記録
check_result() {
  local name="$1"
  local result="$2"
  local detail="$3"

  if [ "$result" = "PASS" ]; then
    echo "✅ PASS: $name"
    PASS=$((PASS + 1))
  elif [ "$result" = "WARN" ]; then
    echo "⚠️ WARN: $name"
    echo "   → $detail"
    WARN=$((WARN + 1))
  else
    echo "❌ FAIL: $name"
    echo "   → $detail"
    FAIL=$((FAIL + 1))
  fi
}

# ===== 1. Git状態チェック =====
echo "--- 1. Git状態チェック ---"

# 未コミットファイルチェック
UNCOMMITTED=$(git status --porcelain | wc -l | tr -d ' ')
if [ "$UNCOMMITTED" -eq 0 ]; then
  check_result "未コミットファイル" "PASS" ""
else
  check_result "未コミットファイル" "FAIL" "$UNCOMMITTED 件の未コミットファイルがあります"
fi

# 未プッシュコミットチェック
git fetch origin 2>/dev/null || true
CURRENT_BRANCH=$(git branch --show-current)
UNPUSHED=$(git log "origin/$CURRENT_BRANCH..HEAD" --oneline 2>/dev/null | wc -l | tr -d ' ')
if [ "$UNPUSHED" -eq 0 ]; then
  check_result "未プッシュコミット" "PASS" ""
else
  check_result "未プッシュコミット" "FAIL" "$UNPUSHED 件の未プッシュコミットがあります"
fi

echo ""

# ===== 2. API整合性チェック =====
echo "--- 2. API整合性チェック ---"

if [ -d "crm-dashboard" ]; then
  cd crm-dashboard

  if [ -f "package.json" ] && grep -q '"check"' package.json 2>/dev/null; then
    if npm run check > /dev/null 2>&1; then
      check_result "API整合性（npm run check）" "PASS" ""
    else
      check_result "API整合性（npm run check）" "FAIL" "API呼び出しの不整合があります"
    fi
  else
    # 手動チェック
    if [ -f "WebApp.gs" ]; then
      API_FUNCS=$(grep -oE "^function\s+\w+" WebApp.gs 2>/dev/null | sed 's/function //' | sort | uniq)
      HTML_CALLS=$(grep -rohE "google\.script\.run\.\w+\(" *.html 2>/dev/null | sed 's/google\.script\.run\.//' | sed 's/($//' | sort | uniq)

      MISSING=0
      for call in $HTML_CALLS; do
        if ! echo "$API_FUNCS" | grep -qw "$call"; then
          MISSING=$((MISSING + 1))
        fi
      done

      if [ $MISSING -eq 0 ]; then
        check_result "API整合性（手動）" "PASS" ""
      else
        check_result "API整合性（手動）" "FAIL" "$MISSING 件の未定義API呼び出し"
      fi
    else
      check_result "API整合性" "WARN" "WebApp.gsが見つかりません"
    fi
  fi

  cd "$PROJECT_ROOT"
else
  check_result "API整合性" "WARN" "crm-dashboardが見つかりません"
fi

echo ""

# ===== 3. LockServiceチェック =====
echo "--- 3. LockServiceチェック ---"

GAS_FILES=$(find . -name "*.gs" ! -path "./.git/*" ! -path "./node_modules/*" 2>/dev/null || true)
LOCK_VIOLATIONS=0

for file in $GAS_FILES; do
  if grep -qE "insertSheet|deleteSheet|insertRows|deleteRows" "$file" 2>/dev/null; then
    if ! grep -q "LockService" "$file" 2>/dev/null; then
      LOCK_VIOLATIONS=$((LOCK_VIOLATIONS + 1))
    fi
  fi
done

if [ $LOCK_VIOLATIONS -eq 0 ]; then
  check_result "LockService使用" "PASS" ""
else
  check_result "LockService使用" "FAIL" "$LOCK_VIOLATIONS 件のファイルでLockService未使用"
fi

echo ""

# ===== 4. セキュリティチェック =====
echo "--- 4. セキュリティチェック ---"

# 機密情報パターン検出
SECRET_PATTERNS="(api[_-]?key|password|secret|token)['\"]?\s*[:=]\s*['\"][a-zA-Z0-9]{16,}['\"]"
EXCLUDE_PATTERNS="(example|sample|template|dummy|test|XXXX|YOUR_)"

SECRETS_FOUND=$(grep -rE "$SECRET_PATTERNS" --include="*.gs" --include="*.js" --include="*.json" . 2>/dev/null | grep -ivE "$EXCLUDE_PATTERNS" | wc -l | tr -d ' ')

if [ "$SECRETS_FOUND" -eq 0 ]; then
  check_result "機密情報検出" "PASS" ""
else
  check_result "機密情報検出" "FAIL" "$SECRETS_FOUND 件の潜在的な機密情報"
fi

echo ""

# ===== 5. テスト環境確認 =====
echo "--- 5. テスト環境確認 ---"

# clasp.jsonの存在確認
if [ -f "crm-dashboard/.clasp.json" ]; then
  check_result "clasp.json存在" "PASS" ""
else
  check_result "clasp.json存在" "WARN" "clasp.jsonが見つかりません"
fi

echo ""

# ===== 6. ポカヨケテスト実行 =====
echo "--- 6. ポカヨケテスト ---"

if [ -x "scripts/test-pokayoke.sh" ]; then
  if ./scripts/test-pokayoke.sh > /dev/null 2>&1; then
    check_result "ポカヨケテスト" "PASS" ""
  else
    check_result "ポカヨケテスト" "FAIL" "ポカヨケテストに失敗"
  fi
else
  check_result "ポカヨケテスト" "WARN" "test-pokayoke.shが見つかりません"
fi

echo ""

# ===== 結果サマリー =====
echo "==========================================="
echo "デプロイ前チェック結果"
echo "==========================================="
echo ""
echo "| 項目 | 結果 |"
echo "|------|------|"
echo "| パス | $PASS |"
echo "| 失敗 | $FAIL |"
echo "| 警告 | $WARN |"
echo ""

if [ $FAIL -gt 0 ]; then
  echo "❌ デプロイ不可: $FAIL 件の問題を修正してください"
  echo ""
  echo "修正後、再度このスクリプトを実行してください："
  echo "  ./scripts/pre-deploy-check.sh"
  exit 1
elif [ $WARN -gt 0 ]; then
  echo "⚠️ 警告あり: 確認の上、デプロイを実行してください"
  echo ""
  echo "デプロイコマンド:"
  echo "  cd crm-dashboard && clasp deploy --deploymentId [本番ID] --description \"説明\""
  exit 0
else
  echo "✅ デプロイ可能: すべてのチェックをパス"
  echo ""
  echo "デプロイコマンド:"
  echo "  cd crm-dashboard && clasp deploy --deploymentId [本番ID] --description \"説明\""
  exit 0
fi
