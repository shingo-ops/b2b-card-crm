# CRM プロジェクトマスター

## 最終更新: 2026-01-12
## バージョン: 1.1
## ステータス: 設計完了、実装待ち

---

# 1. プロジェクト概要

## 1.1 目的

- インバウンド/アウトバウンドの営業管理を統合
- 既存のスプレッドシート運用をWebアプリ化
- GAS機能（アサイン移行、Discord通知）を引き継ぎ
- 見込度の自動計算で営業効率を向上

## 1.2 関連ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| COMMON_RULES.md | 共通ルール（議論フレームワーク、技術スタック等） |
| CRM_SPEC_v1.md | 詳細仕様（列構成、GAS機能等） |

---

# 2. 既存システム

## 2.1 移行元スプレッドシート

| 種類 | スプレッドシートID | URL |
|------|-------------------|-----|
| インバウンド | 1BTNIuP7Gi8sNHeahBhPxqmieKotVlBttJXoGwuxUddE | https://docs.google.com/spreadsheets/d/1BTNIuP7Gi8sNHeahBhPxqmieKotVlBttJXoGwuxUddE/edit |
| アウトバウンド | 1zzSMCsvdfl-Yh4CcaNQmrLbLuhuSG5mhU6sEX3qiG8w | https://docs.google.com/spreadsheets/d/1zzSMCsvdfl-Yh4CcaNQmrLbLuhuSG5mhU6sEX3qiG8w/edit |

## 2.2 既存シート構成

### インバウンド
| シート名 | 用途 |
|----------|------|
| 新規問い合わせ | アサイン前（フィルタリング）|
| アサイン確認 | 商談管理（メイン）|
| Analysis | 営業分析ダッシュボード |
| 設定 | 担当者情報、入力規則 |

### アウトバウンド
| シート名 | 用途 |
|----------|------|
| アポイント前 | アサイン前（フィルタリング）|
| アサイン確認 | 商談管理（メイン）|
| フローチャート | テンプレートメッセージ |
| 設定 | 担当者情報、入力規則 |

## 2.3 既存GAS機能

### アサイン移行スクリプト（参考コード）

```javascript
/**
 * 実行本体
 * 要件:
 * - アクティブシートが「新規問い合わせ」の時のみ実行
 * - 抽出条件: 「担当者」列 と 「担当者ID」列 が両方入っている行
 * - 「進捗」列は移行しない
 * - 移行先: 「アサイン確認」シートの最下行
 * - 移行後: 各行ごとに 担当者ID へ Discord メンション通知
 */
function runAssignMigration() {
  const ss = SpreadsheetApp.getActive();
  const src = ss.getActiveSheet();
  const SRC_NAME = '新規問い合わせ';
  const DST_NAME = 'アサイン確認';

  if (!src || src.getName() !== SRC_NAME) {
    SpreadsheetApp.getActiveSpreadsheet().toast('「新規問い合わせ」シートを開いてから実行してください。', '実行ガード', 5);
    return;
  }

  const dst = ss.getSheetByName(DST_NAME);
  if (!dst) {
    SpreadsheetApp.getActiveSpreadsheet().toast(`移行先シート「${DST_NAME}」が見つかりません。`, 'エラー', 8);
    return;
  }

  // Webhook（スクリプトプロパティから）
  const WEBHOOK = PropertiesService.getScriptProperties().getProperty('DISCORD_WEBHOOK_URL');
  if (!WEBHOOK) {
    SpreadsheetApp.getActiveSpreadsheet().toast('DISCORD_WEBHOOK_URL が未設定です。', 'エラー', 8);
    return;
  }

  // 以下、移行処理...
}
```

### リマインド通知スクリプト（参考コード）

```javascript
/**
 * 時間主導型トリガーで実行するリマインド関数
 * 「対応中」のまま48時間経過した案件を通知
 */
function checkAndRemind() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const statusCol = headers.indexOf("進捗");
  const updateCol = headers.indexOf("シート更新日");
  const customerNameCol = headers.indexOf("顧客名");
  const staffIdCol = headers.indexOf("担当者ID");
  
  const webhookUrl = PropertiesService.getScriptProperties().getProperty("NSREMIND_DISCORDWEBHOOK");

  const now = new Date();
  const threshold = 48 * 60 * 60 * 1000; // 48時間

  for (let i = 1; i < data.length; i++) {
    const status = data[i][statusCol];
    const lastUpdate = data[i][updateCol];
    const customerName = customerNameCol !== -1 ? data[i][customerNameCol] : "不明";
    const staffId = staffIdCol !== -1 ? data[i][staffIdCol] : "";

    if (status === "対応中" && lastUpdate instanceof Date) {
      if (now.getTime() - lastUpdate.getTime() > threshold) {
        sendDiscordNotification(webhookUrl, i + 1, customerName, staffId);
      }
    }
  }
}

function sendDiscordNotification(url, rowNum, name, staffId) {
  const mention = staffId ? `<@${staffId}>\n` : "";
  
  const payload = {
    content: `${mention}${name} 様の商談が「対応中」のまま48時間を経過しています。(${rowNum}行目)\n状況を確認して対応をお願いいたします🤲`
  };
  
  UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
}
```

---

# 3. 新CRM設計

## 3.1 スプレッドシート情報

| 項目 | 内容 |
|------|------|
| スプレッドシートID | 1kF-o4jCrbQePktWaFEBvWhJJjRXhkuw5-AcISa4ClAk |
| URL | https://docs.google.com/spreadsheets/d/1kF-o4jCrbQePktWaFEBvWhJJjRXhkuw5-AcISa4ClAk/edit?authuser=0 |
| Script ID | 1CQiLiFG8N77uYzlo3UNgAwml9_8mAJYAmfe4thp3RGsvbiwoaS-kS7X0 |

## 3.2 シート構成

```
CRMスプレッドシート（統合版）- 14シート
│
├─ 【リード管理】
│   ├── リード一覧（IN）       ← インバウンドのアサイン前
│   └── リード一覧（OUT）      ← アウトバウンドのアサイン前
│
├─ 【商談管理】
│   ├── 商談管理               ← アサイン後（統合、リード種別列で区別）
│   ├── アーカイブ             ← 成約/失注/対象外
│   ├── 商談レポート           ← 商談結果レポート保存先
│   └── 会話ログ（商談用）     ← 商談の会話記録
│
├─ 【AI機能】
│   └── Buddy対話ログ          ← AIコーチ対話履歴
│
├─ 【マスタ・設定】
│   ├── 担当者マスタ           ← 営業担当者情報
│   ├── 設定                   ← 入力規則、プルダウン選択肢
│   ├── 権限設定               ← 役割別権限マトリクス
│   ├── 目標設定               ← KPI目標管理
│   └── 通知設定               ← Discord Webhook設定
│
├─ 【その他】
│   ├── ダッシュボード         ← 分析用（スプレッドシート内）
│   └── テンプレート           ← メッセージテンプレート
```

**注意**: 顧客マスタ（M_Customer）は取引管理スプレッドシート（別ファイル）に存在します。

## 3.3 インバウンド/アウトバウンドの区別

| 場所 | 区別方法 |
|------|----------|
| Webアプリ | ページを分ける |
| スプレッドシート（アサイン前） | シートを分ける（IN/OUT） |
| スプレッドシート（アサイン後） | 「リード種別」列で区別 |

**GASでの自動入力：**
- リード一覧（IN）から移行 → リード種別 = 「インバウンド」
- リード一覧（OUT）から移行 → リード種別 = 「アウトバウンド」

---

# 4. 列構成

## 4.1 リード一覧（IN/OUT共通）

| # | 列名 | 用途 | 入力者 | 入力規則 |
|---|------|------|--------|----------|
| 1 | リードID | 一意識別子 | 自動 | LD-00001形式 |
| 2 | 登録日 | リード登録日 | 自動 | |
| 3 | 流入経路 | どこから来たか | CS | プルダウン |
| 4 | 会社名 | 顧客の会社名 | CS | |
| 5 | 顧客名 | 担当者名 | CS | |
| 6 | 呼び方（英語） | メッセージで使う名前 | CS | 例: John |
| 7 | 国 | 顧客の国 | CS | プルダウン |
| 8 | メール | 連絡先 | CS | |
| 9 | 電話番号 | 連絡先 | CS | |
| 10 | SNS/連絡手段 | Discord, Instagram等 | CS | |
| 11 | メッセージURL | やり取りのURL | CS | |
| 12 | 初回接触日 | 最初に連絡した日 | CS | |
| 13 | 温度感 | 高/中/低 | CS | プルダウン |
| 14 | 想定規模 | 大口/中規模/小口 | CS | プルダウン |
| 15 | 顧客タイプ | 信頼重視/価格重視/不明 | CS | プルダウン |
| 16 | 返信速度 | 24h以内/48h以内/3日以上 | CS | プルダウン |
| 17 | 見込度 | A/B+/B/B-/仮C/確定C | 自動計算 | |
| 18 | 備考 | 自由記入 | CS | |
| 19 | 担当者 | アサイン先 | CS | プルダウン |
| 20 | 担当者ID | Discord ID | 自動 | |
| 21 | 進捗 | アサイン前ステータス | CS | プルダウン |
| 22 | シート更新日 | 最終更新 | 自動 | |

## 4.2 商談管理（アサイン後）

| # | 列名 | 用途 | 入力者 |
|---|------|------|--------|
| 1 | リードID | 紐付け用 | 自動 |
| 2 | リード種別 | IN/OUT | 自動 |
| 3 | アサイン日 | 担当者に渡した日 | 自動 |
| 4-19 | （リード一覧から継承） | | |
| 20 | 商談ステータス | 初回連絡/提案中/見積中/クロージング/成約/失注/保留 | 営業 |
| 21 | 次回アクション | 次に何をするか | 営業 |
| 22 | 次回アクション日 | 期限 | 営業 |
| 23 | 商談メモ | 進捗記録 | 営業 |
| 24 | 相手の課題 | 提案材料 | 営業 |
| 25 | 取り扱いタイトル | Pokemon等 | 営業 |
| 26 | 販売形態 | 実店舗/EC/ライブ配信/複合 | 営業 |
| 27 | 月間見込み金額 | 予想金額 | 営業 |
| 28 | 初回取引日 | 成約日 | 営業 |
| 29 | 初回取引金額 | 成約金額 | 営業 |
| 30 | 累計取引金額 | 合計金額 | 自動計算 |
| 31 | 競合比較中 | はい/いいえ | 営業 |
| 32 | 通知確認 | Discord送信結果 | 自動 |
| 33 | シート更新日 | 最終更新 | 自動 |
| 34 | 備考 | 自由記入 | 営業 |

## 4.3 担当者マスタ

| # | 列名 | 用途 | 例 |
|---|------|------|-----|
| 1 | 担当者ID | 一意識別子 | EMP-001 |
| 2 | 氏名（日本語） | 表示用 | 田中太郎 |
| 3 | 氏名（英語） | テンプレート用 | Taro Tanaka |
| 4 | メール | 連絡先 | tanaka@example.com |
| 5 | Discord ID | 通知用 | 123456789012345678 |
| 6 | 役割 | CS/営業/管理者 | 営業 |
| 7 | ステータス | 有効/無効 | 有効 |
| 8 | 元候補者ID | 採用診断との連携 | APP-001 |

## 4.4 設定シートの追加列（商談レポート用）

| 列名 | 選択肢 |
|------|--------|
| 商談結果 | 成約, 失注, 追客, 見送り, 対象外 |
| 取り扱い商材 | Pokemon, One Piece, Yu-Gi-Oh!, Dragon Ball, その他 |
| 販売先 | 実店舗, EC, ライブ配信, 卸売, 複合, その他 |
| 信頼重視/価格重視 | 信頼重視, 価格重視, 不明 |
| 購入頻度(月次) | 週1以上, 週1, 月2-3回, 月1, 不定期, 不明 |

---

# 5. 見込度の自動計算

## 5.1 判定マトリクス

| ランク | 重視ポイント | 規模 | 返信速度 | 対応方針 |
|--------|-------------|------|----------|----------|
| A | 信頼重視 | 大口 | 24h以内 | 最優先 |
| B+ | 価格重視 | 大口 | 24h以内 | 価値訴求 |
| B | 信頼重視 | 中小 | 48h以内 | 通常対応 |
| B- | 価格重視 | 中小 | 48h以内 | テスト取引提案 |
| 仮C | 不明 | 不明 | 遅い | 追加ヒアリング |
| 確定C | 価格のみ | 小口 | なし | お断り |

## 5.2 C条件チェックリスト

- [ ] 返信が3日以上ない
- [ ] 「個人で少量購入したい」と明言
- [ ] 月間見込み10万円未満
- [ ] 「価格だけ教えて」で終わる
- [ ] 具体的な質問がない（情報収集のみ）

**3つ以上該当 → 確定C → お断りテンプレート送付OK**
**1-2つ該当 → 仮C → 追加ヒアリング**

## 5.3 自動判定ロジック

```javascript
function calculateProspectRank(lead) {
  // C条件カウント
  let cConditions = 0;
  if (lead.返信速度 === '3日以上') cConditions++;
  if (lead.想定規模 === '小口' && lead.顧客タイプ === '個人') cConditions++;
  if (lead.月間見込み金額 < 100000) cConditions++;
  // ... 他のC条件
  
  if (cConditions >= 3) return '確定C';
  if (cConditions >= 1) return '仮C';
  
  // 通常判定
  if (lead.顧客タイプ === '信頼重視' && lead.想定規模 === '大口') return 'A';
  if (lead.顧客タイプ === '価格重視' && lead.想定規模 === '大口') return 'B+';
  if (lead.顧客タイプ === '信頼重視' && lead.想定規模 !== '大口') return 'B';
  if (lead.顧客タイプ === '価格重視' && lead.想定規模 !== '大口') return 'B-';
  
  return 'B'; // 判断材料不足
}
```

※金額の閾値は後から調整予定

---

# 6. GAS機能

## 6.1 Phase 1（今回実装）

| 機能 | 内容 | トリガー |
|------|------|----------|
| アサイン移行 | リード一覧 → 商談管理に移動 | 手動実行 |
| リード種別自動入力 | IN/OUTを自動記録 | 移行時 |
| Discord通知（アサイン時） | 担当者にメンション | 移行時 |
| 48時間リマインド | 未対応案件を通知 | 時間主導（1時間ごと） |
| シート更新日 | 編集時に自動記録 | onEdit |
| 見込度自動計算 | マトリクスに基づき判定 | 関連項目の編集時 |
| 成約時の自動アーカイブ | ステータスが「成約」→アーカイブに移動 | 編集時 |

## 6.2 Phase 2（運用開始後）

| 機能 | 内容 |
|------|------|
| テンプレート自動生成 | [Name], [Your Name]を自動置換 |
| 次回アクション日リマインド | 期限当日の朝に通知 |

## 6.3 Phase 3（データ蓄積後）

| 機能 | 内容 |
|------|------|
| 週次レポート自動生成 | 毎週月曜に商談状況をDiscord投稿 |
| 重複チェック | 同じメール/会社名でアラート |

---

# 7. テンプレート機能

## 7.1 自動置換変数

| 変数 | 置換内容 | 取得元 |
|------|----------|--------|
| [Name] | 顧客の呼び方 | 「呼び方（英語）」列 |
| [Your Name] | 担当者の英語名 | 担当者マスタ「氏名（英語）」列 |

## 7.2 テンプレート例

### 確定Cお断り
```
Hi [Name],

Thank you for your interest in our products.

Currently, we focus on B2B partnerships with retailers and 
businesses ordering on a regular basis.

If your business grows in the future and you're looking for 
a reliable Japanese supplier, please don't hesitate to reach out again.

Best regards,
[Your Name]
```

### 仮C追加ヒアリング
```
Hi [Name],

Thanks for reaching out!

To better understand your needs, could you share:
- What's your typical monthly order volume?
- Do you have a retail store or sell online?

This helps us see if we're a good fit for your business.

Best,
[Your Name]
```

---

# 8. 会話ログDB連携

## 8.1 スプレッドシート情報

| 項目 | 内容 |
|------|------|
| スプレッドシートID | 1J4VFKwwV5xbEy15TrbwriFRDiYTH-YfrVTzwTQJpXpI |
| URL | https://docs.google.com/spreadsheets/d/1J4VFKwwV5xbEy15TrbwriFRDiYTH-YfrVTzwTQJpXpI/edit?authuser=0 |

## 8.2 シート構成

| シート名 | 内容 |
|---------|------|
| ログマスタ | 全ての会話ログ（1行=1発言） |
| 要約マスタ | 会話ごとの日本語要約 |
| 専門用語辞書 | 翻訳精度を上げるための辞書 |

## 8.3 専門用語辞書

| 英語 | 日本語 | カテゴリ |
|------|--------|----------|
| Box | ボックス | 商品形態（30パック入り） |
| Case | ケース | 商品形態（6ボックス入り） |
| Sealed | シュリンク付き | 状態（未開封） |

---

# 9. Webアプリ

## 9.1 デプロイ情報

| 環境 | Deployment ID |
|------|---------------|
| 本番 | AKfycbzpeOkyBzA0kyD6T9aDE1uYVIil1z6KY0Ssc6Hta5EX7xoIAk_-EkxgmjILhN9Ceg5M |
| テスト | @HEAD（AKfycbwcYOukOoSaPgJjO7e6KBBtDaL0Rinl5-WmW00XMuQ） |

## 9.2 URL

| 環境 | URL |
|------|-----|
| 本番 | https://script.google.com/macros/s/AKfycbzpeOkyBzA0kyD6T9aDE1uYVIil1z6KY0Ssc6Hta5EX7xoIAk_-EkxgmjILhN9Ceg5M/exec?authuser=0 |
| テスト | https://script.google.com/macros/s/AKfycbwcYOukOoSaPgJjO7e6KBBtDaL0Rinl5-WmW00XMuQ/exec?authuser=0 |

## 9.3 ページ構成

| ページ | 用途 |
|--------|------|
| ダッシュボード | KPI表示、分析 |
| リード一覧（IN） | インバウンドのアサイン前 |
| リード一覧（OUT） | アウトバウンドのアサイン前 |
| 商談管理 | アサイン後の商談管理 |
| 顧客詳細 | 顧客情報 + 会話ログ |
| テンプレート | メッセージテンプレート管理 |
| 担当者管理 | 担当者マスタ管理 |
| 設定 | システム設定 |

---

# 10. 採用診断との連携

## 10.1 データフロー

```
採用診断アプリ
  候補者ID: APP-001
       ↓ 採用決定
CRM 担当者マスタ
  担当者ID: EMP-001
  元候補者ID: APP-001
```

---

# 11. 実装タスクリスト

## 11.1 Phase 1（今回）

- [ ] スプレッドシートのシート構成作成
- [ ] 列構成（ヘッダー）の設定
- [ ] 入力規則（プルダウン）の設定
- [ ] アサイン移行GAS（IN/OUT両対応）
- [ ] リード種別自動入力
- [ ] Discord通知（アサイン時）
- [ ] 48時間リマインド
- [ ] シート更新日の自動記録
- [ ] 見込度の自動計算
- [ ] 成約時の自動アーカイブ
- [ ] Webアプリ（基本画面）
- [ ] テストデプロイで動作確認

## 11.2 既存データの移行

- [ ] インバウンド > 新規問い合わせ → リード一覧（IN）
- [ ] インバウンド > アサイン確認 → 商談管理
- [ ] アウトバウンド > アポイント前 → リード一覧（OUT）
- [ ] アウトバウンド > アサイン確認 → 商談管理
- [ ] 設定の統合
- [ ] テンプレートの統合

---

# 12. スクリプトプロパティ

| プロパティ名 | 必須 | 説明 |
|-------------|------|------|
| SPREADSHEET_ID | ✅ | CRMスプレッドシートID |
| DISCORD_WEBHOOK_URL | ✅ | アサイン通知用 |
| NSREMIND_DISCORDWEBHOOK | ✅ | リマインド通知用 |
| CONVERSATION_LOG_SPREADSHEET_ID | 任意 | 会話ログDB連携用 |
| GEMINI_API_KEY | 任意 | AI機能用 |

---

# 13. 更新履歴

| 日付 | バージョン | 更新内容 |
|------|-----------|----------|
| 2026-01-12 | 1.1 | 設定シートの追加列（商談レポート用）を追加 |
| 2026-01-10 | 1.0 | 初版作成。CRM仕様を集約、既存GASコード参照を追加 |
