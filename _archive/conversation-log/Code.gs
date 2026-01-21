/**
 * 会話ログDB - Code.gs
 * B2Bカード決済営業向け 会話記録・翻訳・感情分析システム
 */

// ===== 設定管理 =====

/**
 * スクリプトプロパティから設定を取得
 */
function getConfig() {
  const props = PropertiesService.getScriptProperties();
  return {
    spreadsheetId: props.getProperty('SPREADSHEET_ID') || '',
    geminiApiKey: props.getProperty('GEMINI_API_KEY') || '',
    defaultTranslationLang: props.getProperty('DEFAULT_TRANSLATION_LANG') || 'ja',
    sentimentEnabled: props.getProperty('SENTIMENT_ENABLED') !== 'false'
  };
}

/**
 * 初期設定をスクリプトプロパティに保存
 * GASエディタから実行: setInitialConfig()
 */
function setInitialConfig(config) {
  const props = PropertiesService.getScriptProperties();

  if (config && config.spreadsheetId) {
    props.setProperty('SPREADSHEET_ID', config.spreadsheetId);
  }
  if (config && config.geminiApiKey) {
    props.setProperty('GEMINI_API_KEY', config.geminiApiKey);
  }
  if (config && config.defaultTranslationLang) {
    props.setProperty('DEFAULT_TRANSLATION_LANG', config.defaultTranslationLang);
  }
  if (config && config.sentimentEnabled !== undefined) {
    props.setProperty('SENTIMENT_ENABLED', String(config.sentimentEnabled));
  }

  Logger.log('設定を保存しました');
  Logger.log('SPREADSHEET_ID: ' + props.getProperty('SPREADSHEET_ID'));
  Logger.log('GEMINI_API_KEY: ' + (props.getProperty('GEMINI_API_KEY') ? '****設定済み' : '未設定'));

  return { success: true, message: '設定を保存しました' };
}

/**
 * 現在の設定を確認（デバッグ用）
 */
function checkConfig() {
  const config = getConfig();
  Logger.log('現在の設定:');
  Logger.log('SPREADSHEET_ID: ' + config.spreadsheetId);
  Logger.log('GEMINI_API_KEY: ' + (config.geminiApiKey ? '****設定済み' : '未設定'));
  Logger.log('DEFAULT_TRANSLATION_LANG: ' + config.defaultTranslationLang);
  Logger.log('SENTIMENT_ENABLED: ' + config.sentimentEnabled);
  return config;
}

/**
 * スプレッドシートを取得（エラーハンドリング付き）
 */
function getSpreadsheet() {
  const config = getConfig();
  if (!config.spreadsheetId) {
    throw new Error('スプレッドシートが設定されていません。setupConversationLogSystem()を実行してください。');
  }
  return SpreadsheetApp.openById(config.spreadsheetId);
}

// ===== 定数定義 =====
const SHEET_NAMES = {
  LOGS: '会話ログ',
  TRANSLATIONS: '翻訳キャッシュ',
  SENTIMENTS: '感情分析',
  CUSTOMERS: '顧客リンク',
  SETTINGS: '設定'
};

// 感情分析のラベル
const SENTIMENT_LABELS = {
  POSITIVE: { label: 'ポジティブ', color: '#10B981', icon: '😊' },
  NEUTRAL: { label: 'ニュートラル', color: '#6B7280', icon: '😐' },
  NEGATIVE: { label: 'ネガティブ', color: '#EF4444', icon: '😟' },
  VERY_POSITIVE: { label: '非常にポジティブ', color: '#059669', icon: '😄' },
  VERY_NEGATIVE: { label: '非常にネガティブ', color: '#DC2626', icon: '😠' }
};

// ===== Web アプリケーション =====

/**
 * Webアプリのメインエントリーポイント
 */
function doGet(e) {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('会話ログDB')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * HTMLファイルをインクルードする
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ===== スプレッドシート初期化 =====

/**
 * スプレッドシートを初期化
 */
function initializeSpreadsheet() {
  const ss = getSpreadsheet();
  const existingSheets = ss.getSheets().map(s => s.getName());

  // 会話ログ
  if (!existingSheets.includes(SHEET_NAMES.LOGS)) {
    // LockService使用（TROUBLE-018対応）
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(30000);
      if (!ss.getSheetByName(SHEET_NAMES.LOGS)) {
        const sheet = ss.insertSheet(SHEET_NAMES.LOGS);
        sheet.getRange(1, 1, 1, 14).setValues([[
          'ログID', '顧客ID', '顧客名', '担当者ID', '担当者名', 'チャネル',
          'メッセージタイプ', '元メッセージ', '翻訳済み', '言語', '感情',
          '感情スコア', 'タイムスタンプ', 'メモ'
        ]]);
        sheet.setFrozenRows(1);
        sheet.getRange(1, 1, 1, 14).setBackground('#4285f4').setFontColor('white').setFontWeight('bold');
      }
    } finally {
      lock.releaseLock();
    }
  }

  // 翻訳キャッシュ
  if (!existingSheets.includes(SHEET_NAMES.TRANSLATIONS)) {
    // LockService使用（TROUBLE-018対応）
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(30000);
      if (!ss.getSheetByName(SHEET_NAMES.TRANSLATIONS)) {
        const sheet = ss.insertSheet(SHEET_NAMES.TRANSLATIONS);
        sheet.getRange(1, 1, 1, 6).setValues([[
          '翻訳ID', '元テキスト', '翻訳テキスト', 'ソース言語', 'ターゲット言語', '作成日時'
        ]]);
        sheet.setFrozenRows(1);
        sheet.getRange(1, 1, 1, 6).setBackground('#34a853').setFontColor('white').setFontWeight('bold');
      }
    } finally {
      lock.releaseLock();
    }
  }

  // 感情分析
  if (!existingSheets.includes(SHEET_NAMES.SENTIMENTS)) {
    // LockService使用（TROUBLE-018対応）
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(30000);
      if (!ss.getSheetByName(SHEET_NAMES.SENTIMENTS)) {
        const sheet = ss.insertSheet(SHEET_NAMES.SENTIMENTS);
        sheet.getRange(1, 1, 1, 8).setValues([[
          '分析ID', 'ログID', 'テキスト', '感情ラベル', '感情スコア',
          'キーワード', '要約', '分析日時'
        ]]);
        sheet.setFrozenRows(1);
        sheet.getRange(1, 1, 1, 8).setBackground('#fbbc04').setFontColor('white').setFontWeight('bold');
      }
    } finally {
      lock.releaseLock();
    }
  }

  // 顧客リンク（CRM連携用）
  if (!existingSheets.includes(SHEET_NAMES.CUSTOMERS)) {
    // LockService使用（TROUBLE-018対応）
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(30000);
      if (!ss.getSheetByName(SHEET_NAMES.CUSTOMERS)) {
        const sheet = ss.insertSheet(SHEET_NAMES.CUSTOMERS);
        sheet.getRange(1, 1, 1, 6).setValues([[
          '顧客ID', '顧客名', 'リードID', 'メール', '最終会話日', '会話件数'
        ]]);
        sheet.setFrozenRows(1);
        sheet.getRange(1, 1, 1, 6).setBackground('#ea4335').setFontColor('white').setFontWeight('bold');
      }
    } finally {
      lock.releaseLock();
    }
  }

  // 設定
  if (!existingSheets.includes(SHEET_NAMES.SETTINGS)) {
    // LockService使用（TROUBLE-018対応）
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(30000);
      if (!ss.getSheetByName(SHEET_NAMES.SETTINGS)) {
        const sheet = ss.insertSheet(SHEET_NAMES.SETTINGS);
        sheet.getRange(1, 1, 4, 2).setValues([
          ['設定項目', '値'],
          ['Gemini API Key', ''],
          ['デフォルト翻訳言語', 'ja'],
          ['感情分析を有効化', 'true']
        ]);
        sheet.setFrozenRows(1);
        sheet.getRange(1, 1, 1, 2).setBackground('#607d8b').setFontColor('white').setFontWeight('bold');
      }
    } finally {
      lock.releaseLock();
    }
  }

  return { success: true, message: 'スプレッドシートを初期化しました' };
}

// ===== ログID生成 =====

/**
 * 新しいログIDを生成
 */
function generateLogId() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.LOGS);
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return 'LOG-001';
  }

  const lastId = sheet.getRange(lastRow, 1).getValue();
  const num = parseInt(lastId.replace('LOG-', '')) + 1;
  return `LOG-${String(num).padStart(3, '0')}`;
}

// ===== 会話ログ管理 =====

/**
 * 会話ログを追加
 */
function addConversationLog(data) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAMES.LOGS);
    const logId = generateLogId();
    const now = new Date();

    // 言語検出
    const detectedLanguage = detectLanguage(data.message);

    // 翻訳（日本語以外の場合）
    let translatedMessage = data.message;
    if (detectedLanguage !== 'ja') {
      const translation = translateText(data.message, detectedLanguage, 'ja');
      if (translation.success) {
        translatedMessage = translation.translatedText;
      }
    }

    // 感情分析
    let sentiment = 'NEUTRAL';
    let sentimentScore = 0.5;
    if (getConfig().sentimentEnabled) {
      const analysis = analyzeSentiment(translatedMessage);
      if (analysis.success) {
        sentiment = analysis.sentiment;
        sentimentScore = analysis.score;
      }
    }

    // ログを保存
    sheet.appendRow([
      logId,
      data.customerId || '',
      data.customerName || '',
      data.assigneeId || '',
      data.assigneeName || '',
      data.channel || 'その他',
      data.messageType || '受信',
      data.message,
      translatedMessage,
      detectedLanguage,
      sentiment,
      sentimentScore,
      now,
      data.memo || ''
    ]);

    // 顧客リンクを更新
    updateCustomerLink(data.customerId, data.customerName);

    return {
      success: true,
      logId: logId,
      translatedMessage: translatedMessage,
      sentiment: sentiment,
      sentimentScore: sentimentScore
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 会話ログを取得（顧客ID指定）
 */
function getConversationLogs(customerId, limit) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.LOGS);
  const data = sheet.getDataRange().getValues();
  const logs = [];

  for (let i = data.length - 1; i >= 1; i--) {
    if (!customerId || data[i][1] === customerId) {
      logs.push({
        logId: data[i][0],
        customerId: data[i][1],
        customerName: data[i][2],
        assigneeId: data[i][3],
        assigneeName: data[i][4],
        channel: data[i][5],
        messageType: data[i][6],
        originalMessage: data[i][7],
        translatedMessage: data[i][8],
        language: data[i][9],
        sentiment: data[i][10],
        sentimentScore: data[i][11],
        timestamp: data[i][12],
        memo: data[i][13]
      });

      if (limit && logs.length >= limit) {
        break;
      }
    }
  }

  return logs;
}

/**
 * 全会話ログを取得
 */
function getAllLogs(limit) {
  return getConversationLogs(null, limit || 100);
}

/**
 * 顧客リンクを更新
 */
function updateCustomerLink(customerId, customerName) {
  if (!customerId) return;

  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.CUSTOMERS);
  const data = sheet.getDataRange().getValues();
  const now = new Date();

  // 既存顧客を検索
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === customerId) {
      // 会話件数を更新
      const count = (data[i][5] || 0) + 1;
      sheet.getRange(i + 1, 5).setValue(now); // 最終会話日
      sheet.getRange(i + 1, 6).setValue(count); // 会話件数
      return;
    }
  }

  // 新規顧客として追加
  sheet.appendRow([customerId, customerName || '', '', '', now, 1]);
}

// ===== Gemini API連携 =====

/**
 * Gemini APIを呼び出す
 */
function callGeminiAPI(prompt) {
  const apiKey = getConfig().geminiApiKey;
  if (!apiKey) {
    return { success: false, error: 'Gemini API キーが設定されていません。setInitialConfig()でGEMINI_API_KEYを設定してください。' };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{
      parts: [{ text: prompt }]
    }]
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const json = JSON.parse(response.getContentText());

    if (json.candidates && json.candidates[0] && json.candidates[0].content) {
      const text = json.candidates[0].content.parts[0].text;
      return { success: true, text: text };
    } else {
      return { success: false, error: 'APIからの応答が不正です' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 言語を検出
 */
function detectLanguage(text) {
  // 簡易言語検出（日本語、英語、中国語、韓国語）
  const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF]/;
  const chineseRegex = /[\u4E00-\u9FFF]/;
  const koreanRegex = /[\uAC00-\uD7AF]/;
  const englishRegex = /^[A-Za-z0-9\s.,!?'"()-]+$/;

  if (japaneseRegex.test(text)) {
    return 'ja';
  } else if (koreanRegex.test(text)) {
    return 'ko';
  } else if (chineseRegex.test(text) && !japaneseRegex.test(text)) {
    return 'zh';
  } else if (englishRegex.test(text)) {
    return 'en';
  }

  return 'unknown';
}

/**
 * テキストを翻訳
 */
function translateText(text, sourceLang, targetLang) {
  // 翻訳キャッシュをチェック
  const cached = checkTranslationCache(text, targetLang);
  if (cached) {
    return { success: true, translatedText: cached };
  }

  const langNames = {
    'ja': '日本語',
    'en': '英語',
    'zh': '中国語',
    'ko': '韓国語'
  };

  const prompt = `以下のテキストを${langNames[targetLang] || targetLang}に翻訳してください。翻訳結果のみを出力してください。

テキスト: ${text}`;

  const result = callGeminiAPI(prompt);

  if (result.success) {
    // キャッシュに保存
    saveTranslationCache(text, result.text, sourceLang, targetLang);
    return { success: true, translatedText: result.text.trim() };
  }

  return { success: false, error: result.error };
}

/**
 * 翻訳キャッシュをチェック
 */
function checkTranslationCache(text, targetLang) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.TRANSLATIONS);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === text && data[i][4] === targetLang) {
      return data[i][2];
    }
  }
  return null;
}

/**
 * 翻訳キャッシュを保存
 */
function saveTranslationCache(originalText, translatedText, sourceLang, targetLang) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.TRANSLATIONS);
  const lastRow = sheet.getLastRow();
  const translationId = `TRN-${String(lastRow).padStart(4, '0')}`;

  sheet.appendRow([
    translationId,
    originalText,
    translatedText,
    sourceLang,
    targetLang,
    new Date()
  ]);
}

/**
 * 感情分析を実行
 */
function analyzeSentiment(text) {
  const prompt = `以下のテキストの感情を分析してください。
結果は以下のJSON形式で出力してください:
{
  "sentiment": "VERY_POSITIVE" または "POSITIVE" または "NEUTRAL" または "NEGATIVE" または "VERY_NEGATIVE",
  "score": 0から1の数値（1が最もポジティブ）,
  "keywords": ["キーワード1", "キーワード2"],
  "summary": "感情の要約（20文字以内）"
}

テキスト: ${text}`;

  const result = callGeminiAPI(prompt);

  if (result.success) {
    try {
      // JSONを抽出
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          success: true,
          sentiment: parsed.sentiment,
          score: parsed.score,
          keywords: parsed.keywords,
          summary: parsed.summary
        };
      }
    } catch (e) {
      // パース失敗時はデフォルト値
    }
  }

  return {
    success: true,
    sentiment: 'NEUTRAL',
    score: 0.5,
    keywords: [],
    summary: '分析不可'
  };
}

/**
 * 会話を要約
 */
function summarizeConversation(customerId) {
  const logs = getConversationLogs(customerId, 20);

  if (logs.length === 0) {
    return { success: false, error: '会話ログがありません' };
  }

  const conversationText = logs.map(log => {
    const type = log.messageType === '送信' ? '担当者' : '顧客';
    return `${type}: ${log.translatedMessage || log.originalMessage}`;
  }).join('\n');

  const prompt = `以下の営業会話を要約してください。
要点を3-5個の箇条書きでまとめてください。

会話:
${conversationText}`;

  const result = callGeminiAPI(prompt);

  if (result.success) {
    return { success: true, summary: result.text };
  }

  return { success: false, error: result.error };
}

// ===== 設定管理 =====

/**
 * 設定値を取得
 */
function getSetting(key) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.SETTINGS);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) {
      return data[i][1];
    }
  }
  return null;
}

/**
 * 設定値を更新
 */
function setSetting(key, value) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.SETTINGS);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      return { success: true };
    }
  }

  // 新規設定として追加
  sheet.appendRow([key, value]);
  return { success: true };
}

// ===== ダッシュボード =====

/**
 * ダッシュボード統計を取得
 */
function getDashboardStats() {
  const ss = getSpreadsheet();
  const logsSheet = ss.getSheetByName(SHEET_NAMES.LOGS);
  const customersSheet = ss.getSheetByName(SHEET_NAMES.CUSTOMERS);

  const logs = logsSheet.getDataRange().getValues();
  const customers = customersSheet.getDataRange().getValues();

  const stats = {
    totalLogs: logs.length - 1,
    totalCustomers: customers.length - 1,
    sentimentBreakdown: {
      VERY_POSITIVE: 0,
      POSITIVE: 0,
      NEUTRAL: 0,
      NEGATIVE: 0,
      VERY_NEGATIVE: 0
    },
    channelBreakdown: {},
    todayLogs: 0,
    weekLogs: 0
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  for (let i = 1; i < logs.length; i++) {
    const sentiment = logs[i][10];
    if (sentiment in stats.sentimentBreakdown) {
      stats.sentimentBreakdown[sentiment]++;
    }

    const channel = logs[i][5] || 'その他';
    stats.channelBreakdown[channel] = (stats.channelBreakdown[channel] || 0) + 1;

    const logDate = new Date(logs[i][12]);
    if (logDate >= today) {
      stats.todayLogs++;
    }
    if (logDate >= weekAgo) {
      stats.weekLogs++;
    }
  }

  return stats;
}

/**
 * 顧客一覧を取得
 */
function getCustomersList() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.CUSTOMERS);
  const data = sheet.getDataRange().getValues();
  const customers = [];

  for (let i = 1; i < data.length; i++) {
    customers.push({
      customerId: data[i][0],
      customerName: data[i][1],
      leadId: data[i][2],
      email: data[i][3],
      lastConversation: data[i][4],
      conversationCount: data[i][5]
    });
  }

  return customers.sort((a, b) => {
    return new Date(b.lastConversation) - new Date(a.lastConversation);
  });
}

/**
 * 感情ラベル情報を取得
 */
function getSentimentLabels() {
  return SENTIMENT_LABELS;
}

// ===== セットアップ関数 =====

/**
 * 会話ログDB用スプレッドシートを作成してセットアップ
 */
function setupConversationLogSystem() {
  const props = PropertiesService.getScriptProperties();
  const existingId = props.getProperty('SPREADSHEET_ID');

  // 既にセットアップ済みならスキップ
  if (existingId) {
    Logger.log('===========================================');
    Logger.log('既にセットアップ済みです。');
    Logger.log('SPREADSHEET_ID: ' + existingId);
    Logger.log('');
    Logger.log('再セットアップが必要な場合は、先にスクリプトプロパティの');
    Logger.log('SPREADSHEET_IDを削除してから再実行してください。');
    Logger.log('===========================================');
    return { success: false, message: '既にセットアップ済みです', spreadsheetId: existingId };
  }

  const ss = SpreadsheetApp.create('会話ログDB');
  const spreadsheetId = ss.getId();

  // スクリプトプロパティに自動保存
  props.setProperty('SPREADSHEET_ID', spreadsheetId);

  Logger.log('===========================================');
  Logger.log('スプレッドシートが作成されました！');
  Logger.log('スプレッドシートID: ' + spreadsheetId);
  Logger.log('URL: ' + ss.getUrl());
  Logger.log('スクリプトプロパティに自動保存しました');
  Logger.log('');
  Logger.log('次のステップ: GEMINI_API_KEYを設定してください');
  Logger.log('setInitialConfig({geminiApiKey: "your-api-key"})');
  Logger.log('===========================================');

  const defaultSheet = ss.getSheetByName('シート1');

  // LockService使用（TROUBLE-018対応）- 全シート作成を1つのロックで囲む
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);

    // 会話ログ
    const logsSheet = ss.insertSheet(SHEET_NAMES.LOGS);
    logsSheet.getRange(1, 1, 1, 14).setValues([[
      'ログID', '顧客ID', '顧客名', '担当者ID', '担当者名', 'チャネル',
      'メッセージタイプ', '元メッセージ', '翻訳済み', '言語', '感情',
      '感情スコア', 'タイムスタンプ', 'メモ'
    ]]);
    logsSheet.setFrozenRows(1);
    logsSheet.getRange(1, 1, 1, 14).setBackground('#4285f4').setFontColor('white').setFontWeight('bold');

    // 翻訳キャッシュ
    const translationsSheet = ss.insertSheet(SHEET_NAMES.TRANSLATIONS);
    translationsSheet.getRange(1, 1, 1, 6).setValues([[
      '翻訳ID', '元テキスト', '翻訳テキスト', 'ソース言語', 'ターゲット言語', '作成日時'
    ]]);
    translationsSheet.setFrozenRows(1);
    translationsSheet.getRange(1, 1, 1, 6).setBackground('#34a853').setFontColor('white').setFontWeight('bold');

    // 感情分析
    const sentimentsSheet = ss.insertSheet(SHEET_NAMES.SENTIMENTS);
    sentimentsSheet.getRange(1, 1, 1, 8).setValues([[
      '分析ID', 'ログID', 'テキスト', '感情ラベル', '感情スコア',
      'キーワード', '要約', '分析日時'
    ]]);
    sentimentsSheet.setFrozenRows(1);
    sentimentsSheet.getRange(1, 1, 1, 8).setBackground('#fbbc04').setFontColor('white').setFontWeight('bold');

    // 顧客リンク
    const customersSheet = ss.insertSheet(SHEET_NAMES.CUSTOMERS);
    customersSheet.getRange(1, 1, 1, 6).setValues([[
      '顧客ID', '顧客名', 'リードID', 'メール', '最終会話日', '会話件数'
    ]]);
    customersSheet.setFrozenRows(1);
    customersSheet.getRange(1, 1, 1, 6).setBackground('#ea4335').setFontColor('white').setFontWeight('bold');

    // 設定
    const settingsSheet = ss.insertSheet(SHEET_NAMES.SETTINGS);
    settingsSheet.getRange(1, 1, 4, 2).setValues([
      ['設定項目', '値'],
      ['Gemini API Key', ''],
      ['デフォルト翻訳言語', 'ja'],
      ['感情分析を有効化', 'true']
    ]);
    settingsSheet.setFrozenRows(1);
    settingsSheet.getRange(1, 1, 1, 2).setBackground('#607d8b').setFontColor('white').setFontWeight('bold');

    if (defaultSheet) {
      ss.deleteSheet(defaultSheet);
    }
  } finally {
    lock.releaseLock();
  }

  return {
    success: true,
    spreadsheetId: spreadsheetId,
    url: ss.getUrl()
  };
}
