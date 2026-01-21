# 思考プロセス制御システム仕様書

> **作成日**: 2026-01-19
> **バージョン**: 3.0.0
> **ステータス**: Phase 6運用中（Human介入100%パイロット）

---

## 本仕様書の運用ルール（厳守）

| ルール | 内容 |
|--------|------|
| **仕様変更時の更新義務** | 本仕様に変更がある場合、必ず本仕様書を先に更新すること |
| **仕様書なしの変更禁止** | 本仕様書を更新せずに仕様を変更することを禁止する |
| **変更履歴の記録** | 全ての変更は末尾の「変更履歴」セクションに記録すること |
| **バージョン管理** | 変更時はバージョン番号を更新すること（セマンティックバージョニング） |

---

## 1. 目的

| 項目 | 内容 |
|------|------|
| KGI | Human介入率 0%（質問/指示/確認/フィードバック = 0件） |
| 達成状態 | 人間の回答が「yes」のみになる状態 |
| 手段 | 全メッセージを記録・分析し、AIの長期記憶として活用 |
| 技術的強制 | Claude Code hooks による仕様遵守の強制 |

---

## 2. フォルダ構造

```
docs/00_common/THINKING_PROCESS/
├── SPEC.md               # 本仕様書（変更時は必ず更新）
├── feedback/             # フィードバック（私がミスした）
│   ├── normal/          # 通常案件
│   └── recurrence/      # 再発案件
├── question/            # 質問（私の説明不足）
│   ├── normal/
│   └── recurrence/
├── instruction/         # 指示（私の自発性不足）
│   ├── normal/
│   └── recurrence/
├── confirmation/        # 確認（私の報告不明確）
│   ├── normal/
│   └── recurrence/
├── SUMMARY.md           # 全カテゴリサマリー
├── QUIZ.md              # 読了確認クイズ
└── CONVERSATION_LOG.md  # 会話ログ

.claude/
├── settings.json        # hooks設定
├── logs/                # 自動生成ログ
│   ├── read_log_YYYYMMDD.txt
│   ├── tool_log_YYYYMMDD.jsonl
│   └── session_ready_YYYYMMDD.txt
└── scripts/
    ├── session_init.sh      # SessionStart: 初期化
    ├── session_gate.py      # PreToolUse: 読了チェック・ブロック
    ├── read_logger.py       # PostToolUse(Read): 読了ログ記録
    └── tool_logger.py       # PostToolUse(*): 全ツールログ記録
```

---

## 3. 応答プロセスフロー

```
┌─────────────────────────────────────────────────────────────┐
│                    セッション開始                            │
├─────────────────────────────────────────────────────────────┤
│ [技術的強制] SessionStart hook → session_init.sh            │
│   → ログファイル初期化                                      │
│   → 必須読了ファイル一覧をコンテキスト注入                  │
├─────────────────────────────────────────────────────────────┤
│ Step 1: 必須ファイル読了                                    │
│   → CLAUDE.md, COMMON_RULES.md, TROUBLE_LOG.md              │
│   → PROJECT_SPECIFICATION.md, THINKING_PROCESS/SPEC.md      │
├─────────────────────────────────────────────────────────────┤
│ [技術的強制] PostToolUse(Read) hook → read_logger.py        │
│   → 読了ファイルをログに自動記録                            │
├─────────────────────────────────────────────────────────────┤
│ Step 1.5: 読了報告 + session_ready作成                      │
│   → touch ~/.claude/logs/session_ready_YYYYMMDD.txt         │
├─────────────────────────────────────────────────────────────┤
│                    人間メッセージ受信                        │
├─────────────────────────────────────────────────────────────┤
│ Step 2: メッセージ分類                                      │
│   → feedback / question / instruction / confirmation        │
├─────────────────────────────────────────────────────────────┤
│ Step 2.5: 該当カテゴリの過去トラ参照                        │
│   → recurrence/（再発）を全件読了【必須】                   │
│   → normal/（通常）を全件読了【必須】                       │
├─────────────────────────────────────────────────────────────┤
│ Step 2.6: クイズ回答                                        │
│   → QUIZ.mdの該当カテゴリに回答                             │
│   → 不正解 → 再読                                          │
├─────────────────────────────────────────────────────────────┤
│ Step 3: 応答ドラフト作成                                    │
│   → 要因分析（なぜこのメッセージが発生したか）              │
│   → 成功/失敗パターン記録                                   │
├─────────────────────────────────────────────────────────────┤
│ Step 4: ポカヨケチェック                                    │
│   → 全チェック項目を確認（Section 6参照）                   │
├─────────────────────────────────────────────────────────────┤
│ [技術的強制] PreToolUse hook → session_gate.py              │
│   → 読了ログチェック                                        │
│   → 未読了なら Edit/Write/Bash を **ブロック**              │
├─────────────────────────────────────────────────────────────┤
│ Step 5: 応答出力 + ログ記録                                 │
│   → CONVERSATION_LOG.mdに追記                               │
│   → 該当カテゴリにTHINK-X-XXX.md作成                        │
├─────────────────────────────────────────────────────────────┤
│ [技術的強制] PostToolUse(*) hook → tool_logger.py           │
│   → 全ツール呼び出しをJSONLに自動記録                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. 各ステップ詳細（5W2H + Why）

### 4.1 Step 2: メッセージ分類

| 5W2H | 内容 |
|------|------|
| **What** | 人間メッセージを4分類のうち1つに分類 |
| **Where** | 思考フェーズ内（応答出力前） |
| **When** | 人間メッセージ受信直後 |
| **Who** | Claude Code |
| **How** | 「分類: ○○」と明示的に記述 |
| **How much** | 1メッセージにつき1回、必ず実施 |
| **Why** | 分類しないとどのフォルダを参照すべきか分からない。参照漏れ → 再発 |
| **完了条件** | 「分類: feedback/question/instruction/confirmation」が記述されている |

#### 4.1.1 分類基準

| 分類 | 判定基準 | 意味 |
|------|---------|------|
| feedback | 「違う」「間違い」「読んでない」等の指摘 | 私がミスした |
| question | 「〜とは？」「どうやって？」等の質問 | 私の説明不足 |
| instruction | 「〜して」「〜を実行」等の依頼 | 私の自発性不足 |
| confirmation | 「できた？」「確認した？」等の確認 | 私の報告不明確 |

#### 4.1.2 分類基準の自律アップデートルール

| ルール | 内容 |
|--------|------|
| **トリガー** | 人間から「分類が違う」という指摘を受けた場合 |
| **アクション** | 本仕様書の分類基準（4.1.1）を即座に更新 |
| **記録** | 変更履歴に「分類基準更新」として記録 |
| **Why** | 分類精度が低いと参照すべきフォルダを間違え、再発防止効果が低下する |

---

### 4.2 Step 2.5: 該当カテゴリの過去トラ参照

| 5W2H | 内容 |
|------|------|
| **What** | 分類結果に対応するフォルダの過去トラを全件読了 |
| **Where** | `THINKING_PROCESS/{category}/recurrence/` と `normal/` |
| **When** | メッセージ分類の直後 |
| **Who** | Claude Code |
| **How** | フォルダ内の全THINK-X-XXX.mdを読み、パターンを確認 |
| **How much** | recurrence: 全件必須 / normal: 全件必須 |
| **Why** | 過去の失敗を知らないと同じ失敗を繰り返す。再発は特に重要 |
| **完了条件** | 「参照完了: recurrence X件, normal Y件」が記述されている |

---

### 4.3 Step 2.6: クイズ回答

| 5W2H | 内容 |
|------|------|
| **What** | QUIZ.mdの該当カテゴリの質問に回答 |
| **Where** | 思考フェーズ内 |
| **When** | 過去トラ参照の直後 |
| **Who** | Claude Code |
| **How** | クイズに対する回答を記述 |
| **How much** | 該当カテゴリの全問 |
| **Why** | 読み飛ばし防止。回答できない = 読んでいない証拠 |
| **完了条件** | 全問に回答できている。不正解なら再読して再回答 |

---

### 4.4 Step 3: 応答ドラフト作成 + 要因分析

| 5W2H | 内容 |
|------|------|
| **What** | 応答を作成し、なぜこのメッセージが発生したか分析 |
| **Where** | 思考フェーズ内 |
| **When** | クイズ回答後 |
| **Who** | Claude Code |
| **How** | 「要因: ○○」「改善案: ○○」を記述 |
| **How much** | 毎回必須（全メッセージタイプ） |
| **Why** | 分析しないと学習にならない。記録だけでは改善しない |
| **完了条件** | 要因・改善案が記述されている |

---

### 4.5 Step 4: ポカヨケチェック

| 5W2H | 内容 |
|------|------|
| **What** | 全チェック項目を確認 |
| **Where** | 思考フェーズ内 |
| **When** | 応答ドラフト作成後、出力前 |
| **Who** | Claude Code |
| **How** | Section 6のチェックリストを全項目確認 |
| **How much** | 全項目必須 |
| **Why** | チェックなしで出力すると漏れが発生する |
| **完了条件** | 全項目にチェックが入っている |

---

### 4.6 Step 5: 応答出力 + ログ記録

| 5W2H | 内容 |
|------|------|
| **What** | 応答を出力し、CONVERSATION_LOG.mdと該当フォルダに記録 |
| **Where** | CONVERSATION_LOG.md + THINKING_PROCESS/{category}/{normal or recurrence}/ |
| **When** | ポカヨケチェック完了後 |
| **Who** | Claude Code |
| **How** | 定義済みフォーマットで追記 |
| **How much** | 1会話につき1エントリ + 1ファイル |
| **Why** | 記録がないとHuman PDCAができない。長期記憶として機能しない |
| **完了条件** | CONVERSATION_LOG.mdに追記 + THINK-X-XXX.md作成完了 |

---

## 5. ファイルフォーマット

### 5.1 THINK-X-XXX.md（過去トラ個別ファイル）

```markdown
# THINK-F-001: [タイトル]

| 項目 | 内容 |
|------|------|
| ID | THINK-F-001 |
| 日時 | YYYY-MM-DD |
| 会話ID | CONV-YYYYMMDD-NNN |
| 分類 | feedback / question / instruction / confirmation |
| 再発 | はい / いいえ |

## 人間メッセージ
[原文または要約]

## 要因分析

| 項目 | 内容 |
|------|------|
| 要因 | [なぜこのメッセージが発生したか] |
| 私の不足 | [何が足りなかったか] |
| 改善案 | [次回どうすれば防げるか] |

## ポカヨケ
[再発防止策。Section 7に追加する場合はここに記載]
```

### 5.2 その他ファイル

- QUIZ.md: 読了確認クイズ
- SUMMARY.md: 全カテゴリサマリー
- CONVERSATION_LOG.md: 会話ログ

---

## 6. ポカヨケチェックリスト（毎回実行）

### 6.1 Step 2.5 チェック（応答前）

```
□ 分類: ____________（feedback/question/instruction/confirmation）
□ 参照完了: recurrence ___件, normal ___件
□ クイズ回答: 全問正解
```

### 6.2 Step 4 チェック（応答後）

```
□ 要因: ____________
□ 改善案: ____________
□ 再発判定: はい / いいえ
□ ログ記録: CONV-____________
□ 過去トラ記録: THINK-_-___.md
```

### 6.3 作成前チェック（POKA-F-001）

```
□ 調査完了後、結果を報告したか
□ 設計完了後、内容を提示したか
□ Humanから明示的な合意を得たか
□ 合意なしに作成を開始していないか
```

---

## 7. ポカヨケ一覧

### POKA-F-001: 作成前の合意確認強制

| 項目 | 内容 |
|------|------|
| 対象 | THINK-F-001 |
| トリガー | 調査・設計完了後、作成移行前 |
| 強制行動 | 「この設計で進めますか？」と確認し、合意を得る |
| Why | 独断で作成を開始するとHumanの意思決定権を侵害する |
| 強制力 | 中（ルールベース） |

---

## 8. 技術的強制力（Hooks）

### 8.1 概要

Claude Code hooks を使用して、仕様遵守を技術的に強制する。

### 8.2 設定ファイル

| ファイル | パス | 役割 |
|---------|------|------|
| settings.json | .claude/settings.json | hooks設定 |
| session_init.sh | .claude/scripts/session_init.sh | セッション初期化 |
| session_gate.py | .claude/scripts/session_gate.py | 読了チェック・ブロック |
| read_logger.py | .claude/scripts/read_logger.py | 読了ログ記録 |
| tool_logger.py | .claude/scripts/tool_logger.py | 全ツールログ記録 |

### 8.3 Hooks設定

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup",
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/scripts/session_init.sh",
            "timeout": 5000
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Edit|Write|Bash",
        "hooks": [
          {
            "type": "command",
            "command": "python3 ~/.claude/scripts/session_gate.py",
            "timeout": 5000
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Read",
        "hooks": [
          {
            "type": "command",
            "command": "python3 ~/.claude/scripts/read_logger.py",
            "timeout": 5000
          }
        ]
      },
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "python3 ~/.claude/scripts/tool_logger.py",
            "timeout": 5000
          }
        ]
      }
    ]
  }
}
```

### 8.4 強制される動作

| 動作 | Hook | 強制方法 | 違反時 |
|------|------|---------|--------|
| 必須ファイル読了 | PreToolUse | session_gate.py | Edit/Write/Bash **ブロック** |
| 読了ログ記録 | PostToolUse(Read) | read_logger.py | **自動記録**（省略不可） |
| ツールログ記録 | PostToolUse(*) | tool_logger.py | **自動記録**（省略不可） |
| セッション初期化 | SessionStart | session_init.sh | **自動実行** |

### 8.5 必須読了ファイル

| # | ファイル | チェック対象 |
|---|---------|-------------|
| 1 | CLAUDE.md | ✅ |
| 2 | COMMON_RULES.md | ✅ |
| 3 | TROUBLE_LOG.md | ✅ |
| 4 | PROJECT_SPECIFICATION.md | ✅ |
| 5 | THINKING_PROCESS/SPEC.md | ✅ |

### 8.6 ログファイル

| ファイル | 内容 | 自動生成 |
|---------|------|----------|
| ~/.claude/logs/read_log_YYYYMMDD.txt | 読了ファイル一覧 | ✅ |
| ~/.claude/logs/tool_log_YYYYMMDD.jsonl | 全ツール呼び出しログ | ✅ |
| ~/.claude/logs/session_ready_YYYYMMDD.txt | セッション準備完了フラグ | 手動作成 |

---

## 9. 読了強制ルール

| 対象 | 強制レベル | 条件 |
|------|-----------|------|
| recurrence（再発） | **最高** | 全件読了 + クイズ全問正解 必須 |
| normal（通常） | **高** | 全件読了 + クイズ全問正解 必須 |
| 他カテゴリ | 任意 | 関連時のみ参照 |

**読了未完了の場合**:
- 技術的強制: Edit/Write/Bash **ブロック**
- ルール: 応答出力を禁止

---

## 10. 成功指標

| 指標 | 目標 | 測定方法 |
|------|------|----------|
| feedback発生率 | 0% | CONVERSATION_LOG集計 |
| question発生率 | 0% | CONVERSATION_LOG集計 |
| instruction発生率 | 0% | CONVERSATION_LOG集計 |
| confirmation発生率 | 0% | CONVERSATION_LOG集計 |
| 再発率 | 0% | recurrenceフォルダ件数 |
| Human介入率 | 0% | 上記全て0%で達成 |

---

## 11. 実装ステップ

| Phase | 内容 | 状態 |
|-------|------|------|
| Phase 1 | フォルダ構造作成 | ✅ 完了 |
| Phase 2 | 仕様書作成 | ✅ 完了 |
| Phase 3 | 補助ファイル作成 | ✅ 完了 |
| Phase 4 | 技術的強制力（Hooks）実装 | ✅ 完了 |
| Phase 5 | CLAUDE.md統合 | ✅ 完了（Section 58-60追加） |
| Phase 6 | 運用開始（Human介入100%） | ✅ 開始（2026-01-19〜） |
| Phase 7 | 介入率低減 | 📋 メカニズム実装済み（運用中）

---

## 12. 関連ドキュメント

| ドキュメント | パス | 説明 |
|-------------|------|------|
| CLAUDE.md | /CLAUDE.md | 開発ルール |
| TROUBLE_LOG.md | /docs/01_crm/TROUBLE_LOG.md | 実装の過去トラ |
| FUTURE_FEATURES.md | /docs/00_common/FUTURE_FEATURES.md | 未実装機能一覧 |

---

## 変更履歴

| バージョン | 日時 | 変更者 | 内容 |
|-----------|------|--------|------|
| 1.0.0 | 2026-01-19 | Claude Code | 初版作成 |
| 2.0.0 | 2026-01-19 | Claude Code | 技術的強制力（Hooks）統合、POKA-F-001追加 |
| 3.0.0 | 2026-01-19 | Claude Code | Phase 4-6完了、CLAUDE.md統合（Section 58-60）、運用開始 |

---

**以上**
