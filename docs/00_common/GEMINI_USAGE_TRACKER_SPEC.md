# Gemini API Usage Tracker: 設計仕様書

**作成日**: 2026-01-17
**設計者**: Claude Code + Gemini Pro（共同設計）
**ステータス**: 承認済み

---

## 1. 概要

Gemini APIの呼び出し回数を追跡・管理し、日次および分単位での使用制限を超過することを防ぐ。設定された閾値に達した場合、ターミナルおよびDiscordを通じてアラートを送信する。

### 目的
- Gemini CLI無料枠（1,000リクエスト/日、60リクエスト/分）の効率的な活用
- 無料枠超過の防止
- レート制限エラーの回避

---

## 2. 技術仕様

### 2.1 実装言語
- **シェルスクリプト** (`gemini-usage-tracker.sh`)
- 依存コマンド: `jq` (JSONの読み書き)

### 2.2 ファイル構成

```
~/.gemini/
├── usage.json          # カウンターデータ（自動生成）
└── usage-config.json   # 設定ファイル（手動設定）

~/sales-ops-with-claude/scripts/
└── gemini-usage-tracker.sh  # メインスクリプト
```

### 2.3 データ保存ファイル

**パス**: `~/.gemini/usage.json`

```json
{
  "date": "2026-01-17",
  "daily_count": 0,
  "rate_limit_timestamps": []
}
```

| フィールド | 型 | 説明 |
|-----------|-----|------|
| date | string | UTC日付（YYYY-MM-DD） |
| daily_count | number | 日次リクエスト数 |
| rate_limit_timestamps | array | 直近のリクエストタイムスタンプ（Unix秒） |

### 2.4 設定ファイル

**パス**: `~/.gemini/usage-config.json`

```json
{
  "daily_limit": 1000,
  "warnings": [
    { "threshold_percent": 95, "type": "critical" },
    { "threshold_percent": 80, "type": "warning" }
  ],
  "rate_limit": {
    "requests": 50,
    "window_seconds": 60
  },
  "discord_notify_script": "~/sales-ops-with-claude/scripts/notify-discord.sh"
}
```

---

## 3. 閾値設定

| 項目 | 閾値 | アクション |
|------|------|-----------|
| 日次80% | 800回 | 警告（黄色）- ターミナル表示 |
| 日次95% | 950回 | 重大警告（オレンジ）- Discord通知 |
| 日次100% | 1000回 | エラー停止（赤）- Discord通知 + 処理中止 |
| 分間50回 | 50回 | 警告 + 待機 |
| 分間60回 | 60回 | エラー停止 + 次の分まで待機 |

---

## 4. コマンドラインインターフェース

### 4.1 check - 使用量チェック

```bash
gemini-usage-tracker.sh check
```

- 日次上限とレート制限をチェック
- 上限に達している場合は非ゼロで終了
- 正常な場合は0で終了

### 4.2 increment - カウンター増加

```bash
gemini-usage-tracker.sh increment
```

- 日次カウンターを+1
- rate_limit_timestampsに現在のタイムスタンプを追加
- 閾値に達した場合はアラートをトリガー

### 4.3 status - 状態表示

```bash
gemini-usage-tracker.sh status
```

- 現在の使用状況を表示
- 日次カウント、リセットまでの時間
- レート制限の状態

### 4.4 reset - 手動リセット

```bash
gemini-usage-tracker.sh reset
```

- カウンターを手動でリセット（デバッグ用）

---

## 5. 日次リセット

- **タイミング**: UTC 0:00
- **ロジック**: スクリプト実行時に`usage.json`の`date`が現在（UTC）と異なる場合、カウンターを自動リセット

---

## 6. シェル関数統合

### .zshrc への追加

```sh
# Gemini CLI ラッパー関数
function gemini() {
  # 使用量チェック
  if ! ~/sales-ops-with-claude/scripts/gemini-usage-tracker.sh check; then
    echo "Error: Gemini API usage limit reached. Aborting." >&2
    return 1
  fi

  # 本来のgeminiコマンドを実行
  command gemini "$@"
  local exit_code=$?

  # 成功した場合のみ使用量をインクリメント
  if [ $exit_code -eq 0 ]; then
    ~/sales-ops-with-claude/scripts/gemini-usage-tracker.sh increment
  fi

  return $exit_code
}
```

---

## 7. 監査ワークフロー

```
┌─────────────────────────────────────────────────────────────┐
│ 1. [Claude Code] 設計・実装                                  │
├─────────────────────────────────────────────────────────────┤
│ 2. [Claude Code] tracker check                              │
│    ├→ NG → アラート → 待機/中止                              │
│    └→ OK ↓                                                  │
├─────────────────────────────────────────────────────────────┤
│ 3. [Gemini Pro] 監査実行 → tracker increment                │
├─────────────────────────────────────────────────────────────┤
│ 4. [Claude Code] 監査結果をユーザーに報告                    │
├─────────────────────────────────────────────────────────────┤
│ 5. [ユーザー] 動作確認・承認                                 │
├─────────────────────────────────────────────────────────────┤
│ 6. [Claude Code] 本番デプロイ実行                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. アラート通知

### ターミナル出力（必須）

```
⚠️ [WARNING] Gemini API usage: 800/1000 (80%)
🔴 [CRITICAL] Gemini API usage: 950/1000 (95%)
❌ [ERROR] Gemini API daily limit reached: 1000/1000
```

### Discord通知（任意）

設定ファイルに`discord_notify_script`が指定されている場合のみ通知。

---

## 9. エラーハンドリング

| エラー | 対処 |
|--------|------|
| jqコマンドが見つからない | エラーメッセージを表示して終了 |
| usage.jsonが存在しない | 初期化して新規作成 |
| usage-config.jsonが存在しない | デフォルト値を使用 |
| ファイル書き込み失敗 | エラーメッセージを表示 |

---

## 10. 今後の拡張

- [ ] Webダッシュボードでの使用量可視化
- [ ] 週次・月次レポートの自動生成
- [ ] 複数APIキーの管理対応
- [ ] Slack通知対応
