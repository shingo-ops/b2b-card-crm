/**
 * CRM ダッシュボード - メインエントリーポイント
 */

/**
 * スプレッドシート起動時にカスタムメニューを追加
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();

  ui.createMenu('🎯 CRM')
    .addSubMenu(ui.createMenu('📋 初期設定')
      .addItem('🔧 全シート初期設定', 'initializeSpreadsheet')
      .addSeparator()
      .addItem('🎯 目標設定シート初期化', 'initializeGoalsSheetFromMenu')
      .addItem('🔐 権限設定シート初期化', 'initializePermissionsSheetFromMenu'))
    .addSeparator()
    .addItem('➡️ アサイン移行（選択シート）', 'menuRunAssignMigration')
    .addSeparator()
    .addItem('📦 選択行をアーカイブ', 'manualArchive')
    .addItem('♻️ アーカイブから復元', 'restoreFromArchive')
    .addSeparator()
    .addItem('🔄 見込度を再計算（全件）', 'recalculateAllProspectRanks')
    .addSeparator()
    .addSubMenu(ui.createMenu('📢 PMO通知')
      .addItem('🔔 テスト通知を送信', 'sendTestNotification')
      .addItem('✅ 作業完了通知を送信', 'promptWorkCompletionNotification')
      .addItem('📋 週次レビュー通知を送信', 'sendWeeklyReviewReminder')
      .addSeparator()
      .addItem('🕐 通知トリガー設定', 'setupNotificationTriggers')
      .addItem('🗑️ 通知トリガー削除', 'removeNotificationTriggers')
      .addSeparator()
      .addItem('⚙️ 通知プロパティ設定', 'setPmoNotificationProperties'))
    .addSubMenu(ui.createMenu('⚙️ 設定')
      .addItem('🕐 トリガー設定', 'setupTriggers')
      .addItem('🗑️ トリガー削除', 'removeTriggers')
      .addItem('📜 トリガー一覧（ログ）', 'listTriggers')
      .addSeparator()
      .addItem('🔄 プルダウン設定を反映', 'refreshDropdownSettings')
      .addItem('🔄 設定を更新（差分のみ追加）', 'updateSettingsSheetFromMenu')
      .addItem('🔃 設定を強制リセット（全削除）', 'resetSettingsSheetFromMenu'))
    .addSeparator()
    .addItem('🌐 Webアプリを開く', 'openWebApp')
    .addToUi();
}

/**
 * Webアプリを開く
 */
function openWebApp() {
  const url = ScriptApp.getService().getUrl();
  const html = HtmlService.createHtmlOutput(
    '<script>window.open("' + url + '?authuser=0", "_blank");google.script.host.close();</script>'
  )
  .setWidth(200)
  .setHeight(50);

  SpreadsheetApp.getUi().showModalDialog(html, 'Webアプリを開いています...');
}

/**
 * メニューから実行するためのラッパー関数
 */
function menuRunAssignMigration() {
  runAssignMigration();
}

/**
 * プルダウン設定を反映（キャッシュクリア + 入力規則再設定）
 */
function refreshDropdownSettings() {
  const ui = SpreadsheetApp.getUi();

  // キャッシュをクリア
  clearDropdownCache();

  // 入力規則を再設定
  const ss = getSpreadsheet();
  setDataValidations(ss);

  ui.alert('完了', 'プルダウン設定を反映しました。\n設定シートの変更がスプレッドシートに適用されました。', ui.ButtonSet.OK);
}
