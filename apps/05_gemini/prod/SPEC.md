# 統合ダッシュボード仕様書

**作成日**: 2026-01-18
**環境**: 提案（PROP）
**バージョン**: 2.1.0

---

## 1. システム概要図

```
+------------------------------------------------------------------+
|                      統合ダッシュボード                            |
|                    (gemini-dashboard-gas)                         |
+------------------------------------------------------------------+
                              |
        +---------------------+---------------------+
        |                     |                     |
        v                     v                     v
+---------------+     +---------------+     +---------------+
|   Overview    |     |    Gemini     |     |    Claude     |
|   (週次KPI)   |     |  (使用状況)   |     |  (使用状況)   |
+---------------+     +---------------+     +---------------+
        |                     |                     |
        +---------------------+---------------------+
                              |
        +---------------------+---------------------+
        |                     |                     |
        v                     v                     v
+---------------+     +---------------+     +---------------+
|   Defects     |     | GAS Projects  |     |  EventLog     |
| (不具合KPI)   |     | (3環境管理)   |     | (5W2H記録)    |
+---------------+     +---------------+     +---------------+
                              |
                              v
                    +-------------------+
                    |   スプレッドシート  |
                    |   (データソース)   |
                    +-------------------+
                              |
                              v
                    +-------------------+
                    |  Discord通知      |
                    | (Webhook経由)     |
                    +-------------------+
```

---

## 2. データフロー図

```
[Claude Code] ----clasp run----> [GAS API]
      |                              |
      |                              v
      |                    +------------------+
      |                    | recordEvent()   |
      |                    | recordDefect()  |
      |                    | notifyFromCC()  |
      |                    +------------------+
      |                              |
      v                              v
+------------+              +------------------+
| ローカル   |              | スプレッドシート  |
| .envファイル|              | (11シート)       |
+------------+              +------------------+
                                     |
                                     v
                            +------------------+
                            | Discord Webhook  |
                            +------------------+
```

---

## 3. シート構成（5W2H + 数値）

| # | シート名 | 目的 | 列数 | 主要列 |
|---|---------|------|:----:|--------|
| 1 | Config | 設定値 | 2 | key, value |
| 2 | GeminiUsage | Gemini使用ログ | 4 | timestamp, category, count, description |
| 3 | GeminiDaily | Gemini日次集計 | 7 | date, audit, search, review, design, other, total |
| 4 | ClaudeUsage | Claude使用ログ | 4 | timestamp, category, count, description |
| 5 | ClaudeDaily | Claude日次集計 | 7 | date, development, fix, research, doc, config, total |
| 6 | DefectLog | 不具合ログ | 9 | date, trouble_id, title, defect_type, is_recurrence, root_cause, impact, resolution, status |
| 7 | DefectDaily | 不具合日次集計 | 3 | date, new_defects, recurrences |
| 8 | DefectKPI | 不具合KPI | 3 | metric, value, updated_at |
| 9 | GASProjects | GASプロジェクト | 6 | name, env, folder, script_id, deploy_id, status |
| 10 | WeeklySummary | 週次サマリー | 6 | week_start, week_end, gemini_calls, claude_sessions, defects, health_score |
| 11 | EventLog | 全事象ログ | 12 | timestamp, where, who, what, how, how_much, why, event_type, category, severity, status, related_id |

---

## 4. 不具合分類（5W2H）

| 分類 | コード | いつ | どこで | 何が |
|------|--------|------|--------|------|
| コード不具合 | code_bug | 開発中 | コード | バグ発生 |
| API制限 | api_limit | API呼出時 | 外部API | クォータ超過 |
| 環境エラー | env_error | 実行時 | 環境設定 | 認証/設定エラー |
| プロセス違反 | process | 作業中 | ワークフロー | ルール違反 |
| 仕様違反 | spec | 実装時 | 仕様 | 仕様と不一致 |
| 再発 | recurrence | 随時 | 過去トラ | 同一問題再発 |

---

## 5. API一覧

### 5.1 データ取得API

| 関数名 | 戻り値 | 用途 |
|--------|--------|------|
| `getAllDashboardData()` | Object | 全ダッシュボードデータ |
| `getGeminiUsageData()` | Object | Gemini使用状況 |
| `getClaudeUsageData()` | Object | Claude使用状況 |
| `getDefectKPIData()` | Object | 不具合KPI |
| `getGASProjectsData()` | Object | GASプロジェクト一覧 |
| `getEventHistory(limit)` | Array | イベント履歴 |
| `getDefectStatsByType()` | Object | 不具合タイプ別統計 |

### 5.2 データ記録API

| 関数名 | 引数 | 用途 |
|--------|------|------|
| `recordEvent(event)` | Object | 5W2H+数値でイベント記録 |
| `recordDefectExtended(defect)` | Object | 拡張版不具合記録 |
| `recordAPILimitError(apiName, errorMessage, resetMinutes)` | String, String, Number | API制限エラー記録 |
| `recordGeminiUsage(category, count, description)` | String, Number, String | Gemini使用記録 |
| `recordClaudeUsage(category, count, description)` | String, Number, String | Claude使用記録 |

### 5.3 通知API

| 関数名 | 引数 | 用途 |
|--------|------|------|
| `sendDiscordNotification(notification)` | Object | Discord通知送信 |
| `sendDailyReport()` | なし | 日次レポート送信 |
| `notifyFromClaudeCode(type, message, details)` | String, String, Object | Claude Codeからの即時通知 |

---

## 6. イベント記録フォーマット（5W2H + 数値）

```javascript
{
  timestamp: "2026-01-18T15:30:00.000Z",  // いつ
  where: "Gemini API",                     // どこで
  who: "Claude Code",                      // 誰が
  what: "APIクォータ上限到達",              // 何が
  how: "API呼び出し回数が制限を超過",       // どうやって
  how_much: 40,                            // どれぐらい（リセットまで40分）
  why: "使用量が日次制限を超過",            // なぜ
  event_type: "defect",                    // イベント種別
  category: "api_limit",                   // カテゴリ
  severity: "medium",                      // 重大度
  status: "waiting_reset",                 // 状態
  related_id: "API-LIMIT-20260118-153000"  // 関連ID
}
```

---

## 7. Health Score計算式

```
Health Score = 100 - defect_penalty + streak_bonus

defect_penalty = min(weekly_defects * 10, 50)
streak_bonus = min(zero_defect_days, 10)
```

| 項目 | 計算 | 範囲 |
|------|------|------|
| defect_penalty | 週間不具合数 * 10 | 0〜50 |
| streak_bonus | 0不良日連続日数 | 0〜10 |
| Health Score | 100 - penalty + bonus | 50〜110（上限100） |

---

## 8. Discord通知仕様

### 8.1 通知タイプ

| タイプ | 色 | 用途 |
|--------|-----|------|
| error | 赤 | エラー通知 |
| warning | 黄 | 警告通知 |
| success | 緑 | 成功通知 |
| info | 青 | 情報通知 |

### 8.2 重大度アイコン

| 重大度 | アイコン |
|--------|---------|
| critical | :red_circle: |
| high | :orange_circle: |
| medium | :yellow_circle: |
| low | :green_circle: |

---

## 9. Claude Code連携

### 9.1 clasp run による呼び出し

```bash
# API制限エラーを記録
clasp run recordAPILimitError --params '["Gemini", "クォータ上限", 40]'

# イベントを記録
clasp run recordEvent --params '[{"where":"Claude Code","what":"作業完了","how_much":5}]'

# Discord通知を送信
clasp run notifyFromClaudeCode --params '["info", "作業完了", {"description":"5タスク完了"}]'
```

### 9.2 前提条件

1. clasp loginでGoogleアカウント認証済み
2. Apps Script APIが有効化済み
3. スクリプトプロパティに`DISCORD_BUGREPORT_WEBHOOK`を設定済み

---

## 10. セットアップ手順

### 10.1 スクリプトプロパティ設定

```
GASエディタ → プロジェクトの設定 → スクリプトプロパティ

キー: DISCORD_BUGREPORT_WEBHOOK
値: https://discord.com/api/webhooks/XXXXX/YYYYY
```

### 10.2 トリガー設定（日次レポート用）

```
GASエディタ → トリガー → トリガーを追加

関数: sendDailyReport
イベント: 時間主導型
時間ベースのトリガー: 日付ベースのタイマー
時刻: 午前9時〜10時
```

---

## 11. エラーグループ化 + GitHub Issue自動作成

### 11.1 概要

エラーを自動でグループ化し、GitHub Issueと連携するシステム。

```
GASでエラー発生
    ↓
reportError() 呼び出し
    ↓
フィンガープリント計算（同じエラーを識別）
    ↓
┌─────────────┐     ┌─────────────────┐
│ 既存？      │ Yes │ Issueにコメント │
│             │────→│ 発生回数+1      │
└──────┬──────┘     └─────────────────┘
       │ No
       ↓
┌─────────────────┐
│ 新規Issue作成   │
│ ErrorGroupsに   │
│ 登録            │
└─────────────────┘
       ↓
Discord通知（Issue URL付き）
```

### 11.2 ErrorGroupsシート構造

| 列 | 名前 | 説明 |
|----|------|------|
| A | fingerprint | エラーの一意識別子 |
| B | error_type | エラータイプ |
| C | message | エラーメッセージ |
| D | location | 発生場所 |
| E | first_seen | 初回発生日時 |
| F | last_seen | 最終発生日時 |
| G | count | 発生回数 |
| H | issue_number | GitHub Issue番号 |
| I | issue_url | GitHub Issue URL |
| J | status | ステータス (open/closed) |

### 11.3 API一覧

| 関数名 | 引数 | 用途 |
|--------|------|------|
| `reportError(errorInfo)` | Object | エラー報告（メインAPI） |
| `getErrorGroupStats()` | なし | エラーグループ統計取得 |
| `updateErrorGroupStatus(fingerprint, status)` | String, String | ステータス更新 |
| `testReportError()` | なし | テスト用エラー報告 |

### 11.4 reportError() の使い方

```javascript
// try-catch内で使用
try {
  // 何らかの処理
} catch (e) {
  reportError({
    type: e.name || 'Error',
    message: e.message,
    location: 'Code.gs:関数名',
    stack: e.stack,
    context: { additionalInfo: '追加情報' }
  });
  throw e; // 必要に応じて再throw
}
```

### 11.5 通知ルール

| 状況 | Discord通知 | GitHub |
|------|:-----------:|:------:|
| 新規エラー | 必ず通知 | Issue作成 |
| 再発（1-2回目） | なし | コメント追加 |
| 再発（3回目以降、3回ごと） | 通知 | コメント追加 |

### 11.6 前提条件

```
スクリプトプロパティに設定必須:
- GITHUB_TOKEN: GitHub Personal Access Token（repo権限）
- DISCORD_BUGREPORT_WEBHOOK: Discord Webhook URL
```

---

**以上**
