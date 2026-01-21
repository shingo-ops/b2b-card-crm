# DATA_COLLECTION_SPEC.md - データ収集フロー詳細設計書

> **バージョン**: v1.0.0
> **作成日時**: 2026-01-15
> **作成者**: Human + Claude Code
> **親ドキュメント**: AI_AGENT_ARCHITECTURE.md
> **ステータス**: 設計中

---

## 1. ドキュメント定義（5W2H）

| 項目 | 内容 |
|------|------|
| **いつ** | 2026-01-15 アーキテクチャ設計に基づき作成 |
| **誰が** | Claude Code（AI_AGENT_ARCHITECTURE.md Section 3.2を詳細化） |
| **どこで** | 3アプリ間（診断→教育→CRM）のデータ連携 |
| **何を** | 個人プロファイル構築のためのデータ収集仕様 |
| **どうやって** | 各フェーズで収集→スプレッドシートDB統合 |
| **なぜ** | 相手本位実現のための個人データ基盤構築 |
| **どれぐらい** | 6カテゴリ、約50データ項目 |

---

## 2. 収集フェーズ概要

```
┌─────────────────────────────────────────────────────────────────┐
│                   データ収集フェーズ                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Phase 1: 診断         Phase 2: 教育         Phase 3: CRM      │
│   ┌────────────┐       ┌────────────┐       ┌────────────┐     │
│   │ 性格診断   │──────▶│ 学習記録   │──────▶│ 業務記録   │     │
│   │ 適性診断   │       │ 会話ログ   │       │ 会話ログ   │     │
│   │ 価値観診断 │       │ 進捗データ │       │ 成績データ │     │
│   └────────────┘       └────────────┘       └────────────┘     │
│         │                    │                    │             │
│         └────────────────────┴────────────────────┘             │
│                              │                                  │
│                              ▼                                  │
│                   ┌─────────────────────┐                       │
│                   │   個人プロファイル   │                       │
│                   │       統合DB         │                       │
│                   └─────────────────────┘                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Phase 1: 診断アプリ データ収集

### 3.1 収集データ一覧

| カテゴリ | データ項目 | データ型 | 収集方法 | 必須 |
|---------|-----------|---------|---------|------|
| **性格診断** | personality_type | String | 診断結果 | ○ |
| | extroversion_score | Number (0-100) | 診断結果 | ○ |
| | openness_score | Number (0-100) | 診断結果 | ○ |
| | agreeableness_score | Number (0-100) | 診断結果 | ○ |
| | conscientiousness_score | Number (0-100) | 診断結果 | ○ |
| | neuroticism_score | Number (0-100) | 診断結果 | ○ |
| **適性診断** | sales_aptitude_score | Number (0-100) | 診断結果 | ○ |
| | communication_aptitude | Number (0-100) | 診断結果 | ○ |
| | resilience_score | Number (0-100) | 診断結果 | ○ |
| | goal_orientation_score | Number (0-100) | 診断結果 | ○ |
| **価値観診断** | motivation_type | String | 診断結果 | ○ |
| | recognition_preference | Enum | 選択回答 | ○ |
| | growth_orientation | Number (0-100) | 診断結果 | ○ |
| | autonomy_preference | Number (0-100) | 診断結果 | ○ |
| **行動データ** | completion_time | Number (分) | 自動計測 | ○ |
| | answer_consistency | Number (0-100) | 自動算出 | ○ |
| | hesitation_points | Array | 自動計測 | - |

### 3.2 認識選好タイプ（recognition_preference）定義

| タイプ | 定義 | 効果的アプローチ |
|--------|------|-----------------|
| **PUBLIC** | 公の場での称賛を好む | チーム内での表彰、ランキング公開 |
| **PRIVATE** | 個別の称賛を好む | 1on1でのフィードバック、Buddy直接メッセージ |
| **ACHIEVEMENT** | 成果への称賛を好む | 数値・結果への言及 |
| **EFFORT** | 努力への称賛を好む | プロセス・行動への言及 |
| **PEER** | 同僚からの認められを重視 | チームメンバーからのコメント機能 |

### 3.3 データ出力フォーマット

```json
{
  "diagnostic_id": "DIAG-2026-01-001",
  "user_email": "tanaka@example.com",
  "completed_at": "2026-01-15T10:30:00Z",
  "personality": {
    "type": "ENTJ",
    "scores": {
      "extroversion": 75,
      "openness": 80,
      "agreeableness": 55,
      "conscientiousness": 85,
      "neuroticism": 30
    }
  },
  "aptitude": {
    "sales": 78,
    "communication": 82,
    "resilience": 70,
    "goal_orientation": 88
  },
  "values": {
    "motivation_type": "ACHIEVEMENT",
    "recognition_preference": "ACHIEVEMENT",
    "growth_orientation": 85,
    "autonomy_preference": 70
  },
  "meta": {
    "completion_time_minutes": 25,
    "answer_consistency": 92,
    "hesitation_points": ["Q15", "Q23"]
  }
}
```

---

## 4. Phase 2: 教育アプリ データ収集

### 4.1 収集データ一覧

| カテゴリ | データ項目 | データ型 | 収集方法 | 必須 |
|---------|-----------|---------|---------|------|
| **学習進捗** | module_id | String | 自動記録 | ○ |
| | completion_status | Enum | 自動記録 | ○ |
| | score | Number (0-100) | テスト結果 | ○ |
| | attempts | Number | 自動カウント | ○ |
| | time_spent | Number (分) | 自動計測 | ○ |
| **スキル習熟度** | skill_id | String | 定義済み | ○ |
| | level | Number (1-5) | 自動算出 | ○ |
| | last_assessed | Date | 自動記録 | ○ |
| **学習パターン** | preferred_time | String | 行動分析 | - |
| | session_duration_avg | Number (分) | 自動算出 | - |
| | break_frequency | Number | 自動算出 | - |
| | optimal_chunk_size | Number | 自動算出 | - |
| **会話ログ** | conversation_id | String | 自動生成 | ○ |
| | agent | Enum | 記録 | ○ |
| | content | String | 記録 | ○ |
| | user_response | Object | 記録 | - |

### 4.2 スキル定義（営業職向け）

| スキルID | スキル名 | 測定方法 | レベル基準 |
|---------|---------|---------|-----------|
| SKL001 | 商品知識 | テスト正答率 | 80%以上でLv5 |
| SKL002 | ヒアリング | ロールプレイ評価 | 評価スコア |
| SKL003 | 提案力 | ロールプレイ評価 | 評価スコア |
| SKL004 | クロージング | ロールプレイ評価 | 評価スコア |
| SKL005 | 業界知識 | テスト正答率 | 80%以上でLv5 |
| SKL006 | システム操作 | 操作正確性 | エラー率 |
| SKL007 | コンプライアンス | テスト正答率 | 90%以上でLv5 |

### 4.3 教育会話ログフォーマット

```json
{
  "conversation_id": "EDU-CONV-2026-01-001",
  "user_id": "user_001",
  "session_id": "SESSION-001",
  "module_id": "MOD-003",
  "timestamp": "2026-01-15T14:30:00Z",
  "agent": "教育Buddy",
  "context": {
    "current_module": "クロージング基礎",
    "progress_percent": 45,
    "struggle_detected": true
  },
  "exchange": [
    {
      "role": "agent",
      "content": "クロージングのタイミングについて、もう一度確認してみよう。",
      "intent": "review_trigger"
    },
    {
      "role": "user",
      "content": "はい、お願いします",
      "response_time_ms": 2500
    }
  ],
  "outcome": {
    "understood": true,
    "retry_recommended": false
  }
}
```

---

## 5. Phase 3: CRM データ収集

### 5.1 収集データ一覧

| カテゴリ | データ項目 | データ型 | 収集方法 | 必須 |
|---------|-----------|---------|---------|------|
| **業務活動** | lead_id | String | システム生成 | ○ |
| | action_type | Enum | 自動分類 | ○ |
| | timestamp | DateTime | 自動記録 | ○ |
| | outcome | Enum | 入力/自動 | ○ |
| **成績データ** | contacts_count | Number | 自動カウント | ○ |
| | appointments_count | Number | 自動カウント | ○ |
| | deals_count | Number | 自動カウント | ○ |
| | deal_amount | Number | 入力 | ○ |
| | conversion_rate | Number | 自動算出 | ○ |
| **行動ログ** | login_time | DateTime | 自動記録 | ○ |
| | session_duration | Number (分) | 自動計測 | ○ |
| | pages_viewed | Array | 自動記録 | - |
| | features_used | Array | 自動記録 | - |
| **Buddy会話** | message_id | String | 自動生成 | ○ |
| | trigger_type | Enum | 自動分類 | ○ |
| | message_content | String | 記録 | ○ |
| | user_reaction | Object | 記録 | - |
| | effectiveness_score | Number | 自動算出 | - |

### 5.2 アクションタイプ定義

| タイプ | 説明 | KPIへの影響 |
|--------|------|------------|
| CALL | 電話発信 | contacts_count |
| EMAIL | メール送信 | contacts_count |
| MEETING | 商談実施 | appointments_count |
| PROPOSAL | 提案書送付 | 進捗更新 |
| CONTRACT | 契約締結 | deals_count, deal_amount |
| FOLLOW_UP | フォローアップ | activity_score |
| INQUIRY_RESPONSE | 問合せ対応 | response_time |

### 5.3 ユーザー反応記録フォーマット

```json
{
  "reaction_id": "REACT-2026-01-001",
  "message_id": "MSG-2026-01-001",
  "user_id": "user_001",
  "timestamp": "2026-01-15T10:30:00Z",
  "reaction_type": "click",
  "reaction_detail": {
    "action": "view_detail",
    "time_to_action_ms": 1500,
    "hover_duration_ms": 800
  },
  "sentiment_estimate": "positive",
  "engagement_indicators": {
    "read_message": true,
    "clicked_cta": true,
    "dismissed_quickly": false
  }
}
```

---

## 6. 個人プロファイル統合スキーマ

### 6.1 スプレッドシート構成

| シート名 | 用途 | 主キー |
|---------|------|--------|
| **個人プロファイル** | 基本情報 + 診断結果 | user_id |
| **スキル習熟度** | 教育進捗 | user_id + skill_id |
| **学習パターン** | 学習行動分析 | user_id |
| **会話ログ** | 全フェーズ会話記録 | conversation_id |
| **エージェント分析** | バックエンド分析結果 | user_id + analysis_date |

### 6.2 個人プロファイルシート構造

```
個人プロファイルシート
├─ A: user_id (PK)
├─ B: email
├─ C: name
├─ D: join_date
├─ E: current_phase (診断/教育/実務)
├─ F: diagnostic_completed (Boolean)
├─ G: education_completed (Boolean)
│
├─ 診断結果（H-W列）
│   ├─ H: personality_type
│   ├─ I: extroversion_score
│   ├─ J: openness_score
│   ├─ K: agreeableness_score
│   ├─ L: conscientiousness_score
│   ├─ M: neuroticism_score
│   ├─ N: sales_aptitude_score
│   ├─ O: communication_aptitude
│   ├─ P: resilience_score
│   ├─ Q: goal_orientation_score
│   ├─ R: motivation_type
│   ├─ S: recognition_preference
│   ├─ T: growth_orientation
│   ├─ U: autonomy_preference
│   ├─ V: diagnostic_completion_time
│   └─ W: answer_consistency
│
├─ 教育進捗サマリ（X-AB列）
│   ├─ X: modules_completed_count
│   ├─ Y: overall_progress_percent
│   ├─ Z: average_score
│   ├─ AA: learning_speed_rating
│   └─ AB: education_end_date
│
├─ CRM活動サマリ（AC-AJ列）
│   ├─ AC: total_contacts
│   ├─ AD: total_appointments
│   ├─ AE: total_deals
│   ├─ AF: total_deal_amount
│   ├─ AG: conversion_rate
│   ├─ AH: current_streak
│   ├─ AI: max_streak
│   └─ AJ: total_points
│
├─ 状態推定（AK-AM列）【DISC-2026-01-15-002 追加】
│   ├─ AK: growth_stage (入門/基礎/成長/停滞/安定/熟練)
│   ├─ AL: condition_estimate (HIGH/NORMAL/LOW)
│   └─ AM: optimal_hours (JSON: 時間帯別効率)
│
└─ エージェント最適化（AN-AQ列）
    ├─ AN: optimal_message_style
    ├─ AO: optimal_timing
    ├─ AP: risk_level
    └─ AQ: last_analysis_date
```

### 6.3 会話ログシート構造

```
会話ログシート
├─ A: log_id (PK)
├─ B: user_id (FK)
├─ C: phase (診断/教育/CRM)
├─ D: agent (Buddy/Tran/Ana/教育Buddy)
├─ E: timestamp
├─ F: trigger_type
├─ G: context_json
├─ H: agent_message
├─ I: user_response_type
├─ J: user_response_detail
├─ K: response_time_ms
├─ L: effectiveness_score
├─ M: engagement_score
└─ N: notes
```

---

## 7. データ連携プロトコル

### 7.1 アプリ間データ引継ぎ

```
┌────────────────────────────────────────────────────────────────┐
│                     データ引継ぎフロー                          │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  診断アプリ                                                    │
│  └─ 診断完了時                                                 │
│      └─ POST /api/profile/diagnostic                           │
│          └─ 個人プロファイルシートに診断結果を書き込み         │
│                                                                │
│  教育アプリ                                                    │
│  └─ 教育開始時                                                 │
│      └─ GET /api/profile/{user_id}                             │
│          └─ 診断結果を取得して教育内容をカスタマイズ           │
│  └─ 教育完了時                                                 │
│      └─ POST /api/profile/education                            │
│          └─ 教育進捗・スキル習熟度を書き込み                   │
│                                                                │
│  CRM                                                           │
│  └─ 実務開始時                                                 │
│      └─ GET /api/profile/{user_id}                             │
│          └─ 全フェーズデータを取得してエージェント最適化       │
│  └─ 継続的                                                     │
│      └─ POST /api/activity                                     │
│          └─ 活動データ・会話ログを継続記録                     │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 7.2 API エンドポイント定義

| エンドポイント | メソッド | 用途 | 呼び出し元 |
|---------------|---------|------|-----------|
| `/api/profile/{user_id}` | GET | プロファイル取得 | 全アプリ |
| `/api/profile/diagnostic` | POST | 診断結果登録 | 診断アプリ |
| `/api/profile/education` | POST | 教育進捗登録 | 教育アプリ |
| `/api/activity` | POST | 活動ログ登録 | CRM |
| `/api/conversation` | POST | 会話ログ登録 | 全アプリ |
| `/api/analysis/{user_id}` | GET | 分析結果取得 | CRM |

### 7.3 データ整合性保証

| 処理 | 方法 | 頻度 |
|------|------|------|
| **重複チェック** | user_id による一意性検証 | 書き込み時 |
| **整合性チェック** | 必須項目の存在確認 | 書き込み時 |
| **バックアップ** | シート複製 | 日次 |
| **監査ログ** | 更新履歴の記録 | 全書き込み |

---

## 8. プライバシー・同意管理

### 8.1 同意取得フロー

```
┌────────────────────────────────────────────────────────────────┐
│                     同意取得フロー                              │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  [診断アプリ開始時]                                            │
│  ├─ データ収集の目的説明                                       │
│  ├─ 収集データ項目の明示                                       │
│  ├─ 利用範囲の説明（教育・CRMでの活用）                        │
│  └─ 同意チェックボックス（必須）                               │
│                                                                │
│  [教育アプリ開始時]                                            │
│  ├─ 診断データ活用の再確認                                     │
│  └─ 追加データ収集への同意（任意拡張項目）                     │
│                                                                │
│  [CRM開始時]                                                   │
│  ├─ 全データ活用の最終確認                                     │
│  └─ エージェントパーソナライズへの同意                         │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 8.2 同意記録

| フィールド | 内容 |
|-----------|------|
| consent_id | 同意レコードID |
| user_id | ユーザーID |
| consent_type | 同意種別（基本/拡張/AI最適化） |
| granted_at | 同意日時 |
| scope | 同意範囲 |
| revocable | 撤回可能か |

### 8.3 データ削除・匿名化

| 要求 | 対応 |
|------|------|
| **データ削除要求** | 個人識別可能データを全削除 |
| **退職時** | 90日後に自動匿名化（統計用に残存） |
| **同意撤回** | 該当カテゴリのデータを即時削除 |

---

## 9. 実装優先度

### 9.1 Phase A での実装範囲

| 優先度 | 項目 | 理由 |
|--------|------|------|
| 1 | 個人プロファイルシート基本構造 | 全ての土台 |
| 2 | 会話ログシート構造 | Buddy最適化に必要 |
| 3 | CRM活動データ収集 | 即時利用可能 |
| 4 | ユーザー反応記録 | Buddy効果測定 |

### 9.2 Phase B 以降

| フェーズ | 実装項目 |
|---------|---------|
| Phase B | 議論ログ構造、分析結果シート |
| Phase C | 教育アプリ連携API |
| Phase D | 診断アプリ連携API |

---

## 10. 更新履歴

| 日時 | 更新者 | バージョン | 内容 |
|------|--------|-----------|------|
| 2026-01-15 | Claude Code | v1.0.0 | 初版作成 |

