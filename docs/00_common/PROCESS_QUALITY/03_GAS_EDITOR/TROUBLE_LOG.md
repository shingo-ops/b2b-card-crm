# 03_GAS_EDITOR 過去トラブルログ

## 概要

GASエディタ工程で発生した過去トラブルを記録。

## 過去トラ一覧

| ID | 発生日 | 内容 | 根本原因 | 対策 | 再発 |
|----|--------|------|---------|------|------|
| GAS-001 | 2026-01-17 | LockService未使用による競合状態エラー | 排他制御の欠如 | CLAUDE.md 11. | 0 |
| GAS-002 | 2026-01-18 | 複数環境フォルダの同期漏れ | フォルダ構造の認識不足 | CLAUDE.md 12. | 0 |

---

## 過去トラ詳細

### GAS-001: LockService未使用による競合状態エラー

**元TROUBLE-ID**: TROUBLE-018

#### 1. 現状把握（5W2H）
| 項目 | 内容 |
|------|------|
| いつ | 2026-01-17 |
| どこで | gemini-dashboard-gas, 他GASプロジェクト |
| 誰が | GitHub Actions |
| 何が | insertSheet時に「シート名はすでに存在」エラー |
| なぜ | 複数プロセス同時実行時の競合状態 |
| どのように | エラーログで検出 |
| どのくらい | 全GASプロジェクト |

#### 2. 根本原因
insertSheet/deleteSheet時にLockServiceによる排他制御がなかった

#### 3. 対策
- CLAUDE.md セクション11にLockServiceルールを追加
- GitHub Actionsでの自動チェックを追加

#### 4. 横展開
全GASプロジェクトに適用

---

### GAS-002: 複数環境フォルダの同期漏れ

**元TROUBLE-ID**: TROUBLE-019

#### 1. 現状把握（5W2H）
| 項目 | 内容 |
|------|------|
| いつ | 2026-01-18 |
| どこで | crm-dashboard-dev, crm-dashboard-prop |
| 誰が | GitHub Actions |
| 何が | LockService未実装エラーが3回に分けて検出 |
| なぜ | 複数環境フォルダの存在を認識していなかった |
| どのように | GitHub Actionsで検出 |
| どのくらい | CRMプロジェクト |

#### 2. 根本原因
crm-dashboard, crm-dashboard-dev, crm-dashboard-propの同期ルールがなかった

#### 3. 対策
- CLAUDE.md セクション12に同期ルールを追加
- GitHub Actionsで同期チェックを追加

#### 4. 横展開
複数環境フォルダを持つ全プロジェクトに適用
