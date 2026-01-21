/**
 * Webアプリ - GET リクエスト処理（SPA統一版）
 * 常にindex.html（SPA）を返す
 *
 * 特殊クエリパラメータ:
 * - ?action=insertTestData&key=badge2026 : テストデータ投入
 * - ?action=removeTestData&key=badge2026 : テストデータ削除
 */
function doGet(e) {
  // テストデータ操作のクエリパラメータをチェック
  const params = e.parameter || {};

  if (params.action && params.key === 'badge2026') {
    let result;

    if (params.action === 'insertTestData') {
      result = insertBadgeTestData();
      return ContentService.createTextOutput(JSON.stringify(result, null, 2))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (params.action === 'removeTestData') {
      result = removeTestData();
      return ContentService.createTextOutput(JSON.stringify(result, null, 2))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // 通常のSPAレスポンス
  const template = HtmlService.createTemplateFromFile('index');
  return template.evaluate()
    .setTitle('CRM Dashboard')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Webアプリ - POST リクエスト処理
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    let result;
    
    switch (action) {
      case 'getLeads':
        result = getLeads(data.sheetName);
        break;
      case 'getDeals':
        result = getLeads('deal');  // 商談段階のリードを取得
        break;
      case 'getStaff':
        result = getStaffList();
        break;
      case 'addLead':
        result = addNewLead(data.sheetName, data.leadData);
        break;
      case 'updateLead':
        result = updateLead(data.sheetName, data.leadId, data.updateData);
        break;
      case 'getDropdownOptions':
        result = DROPDOWN_OPTIONS;
        break;
      default:
        throw new Error('Unknown action: ' + action);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      data: result
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * HTMLファイルをインクルード
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * ダッシュボード用のKPIデータを取得（統合シート版）
 */
function getDashboardKPIs() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.LEADS);

  if (!sheet || sheet.getLastRow() < 2) {
    return {
      leadsIn: 0, leadsOut: 0, totalLeads: 0, activeDeals: 0,
      wonDeals: 0, lostDeals: 0, totalRevenue: 0, statusCounts: {}, conversionRate: 0
    };
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const typeIdx = headers.indexOf('リード種別');
  const statusIdx = headers.indexOf('進捗ステータス');
  const revenueIdx = headers.indexOf('初回取引金額');

  let leadsIn = 0, leadsOut = 0, activeDeals = 0, wonDeals = 0, lostDeals = 0, totalRevenue = 0;
  const statusCounts = {};

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const type = row[typeIdx];
    const status = row[statusIdx];

    // リード種別でカウント
    if (type === 'インバウンド') leadsIn++;
    else if (type === 'アウトバウンド') leadsOut++;

    // ステータス別カウント
    statusCounts[status] = (statusCounts[status] || 0) + 1;

    // 商談中（アクティブ）
    if (CONFIG.DEAL_STATUSES.includes(status)) activeDeals++;

    // 成約
    if (status === CONFIG.PROGRESS_STATUSES.WON) {
      wonDeals++;
      totalRevenue += parseFloat(row[revenueIdx]) || 0;
    }

    // 失注
    if (status === CONFIG.PROGRESS_STATUSES.LOST) lostDeals++;
  }

  const closedDeals = wonDeals + lostDeals;

  return {
    leadsIn, leadsOut,
    totalLeads: leadsIn + leadsOut,
    activeDeals, wonDeals, lostDeals, totalRevenue, statusCounts,
    conversionRate: closedDeals > 0 ? Math.round((wonDeals / closedDeals) * 100) : 0
  };
}

/**
 * リード一覧を取得（統合シート版）
 * @param {string} filter - 'lead'（リード段階）, 'deal'（商談段階）, 'closed'（完了）, 'all'
 * @param {string} leadType - 'インバウンド', 'アウトバウンド', null（全て）
 */
function getLeads(filter, leadType) {
  console.log('getLeads START: filter=' + filter + ', leadType=' + leadType);

  try {
    checkPermission('lead_view');
  } catch (e) {
    console.log('getLeads: checkPermission failed - ' + e.message);
    // 権限エラーでも空配列を返す（エラーはログのみ）
    return [];
  }

  const ss = getSpreadsheet();
  if (!ss) {
    console.log('getLeads: スプレッドシートが取得できません');
    return [];
  }

  const sheet = ss.getSheetByName(CONFIG.SHEETS.LEADS);

  if (!sheet) {
    console.log('getLeads: リード管理シートが見つかりません');
    return [];
  }

  const lastRow = sheet.getLastRow();
  console.log('getLeads: lastRow=' + lastRow);
  if (lastRow < 2) {
    console.log('getLeads: データ行がありません - lastRow=' + lastRow);
    return [];
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const typeIdx = headers.indexOf('リード種別');
  const statusIdx = headers.indexOf('進捗ステータス');

  console.log('getLeads: typeIdx=' + typeIdx + ', statusIdx=' + statusIdx);
  console.log('getLeads: LEAD_STATUSES=' + JSON.stringify(CONFIG.LEAD_STATUSES));
  console.log('getLeads: leadType param="' + leadType + '" (length=' + (leadType ? leadType.length : 0) + ')');

  const leads = [];
  let debugSkipReasons = { typeFilter: 0, statusFilter: 0 };

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    // trim()で前後の空白を除去し、toString()で文字列化
    const type = row[typeIdx] ? row[typeIdx].toString().trim() : '';
    const status = row[statusIdx] ? row[statusIdx].toString().trim() : '';
    const expectedType = leadType ? leadType.toString().trim() : '';

    // 最初の5行は詳細ログ
    if (i <= 5) {
      const typeMatch = (type === expectedType);
      console.log('getLeads Row ' + i + ': type="' + type + '" (len=' + type.length + '), status="' + status + '"');
      console.log('  typeMatch=' + typeMatch + ', statusMatch=' + CONFIG.LEAD_STATUSES.includes(status));
      // 文字コード比較（エンコーディング問題検出）
      if (type && expectedType && !typeMatch) {
        const typeChars = type.split('').map(c => c.charCodeAt(0)).join(',');
        const expectedChars = expectedType.split('').map(c => c.charCodeAt(0)).join(',');
        console.log('  CharCodes: actual=[' + typeChars + '] expected=[' + expectedChars + ']');
      }
    }

    // リード種別フィルタ（空の行はスキップ）
    if (!type) {
      if (i <= 5) console.log('  -> SKIPPED (empty type)');
      continue;
    }
    if (expectedType && type !== expectedType) {
      debugSkipReasons.typeFilter++;
      if (i <= 5) console.log('  -> SKIPPED (type filter)');
      continue;
    }

    // ステータスフィルタ
    if (filter === 'lead' && !CONFIG.LEAD_STATUSES.includes(status)) {
      debugSkipReasons.statusFilter++;
      if (i <= 5) console.log('getLeads: Row ' + i + ' skipped - status=' + status + ' not in LEAD_STATUSES');
      continue;
    }
    if (filter === 'deal' && !CONFIG.DEAL_STATUSES.includes(status)) continue;
    if (filter === 'closed' && !CONFIG.CLOSED_STATUSES.includes(status)) continue;

    const lead = {};
    headers.forEach((header, index) => {
      let value = row[index];
      // Date オブジェクトは ISO 文字列に変換（google.script.run シリアライズ対策）
      if (value instanceof Date) {
        value = value.toISOString();
      }
      lead[header] = value;
    });
    leads.push(lead);
  }

  console.log('getLeads RESULT: ' + leads.length + '件 (filter=' + filter + ', type=' + leadType + ')');
  console.log('getLeads SKIP: typeFilter=' + debugSkipReasons.typeFilter + ', statusFilter=' + debugSkipReasons.statusFilter);
  return leads;
}

/**
 * 新規リードを追加
 */
function addNewLead(leadType, leadData) {
  // 統合シートにリードを追加
  return addIntegratedLead(leadData, leadType);
}

/**
 * リードを更新
 */
function updateLead(sheetName, leadId, updateData) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet || sheet.getLastRow() < 2) {
    throw new Error('シートにデータがありません');
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIndex = headers.indexOf('リードID');

  if (idIndex === -1) {
    throw new Error('リードID列が見つかりません');
  }

  // リードIDで行を検索
  let targetRow = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][idIndex] === leadId) {
      targetRow = i + 1; // 1-indexed
      break;
    }
  }

  if (targetRow === -1) {
    throw new Error('リードが見つかりません: ' + leadId);
  }

  // 更新データを適用
  Object.entries(updateData).forEach(([key, value]) => {
    const colIndex = headers.indexOf(key);
    if (colIndex !== -1) {
      sheet.getRange(targetRow, colIndex + 1).setValue(value);
    }
  });

  // 更新日を設定
  const updateDateIndex = headers.indexOf('シート更新日');
  if (updateDateIndex !== -1) {
    sheet.getRange(targetRow, updateDateIndex + 1).setValue(new Date());
  }

  return leadId;
}

/**
 * 商談ステータス（進捗ステータス）を更新
 * @param {string} leadId - リードID
 * @param {string} newStatus - 新しいステータス
 * @returns {Object} {success: boolean, leadId: string}
 */
function updateDealStatus(leadId, newStatus) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.LEADS);

  if (!sheet || sheet.getLastRow() < 2) {
    throw new Error('シートにデータがありません');
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIndex = headers.indexOf('リードID');
  const statusIndex = headers.indexOf('進捗ステータス');
  const updateDateIndex = headers.indexOf('シート更新日');

  if (idIndex === -1 || statusIndex === -1) {
    throw new Error('必要な列が見つかりません');
  }

  // リードIDで行を検索
  let targetRow = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][idIndex] === leadId) {
      targetRow = i + 1; // 1-indexed
      break;
    }
  }

  if (targetRow === -1) {
    throw new Error('リードが見つかりません: ' + leadId);
  }

  // ステータスを更新
  sheet.getRange(targetRow, statusIndex + 1).setValue(newStatus);

  // 更新日を設定
  if (updateDateIndex !== -1) {
    sheet.getRange(targetRow, updateDateIndex + 1).setValue(new Date());
  }

  return { success: true, leadId: leadId };
}

/**
 * 「対応開始」処理 - アサイン確定→商談中に変更
 * @param {string} leadId - リードID
 * @returns {Object} {success: boolean, leadId: string}
 */
function startDealResponse(leadId) {
  return updateDealStatus(leadId, '商談中');
}

/**
 * 担当者一覧を取得
 */
function getStaffList() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.STAFF);

  if (!sheet || sheet.getLastRow() < 2) {
    return [];
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const staffList = [];

  for (let i = 1; i < data.length; i++) {
    const staff = {};
    headers.forEach((header, index) => {
      let value = data[i][index];
      // Date オブジェクトは ISO 文字列に変換（google.script.run シリアライズ対策）
      if (value instanceof Date) {
        value = value.toISOString();
      }
      staff[header] = value;
    });

    // 有効なスタッフのみ
    if (staff['ステータス'] === '有効') {
      staffList.push(staff);
    }
  }

  return staffList;
}

/**
 * アサイン用の担当者一覧を取得
 * @returns {Array} [{id, name, discordId}, ...]
 */
function getStaffListForAssign() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.STAFF);

  if (!sheet || sheet.getLastRow() < 2) {
    return [];
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf('担当者ID');
  const roleCol = headers.indexOf('役割');
  const statusCol = headers.indexOf('ステータス');
  const discordIdCol = headers.indexOf('Discord ID');

  // 新形式と旧形式の両方に対応
  const familyNameJaCol = headers.indexOf('苗字（日本語）');
  const givenNameJaCol = headers.indexOf('名前（日本語）');
  const oldNameCol = headers.indexOf('氏名（日本語）');

  const staffList = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const status = row[statusCol];
    const role = row[roleCol];

    // 有効な担当者のみ（CSまたは営業）
    if (status !== '有効') continue;
    if (role !== 'CS' && role !== '営業' && role !== 'リーダー' && role !== 'オーナー') continue;

    // スタッフ名を取得（新形式 → 旧形式）
    let staffName = '';
    if (familyNameJaCol >= 0 && givenNameJaCol >= 0) {
      const family = row[familyNameJaCol] || '';
      const given = row[givenNameJaCol] || '';
      if (family || given) {
        staffName = (family + ' ' + given).trim();
      }
    }
    if (!staffName && oldNameCol >= 0) {
      staffName = row[oldNameCol] || '';
    }

    if (row[idCol] && staffName) {
      staffList.push({
        id: row[idCol],
        name: staffName,
        discordId: row[discordIdCol] || ''
      });
    }
  }

  return staffList;
}

/**
 * リードに担当者をアサイン
 * @param {string} leadId - リードID
 * @param {string} staffId - 担当者ID
 * @param {string} staffName - 担当者名
 * @returns {Object} {success: boolean, error?: string}
 */
function assignLead(leadId, staffId, staffName) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEETS.LEADS);

    if (!sheet || sheet.getLastRow() < 2) {
      return { success: false, error: 'シートが見つかりません' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idCol = headers.indexOf('リードID');
    const staffCol = headers.indexOf('担当者');
    const staffIdCol = headers.indexOf('担当者ID');
    const assignDateCol = headers.indexOf('アサイン日');
    const statusCol = headers.indexOf('進捗ステータス');

    for (let i = 1; i < data.length; i++) {
      if (data[i][idCol] === leadId) {
        const rowNum = i + 1;
        if (staffCol >= 0) sheet.getRange(rowNum, staffCol + 1).setValue(staffName);
        if (staffIdCol >= 0) sheet.getRange(rowNum, staffIdCol + 1).setValue(staffId);
        if (assignDateCol >= 0) sheet.getRange(rowNum, assignDateCol + 1).setValue(new Date());
        if (statusCol >= 0) sheet.getRange(rowNum, statusCol + 1).setValue('アサイン確定');

        return { success: true };
      }
    }

    return { success: false, error: 'リードが見つかりません' };
  } catch (e) {
    console.error('assignLead error:', e);
    return { success: false, error: e.message };
  }
}

/**
 * リードをアーカイブ（リード管理シート内でアーカイブ日を設定）
 * @param {string} leadId - リードID
 * @param {string} reason - アーカイブ理由
 * @param {string} csMemo - CSメモ
 * @returns {Object} {success: boolean, error?: string}
 */
function archiveLeadToDropped(leadId, reason, csMemo) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEETS.LEADS);

    if (!sheet) {
      return { success: false, error: 'シートが見つかりません' };
    }

    // リードデータを取得
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idCol = headers.indexOf('リードID');
    const archiveDateCol = headers.indexOf('アーカイブ日');
    const archiveReasonCol = headers.indexOf('アーカイブ理由');
    const statusCol = headers.indexOf('進捗ステータス');
    const lastHandlerCol = headers.indexOf('最終対応者ID');
    const csMemoCol = headers.indexOf('CSメモ');
    const updateDateCol = headers.indexOf('シート更新日');

    let leadRowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][idCol] === leadId) {
        leadRowIndex = i + 1;
        break;
      }
    }

    if (leadRowIndex === -1) {
      return { success: false, error: 'リードが見つかりません' };
    }

    // 現在のユーザー情報を取得
    const currentUser = getCurrentUserWithPermissions();
    const lastHandler = currentUser.staffId || '';
    const now = new Date();

    // アーカイブ情報を更新
    if (archiveDateCol >= 0) {
      sheet.getRange(leadRowIndex, archiveDateCol + 1).setValue(now);
    }
    if (archiveReasonCol >= 0) {
      sheet.getRange(leadRowIndex, archiveReasonCol + 1).setValue(reason);
    }
    if (statusCol >= 0) {
      sheet.getRange(leadRowIndex, statusCol + 1).setValue('アーカイブ');
    }
    if (lastHandlerCol >= 0) {
      sheet.getRange(leadRowIndex, lastHandlerCol + 1).setValue(lastHandler);
    }
    if (csMemoCol >= 0 && csMemo) {
      const existingMemo = sheet.getRange(leadRowIndex, csMemoCol + 1).getValue() || '';
      const newMemo = existingMemo ? existingMemo + '\n---\n' + csMemo : csMemo;
      sheet.getRange(leadRowIndex, csMemoCol + 1).setValue(newMemo);
    }
    if (updateDateCol >= 0) {
      sheet.getRange(leadRowIndex, updateDateCol + 1).setValue(now);
    }

    return { success: true };
  } catch (e) {
    console.error('archiveLeadToDropped error:', e);
    return { success: false, error: e.message };
  }
}

/**
 * 商談一覧を取得（統合シート版：商談段階のリードを取得）
 */
function getDeals() {
  const user = checkPermission(); // 認証のみチェック
  // deal_view_all または deal_view_own のいずれかが必要
  if (!user.permissions.deal_view_all && !user.permissions.deal_view_own) {
    throw new Error('商談閲覧の権限がありません');
  }

  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.LEADS);

  if (!sheet || sheet.getLastRow() < 2) {
    return [];
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const statusIdx = headers.indexOf('進捗ステータス');
  const staffIdx = headers.indexOf('担当者');
  const deals = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const status = row[statusIdx];

    // 商談段階のみ（アサイン確定、商談中、見積もり提示）
    if (!CONFIG.DEAL_STATUSES.includes(status)) continue;

    // deal_view_own の場合は自分の商談のみ
    if (!user.permissions.deal_view_all && user.permissions.deal_view_own) {
      if (row[staffIdx] !== user.staffName) continue;
    }

    const deal = {};
    headers.forEach((header, index) => {
      let value = row[index];
      // Date オブジェクトは ISO 文字列に変換（google.script.run シリアライズ対策）
      if (value instanceof Date) {
        value = value.toISOString();
      }
      deal[header] = value;
    });
    deals.push(deal);
  }

  return deals;
}

// ========== 管理者設定API ==========

/**
 * 管理者設定を取得
 */
function getAdminSettings() {
  checkPermission('admin_access');
  const props = PropertiesService.getScriptProperties();

  return {
    discordWebhook: props.getProperty('PMO_DISCORD_WEBHOOK') || '',
    pmoUrl: props.getProperty('PMO_PROJECT_URL') || '',
    githubUrl: props.getProperty('GITHUB_URL') || '',
    hasPassword: !!props.getProperty('ADMIN_PASSWORD')
  };
}

/**
 * 通知設定を保存
 */
function saveNotificationSettings(settings) {
  checkPermission('admin_access');
  const props = PropertiesService.getScriptProperties();

  if (settings.discordWebhook !== undefined) {
    props.setProperty('PMO_DISCORD_WEBHOOK', settings.discordWebhook);
  }
  if (settings.pmoUrl !== undefined) {
    props.setProperty('PMO_PROJECT_URL', settings.pmoUrl);
  }
  if (settings.githubUrl !== undefined) {
    props.setProperty('GITHUB_URL', settings.githubUrl);
  }

  return { success: true };
}

/**
 * 管理者パスワードを保存
 */
function saveAdminPassword(password) {
  if (!password || password.length < 4) {
    throw new Error('パスワードは4文字以上で設定してください。');
  }

  const props = PropertiesService.getScriptProperties();
  props.setProperty('ADMIN_PASSWORD', password);

  return { success: true };
}

/**
 * 管理者パスワードを検証
 */
function verifyAdminPassword(password) {
  const props = PropertiesService.getScriptProperties();
  const storedPassword = props.getProperty('ADMIN_PASSWORD');

  // パスワード未設定の場合は検証不要
  if (!storedPassword) {
    return { valid: true, noPassword: true };
  }

  return { valid: password === storedPassword };
}

/**
 * パスワード検証後に設定シートを強制リセット
 */
function forceResetWithPassword(password) {
  checkPermission('force_reset');
  const props = PropertiesService.getScriptProperties();
  const storedPassword = props.getProperty('ADMIN_PASSWORD');

  // パスワードが設定されている場合は検証
  if (storedPassword && password !== storedPassword) {
    return { success: false, message: 'パスワードが正しくありません。' };
  }

  try {
    const ss = getSpreadsheet();
    forceResetSettingsSheet(ss);
    setDataValidations(ss);

    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

// ========== 権限管理API ==========

/**
 * 権限項目の定義を取得
 */
function getPermissionDefinitions() {
  return PERMISSION_DEFINITIONS;
}

/**
 * 役割一覧を取得
 */
function getRoles() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.PERMISSIONS);

  if (!sheet || sheet.getLastRow() < 2) {
    return [];
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const roles = [];

  for (let i = 1; i < data.length; i++) {
    const role = {
      name: data[i][0],
      permissions: {}
    };

    headers.forEach((header, index) => {
      if (header !== '役割名') {
        role.permissions[header] = data[i][index] === true || data[i][index] === 'TRUE';
      }
    });

    roles.push(role);
  }

  return roles;
}

/**
 * 役割を保存（新規/更新）
 */
function saveRole(roleData) {
  checkPermission('admin_access');
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.PERMISSIONS);

  if (!sheet) {
    throw new Error('権限設定シートが見つかりません');
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const data = sheet.getDataRange().getValues();

  // 既存の役割を検索
  let targetRow = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === roleData.originalName || data[i][0] === roleData.name) {
      targetRow = i + 1;
      break;
    }
  }

  // 行データを作成
  const rowData = headers.map(header => {
    if (header === '役割名') {
      return roleData.name;
    }
    return roleData.permissions[header] || false;
  });

  if (targetRow > 0) {
    // 更新
    sheet.getRange(targetRow, 1, 1, rowData.length).setValues([rowData]);
  } else {
    // 新規追加
    sheet.appendRow(rowData);
  }

  return { success: true };
}

/**
 * 役割を削除
 */
function deleteRole(roleName) {
  checkPermission('admin_access');
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.PERMISSIONS);

  if (!sheet) {
    throw new Error('権限設定シートが見つかりません');
  }

  // オーナー役割は削除不可
  if (roleName === 'オーナー') {
    return { success: false, message: 'オーナー役割は削除できません。' };
  }

  const data = sheet.getDataRange().getValues();

  // 役割を検索
  let targetRow = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === roleName) {
      targetRow = i + 1;
      break;
    }
  }

  if (targetRow < 0) {
    return { success: false, message: '役割が見つかりません。' };
  }

  sheet.deleteRow(targetRow);
  return { success: true };
}

// ========== 担当者管理API ==========

/**
 * 担当者一覧を取得（全員、役割情報含む）
 */
function getStaffWithRoles() {
  checkPermission('staff_manage');
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.STAFF);

  if (!sheet || sheet.getLastRow() < 2) {
    return [];
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const staffList = [];

  for (let i = 1; i < data.length; i++) {
    const staff = {};
    headers.forEach((header, index) => {
      staff[header] = data[i][index];
    });
    staffList.push(staff);
  }

  return staffList;
}

/**
 * 役割名一覧を取得（権限設定シートから）
 */
function getRoleNames() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.PERMISSIONS);

  if (!sheet || sheet.getLastRow() < 2) {
    // デフォルト役割を返す（オブジェクト形式対応）
    return Object.keys(DEFAULT_ROLES);
  }

  const data = sheet.getDataRange().getValues();
  const roleNames = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) {
      roleNames.push(data[i][0]);
    }
  }

  return roleNames;
}

/**
 * 次の担当者IDを生成
 */
function generateNextStaffId() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.STAFF);

  let maxNum = 0;

  if (sheet && sheet.getLastRow() >= 2) {
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idIndex = headers.indexOf('担当者ID');

    if (idIndex !== -1) {
      for (let i = 1; i < data.length; i++) {
        const id = data[i][idIndex];
        if (id && typeof id === 'string' && id.startsWith(CONFIG.STAFF_ID_PREFIX)) {
          const numPart = parseInt(id.replace(CONFIG.STAFF_ID_PREFIX, ''), 10);
          if (!isNaN(numPart) && numPart > maxNum) {
            maxNum = numPart;
          }
        }
      }
    }
  }

  const nextNum = maxNum + 1;
  return CONFIG.STAFF_ID_PREFIX + String(nextNum).padStart(3, '0');
}

/**
 * 担当者を追加
 */
function addStaff(staffData) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.STAFF);

  if (!sheet) {
    return { success: false, message: '担当者マスタシートが見つかりません' };
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const newStaffId = generateNextStaffId();

  // 行データを作成
  const rowData = headers.map(header => {
    if (header === '担当者ID') {
      return newStaffId;
    }
    return staffData[header] || '';
  });

  sheet.appendRow(rowData);

  return { success: true, staffId: newStaffId };
}

/**
 * 担当者を更新
 */
function updateStaff(staffId, staffData) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.STAFF);

  if (!sheet || sheet.getLastRow() < 2) {
    return { success: false, message: '担当者マスタシートにデータがありません' };
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIndex = headers.indexOf('担当者ID');

  if (idIndex === -1) {
    return { success: false, message: '担当者ID列が見つかりません' };
  }

  // 担当者IDで行を検索
  let targetRow = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][idIndex] === staffId) {
      targetRow = i + 1; // 1-indexed
      break;
    }
  }

  if (targetRow === -1) {
    return { success: false, message: '担当者が見つかりません: ' + staffId };
  }

  // 更新データを適用
  Object.entries(staffData).forEach(([key, value]) => {
    const colIndex = headers.indexOf(key);
    if (colIndex !== -1 && key !== '担当者ID') {
      sheet.getRange(targetRow, colIndex + 1).setValue(value);
    }
  });

  return { success: true };
}

/**
 * 担当者を削除
 */
function deleteStaff(staffId) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.STAFF);

  if (!sheet || sheet.getLastRow() < 2) {
    return { success: false, message: '担当者マスタシートにデータがありません' };
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIndex = headers.indexOf('担当者ID');
  const roleIndex = headers.indexOf('役割');

  if (idIndex === -1) {
    return { success: false, message: '担当者ID列が見つかりません' };
  }

  // 担当者IDで行を検索
  let targetRow = -1;
  let targetRole = '';
  for (let i = 1; i < data.length; i++) {
    if (data[i][idIndex] === staffId) {
      targetRow = i + 1;
      targetRole = roleIndex !== -1 ? data[i][roleIndex] : '';
      break;
    }
  }

  if (targetRow === -1) {
    return { success: false, message: '担当者が見つかりません: ' + staffId };
  }

  // オーナー役割の担当者は削除不可
  if (targetRole === 'オーナー') {
    return { success: false, message: 'オーナー役割の担当者は削除できません。' };
  }

  sheet.deleteRow(targetRow);
  return { success: true };
}

// ========== 目標管理API ==========

/**
 * 目標一覧取得
 */
function getGoals(staffId) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.GOALS);

  if (!sheet) {
    return [];
  }

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data[0];
  const goals = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue; // 目標IDが空の行はスキップ

    const goal = {};
    headers.forEach((header, index) => {
      goal[header] = row[index];
    });

    // staffIdが指定されている場合はフィルタ
    if (staffId && goal['担当者ID'] !== staffId) {
      continue;
    }

    goals.push(goal);
  }

  return goals;
}

/**
 * 目標ID自動採番
 */
function generateNextGoalId() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.GOALS);

  if (!sheet || sheet.getLastRow() <= 1) {
    return 'GOAL-001';
  }

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  let maxNum = 0;

  data.forEach(row => {
    const match = String(row[0]).match(/GOAL-(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  });

  return 'GOAL-' + String(maxNum + 1).padStart(3, '0');
}

/**
 * 目標追加
 */
function addGoal(goalData) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.SHEETS.GOALS);

  if (!sheet) {
    initializeGoalsSheet(ss);
    sheet = ss.getSheetByName(CONFIG.SHEETS.GOALS);
  }

  // 目標ID自動採番
  const goalId = generateNextGoalId();
  const now = new Date();

  const newRow = [
    goalId,
    goalData.staffId,
    goalData.staffName,
    goalData.periodType,
    goalData.period,
    goalData.dealTarget || 0,
    goalData.wonTarget || 0,
    goalData.rateTarget || 0,
    goalData.salesTarget || 0,
    goalData.memo || '',
    now,
    now
  ];

  sheet.appendRow(newRow);

  return { success: true, goalId: goalId };
}

/**
 * 目標更新
 */
function updateGoal(goalId, goalData) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.GOALS);

  if (!sheet) {
    return { success: false, message: '目標設定シートが見つかりません' };
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === goalId) {
      const rowNum = i + 1;

      // 更新
      if (goalData.dealTarget !== undefined) {
        const colIdx = headers.indexOf('商談数目標');
        if (colIdx !== -1) sheet.getRange(rowNum, colIdx + 1).setValue(goalData.dealTarget);
      }
      if (goalData.wonTarget !== undefined) {
        const colIdx = headers.indexOf('成約数目標');
        if (colIdx !== -1) sheet.getRange(rowNum, colIdx + 1).setValue(goalData.wonTarget);
      }
      if (goalData.rateTarget !== undefined) {
        const colIdx = headers.indexOf('成約率目標');
        if (colIdx !== -1) sheet.getRange(rowNum, colIdx + 1).setValue(goalData.rateTarget);
      }
      if (goalData.salesTarget !== undefined) {
        const colIdx = headers.indexOf('売上目標');
        if (colIdx !== -1) sheet.getRange(rowNum, colIdx + 1).setValue(goalData.salesTarget);
      }
      if (goalData.memo !== undefined) {
        const colIdx = headers.indexOf('メモ');
        if (colIdx !== -1) sheet.getRange(rowNum, colIdx + 1).setValue(goalData.memo);
      }

      // 更新日
      const updateDateIdx = headers.indexOf('更新日');
      if (updateDateIdx !== -1) {
        sheet.getRange(rowNum, updateDateIdx + 1).setValue(new Date());
      }

      return { success: true };
    }
  }

  return { success: false, message: '目標が見つかりません' };
}

/**
 * 目標削除
 */
function deleteGoal(goalId) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.GOALS);

  if (!sheet || sheet.getLastRow() < 2) {
    return { success: false, message: '目標設定シートにデータがありません' };
  }

  const data = sheet.getDataRange().getValues();

  // 目標IDで行を検索
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === goalId) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }

  return { success: false, message: '目標が見つかりません: ' + goalId };
}

// ========== ユーザー認証API ==========

/**
 * 現在のユーザーの役割を取得
 */
function getCurrentUserRole() {
  const email = Session.getActiveUser().getEmail();

  // 担当者マスタからメールアドレスで検索
  const ss = getSpreadsheet();
  const staffSheet = ss.getSheetByName(CONFIG.SHEETS.STAFF);

  if (!staffSheet) {
    return { role: null, staffId: null, staffName: null, error: '担当者マスタが見つかりません' };
  }

  const data = staffSheet.getDataRange().getValues();
  const headers = data[0];
  const emailCol = headers.indexOf('メール');
  const roleCol = headers.indexOf('役割');
  const idCol = headers.indexOf('担当者ID');

  // 新形式（苗字/名前分離）と旧形式（氏名統合）の両方に対応
  const familyNameJaCol = headers.indexOf('苗字（日本語）');
  const givenNameJaCol = headers.indexOf('名前（日本語）');
  const oldNameCol = headers.indexOf('氏名（日本語）');

  for (let i = 1; i < data.length; i++) {
    if (data[i][emailCol] === email) {
      // スタッフ名を取得（新形式 → 旧形式の順で試行）
      let staffName = '';
      if (familyNameJaCol >= 0 && givenNameJaCol >= 0) {
        const family = data[i][familyNameJaCol] || '';
        const given = data[i][givenNameJaCol] || '';
        if (family || given) {
          staffName = (family + ' ' + given).trim();
        }
      }
      // 新形式で取得できなかった場合は旧形式を試す
      if (!staffName && oldNameCol >= 0) {
        staffName = data[i][oldNameCol] || '';
      }

      return {
        role: data[i][roleCol],
        staffId: data[i][idCol],
        staffName: staffName,
        email: email
      };
    }
  }

  // 担当者マスタに登録がない場合
  return { role: null, staffId: null, staffName: null, email: email, error: '担当者として登録されていません' };
}

/**
 * 役割に応じた権限を取得
 */
function getPermissionsByRole(role) {
  // 権限設定シートから取得
  const ss = getSpreadsheet();
  const permSheet = ss.getSheetByName(CONFIG.SHEETS.PERMISSIONS);

  if (!permSheet || permSheet.getLastRow() < 2) {
    // シートがない場合はデフォルト権限を使用
    return DEFAULT_ROLES[role] || {};
  }

  const data = permSheet.getDataRange().getValues();
  const headers = data[0];
  const roleCol = headers.indexOf('役割名');

  for (let i = 1; i < data.length; i++) {
    if (data[i][roleCol] === role) {
      const permissions = {};
      headers.forEach((header, index) => {
        if (header !== '役割名') {
          permissions[header] = data[i][index] === true || data[i][index] === 'TRUE';
        }
      });
      return permissions;
    }
  }

  return {};
}

/**
 * ユーザー情報と権限をまとめて取得
 */
function getCurrentUserWithPermissions() {
  const userInfo = getCurrentUserRole();

  if (userInfo.error || !userInfo.role) {
    return {
      ...userInfo,
      permissions: {},
      isAuthenticated: false
    };
  }

  const permissions = getPermissionsByRole(userInfo.role);

  return {
    ...userInfo,
    permissions: permissions,
    isAuthenticated: true
  };
}

// ========== 権限チェック ==========

/**
 * 権限チェック（各API関数の先頭で呼び出す）
 * @param {string} requiredPermission - 必要な権限キー（省略可）
 * @returns {Object} ユーザー情報
 * @throws {Error} 認証・権限エラー
 */
function checkPermission(requiredPermission) {
  const user = getCurrentUserWithPermissions();

  if (!user.isAuthenticated) {
    throw new Error('認証されていません。担当者マスタに登録されていません。');
  }

  if (requiredPermission && !user.permissions[requiredPermission]) {
    throw new Error(`権限がありません: ${requiredPermission}`);
  }

  return user;
}

// ========== リードKPI API ==========

/**
 * リードKPIを取得（IN/OUT共通）
 * @param {string} leadType - 'インバウンド' or 'アウトバウンド'
 * @returns {Object} { total, todayNew, unassigned, inProgress }
 */
function getLeadsKPI(leadType) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.LEADS);

  if (!sheet || sheet.getLastRow() < 2) {
    return { total: 0, todayNew: 0, unassigned: 0, inProgress: 0 };
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const typeIdx = headers.indexOf('リード種別');
  const statusIdx = headers.indexOf('進捗ステータス');
  const assignIdx = headers.indexOf('担当者');
  const regDateIdx = headers.indexOf('登録日');

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let total = 0, todayNew = 0, unassigned = 0, inProgress = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const type = row[typeIdx];
    const status = row[statusIdx];

    // リード種別フィルタ
    if (type !== leadType) continue;

    // リード段階のみ
    if (!CONFIG.LEAD_STATUSES.includes(status)) continue;

    total++;

    // 今日の新規
    const regDate = row[regDateIdx];
    if (regDate) {
      const regDateObj = new Date(regDate);
      if (regDateObj >= today) todayNew++;
    }

    // 未アサイン
    const assignee = row[assignIdx];
    if (!assignee || assignee === '') unassigned++;

    // 対応中
    if (status === '対応中') inProgress++;
  }

  return { total, todayNew, unassigned, inProgress };
}

// ========== CSダッシュボードAPI ==========

/**
 * CS用KPIメトリクスを取得（統合シート版）
 */
function getCSMetrics() {
  checkPermission('dashboard_cs');
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.LEADS);

  if (!sheet || sheet.getLastRow() < 2) {
    return { todayNewLeads: 0, waitingAssign: 0, weekAssigned: 0, totalLeads: 0 };
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const regDateIdx = headers.indexOf('登録日');
  const assignIdx = headers.indexOf('担当者');
  const assignDateIdx = headers.indexOf('アサイン日');
  const statusIdx = headers.indexOf('進捗ステータス');

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  let todayNewLeads = 0, waitingAssign = 0, weekAssigned = 0, totalLeads = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const status = row[statusIdx];

    // リード段階のみカウント
    if (!CONFIG.LEAD_STATUSES.includes(status)) continue;

    totalLeads++;

    // 今日の新規
    const regDate = row[regDateIdx];
    if (regDate) {
      const regDateObj = new Date(regDate);
      if (regDateObj >= today) todayNewLeads++;
    }

    // 担当者未設定
    const assignee = row[assignIdx];
    if (!assignee || assignee === '') waitingAssign++;

    // 今週アサイン
    const assignDate = row[assignDateIdx];
    if (assignDate && assignee) {
      const assignDateObj = new Date(assignDate);
      if (assignDateObj >= weekAgo && assignDateObj <= now) weekAssigned++;
    }
  }

  return { todayNewLeads, waitingAssign, weekAssigned, totalLeads };
}

// ========== 営業ダッシュボードAPI ==========

/**
 * 営業用メトリクスを取得（統合シート版）
 */
function getSalesMetrics(staffId) {
  checkPermission('dashboard_sales');
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.LEADS);

  if (!sheet || sheet.getLastRow() < 2) {
    return {
      totalDeals: 0, wonDeals: 0, lostDeals: 0, pendingDeals: 0,
      winRate: 0, totalSales: 0, todayActions: [],
      lastUpdated: new Date().toLocaleString('ja-JP')
    };
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const staffCol = headers.indexOf('担当者');
  const statusCol = headers.indexOf('進捗ステータス');
  const amountCol = headers.indexOf('月間見込み金額');
  const nextActionCol = headers.indexOf('次回アクション');
  const nextActionDateCol = headers.indexOf('次回アクション日');
  const customerCol = headers.indexOf('顧客名');
  const leadIdCol = headers.indexOf('リードID');
  const messageUrlCol = headers.indexOf('メッセージURL');

  let totalDeals = 0, wonDeals = 0, lostDeals = 0, pendingDeals = 0, totalSales = 0;
  const todayActions = [];
  const reminderActions = []; // 依存性UI用の拡張リマインダー
  const activeDeals = [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const weekLater = new Date(today);
  weekLater.setDate(weekLater.getDate() + 7);

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const status = row[statusCol];

    // 商談段階以降のみ
    if (!CONFIG.DEAL_STATUSES.includes(status) &&
        status !== CONFIG.PROGRESS_STATUSES.WON &&
        status !== CONFIG.PROGRESS_STATUSES.LOST) continue;

    // staffIdフィルタ
    if (staffId && row[staffCol] !== staffId) continue;

    totalDeals++;

    if (status === CONFIG.PROGRESS_STATUSES.WON) {
      wonDeals++;
      totalSales += Number(row[amountCol]) || 0;
    } else if (status === CONFIG.PROGRESS_STATUSES.LOST || status === CONFIG.PROGRESS_STATUSES.ON_HOLD) {
      lostDeals++;
    } else {
      pendingDeals++;
      // 進行中の案件をactiveDealsに追加
      activeDeals.push({
        leadId: row[leadIdCol] || '',
        customerName: row[customerCol] || '-',
        staffName: row[staffCol] || '-',
        status: status,
        amount: Number(row[amountCol]) || 0,
        nextAction: row[nextActionCol] || '-',
        nextActionDate: row[nextActionDateCol] ? Utilities.formatDate(new Date(row[nextActionDateCol]), 'Asia/Tokyo', 'M/d') : '-',
        messageUrl: row[messageUrlCol] || ''
      });
    }

    // 今日・明日のアクション + 依存性UI用リマインダー
    if (nextActionDateCol >= 0 && row[nextActionDateCol]) {
      // パイプ区切りの特殊値を処理（例: 2026-01-15|waiting_reply）
      const dateValue = String(row[nextActionDateCol]);
      const datePart = dateValue.split('|')[0];
      const typePart = dateValue.includes('|') ? dateValue.split('|')[1] : null;

      const actionDate = new Date(datePart);
      actionDate.setHours(0, 0, 0, 0);

      // 期限超過
      if (actionDate.getTime() < today.getTime()) {
        const daysOverdue = Math.floor((today.getTime() - actionDate.getTime()) / (1000 * 60 * 60 * 24));
        reminderActions.push({
          leadId: row[leadIdCol] || '',
          customer: row[customerCol] || '-',
          action: row[nextActionCol] || '-',
          date: daysOverdue + '日超過',
          priority: 'overdue',
          sortOrder: 0, // 最優先
          daysUntil: -daysOverdue,
          waitingType: typePart
        });
      } else if (actionDate.getTime() === today.getTime()) {
        todayActions.push({
          customer: row[customerCol] || '-',
          action: row[nextActionCol] || '-',
          date: '今日',
          priority: 'high'
        });
        reminderActions.push({
          leadId: row[leadIdCol] || '',
          customer: row[customerCol] || '-',
          action: row[nextActionCol] || '-',
          date: typePart === 'waiting_reply' ? '返信待ち' : typePart === 'waiting_confirm' ? '確認待ち' : '今日',
          priority: 'today',
          sortOrder: 1,
          daysUntil: 0,
          waitingType: typePart
        });
      } else if (actionDate.getTime() === tomorrow.getTime()) {
        todayActions.push({
          customer: row[customerCol] || '-',
          action: row[nextActionCol] || '-',
          date: '明日',
          priority: 'medium'
        });
        reminderActions.push({
          leadId: row[leadIdCol] || '',
          customer: row[customerCol] || '-',
          action: row[nextActionCol] || '-',
          date: typePart === 'waiting_reply' ? '返信待ち' : typePart === 'waiting_confirm' ? '確認待ち' : '明日',
          priority: 'tomorrow',
          sortOrder: 2,
          daysUntil: 1,
          waitingType: typePart
        });
      } else if (actionDate.getTime() <= weekLater.getTime()) {
        const daysUntil = Math.floor((actionDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        reminderActions.push({
          leadId: row[leadIdCol] || '',
          customer: row[customerCol] || '-',
          action: row[nextActionCol] || '-',
          date: typePart === 'waiting_reply' ? '返信待ち' : typePart === 'waiting_confirm' ? '確認待ち' : daysUntil + '日後',
          priority: typePart ? 'pending' : 'week',
          sortOrder: typePart ? 4 : 3,
          daysUntil: daysUntil,
          waitingType: typePart
        });
      }
    }
  }

  const closedDeals = wonDeals + lostDeals;

  // リマインダーを優先度順にソート
  reminderActions.sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.daysUntil - b.daysUntil;
  });

  return {
    totalDeals, wonDeals, lostDeals, pendingDeals,
    winRate: closedDeals > 0 ? Math.round((wonDeals / closedDeals) * 100) : 0,
    totalSales,
    todayActions: todayActions.slice(0, 5),
    reminderActions: reminderActions.slice(0, 10), // 依存性UI用
    activeDeals: activeDeals.slice(0, 10),
    lastUpdated: new Date().toLocaleString('ja-JP')
  };
}

/**
 * チーム成績を取得（統合シート版）
 */
function getTeamStats() {
  checkPermission('team_stats');
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.LEADS);
  const staffSheet = ss.getSheetByName(CONFIG.SHEETS.STAFF);

  if (!sheet || !staffSheet) {
    return [];
  }

  // 担当者一覧を取得
  const staffData = staffSheet.getDataRange().getValues();
  const staffHeaders = staffData[0];
  const staffIdCol = staffHeaders.indexOf('担当者ID');
  const roleCol = staffHeaders.indexOf('役割');

  // 新形式と旧形式の両方に対応
  const familyNameJaCol = staffHeaders.indexOf('苗字（日本語）');
  const givenNameJaCol = staffHeaders.indexOf('名前（日本語）');
  const oldNameCol = staffHeaders.indexOf('氏名（日本語）');

  const staffMap = {};
  for (let i = 1; i < staffData.length; i++) {
    const role = staffData[i][roleCol];
    if (role === '営業' || role === 'リーダー' || role === 'オーナー') {
      const staffId = staffData[i][staffIdCol];

      // スタッフ名を取得（新形式 → 旧形式）
      let staffName = '';
      if (familyNameJaCol >= 0 && givenNameJaCol >= 0) {
        const family = staffData[i][familyNameJaCol] || '';
        const given = staffData[i][givenNameJaCol] || '';
        if (family || given) {
          staffName = (family + ' ' + given).trim();
        }
      }
      if (!staffName && oldNameCol >= 0) {
        staffName = staffData[i][oldNameCol] || '';
      }

      if (staffId && staffName) {
        staffMap[staffName] = { staffId, name: staffName, deals: 0, won: 0, sales: 0 };
      }
    }
  }

  // リードデータを集計（商談段階以降）
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const dStaffCol = headers.indexOf('担当者');
  const dStatusCol = headers.indexOf('進捗ステータス');
  const dAmountCol = headers.indexOf('月間見込み金額');

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const status = row[dStatusCol];
    const staffName = row[dStaffCol];

    // 商談段階以降のみ
    if (!CONFIG.DEAL_STATUSES.includes(status) &&
        status !== CONFIG.PROGRESS_STATUSES.WON &&
        status !== CONFIG.PROGRESS_STATUSES.LOST) continue;

    if (staffMap[staffName]) {
      staffMap[staffName].deals++;
      if (status === CONFIG.PROGRESS_STATUSES.WON) {
        staffMap[staffName].won++;
        staffMap[staffName].sales += Number(row[dAmountCol]) || 0;
      }
    }
  }

  // 配列に変換してソート（売上順）
  const result = Object.values(staffMap).map(data => ({
    staffId: data.staffId,
    name: data.name,
    deals: data.deals,
    won: data.won,
    winRate: data.deals > 0 ? Math.round((data.won / data.deals) * 100) : 0,
    sales: data.sales
  }));

  result.sort((a, b) => b.sales - a.sales);

  return result;
}

// ========== リーダーダッシュボードAPI ==========

/**
 * リーダー用メトリクスを取得（統合シート版）
 */
function getLeaderMetrics() {
  checkPermission('dashboard_leader');
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.LEADS);
  const staffSheet = ss.getSheetByName(CONFIG.SHEETS.STAFF);

  if (!sheet || sheet.getLastRow() < 2) {
    return {
      cs: { totalLeads: 0, todayNewLeads: 0, waitingAssign: 0 },
      sales: { totalDeals: 0, wonDeals: 0, lostDeals: 0, pendingDeals: 0, winRate: 0, totalSales: 0 },
      salesRanking: [],
      lastUpdated: new Date().toLocaleString('ja-JP')
    };
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const regDateIdx = headers.indexOf('登録日');
  const assignIdx = headers.indexOf('担当者');
  const statusIdx = headers.indexOf('進捗ステータス');
  const amountIdx = headers.indexOf('月間見込み金額');

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // CS部門
  let totalLeads = 0, todayNewLeads = 0, waitingAssign = 0;
  // 営業部門
  let totalDeals = 0, wonDeals = 0, lostDeals = 0, pendingDeals = 0, totalSales = 0;
  // スタッフ別集計
  const staffMap = {};

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const status = row[statusIdx];
    const assignee = row[assignIdx];

    // CS部門集計（リード段階）
    if (CONFIG.LEAD_STATUSES.includes(status)) {
      totalLeads++;

      const regDate = row[regDateIdx];
      if (regDate) {
        const regDateObj = new Date(regDate);
        if (regDateObj >= today) todayNewLeads++;
      }

      if (!assignee || assignee === '') waitingAssign++;
    }

    // 営業部門集計（商談段階以降）
    if (CONFIG.DEAL_STATUSES.includes(status) ||
        status === CONFIG.PROGRESS_STATUSES.WON ||
        status === CONFIG.PROGRESS_STATUSES.LOST) {
      totalDeals++;

      if (status === CONFIG.PROGRESS_STATUSES.WON) {
        wonDeals++;
        totalSales += Number(row[amountIdx]) || 0;
      } else if (status === CONFIG.PROGRESS_STATUSES.LOST || status === CONFIG.PROGRESS_STATUSES.ON_HOLD) {
        lostDeals++;
      } else {
        pendingDeals++;
      }

      // スタッフ別
      if (assignee) {
        if (!staffMap[assignee]) {
          staffMap[assignee] = { name: assignee, deals: 0, won: 0, sales: 0 };
        }
        staffMap[assignee].deals++;
        if (status === CONFIG.PROGRESS_STATUSES.WON) {
          staffMap[assignee].won++;
          staffMap[assignee].sales += Number(row[amountIdx]) || 0;
        }
      }
    }
  }

  const closedDeals = wonDeals + lostDeals;
  const winRate = closedDeals > 0 ? Math.round((wonDeals / closedDeals) * 100) : 0;

  // ランキング作成
  const salesRanking = Object.values(staffMap).map(s => ({
    name: s.name,
    deals: s.deals,
    won: s.won,
    winRate: s.deals > 0 ? Math.round((s.won / s.deals) * 100) : 0,
    sales: s.sales
  }));
  salesRanking.sort((a, b) => b.sales - a.sales);

  return {
    cs: { totalLeads, todayNewLeads, waitingAssign },
    sales: { totalDeals, wonDeals, lostDeals, pendingDeals, winRate, totalSales },
    salesRanking: salesRanking.slice(0, 5),
    lastUpdated: new Date().toLocaleString('ja-JP')
  };
}

// ========== Buddy API ==========

/**
 * Buddyデータを取得（統合シート版）
 */
function getBuddyData(staffName) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.LEADS);

  // 時間帯に応じた挨拶
  const hour = new Date().getHours();
  let greeting = '';
  if (hour < 12) {
    greeting = 'おはよう、' + staffName + 'さん。今日もよろしく。';
  } else if (hour < 18) {
    greeting = 'お疲れさま、' + staffName + 'さん。調子はどう？';
  } else {
    greeting = 'こんばんは、' + staffName + 'さん。今日も頑張ったね。';
  }

  const todayActions = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (sheet && sheet.getLastRow() > 1) {
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const staffCol = headers.indexOf('担当者');
    const customerCol = headers.indexOf('顧客名');
    const nextActionCol = headers.indexOf('次回アクション');
    const nextActionDateCol = headers.indexOf('次回アクション日');
    const statusCol = headers.indexOf('進捗ステータス');

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[staffCol] !== staffName) continue;
      // 商談段階のみ
      if (!CONFIG.DEAL_STATUSES.includes(row[statusCol])) continue;

      if (nextActionDateCol >= 0 && row[nextActionDateCol]) {
        const actionDate = new Date(row[nextActionDateCol]);
        actionDate.setHours(0, 0, 0, 0);

        if (actionDate.getTime() === today.getTime()) {
          todayActions.push({
            customer: row[customerCol] || '-',
            action: row[nextActionCol] || '-',
            urgent: true
          });
        } else if (actionDate.getTime() < today.getTime()) {
          todayActions.push({
            customer: row[customerCol] || '-',
            action: row[nextActionCol] || '（期限超過）',
            urgent: true
          });
        }
      }
    }
  }

  if (todayActions.length > 0) {
    greeting += '\n\n今日のアクションが' + todayActions.length + '件あるよ。一緒に確認しよう。';
  } else {
    greeting += '\n\n何か相談したいことがあれば、いつでも話してね。';
  }

  return { greeting, todayActions };
}

/**
 * Buddyの応答を取得（Gemini API使用、フォールバックあり）
 */
function getBuddyResponse(userMessage, staffName) {
  const props = PropertiesService.getScriptProperties();
  const geminiApiKey = props.getProperty('GEMINI_API_KEY');

  // Gemini APIキーが設定されていない場合はフォールバック
  if (!geminiApiKey) {
    return getBuddyFallbackResponse(userMessage);
  }

  try {
    const systemPrompt = `あなたは「Buddy」という営業コーチAIです。

【キャラクター】
- 頼れる先輩、パートナー
- フレンドリーだがプロフェッショナル
- 包容力があり、聞き上手
- 一人称は「僕」

【絶対ルール】
- 事実（データ）に基づいた発言のみ行う
- 予測や主観的評価は禁止
- 質問を中心に相手に考えさせる
- 答えを教えず、気づきを促す
- 共感は許可（「大変だったね」「お疲れさま」等）
- 「さすが」「すごい」「頑張って」は使わない

【コミュニケーションスタイル】
- 聞いてから話す
- 押し付けない（「〜してみたら？」「〜はどう？」）
- 具体的なアドバイス
- 「一緒に」の姿勢

担当者名: ${staffName || '不明'}

ユーザーの発言に対し、2-3文で簡潔に返答してください。`;

    const response = UrlFetchApp.fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + geminiApiKey,
      {
        method: 'POST',
        contentType: 'application/json',
        payload: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: systemPrompt + '\n\nユーザー: ' + userMessage }] }
          ],
          generationConfig: {
            maxOutputTokens: 200,
            temperature: 0.7
          }
        }),
        muteHttpExceptions: true
      }
    );

    const result = JSON.parse(response.getContentText());
    if (result.candidates && result.candidates[0] && result.candidates[0].content) {
      return result.candidates[0].content.parts[0].text;
    }

    return getBuddyFallbackResponse(userMessage);
  } catch (error) {
    console.error('Gemini API error:', error);
    return getBuddyFallbackResponse(userMessage);
  }
}

/**
 * Buddyのフォールバック応答
 */
function getBuddyFallbackResponse(userMessage) {
  const message = userMessage.toLowerCase();

  if (message.includes('困') || message.includes('うまくいかない') || message.includes('難しい')) {
    return '大変な状況なんだね。もう少し詳しく聞かせてもらえる？一緒に考えよう。';
  }

  if (message.includes('成約') || message.includes('決まった') || message.includes('成功')) {
    return 'それは良かったね！何が良かったと思う？次に活かせるポイントを振り返ってみよう。';
  }

  if (message.includes('相談') || message.includes('アドバイス')) {
    return 'なるほど。どんなことで悩んでいる？具体的に教えてもらえると、一緒に考えやすいよ。';
  }

  return 'うん、聞いてるよ。もう少し詳しく聞かせて。';
}

// ========== 商談レポートAPI ==========

/**
 * 商談レポートを保存
 */
function saveDealReport(reportData) {
  const ss = getSpreadsheet();

  // 商談レポートシートを取得（または作成）- LockService使用（TROUBLE-018対応）
  let reportSheet = ss.getSheetByName('商談レポート');
  if (!reportSheet) {
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(30000);
      // ロック取得後に再確認
      reportSheet = ss.getSheetByName('商談レポート');
      if (!reportSheet) {
        reportSheet = ss.insertSheet('商談レポート');
        reportSheet.appendRow([
          'レポートID', '担当者ID', '担当者名', '商談ID', '顧客名',
          '商談日', '手応え', '良かった点', '改善したい点', '次のアクション',
          'Buddyフォロー', '作成日時'
        ]);
      }
    } finally {
      lock.releaseLock();
    }
  }

  // 顧客名を取得
  const leadSheet = ss.getSheetByName(CONFIG.SHEETS.LEADS);
  let customerName = '-';
  if (leadSheet && leadSheet.getLastRow() > 1) {
    const leadData = leadSheet.getDataRange().getValues();
    const headers = leadData[0];
    const idCol = headers.indexOf('リードID');
    const nameCol = headers.indexOf('顧客名');

    for (let i = 1; i < leadData.length; i++) {
      if (leadData[i][idCol] === reportData.dealId) {
        customerName = leadData[i][nameCol] || '-';
        break;
      }
    }
  }

  // レポートID生成
  const reportId = 'RPT-' + Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyyMMddHHmmss');

  // Buddyフォローを生成
  let buddyFollow = '';
  if (reportData.improvements && reportData.improvements.trim()) {
    buddyFollow = getBuddyReportFollow(reportData.improvements);
  }

  // 保存
  reportSheet.appendRow([
    reportId,
    reportData.staffId,
    reportData.staffName,
    reportData.dealId,
    customerName,
    reportData.date,
    reportData.feeling,
    reportData.goodPoints,
    reportData.improvements,
    reportData.nextAction,
    buddyFollow,
    new Date()
  ]);

  return {
    success: true,
    reportId: reportId,
    buddyFollow: buddyFollow
  };
}

/**
 * レポートに対するBuddyフォローを生成
 */
function getBuddyReportFollow(improvements) {
  const props = PropertiesService.getScriptProperties();
  const geminiApiKey = props.getProperty('GEMINI_API_KEY');

  if (!geminiApiKey) {
    return '商談レポートありがとう。改善したい点について、次回どう対応するか考えてみよう。';
  }

  try {
    const prompt = `あなたは営業コーチのBuddyです。
担当者が商談レポートで「改善したい点」として以下を書きました。

「${improvements}」

この内容に対して、リフレクティング（内容を反映）と質問で返答してください。
- 2文以内で簡潔に
- 押し付けない
- 「さすが」「頑張って」は使わない`;

    const response = UrlFetchApp.fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + geminiApiKey,
      {
        method: 'POST',
        contentType: 'application/json',
        payload: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 100, temperature: 0.7 }
        }),
        muteHttpExceptions: true
      }
    );

    const result = JSON.parse(response.getContentText());
    if (result.candidates && result.candidates[0] && result.candidates[0].content) {
      return result.candidates[0].content.parts[0].text;
    }
  } catch (error) {
    console.error('Gemini API error:', error);
  }

  return '商談レポートありがとう。改善したい点について、次回どう対応するか考えてみよう。';
}

// ========== ログイン/ログアウト記録API ==========

/**
 * ログインを記録
 */
function recordLogin(staffId) {
  const ss = getSpreadsheet();

  // ログイン履歴シートを取得（または作成）- LockService使用（TROUBLE-018対応）
  let logSheet = ss.getSheetByName('ログイン履歴');
  if (!logSheet) {
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(30000);
      logSheet = ss.getSheetByName('ログイン履歴');
      if (!logSheet) {
        logSheet = ss.insertSheet('ログイン履歴');
        logSheet.appendRow([
          'ログID', '担当者ID', 'ログイン日時', 'ログアウト日時', '稼働時間（分）', '最終ハートビート'
        ]);
      }
    } finally {
      lock.releaseLock();
    }
  }

  const logId = 'LLOG-' + Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyyMMddHHmmss');
  const now = new Date();

  logSheet.appendRow([
    logId,
    staffId,
    now,
    '', // ログアウト日時は後で記録
    '',
    now
  ]);

  return { success: true, logId: logId };
}

/**
 * ハートビートを記録
 */
function recordHeartbeat(staffId) {
  const ss = getSpreadsheet();
  const logSheet = ss.getSheetByName('ログイン履歴');

  if (!logSheet || logSheet.getLastRow() < 2) return;

  const data = logSheet.getDataRange().getValues();
  const headers = data[0];
  const staffIdCol = headers.indexOf('担当者ID');
  const logoutCol = headers.indexOf('ログアウト日時');
  const heartbeatCol = headers.indexOf('最終ハートビート');

  // 最新のログインレコードを検索（ログアウト日時が空のもの）
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][staffIdCol] === staffId && !data[i][logoutCol]) {
      logSheet.getRange(i + 1, heartbeatCol + 1).setValue(new Date());
      return;
    }
  }
}

/**
 * 非アクティブユーザーをチェック（時間主導トリガーで実行）
 */
function checkInactiveUsers() {
  const ss = getSpreadsheet();
  const logSheet = ss.getSheetByName('ログイン履歴');

  if (!logSheet || logSheet.getLastRow() < 2) return;

  const data = logSheet.getDataRange().getValues();
  const headers = data[0];
  const logoutCol = headers.indexOf('ログアウト日時');
  const heartbeatCol = headers.indexOf('最終ハートビート');
  const loginCol = headers.indexOf('ログイン日時');
  const workTimeCol = headers.indexOf('稼働時間（分）');

  const now = new Date();
  const threshold = 30 * 60 * 1000; // 30分

  for (let i = 1; i < data.length; i++) {
    // ログアウト日時が空のレコード
    if (!data[i][logoutCol]) {
      const lastHeartbeat = new Date(data[i][heartbeatCol]);
      const elapsed = now.getTime() - lastHeartbeat.getTime();

      // 30分以上非アクティブ
      if (elapsed > threshold) {
        const loginTime = new Date(data[i][loginCol]);
        const workMinutes = Math.round((lastHeartbeat.getTime() - loginTime.getTime()) / (1000 * 60));

        logSheet.getRange(i + 1, logoutCol + 1).setValue(lastHeartbeat);
        logSheet.getRange(i + 1, workTimeCol + 1).setValue(workMinutes);
      }
    }
  }
}

// ========== アラート機能 ==========

/**
 * ネクストアクション未設定/期限超過をチェック（統合シート版）
 */
function checkNextActionAlerts() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.LEADS);

  if (!sheet || sheet.getLastRow() < 2) return { noNextAction: [], overdue: [] };

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf('リードID');
  const customerCol = headers.indexOf('顧客名');
  const staffCol = headers.indexOf('担当者');
  const nextActionDateCol = headers.indexOf('次回アクション日');
  const statusCol = headers.indexOf('進捗ステータス');

  const alerts = { noNextAction: [], overdue: [] };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const status = row[statusCol];

    // 商談段階のみチェック
    if (!CONFIG.DEAL_STATUSES.includes(status)) continue;

    const nextActionDate = row[nextActionDateCol];

    if (!nextActionDate) {
      alerts.noNextAction.push({
        dealId: row[idCol],
        customer: row[customerCol],
        staff: row[staffCol]
      });
    } else {
      const actionDate = new Date(nextActionDate);
      actionDate.setHours(0, 0, 0, 0);

      if (actionDate < twoDaysAgo) {
        const daysOverdue = Math.floor((today - actionDate) / (1000 * 60 * 60 * 24));
        alerts.overdue.push({
          dealId: row[idCol],
          customer: row[customerCol],
          staff: row[staffCol],
          daysOverdue
        });
      }
    }
  }

  return alerts;
}

/**
 * 滞留案件をチェック（統合シート版）
 */
function checkStagnantDeals(days) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.LEADS);

  if (!sheet || sheet.getLastRow() < 2) return [];

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf('リードID');
  const customerCol = headers.indexOf('顧客名');
  const staffCol = headers.indexOf('担当者');
  const statusCol = headers.indexOf('進捗ステータス');
  const updateCol = headers.indexOf('シート更新日');

  const stagnantDeals = [];
  const today = new Date();
  const threshold = days * 24 * 60 * 60 * 1000;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const status = row[statusCol];

    // 商談段階のみチェック
    if (!CONFIG.DEAL_STATUSES.includes(status)) continue;

    const updateDate = row[updateCol];
    if (updateDate) {
      const elapsed = today.getTime() - new Date(updateDate).getTime();
      if (elapsed > threshold) {
        const daysStagnant = Math.floor(elapsed / (1000 * 60 * 60 * 24));
        stagnantDeals.push({
          dealId: row[idCol],
          customer: row[customerCol],
          staff: row[staffCol],
          status,
          daysStagnant
        });
      }
    }
  }

  return stagnantDeals;
}

/**
 * 日次アラートバッチ（毎日9時に実行）
 */
function dailyAlertBatch() {
  const nextActionAlerts = checkNextActionAlerts();
  const stagnantAlerts = checkStagnantDeals(7);

  // Discord通知
  const props = PropertiesService.getScriptProperties();
  const webhookUrl = props.getProperty('DISCORD_ALERT_WEBHOOK') || props.getProperty('PMO_DISCORD_WEBHOOK');

  if (!webhookUrl) return;

  let message = '';

  // ネクストアクション未設定
  if (nextActionAlerts.noNextAction.length > 0) {
    message += '**⚠️ ネクストアクション未設定: ' + nextActionAlerts.noNextAction.length + '件**\n';
    nextActionAlerts.noNextAction.slice(0, 5).forEach(a => {
      message += '・' + a.customer + '（担当: ' + a.staff + '）\n';
    });
    message += '\n';
  }

  // 期限超過
  if (nextActionAlerts.overdue.length > 0) {
    message += '**⏰ 期限超過: ' + nextActionAlerts.overdue.length + '件**\n';
    nextActionAlerts.overdue.slice(0, 5).forEach(a => {
      message += '・' + a.customer + '（担当: ' + a.staff + '）' + a.daysOverdue + '日経過\n';
    });
    message += '\n';
  }

  // 滞留案件
  if (stagnantAlerts.length > 0) {
    message += '**📋 滞留案件（7日以上）: ' + stagnantAlerts.length + '件**\n';
    stagnantAlerts.slice(0, 5).forEach(a => {
      message += '・' + a.customer + '（' + a.status + '）' + a.daysStagnant + '日経過\n';
    });
  }

  if (message) {
    sendDiscordNotification(webhookUrl, '【CRM日次アラート】\n\n' + message);
  }
}

/**
 * Discord通知を送信
 */
function sendDiscordNotification(webhookUrl, message) {
  try {
    UrlFetchApp.fetch(webhookUrl, {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify({ content: message }),
      muteHttpExceptions: true
    });
  } catch (error) {
    console.error('Discord通知エラー:', error);
  }
}

// ========== 離脱リード・重複検知API ==========

/**
 * リードの重複をチェック
 * @param {Object} params - { email, messageUrl, customerName, source }
 * @returns {Object} 重複情報
 */
function checkLeadDuplicate(params) {
  const email = params.email || '';
  const messageUrl = params.messageUrl || '';
  const customerName = params.customerName || '';
  const source = params.source || '';

  return checkDuplicateLead(email, messageUrl, customerName, source);
}

/**
 * リードを離脱リードとしてアーカイブ
 * @param {Object} params - { leadId, dropReason, csMemo }
 * @returns {Object} { success: boolean, message: string }
 */
function archiveDroppedLead(params) {
  const leadId = params.leadId;
  const dropReason = params.dropReason;
  const csMemo = params.csMemo;

  // バリデーションエラーはそのままthrow（archiveToDroppedLeadで処理）
  return archiveToDroppedLead(leadId, dropReason, csMemo);
}

/**
 * 離脱理由の選択肢を取得
 * @returns {Array} 離脱理由リスト
 */
function getDropReasons() {
  return CONFIG.DROP_REASONS || ['無返信', '価格NG', '対象外', '競合流出', 'その他'];
}

/**
 * アーカイブ済みリード一覧を取得
 * （リード管理シート内で進捗ステータスが「アーカイブ」のリード）
 * @returns {Array} アーカイブ済みリードリスト
 */
function getArchivedLeads() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.LEADS);

  if (!sheet || sheet.getLastRow() < 2) {
    return [];
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const statusCol = headers.indexOf('進捗ステータス');
  const leads = [];

  for (let i = 1; i < data.length; i++) {
    const status = data[i][statusCol];
    // 進捗ステータスが「アーカイブ」のリードのみ
    if (status !== 'アーカイブ') continue;

    const lead = {};
    headers.forEach((header, index) => {
      let value = data[i][index];
      // Date オブジェクトは ISO 文字列に変換
      if (value instanceof Date) {
        value = value.toISOString();
      }
      lead[header] = value;
    });
    leads.push(lead);
  }

  return leads;
}

/**
 * アーカイブからリードを復元（アーカイブ情報をクリア）
 * @param {string} leadId - リードID
 * @param {string} newStatus - 復元後のステータス（デフォルト: 追客）
 * @returns {Object} {success: boolean, error?: string}
 */
function restoreLeadFromArchive(leadId, newStatus) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEETS.LEADS);

    if (!sheet) {
      return { success: false, error: 'シートが見つかりません' };
    }

    // リードデータを取得
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idCol = headers.indexOf('リードID');
    const archiveDateCol = headers.indexOf('アーカイブ日');
    const archiveReasonCol = headers.indexOf('アーカイブ理由');
    const statusCol = headers.indexOf('進捗ステータス');
    const reapproachDateCol = headers.indexOf('次回アクション日');
    const updateDateCol = headers.indexOf('シート更新日');

    let leadRowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][idCol] === leadId) {
        leadRowIndex = i + 1;
        break;
      }
    }

    if (leadRowIndex === -1) {
      return { success: false, error: 'リードが見つかりません' };
    }

    const now = new Date();

    // アーカイブ情報をクリアし、ステータスを復元
    if (archiveDateCol >= 0) {
      sheet.getRange(leadRowIndex, archiveDateCol + 1).setValue('');
    }
    if (archiveReasonCol >= 0) {
      sheet.getRange(leadRowIndex, archiveReasonCol + 1).setValue('');
    }
    if (statusCol >= 0) {
      sheet.getRange(leadRowIndex, statusCol + 1).setValue(newStatus || '対応中');
    }
    if (reapproachDateCol >= 0) {
      sheet.getRange(leadRowIndex, reapproachDateCol + 1).setValue(now);
    }
    if (updateDateCol >= 0) {
      sheet.getRange(leadRowIndex, updateDateCol + 1).setValue(now);
    }

    return { success: true };
  } catch (e) {
    console.error('restoreLeadFromArchive error:', e);
    return { success: false, error: e.message };
  }
}

/**
 * リードのCSメモを取得
 * @param {string} leadId - リードID
 * @returns {string} CSメモ
 */
function getLeadCsMemo(leadId) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.LEADS);

  if (!sheet || sheet.getLastRow() < 2) {
    return '';
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const leadIdIdx = headers.indexOf('リードID');
  const csMemoIdx = headers.indexOf('CSメモ');

  if (leadIdIdx === -1 || csMemoIdx === -1) {
    return '';
  }

  for (let i = 1; i < data.length; i++) {
    if (data[i][leadIdIdx] === leadId) {
      return data[i][csMemoIdx] || '';
    }
  }

  return '';
}

// ========== デバッグ関数 ==========
/**
 * リードページのデータ取得をテスト
 * GASエディタから直接実行してログを確認
 */
function debugLeadsPage() {
  Logger.log('===== debugLeadsPage START =====');

  // シート確認
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.LEADS);
  Logger.log('シート名: ' + CONFIG.SHEETS.LEADS);
  Logger.log('シート存在: ' + (sheet ? 'あり' : 'なし'));

  if (!sheet) {
    Logger.log('ERROR: シートが見つかりません');
    return;
  }

  const lastRow = sheet.getLastRow();
  Logger.log('lastRow: ' + lastRow);

  if (lastRow < 2) {
    Logger.log('ERROR: データ行がありません');
    return;
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  Logger.log('ヘッダー: ' + headers.join(', '));

  const typeIdx = headers.indexOf('リード種別');
  const statusIdx = headers.indexOf('進捗ステータス');
  Logger.log('リード種別の列インデックス: ' + typeIdx);
  Logger.log('進捗ステータスの列インデックス: ' + statusIdx);
  Logger.log('CONFIG.LEAD_STATUSES: ' + JSON.stringify(CONFIG.LEAD_STATUSES));

  // 期待される値の文字コード
  const expectedType = 'インバウンド';
  const expectedTypeChars = expectedType.split('').map(c => c.charCodeAt(0)).join(',');
  Logger.log('期待値 "' + expectedType + '" の文字コード: [' + expectedTypeChars + ']');

  // 最初の5行のデータを表示
  Logger.log('--- 最初の5行のデータ ---');
  for (let i = 1; i < Math.min(6, data.length); i++) {
    const row = data[i];
    const actualType = row[typeIdx] ? row[typeIdx].toString() : '';
    const actualStatus = row[statusIdx] ? row[statusIdx].toString() : '';
    const typeMatch = (actualType === expectedType);

    Logger.log('Row ' + i + ': リード種別="' + actualType + '", 進捗ステータス="' + actualStatus + '"');
    Logger.log('  リード種別一致=' + typeMatch + ', ステータス含む=' + CONFIG.LEAD_STATUSES.includes(actualStatus));

    if (actualType && !typeMatch) {
      const actualChars = actualType.split('').map(c => c.charCodeAt(0)).join(',');
      Logger.log('  文字コード比較: actual=[' + actualChars + '] expected=[' + expectedTypeChars + ']');
    }
  }

  // getLeadsを呼び出し
  Logger.log('--- getLeads("lead", "インバウンド") 呼び出し ---');
  try {
    const result = getLeads('lead', 'インバウンド');
    Logger.log('結果: ' + result.length + '件');
    if (result.length > 0) {
      Logger.log('最初のリード: ' + JSON.stringify(result[0]));
    } else {
      Logger.log('データが0件です - フィルタ条件を確認してください');
    }
  } catch (e) {
    Logger.log('ERROR: ' + e.message);
    Logger.log('Stack: ' + e.stack);
  }

  Logger.log('===== debugLeadsPage END =====');
}

/**
 * フィルタなしで全リードを取得（デバッグ用）
 * クライアントから呼び出し可能
 */
function getAllLeadsNoFilter() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.LEADS);

  if (!sheet || sheet.getLastRow() < 2) {
    return { error: 'シートが見つからないかデータがありません', leads: [] };
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const typeIdx = headers.indexOf('リード種別');
  const statusIdx = headers.indexOf('進捗ステータス');

  const leads = [];
  const stats = { total: 0, inbound: 0, outbound: 0, newStatus: 0, inProgressStatus: 0, other: 0 };

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const type = row[typeIdx] ? row[typeIdx].toString() : '';
    const status = row[statusIdx] ? row[statusIdx].toString() : '';

    stats.total++;
    if (type === 'インバウンド') stats.inbound++;
    else if (type === 'アウトバウンド') stats.outbound++;
    if (status === '新規') stats.newStatus++;
    else if (status === '対応中') stats.inProgressStatus++;
    else stats.other++;

    // 最初の5件だけ詳細を返す
    if (leads.length < 5) {
      leads.push({
        row: i + 1,
        リード種別: type,
        リード種別_length: type.length,
        進捗ステータス: status,
        進捗ステータス_length: status.length
      });
    }
  }

  return {
    stats: stats,
    sampleLeads: leads,
    headerIndexes: { typeIdx: typeIdx, statusIdx: statusIdx },
    expectedValues: {
      インバウンド_length: 'インバウンド'.length,
      新規_length: '新規'.length,
      対応中_length: '対応中'.length
    }
  };
}

/**
 * getLeadsの動作テスト（フロントエンドから呼び出し可能）
 */
function testGetLeads() {
  console.log('testGetLeads START');
  try {
    const result = getLeads('lead', 'インバウンド');
    console.log('testGetLeads: result type=' + typeof result);
    console.log('testGetLeads: is array=' + Array.isArray(result));
    console.log('testGetLeads: length=' + (result ? result.length : 'null'));

    return {
      success: true,
      type: typeof result,
      isArray: Array.isArray(result),
      length: result ? result.length : 0,
      sample: result && result.length > 0 ? result[0] : null
    };
  } catch (e) {
    console.log('testGetLeads ERROR: ' + e.message);
    return {
      success: false,
      error: e.message,
      stack: e.stack
    };
  }
}

/**
 * 診断用: シンプルな配列を返すテスト
 * google.script.runの通信を確認
 */
function diagnosticSimpleArray() {
  return ['test1', 'test2', 'test3'];
}

/**
 * 診断用: シート構造を確認（GASエディタから実行）
 */
function diagnoseSheetsStructure() {
  const ss = getSpreadsheet();
  Logger.log('=== シート構造診断 ===');
  Logger.log('スプレッドシート名: ' + ss.getName());
  Logger.log('スプレッドシートID: ' + ss.getId());

  const sheet = ss.getSheetByName(CONFIG.SHEETS.LEADS);
  if (!sheet) {
    Logger.log('ERROR: リード管理シートが見つかりません');
    return;
  }

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  Logger.log('リード管理シート: 行数=' + lastRow + ', 列数=' + lastCol);

  // ヘッダー取得
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  Logger.log('ヘッダー数: ' + headers.length);
  Logger.log('期待する列数: 60');

  // 重要な列のインデックス確認
  const checkColumns = ['リードID', 'リード種別', '進捗ステータス', '顧客名', '担当者'];
  checkColumns.forEach(col => {
    const idx = headers.indexOf(col);
    Logger.log('  ' + col + ': index=' + idx + (idx === -1 ? ' *** NOT FOUND ***' : ''));
  });

  // 列数の差分
  if (headers.length !== 60) {
    Logger.log('*** 警告: 列数が60ではありません ***');
    Logger.log('不足/余剰列数: ' + (headers.length - 60));
  }

  // データ行の確認
  if (lastRow >= 2) {
    const firstDataRow = sheet.getRange(2, 1, 1, lastCol).getValues()[0];
    const typeIdx = headers.indexOf('リード種別');
    const statusIdx = headers.indexOf('進捗ステータス');
    Logger.log('最初のデータ行:');
    Logger.log('  リード種別: "' + (typeIdx >= 0 ? firstDataRow[typeIdx] : 'N/A') + '"');
    Logger.log('  進捗ステータス: "' + (statusIdx >= 0 ? firstDataRow[statusIdx] : 'N/A') + '"');
  }

  Logger.log('=== 診断完了 ===');
}

/**
 * 診断用: 全ヘッダーを列番号付きで出力
 */
function diagnoseAllHeaders() {
  const ss = getSpreadsheet();
  Logger.log('=== 全ヘッダー診断 ===');
  Logger.log('スプレッドシート名: ' + ss.getName());

  const sheet = ss.getSheetByName(CONFIG.SHEETS.LEADS);
  if (!sheet) {
    Logger.log('ERROR: リード管理シートが見つかりません');
    return;
  }

  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

  Logger.log('総列数: ' + lastCol);
  Logger.log('');
  Logger.log('列番号 | 列文字 | ヘッダー名');
  Logger.log('-------|--------|------------');

  for (let i = 0; i < headers.length; i++) {
    const colNum = i + 1;
    const colLetter = getColumnLetter(colNum);
    const header = headers[i] || '(空)';
    Logger.log(colNum.toString().padStart(2, ' ') + '     | ' + colLetter.padEnd(6, ' ') + ' | ' + header);
  }

  // 重複チェック
  Logger.log('');
  Logger.log('=== 重複ヘッダーチェック ===');
  const headerCount = {};
  headers.forEach((h, idx) => {
    if (h) {
      if (!headerCount[h]) headerCount[h] = [];
      headerCount[h].push(idx + 1);
    }
  });

  let hasDuplicate = false;
  Object.keys(headerCount).forEach(h => {
    if (headerCount[h].length > 1) {
      hasDuplicate = true;
      Logger.log('重複: "' + h + '" → 列 ' + headerCount[h].join(', '));
    }
  });

  if (!hasDuplicate) {
    Logger.log('重複なし');
  }

  Logger.log('=== 診断完了 ===');
}

/**
 * 列番号から列文字を取得（A, B, ... Z, AA, AB...）
 */
function getColumnLetter(colNum) {
  let letter = '';
  while (colNum > 0) {
    const mod = (colNum - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    colNum = Math.floor((colNum - 1) / 26);
  }
  return letter;
}

/**
 * 診断用: getLeadsの各ステップを検証
 */
function diagnosticGetLeadsSteps() {
  const results = {
    step1_start: true,
    step2_permission: null,
    step3_spreadsheet: null,
    step4_sheet: null,
    step5_data: null,
    step6_result: null,
    error: null
  };

  try {
    // Step 2: 権限チェック
    try {
      const user = getCurrentUserWithPermissions();
      results.step2_permission = {
        isAuthenticated: user.isAuthenticated,
        hasPermission: user.permissions && user.permissions.lead_view,
        email: user.email,
        role: user.role
      };
    } catch (e) {
      results.step2_permission = { error: e.message };
    }

    // Step 3: スプレッドシート取得
    const ss = getSpreadsheet();
    results.step3_spreadsheet = ss ? 'OK' : 'FAILED';

    if (!ss) return results;

    // Step 4: シート取得
    const sheet = ss.getSheetByName(CONFIG.SHEETS.LEADS);
    results.step4_sheet = sheet ? 'OK (' + sheet.getLastRow() + ' rows)' : 'FAILED';

    if (!sheet) return results;

    // Step 5: データ取得（最初の行のみ）
    const lastRow = sheet.getLastRow();
    if (lastRow >= 2) {
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const firstRow = sheet.getRange(2, 1, 1, sheet.getLastColumn()).getValues()[0];
      results.step5_data = {
        headerCount: headers.length,
        sampleHeaders: headers.slice(0, 5),
        typeIdx: headers.indexOf('リード種別'),
        statusIdx: headers.indexOf('進捗ステータス'),
        firstRowType: firstRow[headers.indexOf('リード種別')],
        firstRowStatus: firstRow[headers.indexOf('進捗ステータス')]
      };
    } else {
      results.step5_data = 'NO_DATA';
    }

    // Step 6: getLeads実行
    const leads = getLeads('lead', 'インバウンド');
    results.step6_result = {
      type: typeof leads,
      isArray: Array.isArray(leads),
      length: leads ? leads.length : 0
    };

  } catch (e) {
    results.error = e.message + ' | ' + e.stack;
  }

  return results;
}

/**
 * 緊急診断用: getLeadsの動作確認
 * GASエディタから実行してログを確認
 */
function debugGetLeads() {
  console.log('=== getLeads診断開始 ===');

  const startTime = new Date();

  try {
    const ss = getSpreadsheet();
    if (!ss) {
      console.log('ERROR: スプレッドシートが取得できません');
      return;
    }

    const sheet = ss.getSheetByName(CONFIG.SHEETS.LEADS);
    if (!sheet) {
      console.log('ERROR: リード管理シートが見つかりません');
      return;
    }

    console.log('シート取得完了: ' + (new Date() - startTime) + 'ms');

    const lastRow = sheet.getLastRow();
    console.log('データ行数: ' + lastRow);

    if (lastRow < 2) {
      console.log('ERROR: データ行がありません');
      return;
    }

    const data = sheet.getDataRange().getValues();
    console.log('データ取得完了: ' + (new Date() - startTime) + 'ms');

    const headers = data[0];
    const typeIdx = headers.indexOf('リード種別');
    const statusIdx = headers.indexOf('進捗ステータス');
    const idIdx = headers.indexOf('リードID');

    console.log('リード種別列: ' + typeIdx);
    console.log('進捗ステータス列: ' + statusIdx);
    console.log('CONFIG.LEAD_STATUSES: ' + JSON.stringify(CONFIG.LEAD_STATUSES));

    // 最初の5行のデータを確認
    console.log('--- 最初の5行のデータ ---');
    for (let i = 1; i < Math.min(6, data.length); i++) {
      const leadId = data[i][idIdx] || '';
      const type = data[i][typeIdx] || '';
      const status = data[i][statusIdx] || '';

      console.log('行' + i + ' リードID: ' + leadId + ', 種別: "' + type + '", ステータス: "' + status + '"');

      // 文字列の長さと文字コードを確認
      if (type) {
        const typeChars = type.toString().split('').map(c => c.charCodeAt(0));
        console.log('  種別の文字コード: [' + typeChars.join(',') + ']');
      }
      if (status) {
        const statusChars = status.toString().split('').map(c => c.charCodeAt(0));
        console.log('  ステータスの文字コード: [' + statusChars.join(',') + ']');
      }
    }

    // 各種別・ステータスのカウント
    let inboundCount = 0, outboundCount = 0, otherTypeCount = 0;
    let newCount = 0, inProgressCount = 0, otherStatusCount = 0;

    for (let i = 1; i < data.length; i++) {
      const type = (data[i][typeIdx] || '').toString().trim();
      const status = (data[i][statusIdx] || '').toString().trim();

      if (type === 'インバウンド') inboundCount++;
      else if (type === 'アウトバウンド') outboundCount++;
      else otherTypeCount++;

      if (status === '新規') newCount++;
      else if (status === '対応中') inProgressCount++;
      else otherStatusCount++;
    }

    console.log('--- 集計結果 ---');
    console.log('インバウンド: ' + inboundCount + '件');
    console.log('アウトバウンド: ' + outboundCount + '件');
    console.log('その他種別: ' + otherTypeCount + '件');
    console.log('新規: ' + newCount + '件');
    console.log('対応中: ' + inProgressCount + '件');
    console.log('その他ステータス: ' + otherStatusCount + '件');

    console.log('=== 診断完了: ' + (new Date() - startTime) + 'ms ===');

  } catch (e) {
    console.log('エラー: ' + e.message);
    console.log('スタック: ' + e.stack);
  }
}

// ============================================================
// 会話ログ・お知らせ・重複検知 API
// ============================================================

/**
 * 未読お知らせを取得（フロントエンド用）
 */
function getUnreadNoticesForUser(staffId) {
  return getUnreadNotices(staffId);
}

/**
 * 全お知らせを取得（履歴用）
 */
function getAllNoticesForUser(staffId) {
  return getAllNotices(staffId);
}

/**
 * 会話ログを取得
 */
function getConversationLogsForLead(leadId, type) {
  return getConversationLogs(leadId, type);
}

/**
 * 会話ログを追加（翻訳あり）
 */
function addConversationLogWithTranslate(data) {
  return translateAndAddLog(data);
}

/**
 * メッセージを翻訳
 */
function translateMessageApi(text, direction) {
  return translateMessage(text, direction);
}

/**
 * 会話要約を生成
 */
function generateSummary(leadId) {
  return generateConversationSummary(leadId);
}

/**
 * 重複情報を取得
 */
function getDuplicateInfoForLead(leadId) {
  return getDuplicateInfo(leadId);
}

/**
 * 重複フラグをクリア
 */
function clearDuplicateFlagForLead(leadId) {
  return clearDuplicateFlag(leadId);
}

/**
 * 診断用: ダッシュボード表示問題の調査
 */
function diagnoseDashboardData() {
  Logger.log('=== ダッシュボードデータ診断 ===');

  const ss = getSpreadsheet();
  Logger.log('スプレッドシート: ' + ss.getName());

  const leadSheet = ss.getSheetByName(CONFIG.SHEETS.LEADS);
  if (!leadSheet) {
    Logger.log('ERROR: リード管理シートが見つかりません');
    return;
  }

  // 全データ取得
  const lastRow = leadSheet.getLastRow();
  const lastCol = leadSheet.getLastColumn();
  Logger.log('シート: 行数=' + lastRow + ', 列数=' + lastCol);

  if (lastRow < 2) {
    Logger.log('データ行がありません');
    return;
  }

  const headers = leadSheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const data = leadSheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

  // 重要な列のインデックス
  const statusIdx = headers.indexOf('進捗ステータス');
  const staffIdx = headers.indexOf('担当者');
  const staffIdIdx = headers.indexOf('担当者ID');
  const customerIdx = headers.indexOf('顧客名');

  Logger.log('');
  Logger.log('列インデックス:');
  Logger.log('  進捗ステータス: ' + statusIdx);
  Logger.log('  担当者: ' + staffIdx);
  Logger.log('  担当者ID: ' + staffIdIdx);
  Logger.log('  顧客名: ' + customerIdx);

  // CONFIG.DEAL_STATUSES確認
  Logger.log('');
  Logger.log('CONFIG.DEAL_STATUSES: ' + JSON.stringify(CONFIG.DEAL_STATUSES));

  // 各行のデータ確認
  Logger.log('');
  Logger.log('=== データ行の確認 ===');
  data.forEach((row, i) => {
    const status = row[statusIdx] || '(空)';
    const staff = row[staffIdx] || '(空)';
    const staffId = row[staffIdIdx] || '(空)';
    const customer = row[customerIdx] || '(空)';
    const isDealStatus = CONFIG.DEAL_STATUSES.includes(status);

    Logger.log('行' + (i + 2) + ': ' +
      '顧客=' + customer + ', ' +
      'ステータス=' + status + ', ' +
      '担当者=' + staff + ', ' +
      '担当者ID=' + staffId + ', ' +
      '商談対象=' + (isDealStatus ? '✅' : '❌'));
  });

  Logger.log('');
  Logger.log('=== 診断完了 ===');
}

/**
 * 診断用: ユーザー情報とマッチングの確認
 */
function diagnoseUserMatching() {
  Logger.log('=== ユーザーマッチング診断 ===');

  // 1. 現在のユーザー情報
  const userInfo = getCurrentUserRole();
  Logger.log('');
  Logger.log('【1. getCurrentUserRole() の結果】');
  Logger.log('  email: ' + userInfo.email);
  Logger.log('  role: ' + userInfo.role);
  Logger.log('  staffId: ' + userInfo.staffId);
  Logger.log('  staffName: "' + userInfo.staffName + '"');
  Logger.log('  staffName.length: ' + (userInfo.staffName ? userInfo.staffName.length : 0));
  if (userInfo.error) {
    Logger.log('  error: ' + userInfo.error);
  }

  // 2. 担当者マスタの確認
  const ss = getSpreadsheet();
  const staffSheet = ss.getSheetByName(CONFIG.SHEETS.STAFF);
  Logger.log('');
  Logger.log('【2. 担当者マスタ】');
  if (!staffSheet) {
    Logger.log('  ERROR: 担当者マスタシートが見つかりません');
    return;
  }

  const staffData = staffSheet.getDataRange().getValues();
  const staffHeaders = staffData[0];
  Logger.log('  ヘッダー: ' + staffHeaders.join(', '));

  const emailCol = staffHeaders.indexOf('メール');
  const familyCol = staffHeaders.indexOf('苗字（日本語）');
  const givenCol = staffHeaders.indexOf('名前（日本語）');
  const oldNameCol = staffHeaders.indexOf('氏名（日本語）');

  Logger.log('  メール列: ' + emailCol);
  Logger.log('  苗字列: ' + familyCol);
  Logger.log('  名前列: ' + givenCol);
  Logger.log('  氏名列: ' + oldNameCol);

  Logger.log('');
  Logger.log('【3. 担当者マスタのデータ】');
  for (let i = 1; i < staffData.length; i++) {
    const row = staffData[i];
    const family = familyCol >= 0 ? row[familyCol] : '';
    const given = givenCol >= 0 ? row[givenCol] : '';
    const oldName = oldNameCol >= 0 ? row[oldNameCol] : '';
    const constructedName = (family + ' ' + given).trim();

    Logger.log('  行' + (i+1) + ': ' +
      'メール=' + (row[emailCol] || '(空)') + ', ' +
      '苗字="' + family + '", ' +
      '名前="' + given + '", ' +
      '構築名="' + constructedName + '", ' +
      '旧氏名="' + oldName + '"');
  }

  // 3. リード管理の担当者と比較
  const leadSheet = ss.getSheetByName(CONFIG.SHEETS.LEADS);
  if (leadSheet && leadSheet.getLastRow() >= 2) {
    const leadData = leadSheet.getDataRange().getValues();
    const leadHeaders = leadData[0];
    const staffCol = leadHeaders.indexOf('担当者');

    Logger.log('');
    Logger.log('【4. リード管理の担当者値】');
    for (let i = 1; i < leadData.length; i++) {
      const leadStaff = leadData[i][staffCol] || '(空)';
      const match = leadStaff === userInfo.staffName;
      Logger.log('  行' + (i+1) + ': "' + leadStaff + '" (マッチ: ' + (match ? '✅' : '❌') + ')');
    }
  }

  Logger.log('');
  Logger.log('=== 診断完了 ===');
}

/**
 * 診断用: getSalesMetrics の結果を確認
 */
function diagnoseGetSalesMetrics() {
  Logger.log('=== getSalesMetrics 診断 ===');

  const userInfo = getCurrentUserRole();
  Logger.log('staffName: "' + userInfo.staffName + '"');

  // getSalesMetrics を呼び出し
  try {
    const result = getSalesMetrics(userInfo.staffName);
    Logger.log('');
    Logger.log('【getSalesMetrics の結果】');
    Logger.log('  totalDeals: ' + result.totalDeals);
    Logger.log('  wonDeals: ' + result.wonDeals);
    Logger.log('  lostDeals: ' + result.lostDeals);
    Logger.log('  pendingDeals: ' + result.pendingDeals);
    Logger.log('  winRate: ' + result.winRate);
    Logger.log('  totalSales: ' + result.totalSales);
    Logger.log('  todayActions.length: ' + (result.todayActions ? result.todayActions.length : 0));
    Logger.log('  activeDeals.length: ' + (result.activeDeals ? result.activeDeals.length : 0));

    if (result.activeDeals && result.activeDeals.length > 0) {
      Logger.log('');
      Logger.log('【activeDeals の内容】');
      result.activeDeals.forEach((deal, i) => {
        Logger.log('  [' + i + '] ' + JSON.stringify(deal));
      });
    }
  } catch (e) {
    Logger.log('ERROR: ' + e.message);
    Logger.log('Stack: ' + e.stack);
  }

  Logger.log('');
  Logger.log('=== 診断完了 ===');
}

/**
 * 診断用: 権限設定シートを確認
 */
function diagnosePermissions() {
  Logger.log('=== 権限設定診断 ===');

  const ss = getSpreadsheet();
  Logger.log('スプレッドシート: ' + ss.getName());

  // 権限設定シートを確認
  const permSheet = ss.getSheetByName(CONFIG.SHEETS.PERMISSIONS);
  Logger.log('');
  Logger.log('【権限設定シート】');
  Logger.log('  CONFIG.SHEETS.PERMISSIONS: ' + CONFIG.SHEETS.PERMISSIONS);

  if (!permSheet) {
    Logger.log('  ❌ 権限設定シートが見つかりません');
    Logger.log('');
    Logger.log('【デフォルト権限を使用】');
    Logger.log('  DEFAULT_ROLES: ' + JSON.stringify(DEFAULT_ROLES, null, 2));
    return;
  }

  Logger.log('  ✅ シート存在');
  const data = permSheet.getDataRange().getValues();
  Logger.log('  行数: ' + data.length);
  Logger.log('  ヘッダー: ' + data[0].join(', '));

  Logger.log('');
  Logger.log('【権限データ】');
  for (let i = 1; i < data.length; i++) {
    Logger.log('  行' + (i+1) + ': ' + JSON.stringify(data[i]));
  }

  // 現在のユーザーの権限を取得
  const userInfo = getCurrentUserRole();
  Logger.log('');
  Logger.log('【現在のユーザー】');
  Logger.log('  role: ' + userInfo.role);

  const permissions = getPermissionsByRole(userInfo.role);
  Logger.log('  取得した権限: ' + JSON.stringify(permissions));
  Logger.log('  dashboard_sales: ' + (permissions.dashboard_sales ? '✅' : '❌'));

  Logger.log('');
  Logger.log('=== 診断完了 ===');
}

// WebApp.gs - 統合シート専用版
