# Human作業手順書: 3環境システムGASプロジェクト作成

> **作成日**: 2026-01-15
> **最終更新**: 2026-01-15
> **対象者**: Human
> **所要時間**: 約0分（自動化済み）
> **前提条件**: clasp loginが完了していること

---

## 重要: 自動化対応

**本手順は自動化されました。**

Claude Codeが`clasp create --type sheets`コマンドで自動作成します。
Human作業は不要です。

---

## 1. 作業概要（5W2H）

| 項目 | 内容 |
|------|------|
| **What（何を）** | GASプロジェクト2つ + スプレッドシート2つを自動作成 |
| **Why（なぜ）** | AI自律開発を安全に行うため、本番と分離した環境が必要 |
| **Where（どこで）** | clasp CLI（自動実行） |
| **When（いつ）** | Claude Codeが自動実行 |
| **Who（誰が）** | Claude Code（自動） |
| **How（どうやって）** | `clasp create --type sheets`でコンテナバインド型を自動作成 |
| **How much（どれぐらい）** | 4リソース自動作成、IDは自動取得 |

---

## 2. 自動作成コマンド

```bash
# 開発環境（DEV）
clasp create --type sheets --title "CRM-Dashboard-DEV"
# → スプレッドシート + コンテナバインド型GASプロジェクトを同時作成
# → scriptId, spreadsheetIdが出力される

# 提案環境（PROP）
clasp create --type sheets --title "CRM-Dashboard-PROP"
# → スプレッドシート + コンテナバインド型GASプロジェクトを同時作成
# → scriptId, spreadsheetIdが出力される
```

---

## 3. コンテナバインド型必須（TROUBLE-012対応）

| 項目 | 旧手順（誤り） | 新手順（正） |
|------|---------------|-------------|
| 作成方法 | script.google.com → 新規作成 | clasp create --type sheets |
| プロジェクト種別 | スタンドアロン型 | コンテナバインド型 |
| スプレッドシート | 別途作成 | 同時作成 |

**禁止**: script.google.comからの直接作成（スタンドアロン型になるため）

---

## 4. Human確認事項（自動作成後）

自動作成完了後、Humanは以下を確認：

| # | 確認項目 | 確認方法 |
|---|----------|----------|
| 1 | スプレッドシートが作成されているか | Google Driveで確認 |
| 2 | GASプロジェクトが紐付いているか | スプレッドシート → 拡張機能 → Apps Script |
| 3 | scriptIdが正しいか | GASエディタ → プロジェクトの設定 |

---

## 5. 旧手順（参考・非推奨）

以下は参考として残しますが、**使用禁止**です。

<details>
<summary>旧手順（非推奨・使用禁止）</summary>

### 手動でコンテナバインド型を作成する場合

1. Google Driveで新規スプレッドシートを作成
2. シート名を「CRM-Dashboard-DEV」に変更
3. 拡張機能 → Apps Script を選択
4. GASエディタが開く（これがコンテナバインド型）
5. プロジェクトの設定 → scriptIdをコピー
6. URLからspreadsheetIdをコピー

**注意**: この手順よりも`clasp create --type sheets`が推奨

</details>

---

## 6. 更新履歴

| 日付 | 変更内容 |
|------|----------|
| 2026-01-15 | 初版作成（手動手順） |
| 2026-01-15 | TROUBLE-012対応: 自動化対応、コンテナバインド型必須に修正 |

---

**以上**
