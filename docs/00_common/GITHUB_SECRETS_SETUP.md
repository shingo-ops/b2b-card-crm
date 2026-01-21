# GitHub Secrets 設定ガイド

## 概要

Discord通知を2つのチャンネルに分けて送信するための設定。

## チャンネル用途

| Secret名 | 用途 | 通知内容 |
|---------|------|---------|
| `DISCORD_BUGREPORT_WEBHOOK` | バグ報告専用 | 異常検知、エラー、セキュリティ警告 |
| `DISCORD_REQUEST_WEBHOOK` | 依頼用 | 承認待ち、離席モード、作業完了 |

## 設定手順

### 1. GitHubリポジトリを開く

```
https://github.com/shingo-ops/sales-ops-with-claude
```

### 2. Settings → Secrets and variables → Actions

```
Settings タブ
   ↓
左メニュー「Secrets and variables」
   ↓
「Actions」をクリック
```

### 3. 「New repository secret」をクリック

### 4. 2つのSecretを登録

**Secret 1: バグ報告用**

| 項目 | 値 |
|------|-----|
| Name | `DISCORD_BUGREPORT_WEBHOOK` |
| Secret | バグ報告チャンネルのWebhook URL |

**Secret 2: 依頼用**

| 項目 | 値 |
|------|-----|
| Name | `DISCORD_REQUEST_WEBHOOK` |
| Secret | 依頼チャンネルのWebhook URL |

### 5. 「Add secret」をクリック（各Secretごと）

---

## ローカル設定（.envファイル）

ローカルでDiscord通知を使う場合：

```bash
# プロジェクトルートで実行
cat > .env << 'EOF'
DISCORD_BUGREPORT_WEBHOOK=https://discord.com/api/webhooks/...
DISCORD_REQUEST_WEBHOOK=https://discord.com/api/webhooks/...
EOF
```

**注意**: `.env`は`.gitignore`に追加済みなので、GitHubにはアップロードされません。

---

## 通知タイプ一覧

### バグ報告チャンネル（DISCORD_BUGREPORT_WEBHOOK）

| タイプ | 用途 | 例 |
|--------|------|-----|
| `error` | エラー発生 | ワークフロー失敗 |
| `bug` | バグ検知 | コード品質違反 |
| `security` | セキュリティ警告 | 機密情報検出 |
| `failure` | 異常検知 | ヘルスチェック失敗 |
| `recovery` | 復旧完了 | 問題解決後 |

### 依頼チャンネル（DISCORD_REQUEST_WEBHOOK）

| タイプ | 用途 | 例 |
|--------|------|-----|
| `start` | 離席モード開始 | 自律作業開始 |
| `complete` | 作業完了 | タスク完了報告 |
| `waiting` | 承認待ち | デプロイ承認依頼 |
| `auth` | 認証必要 | clasp login要求 |
| `request` | 依頼 | 人間への依頼事項 |
| `finish` | 全作業完了 | 離席モード終了 |

---

## テスト方法

```bash
# バグ報告チャンネルテスト
./scripts/notify-discord.sh error "テスト: バグ報告チャンネル"

# 依頼チャンネルテスト
./scripts/notify-discord.sh waiting "テスト: 依頼チャンネル"
```

---

## トラブルシューティング

### 通知が届かない場合

1. **Secretsが正しく設定されているか確認**
   - Settings → Secrets → 該当のSecret名が存在するか

2. **Webhook URLが有効か確認**
   ```bash
   curl -H "Content-Type: application/json" \
     -d '{"content": "テスト"}' \
     "https://discord.com/api/webhooks/..."
   ```

3. **ローカル.envファイルを確認**
   ```bash
   cat .env
   ```

---

## セキュリティ注意

- Webhook URLは**絶対にコードに直接書かない**
- 必ずGitHub SecretsまたはローカBal .envを使用
- Secretsは暗号化されて保存される
- .envファイルは.gitignoreで除外済み
