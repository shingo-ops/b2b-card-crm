# Gemini API 使用ポリシー

## 最終更新: 2026-01-12
## バージョン: 1.0

---

# 1. APIキーの使い分け

## 1.1 方針

用途別にAPIキーを分散し、無料枠を最大限活用する。
実際の使用量を分析し、統合または分散継続を判断する。

## 1.2 割り当て

| カテゴリ | 対象システム | プロパティ名 |
|---------|-------------|-------------|
| PRIMARY | CRM、取引管理、仕入元在庫、会話ログDB | GEMINI_API_KEY |
| SECONDARY | 採用診断、営業教育 | GEMINI_API_KEY_SECONDARY |

## 1.3 無料枠

| アカウント | 無料枠 |
|-----------|--------|
| PRIMARY（treasureislandjp.com） | 45,000リクエスト/月 |
| SECONDARY（gmail.com） | 45,000リクエスト/月 |
| **合計** | **90,000リクエスト/月** |

---

# 2. 使用量試算

## 2.1 PRIMARY（CRM系）

| 用途 | 月間リクエスト |
|------|---------------|
| Buddyカード | 100 |
| 商談レポートフィードバック | 300 |
| Buddy壁打ち（50%、10往復） | 1,500 |
| ログ解析 | 300 |
| 感情分析（週次） | 20 |
| 取引管理（見積もり、メッセージ） | 200 |
| 仕入元在庫分析 | 50 |
| 和訳・英訳 | 200 |
| 会話ログ解析 | 200 |
| **小計** | **2,870** |

## 2.2 SECONDARY（診断・教育系）

| 用途 | 月間リクエスト |
|------|---------------|
| ロープレ（AI顧客役） | 500 |
| 学習コースフィードバック | 100 |
| **小計** | **600** |

## 2.3 合計

| カテゴリ | 使用量 | 無料枠 | 使用率 |
|---------|--------|--------|--------|
| PRIMARY | 2,870 | 45,000 | 6.4% |
| SECONDARY | 600 | 45,000 | 1.3% |
| **合計** | **3,470** | **90,000** | **3.9%** |

---

# 3. 80%ルール

API使用量は無料枠の80%未満に抑える。

| カテゴリ | 80%上限 | 現在使用量 | 残り |
|---------|---------|-----------|------|
| PRIMARY | 36,000 | 2,870 | 33,130 |
| SECONDARY | 36,000 | 600 | 35,400 |

---

# 4. 実装

## 4.1 スクリプトプロパティ

各GASプロジェクトに設定：

| プロジェクト | プロパティ名 | 値 |
|-------------|-------------|-----|
| CRM | GEMINI_API_KEY | PRIMARY のキー |
| 取引管理 | GEMINI_API_KEY | PRIMARY のキー |
| 仕入元在庫 | GEMINI_API_KEY | PRIMARY のキー |
| 会話ログDB | GEMINI_API_KEY | PRIMARY のキー |
| 採用診断 | GEMINI_API_KEY | SECONDARY のキー |
| 営業教育 | GEMINI_API_KEY | SECONDARY のキー |

## 4.2 共通関数

```javascript
function callGeminiAPI(prompt, options = {}) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  const model = options.model || 'gemini-1.5-flash';

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: options.temperature || 0.7,
      maxOutputTokens: options.maxTokens || 1024
    }
  };

  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const json = JSON.parse(response.getContentText());

  if (json.error) {
    throw new Error(json.error.message);
  }

  return json.candidates[0].content.parts[0].text;
}
```

---

# 5. モニタリング

## 5.1 使用量の確認方法

Google Cloud Console → APIs & Services → Gemini API → 使用状況

## 5.2 判断基準

| 状況 | アクション |
|------|-----------|
| 使用率 50%以下 | 現状維持 |
| 使用率 50-80% | 監視強化 |
| 使用率 80%超え | APIキー追加 or 有料プラン検討 |

## 5.3 統合判断

3ヶ月後に使用量を分析し、以下を判断：
- 両方とも使用率30%以下 → 統合検討
- いずれか50%以上 → 分散継続

---

# 6. 更新履歴

| 日付 | バージョン | 更新内容 |
|------|-----------|----------|
| 2026-01-12 | 1.0 | 初版作成 |
