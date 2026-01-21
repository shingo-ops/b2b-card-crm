# 06_GITHUB ポカヨケルール

## 工程概要

- **目的**: GitHub作成/編集（コミット、プッシュ、PR作成等）
- **成果物**: コミット、ブランチ、PR

## ポカヨケルール（読了必須）

| # | ルール | 理由 | 参照 |
|---|--------|------|------|
| 1 | セッション開始時に同期チェック実行 | 未取得コミット防止 | CLAUDE.md 13. |
| 2 | 作業終了時に同期チェック実行 | 未pushコミット防止 | CLAUDE.md 13. |
| 3 | コミットメッセージは形式に従う | 履歴の可読性 | CLAUDE.md 2. |
| 4 | 本番デプロイ前にテスト環境で確認 | 障害防止 | CLAUDE.md デプロイルール |

## チェックリスト（工程開始前）

- [ ] 本ファイル（POKAYOKE.md）を読了した
- [ ] TROUBLE_LOG.mdを読了した
- [ ] `~/sales-ops-with-claude/scripts/check-sync.sh` を実行した
- [ ] 未取得コミットがないことを確認した
- [ ] `git pull` を実行した（必要な場合）

## チェックリスト（工程終了前）

- [ ] 全ての変更をステージングした（git add）
- [ ] コミットメッセージが形式に従っているか確認した
- [ ] git commit を実行した
- [ ] git push を実行した
- [ ] `~/sales-ops-with-claude/scripts/check-sync.sh` を実行した
- [ ] 同期ずれが0件であることを確認した

## 禁止事項

| # | 禁止事項 | 理由 |
|---|---------|------|
| 1 | 同期チェックなしのセッション開始 | 競合リスク |
| 2 | 未pushのままセッション終了 | データ消失リスク |
| 3 | force push（--force） | 履歴破壊 |
| 4 | 認証情報のコミット | セキュリティリスク |

## 関連ドキュメント

- [INDEX.md](../INDEX.md)
- [TROUBLE_LOG.md](./TROUBLE_LOG.md)
- [POKA_HISTORY.md](./POKA_HISTORY.md)
- CLAUDE.md セクション13（ローカル↔GitHub同期ルール）
- scripts/check-sync.sh
