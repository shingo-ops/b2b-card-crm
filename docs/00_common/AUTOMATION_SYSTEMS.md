# 自動化システム一覧

## 概要

本プロジェクトで稼働している自動化システムの一覧と、各システムのポカヨケ設定。

## KGI

| 指標 | 目標 |
|------|------|
| システム稼働率 | 100% |
| 本番障害 | 0件/月 |
| 機密情報漏洩 | 0件 |
| 再発率 | 0% |

## 自動化システム一覧

| # | システム | ファイル | トリガー | KGI | ポカヨケ |
|---|---------|---------|---------|-----|---------|
| 1 | 定期ヘルスチェック | scheduled-health-check.yml | 毎日9時(JST) | 稼働率100% | 自己検証job |
| 2 | セキュリティチェック | security-check.yml | push/PR | 漏洩0件 | 自己検証job |
| 3 | コード品質チェック | code-quality-check.yml | push/PR | 違反0件 | 自己検証job |
| 4 | バックアップ検証 | backup-verification.yml | push | 整合性エラー0件 | 自己検証job |
| 5 | 工程品質チェック | process-quality-check.yml | push/PR | ファイル欠落0件 | - |
| 6 | GASポカヨケ | gas-pokayoke.yml | push/PR | LockService違反0件 | - |
| 7 | **異常通知** | error-notification.yml | 他WF失敗時 | 通知漏れ0件 | - |

## ローカルスクリプト一覧

| # | スクリプト | 用途 | 実行タイミング |
|---|-----------|------|---------------|
| 1 | check-sync.sh | ローカル↔GitHub同期確認 | 作業終了時 |
| 2 | add-new-process.sh | 新規工程追加 | 工程追加時 |
| 3 | aggregate-kpi.sh | KPI集計 | 月次レビュー |
| 4 | test-pokayoke.sh | ポカヨケテスト | 定期確認 |
| 5 | pre-deploy-check.sh | デプロイ前チェック | clasp deploy前 |

## 各システムの詳細

### 1. 定期ヘルスチェック

**ファイル**: `.github/workflows/scheduled-health-check.yml`

**機能**:
- 毎日9時(JST)にポカヨケテストを自動実行
- PROCESS_QUALITY整合性チェック
- スクリプト実行権限チェック
- ワークフロー自己検証

**自己ポカヨケ**:
- `workflow-self-check` jobで必須ワークフローの存在を確認

### 2. セキュリティチェック

**ファイル**: `.github/workflows/security-check.yml`

**機能**:
- APIキー、パスワード、認証情報の検出
- .gitignoreカバレッジチェック
- ハードコードURL検出

**自己ポカヨケ**:
- `security-check-self-validation` jobで設定を自己検証

### 3. コード品質チェック

**ファイル**: `.github/workflows/code-quality-check.yml`

**機能**:
- GAS構文パターンチェック（console.log、var、無限ループ、eval）
- LockService使用チェック
- API関数エクスポートチェック
- HTML品質チェック

**自己ポカヨケ**:
- `code-quality-self-check` jobで設定を自己検証

### 4. バックアップ検証

**ファイル**: `.github/workflows/backup-verification.yml`

**機能**:
- コミット整合性検証
- ファイルチェックサム検証
- ブランチ状態検証
- ディレクトリ構造検証

**自己ポカヨケ**:
- `backup-verification-self-check` jobで設定を自己検証

### 5. デプロイ前チェック

**ファイル**: `scripts/pre-deploy-check.sh`

**機能**:
- Git状態チェック（未コミット、未プッシュ）
- API整合性チェック
- LockServiceチェック
- セキュリティチェック
- ポカヨケテスト実行

**使用方法**:
```bash
./scripts/pre-deploy-check.sh
```

## 異常時フロー（重要）

```
┌─────────────────────────────────────────────────────────────────┐
│                        異常検知フロー                            │
└─────────────────────────────────────────────────────────────────┘

  [GitHub Actions]
  ワークフロー実行
        │
        ▼
    ┌───────┐
    │ PASS? │
    └───┬───┘
        │
   ┌────┴────┐
   ▼         ▼
 [PASS]    [FAIL]
   │         │
   ▼         ▼
 終了   ┌──────────────────────┐
        │ error-notification   │
        │ ワークフロー起動      │
        └──────────┬───────────┘
                   │
        ┌──────────┴──────────┐
        ▼                     ▼
   [Discord通知]         [Issue自動作成]
   🚨 異常発生！          📝 対応手順付き
        │                     │
        └──────────┬──────────┘
                   ▼
        ┌──────────────────────┐
        │ オーナーが確認        │
        │ （Discord/GitHub）   │
        └──────────┬───────────┘
                   ▼
        ┌──────────────────────┐
        │ Claude Codeに依頼    │  ← 【ここは手動】
        │ 「これ直して」        │
        └──────────┬───────────┘
                   ▼
        ┌──────────────────────┐
        │ Claude Codeが修正    │
        │ 1. コード修正         │
        │ 2. POKA_HISTORY記録   │
        │ 3. ポカヨケ追加       │
        │ 4. git push          │
        └──────────┬───────────┘
                   ▼
        ┌──────────────────────┐
        │ GitHub Actions       │
        │ 自動で再チェック      │
        └──────────┬───────────┘
                   │
              ┌────┴────┐
              ▼         ▼
            [PASS]    [FAIL]
              │         │
              ▼         ▼
        ┌─────────┐  再度通知
        │ 復旧通知 │  （ループ）
        │ Discord │
        └────┬────┘
             ▼
        ┌─────────┐
        │ Issue   │
        │ コメント │
        │ 追加    │
        └────┬────┘
             ▼
        ┌─────────┐
        │ Issue   │
        │ クローズ │
        │（手動） │
        └─────────┘
```

### 異常通知の設定

**必須**: GitHub Secretsに以下を設定

| Secret名 | 値 |
|---------|-----|
| `DISCORD_WEBHOOK_URL` | Discord Webhook URL |

設定方法: [GITHUB_SECRETS_SETUP.md](./GITHUB_SECRETS_SETUP.md)

---

## 運用ルール

### デプロイ前必須

```bash
# 1. デプロイ前チェック実行
./scripts/pre-deploy-check.sh

# 2. すべてパスしたらデプロイ
cd crm-dashboard
clasp deploy --deploymentId [本番ID] --description "説明"
```

### 障害発生時

1. POKA_HISTORY.mdに記録
2. TROUBLE_LOG.mdに詳細記載
3. 対策実施
4. 該当システムのポカヨケを強化

## システム追加時のチェックリスト

新しい自動化システムを追加する場合：

- [ ] 自己検証job（self-check）を含める
- [ ] この一覧に追加
- [ ] test-pokayoke.shにテストケース追加
- [ ] KGIを定義

## 関連ドキュメント

- [PROCESS_QUALITY/INDEX.md](./PROCESS_QUALITY/INDEX.md)
- [COMMON_RULES.md](./COMMON_RULES.md)
- [CLAUDE.md](../../CLAUDE.md)
- [HOW_AUTO_ISSUE_WORKS.md](./HOW_AUTO_ISSUE_WORKS.md) - Issue自動作成の仕組み（小学生向け説明）
- [GITHUB_SECRETS_SETUP.md](./GITHUB_SECRETS_SETUP.md) - GitHub Secrets設定ガイド
