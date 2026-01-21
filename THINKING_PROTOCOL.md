# 思考プロトコル（技術的強制力付き）

## 概要

このプロトコルは、AIの思考パターンを一定に保つための強制ルールです。
PreToolUse Hooks により技術的に強制されます。

---

## 思考フロー図

```
[リクエスト受信]
       ↓
[Phase 1: 分類]
       ↓
   ┌───┴───┐
   ↓       ↓
[調査系]  [実装系]
   ↓       ↓
[Phase 2] [Phase 3 前提チェック]
   ↓       ↓
[報告]   NG → [Phase 2 へ戻る]
   ↓       ↓ OK
[承認待ち] [実装許可]
   ↓       ↓
[承認]   [実装実行]
   ↓       ↓
[Phase 4] [完了報告]
```

---

## Phase 1: 分類（必須・省略禁止）

すべてのリクエストを以下に分類する:

| 分類 | キーワード | 次のPhase |
|------|-----------|-----------|
| A) 調査系 | 調査, 確認, 教えて, 何, どう, なぜ | Phase 2 |
| B) 実装系 | 実装, 修正, 変更, 追加, 削除, 作成 | Phase 3 |
| C) 承認系 | OK, 承認, 進めて, やって | Phase 4 |

---

## Phase 2: 調査フロー

### 2.1 調査実施
- 使用可能: Read, Grep, Glob, WebFetch, WebSearch
- **使用禁止: Edit, Write, MultiEdit**（技術的にブロック）

### 2.2 調査報告（必須フォーマット）
```markdown
## 調査報告

### 調査対象
[何を調査したか]

### 調査結果
[発見した内容]

### 結論
[調査から得られた結論]

### 次のアクション（該当する場合）
- [ ] 実装が必要な場合 → 「実装提案」を記載
- [ ] 追加調査が必要な場合 → 「追加調査項目」を記載

---
報告完了。実装が必要な場合は承認をください。
```

### 2.3 状態遷移
調査完了後: `investigating` → `awaiting_report` → `awaiting_approval`

---

## Phase 3: 実装フロー

### 3.1 前提条件チェック（技術的に強制）

以下がすべて満たされない限り、Edit/Write は**ブロック**される:

| 条件 | 確認方法 |
|------|---------|
| 状態が `approved` | thinking_state.json |
| または状態が `idle` | thinking_state.json |

### 3.2 実装宣言（必須）
```markdown
## 実装宣言

### 実装内容
[具体的な変更内容]

### 変更ファイル
- file1.py: [変更概要]
- file2.js: [変更概要]

### 影響範囲
[影響を受ける機能・コンポーネント]
```

### 3.3 実装完了報告（必須）
```markdown
## 実装完了報告

### 完了した変更
- [x] file1.py: [変更内容]
- [x] file2.js: [変更内容]

### 動作確認
[テスト結果・確認事項]
```

---

## Phase 4: 承認処理

### 承認キーワード
- `OK`, `ok`, `承認`, `許可`, `進めて`, `やって`, `お願い`

### 状態遷移
`awaiting_approval` → `approved`

---

## 自己批評チェックリスト（Constitutional AI 式）

回答生成後、以下を確認:

- [ ] 調査なしに実装を提案していないか？
- [ ] 承認なしに実装を開始していないか？
- [ ] 「確認→提案→報告」の順序を守っているか？
- [ ] 報告フォーマットに従っているか？

---

## 状態管理コマンド

```bash
# 状態確認
python3 .claude/hooks/thinking_state.py status

# 手動遷移（デバッグ用）
python3 .claude/hooks/thinking_state.py transition

# 承認（Human用）
python3 .claude/hooks/thinking_state.py approve

# リセット
python3 .claude/hooks/thinking_state.py reset
```

---

## 技術的強制力の仕組み

### 1. 状態管理
- `.claude/thinking_state.json` で状態を永続化
- 5つの状態: idle, investigating, awaiting_report, awaiting_approval, approved

### 2. PreToolUse Hook
- `.claude/hooks/thinking_gate.py` がEdit/Write/MultiEditを監視
- 状態が `investigating`, `awaiting_report`, `awaiting_approval` の場合 → **ブロック**
- 状態が `idle`, `approved` の場合 → **許可**

### 3. UserPromptSubmit Hook
- `.claude/hooks/thinking_prompt_detector.py` がキーワードを検出
- 調査キーワード → `investigating` へ自動遷移
- 承認キーワード → `approved` へ自動遷移

---

## 例外パス（常に許可）

以下のパスへの書き込みは状態に関係なく許可:
- `.claude/thinking_state.json`
- `.claude/hooks/`
- `docs/00_common/THINKING_PROCESS/`
