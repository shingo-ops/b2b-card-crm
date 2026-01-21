# 相互同期設計書（Bidirectional Sync Specification）

**作成日**: 2026-01-19
**目的**: WebApp ⇔ GitHub Actions ⇔ Claude Code 間の相互同期フローを定義

---

## 1. 概要

### 1.1 設計目標

| 目標 | 説明 |
|------|------|
| 役割分離の維持 | Claude Code = CLI、Human = GUI の原則を維持 |
| 承認履歴の追跡 | 固有ID付きで全承認を追跡可能に |
| 双方向の通知 | 承認要求 → 承認/却下 → 再提出の循環フロー |

### 1.2 アーキテクチャ図

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Claude Code   │     │  GitHub Actions  │     │     WebApp      │
│     (CLI)       │     │  (Middleware)    │     │     (GUI)       │
└────────┬────────┘     └────────┬─────────┘     └────────┬────────┘
         │                       │                        │
         │ 1. 承認要求           │                        │
         │──────────────────────>│                        │
         │                       │ 2. お知らせ作成        │
         │                       │───────────────────────>│
         │                       │                        │
         │                       │ 3. Human確認           │
         │                       │<───────────────────────│
         │                       │                        │
         │ 4. 結果通知           │ 5. 履歴記録            │
         │<──────────────────────│───────────────────────>│
         │                       │                        │
         │ 6. 再提出（却下時）    │                        │
         │──────────────────────>│                        │
         │                       │                        │
```

---

## 2. 承認フロー詳細

### 2.1 承認要求タイプ

| タイプ | トリガー | 承認期限 | エスカレーション |
|--------|---------|---------|-----------------|
| `deploy` | 本番デプロイ実行時 | 24時間 | Discord再通知 |
| `spec_change` | 仕様変更検出時 | 48時間 | Discord再通知 |
| `emergency` | 緊急対応時 | 1時間 | 電話通知（設定時） |

### 2.2 承認要求フォーマット

```json
{
  "id": "APPROVAL-20260119-001",
  "type": "deploy",
  "status": "pending",
  "created_at": "2026-01-19T10:00:00Z",
  "expires_at": "2026-01-20T10:00:00Z",
  "requester": "claude-code",
  "context": {
    "project": "crm-dashboard",
    "changes": ["index.html", "Code.gs"],
    "commit_sha": "abc1234",
    "description": "本番デプロイ: UIレイアウト修正"
  },
  "result": null,
  "result_at": null,
  "result_by": null
}
```

### 2.3 承認結果フォーマット

```json
{
  "id": "APPROVAL-20260119-001",
  "status": "approved",  // approved | rejected | expired
  "result_at": "2026-01-19T10:30:00Z",
  "result_by": "human",
  "comment": "確認完了。デプロイ可",
  "action_url": null  // 却下時の修正依頼URL
}
```

---

## 3. GitHub Actions ワークフロー

### 3.1 承認要求ワークフロー

```yaml
# .github/workflows/approval-request.yml
name: Approval Request

on:
  workflow_dispatch:
    inputs:
      type:
        description: '承認タイプ'
        required: true
        type: choice
        options:
          - deploy
          - spec_change
          - emergency
      project:
        description: 'プロジェクト名'
        required: true
      description:
        description: '説明'
        required: true
      commit_sha:
        description: 'コミットSHA'
        required: true

jobs:
  create-approval:
    runs-on: ubuntu-latest
    steps:
      - name: Generate Approval ID
        id: gen-id
        run: |
          APPROVAL_ID="APPROVAL-$(date +%Y%m%d)-$(printf '%03d' $GITHUB_RUN_NUMBER)"
          echo "approval_id=$APPROVAL_ID" >> $GITHUB_OUTPUT

      - name: Create Approval Request
        env:
          APPROVAL_ID: ${{ steps.gen-id.outputs.approval_id }}
        run: |
          # GASにお知らせを作成
          curl -X POST "${{ vars.WEBAPP_URL }}?action=addApproval" \
            -H "Content-Type: application/json" \
            -d '{
              "id": "'$APPROVAL_ID'",
              "type": "'${{ inputs.type }}'",
              "project": "'${{ inputs.project }}'",
              "description": "'${{ inputs.description }}'",
              "commit_sha": "'${{ inputs.commit_sha }}'"
            }'

      - name: Notify Discord
        if: vars.DISCORD_WEBHOOK_URL
        run: |
          curl -H "Content-Type: application/json" \
            -d '{"content":"⏸️ 承認待ち\nID: '$APPROVAL_ID'\nタイプ: ${{ inputs.type }}\nプロジェクト: ${{ inputs.project }}\n\n${{ inputs.description }}"}' \
            "${{ vars.DISCORD_WEBHOOK_URL }}"
```

### 3.2 承認結果処理ワークフロー

```yaml
# .github/workflows/approval-result.yml
name: Approval Result Handler

on:
  repository_dispatch:
    types: [approval-result]

jobs:
  handle-result:
    runs-on: ubuntu-latest
    steps:
      - name: Process Approval Result
        env:
          APPROVAL_ID: ${{ github.event.client_payload.approval_id }}
          RESULT: ${{ github.event.client_payload.result }}
          COMMENT: ${{ github.event.client_payload.comment }}
        run: |
          if [ "$RESULT" == "approved" ]; then
            echo "✅ 承認されました: $APPROVAL_ID"
            # 承認後のアクションをトリガー（デプロイ等）
          else
            echo "❌ 却下されました: $APPROVAL_ID"
            echo "コメント: $COMMENT"
            # 却下通知をClaude Codeに送信
          fi

      - name: Notify Discord
        if: vars.DISCORD_WEBHOOK_URL
        run: |
          if [ "${{ github.event.client_payload.result }}" == "approved" ]; then
            curl -H "Content-Type: application/json" \
              -d '{"content":"✅ 承認完了: ${{ github.event.client_payload.approval_id }}"}' \
              "${{ vars.DISCORD_WEBHOOK_URL }}"
          else
            curl -H "Content-Type: application/json" \
              -d '{"content":"❌ 却下: ${{ github.event.client_payload.approval_id }}\nコメント: ${{ github.event.client_payload.comment }}"}' \
              "${{ vars.DISCORD_WEBHOOK_URL }}"
          fi
```

---

## 4. WebApp側実装

### 4.1 承認履歴シート

| 列 | 名前 | 説明 |
|---|------|------|
| A | id | 承認ID（APPROVAL-YYYYMMDD-NNN） |
| B | type | 承認タイプ |
| C | status | pending / approved / rejected / expired |
| D | project | プロジェクト名 |
| E | description | 説明 |
| F | commit_sha | コミットSHA |
| G | created_at | 作成日時 |
| H | expires_at | 期限日時 |
| I | result_at | 結果日時 |
| J | result_by | 結果者 |
| K | comment | コメント |

### 4.2 承認API関数

```javascript
// 承認要求を追加
function addApprovalRequest(type, project, description, commitSha) {
  // ... 実装
}

// 承認を処理
function processApproval(approvalId, result, comment) {
  // ... 実装
  // GitHub Actions の repository_dispatch をトリガー
}

// 承認履歴を取得
function getApprovalHistory(limit) {
  // ... 実装
}
```

### 4.3 承認UI

- 承認待ちカード表示
- 承認/却下ボタン
- コメント入力欄
- 履歴一覧表示

---

## 5. Claude Code側実装

### 5.1 承認要求トリガー

CLAUDE.mdのルールに従い、以下の操作時に承認要求をトリガー：

| 操作 | トリガー条件 |
|------|-------------|
| `clasp deploy` | 本番デプロイ時 |
| 仕様変更 | SPEC.md変更時 |
| 緊急対応 | 離席モード中の重要変更時 |

### 5.2 承認結果の取得

```bash
# 承認状態を確認
curl "$WEBAPP_URL?action=getApprovalStatus&id=APPROVAL-20260119-001"

# 結果に応じて処理を分岐
if [ "$result" == "approved" ]; then
  clasp deploy --deploymentId $DEPLOY_ID
else
  echo "却下されました。修正が必要です。"
fi
```

---

## 6. 通知フロー

### 6.1 承認要求時

```
1. Claude Code → GitHub Actions workflow_dispatch
2. GitHub Actions → GAS addApprovalNotification
3. GAS → WebApp お知らせ表示
4. （オプション）GitHub Actions → Discord 通知
```

### 6.2 承認/却下時

```
1. Human → WebApp 承認ボタン
2. WebApp → GAS processApproval
3. GAS → GitHub Actions repository_dispatch
4. GitHub Actions → Discord 通知
5. （却下時）GitHub Actions → Claude Code への通知
```

---

## 7. エラー処理

### 7.1 タイムアウト

| 状況 | 対処 |
|------|------|
| 承認期限切れ | status = "expired" に更新、再申請を促す |
| GitHub Actions失敗 | Discord通知、手動対応 |
| GAS API失敗 | リトライ（3回まで）、Discord通知 |

### 7.2 リカバリー

- 承認履歴から過去の承認を再発行可能
- 手動で status を "pending" に戻すことで再審査可能

---

## 8. セキュリティ

### 8.1 認証

| エンドポイント | 認証方式 |
|---------------|---------|
| GAS WebApp | Apps Script 認証 |
| GitHub Actions | GITHUB_TOKEN |
| Discord Webhook | Webhook URL（Secret） |

### 8.2 承認権限

- 承認可能なユーザーを settings.json で定義
- 緊急承認は特定のユーザーのみ

---

## 9. 実装ステップ

### Phase 1: 基本機能（1週目）
- [ ] 承認履歴シート作成
- [ ] GAS承認API関数追加
- [ ] WebApp承認UI追加

### Phase 2: GitHub Actions連携（2週目）
- [ ] approval-request.yml 作成
- [ ] approval-result.yml 作成
- [ ] Discord通知連携

### Phase 3: Claude Code連携（3週目）
- [ ] 承認要求トリガースクリプト
- [ ] 結果取得・処理ロジック
- [ ] CLAUDE.md への統合

---

## 10. 関連ドキュメント

| ドキュメント | 説明 |
|-------------|------|
| TPS_DESIGN_PHILOSOPHY.md | TPS設計原則 |
| CLAUDE.md | Claude Codeルール |
| clasp-deploy.yml | GASデプロイワークフロー |

---

**以上**
