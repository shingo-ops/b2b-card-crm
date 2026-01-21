# Branch Protection 設定手順

## 目的

mainブランチへの直接pushを禁止し、PR経由のみでマージ可能にする。
これにより、GitHub Actionsのチェックを必ず通過させる。

## 設定手順

### 1. GitHubリポジトリ設定を開く

```
https://github.com/shingo-ops/sales-ops-with-claude/settings/branches
```

### 2. Branch protection rule を追加

1. **Add branch protection rule** をクリック
2. 以下を設定:

| 項目 | 設定値 |
|------|--------|
| Branch name pattern | `main` |
| Require a pull request before merging | ✅ ON |
| Require approvals | 1 |
| Require status checks to pass before merging | ✅ ON |
| Require branches to be up to date before merging | ✅ ON |
| Status checks that are required | `Pokayoke Check`, `Code Quality Check` |
| Do not allow bypassing the above settings | ✅ ON |

### 3. 保存

**Create** または **Save changes** をクリック

## 設定後の動作

```
Before（今）:
  git push origin main → 直接pushできる ❌

After（設定後）:
  git push origin main → 拒否される ✅
  → PRを作成 → レビュー → マージ
```

## 開発フロー（設定後）

```bash
# 1. feature ブランチを作成
git checkout -b feature/xxx

# 2. 作業してコミット
git add .
git commit -m "[ADD] xxx"  # pre-commit hookが走る

# 3. pushしてPR作成
git push -u origin feature/xxx

# 4. GitHub上でPR作成
# → GitHub Actionsが自動実行
# → 人間がレビュー・Approve
# → マージ
```

## 緊急時の対応

緊急時（本番障害等）は以下の手順:

1. PRに `emergency` ラベルを付ける
2. 人間がApprove（必須）
3. 監査スキップでマージ可能
4. 事後監査Issueが自動作成される

---

**作成日**: 2026-01-19
**参照**: 記事「Google推奨ベストプラクティスによるCI/CD構築」
