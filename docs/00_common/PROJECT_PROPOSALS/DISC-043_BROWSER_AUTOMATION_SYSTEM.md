# DISC-043: ブラウザ自動化・メッセージ収集システム

> **ステータス**: 未実装
> **優先度**: 中
> **提案日**: 2026-01-15
> **提案者**: Claude Code + Human
> **関連**: DISC-042（公開コンテンツ情報収集）

---

## 1. 概要

Claude Computer Use、Puppeteer、Google Antigravity等のブラウザ自動化技術を活用し、
各種プラットフォームからメッセージを自動収集してCRMに記録するシステム。

---

## 2. 背景

### 2.1 発端

- Claude Computer UseのAPI調査中に発見
- ブラウザ操作の自動化技術の可能性を議論
- メッセージ収集の自動化ニーズが明確化

### 2.2 対象プラットフォーム

| プラットフォーム | 取得方法 | リスク |
|-----------------|---------|--------|
| eBay | Puppeteer + Stealth | 中（ToS注意） |
| CardMarket | Puppeteer + Stealth | 中（ToS注意） |
| Telegram | **Bot API推奨** | 低（公式サポート） |
| WhatsApp | whatsapp-web.js | 中（BANリスク） |
| Instagram | 非推奨 | 高（検出厳格） |
| Messenger | 非推奨 | 高（検出厳格） |

---

## 3. 技術調査結果

### 3.1 Claude Computer Use

| 項目 | 内容 |
|------|------|
| 概要 | Docker内の仮想デスクトップをClaudeが操作 |
| 提供形態 | Anthropic API（ベータ版） |
| Claude Code統合 | 未統合（別システム構築必要） |
| コスト | 約17円/5サイクル |
| 汎用性 | 最も高い（あらゆるサイトに対応可能） |

### 3.2 Puppeteer + MCP

| 項目 | 内容 |
|------|------|
| 概要 | Claude CodeからMCP経由でPuppeteer操作 |
| ライブラリ | puppeteer-mcp-claude |
| コスト | 約1-2円/回 |
| 設定 | `npx puppeteer-mcp-claude install` |

### 3.3 Google Antigravity

| 項目 | 内容 |
|------|------|
| 概要 | Google製のAIエージェントIDE |
| ブラウザ機能 | 内蔵（自動操作可能） |
| 無料枠 | あり（週次制限） |
| Claude Code連携 | 不可（API非公開） |

### 3.4 比較表

| 方式 | コスト/回 | 汎用性 | 導入難易度 | 推奨用途 |
|------|----------|--------|-----------|---------|
| Claude Computer Use | 約17円 | ★★★★★ | 高 | 複雑なUI操作 |
| Puppeteer + MCP | 約2円 | ★★★☆☆ | 中 | 定型的なスクレイピング |
| Puppeteer + GAS | 約1円 | ★★★☆☆ | 中 | **最もコスト効率良い** |
| Antigravity | 約12円 | ★★★★☆ | 低 | Google連携 |

---

## 4. 推奨アーキテクチャ

### 4.1 メッセージ収集（認証必要）

```
┌─────────────────────────────────────────────────────────────┐
│  【最もコスト効率の良い構成】                                 │
│                                                             │
│  Puppeteer（セッション永続化）                               │
│      │                                                      │
│      ▼ メッセージデータ取得                                  │
│  ┌─────────────────────────────────────────────┐            │
│  │ 分岐処理                                    │            │
│  │ シンプル → そのままJSON出力                 │            │
│  │ 翻訳必要 → Gemini API（低コスト）           │            │
│  │ 複雑解析 → Claude API（高品質）             │            │
│  └─────────────────────────────────────────────┘            │
│      │                                                      │
│      ▼                                                      │
│  GAS doPost API → スプレッドシート直接書き込み               │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 公開情報収集（認証不要）

```
Web Search / WebFetch → Claude解析 → スプレッドシート
（DISC-042参照）
```

---

## 5. ボット検出対策

### 5.1 ブラウザ指紋対策

| 対策 | 実装方法 |
|------|---------|
| navigator.webdriver | Stealth pluginで偽装 |
| User-Agent | 通常Chrome偽装 |
| WebGL/Canvas | 正常値に偽装 |

### 5.2 行動パターン対策

| 対策 | 実装方法 |
|------|---------|
| クリック間隔 | 2-5秒のランダム遅延 |
| スクロール | 加速→減速の人間的動作 |
| マウス移動 | Ghost Cursorで曲線移動 |

### 5.3 セッション管理

| 対策 | 実装方法 |
|------|---------|
| Cookie永続化 | userDataDir指定 |
| ログイン維持 | OAuth2 + リフレッシュトークン |
| Cookie同意 | 自動クリック処理 |

---

## 6. コスト試算

### 6.1 1回のフロー

| 方式 | コスト | 日本円 |
|------|--------|--------|
| Puppeteer + GAS | $0.005-0.01 | 約1-2円 |
| Puppeteer + Gemini + GAS | $0.01-0.02 | 約2-3円 |
| Puppeteer + Claude + GAS | $0.02-0.03 | 約3-5円 |
| Claude Computer Use | $0.11 | 約17円 |

### 6.2 月間（1日10回実行）

| 方式 | 月間コスト |
|------|-----------|
| Puppeteer + GAS | 約300-600円 |
| Puppeteer + Gemini + GAS | 約600-900円 |
| Claude Computer Use | 約5,100円 |

---

## 7. 実装ステップ

### Phase 1: 安全なプラットフォームから開始
1. Telegram Bot API でメッセージ取得
2. GAS経由でスプレッドシート記録

### Phase 2: Puppeteer導入
1. puppeteer-extra + stealth 設定
2. セッション永続化
3. eBay/CardMarket対応（慎重に）

### Phase 3: 解析機能追加
1. Gemini API 翻訳
2. 必要に応じてClaude API

### Phase 4: 運用最適化
1. エラーハンドリング
2. 監視・アラート
3. コスト最適化

---

## 8. リスク・注意事項

| リスク | 対策 |
|--------|------|
| アカウント停止 | 低頻度アクセス、人間的行動 |
| ToS違反 | 規約確認、自己責任で運用 |
| 検出回避失敗 | Stealth + Real Browser |
| コスト増大 | バッチ処理、キャッシュ活用 |

---

## 9. 関連技術リンク

- [puppeteer-mcp-claude](https://github.com/jaenster/puppeteer-mcp-claude)
- [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Google Antigravity](https://antigravity.google/)
- [Claude Computer Use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool)

---

## 10. 更新履歴

| 日時 | 更新者 | 内容 |
|------|--------|------|
| 2026-01-15 | Claude Code | 初版作成（調査結果をまとめ） |

---

**以上**
