#!/bin/bash

# 3環境システム - 環境同期スクリプト
# Usage: ./sync-env.sh <source> <target>
# Example: ./sync-env.sh dev prod

set -e

# 色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# プロジェクトルート
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# 環境フォルダマップ
declare -A ENV_FOLDERS
ENV_FOLDERS["prod"]="crm-dashboard"
ENV_FOLDERS["dev"]="crm-dashboard-dev"
ENV_FOLDERS["prop"]="crm-dashboard-prop"

# 使用方法
usage() {
    echo "Usage: $0 <source> <target>"
    echo ""
    echo "Environments:"
    echo "  prod  - Production (本番環境)"
    echo "  dev   - Development (開発環境)"
    echo "  prop  - Proposal (提案環境)"
    echo ""
    echo "Examples:"
    echo "  $0 dev prod   # 開発 → 本番"
    echo "  $0 prop dev   # 提案 → 開発"
    echo "  $0 prod dev   # 本番 → 開発（バグ修正用）"
    exit 1
}

# 引数チェック
if [ $# -ne 2 ]; then
    usage
fi

SOURCE=$1
TARGET=$2

# 環境の存在チェック
if [ -z "${ENV_FOLDERS[$SOURCE]}" ]; then
    echo -e "${RED}Error: Unknown source environment '$SOURCE'${NC}"
    usage
fi

if [ -z "${ENV_FOLDERS[$TARGET]}" ]; then
    echo -e "${RED}Error: Unknown target environment '$TARGET'${NC}"
    usage
fi

SOURCE_FOLDER="${PROJECT_ROOT}/${ENV_FOLDERS[$SOURCE]}"
TARGET_FOLDER="${PROJECT_ROOT}/${ENV_FOLDERS[$TARGET]}"

# 禁止されたパターンのチェック
if [ "$SOURCE" == "prod" ] && [ "$TARGET" == "prop" ]; then
    echo -e "${RED}Error: prod → prop sync is FORBIDDEN${NC}"
    echo "本番データを提案環境に移行することは禁止されています。"
    exit 1
fi

# フォルダ存在チェック
if [ ! -d "$SOURCE_FOLDER" ]; then
    echo -e "${RED}Error: Source folder not found: $SOURCE_FOLDER${NC}"
    exit 1
fi

if [ ! -d "$TARGET_FOLDER" ]; then
    echo -e "${YELLOW}Warning: Target folder not found. Creating: $TARGET_FOLDER${NC}"
    mkdir -p "$TARGET_FOLDER"
fi

# 確認プロンプト
echo -e "${YELLOW}=== Environment Sync ===${NC}"
echo "Source: $SOURCE (${ENV_FOLDERS[$SOURCE]})"
echo "Target: $TARGET (${ENV_FOLDERS[$TARGET]})"
echo ""
echo "This will copy the following files:"
echo "  - *.gs files"
echo "  - *.html files"
echo "  - appsscript.json"
echo ""
echo -e "${YELLOW}Note: .clasp.json will NOT be copied (environment-specific)${NC}"
echo ""

if [ "$TARGET" == "prod" ]; then
    echo -e "${RED}WARNING: You are syncing to PRODUCTION environment!${NC}"
    echo -e "${RED}This requires Human approval.${NC}"
    echo ""
fi

read -p "Continue? (y/N): " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "Cancelled."
    exit 0
fi

# 同期実行
echo ""
echo -e "${GREEN}Syncing files...${NC}"

# .gsファイルをコピー
for file in "$SOURCE_FOLDER"/*.gs; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        cp "$file" "$TARGET_FOLDER/$filename"
        echo "  Copied: $filename"
    fi
done

# .htmlファイルをコピー
for file in "$SOURCE_FOLDER"/*.html; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        cp "$file" "$TARGET_FOLDER/$filename"
        echo "  Copied: $filename"
    fi
done

# appsscript.jsonをコピー
if [ -f "$SOURCE_FOLDER/appsscript.json" ]; then
    cp "$SOURCE_FOLDER/appsscript.json" "$TARGET_FOLDER/appsscript.json"
    echo "  Copied: appsscript.json"
fi

echo ""
echo -e "${GREEN}Sync completed!${NC}"
echo ""
echo "Next steps:"
echo "  1. cd $TARGET_FOLDER"
echo "  2. Review the changes"
echo "  3. clasp push"

if [ "$TARGET" == "prod" ]; then
    echo ""
    echo -e "${YELLOW}Remember: Get Human approval before deploying to production!${NC}"
fi
