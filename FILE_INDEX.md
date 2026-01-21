# FILE_INDEX.md - ファイル管理インデックス

> **作成日**: 2026-01-17
> **目的**: 全ファイルの場所と役割を一元管理し、把握困難を解消

---

## 1. 必須読了ファイル（セッション開始時）

| ファイル | パス | 役割 |
|---------|------|------|
| CLAUDE.md | /CLAUDE.md | 開発ルール・セッション開始ルール |
| COMMON_RULES.md | /docs/00_common/COMMON_RULES.md | 共通ルール |
| TROUBLE_LOG.md | /docs/01_crm/TROUBLE_LOG.md | 過去トラ記録 |
| PROJECT_SPECIFICATION.md | /PROJECT_SPECIFICATION.md | プロジェクト仕様 |

---

## 2. インデックスファイル一覧

| ファイル | パス | 管理対象 |
|---------|------|----------|
| FILE_INDEX.md | /FILE_INDEX.md | 全ファイル（本ファイル） |
| KNOWLEDGE_INDEX.md | /docs/03_knowledge/KNOWLEDGE_INDEX.md | ナレッジファイル |
| PROJECT_INDEX.md | /docs/00_common/PROJECT_PROPOSALS/PROJECT_INDEX.md | プロジェクト提案 |
| DEV_INDEX.md | /docs/02_development/DEV_RECORDS/DEV_INDEX.md | 開発記録 |

---

## 3. ルートファイル

| ファイル | 役割 |
|---------|------|
| CLAUDE.md | 開発ルール・セッション開始ルール |
| PROJECT_SPECIFICATION.md | プロジェクト全体仕様 |
| README.md | プロジェクト概要 |

---

## 4. docs/00_common（共通）

### 4.1 ルール・ポリシー

| ファイル | 役割 |
|---------|------|
| COMMON_RULES.md | 共通ルール |
| API_USAGE_POLICY.md | API使用ポリシー |
| UI_UX_GUIDELINES.md | UI/UXガイドライン |

### 4.2 エージェント仕様

| ファイル | 役割 |
|---------|------|
| AI_AGENT_ARCHITECTURE.md | エージェントアーキテクチャ |
| AGENT_CHARACTER_SPEC.md | キャラクター仕様（39名） |
| AGENT_PERSONALITY_SPEC.md | 性格仕様 |
| AGENT_SKILL_SPEC.md | スキル仕様 |
| AGENT_TEAMWORK_SPEC.md | チームワーク仕様 |
| AGENT_COOPERATION_SPEC.md | 協力仕様 |
| AGENT_COMMUNICATION_PROTOCOL.md | コミュニケーションプロトコル |
| AGENT_PERFORMANCE_SPEC.md | パフォーマンス仕様 |

### 4.3 ガイド・手順

| ファイル | 役割 |
|---------|------|
| GAS_WEBAPP_GUIDE.md | GAS Webアプリガイド |
| THREE_ENVIRONMENT_SETUP.md | 3環境セットアップ |
| HUMAN_TASK_3ENV_SETUP.md | Human向け3環境タスク |
| TROUBLESHOOTING.md | トラブルシューティング |
| AUTONOMOUS_DEV_FOUNDATION.md | 自律開発基盤 |

### 4.4 ログ・記録

| ファイル | 役割 |
|---------|------|
| IMPROVEMENT_LOG.md | 改善ログ |
| PMO_SESSION_LOG.md | PMOセッションログ |

### 4.5 その他仕様

| ファイル | 役割 |
|---------|------|
| DATA_COLLECTION_SPEC.md | データ収集仕様 |
| TOOL_INVENTORY.md | ツール一覧 |
| FUTURE_FEATURES.md | 未実装機能一覧 |
| BIDIRECTIONAL_SYNC_SPEC.md | 相互同期設計書 |
| TPS_DESIGN_PHILOSOPHY.md | TPS設計思想 |

### 4.6 THINKING_PROCESS（思考プロセス制御）

| ファイル/フォルダ | 役割 |
|------------------|------|
| SPEC.md | **仕様書（変更時は必ず更新）** |
| feedback/ | フィードバック（私がミスした） |
| feedback/normal/ | 通常案件 |
| feedback/recurrence/ | 再発案件 |
| question/ | 質問（私の説明不足） |
| question/normal/ | 通常案件 |
| question/recurrence/ | 再発案件 |
| instruction/ | 指示（私の自発性不足） |
| instruction/normal/ | 通常案件 |
| instruction/recurrence/ | 再発案件 |
| confirmation/ | 確認（私の報告不明確） |
| confirmation/normal/ | 通常案件 |
| confirmation/recurrence/ | 再発案件 |
| SUMMARY.md | 全カテゴリサマリー |
| QUIZ.md | 読了確認クイズ |
| CONVERSATION_LOG.md | 会話ログ（ユニークID付き） |

### 4.7 PROJECT_PROPOSALS（プロジェクト提案）

| ファイル | 役割 |
|---------|------|
| PROJECT_INDEX.md | 提案インデックス |
| DISC-042_WEB_INFO_COLLECTION.md | Web情報収集提案（未実装） |
| DISC-043_BROWSER_AUTOMATION_SYSTEM.md | ブラウザ自動化提案（未実装） |

※完了済み提案（DISC-035, 036, 037, 044, 045, 046）は `docs/archive/` に移動

---

## 5. docs/01_crm（CRMプロジェクト）

### 5.1 仕様書

| ファイル | 役割 |
|---------|------|
| SPEC.md | CRM仕様書（メイン） |
| BUDDY_SPEC.md | Buddy機能仕様 |
| ALERT_SYSTEM_SPEC.md | アラートシステム仕様 |
| STAFF_CARD_SPEC.md | スタッフカード仕様 |
| DEPENDENCY_UI_SPEC.md | 依存関係UI仕様 |
| REPORT_TEMPLATE_SPEC.md | レポートテンプレート仕様 |

### 5.2 ログ・記録

| ファイル | 役割 |
|---------|------|
| TROUBLE_LOG.md | 過去トラ記録 |
| DEVELOPMENT_LOG.md | 開発ログ |
| BUG_FIX_LOG.md | バグ修正ログ |
| CHANGELOG.md | 変更履歴 |
| BUDDY_LOG.md | Buddyログ |

### 5.3 計画・タスク

| ファイル | 役割 |
|---------|------|
| PROJECT_MASTER.md | プロジェクトマスター |
| PHASE_A_IMPLEMENTATION_PLAN.md | フェーズA実装計画 |
| PENDING_TASKS.md | 保留タスク |
| DEVELOPMENT_CHECKLIST.md | 開発チェックリスト |

### 5.4 その他

| ファイル | 役割 |
|---------|------|
| API_REFERENCE.md | APIリファレンス |
| BUSINESS_CONTEXT.md | ビジネスコンテキスト |

※SHEET_MIGRATION.md, ARCHIVE_HTML.md は `docs/archive/` に移動

---

## 6. docs/02_development（開発記録）

| ファイル | 役割 |
|---------|------|
| DEV_INDEX.md | 開発記録インデックス |

※DEV-0001_GEMINI_CHAT は `docs/archive/` に移動

---

## 7. docs/02_transaction（取引管理）

| ファイル | 役割 |
|---------|------|
| TRANSACTION_MANAGEMENT_SPEC.md | 取引管理仕様 |

---

## 8. docs/03_inventory（在庫管理）

| ファイル | 役割 |
|---------|------|
| INVENTORY_MANAGEMENT_SPEC.md | 在庫管理仕様 |

---

## 9. docs/03_knowledge（ナレッジ）

### 9.1 インデックス

| ファイル | 役割 |
|---------|------|
| KNOWLEDGE_INDEX.md | ナレッジインデックス |

### 9.2 フロントエンド（3名）

| ファイル | メンバー |
|---------|----------|
| frontend/BUDDY_KNOWLEDGE.md | Buddy |
| frontend/TRAN_KNOWLEDGE.md | Tran |
| frontend/ANA_KNOWLEDGE.md | Ana |

### 9.3 専門家（16名）

| ファイル | メンバー |
|---------|----------|
| specialist/KOKORO_SHINRI_KNOWLEDGE.md | Kokoro Shinri（心理学） |
| specialist/NOU_SHIRASE_KNOWLEDGE.md | Nou Shirase（脳科学） |
| specialist/NINCHI_MANABI_KNOWLEDGE.md | Ninchi Manabi（認知科学） |
| specialist/MICHIBIKI_SODACHI_KNOWLEDGE.md | Michibiki Sodachi（コーチング） |
| specialist/KANRI_MATOMERU_KNOWLEDGE.md | Kanri Matomeru（マネジメント） |
| specialist/SUJI_YOMU_KNOWLEDGE.md | Suji Yomu（分析） |
| specialist/EIKYO_URITE_KNOWLEDGE.md | Eikyo Urite（トップセールス） |
| specialist/KAIHATSU_TSUKURU_KNOWLEDGE.md | Kaihatsu Tsukuru（システム開発） |
| specialist/KARADA_YASUSHI_KNOWLEDGE.md | Karada Yasushi（人間工学） |
| specialist/KATACHI_EGAKU_KNOWLEDGE.md | Katachi Egaku（デザイン） |
| specialist/KOTOBA_TODOKU_KNOWLEDGE.md | Kotoba Todoku（伝え方） |
| specialist/MATOME_TSUTAERU_KNOWLEDGE.md | Matome Tsutaeru（レポート） |
| specialist/KAIZEN_SUSUMU_KNOWLEDGE.md | Kaizen Susumu（改善） |
| specialist/MAMORI_UNYO_KNOWLEDGE.md | Mamori Unyo（保守運用） |
| specialist/CHISHIKI_TAKUWAERU_KNOWLEDGE.md | Chishiki Takuwaeru（ナレッジ管理） |
| specialist/TANOSHII_MORIAGGERU_KNOWLEDGE.md | Tanoshii Moriaggeru（エンタメ） |

### 9.4 バランサー（4名）

| ファイル | メンバー |
|---------|----------|
| balancer/HIKARI_NOZOMU_KNOWLEDGE.md | Hikari Nozomu（ポジティブ） |
| balancer/KAGE_TSUTSUKU_KNOWLEDGE.md | Kage Tsutsuku（Devil's Advocate） |
| balancer/DARUI_HONNE_KNOWLEDGE.md | Darui Honne（サボり視点） |
| balancer/KYAKU_KOE_KNOWLEDGE.md | Kyaku Koe（顧客視点） |

### 9.5 ガバナンス（3名）

| ファイル | メンバー |
|---------|----------|
| governance/TADASHI_RINRI_KNOWLEDGE.md | Tadashi Rinri（倫理） |
| governance/MAMORI_HOUKI_KNOWLEDGE.md | Mamori Houki（法務） |
| governance/YASUMU_KOKORO_KNOWLEDGE.md | Yasumu Kokoro（メンタルヘルス） |

### 9.6 経営（12名）

| ファイル | メンバー |
|---------|----------|
| executive/MICHIBIKI_KESSAI_KNOWLEDGE.md | Michibiki Kessai（CEO） |
| executive/SENRYAKU_EGAKU_KNOWLEDGE.md | Senryaku Egaku（CSO） |
| executive/KANE_MAMORU_KNOWLEDGE.md | Kane Mamoru（CFO） |
| executive/HITO_SODATERU_KNOWLEDGE.md | Hito Sodateru（CHRO） |
| executive/SHIJO_HIRAKU_KNOWLEDGE.md | Shijo Hiraku（CMO） |
| executive/GIJUTSU_KIWAMERU_KNOWLEDGE.md | Gijutsu Kiwameru（CTO） |
| executive/MAMORI_TATE_KNOWLEDGE.md | Mamori Tate（CISO） |
| executive/UNYO_MAWASU_KNOWLEDGE.md | Unyo Mawasu（COO） |
| executive/UCHI_MIRU_KNOWLEDGE.md | Uchi Miru（社内監査役） |
| executive/SOTO_MIRU_KNOWLEDGE.md | Soto Miru（第三者監査役） |
| executive/SHIRUSHI_KATARU_KNOWLEDGE.md | Shirushi Kataru（ブランディング） |
| executive/SAGASU_MAKOTO_KNOWLEDGE.md | Sagasu Makoto（調査） |

---

## 10. crm-dashboard（CRMダッシュボード）

| ファイル | 役割 |
|---------|------|
| CLAUDE.md | ダッシュボード固有ルール |
| README.md | ダッシュボード概要 |

※DISC-023_DISCUSSION_COUNT_ANALYSIS.md は `docs/archive/` に移動

---

## 11. その他プロジェクト

### crm-dashboard-dev

| ファイル | 役割 |
|---------|------|
| CLAUDE.md | 開発環境固有ルール |

### crm-dashboard-prop

| ファイル | 役割 |
|---------|------|
| CLAUDE.md | 提案環境固有ルール |

### gemini-chat

| ファイル | 役割 |
|---------|------|
| CLAUDE.md | Gemini Chat固有ルール |

---

## 12. docs/archive（アーカイブ）

完了済み・不要なファイルを保管。通常は参照不要。

| ファイル | 元の場所 | 理由 |
|---------|----------|------|
| DISC-035_3ENVIRONMENT_SYSTEM.md | PROJECT_PROPOSALS | 完了済み |
| DISC-036_GEMINI_LEARNING_ENV.md | PROJECT_PROPOSALS | 完了済み |
| DISC-037_PROJECT_REMINDER.md | PROJECT_PROPOSALS | 完了済み |
| DISC-044_MINIMUM_CONFIGURATION_PRINCIPLE.md | PROJECT_PROPOSALS | 完了済み |
| DISC-045_CREATIVE_OPTIMIZATION_PRINCIPLES.md | PROJECT_PROPOSALS | 完了済み |
| DISC-046_REAL_TEAM_GROWTH.md | PROJECT_PROPOSALS | 完了済み |
| DISC-023_DISCUSSION_COUNT_ANALYSIS.md | crm-dashboard/reports | 完了済み |
| DEV-0001_GEMINI_CHAT/ | docs/02_development | 完了済み |
| ARCHIVE_HTML.md | docs/01_crm | バックアップ完了 |
| SHEET_MIGRATION.md | docs/01_crm | 移行完了 |

---

## 13. ファイル検索ガイド

| 探したいもの | 参照先 |
|-------------|--------|
| ルール・ポリシー | docs/00_common/ |
| エージェント仕様 | docs/00_common/AGENT_*.md |
| CRM仕様 | docs/01_crm/SPEC.md |
| 過去トラ | docs/01_crm/TROUBLE_LOG.md |
| ナレッジ | docs/03_knowledge/ |
| 未実装機能 | docs/00_common/FUTURE_FEATURES.md |
| プロジェクト提案 | docs/00_common/PROJECT_PROPOSALS/ |

---

## 14. 運用ルール

### 13.1 新規ファイル作成時

1. 本ファイル（FILE_INDEX.md）に追記
2. 該当するインデックスファイルがあれば更新

### 13.2 ファイル削除時

1. 本ファイルから削除
2. 該当するインデックスファイルから削除

### 13.3 メンテナンス

| タイミング | 内容 |
|-----------|------|
| ファイル作成時 | 即時追記 |
| ファイル削除時 | 即時削除 |
| 月次 | 全体整合性チェック |

---

## 統計

| 項目 | 数 | 変更 |
|------|-----|------|
| 総ファイル数 | 93 | +5 |
| ルート | 3 | - |
| docs/00_common | 26 | +5 |
| docs/01_crm | 17 | - |
| docs/02_development | 1 | - |
| docs/02_transaction | 1 | - |
| docs/03_inventory | 1 | - |
| docs/03_knowledge | 39 | - |
| docs/archive | 10 | - |
| crm-dashboard | 2 | - |
| その他 | 3 | - |

**Phase 1実行**: 2026-01-17（10ファイルをアーカイブ）
**THINKING_PROCESS追加**: 2026-01-19（3ファイル追加）

---

**以上**
