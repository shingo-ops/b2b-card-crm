# ルール・ログ・定義ファイル一覧

**作成日**: 2026-01-18
**目的**: 後世に残すべきルール、ログ、定義ファイルの索引

---

## 1. メインルールファイル（最重要）

| ファイル | パス | 内容 |
|---------|------|------|
| CLAUDE.md | /CLAUDE.md | 全体の開発ルール・制約 |
| COMMON_RULES.md | docs/00_common/COMMON_RULES.md | 共通ルール |
| env-config.json | environments/env-config.json | 3環境システム設定 |

---

## 2. プロジェクト別CLAUDE.md

| プロジェクト | パス | 用途 |
|-------------|------|------|
| CRM本番 | crm-dashboard/CLAUDE.md | 本番環境ルール |
| CRM開発 | crm-dashboard-dev/CLAUDE.md | 開発環境ルール |
| CRM提案 | crm-dashboard-prop/CLAUDE.md | 提案環境ルール |
| Gemini Chat | gemini-chat/CLAUDE.md | Geminiチャット環境 |

---

## 3. 過去トラ・ポカヨケ（PROCESS_QUALITY）

### 3.1 工程別TROUBLE_LOG

| 工程 | パス |
|------|------|
| 共通 | docs/00_common/PROCESS_QUALITY/00_COMMON/TROUBLE_LOG.md |
| 仕様 | docs/00_common/PROCESS_QUALITY/01_SPEC/TROUBLE_LOG.md |
| スプレッドシート | docs/00_common/PROCESS_QUALITY/02_SPREADSHEET/TROUBLE_LOG.md |
| GASエディタ | docs/00_common/PROCESS_QUALITY/03_GAS_EDITOR/TROUBLE_LOG.md |
| WebApp | docs/00_common/PROCESS_QUALITY/04_WEBAPP/TROUBLE_LOG.md |
| ローカルデータ | docs/00_common/PROCESS_QUALITY/05_LOCAL_DATA/TROUBLE_LOG.md |
| GitHub | docs/00_common/PROCESS_QUALITY/06_GITHUB/TROUBLE_LOG.md |
| Gemini監査 | docs/00_common/PROCESS_QUALITY/07_GEMINI_AUDIT/TROUBLE_LOG.md |
| GitHub Actions | docs/00_common/PROCESS_QUALITY/08_GITHUB_ACTIONS/TROUBLE_LOG.md |
| ポカヨケ | docs/00_common/PROCESS_QUALITY/09_POKAYOKE/TROUBLE_LOG.md |
| 過去トラログ | docs/00_common/PROCESS_QUALITY/10_TROUBLE_LOG/TROUBLE_LOG.md |

### 3.2 工程別POKAYOKE

| 工程 | パス |
|------|------|
| 共通 | docs/00_common/PROCESS_QUALITY/00_COMMON/POKAYOKE.md |
| 仕様 | docs/00_common/PROCESS_QUALITY/01_SPEC/POKAYOKE.md |
| スプレッドシート | docs/00_common/PROCESS_QUALITY/02_SPREADSHEET/POKAYOKE.md |
| GASエディタ | docs/00_common/PROCESS_QUALITY/03_GAS_EDITOR/POKAYOKE.md |
| WebApp | docs/00_common/PROCESS_QUALITY/04_WEBAPP/POKAYOKE.md |
| ローカルデータ | docs/00_common/PROCESS_QUALITY/05_LOCAL_DATA/POKAYOKE.md |
| GitHub | docs/00_common/PROCESS_QUALITY/06_GITHUB/POKAYOKE.md |
| Gemini監査 | docs/00_common/PROCESS_QUALITY/07_GEMINI_AUDIT/POKAYOKE.md |
| GitHub Actions | docs/00_common/PROCESS_QUALITY/08_GITHUB_ACTIONS/POKAYOKE.md |
| ポカヨケ | docs/00_common/PROCESS_QUALITY/09_POKAYOKE/POKAYOKE.md |
| 過去トラログ | docs/00_common/PROCESS_QUALITY/10_TROUBLE_LOG/POKAYOKE.md |

### 3.3 統合過去トラログ

| ファイル | パス | 内容 |
|---------|------|------|
| TROUBLE_LOG.md | docs/01_crm/TROUBLE_LOG.md | CRMプロジェクトの過去トラ統合ログ |
| POKAYOKE_LOOPHOLES_ANALYSIS.md | docs/00_common/POKAYOKE_LOOPHOLES_ANALYSIS.md | ポカヨケ抜け穴分析 |

---

## 4. 仕様書

| ファイル | パス | 内容 |
|---------|------|------|
| SPEC.md | docs/01_crm/SPEC.md | CRM仕様書 |
| BUDDY_SPEC.md | docs/01_crm/BUDDY_SPEC.md | Buddy機能仕様 |
| STAFF_CARD_SPEC.md | docs/01_crm/STAFF_CARD_SPEC.md | スタッフカード仕様 |
| ALERT_SYSTEM_SPEC.md | docs/01_crm/ALERT_SYSTEM_SPEC.md | アラートシステム仕様 |
| REPORT_TEMPLATE_SPEC.md | docs/01_crm/REPORT_TEMPLATE_SPEC.md | レポートテンプレート仕様 |
| DEPENDENCY_UI_SPEC.md | docs/01_crm/DEPENDENCY_UI_SPEC.md | 依存関係UI仕様 |
| API_REFERENCE.md | docs/01_crm/API_REFERENCE.md | API参照 |

---

## 5. 開発ログ

| ファイル | パス | 内容 |
|---------|------|------|
| DEVELOPMENT_LOG.md | docs/01_crm/DEVELOPMENT_LOG.md | 開発ログ |
| BUG_FIX_LOG.md | docs/01_crm/BUG_FIX_LOG.md | バグ修正ログ |
| BUDDY_LOG.md | docs/01_crm/BUDDY_LOG.md | Buddy開発ログ |
| CHANGELOG.md | docs/01_crm/CHANGELOG.md | 変更履歴 |
| IMPROVEMENT_LOG.md | docs/00_common/IMPROVEMENT_LOG.md | 改善ログ |
| PMO_SESSION_LOG.md | docs/00_common/PMO_SESSION_LOG.md | PMOセッションログ |

---

## 6. ガイドライン・ポリシー

| ファイル | パス | 内容 |
|---------|------|------|
| UI_UX_GUIDELINES.md | docs/00_common/UI_UX_GUIDELINES.md | UI/UXガイドライン |
| API_USAGE_POLICY.md | docs/00_common/API_USAGE_POLICY.md | API使用ポリシー |
| GAS_WEBAPP_GUIDE.md | docs/00_common/GAS_WEBAPP_GUIDE.md | GAS WebAppガイド |
| TROUBLESHOOTING.md | docs/00_common/TROUBLESHOOTING.md | トラブルシューティング |

---

## 7. エージェント仕様

| ファイル | パス | 内容 |
|---------|------|------|
| AGENT_COMMUNICATION_PROTOCOL.md | docs/00_common/AGENT_COMMUNICATION_PROTOCOL.md | 通信プロトコル |
| AGENT_PERSONALITY_SPEC.md | docs/00_common/AGENT_PERSONALITY_SPEC.md | 性格仕様 |
| AGENT_PERFORMANCE_SPEC.md | docs/00_common/AGENT_PERFORMANCE_SPEC.md | パフォーマンス仕様 |
| AGENT_SKILL_SPEC.md | docs/00_common/AGENT_SKILL_SPEC.md | スキル仕様 |
| AGENT_TEAMWORK_SPEC.md | docs/00_common/AGENT_TEAMWORK_SPEC.md | チームワーク仕様 |
| AGENT_COOPERATION_SPEC.md | docs/00_common/AGENT_COOPERATION_SPEC.md | 協力仕様 |
| AGENT_CHARACTER_SPEC.md | docs/00_common/AGENT_CHARACTER_SPEC.md | キャラクター仕様 |
| AI_AGENT_ARCHITECTURE.md | docs/00_common/AI_AGENT_ARCHITECTURE.md | アーキテクチャ |

---

## 8. ナレッジベース

docs/03_knowledge/ 配下に以下のカテゴリで整理：

| カテゴリ | パス | 内容 |
|---------|------|------|
| frontend | docs/03_knowledge/frontend/ | フロントエンド担当 |
| specialist | docs/03_knowledge/specialist/ | 専門家担当 |
| balancer | docs/03_knowledge/balancer/ | バランサー担当 |
| governance | docs/03_knowledge/governance/ | ガバナンス担当 |
| executive | docs/03_knowledge/executive/ | エグゼクティブ担当 |

---

## 9. 環境設定・セットアップ

| ファイル | パス | 内容 |
|---------|------|------|
| THREE_ENVIRONMENT_SETUP.md | docs/00_common/THREE_ENVIRONMENT_SETUP.md | 3環境システムセットアップ |
| HUMAN_TASK_3ENV_SETUP.md | docs/00_common/HUMAN_TASK_3ENV_SETUP.md | 人間タスク（3環境） |
| AUTONOMOUS_DEV_FOUNDATION.md | docs/00_common/AUTONOMOUS_DEV_FOUNDATION.md | 自律開発基盤 |

---

## 10. インデックス・管理

| ファイル | パス | 内容 |
|---------|------|------|
| FILE_INDEX.md | /FILE_INDEX.md | ファイルインデックス |
| PROJECT_INDEX.md | docs/00_common/PROJECT_PROPOSALS/PROJECT_INDEX.md | プロジェクトインデックス |
| KNOWLEDGE_INDEX.md | docs/03_knowledge/KNOWLEDGE_INDEX.md | ナレッジインデックス |
| FUTURE_FEATURES.md | docs/00_common/FUTURE_FEATURES.md | 未実装機能一覧 |

---

## 11. アーカイブ（参考）

docs/archive/ 配下に移動済みのファイル（過去の議論・検討資料）

---

**以上**
