# THREE_ENVIRONMENT_SETUP.md - 3環境システム構築ガイド

> **バージョン**: v1.0.0
> **作成日**: 2026-01-15
> **承認**: DISC-035
> **ステータス**: 構築中

---

## 1. 概要

本ドキュメントは、AI自律開発を安全に行うための3環境システムの構築手順を定義する。

### 1.1 環境定義

| 環境 | コード | 目的 | データ | デプロイ権限 |
|------|--------|------|--------|-------------|
| **本番（Production）** | PROD | 実業務運用 | 本番データ | Human承認必須 |
| **開発（Development）** | DEV | 機能開発・テスト | テストデータ | 自律可（テスト必須） |
| **提案（Proposal）** | PROP | AI自律実験 | テストデータ | AI単独可 |

---

## 2. フォルダ構造

### 2.1 現在の構造

```
sales-ops-with-claude/
├── crm-dashboard/          # 本番環境（PROD）
│   ├── .clasp.json         # 本番GASプロジェクト設定
│   ├── *.gs                # 本番コード
│   └── ...
└── ...
```

### 2.2 目標構造

```
sales-ops-with-claude/
├── crm-dashboard/          # 本番環境（PROD）
│   ├── .clasp.json         # scriptId: [本番]
│   ├── *.gs
│   └── CLAUDE.md
│
├── crm-dashboard-dev/      # 開発環境（DEV）
│   ├── .clasp.json         # scriptId: [開発用]
│   ├── *.gs                # 本番からコピー
│   └── CLAUDE.md
│
├── crm-dashboard-prop/     # 提案環境（PROP）
│   ├── .clasp.json         # scriptId: [提案用]
│   ├── *.gs                # 実験用コード
│   └── CLAUDE.md
│
├── environments/           # 環境管理
│   ├── env-config.json     # 環境設定
│   └── sync-env.sh         # 環境同期スクリプト
│
└── docs/
    └── 00_common/
        └── THREE_ENVIRONMENT_SETUP.md  # 本ドキュメント
```

---

## 3. 各環境の設定

### 3.1 本番環境（PROD）

| 項目 | 設定 |
|------|------|
| フォルダ | `crm-dashboard/` |
| GASプロジェクト | 既存（scriptId: 1CQiLiFG8N77uYzlo3UNgAwml9_8mAJYAmfe4thp3RGsvbiwoaS-kS7X0） |
| スプレッドシート | 本番スプレッドシート |
| デプロイ | Human承認後のみ |
| clasp push | 許可（ただしチェックリスト必須） |
| clasp run | 条件付き許可 |

### 3.2 開発環境（DEV）

| 項目 | 設定 |
|------|------|
| フォルダ | `crm-dashboard-dev/` |
| GASプロジェクト | 新規作成必要 |
| スプレッドシート | テスト用スプレッドシート |
| デプロイ | 自律可（テスト通過必須） |
| clasp push | 自由 |
| clasp run | 自由 |

### 3.3 提案環境（PROP）

| 項目 | 設定 |
|------|------|
| フォルダ | `crm-dashboard-prop/` |
| GASプロジェクト | 新規作成必要 |
| スプレッドシート | 実験用スプレッドシート（個人情報なし） |
| デプロイ | AI単独可 |
| clasp push | 自由 |
| clasp run | 自由 |
| 制約 | 倫理ルールのみ適用 |

---

## 4. 構築手順

### Phase 1: GASプロジェクト作成（Human作業）

#### 4.1 開発環境用GASプロジェクト作成

1. Google Apps Script（https://script.google.com）にアクセス
2. 「新しいプロジェクト」をクリック
3. プロジェクト名を「CRM-Dashboard-DEV」に設定
4. スクリプトIDを取得（ファイル → プロジェクトの設定）
5. テスト用スプレッドシートを新規作成し、IDを取得

#### 4.2 提案環境用GASプロジェクト作成

1. 同様に「CRM-Dashboard-PROP」を作成
2. スクリプトIDを取得
3. 実験用スプレッドシートを新規作成し、IDを取得

### Phase 2: ローカル環境構築（Claude Code作業）

#### 4.3 開発環境フォルダ作成

```bash
# 開発環境フォルダ作成
mkdir crm-dashboard-dev
cd crm-dashboard-dev

# 本番コードをコピー
cp ../crm-dashboard/*.gs .
cp ../crm-dashboard/*.html .
cp ../crm-dashboard/appsscript.json .

# .clasp.json作成（HumanからscriptIdを受領後）
echo '{
  "scriptId": "[DEV_SCRIPT_ID]",
  "rootDir": ""
}' > .clasp.json
```

#### 4.4 提案環境フォルダ作成

```bash
# 提案環境フォルダ作成
mkdir crm-dashboard-prop
cd crm-dashboard-prop

# 最小限のコードをコピー
cp ../crm-dashboard/appsscript.json .

# .clasp.json作成（HumanからscriptIdを受領後）
echo '{
  "scriptId": "[PROP_SCRIPT_ID]",
  "rootDir": ""
}' > .clasp.json
```

### Phase 3: 環境設定ファイル作成

#### 4.5 環境設定ファイル

```json
// environments/env-config.json
{
  "environments": {
    "prod": {
      "folder": "crm-dashboard",
      "scriptId": "1CQiLiFG8N77uYzlo3UNgAwml9_8mAJYAmfe4thp3RGsvbiwoaS-kS7X0",
      "spreadsheetId": "[本番スプレッドシートID]",
      "rules": "strict",
      "deployApproval": "human_required"
    },
    "dev": {
      "folder": "crm-dashboard-dev",
      "scriptId": "[DEV_SCRIPT_ID]",
      "spreadsheetId": "[DEV_SPREADSHEET_ID]",
      "rules": "standard",
      "deployApproval": "test_required"
    },
    "prop": {
      "folder": "crm-dashboard-prop",
      "scriptId": "[PROP_SCRIPT_ID]",
      "spreadsheetId": "[PROP_SPREADSHEET_ID]",
      "rules": "minimal",
      "deployApproval": "none"
    }
  }
}
```

---

## 5. 環境間移行フロー

### 5.1 PROP → DEV

```
1. 提案環境で実験完了
2. 提案書作成（期待効果、リスク、実装方法）
3. Human承認
4. 開発環境にコードをコピー
5. 本格開発・テスト開始
```

### 5.2 DEV → PROD

```
1. 開発環境でテスト完了
2. 全テスト通過を確認
3. 変更内容のレビュー
4. Human承認
5. 本番環境にコードをコピー
6. clasp push
7. 動作確認
```

### 5.3 コード同期コマンド

```bash
# DEV → PRODへの同期（Human承認後）
./environments/sync-env.sh dev prod

# PROP → DEVへの同期（Human承認後）
./environments/sync-env.sh prop dev
```

---

## 6. 環境識別

### 6.1 GASコード内での環境識別

```javascript
// 08_Config.gsに追加
function getEnvironment() {
  const scriptId = ScriptApp.getScriptId();

  const ENV_MAP = {
    '1CQiLiFG8N77uYzlo3UNgAwml9_8mAJYAmfe4thp3RGsvbiwoaS-kS7X0': 'PROD',
    '[DEV_SCRIPT_ID]': 'DEV',
    '[PROP_SCRIPT_ID]': 'PROP'
  };

  return ENV_MAP[scriptId] || 'UNKNOWN';
}

function isProdEnvironment() {
  return getEnvironment() === 'PROD';
}

function isDevEnvironment() {
  return getEnvironment() === 'DEV';
}

function isPropEnvironment() {
  return getEnvironment() === 'PROP';
}
```

### 6.2 環境別スプレッドシートID

```javascript
// 08_Config.gsに追加
function getSpreadsheetId() {
  const env = getEnvironment();

  const SPREADSHEET_MAP = {
    'PROD': '[本番スプレッドシートID]',
    'DEV': '[DEV_SPREADSHEET_ID]',
    'PROP': '[PROP_SPREADSHEET_ID]'
  };

  return SPREADSHEET_MAP[env];
}
```

---

## 7. Human確認事項

以下の作業はHumanが実施する必要があります：

### 7.1 必須作業

| # | 作業 | 状態 | 備考 |
|---|------|------|------|
| 1 | 開発環境用GASプロジェクト作成 | 未完了 | scriptId取得 |
| 2 | 提案環境用GASプロジェクト作成 | 未完了 | scriptId取得 |
| 3 | 開発環境用スプレッドシート作成 | 未完了 | テストデータ用 |
| 4 | 提案環境用スプレッドシート作成 | 未完了 | 実験データ用 |
| 5 | scriptIdをClaude Codeに共有 | 未完了 | 環境設定に使用 |

### 7.2 確認事項

| # | 確認事項 | 回答 |
|---|----------|------|
| 1 | 開発環境のGASプロジェクト名は「CRM-Dashboard-DEV」で良いか？ | |
| 2 | 提案環境のGASプロジェクト名は「CRM-Dashboard-PROP」で良いか？ | |
| 3 | テスト用スプレッドシートは本番と同じ構造で良いか？ | |
| 4 | 提案環境のスプレッドシートに含めるテストデータの範囲は？ | |

---

## 8. セキュリティ考慮事項

### 8.1 データ分離

| 項目 | PROD | DEV | PROP |
|------|------|-----|------|
| 顧客実データ | ✅ あり | ❌ なし | ❌ なし |
| ダミーデータ | ❌ なし | ✅ あり | ✅ あり |
| APIキー（本番） | ✅ あり | ❌ なし | ❌ なし |
| APIキー（テスト） | ❌ なし | ✅ あり | ✅ あり |

### 8.2 アクセス制御

| 項目 | PROD | DEV | PROP |
|------|------|-----|------|
| Human | ✅ 全権限 | ✅ 全権限 | ✅ 全権限 |
| Claude Code | 制限付き | 標準 | 自由 |
| 外部公開 | 認証必須 | 非公開 | 非公開 |

---

## 9. 次のステップ

1. **Human**: GASプロジェクト2つ（DEV, PROP）を作成
2. **Human**: スプレッドシート2つ（DEV, PROP）を作成
3. **Human**: scriptIdとスプレッドシートIDをClaude Codeに共有
4. **Claude Code**: フォルダ構造を作成
5. **Claude Code**: 環境設定ファイルを作成
6. **Claude Code**: コード同期スクリプトを作成
7. **検証**: 各環境でclasp pushが動作することを確認

---

## 10. 更新履歴

| 日時 | 更新者 | 内容 |
|------|--------|------|
| 2026-01-15 | Claude Code | 初版作成 |

---

**以上**
