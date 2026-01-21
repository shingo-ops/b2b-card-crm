#!/bin/bash
# 新規工程追加スクリプト
# 使用方法: ./scripts/add-new-process.sh [工程番号] [工程名] [日本語説明]
# 例: ./scripts/add-new-process.sh 11 DATABASE "データベース作成/編集"

set -e

PROCESS_QUALITY_DIR="docs/00_common/PROCESS_QUALITY"

# 引数チェック
if [ $# -lt 3 ]; then
  echo "使用方法: $0 [工程番号] [工程名] [日本語説明]"
  echo "例: $0 11 DATABASE \"データベース作成/編集\""
  echo ""
  echo "現在の工程一覧:"
  ls -d "$PROCESS_QUALITY_DIR"/*/ 2>/dev/null | xargs -I {} basename {}
  exit 1
fi

NUM=$1
NAME=$2
DESC=$3

# 工程番号を2桁にフォーマット
NUM_PADDED=$(printf "%02d" "$NUM")
FOLDER_NAME="${NUM_PADDED}_${NAME}"
FOLDER_PATH="$PROCESS_QUALITY_DIR/$FOLDER_NAME"

# 既存チェック
if [ -d "$FOLDER_PATH" ]; then
  echo "エラー: $FOLDER_PATH は既に存在します"
  exit 1
fi

echo "=========================================="
echo "新規工程追加: $FOLDER_NAME"
echo "説明: $DESC"
echo "=========================================="
echo ""

# フォルダ作成
mkdir -p "$FOLDER_PATH"
echo "✅ フォルダ作成: $FOLDER_PATH"

# POKAYOKE.md 作成
cat > "$FOLDER_PATH/POKAYOKE.md" << EOF
# ${FOLDER_NAME} ポカヨケルール

## 工程概要

- **目的**: ${DESC}
- **成果物**: 該当ドキュメント/ファイル

## ポカヨケルール（読了必須）

| # | ルール | 理由 | 参照 |
|---|--------|------|------|
| 1 | （工程固有ルールを追加） | - | - |

## チェックリスト（工程開始前）

- [ ] 本ファイル（POKAYOKE.md）を読了した
- [ ] TROUBLE_LOG.mdを読了した
- [ ] 該当する過去トラを確認した

## チェックリスト（工程終了前）

- [ ] 成果物を確認した
- [ ] ドキュメントを更新した
- [ ] git add / commit / push を実行した
- [ ] 同期チェック（check-sync.sh）を実行した

## 禁止事項

| # | 禁止事項 | 理由 |
|---|---------|------|
| 1 | （工程固有の禁止事項を追加） | - |

## 関連ドキュメント

- [INDEX.md](../INDEX.md)
- [TROUBLE_LOG.md](./TROUBLE_LOG.md)
- [POKA_HISTORY.md](./POKA_HISTORY.md)
EOF
echo "✅ POKAYOKE.md 作成"

# TROUBLE_LOG.md 作成
cat > "$FOLDER_PATH/TROUBLE_LOG.md" << EOF
# ${FOLDER_NAME} 過去トラブルログ

## 概要

${DESC}工程で発生した過去トラブルを記録。

## 過去トラ一覧

| ID | 発生日 | 内容 | 根本原因 | 対策 | 再発 |
|----|--------|------|---------|------|------|
| ${NAME:0:3}-001 | - | （テンプレート） | - | - | - |

---

## 過去トラ詳細

### ${NAME:0:3}-001: （テンプレート）

#### 1. 現状把握（5W2H）
| 項目 | 内容 |
|------|------|
| いつ | YYYY-MM-DD |
| どこで | 該当ファイル/機能 |
| 誰が | 検出者 |
| 何が | 問題の内容 |
| なぜ | 発生原因 |
| どのように | 検出方法 |
| どのくらい | 影響範囲 |

#### 2. 根本原因
-

#### 3. 対策
-

#### 4. 横展開
-
EOF
echo "✅ TROUBLE_LOG.md 作成"

# POKA_HISTORY.md 作成
cat > "$FOLDER_PATH/POKA_HISTORY.md" << EOF
# ${FOLDER_NAME} ポカ発生履歴

## 概要

${DESC}工程のポカ発生を記録。

## ポカ発生履歴

| 日付 | ポカID | Type | 内容 | 原因 | 対策ID | 記録者 |
|------|--------|------|------|------|--------|--------|
| - | POKA-${NUM_PADDED}-001 | - | （テンプレート） | - | ${NAME:0:3}-001 | - |

## 統計

| 月 | 発生件数 | 再発件数 | 再発率 |
|----|---------|---------|--------|
| $(date +%Y-%m) | 0 | 0 | 0% |
EOF
echo "✅ POKA_HISTORY.md 作成"

echo ""
echo "=========================================="
echo "新規工程追加完了"
echo "=========================================="
echo ""
echo "次のステップ:"
echo "1. $FOLDER_PATH/POKAYOKE.md を編集して工程固有ルールを追加"
echo "2. INDEX.md の工程一覧に追加"
echo "3. git add / commit / push"
echo ""
echo "INDEX.md追加用テンプレート:"
echo "| $NUM_PADDED | [$NAME](./$FOLDER_NAME/) | $DESC | 0 | 0 | - |"
