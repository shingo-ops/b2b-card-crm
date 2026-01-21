/**
 * 統合ダッシュボード - GAS版
 *
 * 機能:
 * - Gemini使用状況（工程別）
 * - Claude使用状況（工程別）
 * - 不具合発生率ダッシュボード
 * - GASプロジェクト管理（3環境統合）
 * - 今週のサマリー
 *
 * 環境: 提案（Proposal）
 * 設計: Claude Code + Gemini Pro
 * 作成日: 2026-01-17
 * 更新日: 2026-01-18
 */

// ========================================
// シート名定義
// ========================================
const SHEETS = {
  CONFIG: 'Config',
  GEMINI_USAGE: 'GeminiUsage',
  GEMINI_DAILY: 'GeminiDaily',
  CLAUDE_USAGE: 'ClaudeUsage',
  CLAUDE_DAILY: 'ClaudeDaily',
  DEFECT_LOG: 'DefectLog',
  DEFECT_DAILY: 'DefectDaily',
  DEFECT_KPI: 'DefectKPI',
  GAS_PROJECTS: 'GASProjects',
  WEEKLY_SUMMARY: 'WeeklySummary',
  EVENT_LOG: 'EventLog',  // 5W2H+数値で全事象を記録
  CONVERSATION_LOG: 'ConversationLog'  // 会話ログ（KGI計測用）
};

// 会話カテゴリ定義
const CONVERSATION_CATEGORIES = {
  FEEDBACK: '指摘',      // バグや修正指摘
  REQUEST: '依頼',       // 追加機能依頼
  QUESTION: '説明'       // 不明点の説明要求
};

// ========================================
// 不具合分類定義（拡張版）
// ========================================
const DEFECT_TYPES = {
  CODE_BUG: 'code_bug',           // コード不具合
  API_LIMIT: 'api_limit',         // API制限（クォータ等）
  ENV_ERROR: 'env_error',         // 環境エラー（認証、設定）
  PROCESS_VIOLATION: 'process',   // プロセス違反
  SPEC_VIOLATION: 'spec',         // 仕様違反
  RECURRENCE: 'recurrence'        // 再発
};

// カテゴリ定義
const GEMINI_CATEGORIES = ['audit', 'search', 'review', 'design', 'other'];
const CLAUDE_CATEGORIES = ['development', 'fix', 'research', 'doc', 'config'];

// デフォルト設定
const DEFAULT_CONFIG = {
  daily_limit: 1000,
  rate_limit_requests: 60,
  rate_limit_window_seconds: 60,
  warning_threshold_80: 80,
  warning_threshold_95: 95
};

// ========================================
// WebApp エントリーポイント
// ========================================
function doGet(e) {
  initializeAllSheets();
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('統合ダッシュボード')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * POST APIエンドポイント
 * 外部からのデータ同期を受け付ける
 *
 * リクエスト形式:
 * {
 *   "action": "sync_trouble" | "sync_conversation" | "sync_gemini" | "sync_claude",
 *   "api_key": "設定されたAPIキー",
 *   "data": { ... }
 * }
 */
function doPost(e) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    // リクエストボディをパース
    const requestBody = JSON.parse(e.postData.contents);
    const action = requestBody.action;
    const apiKey = requestBody.api_key;
    const data = requestBody.data;

    // APIキー検証
    const props = PropertiesService.getScriptProperties();
    const validApiKey = props.getProperty('SYNC_API_KEY');

    if (validApiKey && apiKey !== validApiKey) {
      return createJsonResponse({ success: false, error: 'Invalid API key' }, 401);
    }

    // アクション別処理
    let result;
    switch (action) {
      case 'sync_trouble':
        result = syncTroubleLog(data);
        break;
      case 'sync_conversation':
        result = syncConversationLog(data);
        break;
      case 'sync_gemini':
        result = syncGeminiUsage(data);
        break;
      case 'sync_claude':
        result = syncClaudeUsage(data);
        break;
      case 'health_check':
        result = { success: true, status: 'ok', timestamp: new Date().toISOString() };
        break;
      default:
        result = { success: false, error: 'Unknown action: ' + action };
    }

    return createJsonResponse(result);

  } catch (e) {
    console.error('doPost error:', e.message);
    return createJsonResponse({ success: false, error: e.message }, 500);
  } finally {
    lock.releaseLock();
  }
}

/**
 * JSON レスポンスを生成
 */
function createJsonResponse(data, statusCode) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * 過去トラ（TROUBLE_LOG.md）を同期
 * GitHub Actionsから呼び出される
 */
function syncTroubleLog(data) {
  const ss = getOrCreateSpreadsheet();
  let sheet = ss.getSheetByName(SHEETS.DEFECT_LOG);

  if (!sheet) {
    initDefectLogSheet(ss);
    sheet = ss.getSheetByName(SHEETS.DEFECT_LOG);
  }

  // データが配列の場合は複数件処理
  const troubles = Array.isArray(data) ? data : [data];
  let syncedCount = 0;

  for (const trouble of troubles) {
    // 既存チェック（trouble_idで重複確認）
    const existingData = sheet.getDataRange().getValues();
    let exists = false;

    for (let i = 1; i < existingData.length; i++) {
      if (existingData[i][1] === trouble.trouble_id) {
        exists = true;
        break;
      }
    }

    if (!exists) {
      sheet.appendRow([
        trouble.date || Utilities.formatDate(new Date(), 'JST', 'yyyy-MM-dd'),
        trouble.trouble_id,
        trouble.title,
        trouble.is_recurrence || false,
        trouble.root_cause || ''
      ]);
      syncedCount++;
    }
  }

  return {
    success: true,
    synced_count: syncedCount,
    total_received: troubles.length,
    timestamp: new Date().toISOString()
  };
}

/**
 * 会話ログを同期
 * Claude Code hooksから呼び出される
 */
function syncConversationLog(data) {
  // recordConversationLogを使用
  const result = recordConversationLog({
    project_name: data.project_name || 'Unknown',
    category: data.category || '',
    human_message: data.human_message || '',
    claude_response: data.claude_response || '',
    conversation_id: data.conversation_id,
    is_bug: data.is_bug || false,
    is_recurrence: data.is_recurrence || false
  });

  return result;
}

/**
 * Gemini使用状況を同期
 * MCP呼び出し後のhooksから呼び出される
 */
function syncGeminiUsage(data) {
  const ss = getOrCreateSpreadsheet();
  const usageSheet = ss.getSheetByName(SHEETS.GEMINI_USAGE);
  const dailySheet = ss.getSheetByName(SHEETS.GEMINI_DAILY);

  const now = new Date();
  const today = Utilities.formatDate(now, 'JST', 'yyyy-MM-dd');
  const timestamp = now.toISOString();

  // カテゴリ検証
  let category = data.category || 'other';
  if (!GEMINI_CATEGORIES.includes(category)) {
    category = 'other';
  }

  // 使用記録を追加
  if (usageSheet) {
    usageSheet.appendRow([
      timestamp,
      category,
      data.description || '',
      data.tokens || 0
    ]);
  }

  // 日別集計を更新
  if (dailySheet) {
    const dataRange = dailySheet.getDataRange().getValues();
    let found = false;

    for (let i = 1; i < dataRange.length; i++) {
      if (dataRange[i][0] === today) {
        const colIndex = GEMINI_CATEGORIES.indexOf(category) + 2;
        const currentValue = dataRange[i][colIndex - 1] || 0;
        const currentTotal = dataRange[i][6] || 0;
        dailySheet.getRange(i + 1, colIndex).setValue(currentValue + 1);
        dailySheet.getRange(i + 1, 7).setValue(currentTotal + 1);
        found = true;
        break;
      }
    }

    if (!found) {
      const newRow = [today, 0, 0, 0, 0, 0, 1];
      const colIndex = GEMINI_CATEGORIES.indexOf(category) + 1;
      newRow[colIndex] = 1;
      dailySheet.appendRow(newRow);
    }
  }

  return {
    success: true,
    category: category,
    timestamp: timestamp
  };
}

/**
 * Claude使用状況を同期
 * セッション開始/終了時のhooksから呼び出される
 */
function syncClaudeUsage(data) {
  const ss = getOrCreateSpreadsheet();
  const usageSheet = ss.getSheetByName(SHEETS.CLAUDE_USAGE);
  const dailySheet = ss.getSheetByName(SHEETS.CLAUDE_DAILY);

  const now = new Date();
  const today = Utilities.formatDate(now, 'JST', 'yyyy-MM-dd');
  const timestamp = now.toISOString();

  // カテゴリ検証
  let category = data.category || 'development';
  if (!CLAUDE_CATEGORIES.includes(category)) {
    category = 'development';
  }

  // 使用記録を追加
  if (usageSheet) {
    usageSheet.appendRow([
      timestamp,
      category,
      data.description || '',
      data.duration_min || 0
    ]);
  }

  // 日別集計を更新
  if (dailySheet) {
    const dataRange = dailySheet.getDataRange().getValues();
    let found = false;

    for (let i = 1; i < dataRange.length; i++) {
      if (dataRange[i][0] === today) {
        const colIndex = CLAUDE_CATEGORIES.indexOf(category) + 2;
        const currentValue = dataRange[i][colIndex - 1] || 0;
        const currentTotal = dataRange[i][6] || 0;
        dailySheet.getRange(i + 1, colIndex).setValue(currentValue + 1);
        dailySheet.getRange(i + 1, 7).setValue(currentTotal + 1);
        found = true;
        break;
      }
    }

    if (!found) {
      const newRow = [today, 0, 0, 0, 0, 0, 1];
      const colIndex = CLAUDE_CATEGORIES.indexOf(category) + 1;
      newRow[colIndex] = 1;
      dailySheet.appendRow(newRow);
    }
  }

  return {
    success: true,
    category: category,
    timestamp: timestamp
  };
}

/**
 * HTMLファイルをインクルード
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ========================================
// シート初期化
// ========================================

// スプレッドシート設定（3環境システム）
const SPREADSHEET_CONFIG = {
  NAME: '[提案]統合ダッシュボード',
  FOLDER_ID: '1kDfjsZt6k6iXPRC6QRbjM6Kyfz2I1Bm5'  // prop環境フォルダ
};

/**
 * スプレッドシートを取得または作成
 */
function getOrCreateSpreadsheet() {
  // 1. スクリプトプロパティからIDを取得
  const props = PropertiesService.getScriptProperties();
  let ssId = props.getProperty('SPREADSHEET_ID');

  if (ssId) {
    try {
      return SpreadsheetApp.openById(ssId);
    } catch (e) {
      console.log('保存されたIDのスプレッドシートが見つかりません。新規作成します。');
    }
  }

  // 2. バインドされたスプレッドシートを試行
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss) {
      props.setProperty('SPREADSHEET_ID', ss.getId());
      return ss;
    }
  } catch (e) {
    console.log('バインドされたスプレッドシートがありません。');
  }

  // 3. 新規作成
  const newSs = SpreadsheetApp.create(SPREADSHEET_CONFIG.NAME);
  props.setProperty('SPREADSHEET_ID', newSs.getId());

  // 4. 指定フォルダに移動
  const folderId = props.getProperty('TARGET_FOLDER_ID');
  if (folderId) {
    try {
      const file = DriveApp.getFileById(newSs.getId());
      const folder = DriveApp.getFolderById(folderId);
      file.moveTo(folder);
      console.log('フォルダに移動完了: ' + folder.getName());
    } catch (e) {
      console.error('フォルダ移動エラー: ' + e.message);
    }
  } else {
    console.warn('TARGET_FOLDER_IDが未設定。スプレッドシートはマイドライブのルートに作成されました。');
  }

  console.log('新規スプレッドシート作成: ' + newSs.getUrl());
  return newSs;
}

/**
 * 初回セットアップ - GASエディタから手動実行してください
 * スプレッドシートを作成し、全シートを初期化します
 */
function setup() {
  // 1. TARGET_FOLDER_IDを自動設定（SPREADSHEET_CONFIGから）
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('TARGET_FOLDER_ID') && SPREADSHEET_CONFIG.FOLDER_ID) {
    props.setProperty('TARGET_FOLDER_ID', SPREADSHEET_CONFIG.FOLDER_ID);
    console.log('TARGET_FOLDER_ID を自動設定: ' + SPREADSHEET_CONFIG.FOLDER_ID);
  }

  // 2. スプレッドシート作成・初期化
  const ss = getOrCreateSpreadsheet();
  initializeAllSheets();

  // 3. フォルダに移動
  const folderId = props.getProperty('TARGET_FOLDER_ID');
  if (folderId) {
    try {
      const file = DriveApp.getFileById(ss.getId());
      const folder = DriveApp.getFolderById(folderId);
      file.moveTo(folder);
      console.log('フォルダに移動完了: ' + folder.getName());
    } catch (e) {
      console.log('フォルダ移動スキップ（既に移動済みまたはエラー）: ' + e.message);
    }
  }

  const url = ss.getUrl();
  const id = ss.getId();

  console.log('=== セットアップ完了 ===');
  console.log('スプレッドシートURL: ' + url);
  console.log('スプレッドシートID: ' + id);
  console.log('フォルダID: ' + folderId);

  return {
    success: true,
    url: url,
    id: id,
    folderId: folderId
  };
}

/**
 * 既存スプレッドシートを指定フォルダに移動
 * SPREADSHEET_CONFIG.FOLDER_IDを使用（スクリプトプロパティは不要）
 */
function moveToFolder() {
  const props = PropertiesService.getScriptProperties();
  const ssId = props.getProperty('SPREADSHEET_ID');

  // SPREADSHEET_CONFIGから取得（スクリプトプロパティより優先）
  const folderId = SPREADSHEET_CONFIG.FOLDER_ID || props.getProperty('TARGET_FOLDER_ID');

  if (!ssId) {
    console.error('SPREADSHEET_IDが未設定。先にsetup()を実行してください。');
    return { success: false, error: 'SPREADSHEET_ID not set' };
  }

  if (!folderId) {
    console.error('FOLDER_IDが未設定。SPREADSHEET_CONFIG.FOLDER_IDを確認してください。');
    return { success: false, error: 'FOLDER_ID not set' };
  }

  try {
    const file = DriveApp.getFileById(ssId);
    const folder = DriveApp.getFolderById(folderId);
    file.moveTo(folder);

    console.log('=== フォルダ移動完了 ===');
    console.log('移動先フォルダ: ' + folder.getName());
    console.log('スプレッドシート: ' + file.getName());

    return { success: true, folder: folder.getName() };
  } catch (e) {
    console.error('フォルダ移動エラー: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * 全シートを初期化
 */
function initializeAllSheets() {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);
    const ss = getOrCreateSpreadsheet();

    // 各シートを初期化
    initConfigSheet(ss);
    initGeminiUsageSheet(ss);
    initGeminiDailySheet(ss);
    initClaudeUsageSheet(ss);
    initClaudeDailySheet(ss);
    initDefectLogSheet(ss);
    initDefectDailySheet(ss);
    initDefectKPISheet(ss);
    initGASProjectsSheet(ss);
    initWeeklySummarySheet(ss);
    initConversationLogSheet(ss);

  } catch (e) {
    console.error('initializeAllSheets error:', e.message);
    throw new Error('シート初期化エラー: ' + e.message);
  } finally {
    lock.releaseLock();
  }
}

function initConfigSheet(ss) {
  let sheet = ss.getSheetByName(SHEETS.CONFIG);
  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.CONFIG);
    sheet.appendRow(['key', 'value']);
    sheet.appendRow(['daily_limit', DEFAULT_CONFIG.daily_limit]);
    sheet.appendRow(['rate_limit_requests', DEFAULT_CONFIG.rate_limit_requests]);
    sheet.appendRow(['rate_limit_window_seconds', DEFAULT_CONFIG.rate_limit_window_seconds]);
    sheet.appendRow(['warning_threshold_80', DEFAULT_CONFIG.warning_threshold_80]);
    sheet.appendRow(['warning_threshold_95', DEFAULT_CONFIG.warning_threshold_95]);
  }
}

function initGeminiUsageSheet(ss) {
  let sheet = ss.getSheetByName(SHEETS.GEMINI_USAGE);
  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.GEMINI_USAGE);
    sheet.appendRow(['timestamp', 'category', 'description', 'tokens']);
  }
}

function initGeminiDailySheet(ss) {
  let sheet = ss.getSheetByName(SHEETS.GEMINI_DAILY);
  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.GEMINI_DAILY);
    sheet.appendRow(['date', 'audit', 'search', 'review', 'design', 'other', 'total']);
  }
}

function initClaudeUsageSheet(ss) {
  let sheet = ss.getSheetByName(SHEETS.CLAUDE_USAGE);
  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.CLAUDE_USAGE);
    sheet.appendRow(['timestamp', 'category', 'description', 'duration_min']);
  }
}

function initClaudeDailySheet(ss) {
  let sheet = ss.getSheetByName(SHEETS.CLAUDE_DAILY);
  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.CLAUDE_DAILY);
    sheet.appendRow(['date', 'development', 'fix', 'research', 'doc', 'config', 'total']);
  }
}

function initDefectLogSheet(ss) {
  let sheet = ss.getSheetByName(SHEETS.DEFECT_LOG);
  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.DEFECT_LOG);
    sheet.appendRow(['date', 'trouble_id', 'title', 'is_recurrence', 'root_cause']);
  }
}

function initDefectDailySheet(ss) {
  let sheet = ss.getSheetByName(SHEETS.DEFECT_DAILY);
  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.DEFECT_DAILY);
    sheet.appendRow(['date', 'defect_count', 'recurrence_count']);
  }
}

function initDefectKPISheet(ss) {
  let sheet = ss.getSheetByName(SHEETS.DEFECT_KPI);
  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.DEFECT_KPI);
    sheet.appendRow(['date', 'zero_defect_days', 'monthly_defects', 'defect_rate', 'recurrence_rate']);
  }
}

function initGASProjectsSheet(ss) {
  let sheet = ss.getSheetByName(SHEETS.GAS_PROJECTS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.GAS_PROJECTS);
    sheet.appendRow(['project_name', 'env', 'folder', 'script_id', 'spreadsheet_id', 'deploy_id', 'status', 'last_updated']);
    // 初期データ
    sheet.appendRow(['CRM Dashboard', 'PROD', 'crm-dashboard', '1CQiLiFG8N77uYzlo3UNgAwml9_8mAJYAmfe4thp3RGsvbiwoaS-kS7X0', '', 'AKfycbzpeOkyBzA0kyD6T9aDE1uYVIil1z6KY0Ssc6Hta5EX7xoIAk_-EkxgmjILhN9Ceg5M', 'active', new Date().toISOString()]);
    sheet.appendRow(['CRM Dashboard', 'DEV', 'crm-dashboard-dev', '1TW14Q78eA1C5MyXdssxACZR4C5mavzjw9SjNLGzdHNCL1QteWuWKg9s7', '1EpqO7HL3o7jTbkvZuHqf8LMU4_RwQTJM8PyRx6Qj6uM', '', 'active', new Date().toISOString()]);
    sheet.appendRow(['Gemini Dashboard', 'PROP', 'gemini-dashboard-gas', '1UxE0XsPCn22ja32KBUA2253-7SQfCIPwPMckdJeMY9gNEP4UOM2_3Scf', '1qA0EsBBcY4JRTA32MSXEuMFOxtNLRiTq_Oy_1j0wmEo', '', 'active', new Date().toISOString()]);
  }
}

function initWeeklySummarySheet(ss) {
  let sheet = ss.getSheetByName(SHEETS.WEEKLY_SUMMARY);
  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.WEEKLY_SUMMARY);
    sheet.appendRow(['week_start', 'week_end', 'gemini_calls', 'claude_sessions', 'defects', 'zero_defect_days', 'tasks_completed', 'audit_pass_rate']);
  }
}

/**
 * 会話ログシートを初期化
 * KGI計測用：指摘/依頼/説明/バグ/再発の発生状況を記録
 */
function initConversationLogSheet(ss) {
  let sheet = ss.getSheetByName(SHEETS.CONVERSATION_LOG);
  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.CONVERSATION_LOG);
    sheet.appendRow([
      'timestamp',           // 記入日時
      'conversation_id',     // 固有ID（プロジェクトごと）
      'project_name',        // プロジェクト名
      'category',            // カテゴリ（指摘/依頼/説明）
      'human_message',       // 人間が送った内容
      'claude_response',     // Claudeの返答
      'feedback_count',      // 人間から指摘を受けた回数（累計）
      'request_count',       // 人間から依頼を受けた回数（累計）
      'question_count',      // 人間から説明を求められた回数（累計）
      'bug_count',           // バグや修正が起きた回数（累計）
      'recurrence_count'     // 再発が起きた回数（累計）
    ]);
    sheet.setFrozenRows(1);

    // 列幅を調整
    sheet.setColumnWidth(1, 150);  // timestamp
    sheet.setColumnWidth(2, 120);  // conversation_id
    sheet.setColumnWidth(3, 150);  // project_name
    sheet.setColumnWidth(4, 80);   // category
    sheet.setColumnWidth(5, 400);  // human_message
    sheet.setColumnWidth(6, 400);  // claude_response
    sheet.setColumnWidth(7, 80);   // feedback_count
    sheet.setColumnWidth(8, 80);   // request_count
    sheet.setColumnWidth(9, 80);   // question_count
    sheet.setColumnWidth(10, 80);  // bug_count
    sheet.setColumnWidth(11, 80);  // recurrence_count
  }
}

// ========================================
// 設定取得
// ========================================
function getConfig() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.CONFIG);

  if (!sheet) {
    return DEFAULT_CONFIG;
  }

  const data = sheet.getDataRange().getValues();
  const config = {};

  for (let i = 1; i < data.length; i++) {
    const key = data[i][0];
    const value = data[i][1];
    if (key) {
      config[key] = typeof value === 'number' ? value : parseInt(value) || value;
    }
  }

  return {
    daily_limit: config.daily_limit || DEFAULT_CONFIG.daily_limit,
    rate_limit: {
      requests: config.rate_limit_requests || DEFAULT_CONFIG.rate_limit_requests,
      window_seconds: config.rate_limit_window_seconds || DEFAULT_CONFIG.rate_limit_window_seconds
    },
    warnings: {
      threshold_80: config.warning_threshold_80 || DEFAULT_CONFIG.warning_threshold_80,
      threshold_95: config.warning_threshold_95 || DEFAULT_CONFIG.warning_threshold_95
    }
  };
}

// ========================================
// Gemini使用状況
// ========================================

/**
 * Gemini使用量データを取得
 */
function getGeminiUsageData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dailySheet = ss.getSheetByName(SHEETS.GEMINI_DAILY);
  const config = getConfig();

  const today = Utilities.formatDate(new Date(), 'JST', 'yyyy-MM-dd');
  let dailyData = { audit: 0, search: 0, review: 0, design: 0, other: 0, total: 0 };

  if (dailySheet) {
    const data = dailySheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === today) {
        dailyData = {
          audit: data[i][1] || 0,
          search: data[i][2] || 0,
          review: data[i][3] || 0,
          design: data[i][4] || 0,
          other: data[i][5] || 0,
          total: data[i][6] || 0
        };
        break;
      }
    }
  }

  const dailyLimit = config.daily_limit;
  const percent = Math.round((dailyData.total / dailyLimit) * 100);

  // アラートレベル判定
  let alertLevel = 'normal';
  let alertMessage = '';

  if (percent >= 100) {
    alertLevel = 'error';
    alertMessage = '日次上限に達しました！';
  } else if (percent >= config.warnings.threshold_95) {
    alertLevel = 'critical';
    alertMessage = '使用量が95%を超えました';
  } else if (percent >= config.warnings.threshold_80) {
    alertLevel = 'warning';
    alertMessage = '使用量が80%を超えました';
  }

  // UTC 0時までの残り時間
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const resetInMs = tomorrow.getTime() - now.getTime();
  const resetInHours = Math.floor(resetInMs / (1000 * 60 * 60));
  const resetInMinutes = Math.floor((resetInMs % (1000 * 60 * 60)) / (1000 * 60));

  // カテゴリ別比率計算
  const total = dailyData.total || 1;
  const categoryBreakdown = {
    audit: { count: dailyData.audit, percent: Math.round((dailyData.audit / total) * 100) },
    search: { count: dailyData.search, percent: Math.round((dailyData.search / total) * 100) },
    review: { count: dailyData.review, percent: Math.round((dailyData.review / total) * 100) },
    design: { count: dailyData.design, percent: Math.round((dailyData.design / total) * 100) },
    other: { count: dailyData.other, percent: Math.round((dailyData.other / total) * 100) }
  };

  return {
    date: today,
    daily_count: dailyData.total,
    daily_limit: dailyLimit,
    percent: percent,
    categories: categoryBreakdown,
    alert: {
      level: alertLevel,
      message: alertMessage
    },
    reset: {
      hours: resetInHours,
      minutes: resetInMinutes
    },
    updated_at: new Date().toISOString()
  };
}

/**
 * Gemini使用を記録
 */
function recordGeminiUsage(category, description, tokens) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const usageSheet = ss.getSheetByName(SHEETS.GEMINI_USAGE);
  const dailySheet = ss.getSheetByName(SHEETS.GEMINI_DAILY);

  const now = new Date();
  const today = Utilities.formatDate(now, 'JST', 'yyyy-MM-dd');
  const timestamp = now.toISOString();

  // カテゴリ検証
  if (!GEMINI_CATEGORIES.includes(category)) {
    category = 'other';
  }

  // 使用記録を追加
  if (usageSheet) {
    usageSheet.appendRow([timestamp, category, description || '', tokens || 0]);
  }

  // 日別集計を更新
  if (dailySheet) {
    const data = dailySheet.getDataRange().getValues();
    let found = false;

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === today) {
        const colIndex = GEMINI_CATEGORIES.indexOf(category) + 2;
        const currentValue = data[i][colIndex - 1] || 0;
        const currentTotal = data[i][6] || 0;
        dailySheet.getRange(i + 1, colIndex).setValue(currentValue + 1);
        dailySheet.getRange(i + 1, 7).setValue(currentTotal + 1);
        found = true;
        break;
      }
    }

    if (!found) {
      const newRow = [today, 0, 0, 0, 0, 0, 1];
      const colIndex = GEMINI_CATEGORIES.indexOf(category) + 1;
      newRow[colIndex] = 1;
      dailySheet.appendRow(newRow);
    }
  }

  return getGeminiUsageData();
}

// ========================================
// Claude使用状況
// ========================================

/**
 * Claude使用量データを取得
 */
function getClaudeUsageData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dailySheet = ss.getSheetByName(SHEETS.CLAUDE_DAILY);

  const today = Utilities.formatDate(new Date(), 'JST', 'yyyy-MM-dd');
  let dailyData = { development: 0, fix: 0, research: 0, doc: 0, config: 0, total: 0 };

  if (dailySheet) {
    const data = dailySheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === today) {
        dailyData = {
          development: data[i][1] || 0,
          fix: data[i][2] || 0,
          research: data[i][3] || 0,
          doc: data[i][4] || 0,
          config: data[i][5] || 0,
          total: data[i][6] || 0
        };
        break;
      }
    }
  }

  // カテゴリ別比率計算
  const total = dailyData.total || 1;
  const categoryBreakdown = {
    development: { count: dailyData.development, percent: Math.round((dailyData.development / total) * 100) },
    fix: { count: dailyData.fix, percent: Math.round((dailyData.fix / total) * 100) },
    research: { count: dailyData.research, percent: Math.round((dailyData.research / total) * 100) },
    doc: { count: dailyData.doc, percent: Math.round((dailyData.doc / total) * 100) },
    config: { count: dailyData.config, percent: Math.round((dailyData.config / total) * 100) }
  };

  return {
    date: today,
    total_sessions: dailyData.total,
    categories: categoryBreakdown,
    updated_at: new Date().toISOString()
  };
}

/**
 * Claude使用を記録
 */
function recordClaudeUsage(category, description, durationMin) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const usageSheet = ss.getSheetByName(SHEETS.CLAUDE_USAGE);
  const dailySheet = ss.getSheetByName(SHEETS.CLAUDE_DAILY);

  const now = new Date();
  const today = Utilities.formatDate(now, 'JST', 'yyyy-MM-dd');
  const timestamp = now.toISOString();

  // カテゴリ検証
  if (!CLAUDE_CATEGORIES.includes(category)) {
    category = 'development';
  }

  // 使用記録を追加
  if (usageSheet) {
    usageSheet.appendRow([timestamp, category, description || '', durationMin || 0]);
  }

  // 日別集計を更新
  if (dailySheet) {
    const data = dailySheet.getDataRange().getValues();
    let found = false;

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === today) {
        const colIndex = CLAUDE_CATEGORIES.indexOf(category) + 2;
        const currentValue = data[i][colIndex - 1] || 0;
        const currentTotal = data[i][6] || 0;
        dailySheet.getRange(i + 1, colIndex).setValue(currentValue + 1);
        dailySheet.getRange(i + 1, 7).setValue(currentTotal + 1);
        found = true;
        break;
      }
    }

    if (!found) {
      const newRow = [today, 0, 0, 0, 0, 0, 1];
      const colIndex = CLAUDE_CATEGORIES.indexOf(category) + 1;
      newRow[colIndex] = 1;
      dailySheet.appendRow(newRow);
    }
  }

  return getClaudeUsageData();
}

// ========================================
// 不具合ダッシュボード
// ========================================

/**
 * 不具合KPIデータを取得
 */
function getDefectKPIData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const defectLogSheet = ss.getSheetByName(SHEETS.DEFECT_LOG);
  const defectKPISheet = ss.getSheetByName(SHEETS.DEFECT_KPI);

  const today = new Date();
  const todayStr = Utilities.formatDate(today, 'JST', 'yyyy-MM-dd');
  const monthStart = Utilities.formatDate(new Date(today.getFullYear(), today.getMonth(), 1), 'JST', 'yyyy-MM-dd');

  let defects = [];
  let lastDefectDate = null;
  let monthlyDefects = 0;
  let monthlyRecurrences = 0;

  if (defectLogSheet) {
    const data = defectLogSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) {
        const defectDate = data[i][0];
        const dateStr = defectDate instanceof Date ? Utilities.formatDate(defectDate, 'JST', 'yyyy-MM-dd') : defectDate;
        defects.push({
          date: dateStr,
          trouble_id: data[i][1],
          title: data[i][2],
          is_recurrence: data[i][3] === true || data[i][3] === 'TRUE' || data[i][3] === 1,
          root_cause: data[i][4]
        });

        // 最終不良日を更新
        if (!lastDefectDate || dateStr > lastDefectDate) {
          lastDefectDate = dateStr;
        }

        // 今月の不良数をカウント
        if (dateStr >= monthStart) {
          monthlyDefects++;
          if (data[i][3] === true || data[i][3] === 'TRUE' || data[i][3] === 1) {
            monthlyRecurrences++;
          }
        }
      }
    }
  }

  // 0不良日連続達成日数を計算
  let zeroDefectDays = 0;
  if (lastDefectDate) {
    const lastDefect = new Date(lastDefectDate);
    const diffTime = today.getTime() - lastDefect.getTime();
    zeroDefectDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  } else {
    // 不良記録がない場合
    zeroDefectDays = 30; // デフォルト値
  }

  // 不良発生率計算（今月の作業日数で計算）
  const dayOfMonth = today.getDate();
  const defectRate = dayOfMonth > 0 ? Math.round((monthlyDefects / dayOfMonth) * 100 * 10) / 10 : 0;

  // 再発発生率計算
  const totalDefects = defects.length;
  const totalRecurrences = defects.filter(d => d.is_recurrence).length;
  const recurrenceRate = totalDefects > 0 ? Math.round((totalRecurrences / totalDefects) * 100 * 10) / 10 : 0;

  return {
    date: todayStr,
    zero_defect_days: zeroDefectDays,
    last_defect_date: lastDefectDate || '記録なし',
    monthly_defects: monthlyDefects,
    monthly_recurrences: monthlyRecurrences,
    defect_rate: defectRate,
    recurrence_rate: recurrenceRate,
    total_defects: totalDefects,
    total_recurrences: totalRecurrences,
    recent_defects: defects.slice(-5).reverse(),
    updated_at: new Date().toISOString()
  };
}

/**
 * 不具合を記録
 */
function recordDefect(troubleId, title, isRecurrence, rootCause) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const defectLogSheet = ss.getSheetByName(SHEETS.DEFECT_LOG);

  const today = Utilities.formatDate(new Date(), 'JST', 'yyyy-MM-dd');

  if (defectLogSheet) {
    defectLogSheet.appendRow([today, troubleId, title, isRecurrence ? true : false, rootCause || '']);
  }

  return getDefectKPIData();
}

// ========================================
// GASプロジェクト管理
// ========================================

/**
 * GASプロジェクト一覧を取得
 */
function getGASProjectsData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.GAS_PROJECTS);

  const projects = {
    prod: [],
    dev: [],
    prop: []
  };

  if (sheet) {
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) {
        const project = {
          name: data[i][0],
          env: data[i][1],
          folder: data[i][2],
          script_id: data[i][3],
          spreadsheet_id: data[i][4],
          deploy_id: data[i][5],
          status: data[i][6],
          last_updated: data[i][7] instanceof Date ? data[i][7].toISOString() : data[i][7]
        };

        const envKey = (data[i][1] || '').toLowerCase();
        if (projects[envKey]) {
          projects[envKey].push(project);
        }
      }
    }
  }

  return {
    projects: projects,
    summary: {
      total: projects.prod.length + projects.dev.length + projects.prop.length,
      prod: projects.prod.length,
      dev: projects.dev.length,
      prop: projects.prop.length
    },
    updated_at: new Date().toISOString()
  };
}

/**
 * GASプロジェクトを追加/更新
 */
function upsertGASProject(projectName, env, folder, scriptId, spreadsheetId, deployId, status) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.GAS_PROJECTS);

  if (!sheet) return null;

  const data = sheet.getDataRange().getValues();
  let found = false;

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === projectName && data[i][1] === env) {
      // 更新
      sheet.getRange(i + 1, 3).setValue(folder);
      sheet.getRange(i + 1, 4).setValue(scriptId);
      sheet.getRange(i + 1, 5).setValue(spreadsheetId);
      sheet.getRange(i + 1, 6).setValue(deployId);
      sheet.getRange(i + 1, 7).setValue(status);
      sheet.getRange(i + 1, 8).setValue(new Date().toISOString());
      found = true;
      break;
    }
  }

  if (!found) {
    // 新規追加
    sheet.appendRow([projectName, env, folder, scriptId, spreadsheetId, deployId, status, new Date().toISOString()]);
  }

  return getGASProjectsData();
}

// ========================================
// 週間サマリー
// ========================================

/**
 * 今週のサマリーを取得
 */
function getWeeklySummaryData() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const weekStartStr = Utilities.formatDate(weekStart, 'JST', 'yyyy-MM-dd');
  const weekEndStr = Utilities.formatDate(weekEnd, 'JST', 'yyyy-MM-dd');

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Gemini呼び出し数を集計
  let geminiCalls = 0;
  const geminiDailySheet = ss.getSheetByName(SHEETS.GEMINI_DAILY);
  if (geminiDailySheet) {
    const data = geminiDailySheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const dateStr = data[i][0];
      if (dateStr >= weekStartStr && dateStr <= weekEndStr) {
        geminiCalls += data[i][6] || 0;
      }
    }
  }

  // Claudeセッション数を集計
  let claudeSessions = 0;
  const claudeDailySheet = ss.getSheetByName(SHEETS.CLAUDE_DAILY);
  if (claudeDailySheet) {
    const data = claudeDailySheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const dateStr = data[i][0];
      if (dateStr >= weekStartStr && dateStr <= weekEndStr) {
        claudeSessions += data[i][6] || 0;
      }
    }
  }

  // 不具合数を集計
  let weeklyDefects = 0;
  const defectLogSheet = ss.getSheetByName(SHEETS.DEFECT_LOG);
  if (defectLogSheet) {
    const data = defectLogSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const defectDate = data[i][0];
      const dateStr = defectDate instanceof Date ? Utilities.formatDate(defectDate, 'JST', 'yyyy-MM-dd') : defectDate;
      if (dateStr >= weekStartStr && dateStr <= weekEndStr) {
        weeklyDefects++;
      }
    }
  }

  // 0不良日数を計算
  const defectKPI = getDefectKPIData();

  return {
    week_start: weekStartStr,
    week_end: weekEndStr,
    gemini_calls: geminiCalls,
    gemini_limit: 7000,
    gemini_percent: Math.round((geminiCalls / 7000) * 100),
    claude_sessions: claudeSessions,
    defects: weeklyDefects,
    zero_defect_days: defectKPI.zero_defect_days,
    tasks_completed: 0, // TODO: タスク管理と連携
    audit_pass_rate: 100, // TODO: 監査結果と連携
    health_score: calculateHealthScore(geminiCalls, claudeSessions, weeklyDefects, defectKPI.zero_defect_days),
    updated_at: new Date().toISOString()
  };
}

/**
 * ヘルススコアを計算
 */
function calculateHealthScore(geminiCalls, claudeSessions, defects, zeroDefectDays) {
  let score = 100;

  // 不具合ペナルティ（各不具合で-10点）
  score -= defects * 10;

  // 0不良日数ボーナス（5日ごとに+5点、最大+20点）
  score += Math.min(Math.floor(zeroDefectDays / 5) * 5, 20);

  // Gemini使用量が多すぎる場合ペナルティ
  if (geminiCalls > 5000) score -= 10;

  // 最低0点、最高100点
  return Math.max(0, Math.min(100, score));
}

// ========================================
// 履歴データ取得
// ========================================

/**
 * Gemini履歴データを取得
 */
function getGeminiHistoryData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.GEMINI_DAILY);

  if (!sheet) {
    return { records: [] };
  }

  const data = sheet.getDataRange().getValues();
  const records = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) {
      records.push({
        date: data[i][0],
        audit: data[i][1] || 0,
        search: data[i][2] || 0,
        review: data[i][3] || 0,
        design: data[i][4] || 0,
        other: data[i][5] || 0,
        total: data[i][6] || 0
      });
    }
  }

  // 直近30日分のみ
  return { records: records.slice(-30) };
}

/**
 * Claude履歴データを取得
 */
function getClaudeHistoryData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.CLAUDE_DAILY);

  if (!sheet) {
    return { records: [] };
  }

  const data = sheet.getDataRange().getValues();
  const records = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) {
      records.push({
        date: data[i][0],
        development: data[i][1] || 0,
        fix: data[i][2] || 0,
        research: data[i][3] || 0,
        doc: data[i][4] || 0,
        config: data[i][5] || 0,
        total: data[i][6] || 0
      });
    }
  }

  // 直近30日分のみ
  return { records: records.slice(-30) };
}

// ========================================
// 統合ダッシュボードデータ取得
// ========================================

/**
 * 全ダッシュボードデータを一括取得
 */
function getAllDashboardData() {
  return {
    summary: getWeeklySummaryData(),
    gemini: getGeminiUsageData(),
    claude: getClaudeUsageData(),
    defect: getDefectKPIData(),
    projects: getGASProjectsData(),
    geminiHistory: getGeminiHistoryData(),
    claudeHistory: getClaudeHistoryData(),
    tpsRules: getTPSRulesData()
  };
}

/**
 * TPS設計原則とKPIデータを取得
 * Human向けWebApp表示用
 */
function getTPSRulesData() {
  // TPS 7原則
  const principles = [
    {
      name: '見える化',
      nameEn: 'Mieruka',
      description: '問題・状況を誰でも即座に把握できる状態',
      status: 'active',
      kpi: 'ダッシュボード表示項目数'
    },
    {
      name: 'ワンサイクル',
      nameEn: 'One Cycle',
      description: '発見→対策→検証→横展開を1サイクルで完結',
      status: 'active',
      kpi: 'サイクル完了率'
    },
    {
      name: '自働化',
      nameEn: 'Jidoka',
      description: '異常を検知したら自動停止し、人に知らせる',
      status: 'active',
      kpi: '強制停止発動回数'
    },
    {
      name: 'アンドン',
      nameEn: 'Andon',
      description: '異常発生時にリアルタイムで通知',
      status: 'active',
      kpi: '通知到達率'
    },
    {
      name: '平準化',
      nameEn: 'Heijunka',
      description: '作業量を均等化し、過負荷を防止',
      status: 'planning',
      kpi: 'WIP制限遵守率'
    },
    {
      name: '標準化',
      nameEn: 'Hyojunka',
      description: '作業手順を統一し、品質を安定化',
      status: 'active',
      kpi: 'ルール遵守率'
    },
    {
      name: 'カイゼン',
      nameEn: 'Kaizen',
      description: '継続的に改善を繰り返す',
      status: 'active',
      kpi: '改善実施件数'
    }
  ];

  // KGI定義
  const kgi = [
    {
      name: 'ルール違反率',
      target: '0%',
      current: calculateRuleViolationRate(),
      unit: '%'
    },
    {
      name: '過去トラ再発率',
      target: '0%',
      current: calculateRecurrenceRate(),
      unit: '%'
    },
    {
      name: '仕様違反率',
      target: '0%',
      current: 0, // TODO: 実装
      unit: '%'
    }
  ];

  // 強制力レベル定義
  const forceLevels = [
    { level: 0, name: '情報', description: 'ログ記録のみ', color: '#6c757d' },
    { level: 1, name: '警告', description: '通知表示', color: '#ffc107' },
    { level: 2, name: '確認', description: '承認待ち', color: '#17a2b8' },
    { level: 3, name: '強制停止', description: '処理中断', color: '#dc3545' }
  ];

  // チェック項目と強制力マッピング
  const checkItems = [
    { name: 'pre-commit hook', forceLevel: 3, trigger: 'git commit時' },
    { name: 'Branch Protection', forceLevel: 3, trigger: 'git push時' },
    { name: 'session-start-check', forceLevel: 1, trigger: 'セッション開始時' },
    { name: 'session-end-check', forceLevel: 1, trigger: 'セッション終了時' },
    { name: 'API整合性チェック', forceLevel: 3, trigger: 'clasp push前' }
  ];

  return {
    principles: principles,
    kgi: kgi,
    forceLevels: forceLevels,
    checkItems: checkItems,
    lastUpdated: new Date().toISOString()
  };
}

/**
 * ルール違反率を計算
 */
function calculateRuleViolationRate() {
  // pre-commit hookの失敗率を計算（簡易版）
  // TODO: 実際のデータから計算
  return 0;
}

/**
 * 再発率を計算
 */
function calculateRecurrenceRate() {
  const defectData = getDefectKPIData();
  if (defectData.totalDefects === 0) return 0;
  return Math.round((defectData.recurrences / defectData.totalDefects) * 100);
}

// ========================================
// テスト用関数
// ========================================

/**
 * テスト用: Gemini使用量を設定
 */
function setGeminiUsageForTest(category, count) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dailySheet = ss.getSheetByName(SHEETS.GEMINI_DAILY);

  const today = Utilities.formatDate(new Date(), 'JST', 'yyyy-MM-dd');

  if (dailySheet) {
    const data = dailySheet.getDataRange().getValues();
    let found = false;

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === today) {
        if (category === 'total') {
          dailySheet.getRange(i + 1, 7).setValue(count);
        } else {
          const colIndex = GEMINI_CATEGORIES.indexOf(category) + 2;
          if (colIndex > 1) {
            dailySheet.getRange(i + 1, colIndex).setValue(count);
          }
        }
        found = true;
        break;
      }
    }

    if (!found) {
      const newRow = [today, 0, 0, 0, 0, 0, count];
      dailySheet.appendRow(newRow);
    }
  }

  return getGeminiUsageData();
}

/**
 * テスト用: 不具合を追加
 */
function addTestDefect() {
  return recordDefect('TEST-001', 'テスト不具合', false, 'テスト原因');
}

/**
 * テスト用: リセット
 */
function resetTodayData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const today = Utilities.formatDate(new Date(), 'JST', 'yyyy-MM-dd');

  // Gemini日別データをリセット
  const geminiDailySheet = ss.getSheetByName(SHEETS.GEMINI_DAILY);
  if (geminiDailySheet) {
    const data = geminiDailySheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === today) {
        for (let j = 2; j <= 7; j++) {
          geminiDailySheet.getRange(i + 1, j).setValue(0);
        }
        break;
      }
    }
  }

  // Claude日別データをリセット
  const claudeDailySheet = ss.getSheetByName(SHEETS.CLAUDE_DAILY);
  if (claudeDailySheet) {
    const data = claudeDailySheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === today) {
        for (let j = 2; j <= 7; j++) {
          claudeDailySheet.getRange(i + 1, j).setValue(0);
        }
        break;
      }
    }
  }

  return getAllDashboardData();
}

// ========================================
// 5W2H+数値 イベント記録システム
// ========================================

/**
 * EventLogシートを初期化
 */
function initEventLogSheet(ss) {
  let sheet = ss.getSheetByName(SHEETS.EVENT_LOG);
  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.EVENT_LOG);
    sheet.appendRow([
      'timestamp',      // いつ
      'where',          // どこで
      'who',            // 誰が
      'what',           // 何が
      'how',            // どうやって
      'how_much',       // どれぐらい（数値）
      'why',            // なぜ
      'event_type',     // イベント種別
      'category',       // カテゴリ
      'severity',       // 重大度
      'status',         // 状態
      'related_id'      // 関連ID（TROUBLE-XXX等）
    ]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * 5W2H+数値でイベントを記録
 * @param {Object} event - イベントデータ
 * @returns {Object} 記録結果
 */
function recordEvent(event) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(10000);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = initEventLogSheet(ss);

    const timestamp = event.timestamp || new Date().toISOString();
    const row = [
      timestamp,
      event.where || '',
      event.who || 'Claude Code',
      event.what || '',
      event.how || '',
      event.how_much || 0,
      event.why || '',
      event.event_type || 'info',
      event.category || 'other',
      event.severity || 'low',
      event.status || 'recorded',
      event.related_id || ''
    ];

    sheet.appendRow(row);

    // 重大度が高い場合はDiscord通知
    if (event.severity === 'high' || event.severity === 'critical') {
      sendDiscordNotification({
        type: 'error',
        title: event.what,
        description: `${event.where}: ${event.how}`,
        severity: event.severity
      });
    }

    return { success: true, timestamp: timestamp };

  } catch (e) {
    console.error('recordEvent error:', e.message);
    return { success: false, error: e.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * API制限エラーを記録（不具合として扱う）
 * @param {string} apiName - API名（Gemini, GitHub等）
 * @param {string} errorMessage - エラーメッセージ
 * @param {number} resetMinutes - リセットまでの分数
 * @returns {Object} 記録結果
 */
function recordAPILimitError(apiName, errorMessage, resetMinutes) {
  const event = {
    where: apiName + ' API',
    who: 'Claude Code',
    what: apiName + ' APIクォータ上限到達',
    how: errorMessage,
    how_much: resetMinutes,
    why: 'API使用量が日次/分次制限を超過',
    event_type: 'defect',
    category: DEFECT_TYPES.API_LIMIT,
    severity: 'medium',
    status: 'waiting_reset',
    related_id: 'API-LIMIT-' + Utilities.formatDate(new Date(), 'JST', 'yyyyMMdd-HHmmss')
  };

  // イベント記録
  const result = recordEvent(event);

  // 不具合ログにも記録
  if (result.success) {
    recordDefectExtended({
      trouble_id: event.related_id,
      title: event.what,
      defect_type: DEFECT_TYPES.API_LIMIT,
      is_recurrence: false,
      root_cause: event.why,
      impact: resetMinutes + '分間API使用不可',
      resolution: 'クォータリセット待ち'
    });
  }

  // Discord通知
  sendDiscordNotification({
    type: 'warning',
    title: event.what,
    description: errorMessage + '\nリセットまで: ' + resetMinutes + '分',
    severity: 'medium'
  });

  return result;
}

/**
 * 拡張版不具合記録
 * @param {Object} defect - 不具合データ
 * @returns {Object} 記録結果
 */
function recordDefectExtended(defect) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(10000);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEETS.DEFECT_LOG);

    if (!sheet) {
      sheet = ss.insertSheet(SHEETS.DEFECT_LOG);
      sheet.appendRow([
        'date', 'trouble_id', 'title', 'defect_type',
        'is_recurrence', 'root_cause', 'impact', 'resolution', 'status'
      ]);
      sheet.setFrozenRows(1);
    }

    const today = Utilities.formatDate(new Date(), 'JST', 'yyyy-MM-dd');
    const row = [
      today,
      defect.trouble_id || '',
      defect.title || '',
      defect.defect_type || DEFECT_TYPES.CODE_BUG,
      defect.is_recurrence || false,
      defect.root_cause || '',
      defect.impact || '',
      defect.resolution || '',
      defect.status || 'open'
    ];

    sheet.appendRow(row);

    // 日次集計を更新
    updateDefectDaily(today, defect.is_recurrence);

    return { success: true, trouble_id: defect.trouble_id };

  } catch (e) {
    console.error('recordDefectExtended error:', e.message);
    return { success: false, error: e.message };
  } finally {
    lock.releaseLock();
  }
}

// ========================================
// Discord通知機能
// ========================================

/**
 * Discord通知を送信
 * @param {Object} notification - 通知データ
 * @returns {Object} 送信結果
 */
function sendDiscordNotification(notification) {
  try {
    // スクリプトプロパティからWebhook URLを取得
    const webhookUrl = PropertiesService.getScriptProperties()
      .getProperty('DISCORD_BUGREPORT_WEBHOOK');

    if (!webhookUrl) {
      console.warn('Discord Webhook URL not configured');
      return { success: false, error: 'Webhook URL not configured' };
    }

    // 通知タイプに応じた色設定
    const colors = {
      error: 15158332,    // 赤
      warning: 16776960,  // 黄
      success: 3066993,   // 緑
      info: 3447003       // 青
    };

    // 重大度に応じたアイコン
    const icons = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢'
    };

    const payload = {
      embeds: [{
        title: (icons[notification.severity] || '📢') + ' ' + (notification.title || 'Notification'),
        description: notification.description || '',
        color: colors[notification.type] || colors.info,
        timestamp: new Date().toISOString(),
        footer: {
          text: '統合ダッシュボード | 3環境システム'
        },
        fields: []
      }]
    };

    // 追加フィールド
    if (notification.severity) {
      payload.embeds[0].fields.push({
        name: '重大度',
        value: notification.severity,
        inline: true
      });
    }

    if (notification.category) {
      payload.embeds[0].fields.push({
        name: 'カテゴリ',
        value: notification.category,
        inline: true
      });
    }

    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(webhookUrl, options);
    const responseCode = response.getResponseCode();

    if (responseCode === 204 || responseCode === 200) {
      return { success: true };
    } else {
      console.error('Discord notification failed:', responseCode, response.getContentText());
      return { success: false, error: 'HTTP ' + responseCode };
    }

  } catch (e) {
    console.error('sendDiscordNotification error:', e.message);
    return { success: false, error: e.message };
  }
}

/**
 * 定期レポートをDiscordに送信
 * @returns {Object} 送信結果
 */
function sendDailyReport() {
  try {
    const data = getAllDashboardData();

    const notification = {
      type: 'info',
      title: '日次レポート - ' + Utilities.formatDate(new Date(), 'JST', 'yyyy-MM-dd'),
      description: formatDailyReportDescription(data),
      severity: data.summary.health_score >= 80 ? 'low' :
                data.summary.health_score >= 60 ? 'medium' : 'high',
      category: 'daily_report'
    };

    return sendDiscordNotification(notification);

  } catch (e) {
    console.error('sendDailyReport error:', e.message);
    return { success: false, error: e.message };
  }
}

/**
 * 日次レポートの説明文を生成
 */
function formatDailyReportDescription(data) {
  const lines = [];

  lines.push('**Health Score**: ' + data.summary.health_score);
  lines.push('');
  lines.push('**Gemini使用状況**');
  lines.push('- 今日: ' + data.gemini.daily_count + ' / ' + data.gemini.daily_limit);
  lines.push('- 使用率: ' + data.gemini.percent + '%');
  lines.push('');
  lines.push('**Claude使用状況**');
  lines.push('- セッション数: ' + data.claude.total_sessions);
  lines.push('');
  lines.push('**不具合状況**');
  lines.push('- 0不良日連続: ' + data.defect.zero_defect_days + '日');
  lines.push('- 今月の不具合: ' + data.defect.monthly_defects + '件');
  lines.push('- 再発率: ' + data.defect.recurrence_rate);

  return lines.join('\n');
}

/**
 * Claude Codeからの即時通知用API
 * @param {string} type - 通知タイプ（error/warning/success/info）
 * @param {string} message - メッセージ
 * @param {Object} details - 詳細情報（オプション）
 * @returns {Object} 送信結果
 */
function notifyFromClaudeCode(type, message, details) {
  // イベント記録
  recordEvent({
    where: details?.where || 'Claude Code',
    who: 'Claude Code',
    what: message,
    how: details?.how || '',
    how_much: details?.how_much || 0,
    why: details?.why || '',
    event_type: type,
    category: details?.category || 'notification',
    severity: type === 'error' ? 'high' : type === 'warning' ? 'medium' : 'low',
    status: 'notified'
  });

  // Discord通知
  return sendDiscordNotification({
    type: type,
    title: message,
    description: details?.description || '',
    severity: type === 'error' ? 'high' : type === 'warning' ? 'medium' : 'low',
    category: details?.category
  });
}

// ========================================
// イベント履歴取得
// ========================================

/**
 * イベント履歴を取得
 * @param {number} limit - 取得件数（デフォルト50）
 * @returns {Array} イベント一覧
 */
function getEventHistory(limit) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.EVENT_LOG);

  if (!sheet) {
    return [];
  }

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return [];
  }

  const headers = data[0];
  const events = [];
  const maxRows = Math.min(data.length, (limit || 50) + 1);

  // 新しい順に取得
  for (let i = data.length - 1; i >= 1 && events.length < (limit || 50); i--) {
    const row = data[i];
    const event = {};
    headers.forEach((header, index) => {
      event[header] = row[index];
    });
    events.push(event);
  }

  return events;
}

/**
 * 不具合タイプ別の統計を取得
 * @returns {Object} 統計データ
 */
function getDefectStatsByType() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.DEFECT_LOG);

  if (!sheet) {
    return {};
  }

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return {};
  }

  const stats = {};
  Object.values(DEFECT_TYPES).forEach(type => {
    stats[type] = { count: 0, recent: [] };
  });

  for (let i = 1; i < data.length; i++) {
    const defectType = data[i][3] || DEFECT_TYPES.CODE_BUG;
    if (!stats[defectType]) {
      stats[defectType] = { count: 0, recent: [] };
    }
    stats[defectType].count++;
    if (stats[defectType].recent.length < 5) {
      stats[defectType].recent.push({
        date: data[i][0],
        trouble_id: data[i][1],
        title: data[i][2]
      });
    }
  }

  return stats;
}

// ========================================
// 会話ログ管理（KGI計測用）
// ========================================

/**
 * 会話ログを記録
 * @param {Object} log - 会話ログデータ
 * @returns {Object} 記録結果
 */
function recordConversationLog(log) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(10000);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEETS.CONVERSATION_LOG);

    if (!sheet) {
      sheet = initConversationLogSheet(ss);
    }

    const timestamp = new Date().toISOString();

    // 累計値を取得
    const currentStats = getConversationStats();
    let feedbackCount = currentStats.feedback_count || 0;
    let requestCount = currentStats.request_count || 0;
    let questionCount = currentStats.question_count || 0;
    let bugCount = currentStats.bug_count || 0;
    let recurrenceCount = currentStats.recurrence_count || 0;

    // カテゴリに応じて累計を更新
    const category = log.category || '';
    if (category === '指摘') {
      feedbackCount++;
      if (log.is_bug) bugCount++;
      if (log.is_recurrence) recurrenceCount++;
    } else if (category === '依頼') {
      requestCount++;
    } else if (category === '説明') {
      questionCount++;
    }

    // プロジェクト固有IDを生成
    const projectPrefix = (log.project_name || 'UNKNOWN').substring(0, 3).toUpperCase();
    const existingLogs = getConversationLogsByProject(log.project_name);
    const nextNum = existingLogs.length + 1;
    const conversationId = log.conversation_id || projectPrefix + '-' + String(nextNum).padStart(4, '0');

    const row = [
      timestamp,
      conversationId,
      log.project_name || '',
      category,
      log.human_message || '',
      log.claude_response || '',
      feedbackCount,
      requestCount,
      questionCount,
      bugCount,
      recurrenceCount
    ];

    sheet.appendRow(row);

    return {
      success: true,
      conversation_id: conversationId,
      timestamp: timestamp,
      stats: {
        feedback_count: feedbackCount,
        request_count: requestCount,
        question_count: questionCount,
        bug_count: bugCount,
        recurrence_count: recurrenceCount
      }
    };

  } catch (e) {
    console.error('recordConversationLog error:', e.message);
    return { success: false, error: e.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * 会話ログ統計を取得
 * @returns {Object} 統計データ
 */
function getConversationStats() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.CONVERSATION_LOG);

  const defaultStats = {
    feedback_count: 0,
    request_count: 0,
    question_count: 0,
    bug_count: 0,
    recurrence_count: 0,
    total_conversations: 0
  };

  if (!sheet) {
    return defaultStats;
  }

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return defaultStats;
  }

  // 最後の行から累計値を取得
  const lastRow = data[data.length - 1];
  return {
    feedback_count: lastRow[6] || 0,
    request_count: lastRow[7] || 0,
    question_count: lastRow[8] || 0,
    bug_count: lastRow[9] || 0,
    recurrence_count: lastRow[10] || 0,
    total_conversations: data.length - 1
  };
}

/**
 * プロジェクト別会話ログを取得
 * @param {string} projectName - プロジェクト名
 * @returns {Array} 会話ログ一覧
 */
function getConversationLogsByProject(projectName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.CONVERSATION_LOG);

  if (!sheet) {
    return [];
  }

  const data = sheet.getDataRange().getValues();
  const logs = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][2] === projectName) {
      logs.push({
        timestamp: data[i][0],
        conversation_id: data[i][1],
        project_name: data[i][2],
        category: data[i][3],
        human_message: data[i][4],
        claude_response: data[i][5],
        feedback_count: data[i][6],
        request_count: data[i][7],
        question_count: data[i][8],
        bug_count: data[i][9],
        recurrence_count: data[i][10]
      });
    }
  }

  return logs;
}

/**
 * 全会話ログを取得（最新順）
 * @param {number} limit - 取得件数（デフォルト50）
 * @returns {Object} 会話ログデータ
 */
function getConversationLogsData(limit) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.CONVERSATION_LOG);

  const result = {
    logs: [],
    stats: getConversationStats(),
    projects: [],
    updated_at: new Date().toISOString()
  };

  if (!sheet) {
    return result;
  }

  const data = sheet.getDataRange().getValues();
  const projectSet = new Set();
  const maxItems = limit || 50;

  // 新しい順に取得
  for (let i = data.length - 1; i >= 1 && result.logs.length < maxItems; i--) {
    const row = data[i];
    result.logs.push({
      timestamp: row[0],
      conversation_id: row[1],
      project_name: row[2],
      category: row[3],
      human_message: row[4],
      claude_response: row[5],
      feedback_count: row[6],
      request_count: row[7],
      question_count: row[8],
      bug_count: row[9],
      recurrence_count: row[10]
    });
    if (row[2]) {
      projectSet.add(row[2]);
    }
  }

  result.projects = Array.from(projectSet);

  return result;
}

/**
 * KGI達成率を計算
 * 目標：人間の介入0（指摘/依頼/説明が発生しない）
 * @returns {Object} KGI達成状況
 */
function getKGIStatus() {
  const stats = getConversationStats();
  const total = stats.feedback_count + stats.request_count + stats.question_count;

  // 直近7日間・3ヶ月の発生率を計算
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.CONVERSATION_LOG);

  let last7DaysFeedback = 0;
  let last7DaysRequest = 0;
  let last7DaysQuestion = 0;
  let last7DaysBug = 0;
  let last7DaysRecurrence = 0;

  let quarterFeedback = 0;
  let quarterRequest = 0;
  let quarterQuestion = 0;
  let quarterBug = 0;
  let quarterRecurrence = 0;

  // 0介入日連続達成日数を計算
  let zeroInterventionDays = 0;
  let lastInterventionDate = null;

  if (sheet) {
    const data = sheet.getDataRange().getValues();
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(now.getMonth() - 3);

    // 日付ごとの介入をトラック
    const interventionDates = new Set();

    for (let i = 1; i < data.length; i++) {
      const logDate = new Date(data[i][0]);
      const category = data[i][3];
      const dateStr = Utilities.formatDate(logDate, 'JST', 'yyyy-MM-dd');

      // 介入があった日を記録
      if (category === '指摘' || category === '依頼' || category === '説明') {
        interventionDates.add(dateStr);
        if (!lastInterventionDate || logDate > lastInterventionDate) {
          lastInterventionDate = logDate;
        }
      }

      // 直近7日間の集計
      if (logDate >= sevenDaysAgo) {
        if (category === '指摘') last7DaysFeedback++;
        if (category === '依頼') last7DaysRequest++;
        if (category === '説明') last7DaysQuestion++;
        // バグと再発は指摘の中でフラグが立っているもの
        // 簡易版：指摘のうち特定キーワードを含むものをカウント
        const message = (data[i][4] || '').toLowerCase();
        if (message.includes('バグ') || message.includes('bug') || message.includes('エラー')) {
          if (logDate >= sevenDaysAgo) last7DaysBug++;
        }
        if (message.includes('再発') || message.includes('また') || message.includes('同じ')) {
          if (logDate >= sevenDaysAgo) last7DaysRecurrence++;
        }
      }

      // 直近3ヶ月の集計
      if (logDate >= threeMonthsAgo) {
        if (category === '指摘') quarterFeedback++;
        if (category === '依頼') quarterRequest++;
        if (category === '説明') quarterQuestion++;
        const message = (data[i][4] || '').toLowerCase();
        if (message.includes('バグ') || message.includes('bug') || message.includes('エラー')) {
          quarterBug++;
        }
        if (message.includes('再発') || message.includes('また') || message.includes('同じ')) {
          quarterRecurrence++;
        }
      }
    }

    // 0介入日連続達成日数を計算
    if (lastInterventionDate) {
      const diffTime = now.getTime() - lastInterventionDate.getTime();
      zeroInterventionDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    } else {
      // 介入記録がない場合はデフォルト値
      zeroInterventionDays = 30;
    }
  } else {
    // シートがない場合はデフォルト値
    zeroInterventionDays = 30;
  }

  // KGIスコア計算（介入が少ないほど高い）
  // 100点からスタート、各介入で減点
  let kgiScore = 100;
  kgiScore -= last7DaysFeedback * 10;  // 指摘は重い
  kgiScore -= last7DaysRequest * 5;    // 依頼は中程度
  kgiScore -= last7DaysQuestion * 3;   // 説明は軽い
  kgiScore = Math.max(0, kgiScore);

  // 解釈率計算（介入がなければ100%、あれば減少）
  const totalInterventions7Days = last7DaysFeedback + last7DaysRequest + last7DaysQuestion;
  const interpretationRate = totalInterventions7Days === 0 ? 100 : Math.max(0, 100 - (totalInterventions7Days * 10));

  return {
    total_interventions: total,
    feedback_count: stats.feedback_count,
    request_count: stats.request_count,
    question_count: stats.question_count,
    bug_count: stats.bug_count,
    recurrence_count: stats.recurrence_count,
    zero_intervention_days: zeroInterventionDays,
    interpretation_rate: interpretationRate,
    last_7_days: {
      feedback: last7DaysFeedback,
      request: last7DaysRequest,
      question: last7DaysQuestion,
      bug: last7DaysBug,
      recurrence: last7DaysRecurrence
    },
    quarter_stats: {
      feedback: quarterFeedback,
      request: quarterRequest,
      question: quarterQuestion,
      bug: quarterBug,
      recurrence: quarterRecurrence
    },
    kgi_score: kgiScore,
    kgi_target: 100,
    updated_at: new Date().toISOString()
  };
}

// ========================================
// GitHub API 統合（Spreadsheet廃止）
// ========================================

/**
 * GitHub設定
 * GITHUB_TOKEN: スクリプトプロパティに設定
 */
const GITHUB_CONFIG = {
  OWNER: 'shingo-ops',
  REPO: 'sales-ops-with-claude',
  BRANCH: 'main',
  FILES: {
    CONVERSATION_LOG: 'docs/01_crm/CONVERSATION_LOG.md',
    TROUBLE_LOG: 'docs/01_crm/TROUBLE_LOG.md'
  }
};

/**
 * GitHubからファイル内容を取得
 */
function fetchFromGitHub(filePath) {
  const token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if (!token) {
    throw new Error('GITHUB_TOKEN not set in Script Properties');
  }

  const url = `https://api.github.com/repos/${GITHUB_CONFIG.OWNER}/${GITHUB_CONFIG.REPO}/contents/${filePath}?ref=${GITHUB_CONFIG.BRANCH}`;

  const response = UrlFetchApp.fetch(url, {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3.raw'
    },
    muteHttpExceptions: true
  });

  if (response.getResponseCode() !== 200) {
    throw new Error(`GitHub API error: ${response.getResponseCode()} - ${response.getContentText()}`);
  }

  return response.getContentText();
}

/**
 * CONVERSATION_LOG.mdをパース
 */
function parseConversationLog(markdown) {
  const lines = markdown.split('\n');
  const conversations = [];
  let currentDate = '';

  for (const line of lines) {
    // 日付ヘッダー: ## 2026-01-19
    const dateMatch = line.match(/^## (\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      currentDate = dateMatch[1];
      continue;
    }

    // 会話エントリ: - **HH:MM:SS** [project] `category`: content
    const entryMatch = line.match(/^- \*\*(\d{2}:\d{2}:\d{2})\*\* \[([^\]]+)\] `([^`]+)`: (.+)/);
    if (entryMatch && currentDate) {
      conversations.push({
        date: currentDate,
        time: entryMatch[1],
        timestamp: `${currentDate}T${entryMatch[1]}`,
        project: entryMatch[2],
        category: entryMatch[3],
        content: entryMatch[4].substring(0, 200) // 長すぎる場合は切り詰め
      });
    }
  }

  return conversations;
}

/**
 * TROUBLE_LOG.mdをパース（V5形式対応）
 */
function parseTroubleLog(markdown) {
  const lines = markdown.split('\n');
  const troubles = [];
  let currentTrouble = null;
  let currentSection = '';  // 現在のセクション追跡
  let collectingContent = false;
  let contentBuffer = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // トラブルヘッダー: ### TROUBLE-XXX: タイトル（@XX）
    const headerMatch = line.match(/^### (TROUBLE-\d+): (.+)/);
    if (headerMatch) {
      if (currentTrouble) {
        troubles.push(currentTrouble);
      }
      // タイトルから（@XX）を除去
      const title = headerMatch[2].replace(/（@\d+）/, '').trim();
      currentTrouble = {
        id: headerMatch[1],
        title: title,
        date: '',
        where: '',           // どこで
        who: '',             // 誰が
        what: '',            // 何が
        how: '',             // どうやって
        impact: '',          // どれぐらい
        why: '',             // なぜ
        category: '',
        is_recurrence: false,
        root_cause: '',      // 真因
        pokayoke: '',        // ポカヨケ
        learning: '',        // 学び
        whyWhy: []           // なぜなぜ分析
      };
      currentSection = '';
      continue;
    }

    // セクション検出
    if (line.match(/^#### 1\. 現状把握/)) {
      currentSection = 'status';
      continue;
    } else if (line.match(/^#### 2\. 要因分析/)) {
      currentSection = 'analysis';
      continue;
    } else if (line.match(/^#### 3\. 対策/)) {
      currentSection = 'countermeasure';
      continue;
    }

    if (currentTrouble) {
      // テーブル行のパース: | 項目 | 内容 |
      if (line.includes('|') && !line.match(/^\|[\s-]+\|/)) {
        const parts = line.split('|').map(p => p.trim()).filter(p => p);
        if (parts.length >= 2) {
          const key = parts[0].replace(/\*\*/g, '').trim();
          const value = parts[1].trim();

          // 日付関連
          if (key.includes('いつ') || key.includes('発生日')) {
            const dateMatch = value.match(/\d{4}[-\/]\d{2}[-\/]\d{2}/);
            if (dateMatch) {
              currentTrouble.date = dateMatch[0];
            }
          }
          // どこで
          else if (key.includes('どこで')) {
            currentTrouble.where = value.substring(0, 200);
          }
          // 誰が
          else if (key.includes('誰が')) {
            currentTrouble.who = value;
          }
          // 何が
          else if (key.includes('何が')) {
            currentTrouble.what = value.substring(0, 300);
          }
          // どうやって
          else if (key.includes('どうやって')) {
            currentTrouble.how = value.substring(0, 300);
          }
          // どれぐらい
          else if (key.includes('どれぐらい')) {
            currentTrouble.impact = value.substring(0, 200);
          }
          // なぜ（現状把握の場合は表面原因）
          else if (key.includes('なぜ') && currentSection === 'status') {
            currentTrouble.why = value.substring(0, 200);
          }

          // なぜなぜ分析テーブル
          if (currentSection === 'analysis' && key.match(/^\d$/)) {
            const whyQuestion = parts[1] ? parts[1].trim() : '';
            const whyAnswer = parts[2] ? parts[2].trim() : '';
            if (whyQuestion || whyAnswer) {
              currentTrouble.whyWhy.push({ q: whyQuestion, a: whyAnswer });
            }
          }
        }
      }

      // 真因の検出: **真因**: ...
      const rootCauseMatch = line.match(/\*\*真因\*\*[：:]\s*(.+)/);
      if (rootCauseMatch) {
        currentTrouble.root_cause = rootCauseMatch[1].trim();
      }

      // ポカヨケの検出: **ポカヨケ**: ...
      if (line.match(/\*\*ポカヨケ\*\*/)) {
        // 複数行の場合があるので、次の行も確認
        let pokayokeContent = line.replace(/\*\*ポカヨケ\*\*[：:]?\s*/, '').trim();
        // 次の数行を確認
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const nextLine = lines[j];
          if (nextLine.startsWith('-') || nextLine.startsWith('  ')) {
            pokayokeContent += '\n' + nextLine.trim();
          } else if (nextLine.match(/^\*\*|^####|^###/)) {
            break;
          }
        }
        currentTrouble.pokayoke = pokayokeContent.substring(0, 500);
      }

      // 学びの検出: **学び**: ...
      const learningMatch = line.match(/\*\*学び\*\*[：:]\s*(.+)/);
      if (learningMatch) {
        currentTrouble.learning = learningMatch[1].trim();
      }

      // 再発チェック: 備考に「再発」という文字があれば
      if (line.includes('再発') && line.includes('TROUBLE-')) {
        currentTrouble.is_recurrence = true;
      }

      // カテゴリ推定（根本原因の内容から）
      if (!currentTrouble.category && (currentTrouble.root_cause || currentTrouble.what)) {
        const checkText = (currentTrouble.root_cause + ' ' + currentTrouble.what).toLowerCase();
        if (checkText.includes('null') || checkText.includes('エラー') || checkText.includes('バグ')) {
          currentTrouble.category = 'コードバグ';
        } else if (checkText.includes('認識') || checkText.includes('解釈') || checkText.includes('理解')) {
          currentTrouble.category = '認識ズレ';
        } else if (checkText.includes('漏れ') || checkText.includes('忘れ') || checkText.includes('未設定')) {
          currentTrouble.category = 'プロセス漏れ';
        } else if (checkText.includes('曖昧') || checkText.includes('定義')) {
          currentTrouble.category = '設計不備';
        }
      }
    }
  }

  if (currentTrouble) {
    troubles.push(currentTrouble);
  }

  return troubles;
}

/**
 * GitHubから会話ログデータを取得
 */
function getConversationDataFromGitHub() {
  try {
    const markdown = fetchFromGitHub(GITHUB_CONFIG.FILES.CONVERSATION_LOG);
    const conversations = parseConversationLog(markdown);

    // 統計計算
    const stats = {
      total: conversations.length,
      by_category: {},
      by_date: {},
      recent: conversations.slice(-50).reverse() // 最新50件
    };

    for (const conv of conversations) {
      // カテゴリ別
      stats.by_category[conv.category] = (stats.by_category[conv.category] || 0) + 1;

      // 日付別
      stats.by_date[conv.date] = (stats.by_date[conv.date] || 0) + 1;
    }

    return {
      success: true,
      stats: stats,
      conversations: stats.recent,
      source: 'github'
    };
  } catch (e) {
    return {
      success: false,
      error: e.message,
      source: 'github'
    };
  }
}

/**
 * GitHubから過去トラデータを取得
 */
function getTroubleDataFromGitHub() {
  try {
    const markdown = fetchFromGitHub(GITHUB_CONFIG.FILES.TROUBLE_LOG);
    const troubles = parseTroubleLog(markdown);

    // 統計計算
    const stats = {
      total: troubles.length,
      recurrence_count: troubles.filter(t => t.is_recurrence).length,
      by_category: {}
    };

    for (const trouble of troubles) {
      if (trouble.category) {
        stats.by_category[trouble.category] = (stats.by_category[trouble.category] || 0) + 1;
      }
    }

    stats.recurrence_rate = stats.total > 0
      ? Math.round((stats.recurrence_count / stats.total) * 100)
      : 0;

    return {
      success: true,
      stats: stats,
      troubles: troubles.slice(-30).reverse(), // 最新30件
      source: 'github'
    };
  } catch (e) {
    return {
      success: false,
      error: e.message,
      source: 'github'
    };
  }
}

/**
 * 全ダッシュボードデータを一括取得（GitHub版）
 */
function getAllDashboardDataFromGitHub() {
  return {
    conversation: getConversationDataFromGitHub(),
    trouble: getTroubleDataFromGitHub(),
    source: 'github',
    fetched_at: new Date().toISOString()
  };
}

// ========================================
// エラーグループ化 + GitHub Issue自動作成
// ========================================

/**
 * ErrorGroupsシートの列定義
 */
const ERROR_GROUPS_COLUMNS = {
  FINGERPRINT: 0,   // A: エラーの一意識別子
  ERROR_TYPE: 1,    // B: エラータイプ
  MESSAGE: 2,       // C: エラーメッセージ
  LOCATION: 3,      // D: 発生場所
  FIRST_SEEN: 4,    // E: 初回発生日時
  LAST_SEEN: 5,     // F: 最終発生日時
  COUNT: 6,         // G: 発生回数
  ISSUE_NUMBER: 7,  // H: GitHub Issue番号
  ISSUE_URL: 8,     // I: GitHub Issue URL
  STATUS: 9         // J: ステータス (open/closed)
};

/**
 * エラーのフィンガープリントを生成
 * 同じエラーを識別するためのハッシュ
 * @param {string} errorType - エラータイプ
 * @param {string} message - エラーメッセージ
 * @param {string} location - 発生場所
 * @returns {string} フィンガープリント
 */
function generateErrorFingerprint(errorType, message, location) {
  // メッセージから変動する部分（日時、ID等）を正規化
  const normalizedMessage = message
    .replace(/\d{4}-\d{2}-\d{2}/g, 'DATE')
    .replace(/\d{2}:\d{2}:\d{2}/g, 'TIME')
    .replace(/[a-f0-9]{8,}/gi, 'HASH')
    .replace(/\d+/g, 'N')
    .substring(0, 100);

  const base = `${errorType}:${normalizedMessage}:${location}`;

  // 簡易ハッシュ（GASではcryptoが使えないため）
  let hash = 0;
  for (let i = 0; i < base.length; i++) {
    const char = base.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'ERR' + Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
}

/**
 * ErrorGroupsシートを取得（なければ作成）
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function getOrCreateErrorGroupsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('ErrorGroups');

  if (!sheet) {
    sheet = ss.insertSheet('ErrorGroups');
    // ヘッダー行を設定
    sheet.getRange(1, 1, 1, 10).setValues([[
      'fingerprint', 'error_type', 'message', 'location',
      'first_seen', 'last_seen', 'count', 'issue_number', 'issue_url', 'status'
    ]]);
    sheet.setFrozenRows(1);
    // 列幅調整
    sheet.setColumnWidth(1, 120);  // fingerprint
    sheet.setColumnWidth(3, 300);  // message
    sheet.setColumnWidth(9, 250);  // issue_url
  }

  return sheet;
}

/**
 * GitHub Issueを作成
 * @param {string} title - Issueタイトル
 * @param {string} body - Issue本文
 * @param {string[]} labels - ラベル配列
 * @returns {Object} 作成されたIssue情報
 */
function createGitHubIssue(title, body, labels = ['bug', 'auto-generated']) {
  const token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if (!token) {
    throw new Error('GITHUB_TOKEN not set in Script Properties');
  }

  const url = `https://api.github.com/repos/${GITHUB_CONFIG.OWNER}/${GITHUB_CONFIG.REPO}/issues`;

  const payload = {
    title: title,
    body: body,
    labels: labels
  };

  const response = UrlFetchApp.fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  if (response.getResponseCode() !== 201) {
    throw new Error(`GitHub Issue creation failed: ${response.getResponseCode()} - ${response.getContentText()}`);
  }

  return JSON.parse(response.getContentText());
}

/**
 * GitHub Issueにコメントを追加
 * @param {number} issueNumber - Issue番号
 * @param {string} comment - コメント内容
 * @returns {Object} 作成されたコメント情報
 */
function addGitHubIssueComment(issueNumber, comment) {
  const token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if (!token) {
    throw new Error('GITHUB_TOKEN not set in Script Properties');
  }

  const url = `https://api.github.com/repos/${GITHUB_CONFIG.OWNER}/${GITHUB_CONFIG.REPO}/issues/${issueNumber}/comments`;

  const response = UrlFetchApp.fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify({ body: comment }),
    muteHttpExceptions: true
  });

  if (response.getResponseCode() !== 201) {
    throw new Error(`GitHub comment creation failed: ${response.getResponseCode()} - ${response.getContentText()}`);
  }

  return JSON.parse(response.getContentText());
}

/**
 * エラーを報告（グループ化 + GitHub Issue連携）
 * メインの公開API
 * @param {Object} errorInfo - エラー情報
 * @param {string} errorInfo.type - エラータイプ（例: 'TypeError', 'APIError'）
 * @param {string} errorInfo.message - エラーメッセージ
 * @param {string} errorInfo.location - 発生場所（例: 'Code.gs:123'）
 * @param {string} [errorInfo.stack] - スタックトレース（オプション）
 * @param {Object} [errorInfo.context] - 追加コンテキスト（オプション）
 * @returns {Object} 処理結果
 */
function reportError(errorInfo) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    const { type, message, location, stack, context } = errorInfo;
    const fingerprint = generateErrorFingerprint(type, message, location);
    const now = new Date().toISOString();

    const sheet = getOrCreateErrorGroupsSheet();
    const data = sheet.getDataRange().getValues();

    // 既存のエラーグループを検索
    let existingRow = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][ERROR_GROUPS_COLUMNS.FINGERPRINT] === fingerprint) {
        existingRow = i + 1; // 1-indexed
        break;
      }
    }

    let result;

    if (existingRow > 0) {
      // 既存のエラーグループが見つかった場合
      const currentCount = data[existingRow - 1][ERROR_GROUPS_COLUMNS.COUNT] || 0;
      const issueNumber = data[existingRow - 1][ERROR_GROUPS_COLUMNS.ISSUE_NUMBER];
      const issueUrl = data[existingRow - 1][ERROR_GROUPS_COLUMNS.ISSUE_URL];

      // カウント増加と最終発生日時更新
      sheet.getRange(existingRow, ERROR_GROUPS_COLUMNS.LAST_SEEN + 1).setValue(now);
      sheet.getRange(existingRow, ERROR_GROUPS_COLUMNS.COUNT + 1).setValue(currentCount + 1);

      // GitHub Issueにコメント追加（Issue番号がある場合）
      if (issueNumber) {
        const comment = `## 再発検知 (${currentCount + 1}回目)\n\n` +
          `**発生日時**: ${now}\n` +
          `**発生場所**: ${location}\n` +
          (stack ? `\n**スタックトレース**:\n\`\`\`\n${stack}\n\`\`\`\n` : '') +
          (context ? `\n**コンテキスト**:\n\`\`\`json\n${JSON.stringify(context, null, 2)}\n\`\`\`\n` : '');

        try {
          addGitHubIssueComment(issueNumber, comment);
        } catch (e) {
          console.error('Failed to add GitHub comment:', e);
        }
      }

      result = {
        status: 'existing',
        fingerprint: fingerprint,
        count: currentCount + 1,
        issueNumber: issueNumber,
        issueUrl: issueUrl,
        message: `既存エラーグループ（${currentCount + 1}回目）`
      };

      // Discord通知（3回以上の場合のみ）
      if (currentCount + 1 >= 3 && (currentCount + 1) % 3 === 0) {
        notifyErrorToDiscord(errorInfo, result, 'recurring');
      }

    } else {
      // 新規エラーグループの場合

      // GitHub Issue作成
      const issueTitle = `[Auto] ${type}: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`;
      const issueBody = `## エラー自動報告\n\n` +
        `**フィンガープリント**: \`${fingerprint}\`\n` +
        `**エラータイプ**: ${type}\n` +
        `**発生場所**: ${location}\n` +
        `**初回発生日時**: ${now}\n\n` +
        `### エラーメッセージ\n\`\`\`\n${message}\n\`\`\`\n` +
        (stack ? `\n### スタックトレース\n\`\`\`\n${stack}\n\`\`\`\n` : '') +
        (context ? `\n### コンテキスト\n\`\`\`json\n${JSON.stringify(context, null, 2)}\n\`\`\`\n` : '') +
        `\n---\n*このIssueはGASエラー報告システムにより自動作成されました*`;

      let issueNumber = null;
      let issueUrl = null;

      try {
        const issue = createGitHubIssue(issueTitle, issueBody);
        issueNumber = issue.number;
        issueUrl = issue.html_url;
      } catch (e) {
        console.error('Failed to create GitHub Issue:', e);
      }

      // ErrorGroupsシートに新規行追加
      sheet.appendRow([
        fingerprint,
        type,
        message.substring(0, 500),
        location,
        now,
        now,
        1,
        issueNumber,
        issueUrl,
        'open'
      ]);

      result = {
        status: 'new',
        fingerprint: fingerprint,
        count: 1,
        issueNumber: issueNumber,
        issueUrl: issueUrl,
        message: 'エラーグループを新規作成'
      };

      // Discord通知（新規エラーは必ず通知）
      notifyErrorToDiscord(errorInfo, result, 'new');
    }

    return result;

  } finally {
    lock.releaseLock();
  }
}

/**
 * エラーをDiscordに通知
 * @param {Object} errorInfo - エラー情報
 * @param {Object} result - 処理結果
 * @param {string} notifyType - 通知タイプ（'new' or 'recurring'）
 */
function notifyErrorToDiscord(errorInfo, result, notifyType) {
  const webhookUrl = PropertiesService.getScriptProperties().getProperty('DISCORD_BUGREPORT_WEBHOOK');
  if (!webhookUrl) {
    console.log('DISCORD_BUGREPORT_WEBHOOK not set, skipping notification');
    return;
  }

  const emoji = notifyType === 'new' ? '🆕' : '🔄';
  const title = notifyType === 'new' ? '新規エラー検出' : `エラー再発（${result.count}回目）`;

  const embed = {
    title: `${emoji} ${title}`,
    color: notifyType === 'new' ? 0xFF0000 : 0xFFA500,
    fields: [
      {
        name: 'エラータイプ',
        value: errorInfo.type,
        inline: true
      },
      {
        name: '発生場所',
        value: errorInfo.location,
        inline: true
      },
      {
        name: '発生回数',
        value: `${result.count}回`,
        inline: true
      },
      {
        name: 'メッセージ',
        value: errorInfo.message.substring(0, 200)
      }
    ],
    timestamp: new Date().toISOString()
  };

  if (result.issueUrl) {
    embed.fields.push({
      name: 'GitHub Issue',
      value: `[#${result.issueNumber}](${result.issueUrl})`
    });
  }

  try {
    UrlFetchApp.fetch(webhookUrl, {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify({
        embeds: [embed]
      })
    });
  } catch (e) {
    console.error('Discord notification failed:', e);
  }
}

/**
 * エラーグループの統計情報を取得
 * @returns {Object} 統計情報
 */
function getErrorGroupStats() {
  const sheet = getOrCreateErrorGroupsSheet();
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) {
    return {
      totalGroups: 0,
      totalOccurrences: 0,
      openIssues: 0,
      closedIssues: 0,
      topErrors: []
    };
  }

  let totalOccurrences = 0;
  let openIssues = 0;
  let closedIssues = 0;
  const errors = [];

  for (let i = 1; i < data.length; i++) {
    const count = data[i][ERROR_GROUPS_COLUMNS.COUNT] || 0;
    totalOccurrences += count;

    if (data[i][ERROR_GROUPS_COLUMNS.STATUS] === 'open') {
      openIssues++;
    } else {
      closedIssues++;
    }

    errors.push({
      fingerprint: data[i][ERROR_GROUPS_COLUMNS.FINGERPRINT],
      type: data[i][ERROR_GROUPS_COLUMNS.ERROR_TYPE],
      message: data[i][ERROR_GROUPS_COLUMNS.MESSAGE],
      count: count,
      issueNumber: data[i][ERROR_GROUPS_COLUMNS.ISSUE_NUMBER],
      issueUrl: data[i][ERROR_GROUPS_COLUMNS.ISSUE_URL],
      status: data[i][ERROR_GROUPS_COLUMNS.STATUS]
    });
  }

  // 発生回数でソート
  errors.sort((a, b) => b.count - a.count);

  return {
    totalGroups: data.length - 1,
    totalOccurrences: totalOccurrences,
    openIssues: openIssues,
    closedIssues: closedIssues,
    topErrors: errors.slice(0, 5)
  };
}

/**
 * エラーグループのステータスを更新
 * @param {string} fingerprint - フィンガープリント
 * @param {string} status - 新しいステータス（'open' or 'closed'）
 * @returns {boolean} 成功/失敗
 */
function updateErrorGroupStatus(fingerprint, status) {
  const sheet = getOrCreateErrorGroupsSheet();
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][ERROR_GROUPS_COLUMNS.FINGERPRINT] === fingerprint) {
      sheet.getRange(i + 1, ERROR_GROUPS_COLUMNS.STATUS + 1).setValue(status);
      return true;
    }
  }

  return false;
}

/**
 * テスト用：エラー報告をシミュレート
 */
function testReportError() {
  const result = reportError({
    type: 'TestError',
    message: 'これはテストエラーです。正常に動作しています。',
    location: 'Code.gs:testReportError',
    context: { test: true, timestamp: new Date().toISOString() }
  });

  console.log('Test result:', JSON.stringify(result, null, 2));
  return result;
}

// ========================================
// お知らせ機能（TPS Notifications）
// ========================================

/**
 * お知らせカテゴリ定義
 */
const NOTIFICATION_CATEGORIES = {
  APPROVAL: 'approval',       // 承認関連
  ALERT: 'alert',            // アラート
  UPDATE: 'update',          // 更新通知
  INFO: 'info',              // 情報
  SYSTEM: 'system'           // システム通知
};

/**
 * お知らせシートを取得または作成
 */
function getOrCreateNotificationsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Notifications');

  if (!sheet) {
    sheet = ss.insertSheet('Notifications');
    sheet.appendRow(['id', 'timestamp', 'category', 'title', 'message', 'link', 'read', 'priority']);
    sheet.getRange(1, 1, 1, 8).setFontWeight('bold');
  }

  return sheet;
}

/**
 * お知らせ一覧を取得
 * @param {number} limit - 取得件数（デフォルト20）
 * @param {boolean} unreadOnly - 未読のみ取得
 * @returns {Object} お知らせデータ
 */
function getNotifications(limit, unreadOnly) {
  const sheet = getOrCreateNotificationsSheet();
  const data = sheet.getDataRange().getValues();

  const notifications = [];
  let unreadCount = 0;

  for (let i = data.length - 1; i >= 1; i--) {
    const isRead = data[i][6] === true || data[i][6] === 'TRUE';

    if (!isRead) {
      unreadCount++;
    }

    if (unreadOnly && isRead) {
      continue;
    }

    if (notifications.length < (limit || 20)) {
      notifications.push({
        id: data[i][0],
        timestamp: data[i][1] instanceof Date ? data[i][1].toISOString() : data[i][1],
        category: data[i][2],
        title: data[i][3],
        message: data[i][4],
        link: data[i][5],
        read: isRead,
        priority: data[i][7] || 'normal'
      });
    }
  }

  return {
    notifications: notifications,
    unreadCount: unreadCount,
    totalCount: data.length - 1,
    updated_at: new Date().toISOString()
  };
}

/**
 * お知らせを追加
 * @param {string} category - カテゴリ（approval, alert, update, info, system）
 * @param {string} title - タイトル
 * @param {string} message - メッセージ
 * @param {string} link - リンク（オプション）
 * @param {string} priority - 優先度（high, normal, low）
 * @returns {Object} 追加したお知らせ
 */
function addNotification(category, title, message, link, priority) {
  const sheet = getOrCreateNotificationsSheet();
  const id = 'NOTIF-' + Utilities.formatDate(new Date(), 'JST', 'yyyyMMddHHmmss');
  const timestamp = new Date().toISOString();

  sheet.appendRow([id, timestamp, category, title, message, link || '', false, priority || 'normal']);

  return {
    id: id,
    timestamp: timestamp,
    category: category,
    title: title,
    message: message,
    link: link,
    read: false,
    priority: priority || 'normal'
  };
}

/**
 * お知らせを既読にする
 * @param {string} notificationId - お知らせID
 * @returns {boolean} 成功/失敗
 */
function markNotificationAsRead(notificationId) {
  const sheet = getOrCreateNotificationsSheet();
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === notificationId) {
      sheet.getRange(i + 1, 7).setValue(true);
      return true;
    }
  }

  return false;
}

/**
 * 全てのお知らせを既読にする
 * @returns {number} 既読にした件数
 */
function markAllNotificationsAsRead() {
  const sheet = getOrCreateNotificationsSheet();
  const data = sheet.getDataRange().getValues();
  let count = 0;

  for (let i = 1; i < data.length; i++) {
    if (data[i][6] !== true && data[i][6] !== 'TRUE') {
      sheet.getRange(i + 1, 7).setValue(true);
      count++;
    }
  }

  return count;
}

/**
 * システム通知を自動生成（KPI閾値超過時など）
 */
function checkAndGenerateSystemNotifications() {
  const kpiData = getKGIStatus();
  const notifications = [];

  // 0不良日連続が目標を達成した場合
  if (kpiData.zero_defect_days >= 7) {
    const existing = getNotifications(100, false);
    const hasAchievementNotif = existing.notifications.some(
      n => n.category === 'info' && n.title.includes('0不良日連続')
    );

    if (!hasAchievementNotif) {
      notifications.push(addNotification(
        'info',
        '0不良日連続 ' + kpiData.zero_defect_days + '日達成',
        'おめでとうございます！0不良日連続目標を達成しました。',
        null,
        'normal'
      ));
    }
  }

  // 再発発生率が高い場合
  if (kpiData.recurrence_rate > 20) {
    notifications.push(addNotification(
      'alert',
      '再発発生率が高くなっています',
      '再発発生率が ' + kpiData.recurrence_rate + '% です。過去トラ対策を見直してください。',
      null,
      'high'
    ));
  }

  return notifications;
}

/**
 * 承認待ち通知を追加（相互同期用）
 * @param {string} approvalType - 承認タイプ（deploy, spec_change, emergency）
 * @param {string} description - 説明
 * @param {string} actionUrl - アクションURL
 * @returns {Object} 追加したお知らせ
 */
function addApprovalNotification(approvalType, description, actionUrl) {
  const titleMap = {
    'deploy': '本番デプロイ承認待ち',
    'spec_change': '仕様変更承認待ち',
    'emergency': '緊急対応承認待ち'
  };

  return addNotification(
    'approval',
    titleMap[approvalType] || '承認待ち',
    description,
    actionUrl,
    'high'
  );
}

/**
 * Claude Code許可設定を取得（FEATURE-008）
 * GitHubから.claude/settings.local.jsonを読み取り、構造化したデータを返す
 * @returns {Object} 許可設定データ
 */
function getPermissionSettings() {
  // 許可設定の定義（カテゴリ別）
  const permissionDefinitions = {
    // ファイル操作
    'Edit': { category: 'file', purpose: 'ファイル編集', status: 'allow', reason: '開発作業に必須' },
    'Write': { category: 'file', purpose: 'ファイル作成', status: 'allow', reason: '開発作業に必須' },

    // ファイルシステムコマンド
    'Bash(touch:*)': { category: 'filesystem', purpose: 'ファイル作成/更新', status: 'allow', reason: '一般的なファイル操作' },
    'Bash(mkdir:*)': { category: 'filesystem', purpose: 'ディレクトリ作成', status: 'allow', reason: '一般的なファイル操作' },
    'Bash(cp:*)': { category: 'filesystem', purpose: 'ファイルコピー', status: 'allow', reason: '一般的なファイル操作' },
    'Bash(mv:*)': { category: 'filesystem', purpose: 'ファイル移動', status: 'allow', reason: '一般的なファイル操作' },
    'Bash(ls:*)': { category: 'filesystem', purpose: 'ファイル一覧', status: 'allow', reason: '読み取り専用' },
    'Bash(find:*)': { category: 'filesystem', purpose: 'ファイル検索', status: 'allow', reason: '読み取り専用' },
    'Bash(cat:*)': { category: 'filesystem', purpose: 'ファイル表示', status: 'allow', reason: '読み取り専用' },
    'Bash(head:*)': { category: 'filesystem', purpose: 'ファイル先頭表示', status: 'allow', reason: '読み取り専用' },
    'Bash(tail:*)': { category: 'filesystem', purpose: 'ファイル末尾表示', status: 'allow', reason: '読み取り専用' },
    'Bash(diff:*)': { category: 'filesystem', purpose: '差分表示', status: 'allow', reason: '読み取り専用' },
    'Bash(wc:*)': { category: 'filesystem', purpose: '行数カウント', status: 'allow', reason: '読み取り専用' },
    'Bash(grep:*)': { category: 'filesystem', purpose: 'パターン検索', status: 'allow', reason: '読み取り専用' },
    'Bash(chmod:*)': { category: 'filesystem', purpose: '権限変更', status: 'allow', reason: 'スクリプト実行に必要' },

    // Git操作
    'Bash(git status:*)': { category: 'git', purpose: '状態確認', status: 'allow', reason: '読み取り専用' },
    'Bash(git diff:*)': { category: 'git', purpose: '差分確認', status: 'allow', reason: '読み取り専用' },
    'Bash(git log:*)': { category: 'git', purpose: '履歴確認', status: 'allow', reason: '読み取り専用' },
    'Bash(git pull:*)': { category: 'git', purpose: '最新取得', status: 'allow', reason: '同期に必要' },
    'Bash(git fetch:*)': { category: 'git', purpose: 'リモート取得', status: 'allow', reason: '同期に必要' },
    'Bash(git branch:*)': { category: 'git', purpose: 'ブランチ操作', status: 'allow', reason: '開発に必要' },
    'Bash(git checkout:*)': { category: 'git', purpose: 'ブランチ切替', status: 'allow', reason: '開発に必要' },
    'Bash(git stash:*)': { category: 'git', purpose: '一時保存', status: 'allow', reason: '開発に必要' },
    'Bash(git merge:*)': { category: 'git', purpose: 'マージ', status: 'allow', reason: '開発に必要' },
    'Bash(git rebase:*)': { category: 'git', purpose: 'リベース', status: 'allow', reason: '開発に必要' },
    'Bash(git show:*)': { category: 'git', purpose: 'コミット表示', status: 'allow', reason: '読み取り専用' },
    'Bash(git reset:*)': { category: 'git', purpose: 'リセット', status: 'allow', reason: '開発に必要' },
    'Bash(git clean:*)': { category: 'git', purpose: 'クリーン', status: 'allow', reason: '開発に必要' },
    'Bash(git add:*)': { category: 'git', purpose: 'ステージング', status: 'allow', reason: 'コミットに必要' },
    'Bash(git commit:*)': { category: 'git', purpose: 'コミット', status: 'allow', reason: '履歴保存に必要' },
    'Bash(git push:*)': { category: 'git', purpose: 'プッシュ', status: 'allow', reason: '同期に必要' },
    'Bash(git remote:*)': { category: 'git', purpose: 'リモート操作', status: 'allow', reason: '設定に必要' },

    // npm/Node.js
    'Bash(npm run:*)': { category: 'npm', purpose: 'スクリプト実行', status: 'allow', reason: 'ビルド・テストに必要' },
    'Bash(npm test:*)': { category: 'npm', purpose: 'テスト実行', status: 'allow', reason: 'テストに必要' },
    'Bash(npm start:*)': { category: 'npm', purpose: '起動', status: 'allow', reason: '開発に必要' },
    'Bash(npm build:*)': { category: 'npm', purpose: 'ビルド', status: 'allow', reason: 'ビルドに必要' },
    'Bash(npm install)': { category: 'npm', purpose: 'パッケージインストール', status: 'allow', reason: '依存関係に必要' },
    'Bash(npx:*)': { category: 'npm', purpose: 'パッケージ実行', status: 'allow', reason: 'ツール実行に必要' },
    'Bash(node:*)': { category: 'npm', purpose: 'Node.js実行', status: 'allow', reason: 'スクリプト実行に必要' },

    // clasp（GAS）
    'Bash(clasp push:*)': { category: 'clasp', purpose: 'コード反映', status: 'allow', reason: 'テスト環境への反映' },
    'Bash(clasp deploy:*)': { category: 'clasp', purpose: '本番デプロイ', status: 'allow', reason: '本番環境への反映' },
    'Bash(clasp deployments:*)': { category: 'clasp', purpose: 'デプロイ一覧', status: 'allow', reason: '読み取り専用' },
    'Bash(clasp status:*)': { category: 'clasp', purpose: '状態確認', status: 'allow', reason: '読み取り専用' },
    'Bash(clasp open:*)': { category: 'clasp', purpose: 'エディタ開く', status: 'allow', reason: '開発に便利' },
    'Bash(clasp login:*)': { category: 'clasp', purpose: 'ログイン', status: 'allow', reason: '認証に必要' },
    'Bash(clasp create:*)': { category: 'clasp', purpose: 'プロジェクト作成', status: 'allow', reason: '新規作成に必要' },
    'Bash(clasp run:*)': { category: 'clasp', purpose: '関数実行', status: 'allow', reason: 'テストに必要' },

    // GitHub CLI
    'Bash(gh pr:*)': { category: 'github', purpose: 'PR操作', status: 'allow', reason: 'PR管理に必要' },
    'Bash(gh api:*)': { category: 'github', purpose: 'API呼び出し', status: 'allow', reason: '情報取得に必要' },
    'Bash(gh repo:*)': { category: 'github', purpose: 'リポジトリ操作', status: 'allow', reason: 'リポジトリ管理に必要' },
    'Bash(gh issue list:*)': { category: 'github', purpose: 'Issue一覧', status: 'allow', reason: '読み取り専用' },
    'Bash(gh run list:*)': { category: 'github', purpose: 'Actions一覧', status: 'allow', reason: '読み取り専用' },
    'Bash(gh auth:*)': { category: 'github', purpose: '認証', status: 'allow', reason: '認証に必要' },

    // Python
    'Bash(python:*)': { category: 'python', purpose: 'Python2実行', status: 'allow', reason: 'スクリプト実行に必要' },
    'Bash(python3:*)': { category: 'python', purpose: 'Python3実行', status: 'allow', reason: 'スクリプト実行に必要' },

    // MCP/AI
    'mcp__gemini-cli__geminiChat': { category: 'ai', purpose: 'Gemini Chat', status: 'allow', reason: 'コード監査に使用' },
    'mcp__gemini-cli__googleSearch': { category: 'ai', purpose: 'Gemini検索', status: 'allow', reason: '情報検索に使用' },
    'Skill(gemini-audit)': { category: 'ai', purpose: 'Gemini監査', status: 'allow', reason: '品質チェックに使用' },

    // Web
    'WebSearch': { category: 'web', purpose: 'Web検索', status: 'allow', reason: '情報収集に使用' },
    'WebFetch(domain:github.com)': { category: 'web', purpose: 'GitHub取得', status: 'allow', reason: 'コード取得に使用' },
    'WebFetch(domain:docs.anthropic.com)': { category: 'web', purpose: 'Anthropicドキュメント', status: 'allow', reason: 'API参照に使用' },
    'WebFetch(domain:zenn.dev)': { category: 'web', purpose: 'Zenn記事', status: 'allow', reason: '技術情報参照に使用' },
    'WebFetch(domain:script.google.com)': { category: 'web', purpose: 'GASスクリプト', status: 'allow', reason: 'GAS参照に使用' },
    'WebFetch(domain:developers.google.com)': { category: 'web', purpose: 'Google開発者ドキュメント', status: 'allow', reason: 'API参照に使用' },

    // プロジェクトスクリプト
    './scripts/notify-discord.sh:*': { category: 'script', purpose: 'Discord通知', status: 'allow', reason: '通知送信に使用' },
    './scripts/sync-dashboard.sh:*': { category: 'script', purpose: 'ダッシュボード同期', status: 'allow', reason: 'データ同期に使用' },
    './scripts/watch-conversation.sh:*': { category: 'script', purpose: '会話監視', status: 'allow', reason: 'ログ収集に使用' },
    './scripts/session-start-check.sh:*': { category: 'script', purpose: 'セッション開始チェック', status: 'allow', reason: 'セッション管理に使用' },

    // 禁止操作（例として）
    'Bash(rm -rf:*)': { category: 'danger', purpose: '再帰削除', status: 'deny', reason: '破壊的操作のため禁止' },
    'Bash(sudo:*)': { category: 'danger', purpose: '管理者権限', status: 'deny', reason: 'セキュリティリスク' }
  };

  // カテゴリ名のマッピング
  const categoryNames = {
    'file': 'ファイル操作',
    'filesystem': 'ファイルシステム',
    'git': 'Git操作',
    'npm': 'npm/Node.js',
    'clasp': 'clasp（GAS）',
    'github': 'GitHub CLI',
    'python': 'Python',
    'ai': 'AI/MCP',
    'web': 'Web',
    'script': 'プロジェクトスクリプト',
    'danger': '禁止操作'
  };

  // 配列形式に変換
  const permissions = [];
  for (const [operation, def] of Object.entries(permissionDefinitions)) {
    permissions.push({
      operation: operation,
      category: def.category,
      categoryName: categoryNames[def.category] || def.category,
      purpose: def.purpose,
      status: def.status,
      reason: def.reason
    });
  }

  // カテゴリでソート
  const categoryOrder = ['file', 'filesystem', 'git', 'npm', 'clasp', 'github', 'python', 'ai', 'web', 'script', 'danger'];
  permissions.sort((a, b) => {
    const aIndex = categoryOrder.indexOf(a.category);
    const bIndex = categoryOrder.indexOf(b.category);
    if (aIndex !== bIndex) return aIndex - bIndex;
    return a.operation.localeCompare(b.operation);
  });

  return {
    permissions: permissions,
    summary: {
      total: permissions.length,
      allow: permissions.filter(p => p.status === 'allow').length,
      ask: permissions.filter(p => p.status === 'ask').length,
      deny: permissions.filter(p => p.status === 'deny').length
    },
    source: '.claude/settings.local.json',
    lastUpdated: new Date().toISOString()
  };
}
