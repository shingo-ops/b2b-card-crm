# GAS Webアプリ開発 教訓集

## 最終更新: 2026-01-11
## バージョン: 1.1

---

# 概要

このドキュメントは、Google Apps Script (GAS) + スプレッドシートを使ったWebアプリ開発で発生した問題と解決策をまとめたものです。同じ問題の再発防止と、今後の開発効率向上を目的としています。

---

# 1. スタンドアロン vs バインドスクリプト

## 1.1 2つの種類

| 種類 | 作成方法 | 特徴 |
|------|----------|------|
| **スタンドアロン** | `clasp create` / GASエディタで直接作成 | スプレッドシートと独立 |
| **バインド** | スプレッドシートの「拡張機能 → Apps Script」 | スプレッドシートに内蔵 |

## 1.2 発生した問題

```
エラー: Cannot call SpreadsheetApp.getUi() from this context.
```

**原因**: スタンドアロンスクリプトでは `SpreadsheetApp.getUi()` が使えない

## 1.3 解決策

**バインドスクリプトを使用する**

```
【推奨】バインドスクリプトの作成手順

1. スプレッドシートを開く
2. 「拡張機能」→「Apps Script」をクリック
3. 新しいGASプロジェクトが開く（これがバインドスクリプト）
4. URLからScript IDをコピー
5. .clasp.json のscriptIdを更新
```

## 1.4 バインドスクリプトのメリット

- ✅ `onOpen()` でカスタムメニューが自動表示
- ✅ `SpreadsheetApp.getActiveSpreadsheet()` で自動的に紐付いたシートを取得
- ✅ スプレッドシートIDのハードコードが不要

## 1.5 開発フロー（clasp使用時）

```bash
# バインドスクリプトのScript IDを.clasp.jsonに設定
{
  "scriptId": "バインドスクリプトのID",
  ...
}

# 以降は通常通り開発可能
clasp push
clasp deploy
```

---

# 2. HTMLファイルの配置とパス

## 2.1 発生した問題

HTMLファイルをサブフォルダに配置したら、ページが表示されない（真っ白）

```
ローカル構成:
html/
  ├── index.html
  ├── leads.html
  └── css/
      └── style.html

WebApp.gs:
template = HtmlService.createTemplateFromFile('html/leads');  // ❌ 動かない
```

## 2.2 原因

GASの `createTemplateFromFile()` はサブフォルダパスの扱いが不安定。`clasp push` でファイル名が変換される際に問題が発生。

## 2.3 解決策

**HTMLファイルはルートディレクトリに配置する**

```
推奨構成:
crm-dashboard/
  ├── Config.gs
  ├── WebApp.gs
  ├── dashboard.html    ← ルートに配置
  ├── leads.html        ← ルートに配置
  ├── deals.html        ← ルートに配置
  └── style.html        ← ルートに配置

WebApp.gs:
template = HtmlService.createTemplateFromFile('leads');  // ✅ 動く
```

---

# 3. include関数の必要性

## 3.1 発生した問題

HTMLファイル内で `<?!= include('style'); ?>` を使うと、ページが表示されない

## 3.2 原因

`include()` はGASの組み込み関数ではない。自分で定義する必要がある。

## 3.3 解決策

**WebApp.gs に include関数を定義する**

```javascript
/**
 * HTMLファイルをインクルードする
 * @param {string} filename - ファイル名（拡張子なし）
 * @return {string} HTMLコンテンツ
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
```

**HTMLでの使用方法:**
```html
<head>
  <?!= include('style'); ?>
</head>
```

---

# 4. クライアントからGAS関数の呼び出し

## 4.1 発生した問題

HTMLのJavaScriptから直接GASの定数や関数にアクセスしようとしてエラー

```javascript
// ❌ 動かない例
google.script.run.DROPDOWN_OPTIONS;
google.script.run.doPost({...});
```

## 4.2 原因

- 定数（`const DROPDOWN_OPTIONS`）には直接アクセスできない
- `doPost()` はHTTPリクエスト用であり、クライアントから呼べない

## 4.3 解決策

**専用の関数を作成し、google.script.run.関数名() で呼び出す**

```javascript
// GAS側（Config.gs）
function getDropdownOptions() {
  return DROPDOWN_OPTIONS;
}

// HTML側（JavaScript）
google.script.run
  .withSuccessHandler(function(options) {
    // optionsを使用
  })
  .withFailureHandler(function(error) {
    console.error(error);
  })
  .getDropdownOptions();  // ✅ 関数名で呼び出し
```

## 4.4 API関数の設計パターン

```javascript
// GAS側に必要な関数を用意
function getLeads(sheetName) { ... }      // データ取得
function addNewLead(sheetName, data) { ... }  // データ追加
function updateLead(sheetName, id, data) { ... }  // データ更新
function getStaffList() { ... }           // マスタ取得
function getDropdownOptions() { ... }     // 選択肢取得
```

---

# 5. ナビゲーションリンクの形式

## 5.1 発生した問題

ナビゲーションリンクをクリックすると白画面になる

```
クリック後のURL:
https://xxx-script.googleusercontent.com/userCodeAppPanel?page=leads-in
↑ 無効なURL
```

## 5.2 原因

GAS Webアプリは Google の iframe（サンドボックス）内で動作する。
相対リンク `?page=xxx` を使うと、iframe内部のURLに解決されてしまう。

## 5.3 解決策

**絶対URLを使用する**

```html
<!-- ❌ 相対リンク（動かない） -->
<a href="?page=leads-in&authuser=0">リード（IN）</a>

<!-- ✅ 絶対URL（動く） -->
<a href="https://script.google.com/macros/s/DEPLOYMENT_ID/exec?page=leads-in&authuser=0">リード（IN）</a>
```

## 5.4 authuser=0 について

複数のGoogleアカウントでログインしている場合、`authuser=0` を付けないと間違ったアカウントで開いてしまう可能性がある。

```
推奨: 全てのURLに ?authuser=0 または &authuser=0 を付与
```

---

# 6. デプロイメント管理

## 6.1 テスト環境と本番環境

| 環境 | 用途 | Deployment ID |
|------|------|---------------|
| テスト | 開発確認用 | 固定ID（テスト用） |
| 本番 | 実運用 | 固定ID（本番用） |

## 6.2 デプロイコマンド

```bash
# テストデプロイ
clasp deploy --deploymentId テスト用ID --description "テスト"

# 本番デプロイ
clasp deploy --deploymentId 本番用ID --description "本番"
```

## 6.3 デプロイ時の注意

- Deployment IDを固定にすることで、URLが変わらない
- 新しいデプロイ（`clasp deploy` のみ）は新しいIDが発行されるので注意

---

# 7. よくあるエラーと対処法

## 7.1 認証エラー

```
Error: invalid_grant / invalid_rapt
```

**対処**: `clasp login` で再認証

## 7.2 ファイル重複エラー

```
Error: A file with this name already exists
```

**対処**: 
```bash
clasp pull --force  # GASから最新を取得
rm -f *.js          # .jsファイルを削除（.gsと重複）
clasp push --force  # 再プッシュ
```

## 7.3 権限エラー

```
Exception: You do not have permission to call...
```

**対処**: GASエディタで関数を手動実行し、権限を承認

---

# 8. 開発チェックリスト

## 8.1 プロジェクト開始時

- [ ] バインドスクリプトを使用（スプレッドシートから作成）
- [ ] Script IDを確認し、.clasp.json に設定
- [ ] appsscript.json の設定を確認

## 8.2 HTMLファイル作成時

- [ ] ルートディレクトリに配置
- [ ] include関数を定義（CSSやJS共通部分用）
- [ ] ナビゲーションリンクは絶対URL
- [ ] authuser=0 を付与

## 8.3 API関数作成時

- [ ] クライアントから呼ぶ関数は専用に作成
- [ ] 定数は関数でラップして返す
- [ ] エラーハンドリングを実装

## 8.4 デプロイ前

- [ ] clasp push でエラーがないか確認
- [ ] テスト環境でまず確認
- [ ] 全ページの表示を確認
- [ ] ナビゲーションの動作を確認

---

# 9. 推奨ファイル構成

```
project-name/
├── .clasp.json           # clasp設定
├── appsscript.json       # GASプロジェクト設定
│
├── Config.gs             # 設定・定数
├── Code.gs               # エントリーポイント（onOpen等）
├── WebApp.gs             # Webアプリ（doGet, doPost, include）
├── SheetService.gs       # スプレッドシート操作
├── [機能名]Service.gs    # 機能ごとのサービス
│
├── dashboard.html        # ダッシュボード
├── [ページ名].html       # 各ページ
├── style.html            # 共通CSS
│
├── README.md             # セットアップ手順
├── [PROJECT]_SPEC.md     # 詳細仕様書
└── GAS_WEBAPP_LESSONS_LEARNED.md  # この教訓集
```

---

# 10. UIデザイン標準

## 10.1 サイドバーナビゲーション

GAS Webアプリのナビゲーションは、左固定サイドバー形式を標準とする。

### レイアウト図

```
┌─────────────┬────────────────────────────────────┐
│             │                                    │
│  サイドバー  │       メインコンテンツ              │
│  (220px)    │       (残り全幅)                   │
│             │                                    │
│  ┌────────┐ │                                    │
│  │ロゴ/名称│ │                                    │
│  └────────┘ │                                    │
│             │                                    │
│  ├ メニュー1│                                    │
│  ├ メニュー2│                                    │
│  ├ メニュー3│                                    │
│  │          │                                    │
│  ├─分割線──│                                    │
│  │          │                                    │
│  ├ 管理設定 │                                    │
│             │                                    │
└─────────────┴────────────────────────────────────┘
```

### 仕様

| 項目 | 値 |
|------|-----|
| 幅 | 220px |
| 位置 | 左固定（`position: fixed`） |
| 高さ | 100vh（画面全高） |
| 背景色 | #2c3e50 |
| ヘッダー | グラデーション（#667eea → #764ba2） |
| アクティブ表示 | 左ボーダー + 背景ハイライト |
| z-index | 100 |

### メニュー構成ルール

1. **基本メニュー**: 業務で頻繁に使用するページ（ダッシュボード、リード、商談等）
2. **分割線**: 主要メニューと管理系メニューの間に挿入
3. **管理メニュー**: 設定・管理者向け機能は最下部に配置
4. **カウント表示**: 件数を表示する場合は右端にバッジ形式

### HTML構造

```html
<!-- サイドバー -->
<aside class="sidebar">
  <div class="sidebar-header">
    <h1>🎯 アプリ名</h1>
  </div>
  <nav class="sidebar-menu">
    <a class="sidebar-menu-item active" data-page="dashboard">
      <span class="menu-icon">📊</span>
      ダッシュボード
    </a>
    <a class="sidebar-menu-item" data-page="page1">
      <span class="menu-icon">📥</span>
      ページ1
      <span class="menu-count" id="countPage1">-</span>
    </a>
    <div class="sidebar-divider"></div>
    <a class="sidebar-menu-item" data-page="admin">
      <span class="menu-icon">⚙️</span>
      管理者設定
    </a>
  </nav>
</aside>

<!-- メインコンテンツ -->
<div class="main-content">
  <div class="container">
    <!-- ページコンテンツ -->
  </div>
</div>
```

### CSS例

```css
/* サイドバー */
.sidebar {
  width: 220px;
  position: fixed;
  left: 0;
  top: 0;
  height: 100vh;
  background: #2c3e50;
  color: white;
  z-index: 100;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  text-align: center;
}

.sidebar-menu {
  flex: 1;
  padding: 20px 0;
  overflow-y: auto;
}

.sidebar-menu-item {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s;
  border-left: 3px solid transparent;
}

.sidebar-menu-item:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.sidebar-menu-item.active {
  background: rgba(255, 255, 255, 0.15);
  color: white;
  border-left-color: #667eea;
}

.sidebar-menu-item .menu-icon {
  margin-right: 10px;
}

.sidebar-menu-item .menu-count {
  margin-left: auto;
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
}

.sidebar-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 16px 20px;
}

/* メインコンテンツ */
.main-content {
  margin-left: 220px;
  min-height: 100vh;
  background: #f5f7fa;
}
```

### JavaScript: ナビゲーション切替

```javascript
function initNavigation() {
  document.querySelectorAll('.sidebar-menu-item').forEach(link => {
    link.addEventListener('click', function() {
      const page = this.dataset.page;
      switchPage(page);
    });
  });
}

function switchPage(page) {
  // アクティブ状態を切り替え
  document.querySelectorAll('.sidebar-menu-item').forEach(link => {
    link.classList.toggle('active', link.dataset.page === page);
  });

  // ページ表示を切り替え
  document.querySelectorAll('.page').forEach(p => {
    p.style.display = p.id === 'page-' + page ? 'block' : 'none';
  });
}
```

### 採用理由

| 観点 | 理由 |
|------|------|
| 視認性 | メニューが常時表示され、現在位置が明確 |
| 操作性 | 縦並びでメニュー項目を追加しやすい |
| GAS対応 | SPAと相性が良く、ページ遷移の問題を回避 |
| 拡張性 | メニューが増えても対応可能（スクロール） |
| モダンUI | 現代的なWebアプリの標準的なデザイン |

---

# 11. 将来の改善案

## 11.1 SPA（Single Page Application）化

現在のマルチページ構成は、ページ移動のたびにサーバーリクエストが発生し遅い。

**改善案**: 1つのHTMLファイル内でコンテンツを切り替えるSPA構成

```
メリット:
- ページ移動が高速（リクエスト不要）
- 操作感がスプレッドシートに近づく
- ナビゲーションリンクの問題も解消
```

## 11.2 キャッシュの活用

頻繁に変わらないデータ（プルダウン選択肢等）はクライアント側でキャッシュ

---

# 更新履歴

| 日付 | バージョン | 更新内容 |
|------|-----------|----------|
| 2026-01-11 | 1.1 | セクション10「UIデザイン標準」追加。サイドバーナビゲーション仕様を規定 |
| 2026-01-11 | 1.0 | 初版作成。CRMダッシュボード開発での教訓を集約 |
