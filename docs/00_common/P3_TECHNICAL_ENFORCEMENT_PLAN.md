# P3計画: ドキュメントのみポカヨケの技術的強制化

**作成日**: 2026-01-20
**作成者**: Claude Code
**目的**: 憲法第2条・第3条準拠（全ポカヨケに技術的強制力を付与）

---

## 事実

### 1. 現状分析

| 分類 | 件数 | 割合 |
|------|:----:|:----:|
| 技術的強制力あり | 15件 | 25.4% |
| ドキュメントのみ | 44件 | 74.6% |
| **合計** | **59件** | 100% |

### 2. 技術的強制力ありのポカヨケ（15件）

| # | TROUBLE | 強制メカニズム |
|---|---------|--------------|
| 1 | TROUBLE-058 | pre-commit hook, Branch Protection |
| 2 | TROUBLE-059 | session-end-check.sh, pre-commit hook |
| 3 | 思考プロセス制御（THINK） | thinking_gate.py, session_gate.py |
| 4 | 憲法第3条 | enforcement_validator.py |
| 5 | 必須ファイル読了 | read_enforcer.py |
| 6 | 出力形式検証 | output_validator.py |
| 7 | 省略読み禁止 | read_enforcer.py |
| 8 | セッション開始ルール | session_gate.py |
| 9 | GAS環境同期 | GitHub Actions pokayoke-check.yml |
| 10 | LockService強制 | GitHub Actions pokayoke-check.yml |
| 11 | API整合性 | npm run check |
| 12 | コミットメッセージ形式 | pre-commit hook |
| 13 | テスト環境検証 | scripts/verify-3env.sh |
| 14 | 過去トラ記録 | pre-commit hook |
| 15 | 監査済みフラグ | GitHub Actions |

### 3. ドキュメントのみポカヨケ（44件）- カテゴリ分類

#### カテゴリA: コミュニケーション関連（12件）

| # | Section | 内容 | 技術的強制化案 |
|---|---------|------|--------------|
| 1 | Section 26 | 報告前チェック | output_validator.py拡張 |
| 2 | Section 26 | 提案前チェック | output_validator.py拡張 |
| 3 | Section 26 | 説明品質チェック | output_validator.py拡張 |
| 4 | Section 26 | 議論中チェック | output_validator.py拡張 |
| 5 | Section 29 | PREP形式強制 | output_validator.py拡張 |
| 6 | Section 41 | 説明ルール（比喩必須） | output_validator.py拡張 |
| 7 | Section 43 | レポート形式3層構造 | output_validator.py拡張 |
| 8 | Section 44 | 要件確認5W2H | 新規Hook作成 |
| 9 | Section 45 | KPIレポート自動生成 | session-end-check.sh拡張 |
| 10 | Section 50 | 手順説明フォーマット | output_validator.py拡張 |
| 11 | Section 51 | 質問前調査強制 | 新規Hook作成 |
| 12 | Section 53 | 設定値自動設定 | enforcement_validator.py拡張 |

#### カテゴリB: 実装チェック関連（10件）

| # | Section | 内容 | 技術的強制化案 |
|---|---------|------|--------------|
| 1 | Section 16 | タスク完了判定 | pre-commit hook拡張 |
| 2 | Section 20 | UI/コード実装チェック | GitHub Actions |
| 3 | Section 21 | ルール設計チェック | enforcement_validator.py拡張 |
| 4 | Section 23 | 初回公開設定手順 | 新規Hook作成 |
| 5 | Section 24 | エラー発生時報告 | error_reporter.py新規作成 |
| 6 | Section 25 | 未完了タスク引き継ぎ | session-end-check.sh拡張 |
| 7 | Section 38 | 依頼内容完遂確認 | pre-commit hook拡張 |
| 8 | Section 39 | 証拠・数値根拠必須 | output_validator.py拡張 |
| 9 | Section 52 | Google URL authuser | url_validator.py新規作成 |
| 10 | Section 54 | clasp run前提条件 | clasp_validator.py新規作成 |

#### カテゴリC: プロセス関連（10件）

| # | Section | 内容 | 技術的強制化案 |
|---|---------|------|--------------|
| 1 | Section 14 | clasp/GAS可能操作リスト | 情報提供のみ（強制不要） |
| 2 | Section 15 | ポカヨケ設置報告フォーマット | enforcement_validator.py拡張 |
| 3 | Section 18 | 新規工程ポカヨケテスト | new_process_gate.py新規作成 |
| 4 | Section 19 | 環境設定記録 | config_logger.py新規作成 |
| 5 | Section 27 | ポカヨケ設置フロー | enforcement_validator.py拡張 |
| 6 | Section 28 | 新規プロジェクト開始チェック | project_init_gate.py新規作成 |
| 7 | Section 30 | ポカヨケ設置時のポカヨケ | enforcement_validator.py（実装済み） |
| 8 | Section 31 | 全工程2極化モデル | GitHub Actions |
| 9 | Section 32 | 無限ループ防止 | loop_detector.py新規作成 |
| 10 | Section 33 | 監査役判定基準 | Gemini監査プロンプト標準化 |

#### カテゴリD: 監査関連（7件）

| # | Section | 内容 | 技術的強制化案 |
|---|---------|------|--------------|
| 1 | Section 10 | Gemini監査体制 | GitHub Actions |
| 2 | Section 34 | 基準明確化義務 | enforcement_validator.py拡張 |
| 3 | Section 35 | Gemini監査情報提供 | gemini_prompt_validator.py新規作成 |
| 4 | Section 36 | 突破テスト5観点 | gemini_prompt_validator.py |
| 5 | Section 37 | Gemini監査プロンプト標準化 | gemini_prompt_validator.py |
| 6 | Section 40 | Gemini監査検証ルール | gemini_result_validator.py新規作成 |
| 7 | Section 42 | 自律型不具合対応システム | defect_handler.py新規作成 |

#### カテゴリE: その他（5件）

| # | Section | 内容 | 技術的強制化案 |
|---|---------|------|--------------|
| 1 | Section 4 | 禁止事項 | 各種Hookに分散実装 |
| 2 | Section 17 | テーブル描画ルール | output_validator.py拡張 |
| 3 | Section 22 | ファイル管理ルール | file_index_validator.py新規作成 |
| 4 | Section 46 | 3環境システム標準化 | env_validator.py新規作成 |
| 5 | Section 47 | 統合ダッシュボード | dashboard_recorder.py新規作成 |

---

## 不確実性

### 1. 技術的制約

| 制約 | 影響 | 対策案 |
|------|------|--------|
| Claude Code出力の検証困難 | 出力形式の強制が限定的 | PostToolUseで出力内容を検証 |
| Gemini応答の自動検証困難 | 監査結果の品質保証が手動依存 | パターンマッチで最低限の検証 |
| 複雑なロジックのHook化 | 開発・メンテナンスコスト増 | シンプルな検証に限定 |

### 2. 優先度判定の不確実性

| 観点 | 考慮事項 |
|------|---------|
| 再発頻度 | 過去の再発データが限定的 |
| 影響度 | 定量的な影響測定が困難 |
| 実装コスト | 各Hookの開発工数が不明確 |

---

## 結果

### 1. 実装計画（フェーズ分け）

#### Phase 1: 既存Hook拡張（低コスト・高効果）- 2週間

| # | 対象Hook | 拡張内容 | 対象Section |
|---|---------|---------|-------------|
| 1 | output_validator.py | PREP形式検証、3層構造検証 | 26, 29, 43 |
| 2 | enforcement_validator.py | ポカヨケ設置フォーマット検証 | 15, 27, 34 |
| 3 | session-end-check.sh | 未完了タスク引き継ぎ検証 | 25, 45 |
| 4 | pre-commit hook | タスク完了判定、依頼完遂確認 | 16, 38 |

#### Phase 2: 新規Hook作成（中コスト・中効果）- 4週間

| # | 新規Hook | 用途 | 対象Section |
|---|---------|------|-------------|
| 1 | url_validator.py | Google URL authuser検証 | 52 |
| 2 | gemini_prompt_validator.py | Gemini監査プロンプト検証 | 35, 36, 37 |
| 3 | error_reporter.py | エラー発生時強制通知 | 24, 48 |
| 4 | new_process_gate.py | 新規工程開始時チェック | 18, 28 |
| 5 | config_logger.py | 環境設定自動記録 | 19, 53 |

#### Phase 3: 高度な検証（高コスト・高効果）- 6週間

| # | 新規Hook | 用途 | 対象Section |
|---|---------|------|-------------|
| 1 | gemini_result_validator.py | Gemini応答検証 | 40 |
| 2 | loop_detector.py | 無限ループ検出・停止 | 32 |
| 3 | defect_handler.py | 自律型不具合対応 | 42 |
| 4 | dashboard_recorder.py | KPI自動記録 | 47 |

#### Phase 4: 情報提供系（強制不要・ドキュメント維持）

| # | Section | 理由 |
|---|---------|------|
| 1 | Section 14 | clasp可能操作リストは参照用情報 |
| 2 | Section 46 | 3環境システムは設計指針 |
| 3 | Section 54 | clasp run前提条件は設定情報 |

### 2. 実装優先度

| 優先度 | Phase | 対象数 | 効果 |
|:------:|:-----:|:------:|------|
| P1 | Phase 1 | 4件 | 即効性高（既存Hook拡張のみ） |
| P2 | Phase 2 | 5件 | 中期効果（新規Hook少数） |
| P3 | Phase 3 | 4件 | 長期効果（高度な検証） |
| P4 | Phase 4 | 3件 | 強制不要（ドキュメント維持） |

### 3. 目標KPI

| 指標 | 現状 | Phase 1後 | Phase 2後 | Phase 3後 |
|------|:----:|:---------:|:---------:|:---------:|
| 技術的強制力保有率 | 25.4% | 45% | 70% | 95% |
| 再発率 | 5.1%（3/59） | 3% | 1% | 0% |

### 4. 次のアクション

1. Phase 1実装開始（output_validator.py拡張から）
2. P4計画（Section 30改修）との統合
3. 各Phase完了時にKPI測定・報告

---

**以上**
