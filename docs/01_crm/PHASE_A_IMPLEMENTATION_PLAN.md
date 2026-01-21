# PHASE_A_IMPLEMENTATION_PLAN.md - Phase A 基盤構築 実装計画書

> **バージョン**: v1.0.0
> **作成日時**: 2026-01-15
> **作成者**: Human + Claude Code
> **親ドキュメント**: AI_AGENT_ARCHITECTURE.md
> **ステータス**: 承認待ち

---

## 1. ドキュメント定義（5W2H）

| 項目 | 内容 |
|------|------|
| **いつ** | 2026-01-15 アーキテクチャ設計承認後に開始 |
| **誰が** | Claude Code（実装）+ Human（レビュー・承認） |
| **どこで** | CRMダッシュボード内 |
| **何を** | 個人最適化エージェント基盤の構築 |
| **どうやって** | GAS + スプレッドシート + HTML/CSS |
| **なぜ** | 相手本位実現のためのPhase A完了 |
| **どれぐらい** | 4ステップ、GAS 4ファイル、シート 3枚追加 |

---

## 2. Phase A 概要

### 2.1 目標

```
┌─────────────────────────────────────────────────────────────────┐
│                   Phase A 完了時の状態                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ✅ 個人プロファイルが蓄積される基盤                           │
│  ✅ Buddyが性格タイプ別にメッセージを変える                    │
│  ✅ ストリーク・ポイント・バッジが機能                         │
│  ✅ 会話ログが記録・分析可能                                   │
│  ✅ ダッシュボードに依存性UIが実装                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 スコープ

| 含む | 含まない |
|------|---------|
| 個人プロファイル基本構造 | 診断アプリ連携 |
| Buddy性格別メッセージ | 教育アプリ連携 |
| ストリーク・ポイント | バックエンドエージェント議論 |
| バッジ・実績システム | 完全な14エージェント稼働 |
| 会話ログ記録 | 複雑なAI分析 |
| 基本的な依存性UI | Tran/Anaの高度機能 |

---

## 3. 実装ステップ詳細

### 3.1 Step A-1: 個人プロファイルシート作成

#### 目的
ユーザー個人の属性・診断結果・最適化設定を保存

#### スプレッドシート設計

**シート名**: `個人プロファイル`

| 列 | フィールド名 | データ型 | 説明 |
|----|-------------|---------|------|
| A | user_id | String | メールアドレス（PK） |
| B | display_name | String | 表示名 |
| C | join_date | Date | 登録日 |
| D | current_phase | Enum | 診断/教育/実務 |
| E | personality_type | String | 性格タイプ（仮：4タイプ） |
| F | recognition_preference | Enum | 称賛スタイル |
| G | motivation_type | String | 動機タイプ |
| H | optimal_message_style | String | 最適メッセージスタイル |
| I | risk_level | Number | 離脱リスク（0-100） |
| J | total_points | Number | 累計ポイント |
| K | current_streak | Number | 現在のストリーク |
| L | max_streak | Number | 最長ストリーク |
| M | badges_json | JSON | 獲得バッジ一覧 |
| N | last_login | DateTime | 最終ログイン |
| O | created_at | DateTime | レコード作成日時 |
| P | updated_at | DateTime | レコード更新日時 |
| Q | growth_stage | Enum | 成長段階（入門/基礎/成長/停滞/安定/熟練） |
| R | condition_estimate | Enum | コンディション推定（HIGH/NORMAL/LOW） |
| S | optimal_hours | JSON | 最適活動時間帯 {"morning":0.8,"afternoon":0.6,...} |

#### 初期性格タイプ定義（Phase A版）

| タイプ | 説明 | Buddyの対応スタイル |
|--------|------|-------------------|
| **ACHIEVER** | 成果重視 | 数値・結果を強調した称賛 |
| **CONNECTOR** | 関係重視 | チームへの貢献を強調 |
| **LEARNER** | 成長重視 | スキルアップ・進歩を強調 |
| **STABILIZER** | 安定重視 | 安心感・継続性を強調 |

#### GAS実装

**ファイル**: `30_ProfileService.gs`

```javascript
// 主要関数
function getOrCreateProfile(email)           // プロファイル取得or新規作成
function updateProfile(email, updates)       // プロファイル更新
function getPersonalityType(email)           // 性格タイプ取得
function calculateRiskLevel(email)           // リスクレベル算出
function getOptimalMessageStyle(email)       // 最適メッセージスタイル取得
function calculateGrowthStage(email)         // 成長段階自動判定
function estimateCondition(email)            // コンディション推定
function calculateOptimalHours(email)        // 最適活動時間帯算出
```

#### 追加項目の自動算出ロジック（議論ID: DISC-2026-01-15-002 決定）

```
growth_stage（成長段階）:
  - 入門: 入社14日以内
  - 基礎: 入社15-30日 または 成約0件
  - 成長: 成約1-5件 かつ 上昇トレンド
  - 停滞: 14日以上成約なし かつ 活動低下
  - 安定: 成約6件以上 かつ 安定推移
  - 熟練: 成約率上位20% かつ 60日以上

condition_estimate（コンディション推定）:
  - HIGH: 平均より早いログイン + 活動量多い + 反応速い
  - NORMAL: 通常パターン
  - LOW: ログイン遅い or 活動量少ない or 反応遅い

optimal_hours（最適活動時間帯）:
  - 過去30日の時間帯別活動成功率から算出
  - morning(9-12), afternoon(12-17), evening(17-21)
  - 週次で再計算
```

---

### 3.2 Step A-2: 会話ログ収集基盤

#### 目的
Buddy/Tran/Anaとの会話を記録し、効果測定・改善に活用

#### スプレッドシート設計

**シート名**: `会話ログ`

| 列 | フィールド名 | データ型 | 説明 |
|----|-------------|---------|------|
| A | log_id | String | ログID（PK） |
| B | user_id | String | ユーザーID（FK） |
| C | agent | Enum | Buddy/Tran/Ana |
| D | trigger_type | String | トリガー種別 |
| E | timestamp | DateTime | 発生日時 |
| F | context_json | JSON | コンテキスト情報 |
| G | message_content | String | メッセージ内容 |
| H | message_rarity | Enum | normal/rare/super_rare |
| I | user_response_type | String | click/dismiss/ignore |
| J | response_time_ms | Number | 応答までの時間 |
| K | effectiveness_score | Number | 効果スコア（0-100） |
| L | engagement_score | Number | エンゲージメント（0-100） |
| M | personality_applied | Boolean | 性格最適化適用有無 |
| N | notes | String | 備考 |

#### GAS実装

**ファイル**: `31_ConversationLogService.gs`

```javascript
// 主要関数
function logConversation(params)             // 会話ログ記録
function getConversationHistory(email, days) // 会話履歴取得
function calculateMessageEffectiveness(logId) // 効果測定
function getEngagementTrend(email, days)     // エンゲージメント傾向
```

---

### 3.3 Step A-3: Buddy個人最適化基礎

#### 目的
性格タイプ別にBuddyのメッセージを変化させる

#### メッセージプール構造

**シート名**: `Buddyメッセージプール`

| 列 | フィールド名 | データ型 | 説明 |
|----|-------------|---------|------|
| A | message_id | String | メッセージID（PK） |
| B | category | Enum | 称賛/励まし/リマインド/祝福 |
| C | trigger_type | String | トリガー種別 |
| D | personality_type | String | 対象性格タイプ（*=全員） |
| E | rarity | Enum | normal/rare/super_rare |
| F | content | String | メッセージ本文 |
| G | variables | JSON | 変数定義 |
| H | usage_count | Number | 使用回数 |
| I | effectiveness_avg | Number | 平均効果スコア |
| J | active | Boolean | 有効フラグ |

#### メッセージ例

| カテゴリ | 性格タイプ | メッセージ |
|---------|-----------|-----------|
| 称賛 | ACHIEVER | 「{count}件達成！着実に数字を積み上げてるね」 |
| 称賛 | CONNECTOR | 「{count}件の連絡でチームに貢献してる！」 |
| 称賛 | LEARNER | 「{count}件目！毎日スキルが上がってるよ」 |
| 称賛 | STABILIZER | 「{count}件完了。いつも通り安定した仕事だね」 |

#### GAS実装

**ファイル**: `28_GamificationService.gs`（既存拡張）

```javascript
// 追加・修正関数
function getPersonalizedMessage(email, category, trigger) // 性格別メッセージ取得
function selectMessageByPersonality(messages, type)       // 性格でフィルタリング
function applyMessageVariables(template, vars)            // 変数展開
function recordMessageUsage(messageId, effectiveness)     // 使用記録
```

---

### 3.4 Step A-4: ストリーク・ポイント・バッジ実装

#### 目的
ゲーミフィケーション要素でエンゲージメント向上

#### ポイント設計

| アクション | ベースポイント | ストリークボーナス |
|-----------|--------------|------------------|
| ログイン | 10 | +2/日（最大+20） |
| リード連絡 | 20 | +5/日（最大+50） |
| アポ獲得 | 100 | +20/件 |
| 成約 | 500 | +100/件 |
| 教育モジュール完了 | 50 | - |

#### バッジ設計

| バッジID | 名称 | 条件 | レアリティ |
|---------|------|------|-----------|
| B001 | 初ログイン | 初回ログイン | Common |
| B002 | 3日連続 | 3日連続ログイン | Common |
| B003 | 7日連続 | 7日連続ログイン | Rare |
| B004 | 30日連続 | 30日連続ログイン | Super Rare |
| B005 | 初連絡 | 初回リード連絡 | Common |
| B006 | 連絡マスター | 100件連絡達成 | Rare |
| B007 | 初成約 | 初回成約 | Rare |
| B008 | トップセールス | 月間成約1位 | Super Rare |

#### GAS実装

**ファイル**: `28_GamificationService.gs`

```javascript
// 主要関数
function addPoints(email, action, context)   // ポイント付与
function checkStreakBonus(email)             // ストリークボーナス計算
function updateStreak(email)                 // ストリーク更新
function checkBadgeEligibility(email)        // バッジ獲得チェック
function awardBadge(email, badgeId)          // バッジ付与
function getUserGamificationStatus(email)    // ゲーミフィケーション状態取得
```

---

## 4. UIコンポーネント設計

### 4.1 ダッシュボード変更点

```
┌─────────────────────────────────────────────────────────────────┐
│                   ダッシュボードUI変更                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [既存] ヘッダー、ナビゲーション                               │
│                                                                 │
│  [新規] ゲーミフィケーションバー                               │
│  ├─ ポイント表示                                               │
│  ├─ ストリーク表示（炎アイコン）                               │
│  ├─ レベル/経験値バー                                          │
│  └─ 最新バッジ                                                 │
│                                                                 │
│  [変更] Buddyセクション                                        │
│  ├─ 性格別メッセージ表示                                       │
│  ├─ レアリティ演出（Super Rareは特別エフェクト）              │
│  └─ 反応ボタン（いいね/ありがとう）                           │
│                                                                 │
│  [新規] 実績セクション                                         │
│  ├─ 獲得バッジ一覧                                             │
│  ├─ 次のバッジまでの進捗                                       │
│  └─ 履歴表示                                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 HTMLファイル変更

| ファイル | 変更内容 |
|---------|---------|
| `index.html` | ゲーミフィケーションバー追加 |
| `components/dashboard.html` | Buddyセクション拡張 |
| `style.html` | バッジ・ポイントスタイル追加 |

---

## 5. 実装順序

```
┌─────────────────────────────────────────────────────────────────┐
│                   実装フロー                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Step A-1: 個人プロファイル                                   │
│   ├─ 1.1 シート作成                                            │
│   ├─ 1.2 ProfileService.gs 実装                                │
│   └─ 1.3 テスト                                                │
│        │                                                       │
│        ▼                                                       │
│   Step A-2: 会話ログ                                           │
│   ├─ 2.1 シート作成                                            │
│   ├─ 2.2 ConversationLogService.gs 実装                        │
│   └─ 2.3 テスト                                                │
│        │                                                       │
│        ▼                                                       │
│   Step A-3: Buddy最適化                                        │
│   ├─ 3.1 メッセージプールシート作成                            │
│   ├─ 3.2 GamificationService.gs 拡張                           │
│   ├─ 3.3 メッセージ投入                                        │
│   └─ 3.4 テスト                                                │
│        │                                                       │
│        ▼                                                       │
│   Step A-4: ゲーミフィケーション                               │
│   ├─ 4.1 ポイント・ストリークロジック実装                      │
│   ├─ 4.2 バッジロジック実装                                    │
│   ├─ 4.3 UI実装                                                │
│   └─ 4.4 統合テスト                                            │
│        │                                                       │
│        ▼                                                       │
│   Phase A 完了レビュー                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. 成果物一覧

### 6.1 新規GASファイル

| ファイル名 | 目的 | 行数目安 |
|-----------|------|---------|
| `30_ProfileService.gs` | 個人プロファイル管理 | 200行 |
| `31_ConversationLogService.gs` | 会話ログ管理 | 150行 |

### 6.2 変更GASファイル

| ファイル名 | 変更内容 |
|-----------|---------|
| `28_GamificationService.gs` | 性格別メッセージ、ポイント、バッジ追加 |
| `20_APIEndpoints.gs` | 新APIエンドポイント追加 |
| `29_BuddyMessageService.gs` | 性格別メッセージ取得連携 |

### 6.3 新規スプレッドシート

| シート名 | 目的 |
|---------|------|
| 個人プロファイル | ユーザー属性・設定 |
| 会話ログ | エージェント会話記録 |
| Buddyメッセージプール | 性格別メッセージ管理 |

### 6.4 変更HTMLファイル

| ファイル | 変更内容 |
|---------|---------|
| index.html | ゲーミフィケーションバー |
| components/dashboard.html | Buddyセクション拡張 |
| style.html | 新規スタイル追加 |

---

## 7. テスト計画

### 7.1 単体テスト

| 対象 | テスト項目 |
|------|-----------|
| ProfileService | プロファイル作成/取得/更新 |
| ConversationLogService | ログ記録/取得/集計 |
| GamificationService | ポイント計算/ストリーク/バッジ |

### 7.2 統合テスト

| シナリオ | 確認項目 |
|---------|---------|
| 新規ユーザー初回ログイン | プロファイル自動作成、初ログインバッジ |
| 連続ログイン | ストリーク更新、ボーナスポイント |
| リード連絡 | ポイント付与、Buddy称賛メッセージ |
| 成約 | 大量ポイント、特別メッセージ、バッジチェック |

### 7.3 テスト用関数（TestRunner.gs追加）

```javascript
function testProfileService()         // プロファイル系テスト
function testConversationLog()        // 会話ログ系テスト
function testGamification()           // ゲーミフィケーション系テスト
function testPersonalizedMessage()    // 性格別メッセージテスト
```

---

## 8. リスクと対策

| リスク | 影響 | 対策 |
|--------|------|------|
| 性格タイプ判定の精度 | メッセージミスマッチ | Phase A では4タイプに簡素化、後で拡張 |
| メッセージプール不足 | 同じメッセージ頻発 | 各カテゴリ最低10種類確保 |
| ポイントインフレ | 達成感低下 | 適度なリセット or レベル制導入 |
| パフォーマンス低下 | UX悪化 | ログはバッチ処理、キャッシュ活用 |

---

## 9. 承認後アクション

1. **Human**: 本計画書レビュー・承認
2. **Human**: 性格タイプ4種の詳細定義確認
3. **Human**: メッセージプール初期コンテンツ提供（各カテゴリ5-10件）
4. **Claude Code**: Step A-1から実装開始

---

## 10. 更新履歴

| 日時 | 更新者 | バージョン | 内容 |
|------|--------|-----------|------|
| 2026-01-15 | Claude Code | v1.0.0 | 初版作成 |

