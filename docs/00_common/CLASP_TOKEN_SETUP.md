# CLASP_TOKEN セットアップガイド

**作成日**: 2026-01-19
**目的**: GitHub ActionsでGAS自動デプロイを有効化

---

## 概要

clasp（Google Apps Script CLI）をGitHub Actionsで使用するには、
認証トークンをSecretとして登録する必要があります。

```
[ローカルPC]          [GitHub Actions]
     │                      │
clasp login ───→ ~/.clasprc.json
     │                      │
Base64エンコード ───→ CLASP_TOKEN Secret
     │                      │
     └──────────────────────┘
              │
         GAS自動デプロイ
```

---

## セットアップ手順

### Step 1: clasp login（ローカル）

```bash
# claspがインストールされていない場合
npm install -g @google/clasp

# Googleアカウントで認証
clasp login

# ブラウザが開き、Googleアカウントを選択
# 認証完了後、~/.clasprc.json が作成される
```

### Step 2: トークンのBase64エンコード

```bash
# macOS/Linux
cat ~/.clasprc.json | base64 > ~/clasprc_base64.txt

# 内容を確認
cat ~/clasprc_base64.txt
```

**注意**: 改行が含まれないことを確認してください。

### Step 3: GitHub Secretsに登録

1. GitHubリポジトリにアクセス
2. Settings > Secrets and variables > Actions
3. 「New repository secret」をクリック
4. 以下を入力：
   - **Name**: `CLASP_TOKEN`
   - **Value**: `clasprc_base64.txt`の内容をペースト
5. 「Add secret」をクリック

### Step 4: 動作確認

1. Actions タブを開く
2. 「GAS Deploy」ワークフローを選択
3. 「Run workflow」をクリック
4. プロジェクトとデプロイタイプを選択
5. 「Run workflow」で実行

---

## トラブルシューティング

### エラー: "Authentication failed"

**原因**: CLASP_TOKENが無効

**対処**:
1. ローカルで `clasp login` を再実行
2. 新しい `~/.clasprc.json` をBase64エンコード
3. GitHub SecretのCLASP_TOKENを更新

### エラー: "Project not found"

**原因**: .clasp.jsonのscriptIdが無効

**対処**:
1. プロジェクトフォルダの `.clasp.json` を確認
2. scriptIdが正しいGASプロジェクトを指しているか確認

### エラー: "Permission denied"

**原因**: 認証ユーザーにGASプロジェクトへのアクセス権がない

**対処**:
1. GASエディタでプロジェクトを開く
2. 共有設定で認証ユーザーにアクセス権を付与

---

## セキュリティ注意事項

1. **CLASP_TOKENは機密情報**
   - `.clasprc.json` をGitにコミットしない
   - Base64エンコードファイルも削除する

2. **トークンの有効期限**
   - Googleトークンは一定期間で失効する
   - 定期的に再認証が必要

3. **最小権限の原則**
   - 認証ユーザーは必要なGASプロジェクトのみアクセス可能にする

---

## 関連ファイル

| ファイル | 説明 |
|---------|------|
| `.github/workflows/clasp-deploy.yml` | デプロイワークフロー |
| `gemini-dashboard-gas/.clasp.json` | GASプロジェクト設定 |
| `crm-dashboard/.clasp.json` | CRMプロジェクト設定 |

---

**以上**
