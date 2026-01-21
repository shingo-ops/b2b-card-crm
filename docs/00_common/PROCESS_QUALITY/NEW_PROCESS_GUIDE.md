# 新規工程追加ガイド

## 概要

新しい工程を追加する際の標準化ルールとポカヨケ。

## 新規工程追加の条件

以下の条件を満たす場合に新規工程を追加する：

| 条件 | 説明 |
|------|------|
| 既存工程に該当しない | 01〜10の工程に該当しない作業 |
| 繰り返し発生する | 1回限りではなく継続的に発生する作業 |
| ポカヨケが必要 | ミスが発生する可能性がある作業 |

## 新規工程追加手順

### Step 1: スクリプトで工程フォルダを作成

```bash
# 使用方法
./scripts/add-new-process.sh [番号] [名前] "[説明]"

# 例: データベース工程を追加
./scripts/add-new-process.sh 11 DATABASE "データベース作成/編集"
```

**ポカヨケ**: スクリプトを使用することで、3ファイル（POKAYOKE.md, TROUBLE_LOG.md, POKA_HISTORY.md）が自動生成される。

### Step 2: POKAYOKE.mdを編集

工程固有のルールを追加：

```markdown
## ポカヨケルール（読了必須）

| # | ルール | 理由 | 参照 |
|---|--------|------|------|
| 1 | [工程固有ルール] | [理由] | [参照] |
```

### Step 3: INDEX.mdに追加

`docs/00_common/PROCESS_QUALITY/INDEX.md` の工程一覧に追加：

```markdown
| 11 | [DATABASE](./11_DATABASE/) | データベース作成/編集 | 0 | 0 | - |
```

### Step 4: コミット＆プッシュ

```bash
git add docs/00_common/PROCESS_QUALITY/
git commit -m "[ADD] 新規工程追加: 11_DATABASE"
git push
```

## 禁止事項

| # | 禁止事項 | 理由 | 対策 |
|---|---------|------|------|
| 1 | 手動でフォルダ作成 | ファイル欠落リスク | スクリプト使用必須 |
| 2 | 3ファイル未満で追加 | GitHub Actionsエラー | スクリプト使用必須 |
| 3 | INDEX.md更新忘れ | 工程一覧との不整合 | チェックリスト確認 |

## GitHub Actionsによるポカヨケ

push時に以下が自動チェックされる：

| チェック | 内容 | エラー時 |
|---------|------|---------|
| フォルダ形式 | `XX_NAME` 形式か | エラー |
| 3ファイル必須 | POKAYOKE.md, TROUBLE_LOG.md, POKA_HISTORY.md | エラー |
| POKA-ID形式 | `POKA-XX-XXX` 形式か | 警告 |

### エラー発生時

```
::error file=docs/00_common/PROCESS_QUALITY/11_DATABASE/POKAYOKE.md::
11_DATABASE/POKAYOKE.md が存在しません。
新規工程追加時は scripts/add-new-process.sh を使用してください。
```

## チェックリスト

新規工程追加時：

- [ ] `./scripts/add-new-process.sh` を使用した
- [ ] POKAYOKE.md に工程固有ルールを追加した
- [ ] INDEX.md の工程一覧に追加した
- [ ] git add / commit / push を実行した
- [ ] GitHub Actionsがパスすることを確認した

## 既存工程一覧

| # | 工程 | 説明 |
|---|------|------|
| 00 | COMMON | 全工程共通 |
| 01 | SPEC | 仕様書作成/編集 |
| 02 | SPREADSHEET | スプレッドシート作成/編集 |
| 03 | GAS_EDITOR | GASエディタ作成/編集 |
| 04 | WEBAPP | Webアプリ作成/編集 |
| 05 | LOCAL_DATA | ローカルデータ作成/編集 |
| 06 | GITHUB | GitHub作成/編集 |
| 07 | GEMINI_AUDIT | Gemini監査 |
| 08 | GITHUB_ACTIONS | GitHub Actions作成/編集 |
| 09 | POKAYOKE | ポカ避け作成/編集 |
| 10 | TROUBLE_LOG | 過去トラ作成/編集 |

## 関連ドキュメント

- [INDEX.md](./INDEX.md)
- scripts/add-new-process.sh
- .github/workflows/process-quality-check.yml
