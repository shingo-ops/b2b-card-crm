# CRM WebApp API リファレンス

## 概要
WebApp.gsで公開しているAPI関数の一覧です。
HTMLファイルから `google.script.run.関数名()` で呼び出します。

## 呼び出し元ファイル凡例
- `index` = index.html (ダッシュボード)
- `leads` = leads.html (リード一覧)
- `deals` = deals.html (商談管理)
- `staff` = staff.html (担当者管理)

---

## ダッシュボード・KPI

### getDashboardKPIs()
- **用途**: ダッシュボードのKPI指標を取得
- **引数**: なし
- **戻り値**: `{ leadsIn, leadsOut, totalLeads, activeDeals, wonDeals, lostDeals, totalRevenue, statusCounts, conversionRate }`
- **呼び出し元**: `index`

### getCSMetrics()
- **用途**: CS用KPIメトリクスを取得
- **引数**: なし
- **戻り値**: `{ newLeadsIn, newLeadsOut, pendingContacts, overdueContacts, conversionRate, lastUpdated }`
- **呼び出し元**: `index`

### getSalesMetrics(staffId)
- **用途**: 営業担当者用メトリクスを取得
- **引数**: `staffId` (string) - 担当者ID（省略時は全体）
- **戻り値**: `{ totalDeals, wonDeals, lostDeals, pendingDeals, winRate, totalSales, todayActions, lastUpdated }`
- **呼び出し元**: `index`

### getTeamStats()
- **用途**: チーム全体の統計を取得
- **引数**: なし
- **戻り値**: `{ members: [{ name, deals, won, sales, rate }], total, lastUpdated }`
- **呼び出し元**: `index`

### getLeaderMetrics()
- **用途**: リーダー用メトリクスを取得
- **引数**: なし
- **戻り値**: 各種KPI
- **呼び出し元**: `index`

---

## リード管理

### getLeads(filter, leadType)
- **用途**: リード一覧を取得
- **引数**:
  - `filter` (string) - 'lead', 'deal', 'closed', 'all'
  - `leadType` (string) - 'インバウンド', 'アウトバウンド', null
- **戻り値**: リードオブジェクトの配列
- **呼び出し元**: `index`, `leads`

### addNewLead(leadType, leadData)
- **用途**: 新規リードを追加
- **引数**:
  - `leadType` (string) - 'インバウンド' or 'アウトバウンド'
  - `leadData` (object) - リードデータ
- **戻り値**: 生成されたリードID
- **呼び出し元**: `index`, `leads`

### updateLead(sheetName, leadId, updateData)
- **用途**: リードを更新
- **引数**:
  - `sheetName` (string) - シート名（'リード管理'）
  - `leadId` (string) - リードID
  - `updateData` (object) - 更新データ
- **戻り値**: true
- **呼び出し元**: `index`, `leads`

### checkLeadDuplicate(params)
- **用途**: リードの重複をチェック
- **引数**: `{ email, messageUrl, customerName, source }`
- **戻り値**: `{ isDuplicate, previousLeadId, lastContactDate, contactCount, dropReason, csMemo, matchType }`
- **呼び出し元**: `leads`

### archiveDroppedLead(params)
- **用途**: リードを離脱としてアーカイブ
- **引数**: `{ leadId, dropReason, csMemo }`
- **戻り値**: `{ success, message }`
- **呼び出し元**: `leads`

### getDropReasons()
- **用途**: 離脱理由の選択肢を取得
- **引数**: なし
- **戻り値**: 離脱理由の配列
- **呼び出し元**: `leads`

### getLeadCsMemo(leadId)
- **用途**: リードのCSメモを取得
- **引数**: `leadId` (string)
- **戻り値**: CSメモ文字列
- **呼び出し元**: `leads`

---

## 商談管理

### getDeals()
- **用途**: 商談一覧を取得
- **引数**: なし
- **戻り値**: 商談オブジェクトの配列
- **呼び出し元**: `index`, `deals`

---

## 担当者管理

### getStaffList()
- **用途**: 担当者一覧を取得
- **引数**: なし
- **戻り値**: 担当者オブジェクトの配列
- **呼び出し元**: `index`, `staff`

### getStaffWithRoles()
- **用途**: 役割情報付きの担当者一覧を取得
- **引数**: なし
- **戻り値**: 担当者オブジェクトの配列
- **呼び出し元**: `index`

### addStaff(staffData)
- **用途**: 担当者を追加
- **引数**: `staffData` (object)
- **戻り値**: 生成された担当者ID
- **呼び出し元**: `index`

### updateStaff(staffId, staffData)
- **用途**: 担当者を更新
- **引数**: `staffId`, `staffData`
- **戻り値**: true
- **呼び出し元**: `index`

### deleteStaff(staffId)
- **用途**: 担当者を削除
- **引数**: `staffId`
- **戻り値**: true
- **呼び出し元**: `index`

### generateNextStaffId()
- **用途**: 次の担当者IDを生成
- **引数**: なし
- **戻り値**: 担当者ID文字列
- **呼び出し元**: `index`

---

## 権限管理

### getRoles()
- **用途**: 役割一覧を取得
- **引数**: なし
- **戻り値**: 役割オブジェクトの配列
- **呼び出し元**: `index`

### getRoleNames()
- **用途**: 役割名一覧を取得
- **引数**: なし
- **戻り値**: 役割名の配列
- **呼び出し元**: `index`

### saveRole(roleData)
- **用途**: 役割を保存
- **引数**: `roleData`
- **戻り値**: true
- **呼び出し元**: `index`

### deleteRole(roleName)
- **用途**: 役割を削除
- **引数**: `roleName`
- **戻り値**: true
- **呼び出し元**: `index`

### getPermissionDefinitions()
- **用途**: 権限項目の定義を取得
- **引数**: なし
- **戻り値**: 権限定義オブジェクト
- **呼び出し元**: `index`

### getCurrentUserRole()
- **用途**: 現在のユーザーの役割を取得
- **引数**: なし
- **戻り値**: `{ email, staffId, staffName, role, isAuthenticated }`
- **呼び出し元**: `index`

### getCurrentUserWithPermissions()
- **用途**: 権限情報付きの現在のユーザーを取得
- **引数**: なし
- **戻り値**: `{ email, staffId, staffName, role, permissions, isAuthenticated }`
- **呼び出し元**: `index`

---

## 目標管理

### getGoals(staffId)
- **用途**: 目標一覧を取得
- **引数**: `staffId` (省略時は全員)
- **戻り値**: 目標オブジェクトの配列
- **呼び出し元**: `index`

### addGoal(goalData)
- **用途**: 目標を追加
- **引数**: `goalData`
- **戻り値**: 生成された目標ID
- **呼び出し元**: `index`

### updateGoal(goalId, goalData)
- **用途**: 目標を更新
- **引数**: `goalId`, `goalData`
- **戻り値**: true
- **呼び出し元**: `index`

### deleteGoal(goalId)
- **用途**: 目標を削除
- **引数**: `goalId`
- **戻り値**: true
- **呼び出し元**: `index`

---

## Buddy機能

### getBuddyData(staffName)
- **用途**: Buddyの挨拶と今日のアクションを取得
- **引数**: `staffName` (string)
- **戻り値**: `{ greeting, todayActions }`
- **呼び出し元**: `index`

### getBuddyResponse(userMessage, staffName)
- **用途**: Buddyの応答を取得（Gemini API使用）
- **引数**: `userMessage`, `staffName`
- **戻り値**: 応答文字列
- **呼び出し元**: `index`

### getBuddyReportFollow(improvements)
- **用途**: レポート改善点へのフォロー応答を取得
- **引数**: `improvements` (string)
- **戻り値**: 応答文字列
- **呼び出し元**: `index`

---

## 商談レポート

### saveDealReport(reportData)
- **用途**: 商談レポートを保存
- **引数**: `reportData`
- **戻り値**: true
- **呼び出し元**: `index`

---

## 設定

### getDropdownOptions()
- **用途**: プルダウン選択肢を取得
- **引数**: なし
- **戻り値**: カテゴリ別選択肢オブジェクト
- **呼び出し元**: `index`, `leads`
- **定義場所**: Config.gs

### getAdminSettings()
- **用途**: 管理者設定を取得
- **引数**: なし
- **戻り値**: 設定オブジェクト
- **呼び出し元**: `index`

### saveNotificationSettings(settings)
- **用途**: 通知設定を保存
- **引数**: `settings`
- **戻り値**: true
- **呼び出し元**: `index`

### saveAdminPassword(password)
- **用途**: 管理者パスワードを保存
- **引数**: `password`
- **戻り値**: true
- **呼び出し元**: `index`

### verifyAdminPassword(password)
- **用途**: 管理者パスワードを検証
- **引数**: `password`
- **戻り値**: boolean
- **呼び出し元**: `index`

### forceResetWithPassword(password)
- **用途**: 強制リセット実行
- **引数**: `password`
- **戻り値**: true
- **呼び出し元**: `index`

---

## アラート・通知

### checkNextActionAlerts()
- **用途**: 次回アクションアラートをチェック
- **引数**: なし
- **戻り値**: アラート件数
- **呼び出し元**: トリガー

### checkStagnantDeals(days)
- **用途**: 停滞商談をチェック
- **引数**: `days` (number)
- **戻り値**: 停滞件数
- **呼び出し元**: トリガー

### dailyAlertBatch()
- **用途**: 日次アラートバッチ実行
- **引数**: なし
- **戻り値**: なし
- **呼び出し元**: トリガー

### recordLogin(staffId)
- **用途**: ログインを記録
- **引数**: `staffId`
- **戻り値**: true
- **呼び出し元**: `index`

### recordHeartbeat(staffId)
- **用途**: ハートビートを記録
- **引数**: `staffId`
- **戻り値**: true
- **呼び出し元**: `index`

---

## デバッグ

### debugLeadsPage()
- **用途**: リードページのデバッグ
- **引数**: なし
- **戻り値**: なし（ログ出力）
- **呼び出し元**: GASエディタから直接実行

---

## 更新履歴

| 日付 | 変更内容 |
|------|----------|
| 2026-01-12 | 初版作成 |
