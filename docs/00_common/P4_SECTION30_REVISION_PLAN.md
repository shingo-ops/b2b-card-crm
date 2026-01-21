# P4計画: Section 30改修（ポカヨケ設置時の技術的強制力必須化）

**作成日**: 2026-01-20
**作成者**: Claude Code
**目的**: 憲法第2条・第3条準拠（Section 30自体に技術的強制力を付与）

---

## 事実

### 1. 現状のSection 30の問題点

| # | 問題 | 内容 | 影響 |
|---|------|------|------|
| 1 | ドキュメントのみ | プロセスは定義されているが技術的強制力がない | 手順スキップ可能 |
| 2 | Gemini突破テストの任意性 | Geminiを呼び出さなくても設置可能 | 品質未検証のポカヨケ設置 |
| 3 | 証拠検証の手動依存 | 証拠の妥当性確認が人間依存 | 形骸化リスク |
| 4 | 完了条件のチェック不在 | 6条件の自動検証なし | 不完全な設置 |

### 2. enforcement_validator.pyの現状

現在の実装（既存）:
- CLAUDE.md/COMMON_RULES.mdへの新規Section追加を検出
- 「強制プロセス」セクションの存在を確認
- Hookファイルへの`sys.exit(2)`存在を検証

**不足している機能**:
- ポカヨケ設置フロー（Section 30）の遵守検証
- Gemini突破テスト実施の検証
- TROUBLE_POKAYOKE_MAPPING.md更新の検証

---

## 不確実性

### 1. 技術的制約

| 制約 | 影響 | 対策案 |
|------|------|--------|
| Gemini呼び出しの強制困難 | APIエラー時の代替策必要 | リトライ機構 + Human承認フォールバック |
| 突破テスト結果の自動検証困難 | Gemini応答のパターンマッチ精度が不明 | 構造化出力テンプレート使用 |
| CI/CDでのGemini呼び出しコスト | 頻繁な呼び出しでコスト増 | 変更差分のみ対象 |

### 2. 運用上の懸念

| 懸念 | 影響 | 対策 |
|------|------|------|
| 開発速度低下 | ポカヨケ設置の工数増 | P3 Phase 1で既存Hook拡張による効率化 |
| 過剰な官僚化 | 軽微な修正でも全プロセス必須 | 変更規模による閾値設定 |

---

## 結果

### 1. Section 30改修内容

#### 改修1: 技術的強制力の追加（enforcement_validator.py拡張）

**現在**: CLAUDE.md/COMMON_RULES.mdへのSection追加時に「強制プロセス」セクション存在を確認

**改修後**: 以下の追加検証を実装

```python
# enforcement_validator.py 追加機能

def validate_pokayoke_installation(content, file_path):
    """Section 30準拠チェック"""
    checks = {
        "trouble_reference": r"TROUBLE-\d+",  # 過去トラ参照
        "enforcement_section": r"強制プロセス",  # 強制メカニズム
        "5w2h": r"(When|Where|Who|What|Why|How)",  # 5W2H
        "numeric_criteria": r"\d+%|\d+件|\d+回",  # 数値基準
        "block_mechanism": r"sys\.exit\(2\)|ブロック",  # ブロック機構
    }

    missing = []
    for name, pattern in checks.items():
        if not re.search(pattern, content):
            missing.append(name)

    if missing:
        return False, f"Section 30違反: {', '.join(missing)}が不足"
    return True, "OK"
```

#### 改修2: pre-commit hookへのSection 30チェック追加

**.git/hooks/pre-commit 追加内容**:

```bash
# Section 30準拠チェック
if git diff --cached --name-only | grep -q "CLAUDE.md"; then
    # 新規Sectionの追加を検出
    if git diff --cached CLAUDE.md | grep -q "^+## [0-9]"; then
        echo "新規Section追加を検出。Section 30チェックを実行..."

        # 必須要素の存在確認
        SECTION_CONTENT=$(git diff --cached CLAUDE.md | grep "^+")

        # 強制プロセスセクションの存在確認
        if ! echo "$SECTION_CONTENT" | grep -q "強制プロセス"; then
            echo "ERROR: 新規Sectionに「強制プロセス」セクションがありません（憲法第3条違反）"
            exit 1
        fi

        # 5W2Hの存在確認
        if ! echo "$SECTION_CONTENT" | grep -qE "(When|Where|Who|What|Why|How|いつ|どこ|誰|何|なぜ|どのように)"; then
            echo "WARNING: 5W2H要素が不足しています（Section 34違反）"
        fi

        # 数値基準の存在確認
        if ! echo "$SECTION_CONTENT" | grep -qE "[0-9]+(%|件|回|分|秒)"; then
            echo "WARNING: 数値基準が不足しています（Section 34違反）"
        fi
    fi
fi
```

#### 改修3: GitHub Actions pokayoke-check.yml拡張

```yaml
# .github/workflows/pokayoke-check.yml 追加ジョブ

section30-compliance:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
      with:
        fetch-depth: 0

    - name: Check Section 30 Compliance
      run: |
        # 変更されたCLAUDE.mdを確認
        if git diff --name-only ${{ github.event.pull_request.base.sha }} | grep -q "CLAUDE.md"; then
          echo "CLAUDE.md変更を検出。Section 30準拠チェック実行..."

          # 新規Sectionの追加を検出
          NEW_SECTIONS=$(git diff ${{ github.event.pull_request.base.sha }} CLAUDE.md | grep "^+## [0-9]" || true)

          if [ -n "$NEW_SECTIONS" ]; then
            echo "新規Section検出: $NEW_SECTIONS"

            # 各新規Sectionの準拠チェック
            ERRORS=0

            # 強制プロセスチェック
            if ! git diff ${{ github.event.pull_request.base.sha }} CLAUDE.md | grep -q "強制プロセス"; then
              echo "::error::新規Sectionに「強制プロセス」セクションがありません"
              ERRORS=$((ERRORS + 1))
            fi

            # TROUBLE参照チェック
            if ! git diff ${{ github.event.pull_request.base.sha }} CLAUDE.md | grep -q "TROUBLE-"; then
              echo "::error::新規Sectionに過去トラ参照（TROUBLE-XXX）がありません"
              ERRORS=$((ERRORS + 1))
            fi

            # MAPPING更新チェック
            if ! git diff --name-only ${{ github.event.pull_request.base.sha }} | grep -q "TROUBLE_POKAYOKE_MAPPING.md"; then
              echo "::error::TROUBLE_POKAYOKE_MAPPING.mdが更新されていません"
              ERRORS=$((ERRORS + 1))
            fi

            if [ $ERRORS -gt 0 ]; then
              echo "::error::Section 30準拠チェック失敗（$ERRORS件のエラー）"
              exit 1
            fi
          fi
        fi
```

#### 改修4: Section 30本文の改修

**追加する強制プロセスセクション**:

```markdown
### 技術的強制力（憲法第2条・第3条準拠）

#### Hook強制（enforcement_validator.py）

| # | チェック項目 | 強制方法 | 違反時 |
|---|------------|---------|--------|
| 1 | 過去トラ参照（TROUBLE-XXX） | 正規表現マッチ | ブロック |
| 2 | 強制プロセスセクション | キーワード検出 | ブロック |
| 3 | 5W2H要素 | パターンマッチ | 警告 |
| 4 | 数値基準 | 正規表現マッチ | 警告 |
| 5 | ブロック機構記述 | sys.exit(2)検出 | ブロック |

#### pre-commit hook強制

| # | チェック項目 | 強制方法 | 違反時 |
|---|------------|---------|--------|
| 1 | 新規Section追加検出 | git diff解析 | チェック発動 |
| 2 | 強制プロセス存在 | grep | コミット拒否 |
| 3 | 5W2H存在 | grep | 警告 |

#### GitHub Actions強制

| # | チェック項目 | 強制方法 | 違反時 |
|---|------------|---------|--------|
| 1 | 新規Section追加検出 | git diff解析 | チェック発動 |
| 2 | 強制プロセス存在 | grep | PRマージ拒否 |
| 3 | MAPPING更新 | ファイル変更検出 | PRマージ拒否 |
| 4 | TROUBLE参照 | grep | PRマージ拒否 |
```

### 2. 実装計画

| Phase | 内容 | 期間 | 依存関係 |
|:-----:|------|------|---------|
| 1 | enforcement_validator.py拡張 | 1日 | なし |
| 2 | pre-commit hook更新 | 1日 | Phase 1 |
| 3 | GitHub Actions更新 | 1日 | Phase 2 |
| 4 | Section 30本文改修 | 1日 | Phase 3 |
| 5 | テスト・検証 | 2日 | Phase 4 |

### 3. 目標KPI

| 指標 | 現状 | 目標 |
|------|:----:|:----:|
| Section 30準拠率 | 不明（手動チェック） | 100%（自動チェック） |
| 強制プロセス欠如でのSection追加 | 可能 | 不可能（ブロック） |
| MAPPING更新漏れ | 検知困難 | 自動検知・ブロック |

### 4. リスク対策

| リスク | 影響 | 対策 |
|--------|------|------|
| チェックが厳しすぎて開発停滞 | 生産性低下 | 警告レベルの閾値調整 |
| 既存Sectionへの誤検知 | 誤ブロック | 新規追加のみを対象に限定 |
| CI/CD実行時間増加 | フィードバック遅延 | 変更ファイル限定チェック |

### 5. P3計画との関係

| P3 Phase | P4との関係 |
|----------|-----------|
| Phase 1（既存Hook拡張） | **P4のenforcement_validator.py拡張と統合** |
| Phase 2（新規Hook作成） | P4完了後に実施 |
| Phase 3（高度な検証） | P4完了後に実施 |

**推奨実施順序**: P4 → P3 Phase 1 → P3 Phase 2 → P3 Phase 3

### 6. 次のアクション

1. enforcement_validator.pyの拡張実装
2. pre-commit hookの更新
3. GitHub Actions pokayoke-check.ymlの更新
4. Section 30本文への技術的強制力セクション追加
5. テスト用のダミーSection追加でブロック動作確認

---

**以上**
