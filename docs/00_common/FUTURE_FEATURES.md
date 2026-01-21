# FUTURE_FEATURES.md - 未実装機能一覧

> **作成日**: 2026-01-17
> **目的**: 検討済みだが未実装の機能を記録し、将来の実装判断に活用

---

## FEATURE-000: 思考プロセス制御システム（最重要・最優先）

### 1. 概要

| 項目 | 内容 |
|------|------|
| 機能名 | 思考プロセス制御システム |
| 目的 | Human介入率0%の自律型エージェント実現 |
| KGI | Human指摘による不具合発生率 0% |
| 検討日 | 2026-01-19 |
| ステータス | **Phase 6運用中（パイロット）** |
| 優先度 | ★★★★★（最高） |
| 仕様書 | **docs/00_common/THINKING_PROCESS/SPEC.md** |

### 2. 仕様書参照

**詳細仕様は以下を参照:**
- **仕様書**: `docs/00_common/THINKING_PROCESS/SPEC.md`

**仕様書運用ルール:**
| ルール | 内容 |
|--------|------|
| 仕様変更時の更新義務 | 仕様に変更がある場合、必ずSPEC.mdを先に更新 |
| 仕様書なしの変更禁止 | SPEC.mdを更新せずに仕様を変更することを禁止 |

### 3. フォルダ構造

```
docs/00_common/THINKING_PROCESS/
├── SPEC.md              # 仕様書（変更時は必ず更新）
├── feedback/            # フィードバック（私がミスした）
│   ├── normal/         # 通常案件
│   └── recurrence/     # 再発案件
├── question/           # 質問（私の説明不足）
│   ├── normal/
│   └── recurrence/
├── instruction/        # 指示（私の自発性不足）
│   ├── normal/
│   └── recurrence/
├── confirmation/       # 確認（私の報告不明確）
│   ├── normal/
│   └── recurrence/
├── SUMMARY.md          # 全カテゴリサマリー
├── QUIZ.md             # 読了確認クイズ
└── CONVERSATION_LOG.md # 会話ログ
```

### 4. 実装ステップ

- [x] Phase 1: フォルダ構造作成（2026-01-19完了）
- [x] Phase 2: 仕様書作成（2026-01-19完了）
- [x] Phase 3: 補助ファイル作成（2026-01-19完了）
  - [x] QUIZ.md
  - [x] SUMMARY.md
  - [x] CONVERSATION_LOG.md
- [x] Phase 4: CLAUDE.md統合（2026-01-19完了）
  - [x] Section 58: 応答プロセスフロー追加
  - [x] Section 59: ポカヨケチェックリスト追加
  - [x] Section 60: 介入率低減メカニズム追加
- [x] Phase 5: 運用開始（2026-01-19開始）
  - [x] Human介入100%でパイロット運用開始
  - [ ] 成功/失敗パターン収集（継続中）
- [x] Phase 6: 介入率低減メカニズム実装（2026-01-19完了）
  - [x] パターン分析手法定義（CLAUDE.md Section 60）
  - [x] Phase移行条件定義
  - [ ] 介入率50%→20%→5%→0%（運用中）

### 5. 成功基準

| 指標 | 目標 | 測定方法 |
|------|------|----------|
| feedback発生率 | 0% | CONVERSATION_LOG集計 |
| question発生率 | 0% | CONVERSATION_LOG集計 |
| instruction発生率 | 0% | CONVERSATION_LOG集計 |
| confirmation発生率 | 0% | CONVERSATION_LOG集計 |
| 再発率 | 0% | recurrenceフォルダ件数 |
| Human介入率 | 0% | 上記全て0%で達成 |

---

## FEATURE-001: セッション開始ルール強制メカニズム

### 1. 概要

| 項目 | 内容 |
|------|------|
| 機能名 | セッション開始ルール強制メカニズム |
| 目的 | 解釈率100%の自律型エージェント生成 |
| KGI | ルール違反率0%、過去トラ再発率0%、仕様違反率0% |
| 検討日 | 2026-01-17 |
| ステータス | 未実装（設計完了） |

### 2. 現状の課題

| 課題 | 説明 |
|------|------|
| ルール認知 | CLAUDE.md自動読み込みで100%達成 |
| ルール遵守 | **強制力なし**（現状92%） |
| 技術的制約 | Claude Codeの出力内容を外部から監視不可 |

### 3. 設計内容

#### 3.1 全体構成

```
┌─────────────────────────────────────────────────────────┐
│                    セッション開始                        │
├─────────────────────────────────────────────────────────┤
│ [自動] SessionStartフック                                │
│   → 前日のログファイル削除                               │
│   → 当日ログファイル初期化                               │
├─────────────────────────────────────────────────────────┤
│ [強制1] CLAUDE.md自動読み込み（システム仕様）            │
│   → Section 0「セッション開始ルール」を認知              │
├─────────────────────────────────────────────────────────┤
│ [強制2] 4ファイル読了                                    │
│   → PostToolUseフックで読了ログ記録                      │
├─────────────────────────────────────────────────────────┤
│ [強制3] 読了報告出力                                     │
│   → 遵守宣言を含める                                     │
│   → 報告ファイル作成コマンド実行                         │
├─────────────────────────────────────────────────────────┤
│ [強制4] PreToolUseフック（Edit/Write/Bash前）            │
│   → 読了ログチェック（4ファイル読了済みか）              │
│   → 報告ファイル存在チェック                             │
│   → どちらか欠けていればブロック                         │
├─────────────────────────────────────────────────────────┤
│                      作業実行                            │
├─────────────────────────────────────────────────────────┤
│ [強制5] 作業完了時の自己チェック                         │
│   → ルール違反確認                                       │
│   → 記録漏れ確認                                         │
└─────────────────────────────────────────────────────────┘
```

#### 3.2 設定ファイル

```json
// .claude/settings.json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "rm -f ~/.claude/read_log_*.txt ~/.claude/session_ready_*.txt && touch ~/.claude/read_log_$(date +%Y%m%d).txt"
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
            "command": "jq -r '.tool_input.file_path' >> ~/.claude/read_log_$(date +%Y%m%d).txt"
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
            "command": "python3 ~/.claude/scripts/session_gate.py"
          }
        ]
      }
    ]
  }
}
```

#### 3.3 ゲートスクリプト

```python
# ~/.claude/scripts/session_gate.py
import sys
from datetime import datetime
from pathlib import Path

TODAY = datetime.now().strftime('%Y%m%d')
LOG_FILE = Path.home() / f".claude/read_log_{TODAY}.txt"
READY_FILE = Path.home() / f".claude/session_ready_{TODAY}.txt"

REQUIRED_FILES = [
    "COMMON_RULES.md",
    "CLAUDE.md",
    "TROUBLE_LOG.md",
    "PROJECT_SPECIFICATION.md"
]

errors = []

# チェック1: 読了ログ存在確認
if not LOG_FILE.exists():
    errors.append("読了ログなし")
else:
    read_files = LOG_FILE.read_text().splitlines()
    missing = [f for f in REQUIRED_FILES if not any(f in r for r in read_files)]
    if missing:
        errors.append(f"未読了ファイル: {', '.join(missing)}")

# チェック2: 報告ファイル存在確認
if not READY_FILE.exists():
    errors.append("読了報告未完了（session_readyファイルなし）")

# 結果
if errors:
    print("=" * 50)
    print("【セッション開始ルール違反】")
    print("=" * 50)
    for e in errors:
        print(f"  - {e}")
    print()
    print("以下を実行してください：")
    print("1. 4ファイルを全文読了")
    print("2. 読了報告フォーマットで報告")
    print(f"3. touch ~/.claude/session_ready_{TODAY}.txt を実行")
    print("=" * 50)
    sys.exit(2)

sys.exit(0)
```

#### 3.4 正しいフック出力形式

```json
// ブロック時の出力形式（推奨）
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "未読了ファイルあり"
  }
}
```

### 4. コスト評価

| 項目 | コスト | 備考 |
|------|--------|------|
| hooks機能 | $0 | Claude Code標準機能 |
| Pythonスクリプト | $0 | ローカル実行 |
| ログファイル | $0 | ローカルストレージ |
| GAS連携（オプション） | $0 | 無料枠内 |
| **合計追加コスト** | **$0/月** | - |

### 5. 達成率評価

| 強制ポイント | 方式 | 達成率 |
|-------------|------|--------|
| ルール認知 | CLAUDE.md自動読み込み | 100% |
| ファイル読了 | PostToolUse + PreToolUseフック | 95% |
| 読了報告出力 | ルール定義 + 遵守宣言 | 90% |
| 報告ファイル作成 | touchコマンド義務 | 85% |
| 作業開始ゲート | PreToolUseブロック | 95% |
| 自己チェック | ルール定義 | 80% |
| **複合達成率** | - | **95%** |

### 6. 運用評価

| 項目 | 評価 | 備考 |
|------|------|------|
| 安定性 | 中〜高 | 公式機能、バグ解決済（Issue #4362） |
| 標準化 | 可能 | Git管理可能 |
| Claude Codeのみ運用 | 可能 | ローカル方式推奨 |

### 7. 未実装の理由

| 理由 | 詳細 |
|------|------|
| 現状の達成率 | 92%（ルール定義のみ）で許容範囲内 |
| 実装コスト | 設定・スクリプト配置の手間 |
| 運用リスク | Claude Codeアップデートで仕様変更の可能性 |
| 優先度 | 他の開発タスクが優先 |

### 8. 実装判断基準

以下の条件を満たした場合に実装を検討：

| 条件 | 閾値 |
|------|------|
| ルール違反発生率 | 10%以上 |
| 過去トラ再発 | 2回以上 |
| Human指摘 | 「強制が必要」と判断 |

### 9. 参考資料

- [Claude Code Hooks Guide](https://code.claude.com/docs/en/hooks-guide)
- [GitHub Issue #4362（解決済）](https://github.com/anthropics/claude-code/issues/4362)
- [GAS Quotas](https://developers.google.com/apps-script/guides/services/quotas)

---

## FEATURE-002: BUSINESS_CONTEXT完全化

### 概要

| 項目 | 内容 |
|------|------|
| 機能名 | BUSINESS_CONTEXT.md Section 7,8 の完全化 |
| 目的 | Claude Codeが理念・ビジョンを参照して行動可能にする |
| 検討日 | 2026-01-19 |
| ステータス | 未実装 |

### 追加予定コンテンツ

| セクション | 内容 |
|-----------|------|
| Section 7: 未整備項目 | 社内用語辞書、組織図、チーム構成、倫理ガイドライン |
| Section 8: 整備可能項目 | 段階的に追加予定のコンテキスト |

### 実装ステップ

- [ ] 社内用語辞書の作成
- [ ] 組織図・チーム構成の文書化
- [ ] 倫理ガイドラインの作成
- [ ] WebAppでのビジネスコンテキスト表示画面追加

---

## FEATURE-003: 外部API仕様書（EXTERNAL_API_REFERENCE.md）

### 概要

| 項目 | 内容 |
|------|------|
| 機能名 | 外部API統合仕様書 |
| 目的 | Claude Codeが外部APIを正しく使用するための参照 |
| 検討日 | 2026-01-19 |
| ステータス | 未実装 |

### 対象API

| API | 説明 | ドキュメント |
|-----|------|-------------|
| Gemini MCP | Gemini CLI経由の監査・検索 | 要作成 |
| clasp CLI | GASデプロイメント | 要作成 |
| GitHub Actions | ワークフロー自動化 | 既存（clasp-deploy.yml） |
| Discord Webhook | 通知送信 | 既存（notify-discord.sh） |

### 実装ステップ

- [ ] EXTERNAL_API_REFERENCE.md 作成
- [ ] Gemini MCP仕様書セクション追加
- [ ] clasp CLI仕様書セクション追加
- [ ] WebAppでのAPI仕様画面追加

---

## FEATURE-004: 設定ポリシー管理画面

### 概要

| 項目 | 内容 |
|------|------|
| 機能名 | Claude Code設定ポリシーのWebApp表示・編集 |
| 目的 | Humanが設定ポリシーを確認・変更可能にする |
| 検討日 | 2026-01-19 |
| ステータス | 未実装 |

### 表示項目

| 項目 | 説明 |
|------|------|
| 操作一覧 | file_read, file_edit, bash, etc. |
| 用途 | 各操作の用途説明 |
| 許可状態 | 許可 / 不許可 / 禁止 |
| 理由 | 許可/不許可の理由 |

### 実装ステップ

- [ ] settings.local.json のパース機能追加（GAS）
- [ ] 設定管理画面UI追加（WebApp）
- [ ] 設定変更API追加（GAS）
- [ ] 変更履歴記録機能追加

---

## FEATURE-005: 相互同期機能完全実装

### 概要

| 項目 | 内容 |
|------|------|
| 機能名 | WebApp ⇔ GitHub Actions ⇔ Claude Code 相互同期 |
| 目的 | 承認フローの自動化 |
| 検討日 | 2026-01-19 |
| ステータス | 設計完了（BIDIRECTIONAL_SYNC_SPEC.md） |
| 設計書 | docs/00_common/BIDIRECTIONAL_SYNC_SPEC.md |

### 実装ステップ

- [ ] Phase 1: 承認履歴シート作成、GAS API追加、WebApp UI追加
- [ ] Phase 2: GitHub Actions ワークフロー作成、Discord連携
- [ ] Phase 3: Claude Code連携スクリプト、CLAUDE.md統合

---

## FEATURE-006: 過去トラ分類基準と分類分け

### 概要

| 項目 | 内容 |
|------|------|
| 機能名 | 過去トラブルの分類基準定義 |
| 目的 | 過去トラを体系的に整理し、傾向分析を可能にする |
| 検討日 | 2026-01-19 |
| ステータス | 未実装 |

### 分類案

| 分類 | 説明 |
|------|------|
| 技術的エラー | コード・設定・環境の問題 |
| 仕様違反 | 指示と実装の不一致 |
| コミュニケーション | 確認不足・誤解 |
| プロセス違反 | ルール・手順の違反 |

### 実装ステップ

- [ ] 分類基準の策定
- [ ] 既存過去トラの分類付け
- [ ] TROUBLE_LOG.md フォーマット拡張
- [ ] WebApp分類別統計画面追加

---

## FEATURE-007: 段階的KPI目標管理

### 概要

| 項目 | 内容 |
|------|------|
| 機能名 | 段階的KPI目標（7日→14日→30日→90日） |
| 目的 | 達成可能な目標から段階的に向上 |
| 検討日 | 2026-01-19 |
| ステータス | 設計完了 |

### 目標設定

| 期間 | 0不良日連続 | 再発発生率 | 備考 |
|------|-----------|-----------|------|
| 7日目標 | 7日 | < 20% | 初期目標 |
| 14日目標 | 14日 | < 15% | 2週間目標 |
| 30日目標 | 30日 | < 10% | 1ヶ月目標 |
| 90日目標 | 90日 | < 5% | 最終目標 |

### 実装ステップ

- [ ] KPI目標設定シート作成
- [ ] 目標達成判定ロジック追加
- [ ] 目標達成通知機能追加
- [ ] WebApp目標進捗表示追加

---

## FEATURE-008: 承認設定WebApp表示・GitHub相互同期

### 概要

| 項目 | 内容 |
|------|------|
| 機能名 | Claude Code承認設定のWebApp表示・編集・GitHub同期 |
| 目的 | 自律開発の可視化と設定管理の効率化 |
| 検討日 | 2026-01-19 |
| ステータス | **Phase 1完了（表示機能）** |
| 関連ドキュメント | docs/03_knowledge/CLAUDE_CODE_PERMISSIONS.md |

### 背景

自律開発実現のため、以下が必要：
- 何が自律可能か明確に可視化
- 承認設定の変更をWebAppから実行
- 変更内容をGitHubに自動反映（相互同期）

### 機能要件

#### 1. WebApp表示機能

| 表示項目 | 説明 |
|---------|------|
| 許可済みツール一覧 | Edit, Write, Bash(git:*) 等 |
| 未許可ツール一覧 | rm, sudo 等（意図的） |
| カテゴリ別表示 | Git操作、ファイル操作、npm操作等 |
| 許可理由 | なぜ許可/未許可か |

#### 2. WebApp編集機能

| 機能 | 説明 |
|------|------|
| 許可追加 | 新しいツール/コマンドを許可リストに追加 |
| 許可削除 | 既存の許可を削除 |
| 一括編集 | カテゴリ単位で有効/無効切替 |
| プレビュー | 変更前後の差分表示 |

#### 3. GitHub相互同期

| 方向 | 説明 |
|------|------|
| WebApp → GitHub | WebAppで変更 → settings.local.json更新 → git commit & push |
| GitHub → WebApp | settings.local.json変更検知 → WebApp表示更新 |

### 実装ステップ

- [x] Phase 1: 表示機能（2026-01-19完了）
  - [x] GAS: getPermissionSettings() API（Code.gs:3249-3398）
  - [x] WebApp: 承認設定一覧画面（settings-policyタブ）
  - [x] WebApp: カテゴリ別フィルタ（filterPolicy関数）
  - [x] CSS: policy-badgeスタイル（style.html:2573-2637）

- [ ] Phase 2: 編集機能
  - [ ] WebApp: 許可追加/削除UI
  - [ ] GAS: settings.local.json更新API
  - [ ] WebApp: 変更プレビュー

- [ ] Phase 3: GitHub同期
  - [ ] GAS: GitHub API連携（settings.local.json取得/更新）
  - [ ] GAS: git commit & push 自動実行
  - [ ] WebApp: 同期ステータス表示
  - [ ] Webhook: GitHub変更検知

### 技術設計

#### settings.local.json構造

```json
{
  "permissions": {
    "allow": [
      "Edit",
      "Write",
      "Bash(git:*)",
      ...
    ]
  }
}
```

#### GAS API設計

```javascript
// 承認設定取得
function getPermissionSettings() {
  // GitHub API経由でsettings.local.json取得
  // または ローカルキャッシュ参照
}

// 承認設定更新
function updatePermissionSettings(newSettings) {
  // settings.local.json更新
  // git commit & push
}
```

#### WebApp UI設計

```
┌─────────────────────────────────────────┐
│ 承認設定管理                            │
├─────────────────────────────────────────┤
│ [カテゴリ] ▼ Git操作 | npm | ファイル   │
├─────────────────────────────────────────┤
│ ✅ git add:*      │ 許可 │ [削除]      │
│ ✅ git commit:*   │ 許可 │ [削除]      │
│ ✅ git push:*     │ 許可 │ [削除]      │
│ ...                                     │
├─────────────────────────────────────────┤
│ [+ 新規許可追加]                        │
├─────────────────────────────────────────┤
│ 最終同期: 2026-01-19 15:30 ✅          │
│ [GitHub同期] [変更を保存]              │
└─────────────────────────────────────────┘
```

### コスト評価

| 項目 | コスト | 備考 |
|------|--------|------|
| GitHub API | $0 | 無料枠内 |
| GAS | $0 | 無料枠内 |
| WebApp | $0 | 既存基盤 |
| **合計** | **$0/月** | - |

---

## 更新履歴

| 日時 | 更新者 | 内容 |
|------|--------|------|
| 2026-01-17 | Claude Code | FEATURE-001 初版作成 |
| 2026-01-19 | Claude Code | FEATURE-002〜007 追加（TPS設計レビュー） |
| 2026-01-19 | Claude Code | FEATURE-000 追加（思考プロセス制御システム・最重要最優先） |
| 2026-01-19 | Claude Code | FEATURE-008 追加（承認設定WebApp表示・GitHub相互同期） |
| 2026-01-19 | Claude Code | FEATURE-008 Phase1完了（表示機能実装） |
| 2026-01-19 | Claude Code | FEATURE-000 Phase4-6完了（CLAUDE.md統合・運用開始） |

---

**以上**
