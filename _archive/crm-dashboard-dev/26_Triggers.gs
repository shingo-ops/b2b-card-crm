/**
 * onEdit トリガー（インストーラブル）
 */
function onEditTrigger(e) {
  if (!e) return;
  
  try {
    // シート更新日を自動更新
    updateSheetTimestamp(e);
    
    // 見込度を再計算
    updateProspectRankOnEdit(e);
    
    // 成約/失注時に自動アーカイブ
    archiveOnStatusChange(e);
    
    // 担当者ID自動入力
    autoFillStaffId(e);
  } catch (error) {
    Logger.log('onEditTrigger エラー: ' + error.message);
  }
}

/**
 * シート更新日を自動更新
 */
function updateSheetTimestamp(e) {
  if (!e || !e.source) return;
  
  const sheet = e.source.getActiveSheet();
  const sheetName = sheet.getName();
  
  // 対象シートのみ（統合シート版）
  if (sheetName !== CONFIG.SHEETS.LEADS) return;
  
  const editedRow = e.range.getRow();
  if (editedRow === 1) return;
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const timestampColIndex = headers.indexOf('シート更新日');
  
  if (timestampColIndex !== -1) {
    // 更新日列自体の編集は無視（無限ループ防止）
    if (e.range.getColumn() === timestampColIndex + 1) return;
    
    sheet.getRange(editedRow, timestampColIndex + 1).setValue(new Date());
  }
}

/**
 * 担当者選択時にDiscord IDを自動入力
 */
function autoFillStaffId(e) {
  if (!e || !e.source) return;
  
  const sheet = e.source.getActiveSheet();
  const sheetName = sheet.getName();
  
  const targetSheets = [
    CONFIG.SHEETS.LEADS_IN,
    CONFIG.SHEETS.LEADS_OUT
  ];
  
  if (!targetSheets.includes(sheetName)) return;
  
  const editedRow = e.range.getRow();
  if (editedRow === 1) return;
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const staffColIndex = headers.indexOf('担当者');
  
  // 担当者列が編集された場合のみ
  if (e.range.getColumn() !== staffColIndex + 1) return;
  
  const staffName = e.value;
  if (!staffName) return;
  
  // 担当者マスタからDiscord ID取得
  const ss = e.source;
  const staffSheet = ss.getSheetByName(CONFIG.SHEETS.STAFF);
  if (!staffSheet || staffSheet.getLastRow() < 2) return;

  const staffData = staffSheet.getDataRange().getValues();
  const staffHeaders = staffData[0];

  // 新形式（苗字/名前分離）と旧形式（氏名統合）の両方に対応
  const familyNameCol = staffHeaders.indexOf('苗字（日本語）');
  const givenNameCol = staffHeaders.indexOf('名前（日本語）');
  const oldNameCol = staffHeaders.indexOf('氏名（日本語）');
  const discordCol = staffHeaders.indexOf('Discord ID');

  if (discordCol === -1) return;
  if (familyNameCol === -1 && givenNameCol === -1 && oldNameCol === -1) return;

  for (let i = 1; i < staffData.length; i++) {
    // 新形式でフルネームを構築
    let fullName = '';
    if (familyNameCol >= 0 && givenNameCol >= 0) {
      const family = staffData[i][familyNameCol] || '';
      const given = staffData[i][givenNameCol] || '';
      if (family || given) {
        fullName = (family + ' ' + given).trim();
      }
    }
    // 新形式で名前が取得できない場合は旧形式を使用
    if (!fullName && oldNameCol >= 0) {
      fullName = staffData[i][oldNameCol] || '';
    }

    if (fullName === staffName) {
      const discordId = staffData[i][discordCol];
      const staffIdColIndex = headers.indexOf('担当者ID');
      if (staffIdColIndex !== -1 && discordId) {
        sheet.getRange(editedRow, staffIdColIndex + 1).setValue(discordId);
      }
      break;
    }
  }
}

/**
 * トリガーを設定（初回のみ実行）
 */
function setupTriggers() {
  // 既存トリガーを削除
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    const funcName = trigger.getHandlerFunction();
    if (funcName === 'onEditTrigger' || funcName === 'checkAndRemind') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // onEditトリガー（インストーラブル）
  ScriptApp.newTrigger('onEditTrigger')
    .forSpreadsheet(getSpreadsheet())
    .onEdit()
    .create();

  // 48時間リマインド（1時間ごと）
  ScriptApp.newTrigger('checkAndRemind')
    .timeBased()
    .everyHours(1)
    .create();

  Logger.log('トリガーを設定しました。');
  SpreadsheetApp.getActiveSpreadsheet().toast('トリガーを設定しました。', '完了', 3);
}

/**
 * 全トリガーを設定（新機能含む）
 */
function setupAllTriggers() {
  // 既存トリガーを削除
  const triggers = ScriptApp.getProjectTriggers();
  const targetFunctions = [
    'onEditTrigger', 'checkAndRemind', 'runMonthlyArchive', 'checkDataVolume'
  ];

  triggers.forEach(trigger => {
    const funcName = trigger.getHandlerFunction();
    if (targetFunctions.includes(funcName)) {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // onEditトリガー（インストーラブル）
  ScriptApp.newTrigger('onEditTrigger')
    .forSpreadsheet(getSpreadsheet())
    .onEdit()
    .create();

  // 48時間リマインド（1時間ごと）
  ScriptApp.newTrigger('checkAndRemind')
    .timeBased()
    .everyHours(1)
    .create();

  // 月次アーカイブ（毎月1日AM3:00）
  ScriptApp.newTrigger('runMonthlyArchive')
    .timeBased()
    .onMonthDay(1)
    .atHour(3)
    .inTimezone('Asia/Tokyo')
    .create();

  // データ量監視（毎日AM6:00）
  ScriptApp.newTrigger('checkDataVolume')
    .timeBased()
    .atHour(6)
    .everyDays(1)
    .inTimezone('Asia/Tokyo')
    .create();

  Logger.log('全トリガーを設定しました。');
  SpreadsheetApp.getActiveSpreadsheet().toast('全トリガーを設定しました。', '完了', 3);
}

/**
 * トリガーを削除
 */
function removeTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
  
  Logger.log('全トリガーを削除しました。');
  SpreadsheetApp.getActiveSpreadsheet().toast('トリガーを削除しました。', '完了', 3);
}

/**
 * 現在のトリガー一覧を表示
 */
function listTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  
  if (triggers.length === 0) {
    Logger.log('設定されているトリガーはありません。');
    return;
  }
  
  triggers.forEach(trigger => {
    Logger.log(`関数: ${trigger.getHandlerFunction()}, 種類: ${trigger.getEventType()}`);
  });
}
