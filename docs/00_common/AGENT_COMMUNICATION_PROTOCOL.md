# AGENT_COMMUNICATION_PROTOCOL.md - エージェント間通信プロトコル設計書

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
| **誰が** | Claude Code（AI_AGENT_ARCHITECTURE.md Section 5を詳細化） |
| **どこで** | バックエンドエージェントチーム内部 |
| **何を** | 14エージェント間の通信・議論プロトコル |
| **どうやって** | JSON形式メッセージ + 構造化議論フロー |
| **なぜ** | 透明性のある意思決定プロセス実現 |
| **どれぐらい** | 6議論フェーズ、14メッセージタイプ |

---

## 2. 通信アーキテクチャ概要

```
┌─────────────────────────────────────────────────────────────────┐
│                   エージェント間通信構造                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                    ┌─────────────┐                              │
│                    │   決裁者    │ ← 最終決定権                 │
│                    └──────┬──────┘                              │
│                           │                                     │
│         ┌─────────────────┼─────────────────┐                   │
│         │                 │                 │                   │
│         ▼                 ▼                 ▼                   │
│  ┌────────────┐   ┌────────────┐   ┌────────────┐              │
│  │ 専門家     │   │ バランサー │   │ ガバナンス │              │
│  │ グループ   │   │ グループ   │   │ グループ   │              │
│  └────────────┘   └────────────┘   └────────────┘              │
│    8エージェント    3エージェント    2エージェント               │
│                                                                 │
│  通信方式: 非同期メッセージング（スプレッドシートキュー）        │
│  議論単位: Discussion（議論セッション）                          │
│  記録形式: JSON（議論ログシート）                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. 議論セッション構造

### 3.1 Discussion（議論セッション）定義

```json
{
  "discussion_id": "DISC-{YYYY}-{MM}-{DD}-{SEQ}",
  "status": "OPEN | IN_PROGRESS | VOTING | DECIDED | CLOSED",
  "priority": "CRITICAL | HIGH | MEDIUM | LOW",
  "created_at": "ISO8601 timestamp",
  "closed_at": "ISO8601 timestamp | null",
  "trigger": {
    "type": "トリガー種別",
    "source": "発生元",
    "target_user_id": "対象ユーザー",
    "context": {}
  },
  "participants": ["参加エージェント一覧"],
  "phases": [],
  "final_decision": {}
}
```

### 3.2 議論ステータス遷移

```
┌─────────────────────────────────────────────────────────────────┐
│                   議論ステータス遷移図                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   OPEN ──▶ IN_PROGRESS ──▶ VOTING ──▶ DECIDED ──▶ CLOSED       │
│     │           │            │           │                      │
│     │           │            │           └─ 実行完了/キャンセル │
│     │           │            │                                  │
│     │           │            └─ 決裁者による最終判断            │
│     │           │                                               │
│     │           └─ 各エージェントが意見提出中                   │
│     │                                                           │
│     └─ トリガー発生、議論開始待ち                               │
│                                                                 │
│   異常系:                                                       │
│   - TIMEOUT: 24時間経過で強制クローズ                           │
│   - ESCALATED: 決裁者判断でエスカレーション                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. 議論フェーズ定義

### 4.1 フェーズ一覧

| フェーズ | 名称 | 参加者 | 制限時間 | 目的 |
|---------|------|--------|---------|------|
| **Phase 1** | 状況報告 | 分析特化 | 30秒 | 事実の提示 |
| **Phase 2** | 専門分析 | 専門家8名 | 5分 | 各視点からの分析 |
| **Phase 3** | 多角評価 | バランサー3名 | 3分 | ポジ/ネガ/人間視点 |
| **Phase 4** | ガバナンスチェック | 倫理/法務 | 2分 | リスク確認 |
| **Phase 5** | 決裁者検討 | 決裁者 | 2分 | 統合・決定 |
| **Phase 6** | 実行指示 | 決裁者→フロントエンド | 即時 | 行動指示 |

### 4.2 フェーズ詳細

#### Phase 1: 状況報告

```json
{
  "phase": 1,
  "phase_name": "状況報告",
  "speaker": "分析特化",
  "message_type": "SITUATION_REPORT",
  "content": {
    "summary": "田中さんの連絡数が3日連続低下",
    "data_points": [
      {"metric": "contacts", "current": 5, "previous": 12, "change_rate": -58},
      {"metric": "login_streak", "value": 3, "max": 15}
    ],
    "severity": "HIGH",
    "affected_kpis": ["contacts_count", "conversion_rate"]
  }
}
```

#### Phase 2: 専門分析

```json
{
  "phase": 2,
  "phase_name": "専門分析",
  "messages": [
    {
      "speaker": "心理学特化",
      "message_type": "SPECIALIST_OPINION",
      "content": {
        "analysis": "承認欲求が高いタイプだが、最近の称賛頻度が低下している",
        "evidence": ["recognition_preference: PUBLIC", "praise_count_last_7d: 2"],
        "hypothesis": "モチベーション低下の主因は承認不足",
        "confidence": 0.75,
        "recommendation": "具体的行動への即時称賛を増加"
      }
    },
    {
      "speaker": "脳科学特化",
      "message_type": "SPECIALIST_OPINION",
      "content": {
        "analysis": "午前中のログイン率が低下、認知負荷が高い可能性",
        "evidence": ["morning_login_rate: 30%", "session_duration_avg: 12min"],
        "hypothesis": "疲労蓄積による集中力低下",
        "confidence": 0.6,
        "recommendation": "タスク分割、短時間集中セッション推奨"
      }
    },
    {
      "speaker": "コーチング特化",
      "message_type": "SPECIALIST_OPINION",
      "content": {
        "analysis": "成長曲線で「停滞期」に該当",
        "evidence": ["days_since_last_success: 14"],
        "hypothesis": "小さな成功体験が不足",
        "confidence": 0.8,
        "recommendation": "達成可能な短期目標を設定"
      }
    }
  ]
}
```

#### Phase 3: 多角評価

```json
{
  "phase": 3,
  "phase_name": "多角評価",
  "messages": [
    {
      "speaker": "ポジティブビジョン",
      "message_type": "PERSPECTIVE_POSITIVE",
      "content": {
        "viewpoint": "一件の成約で自信が回復し、一気に波に乗れる可能性",
        "opportunity": "今サポートすれば長期的なロイヤリティ向上",
        "recommended_tone": "励まし強め"
      }
    },
    {
      "speaker": "Devil's Advocate",
      "message_type": "PERSPECTIVE_NEGATIVE",
      "content": {
        "risk": "過度な称賛は依存を生む可能性",
        "concern": "根本的なスキル不足を見落とすリスク",
        "counter_proposal": "称賛増加は行動に対してのみ、結果への称賛は控える"
      }
    },
    {
      "speaker": "サボり視点",
      "message_type": "PERSPECTIVE_HUMAN",
      "content": {
        "reality_check": "正直、毎日ログインは面倒だと思っている可能性が高い",
        "human_insight": "週末明けの月曜は特にモチベーションが低い傾向",
        "practical_suggestion": "月曜の目標は低めに設定"
      }
    }
  ]
}
```

#### Phase 4: ガバナンスチェック

```json
{
  "phase": 4,
  "phase_name": "ガバナンスチェック",
  "messages": [
    {
      "speaker": "倫理特化",
      "message_type": "GOVERNANCE_ETHICS",
      "content": {
        "check_result": "PASS",
        "concerns": [],
        "notes": "称賛頻度の増加は倫理的に問題なし"
      }
    },
    {
      "speaker": "法務特化",
      "message_type": "GOVERNANCE_LEGAL",
      "content": {
        "check_result": "PASS",
        "concerns": [],
        "notes": "労務上の問題なし。パワハラ該当なし"
      }
    }
  ]
}
```

#### Phase 5: 決裁者検討

```json
{
  "phase": 5,
  "phase_name": "決裁者検討",
  "speaker": "決裁者",
  "message_type": "DECISION_DELIBERATION",
  "content": {
    "summary_of_opinions": {
      "consensus_points": [
        "承認欲求への対応が必要",
        "小さな成功体験を積ませる"
      ],
      "conflicting_points": [
        {
          "topic": "称賛頻度",
          "for": ["心理学特化", "ポジティブビジョン"],
          "against": ["Devil's Advocate"],
          "resolution": "行動への称賛に限定することで両立"
        }
      ]
    },
    "weight_assignment": {
      "心理学特化": 0.3,
      "コーチング特化": 0.3,
      "Devil's Advocate": 0.2,
      "その他": 0.2
    }
  }
}
```

#### Phase 6: 実行指示

```json
{
  "phase": 6,
  "phase_name": "実行指示",
  "speaker": "決裁者",
  "message_type": "EXECUTION_ORDER",
  "content": {
    "decision_id": "DEC-2026-01-15-001",
    "target_agents": ["Buddy"],
    "actions": [
      {
        "action_type": "PRAISE_INCREASE",
        "target": "行動ベースの称賛",
        "increase_rate": 0.3,
        "duration_days": 7
      },
      {
        "action_type": "GOAL_ADJUSTMENT",
        "target": "日次目標",
        "new_goal": {"contacts": 5},
        "duration_days": 3
      },
      {
        "action_type": "MESSAGE_TIMING",
        "target": "午前リマインド",
        "time": "09:30",
        "message_template": "MORNING_ENCOURAGEMENT"
      }
    ],
    "monitoring": {
      "metrics": ["contacts_count", "login_streak"],
      "review_date": "2026-01-22",
      "success_criteria": {"contacts_count_change": "+20%"}
    }
  }
}
```

---

## 5. メッセージタイプ定義

### 5.1 メッセージタイプ一覧

| タイプ | 用途 | 送信者 | 必須フィールド |
|--------|------|--------|---------------|
| `SITUATION_REPORT` | 状況報告 | 分析特化 | summary, data_points, severity |
| `SPECIALIST_OPINION` | 専門意見 | 専門家 | analysis, evidence, confidence, recommendation |
| `PERSPECTIVE_POSITIVE` | 楽観視点 | ポジティブ | viewpoint, opportunity |
| `PERSPECTIVE_NEGATIVE` | リスク指摘 | Devil's Advocate | risk, concern, counter_proposal |
| `PERSPECTIVE_HUMAN` | 人間視点 | サボり視点 | reality_check, human_insight |
| `GOVERNANCE_ETHICS` | 倫理チェック | 倫理特化 | check_result, concerns |
| `GOVERNANCE_LEGAL` | 法務チェック | 法務特化 | check_result, concerns |
| `DECISION_DELIBERATION` | 検討中 | 決裁者 | summary_of_opinions, weight_assignment |
| `EXECUTION_ORDER` | 実行指示 | 決裁者 | actions, monitoring |
| `FEEDBACK_REQUEST` | 追加情報要求 | 任意 | question, target_agent |
| `FEEDBACK_RESPONSE` | 追加情報回答 | 任意 | answer, source_data |
| `OBJECTION` | 異議申立 | 任意 | reason, alternative |
| `ACKNOWLEDGEMENT` | 受領確認 | 任意 | status |
| `ERROR` | エラー報告 | システム | error_code, message |

### 5.2 メッセージ共通構造

```json
{
  "message_id": "MSG-{discussion_id}-{seq}",
  "discussion_id": "DISC-xxx",
  "phase": 1-6,
  "speaker": "エージェント名",
  "message_type": "タイプ",
  "timestamp": "ISO8601",
  "content": {},
  "metadata": {
    "processing_time_ms": 150,
    "model_used": "agent_model_v1",
    "tokens_consumed": 500
  }
}
```

---

## 6. 信頼度スコアリング

### 6.1 Confidence Score 定義

| スコア範囲 | 解釈 | 決裁者の扱い |
|-----------|------|-------------|
| 0.9 - 1.0 | 非常に高い確信 | 重視 |
| 0.7 - 0.89 | 高い確信 | 参考 |
| 0.5 - 0.69 | 中程度の確信 | 他意見と照合 |
| 0.3 - 0.49 | 低い確信 | 追加情報要求 |
| 0.0 - 0.29 | 推測レベル | 参考程度 |

### 6.2 Confidence 計算要素

```json
{
  "confidence_calculation": {
    "base_score": 0.5,
    "modifiers": [
      {"factor": "data_recency", "weight": 0.2, "value": 0.9},
      {"factor": "data_completeness", "weight": 0.15, "value": 0.8},
      {"factor": "historical_accuracy", "weight": 0.25, "value": 0.7},
      {"factor": "sample_size", "weight": 0.2, "value": 0.6},
      {"factor": "expert_consensus", "weight": 0.2, "value": 0.75}
    ],
    "final_score": 0.75
  }
}
```

---

## 7. 異議申立・再議論プロセス

### 7.1 異議申立条件

| 条件 | 申立可能者 | 結果 |
|------|-----------|------|
| 重大なリスク見落とし | ガバナンスグループ | 必ず再議論 |
| データの誤り発見 | 分析特化 | 再分析後に再議論 |
| 倫理的懸念 | 倫理特化 | 必ず再議論 |
| 法的リスク | 法務特化 | 必ず再議論 |
| 一般的異議 | 任意 | 決裁者判断 |

### 7.2 異議申立メッセージ

```json
{
  "message_type": "OBJECTION",
  "speaker": "Devil's Advocate",
  "content": {
    "target_decision": "DEC-2026-01-15-001",
    "reason": "称賛増加30%は過度。依存リスクが想定以上",
    "evidence": ["case_study_similar_user: user_045 became dependent"],
    "alternative": "称賛増加を15%に抑制、代わりに具体的行動指示を増加",
    "urgency": "MEDIUM"
  }
}
```

### 7.3 再議論フロー

```
異議申立
    │
    ▼
決裁者がレビュー
    │
    ├─ 却下（理由明示）
    │
    └─ 受理
         │
         ▼
    Phase 5から再開
         │
         ▼
    修正決定 or 原案維持
```

---

## 8. ログ保存・監査

### 8.1 議論ログシート構造

```
議論ログシート
├─ A: discussion_id (PK)
├─ B: status
├─ C: priority
├─ D: trigger_type
├─ E: trigger_target_user
├─ F: trigger_context_json
├─ G: created_at
├─ H: closed_at
├─ I: participants_json
├─ J: messages_json (全メッセージ配列)
├─ K: final_decision_json
├─ L: execution_status
├─ M: outcome_evaluated
└─ N: notes
```

### 8.2 監査要件

| 要件 | 保存期間 | 目的 |
|------|---------|------|
| 全議論ログ | 3年 | 意思決定プロセス追跡 |
| 決定内容 | 5年 | コンプライアンス |
| 異議申立履歴 | 3年 | プロセス改善 |
| 効果測定結果 | 3年 | エージェント精度向上 |

---

## 9. パフォーマンス要件

### 9.1 応答時間目標

| フェーズ | 目標時間 | 最大許容 |
|---------|---------|---------|
| Phase 1 | 5秒 | 30秒 |
| Phase 2（全体） | 30秒 | 5分 |
| Phase 3 | 15秒 | 3分 |
| Phase 4 | 10秒 | 2分 |
| Phase 5 | 20秒 | 2分 |
| Phase 6 | 即時 | 5秒 |
| **全体** | 80秒 | 15分 |

### 9.2 リソース制限

| リソース | 制限 | 超過時の動作 |
|---------|------|-------------|
| トークン/議論 | 50,000 | 要約して継続 |
| 同時議論数 | 10 | キュー待ち |
| メッセージ数/議論 | 100 | 強制フェーズ移行 |

---

## 10. エラーハンドリング

### 10.1 エラーコード

| コード | 意味 | 対処 |
|--------|------|------|
| E001 | エージェント応答タイムアウト | デフォルト意見で継続 |
| E002 | データ取得失敗 | 再試行3回後にスキップ |
| E003 | 決裁者応答なし | 緊急時はルールベース決定 |
| E004 | ガバナンスチェック失敗 | 決定保留、Human通知 |
| E005 | 異議申立処理失敗 | 原案で仮実行、後日レビュー |

### 10.2 フォールバック戦略

```
┌─────────────────────────────────────────────────────────────────┐
│                   フォールバック戦略                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Level 1: 再試行                                                │
│  └─ 3回まで自動再試行                                          │
│                                                                 │
│  Level 2: 代替エージェント                                      │
│  └─ 同グループ内の別エージェントが代行                         │
│                                                                 │
│  Level 3: グループスキップ                                      │
│  └─ 該当グループの意見なしで継続                               │
│                                                                 │
│  Level 4: ルールベース決定                                      │
│  └─ 事前定義ルールで自動決定                                   │
│                                                                 │
│  Level 5: 人間エスカレーション                                  │
│  └─ 決定保留、Humanに通知                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 11. 実装ロードマップ

### 11.1 Phase B での実装範囲

| 優先度 | 項目 | 内容 |
|--------|------|------|
| 1 | メッセージ基本構造 | JSON schema定義 |
| 2 | 議論ログシート | スプレッドシート作成 |
| 3 | Phase 1-2 実装 | 分析 + 3専門家 |
| 4 | 決裁者基礎ロジック | ルールベース判定 |

### 11.2 Phase C 以降

| フェーズ | 実装項目 |
|---------|---------|
| Phase C | Phase 3-4実装、異議申立 |
| Phase D | 全エージェント稼働、フィードバックループ |
| Phase E | 精度向上、自己改善機能 |

---

## 12. 更新履歴

| 日時 | 更新者 | バージョン | 内容 |
|------|--------|-----------|------|
| 2026-01-15 | Claude Code | v1.0.0 | 初版作成 |

