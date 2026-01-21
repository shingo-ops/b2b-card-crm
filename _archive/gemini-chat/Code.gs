/**
 * Gemini壁打ちアプリ - メインコード
 *
 * 目的: 人間心理学習のための壁打ちシステム
 * 環境: 提案環境（PROP）
 */

// ===== 定数 =====
const SPREADSHEET_ID = '1NiPn-MaxbFDUUu8JvT7meY_64whgWDNXstAR-mVsY2M';
const SHEET_NAMES = {
  LOGS: '会話ログ',
  SESSIONS: 'セッション管理',
  CONFIG: '設定'
};

// ===== Webアプリエントリーポイント =====

/**
 * GETリクエスト処理（ページ表示）
 */
function doGet(e) {
  const template = HtmlService.createTemplateFromFile('index');
  return template.evaluate()
    .setTitle('Gemini壁打ち')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * POSTリクエスト処理（API）
 */
function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const action = params.action;

    switch (action) {
      case 'sendMessage':
        return jsonResponse(handleSendMessage(params));
      case 'startSession':
        return jsonResponse(handleStartSession(params));
      case 'endSession':
        return jsonResponse(handleEndSession(params));
      default:
        return jsonResponse({ error: 'Unknown action' });
    }
  } catch (error) {
    return jsonResponse({ error: error.message });
  }
}

/**
 * JSON形式でレスポンスを返す
 */
function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===== セッション管理 =====

/**
 * 新規セッション開始
 */
function handleStartSession(params) {
  const sessionId = generateSessionId();
  const userId = params.userId || generateUserId();
  const timestamp = new Date().toISOString();

  // セッション管理シートに記録
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sessionSheet = ss.getSheetByName(SHEET_NAMES.SESSIONS);

  sessionSheet.appendRow([
    sessionId,
    userId,
    timestamp,
    '',  // 終了時刻
    'active',
    0    // メッセージ数
  ]);

  return {
    success: true,
    sessionId: sessionId,
    userId: userId,
    systemMessage: getWelcomeMessage()
  };
}

/**
 * セッション終了
 */
function handleEndSession(params) {
  const sessionId = params.sessionId;
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sessionSheet = ss.getSheetByName(SHEET_NAMES.SESSIONS);

  // セッションを検索して更新
  const data = sessionSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === sessionId) {
      sessionSheet.getRange(i + 1, 4).setValue(new Date().toISOString()); // 終了時刻
      sessionSheet.getRange(i + 1, 5).setValue('completed'); // ステータス
      break;
    }
  }

  return { success: true };
}

// ===== メッセージ処理 =====

/**
 * メッセージ送信処理
 */
function handleSendMessage(params) {
  const sessionId = params.sessionId;
  const userId = params.userId;
  const userMessage = params.message;
  const messageTimestamp = new Date();

  // 危機介入チェック
  const crisisCheck = checkCrisisKeywords(userMessage);
  if (crisisCheck.detected) {
    // ユーザーメッセージをログに保存
    saveLog(sessionId, userId, 'user', userMessage, messageTimestamp, 0, crisisCheck.tag);

    // 危機介入メッセージを返す
    const crisisResponse = getCrisisInterventionMessage();
    saveLog(sessionId, userId, 'assistant', crisisResponse, new Date(), 0, 'crisis_intervention');

    return {
      success: true,
      response: crisisResponse,
      isCrisis: true
    };
  }

  // 会話履歴を取得
  const history = getConversationHistory(sessionId);

  // Gemini APIに送信
  const startTime = Date.now();
  const geminiResponse = callGeminiAPI(userMessage, history);
  const responseTime = Date.now() - startTime;

  // 感情タグを推定（簡易版）
  const emotionTag = estimateEmotion(userMessage);

  // ログ保存
  saveLog(sessionId, userId, 'user', userMessage, messageTimestamp, 0, emotionTag);
  saveLog(sessionId, userId, 'assistant', geminiResponse, new Date(), responseTime, 'response');

  // セッションのメッセージ数を更新
  updateSessionMessageCount(sessionId);

  return {
    success: true,
    response: geminiResponse,
    isCrisis: false
  };
}

// ===== ユーティリティ =====

/**
 * セッションID生成
 */
function generateSessionId() {
  return 'sess_' + Utilities.getUuid().replace(/-/g, '').substring(0, 16);
}

/**
 * ユーザーID生成（匿名化）
 */
function generateUserId() {
  return 'user_' + Utilities.getUuid().replace(/-/g, '').substring(0, 8);
}

/**
 * ウェルカムメッセージ
 */
function getWelcomeMessage() {
  return `こんにちは！

私はあなたの「壁打ち相手」です。
考えを整理したいこと、悩んでいること、何でも話してください。

一緒に考えていきましょう。`;
}

/**
 * メッセージ数更新
 */
function updateSessionMessageCount(sessionId) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sessionSheet = ss.getSheetByName(SHEET_NAMES.SESSIONS);
  const logSheet = ss.getSheetByName(SHEET_NAMES.LOGS);

  // ログからメッセージ数をカウント
  const logs = logSheet.getDataRange().getValues();
  let count = 0;
  for (let i = 1; i < logs.length; i++) {
    if (logs[i][0] === sessionId && logs[i][2] === 'user') {
      count++;
    }
  }

  // セッションシートを更新
  const sessions = sessionSheet.getDataRange().getValues();
  for (let i = 1; i < sessions.length; i++) {
    if (sessions[i][0] === sessionId) {
      sessionSheet.getRange(i + 1, 6).setValue(count);
      break;
    }
  }
}

// ===== 初期設定 =====

/**
 * スプレッドシート初期化（初回のみ実行）
 */
function initializeSpreadsheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // LockService使用（TROUBLE-018対応）
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);

    // 会話ログシート
    let logSheet = ss.getSheetByName(SHEET_NAMES.LOGS);
    if (!logSheet) {
      logSheet = ss.insertSheet(SHEET_NAMES.LOGS);
      logSheet.appendRow(['セッションID', 'ユーザーID', '役割', 'メッセージ', 'タイムスタンプ', '返答時間(ms)', '感情タグ']);
      logSheet.getRange(1, 1, 1, 7).setFontWeight('bold');
    }

    // セッション管理シート
    let sessionSheet = ss.getSheetByName(SHEET_NAMES.SESSIONS);
    if (!sessionSheet) {
      sessionSheet = ss.insertSheet(SHEET_NAMES.SESSIONS);
      sessionSheet.appendRow(['セッションID', 'ユーザーID', '開始時刻', '終了時刻', 'ステータス', 'メッセージ数']);
      sessionSheet.getRange(1, 1, 1, 6).setFontWeight('bold');
    }

    // 設定シート
    let configSheet = ss.getSheetByName(SHEET_NAMES.CONFIG);
    if (!configSheet) {
      configSheet = ss.insertSheet(SHEET_NAMES.CONFIG);
      configSheet.appendRow(['キー', '値', '説明']);
      configSheet.appendRow(['SYSTEM_PROMPT', getDefaultSystemPrompt(), 'Geminiに与えるシステムプロンプト']);
      configSheet.appendRow(['CRISIS_KEYWORDS', '死にたい,消えたい,限界,もう無理,生きてる意味', '危機介入キーワード（カンマ区切り）']);
      configSheet.getRange(1, 1, 1, 3).setFontWeight('bold');
    }

    // デフォルトのシートを削除
    const defaultSheet = ss.getSheetByName('シート1');
    if (defaultSheet) {
      ss.deleteSheet(defaultSheet);
    }
  } finally {
    lock.releaseLock();
  }

  Logger.log('スプレッドシート初期化完了');
}

/**
 * デフォルトのシステムプロンプト
 */
function getDefaultSystemPrompt() {
  return `あなたは「壁打ち相手」として、相手の考えを引き出し、整理する手助けをします。

【基本姿勢】
- 相手の話をまず受け止める
- 質問で考えを深める
- 時に違う視点も提示する
- 押し付けず、一緒に考える

【禁止事項】
- 過度な同調（全肯定は避ける）
- 安易な解決策の提示
- 相手を否定する言葉

【返答スタイル】
- 簡潔に（長すぎない）
- 温かみのある言葉遣い
- 必要に応じて質問を投げかける`;
}

/**
 * HTMLファイルを読み込む（テンプレート用）
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
