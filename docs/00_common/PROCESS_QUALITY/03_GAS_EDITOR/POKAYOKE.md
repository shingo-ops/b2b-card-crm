# 03_GAS_EDITOR ポカヨケルール

## 工程概要

- **目的**: GASエディタでのコード作成/編集
- **成果物**: .gsファイル

## ポカヨケルール（読了必須）

| # | ルール | 理由 | 参照 |
|---|--------|------|------|
| 1 | insertSheet/deleteSheetにはLockService必須 | 競合状態防止 | TROUBLE-018, CLAUDE.md 11. |
| 2 | 複数環境フォルダ（dev, prop）を同期 | 同期漏れ防止 | TROUBLE-019, CLAUDE.md 12. |
| 3 | google.script.runの戻り値でDate型を変換 | シリアライズエラー防止 | CLAUDE.md 9. |
| 4 | API整合性チェック（npm run check）実行 | 未定義関数呼び出し防止 | CLAUDE.md 8. |

## チェックリスト（工程開始前）

- [ ] 本ファイル（POKAYOKE.md）を読了した
- [ ] TROUBLE_LOG.mdを読了した
- [ ] 該当する過去トラを確認した
- [ ] 同期チェック（check-sync.sh）を実行した

## チェックリスト（工程終了前）

- [ ] insertSheet/deleteSheetにLockServiceを使用しているか確認した
- [ ] 複数環境フォルダ（crm-dashboard-dev, crm-dashboard-prop）に同期した
- [ ] npm run check（API整合性チェック）を実行した
- [ ] ローカルでのテストを実行した
- [ ] git add / commit / push を実行した
- [ ] 同期チェック（check-sync.sh）を実行した

## 禁止事項

| # | 禁止事項 | 理由 |
|---|---------|------|
| 1 | LockServiceなしのinsertSheet | 競合状態エラー |
| 2 | 環境フォルダ同期なしのpush | GitHub Actionsエラー |
| 3 | Date型をそのまま返却 | シリアライズエラー |

## 関連ドキュメント

- [INDEX.md](../INDEX.md)
- [TROUBLE_LOG.md](./TROUBLE_LOG.md)
- [POKA_HISTORY.md](./POKA_HISTORY.md)
- CLAUDE.md セクション8, 9, 11, 12
