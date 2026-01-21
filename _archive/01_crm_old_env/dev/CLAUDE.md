# CRM Dashboard - 開発環境（DEV）

> **環境**: Development
> **コード**: DEV
> **共通ルール**: [COMMON_RULES.md](../docs/00_common/COMMON_RULES.md)
> **エージェント仕様**: [docs/00_common/](../docs/00_common/)
> **3環境設定**: [THREE_ENVIRONMENT_SETUP.md](../docs/00_common/THREE_ENVIRONMENT_SETUP.md)

---

## 1. 環境概要

| 項目 | 設定 |
|------|------|
| 環境名 | 開発環境（Development） |
| 目的 | 機能開発・テスト |
| データ | テストデータのみ（本番データ禁止） |
| デプロイ | 自律可（ただしテスト通過必須） |
| ルール | 標準ルール適用 |

---

## 2. 許可される操作

| 操作 | 許可 | 条件 |
|------|------|------|
| clasp push | ✅ 自由 | - |
| clasp run | ✅ 自由 | - |
| コード変更 | ✅ 自由 | テスト作成推奨 |
| データ操作 | ✅ 自由 | テストデータのみ |
| 新機能追加 | ✅ 可能 | 設計レビュー推奨 |

---

## 3. 制約事項

| 制約 | 理由 |
|------|------|
| 本番データの使用禁止 | データ漏洩防止 |
| 本番APIキーの使用禁止 | セキュリティ |
| 外部公開禁止 | 開発中コードの保護 |

---

## 4. 本番環境への昇格条件

開発環境から本番環境へコードを移行する場合：

1. 全テストが通過していること
2. コードレビュー完了
3. Human承認を取得
4. `./environments/sync-env.sh dev prod` で同期

---

## 5. スプレッドシート情報

| 項目 | 値 |
|------|-----|
| スプレッドシートID | 1EpqO7HL3o7jTbkvZuHqf8LMU4_RwQTJM8PyRx6Qj6uM |
| 用途 | テストデータ用 |
| アクセス | 開発者のみ |

---

## 6. GASプロジェクト情報

| 項目 | 値 |
|------|-----|
| プロジェクト名 | CRM-Dashboard-DEV |
| scriptId | 1TW14Q78eA1C5MyXdssxACZR4C5mavzjw9SjNLGzdHNCL1QteWuWKg9s7 |
| 状態 | 作成済み（clasp create --type sheets で自動作成） |

---

**以上**
