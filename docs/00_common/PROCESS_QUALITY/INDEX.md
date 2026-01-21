# 工程別品質管理 INDEX

## 概要

各工程のポカヨケ（ミス防止）と過去トラ（トラブルログ）を管理し、再発率0%を目指す。

## KGI

| 指標 | 目標値 | 現状 |
|------|--------|------|
| 全工程再発率 | 0% | 50%（改善中） |
| ポカ発生総数 | - | 4件 |

## 工程一覧

| # | 工程 | 説明 | ポカ発生数 | 再発数 | 再発率 |
|---|------|------|-----------|--------|--------|
| 00 | [COMMON](./00_COMMON/) | 全工程共通 | 0 | 0 | - |
| 01 | [SPEC](./01_SPEC/) | 仕様書作成/編集 | 0 | 0 | - |
| 02 | [SPREADSHEET](./02_SPREADSHEET/) | スプレッドシート作成/編集 | 0 | 0 | - |
| 03 | [GAS_EDITOR](./03_GAS_EDITOR/) | GASエディタ作成/編集 | 4 | 2 | 50% |
| 04 | [WEBAPP](./04_WEBAPP/) | Webアプリ作成/編集 | 0 | 0 | - |
| 05 | [LOCAL_DATA](./05_LOCAL_DATA/) | ローカルデータ作成/編集 | 0 | 0 | - |
| 06 | [GITHUB](./06_GITHUB/) | GitHub作成/編集 | 0 | 0 | - |
| 07 | [GEMINI_AUDIT](./07_GEMINI_AUDIT/) | Gemini監査 | 0 | 0 | - |
| 08 | [GITHUB_ACTIONS](./08_GITHUB_ACTIONS/) | GitHub Actions作成/編集 | 0 | 0 | - |
| 09 | [POKAYOKE](./09_POKAYOKE/) | ポカ避け作成/編集 | 0 | 0 | - |
| 10 | [TROUBLE_LOG](./10_TROUBLE_LOG/) | 過去トラ作成/編集 | 0 | 0 | - |

## 既存TROUBLE_LOGとの関連

| 既存ID | 工程 | 工程別ID | 内容 |
|--------|------|---------|------|
| TROUBLE-018 | 03_GAS_EDITOR | GAS-001 | LockService未使用 |
| TROUBLE-019 | 03_GAS_EDITOR | GAS-002 | 環境フォルダ同期漏れ |

**参照**: [docs/01_crm/TROUBLE_LOG.md](../../01_crm/TROUBLE_LOG.md) - CRM固有の過去トラ

## ポカの定義と分類

### ポカの定義
「ルール違反」または「品質基準未達」のうち、GitHub Actionsまたは人間レビューで検出されたもの。

### ポカの分類

| 分類 | 検出方法 | 例 | 自動記録 |
|------|---------|-----|---------|
| Type A | GitHub Actions | LockService未使用、フォルダ同期漏れ | ✅ 自動 |
| Type B | Gemini監査/人間レビュー | 設計ミス、仕様違反 | 手動 |
| Type C | ユーザー報告/ログ | 実行時エラー、UI不具合 | 手動 |

## 運用フロー

```
1. 工程開始前
   └─ 該当工程のPOKAYOKE.md、TROUBLE_LOG.md読了（必須）

2. 工程実施
   └─ チェックリストに従って作業

3. git push
   └─ GitHub Actionsが自動チェック

4. エラー検出時
   ├─ POKA_HISTORY.mdに記録（Type A: 自動、Type B/C: 手動）
   ├─ 修正実施
   ├─ TROUBLE_LOG.mdに過去トラ追加
   └─ POKAYOKE.mdにルール追加（再発防止）
```

## 読了報告フォーマット（技術的検証版）

```markdown
## 工程別読了報告

### 本セッションの作業工程
- [x] 03_GAS_EDITOR

### 読了証明
| ファイル | 行数 | MD5ハッシュ | 最終更新 |
|---------|------|------------|---------|
| 03_GAS_EDITOR/POKAYOKE.md | XX | XXXXXXXX | YYYY-MM-DD |
| 03_GAS_EDITOR/TROUBLE_LOG.md | XX | XXXXXXXX | YYYY-MM-DD |

### 読了確認
上記ファイルの内容を読了しました: ✅
```

## ドキュメントメンテナンスルール

| ドキュメント | 更新タイミング | 責任者 | レビュー |
|-------------|---------------|--------|---------|
| POKAYOKE.md | ポカ発生時 | Claude Code | Gemini監査 |
| TROUBLE_LOG.md | ポカ修正完了時 | Claude Code | 人間承認 |
| POKA_HISTORY.md | ポカ検出時 | GitHub Actions/Claude Code | 不要 |
| INDEX.md | 月次 | Claude Code | 人間確認 |

## 月次レビュー項目

- [ ] 工程別ポカ発生数の確認
- [ ] 再発率が高い工程の特定
- [ ] 該当工程のPOKAYOKE.md見直し
- [ ] 新規ルール追加の検討
- [ ] INDEX.mdの統計更新

## 関連ドキュメント

- CLAUDE.md: 全体ルール
- .github/workflows/gas-pokayoke.yml: 自動チェックワークフロー
