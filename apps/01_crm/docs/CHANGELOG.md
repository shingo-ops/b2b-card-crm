# CRM Dashboard - 変更履歴

## [v1.0.0] - 2025-01-11

### Added
- SPA化（Single Page Application）
  - ダッシュボード、リード一覧、商談管理を1ページに統合
  - データキャッシュによる高速表示
- プルダウン設定のシート管理
  - 設定シートから選択肢を動的取得
  - キャッシュ機能（10分間）
  - メニューから設定反映機能
- API関数追加
  - `getLeads()` - リード一覧取得
  - `addNewLead()` - リード追加
  - `updateLead()` - リード更新
  - `getStaffList()` - 担当者一覧取得
  - `getDeals()` - 商談一覧取得

### Changed
- WebApp.gs: doGet()がindex.htmlを返すように変更
- Config.gs: DROPDOWN_OPTIONS → DEFAULT_DROPDOWN_OPTIONS にリネーム
- SheetService.gs: setDataValidations()が設定シートを参照

### Fixed
- ナビゲーションリンクの白画面問題
- leads.html の loadDropdownOptions() エラー

---

## バージョン履歴

| バージョン | デプロイ | 日付 |
|------------|----------|------|
| @7 | AKfycbz...W2Qm1i | 2025-01-11 |
| @6 | AKfycbz...W2Qm1i | 2025-01-11 |
| @5 | AKfycbz...W2Qm1i | 2025-01-11 |

---

## 形式について

このファイルは [Keep a Changelog](https://keepachangelog.com/ja/1.0.0/) に準拠しています。

### 変更タイプ
- `Added` - 新機能
- `Changed` - 既存機能の変更
- `Deprecated` - 将来削除予定の機能
- `Removed` - 削除された機能
- `Fixed` - バグ修正
- `Security` - セキュリティ修正
