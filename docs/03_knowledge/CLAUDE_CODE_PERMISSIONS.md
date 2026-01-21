# Claude Code 承認システム完全リファレンス

> **作成日**: 2026-01-19
> **目的**: Claude Codeの承認（Permission）システムの完全な理解と自律開発の実現

---

## 1. 承認システム概要

### 1.1 評価順序

```
PreToolUse Hook → Deny Rules → Allow Rules → Ask Rules → defaultMode → ユーザー入力
```

### 1.2 承認が必要なツール

| ツール | 承認要否 | 理由 |
|--------|---------|------|
| Read | 不要 | 読み取り専用 |
| Glob | 不要 | 読み取り専用 |
| Grep | 不要 | 読み取り専用 |
| **Edit** | **必要** | ファイル変更 |
| **Write** | **必要** | ファイル作成/上書き |
| **Bash** | **必要** | 任意コード実行 |
| **WebFetch** | **必要** | 外部通信（ドメイン別） |
| WebSearch | 設定依存 | 外部通信 |
| Task | 不要 | サブエージェント起動 |
| TodoWrite | 不要 | 内部トラッキング |
| MCP Tools | 必要 | 外部ツール |
| Skill | 必要 | MCP経由 |

---

## 2. 承認自動パス方法（4つ）

### 2.1 permissions.allow 設定（推奨）

```json
{
  "permissions": {
    "allow": [
      "Edit",
      "Write",
      "Bash(git:*)",
      "WebFetch(domain:example.com)"
    ]
  }
}
```

### 2.2 PreToolUseフック

```python
# permissionDecision: "allow" を返す
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
    "permissionDecisionReason": "Auto-approved by hook"
  }
}
```

### 2.3 defaultMode設定

```json
{
  "defaultMode": "acceptEdits"  // 全Edit自動承認
}
```

### 2.4 --dangerously-skip-permissions

```bash
claude --dangerously-skip-permissions  # 全承認スキップ（危険）
```

---

## 3. permissions.allow 記法

### 3.1 基本パターン

| パターン | マッチ対象 |
|---------|----------|
| `Tool` | そのツールの全使用 |
| `Tool(exact)` | 完全一致のみ |
| `Tool(prefix:*)` | プレフィックスマッチ |
| `Tool(* suffix)` | サフィックスマッチ |
| `Tool(prefix * suffix)` | 中間マッチ |

### 3.2 Bashコマンド例

```json
"Bash(git add:*)"      // git add で始まるコマンド
"Bash(npm run:*)"      // npm run で始まるコマンド
"Bash(clasp:*)"        // clasp で始まるコマンド
```

### 3.3 WebFetchドメイン例

```json
"WebFetch(domain:github.com)"
"WebFetch(domain:docs.anthropic.com)"
```

### 3.4 MCPツール例

```json
"mcp__gemini-cli__geminiChat"
"mcp__gemini-cli__googleSearch"
```

---

## 4. 本プロジェクトの許可設定

### 4.1 基本操作

| 操作 | 許可状態 |
|------|---------|
| Edit | ✅ 許可 |
| Write | ✅ 許可 |
| WebSearch | ✅ 許可 |

### 4.2 Git操作

| コマンド | 許可状態 |
|---------|---------|
| git add | ✅ 許可 |
| git commit | ✅ 許可 |
| git push | ✅ 許可 |
| git pull | ✅ 許可 |
| git status | ✅ 許可 |
| git diff | ✅ 許可 |
| git log | ✅ 許可 |
| git branch | ✅ 許可 |
| git checkout | ✅ 許可 |
| git fetch | ✅ 許可 |
| git stash | ✅ 許可 |
| git merge | ✅ 許可 |
| git rebase | ✅ 許可 |
| git show | ✅ 許可 |
| git reset | ✅ 許可 |
| git clean | ✅ 許可 |
| git remote | ✅ 許可 |

### 4.3 Clasp操作

| コマンド | 許可状態 |
|---------|---------|
| clasp push | ✅ 許可 |
| clasp deploy | ✅ 許可 |
| clasp status | ✅ 許可 |
| clasp run | ✅ 許可 |
| clasp open | ✅ 許可 |
| clasp login | ✅ 許可 |
| clasp create | ✅ 許可 |

### 4.4 npm/Node操作

| コマンド | 許可状態 |
|---------|---------|
| npm install | ✅ 許可 |
| npm run | ✅ 許可 |
| npm test | ✅ 許可 |
| npm start | ✅ 許可 |
| npm build | ✅ 許可 |
| npx | ✅ 許可 |
| node | ✅ 許可 |

### 4.5 ファイル操作

| コマンド | 許可状態 |
|---------|---------|
| cat | ✅ 許可 |
| ls | ✅ 許可 |
| find | ✅ 許可 |
| grep | ✅ 許可 |
| head | ✅ 許可 |
| tail | ✅ 許可 |
| diff | ✅ 許可 |
| wc | ✅ 許可 |
| touch | ✅ 許可 |
| mkdir | ✅ 許可 |
| cp | ✅ 許可 |
| mv | ✅ 許可 |
| chmod | ✅ 許可 |

### 4.6 その他

| コマンド | 許可状態 |
|---------|---------|
| python/python3 | ✅ 許可 |
| curl | ✅ 許可 |
| jq | ✅ 許可 |
| echo | ✅ 許可 |
| which | ✅ 許可 |
| date | ✅ 許可 |
| pwd | ✅ 許可 |
| cd | ✅ 許可 |

### 4.7 GitHub CLI

| コマンド | 許可状態 |
|---------|---------|
| gh pr | ✅ 許可 |
| gh api | ✅ 許可 |
| gh repo | ✅ 許可 |
| gh auth | ✅ 許可 |
| gh issue list | ✅ 許可 |
| gh run list | ✅ 許可 |

### 4.8 MCP/Skill

| ツール | 許可状態 |
|--------|---------|
| mcp__gemini-cli__geminiChat | ✅ 許可 |
| mcp__gemini-cli__googleSearch | ✅ 許可 |
| Skill(gemini-audit) | ✅ 許可 |

### 4.9 意図的に未許可（安全のため）

| コマンド | 理由 |
|---------|------|
| rm | ファイル削除は破壊的 |
| rm -rf | 再帰削除は特に危険 |
| sudo | 権限昇格 |

---

## 5. 設定ファイルの場所

| ファイル | 優先度 | 用途 |
|---------|:------:|------|
| `.claude/settings.local.json` | 高 | プロジェクト個別（未コミット） |
| `.claude/settings.json` | 中 | プロジェクト共有 |
| `~/.claude/settings.json` | 低 | ユーザー共通 |

---

## 6. 参考資料

- [Claude Code Settings - Official Docs](https://code.claude.com/docs/en/settings)
- [Claude Code IAM - Official Docs](https://code.claude.com/docs/en/iam)
- [Claude Agent SDK Permissions](https://platform.claude.com/docs/en/agent-sdk/permissions)
- [Claude Agent SDK Hooks](https://platform.claude.com/docs/en/agent-sdk/hooks)

---

**最終更新**: 2026-01-19
