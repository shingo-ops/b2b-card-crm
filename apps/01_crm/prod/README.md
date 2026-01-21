# CRM ダッシュボード - セットアップ手順

## ファイル構成

```
crm-dashboard/
├── .clasp.json          # clasp設定
├── appsscript.json      # GASプロジェクト設定
├── Code.gs              # メインエントリーポイント
├── Config.gs            # 設定・定数
├── SheetService.gs      # スプレッドシート操作
├── AssignService.gs     # アサイン移行処理
├── ReminderService.gs   # 48時間リマインド
├── ProspectRank.gs      # 見込度自動計算
├── ArchiveService.gs    # 自動アーカイブ
├── Triggers.gs          # トリガー管理
├── WebApp.gs            # Webアプリ
└── html/
    ├── index.html       # ダッシュボード
    ├── leads.html       # リード一覧
    ├── deals.html       # 商談管理
    ├── staff.html       # 担当者管理
    └── css/
        └── style.html   # スタイルシート
```

## セットアップ手順

### Step 1: ZIPを解凍

```bash
cd ~/b2b-sales-system/
unzip crm-dashboard.zip
```

### Step 2: claspにログイン（未ログインの場合）

```bash
clasp login
```

### Step 3: GASにプッシュ

```bash
cd crm-dashboard
clasp push
```

「Would you like to update the manifest?」と聞かれたら `y` を選択。

### Step 4: スクリプトプロパティを設定

GASエディタを開く：
```bash
clasp open
```

1. 左メニュー「⚙ プロジェクトの設定」
2. 「スクリプトプロパティ」に以下を追加：

| プロパティ名 | 値 |
|-------------|-----|
| DISCORD_WEBHOOK_URL | （DiscordのWebhook URL） |
| NSREMIND_DISCORDWEBHOOK | （同上でOK） |

### Step 5: 初期設定を実行

GASエディタで：
1. `SheetService.gs` を開く
2. `initializeSpreadsheet` 関数を選択
3. ▶ 実行

→ シート作成、ヘッダー設定、入力規則、トリガーが自動設定される

### Step 6: テストデプロイ

```bash
clasp deploy --deploymentId AKfycbwGUUcdUs_L-a4c9Ux9PBPuX9X6t5YMGVnlInL5RGOq63a2QfaJUgIbNdV4ylcN0Xou2g --description "テスト"
```

### Step 7: 動作確認

テストURL: https://script.google.com/macros/s/AKfycbwGUUcdUs_L-a4c9Ux9PBPuX9X6t5YMGVnlInL5RGOq63a2QfaJUgIbNdV4ylcN0Xou2g/exec?authuser=0

---

## 機能一覧

### Phase 1（今回実装済み）

| 機能 | 説明 |
|------|------|
| ✅ シート構成 | 8シート自動作成 |
| ✅ ヘッダー設定 | 全シートのヘッダー設定 |
| ✅ 入力規則 | プルダウン設定 |
| ✅ アサイン移行 | リード→商談への移行 |
| ✅ リード種別自動入力 | IN/OUT自動記録 |
| ✅ Discord通知 | アサイン時に通知 |
| ✅ 48時間リマインド | 未対応案件通知 |
| ✅ シート更新日 | 自動記録 |
| ✅ 見込度自動計算 | マトリクス判定 |
| ✅ 自動アーカイブ | 成約/失注で移動 |
| ✅ Webアプリ | ダッシュボード表示 |

### カスタムメニュー

スプレッドシートの「🎯 CRM」メニューから：
- 初期設定
- アサイン移行
- アーカイブ操作
- 見込度再計算
- トリガー管理

---

## トラブルシューティング

### 「認証が必要です」エラー

→ 初回実行時は認証が必要。「権限を確認」→「許可」

### Discord通知が来ない

→ スクリプトプロパティの `DISCORD_WEBHOOK_URL` を確認

### シートが作成されない

→ スプレッドシートIDが正しいか確認（Config.gs内）

---

## 本番デプロイ

テスト確認後：

```bash
clasp deploy --deploymentId AKfycby0KA0YQU67azLGSrnLLzWTnh1tf2SObBg4-6FaRC5esAF5IdZbqShr3LHlsJbdHkmlVw --description "本番"
```

本番URL: https://script.google.com/macros/s/AKfycby0KA0YQU67azLGSrnLLzWTnh1tf2SObBg4-6FaRC5esAF5IdZbqShr3LHlsJbdHkmlVw/exec?authuser=0
