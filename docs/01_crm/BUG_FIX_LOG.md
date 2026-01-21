# CRM 不具合改修ログ

## 概要
商談レポートフォームおよびダッシュボードの不具合改修記録

---

## 改修履歴

| 日付 | 問題 | 原因 | 修正内容 | コミット |
|------|------|------|----------|----------|
| 2026-01-12 | **Dateオブジェクトシリアライズ問題**: getLeads()がブラウザからの呼び出しでnullを返す | スプレッドシートの日付セルはDateオブジェクトとして取得され、google.script.runはDateオブジェクトをシリアライズできずnullが返る | 全API関数でDate→ISO文字列に変換。CLAUDE.mdにルール追加 | eed41d8 |
| 2026-01-12 | getBuddyDataAuto関数が存在しない | Phase 1〜6の改修でHTMLとGASの関数名が不整合。index.htmlでgetBuddyDataAuto()を呼び出すが、WebApp.gsには存在しない | 1. index.htmlの呼び出しをgetBuddyData()に修正 2. API_REFERENCE.md作成 3. DEVELOPMENT_CHECKLIST.md作成 | (本コミット) |
| 2026-01-12 | リード一覧（IN）表示されない：スプレッドシートに顧客名追加後、ダッシュボードではカウントされるがリード一覧ページでは「リードがありません」と表示 | 1. APIエラー時の失敗ハンドラがcacheを更新しない 2. エラー詳細が表示されない 3. 再試行手段がない | 1. エラー時にcacheを適切に更新 2. エラーメッセージをUI上に表示 3. 「再読み込み」ボタンを追加 4. getLeads関数にログ出力追加 | (本コミット) |
| 2026-01-12 | ローディング停止問題：スプレッドシートで顧客名記入後、アプリを開くと白いローディング画面で停止 | APIコール成功時のレンダリング処理でエラーが発生すると`checkComplete()`が呼ばれず、ローディングが永久に表示される | 1. 全APIコールの成功ハンドラにtry-catchを追加 2. 30秒のタイムアウトフォールバックを追加 3. nullチェックを強化 | (本コミット) |
| 2026-01-12 | テストデプロイURL：@HEAD URLでアクセスできない | Script ID変更により旧デプロイIDが無効化 | 離席モードのため`clasp deploy`は禁止。GASエディタで手動デプロイが必要。`/dev`エンドポイントで@HEADアクセス可能 | (対応不要) |
| 2026-01-12 | 金額フィールドのラベル：「USD」表記 | 仕様変更（日本円に統一） | 「1回の発注金額（USD）」→「1回の発注金額（円）」、「月の発注量見込み」→「月の発注量見込み（円）」に変更 | (本コミット) |
| 2026-01-12 | 不明ボタンの問題：クリックしても入力されない、位置が悪い、色が見づらい | 1. input type="number"が文字列を受け付けない 2. レイアウト未設定 3. 背景色がデフォルトのまま | 1. input type="text"に変更 2. `.input-with-button`クラスでFlexレイアウト適用 3. ボタン色をグレー(#6c757d)に変更、8pxのgap追加 | (本コミット) |
| 2026-01-12 | 顧客名未登録時のエラー：商談管理シートに顧客名がない場合の表示問題 | 顧客名がnull/undefinedの場合のフォールバックがない | 顧客名未登録時は会社名、それもない場合は「(顧客名未登録)」を表示するよう修正 | (本コミット) |

---

## 詳細

### 1. ローディング停止問題

**症状**
- スプレッドシートで顧客名を記入後、アプリを開くと白いローディング画面で停止

**根本原因**
- `loadAllData()`の4つのAPIコール（getDropdownOptions, getLeads×2, getDeals）が全て完了しないとローディングが非表示にならない
- レンダリング処理でエラーが発生すると`checkComplete()`がスキップされ、ローディングが永久に表示

**修正内容**
```javascript
// 修正前
google.script.run
  .withSuccessHandler(function(data) {
    cache.deals = data;
    renderDeals();  // ここでエラーが発生すると...
    checkComplete(); // ここが実行されない
  })

// 修正後
google.script.run
  .withSuccessHandler(function(data) {
    try {
      cache.deals = data || [];
      renderDeals();
    } catch (e) {
      console.error('商談描画エラー:', e);
    }
    checkComplete(); // 必ず実行される
  })

// さらに30秒タイムアウトを追加
var loadingTimeout = setTimeout(function() {
  hideLoading();
}, 30000);
```

### 2. テストデプロイURL

**注意事項**
- 離席モードのため`clasp deploy`は実行禁止
- 最新コードをテストするには以下の方法を使用：
  1. GASエディタで手動デプロイ（「デプロイ」→「テストデプロイ」）
  2. `/dev`エンドポイントでアクセス: `https://script.google.com/macros/s/{SCRIPT_ID}/dev`

### 3. 不明ボタン

**修正前後の比較**
| 項目 | 修正前 | 修正後 |
|------|--------|--------|
| HTML構造 | `<input><button>` 直列 | `<div class="input-with-button"><input><button></div>` |
| inputタイプ | type="number" | type="text" |
| ボタン色 | #f5f5f5（背景と同色） | #6c757d（グレー） |
| レイアウト | なし | Flex + gap: 8px |

---

### 4. リード一覧（IN）表示されない問題

**症状**
- スプレッドシートでリード一覧（IN）に顧客名を追加
- ダッシュボードでは「アサイン待ち」のカウントが増加
- リード一覧（IN）ページを開くと「リードがありません」と表示

**考えられる原因**
1. **権限の不一致**: ダッシュボードは`dashboard_cs`権限、リード一覧は`lead_view`権限が必要。権限設定シートでこれらが異なっている可能性
2. **APIエラーの静かな失敗**: `getLeads()`がエラーを投げてもフロントエンドで適切に処理されない
3. **シートデータの問題**: ヘッダー行のみでデータ行がない場合`getLastRow() < 2`で空配列を返す

**修正内容**

**フロントエンド（index.html）**
```javascript
// 修正前：エラー時にcacheが更新されず、エラー詳細も不明
.withFailureHandler(function(e) {
  console.error('getLeads(IN) エラー:', e);
  checkComplete();
})

// 修正後：エラー時にcacheを更新し、エラーメッセージを表示
.withFailureHandler(function(e) {
  console.error('getLeads(IN) エラー:', e);
  cache.leadsIn = [];
  cache.leadsInError = e.message || 'データ取得に失敗しました';
  renderLeadsInError(cache.leadsInError);
  document.getElementById('countLeadsIn').textContent = '!';
  checkComplete();
})
```

**エラー表示UI**
- エラーメッセージを赤字で表示
- 「再読み込み」ボタンを追加
- サイドバーのカウントに「!」を表示してエラー状態を示す

**リフレッシュボタン**
- 各リードページのヘッダーに↻ボタンを追加
- クリックで該当シートのデータを再取得

**バックエンド（WebApp.gs）**
```javascript
// getLeads関数にログ出力を追加
if (!sheet) {
  console.log('getLeads: シートが見つかりません - ' + sheetName);
  return [];
}
if (lastRow < 2) {
  console.log('getLeads: データ行がありません - lastRow=' + lastRow);
  return [];
}
console.log('getLeads: ' + leads.length + '件のリードを取得 - ' + sheetName);
```

**トラブルシューティング**
1. ブラウザのデベロッパーツールでコンソールエラーを確認
2. Apps Scriptエディタの「実行」→「実行ログ」でgetLeadsのログを確認
3. 権限設定シートで`lead_view`権限がTRUEになっているか確認

---

### 5. getBuddyDataAuto関数が存在しない

**症状**
- ダッシュボード読み込み時にコンソールエラー
- `TypeError: google.script.run.withSuccessHandler(...).withFailureHandler(...).getBuddyDataAuto is not a function`

**根本原因**
- Phase 1〜6の大規模改修で、HTMLファイルとGASファイルの間で関数名の不整合が発生
- index.htmlで`getBuddyDataAuto()`を呼び出すコードを追加したが、WebApp.gsには対応する関数を追加し忘れた
- 既存の`getBuddyData()`関数が同じ機能を提供しているが、名前が違っていた

**なぜ気づかなかったか**
1. clasp pushは構文エラーしかチェックしない
2. 関数の存在チェックは実行時まで行われない
3. テストが不十分だった

**修正内容**
```javascript
// 修正前
.getBuddyDataAuto(currentUser.staffName);

// 修正後
.getBuddyData(currentUser.staffName);
```

**再発防止策**
1. **API_REFERENCE.md**: WebApp.gsの全関数一覧と呼び出し元を文書化
2. **DEVELOPMENT_CHECKLIST.md**: 新機能追加時のチェックリストを作成

---

### 6. Dateオブジェクトシリアライズ問題

**症状**
- `getLeads()` をブラウザから呼び出すと `null` が返る
- GASエディタで直接実行すると正常にデータが取得できる
- `withSuccessHandler` は呼ばれるが、data が null

**根本原因**
- スプレッドシートの `getValues()` は日付セルを JavaScript `Date` オブジェクトで返す
- `Date` オブジェクトを含む配列を `google.script.run` で返すとシリアライズに失敗する
- シリアライズ失敗時、データ全体が `null` になる

**なぜ診断関数は成功したか**
- 診断関数 `diagnosticGetLeadsSteps()` は内部で `getLeads()` を呼び出し、結果をオブジェクトにラップして返す
- ラップされたオブジェクト `{success: true, type: ..., length: ...}` はシリアライズに成功
- 直接 `getLeads()` を呼ぶと配列がそのまま返され、Date オブジェクトがシリアライズエラーを引き起こす

**修正内容**
```javascript
// 修正前
headers.forEach((header, index) => {
  lead[header] = row[index];  // Dateオブジェクトがそのまま入る
});

// 修正後
headers.forEach((header, index) => {
  let value = row[index];
  // Date オブジェクトは ISO 文字列に変換
  if (value instanceof Date) {
    value = value.toISOString();
  }
  lead[header] = value;
});
```

**修正したファイル・関数**
| ファイル | 関数 |
|----------|------|
| WebApp.gs | getLeads() |
| WebApp.gs | getStaffList() |
| WebApp.gs | getDeals() |
| DashboardService.gs | getSheetDataAsObjects() |

**再発防止策**
1. **CLAUDE.md セクション9** に「google.script.run 戻り値ルール」を追加
2. 新規API関数作成時は必ずDateを文字列化する
3. 対象関数テーブルを維持し、新規追加時に更新

**デバッグ方法**
```javascript
// サーバー側
console.log('返却データ:', JSON.stringify(leads));
console.log('Date型チェック:', leads[0]?.登録日 instanceof Date);

// クライアント側（診断ボタン使用）
// リード(IN)ページの🔍ボタンで診断実行
```

---

## テスト確認事項

- [ ] アプリ起動時のローディングが30秒以内に完了すること
- [ ] 顧客名未登録の商談がドロップダウンに「(顧客名未登録)」と表示されること
- [ ] 不明ボタンをクリックすると入力欄に「不明」が入力されること
- [ ] 不明ボタンがグレーで表示され、入力欄との間に適切な余白があること
- [ ] 金額フィールドのラベルが「円」表記になっていること
- [ ] リード一覧ページでエラー発生時、エラーメッセージと「再読み込み」ボタンが表示されること
- [ ] 「再読み込み」ボタンクリックでデータが再取得されること
- [ ] リードページヘッダーの↻ボタンで再読み込みできること
