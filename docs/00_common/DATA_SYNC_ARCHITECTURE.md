# データ同期アーキテクチャ仕様書

> バージョン: 1.0.0
> 作成日: 2026-01-18
> 最終更新: 2026-01-18

---

## 1. システム概要図

```
+-------------------+     +-------------------+     +-------------------+
|   Claude Code     |     |     GitHub        |     |   Spreadsheet     |
|   (ローカル)       |     |    (マスター)      |     |    (派生)         |
+-------------------+     +-------------------+     +-------------------+
        |                         |                         |
        | 会話セッション           |                         |
        v                         |                         |
+-------------------+             |                         |
| ~/.claude/        |             |                         |
| projects/*.jsonl  |             |                         |
+-------------------+             |                         |
        |                         |                         |
        | watch-conversation.sh   |                         |
        v                         v                         |
+-------------------+     +-------------------+             |
| CONVERSATION_     | --> | CONVERSATION_     |             |
| LOG.md (ローカル)  |push | LOG.md (GitHub)   |             |
+-------------------+     +-------------------+             |
                                  |                         |
                                  | GAS webhook             |
                                  | (未実装)                 |
                                  v                         v
                          +-------------------------------+
                          |       Spreadsheet              |
                          |  - 会話ログシート               |
                          |  - Gemini使用履歴              |
                          |  - Claude使用履歴              |
                          +-------------------------------+
```

---

## 2. データフロー詳細

### 2.1 会話ログの流れ

```
[1] Claude Codeセッション
    |
    v
[2] ~/.claude/projects/[project]/[session].jsonl
    |
    | Stopフック発火
    v
[3] watch-conversation.sh --once
    |
    | 1. JSONLからユーザーメッセージを抽出
    | 2. カテゴリ分類（指摘/依頼/説明）
    | 3. CONVERSATION_LOG.mdに追記
    v
[4] docs/01_crm/CONVERSATION_LOG.md (ローカル)
    |
    | git commit & push
    v
[5] GitHub CONVERSATION_LOG.md (マスター)
    |
    | GitHub Actions or GAS webhook (計画中)
    v
[6] Spreadsheet 会話ログシート (派生)
```

### 2.2 Gemini使用の流れ

```
[1] mcp__gemini-cli ツール呼び出し
    |
    | PostToolUseフック発火
    v
[2] sync-dashboard.sh gemini -c [category] -d "[description]"
    |
    | curl POST to GAS
    v
[3] GAS doPost() → Spreadsheet書き込み
    |
    v
[4] Spreadsheet Gemini使用履歴シート
```

### 2.3 Claude使用の流れ

```
[1] セッション終了
    |
    | Stopフック発火
    v
[2] sync-dashboard.sh claude -c development -d "Session end"
    |
    | curl POST to GAS
    v
[3] GAS doPost() → Spreadsheet書き込み
    |
    v
[4] Spreadsheet Claude使用履歴シート
```

---

## 3. 現在の動作状況

| コンポーネント | 状態 | 備考 |
|--------------|------|------|
| watch-conversation.sh | OK | 会話抽出・分類動作中 |
| CONVERSATION_LOG.md (ローカル) | OK | 記録追記中 |
| GitHub同期 | OK | git push で反映 |
| sync-dashboard.sh | OK | スクリプト実行可 |
| GAS doPost endpoint | NG | 404エラー |
| Spreadsheet同期 | NG | GAS URL要修正 |

---

## 4. フック設定 (.claude/settings.local.json)

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "mcp__gemini-cli__geminiChat",
        "hooks": [{
          "type": "command",
          "command": "./scripts/sync-dashboard.sh gemini -c audit -d \"Gemini MCP call\""
        }]
      },
      {
        "matcher": "mcp__gemini-cli__googleSearch",
        "hooks": [{
          "type": "command",
          "command": "./scripts/sync-dashboard.sh gemini -c search -d \"Gemini search\""
        }]
      }
    ],
    "Stop": [
      {
        "matcher": "",
        "hooks": [{
          "type": "command",
          "command": "./scripts/watch-conversation.sh --once && ./scripts/sync-dashboard.sh claude -c development -d \"Session end\""
        }]
      }
    ]
  }
}
```

---

## 5. カテゴリ分類ルール

### 5.1 会話カテゴリ

| カテゴリ | 判定キーワード | 例 |
|----------|--------------|-----|
| 指摘 | 違う、間違、エラー、動かない、おかしい、修正して、直して、バグ | 「これ間違ってるよ」 |
| 依頼 | してほしい、してください、追加して、作って、実装して、変更して | 「機能追加してください」 |
| 説明 | なぜ、どうして、教えて、意味、説明して、わからない | 「なぜこうなるの？」 |
| その他 | 上記以外 | （記録しない） |

### 5.2 Gemini使用カテゴリ

| カテゴリ | 用途 |
|----------|-----|
| audit | コード監査 |
| search | Google検索 |
| chat | 一般チャット |

### 5.3 Claude使用カテゴリ

| カテゴリ | 用途 |
|----------|-----|
| development | 開発作業 |
| review | コードレビュー |
| planning | 設計・計画 |

---

## 6. ファイル一覧

| ファイル | 役割 | 場所 |
|---------|------|------|
| watch-conversation.sh | 会話監視・抽出 | scripts/ |
| sync-dashboard.sh | データ同期API呼び出し | scripts/ |
| CONVERSATION_LOG.md | 会話ログ記録先 | docs/01_crm/ |
| .dashboard-sync.env | GAS URL設定 | プロジェクトルート |
| settings.local.json | フック設定 | .claude/ |

---

## 7. 修正が必要な項目

### 7.1 GAS URL (最優先)

**現状**: `.dashboard-sync.env` のURL が404エラーを返す

**原因候補**:
1. GASがデプロイされていない
2. デプロイIDが古い/間違っている
3. 公開設定が「全員」になっていない

**対処法**:
```bash
# GASプロジェクトで新規デプロイ
cd gemini-dashboard-gas
clasp deploy --description "Dashboard Sync API"
# 出力されたURLを .dashboard-sync.env に設定
```

### 7.2 システムメッセージフィルタ

**現状**: 「This session is being continued...」などが記録される

**対処法**: watch-conversation.sh の除外パターンに追加

---

## 8. ハイブリッドアーキテクチャ原則

```
+------------------+
|    GitHub        |  <-- Single Source of Truth (マスター)
|  - 全履歴保持     |
|  - git管理       |
|  - 監査可能      |
+------------------+
         |
         | 同期 (GitHub Actions / GAS webhook)
         v
+------------------+
|  Spreadsheet     |  <-- 派生データ (表示・分析用)
|  - 可視化        |
|  - フィルタ検索   |
|  - グラフ作成    |
+------------------+
```

**原則**:
1. **GitHubがマスター**: 全データはGitHubに先に書き込む
2. **Spreadsheetは派生**: GitHubから同期されたデータを表示
3. **データ整合性**: Spreadsheet側で直接編集しない
4. **障害時**: Spreadsheetが落ちてもGitHubで継続可能

---

## 9. 次のアクション

| 優先度 | タスク | 担当 |
|--------|-------|------|
| 1 | GAS doPost URLを修正・再デプロイ | Claude Code |
| 2 | ヘルスチェックでSpreadsheet同期確認 | Claude Code |
| 3 | システムメッセージフィルタ追加 | Claude Code |
| 4 | GitHub Actions→Spreadsheet同期実装 | 計画のみ |

---

**以上**
