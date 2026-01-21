#!/bin/bash
# 3環境システム検証スクリプト
# KGI: 環境不整合 0件
# 用途: 環境構築後、または定期確認時に実行

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

echo "==========================================="
echo "3環境システム検証"
echo "KGI: 環境不整合 0件"
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
    [ -n "$detail" ] && echo "   → $detail"
    WARN=$((WARN + 1))
  else
    echo "❌ FAIL: $name"
    [ -n "$detail" ] && echo "   → $detail"
    FAIL=$((FAIL + 1))
  fi
}

# env-config.json読み込み
ENV_CONFIG="environments/env-config.json"
if [ ! -f "$ENV_CONFIG" ]; then
  echo "❌ env-config.jsonが見つかりません"
  exit 1
fi

echo "--- 1. フォルダ存在確認 ---"

# 各環境フォルダの存在確認
for env in prod dev prop; do
  folder=$(cat "$ENV_CONFIG" | grep -A5 "\"$env\"" | grep '"folder"' | sed 's/.*: *"\([^"]*\)".*/\1/')
  if [ -d "$folder" ]; then
    check_result "$env フォルダ ($folder)" "PASS" ""
  else
    check_result "$env フォルダ ($folder)" "FAIL" "フォルダが存在しません"
  fi
done

echo ""
echo "--- 2. .clasp.json整合性 ---"

# 各環境の.clasp.jsonとenv-config.jsonの整合性確認
for env in prod dev prop; do
  folder=$(cat "$ENV_CONFIG" | grep -A10 "\"$env\"" | grep '"folder"' | sed 's/.*: *"\([^"]*\)".*/\1/')
  expected_script_id=$(cat "$ENV_CONFIG" | grep -A10 "\"$env\"" | grep '"scriptId"' | sed 's/.*: *"\([^"]*\)".*/\1/')

  if [ -f "$folder/.clasp.json" ]; then
    actual_script_id=$(cat "$folder/.clasp.json" | grep '"scriptId"' | sed 's/.*: *"\([^"]*\)".*/\1/')

    if [ "$expected_script_id" = "$actual_script_id" ]; then
      check_result "$env scriptId一致" "PASS" ""
    else
      check_result "$env scriptId一致" "FAIL" "期待: $expected_script_id, 実際: $actual_script_id"
    fi
  else
    check_result "$env .clasp.json" "FAIL" "$folder/.clasp.jsonが存在しません"
  fi
done

echo ""
echo "--- 3. 08_Config.gs環境分離確認 ---"

# 提案環境の08_Config.gsに本番IDが混入していないか確認
PROD_SS_ID="1kF-o4jCrbQePktWaFEBvWhJJjRXhkuw5-AcISa4ClAk"

if [ -f "crm-dashboard-prop/08_Config.gs" ]; then
  if grep -q "$PROD_SS_ID" "crm-dashboard-prop/08_Config.gs"; then
    check_result "提案環境に本番ID混入なし" "FAIL" "本番スプレッドシートIDが含まれています"
  else
    check_result "提案環境に本番ID混入なし" "PASS" ""
  fi
else
  check_result "提案環境 08_Config.gs" "WARN" "ファイルが存在しません"
fi

if [ -f "crm-dashboard-dev/08_Config.gs" ]; then
  # 開発環境は本番IDを持っていても良い（切り替え用）が警告
  if grep -q "PROPOSAL_IDS\|DEV_IDS" "crm-dashboard-dev/08_Config.gs"; then
    check_result "開発環境の環境変数定義" "PASS" ""
  else
    check_result "開発環境の環境変数定義" "WARN" "環境専用の定数定義を推奨"
  fi
fi

echo ""
echo "--- 4. Google Driveフォルダ設定確認 ---"

# 正しいフォルダID（固定）
CORRECT_PROD_FOLDER="1JIPeqiT_2ucBUK875sQBcuSYHkT-GtdD"
CORRECT_DEV_FOLDER="1rV7ZKxZZtCubafp-9lMyCIPgmaAbJjh_"
CORRECT_PROP_FOLDER="1kDfjsZt6k6iXPRC6QRbjM6Kyfz2I1Bm5"

# env-config.jsonのdriveFolderIdが正しいか確認
for env in prod dev prop; do
  folder_id=$(cat "$ENV_CONFIG" | grep -A15 "\"$env\"" | grep '"driveFolderId"' | sed 's/.*: *"\([^"]*\)".*/\1/' | head -1)

  case $env in
    prod) expected_folder="$CORRECT_PROD_FOLDER" ;;
    dev) expected_folder="$CORRECT_DEV_FOLDER" ;;
    prop) expected_folder="$CORRECT_PROP_FOLDER" ;;
  esac

  if [ -n "$folder_id" ] && [ "$folder_id" = "$expected_folder" ]; then
    check_result "$env driveFolderId設定" "PASS" ""
  elif [ -n "$folder_id" ] && [ "$folder_id" != "null" ]; then
    check_result "$env driveFolderId設定" "FAIL" "期待: $expected_folder, 実際: $folder_id"
  else
    check_result "$env driveFolderId設定" "FAIL" "driveFolderIdが未設定"
  fi
done

echo ""
echo "--- 4.5 命名規則確認 ---"

# namingPrefixが正しいか確認
for env in prod dev prop; do
  prefix=$(cat "$ENV_CONFIG" | grep -A20 "\"$env\"" | grep '"namingPrefix"' | sed 's/.*: *"\([^"]*\)".*/\1/' | head -1)

  case $env in
    prod) expected_prefix="" ;;
    dev) expected_prefix="[開発]" ;;
    prop) expected_prefix="[提案]" ;;
  esac

  if [ "$prefix" = "$expected_prefix" ]; then
    check_result "$env namingPrefix設定" "PASS" "prefix: '$prefix'"
  else
    check_result "$env namingPrefix設定" "FAIL" "期待: '$expected_prefix', 実際: '$prefix'"
  fi
done

echo ""
echo "--- 5. Webアプリデプロイ確認 ---"

# 各環境のdeployIdが設定されているか
for env in prod dev prop; do
  deploy_id=$(cat "$ENV_CONFIG" | grep -A15 "\"$env\"" | grep '"deployId"' | sed 's/.*: *"\([^"]*\)".*/\1/' | head -1)

  if [ -n "$deploy_id" ] && [ "$deploy_id" != "null" ] && [ "$deploy_id" != "" ]; then
    check_result "$env deployId設定" "PASS" ""
  else
    if [ "$env" = "prod" ]; then
      check_result "$env deployId設定" "WARN" "deployIdが未設定（本番は既存IDを使用）"
    else
      check_result "$env deployId設定" "WARN" "deployIdが未設定"
    fi
  fi
done

echo ""
echo "==========================================="
echo "3環境システム検証結果"
echo "==========================================="
echo ""
echo "| 項目 | 結果 |"
echo "|------|------|"
echo "| パス | $PASS |"
echo "| 失敗 | $FAIL |"
echo "| 警告 | $WARN |"
echo ""

if [ $FAIL -gt 0 ]; then
  echo "❌ 検証失敗: $FAIL 件の問題があります"
  echo ""
  echo "対処方法:"
  echo "  1. env-config.jsonの設定を確認"
  echo "  2. 各環境の.clasp.jsonを確認"
  echo "  3. 08_Config.gsの環境IDを確認"
  exit 1
elif [ $WARN -gt 0 ]; then
  echo "⚠️ 警告あり: $WARN 件の確認事項があります"
  exit 0
else
  echo "✅ KGI達成: 環境不整合 0件"
  exit 0
fi
