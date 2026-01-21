# gemini-dashboard-gas/CLAUDE.md

## 環境情報

| 項目 | 値 |
|------|-----|
| 環境 | PROP（提案環境） |
| 目的 | 統合ダッシュボード（3環境統合） |
| データ | テストデータ |
| デプロイ権限 | AI単独可 |

---

## プロジェクト概要

統合ダッシュボードシステム - Gemini/Claude使用率、不具合発生率、GASプロジェクト管理を一元化

### 機能一覧

| # | 機能 | 説明 |
|---|------|------|
| 1 | Overview | 今週のサマリー（Health Score、週次KPI） |
| 2 | Gemini | Gemini API使用率（カテゴリ別、履歴） |
| 3 | Claude | Claude使用率（カテゴリ別、履歴） |
| 4 | Defects | 不具合KPI（0不良日数、再発率等） |
| 5 | GAS Projects | 3環境GASプロジェクト管理 |

---

## シート構成

| シート名 | 目的 | 列構成 |
|---------|------|--------|
| Config | 設定値 | key, value |
| GeminiUsage | Gemini使用ログ | timestamp, category, count, description |
| GeminiDaily | Gemini日次集計 | date, audit, search, review, design, other, total |
| ClaudeUsage | Claude使用ログ | timestamp, category, count, description |
| ClaudeDaily | Claude日次集計 | date, development, fix, research, doc, config, total |
| DefectLog | 不具合ログ | date, trouble_id, title, category, is_recurrence |
| DefectDaily | 不具合日次集計 | date, new_defects, recurrences, total |
| DefectKPI | 不具合KPI | metric, value, updated_at |
| GASProjects | GASプロジェクト | name, env, folder, script_id, deploy_id, status |
| WeeklySummary | 週次サマリー | week_start, week_end, gemini_calls, claude_sessions, defects, health_score |

---

## カテゴリ定義

### Gemini カテゴリ（5W2H）

| カテゴリ | 説明 | 例 |
|---------|------|-----|
| audit | コード監査・レビュー | ポカヨケ突破テスト、品質監査 |
| search | 情報検索・調査 | Google検索、ドキュメント調査 |
| review | 文書レビュー・校正 | ドキュメントレビュー |
| design | 設計・アーキテクチャ | システム設計相談 |
| other | その他 | 分類不能な使用 |

### Claude カテゴリ（5W2H）

| カテゴリ | 説明 | 例 |
|---------|------|-----|
| development | 新機能開発 | 機能実装、UI作成 |
| fix | バグ修正 | 不具合対応、エラー修正 |
| research | 調査・分析 | コードベース調査 |
| doc | ドキュメント | README更新、仕様書作成 |
| config | 設定・構成 | 環境設定、デプロイ設定 |

---

## KPI定義

### Health Score 計算式

```
Health Score = 100 - (defect_penalty) + (streak_bonus)

defect_penalty = weekly_defects * 10  (max 50)
streak_bonus = min(zero_defect_days, 10)
```

### 不具合KPI

| KPI | 計算式 | 目標 |
|-----|--------|------|
| 0不良日連続達成日数 | 最終不具合発生日からの経過日数 | 30日以上 |
| 月間不具合数 | 当月の不具合発生件数 | 0件 |
| 不具合発生率 | 不具合発生日数 / 稼働日数 * 100 | 0% |
| 再発発生数 | is_recurrence=true の件数 | 0件 |
| 再発発生率 | 再発数 / 総不具合数 * 100 | 0% |

---

## デプロイ情報

| 環境 | デプロイID | 備考 |
|------|-----------|------|
| 提案（PROP）本番 | AKfycbyCINg3UnhppAzJ_JlcPooZSkabFju1g4gchVQ6HJurmzDKPLai8hGbCf-NV8P4qW8jEQ | v2.0.0 完成版 |
| 提案（PROP）テスト | @HEAD | 開発用 |

### WebアプリURL

| 環境 | URL |
|------|-----|
| 本番 | https://script.google.com/macros/s/AKfycbyCINg3UnhppAzJ_JlcPooZSkabFju1g4gchVQ6HJurmzDKPLai8hGbCf-NV8P4qW8jEQ/exec?authuser=0 |
| テスト | https://script.google.com/macros/s/AKfycbwPJa4Ujf30SV1Fez6sBjcUtT7mfVKQ7wYWGqVaHY5A/exec?authuser=0 |

### デプロイ手順

```bash
cd ~/sales-ops-with-claude/gemini-dashboard-gas
clasp push
# テストURLで確認後、本番デプロイ
clasp deploy --deploymentId AKfycbyCINg3UnhppAzJ_JlcPooZSkabFju1g4gchVQ6HJurmzDKPLai8hGbCf-NV8P4qW8jEQ --description "説明"
```

---

## 開発ルール

### 1. データ入力時のポカヨケ

Dashboard更新時は必ず以下を記入：

1. **Gemini使用記録**
   - timestamp: 使用日時
   - category: 5カテゴリから選択
   - count: 使用回数
   - description: 使用目的（5W2H形式）

2. **Claude使用記録**
   - timestamp: セッション日時
   - category: 5カテゴリから選択
   - count: セッション数
   - description: 作業内容（5W2H形式）

3. **不具合記録**
   - date: 発生日
   - trouble_id: TROUBLE-XXX形式
   - title: 不具合タイトル
   - is_recurrence: 再発かどうか

### 2. XSS対策

- innerHTML の使用禁止
- textContent または createElement を使用
- ユーザー入力値は必ずエスケープ

### 3. LockService

- シート操作時は LockService.getScriptLock() を使用
- タイムアウト: 10秒

---

## 関連ファイル

| ファイル | 役割 |
|---------|------|
| Code.gs | バックエンド（API、データ処理） |
| index.html | フロントエンド（HTML構造） |
| style.html | スタイルシート |
| script.html | フロントエンドJS |

---

**作成日**: 2026-01-18
**環境**: 提案環境（PROP）
