# UI/UX 共通ガイドライン

## 最終更新: 2026-01-12
## バージョン: 1.0

---

# 1. 概要

本ドキュメントは、B2B営業システム全体で適用するUI/UXの共通ルールを定義する。
新規開発・改修時は本ガイドラインに従うこと。

---

# 2. 自由記述入力欄の仕様

## 2.1 基本方針

**Chatwork方式を採用**: エンターで改行、送信ボタンクリックでのみ送信

| 操作 | 動作 |
|------|------|
| エンターキー | 改行 |
| Shift+エンター | 改行 |
| 送信ボタンクリック | 送信 |
| Tab→エンター | 送信（ボタンにフォーカス移動後） |

## 2.2 採用理由

### 不具合事例（2026-01-12 CRM開発で発見）

| 問題 | 原因 | 影響 |
|------|------|------|
| 重複送信 | エンターで送信 + 入力欄クリアされず | 同じメッセージが2回送信 |
| 誤送信 | 日本語変換確定のエンターで送信 | 入力途中で送信されてしまう |

### Chatwork方式のメリット

| メリット | 説明 |
|---------|------|
| 誤送信防止 | 明示的にボタンを押すまで送信されない |
| 日本語入力対応 | 変換確定のエンターを気にしなくてよい |
| 長文入力対応 | 改行しながらじっくり入力できる |
| ビジネス用途に適切 | 送信前に内容を確認できる |

## 2.3 実装仕様

### HTML
```html
<!-- inputではなくtextareaを使用 -->
<textarea
  id="input-field"
  placeholder="入力してください..."
  rows="3"
></textarea>
<button id="send-btn">送信</button>
```

### CSS
```css
textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 8px;
  resize: vertical;
  min-height: 60px;
  max-height: 150px;
  font-family: inherit;
  font-size: 14px;
}
```

### JavaScript
```javascript
// 送信ボタンのクリックでのみ送信
document.getElementById('send-btn').addEventListener('click', sendMessage);

// エンターキーでの送信は実装しない
// keydownイベントリスナーは不要

// 送信後の処理
function sendMessage() {
  const input = document.getElementById('input-field');
  const message = input.value.trim();

  if (!message) return;

  // 送信処理...

  // 送信成功後にクリア
  input.value = '';
}
```

## 2.4 適用対象

| アプリ | 対象箇所 |
|--------|---------|
| CRM | Buddyチャット入力欄 |
| CRM | 商談レポート（良かった点、改善点、次のアクション） |
| CRM | 週次/月次レポートの自由記述欄 |
| CRM | 商談メモ |
| CRM | オーナーメモ |
| 営業教育 | 振り返り入力欄 |
| 営業教育 | ロープレのチャット入力欄 |
| 採用診断 | 自由記述回答欄 |
| 取引管理 | 備考欄 |
| 共通 | 全ての自由記述入力欄 |

---

# 3. 送信処理の共通仕様

## 3.1 重複送信防止

### 必須実装
```javascript
let isSending = false;

function sendMessage() {
  // 送信中なら何もしない
  if (isSending) return;

  isSending = true;
  sendButton.disabled = true;

  // 送信処理
  google.script.run
    .withSuccessHandler(() => {
      isSending = false;
      sendButton.disabled = false;
      input.value = ''; // 入力欄クリア
    })
    .withFailureHandler((error) => {
      isSending = false;
      sendButton.disabled = false;
      alert('送信に失敗しました: ' + error.message);
    })
    .submitData(data);
}
```

## 3.2 チェックリスト

新規開発時に確認すること：

- [ ] 入力欄はtextareaを使用しているか
- [ ] エンターキーでの送信処理を実装していないか
- [ ] 送信ボタンクリックでのみ送信されるか
- [ ] 送信中フラグで重複送信を防止しているか
- [ ] 送信中はボタンがdisabledになるか
- [ ] 送信成功後に入力欄がクリアされるか
- [ ] エラー時にフラグとボタンが元に戻るか

---

# 4. 日本語入力（IME）対応

## 4.1 注意事項

日本語入力時、変換確定のエンターキーを誤検知しないよう注意。

### もしエンターで何か処理をする場合（非推奨）
```javascript
let isComposing = false;

input.addEventListener('compositionstart', () => {
  isComposing = true;
});

input.addEventListener('compositionend', () => {
  isComposing = false;
});

input.addEventListener('keydown', (e) => {
  // 変換中のエンターは無視
  if (e.key === 'Enter' && !isComposing && !e.isComposing) {
    // 処理
  }
});
```

### 推奨

**エンターキーでの送信自体を実装しない（Chatwork方式）**

---

# 5. 更新履歴

| 日付 | バージョン | 更新内容 |
|------|-----------|----------|
| 2026-01-12 | 1.0 | 初版作成。自由記述入力欄の仕様、重複送信防止、IME対応を追加 |
