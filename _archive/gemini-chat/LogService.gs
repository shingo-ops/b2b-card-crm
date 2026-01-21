/**
 * ログ保存サービス
 *
 * 会話ログをスプレッドシートに保存する
 */

/**
 * ログを保存
 */
function saveLog(sessionId, userId, role, message, timestamp, responseTime, emotionTag) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const logSheet = ss.getSheetByName(SHEET_NAMES.LOGS);

  const formattedTimestamp = Utilities.formatDate(
    timestamp instanceof Date ? timestamp : new Date(timestamp),
    'Asia/Tokyo',
    'yyyy-MM-dd HH:mm:ss'
  );

  logSheet.appendRow([
    sessionId,
    userId,
    role,
    message,
    formattedTimestamp,
    responseTime,
    emotionTag || 'neutral'
  ]);
}

/**
 * セッションのログを取得
 */
function getSessionLogs(sessionId) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const logSheet = ss.getSheetByName(SHEET_NAMES.LOGS);
  const data = logSheet.getDataRange().getValues();

  const logs = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === sessionId) {
      logs.push({
        sessionId: data[i][0],
        userId: data[i][1],
        role: data[i][2],
        message: data[i][3],
        timestamp: data[i][4],
        responseTime: data[i][5],
        emotionTag: data[i][6]
      });
    }
  }

  return logs;
}

/**
 * 分析用: 全ログ取得
 */
function getAllLogs() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const logSheet = ss.getSheetByName(SHEET_NAMES.LOGS);
  const data = logSheet.getDataRange().getValues();

  const logs = [];
  for (let i = 1; i < data.length; i++) {
    logs.push({
      sessionId: data[i][0],
      userId: data[i][1],
      role: data[i][2],
      message: data[i][3],
      timestamp: data[i][4],
      responseTime: data[i][5],
      emotionTag: data[i][6]
    });
  }

  return logs;
}

/**
 * 分析用: セッション統計
 */
function getSessionStats() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sessionSheet = ss.getSheetByName(SHEET_NAMES.SESSIONS);
  const data = sessionSheet.getDataRange().getValues();

  let totalSessions = 0;
  let activeSessions = 0;
  let totalMessages = 0;

  for (let i = 1; i < data.length; i++) {
    totalSessions++;
    if (data[i][4] === 'active') {
      activeSessions++;
    }
    totalMessages += data[i][5] || 0;
  }

  return {
    totalSessions: totalSessions,
    activeSessions: activeSessions,
    completedSessions: totalSessions - activeSessions,
    totalMessages: totalMessages,
    avgMessagesPerSession: totalSessions > 0 ? (totalMessages / totalSessions).toFixed(1) : 0
  };
}

/**
 * 分析用: 感情タグ集計
 */
function getEmotionStats() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const logSheet = ss.getSheetByName(SHEET_NAMES.LOGS);
  const data = logSheet.getDataRange().getValues();

  const stats = {
    positive: 0,
    negative: 0,
    neutral: 0,
    question: 0,
    crisis: 0
  };

  for (let i = 1; i < data.length; i++) {
    if (data[i][2] === 'user') {  // ユーザーのメッセージのみ
      const tag = data[i][6] || 'neutral';
      if (tag.startsWith('crisis')) {
        stats.crisis++;
      } else if (stats[tag] !== undefined) {
        stats[tag]++;
      } else {
        stats.neutral++;
      }
    }
  }

  return stats;
}
