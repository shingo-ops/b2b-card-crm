# 削除されたHTMLファイルのアーカイブ

このファイルはSPA統一のために削除されたHTMLファイルのバックアップです。
削除日: 2026-01-12

## 理由
- index.htmlがSPA（Single Page Application）として全ページを含んでいる
- leads.html, deals.html, staff.html, dashboard.htmlは使われていない
- doGet()を常にindex.htmlを返すように統一した

---

## leads.html (685行)

```html
<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <?!= include('style'); ?>
</head>
<body>
  <div class="container">
    <!-- ヘッダー -->
    <header class="header">
      <h1><?= pageTitle ?></h1>
      <nav class="nav">
        <a href="?page=dashboard" class="nav-link">ダッシュボード</a>
        <a href="?page=leads-in" class="nav-link">リード（IN）</a>
        <a href="?page=leads-out" class="nav-link">リード（OUT）</a>
        <a href="?page=deals" class="nav-link">商談管理</a>
      </nav>
    </header>
    <!-- コンテンツは省略（フォーム、モーダル、JavaScriptなど） -->
  </div>
</body>
</html>
```

**主な機能:**
- リード一覧表示
- 新規リード追加モーダル
- 重複検知アラート
- リード詳細/編集モーダル
- 離脱アーカイブ機能

---

## deals.html (220行)

```html
<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <?!= include('style'); ?>
</head>
<body>
  <div class="container">
    <header class="header">
      <h1><?= pageTitle ?></h1>
      <!-- ナビゲーション -->
    </header>
    <!-- フィルター、商談一覧テーブル -->
  </div>
</body>
</html>
```

**主な機能:**
- 商談一覧表示
- ステータス/担当者/種別フィルタ
- 期限切れハイライト

---

## staff.html (112行)

```html
<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <?!= include('style'); ?>
</head>
<body>
  <div class="container">
    <header class="header">
      <h1><?= pageTitle ?></h1>
    </header>
    <!-- 担当者一覧テーブル -->
  </div>
</body>
</html>
```

**主な機能:**
- 担当者一覧表示
- スプレッドシートへのリンク

---

## dashboard.html (126行)

```html
<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <?!= include('style'); ?>
</head>
<body>
  <div class="container">
    <header class="header">
      <h1>CRM ダッシュボード</h1>
    </header>
    <!-- KPIカード、ステータス別、売上表示 -->
  </div>
</body>
</html>
```

**主な機能:**
- KPI表示（リード数、商談数、成約率）
- ステータス別件数
- 累計売上

---

## 復元方法

これらのファイルを復元する必要がある場合:
1. このマークダウンファイルからHTMLコードをコピー
2. crm-dashboardフォルダに対応するファイルを作成
3. WebApp.gsのdoGet()を修正してページルーティングを復活

**注意**: SPA方式のindex.htmlに統一しているため、通常は復元不要です。
