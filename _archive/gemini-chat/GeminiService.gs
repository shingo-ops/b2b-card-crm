/**
 * Gemini API連携サービス
 */

// ===== Gemini API設定 =====
const GEMINI_MODEL = 'gemini-1.5-flash';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/' + GEMINI_MODEL + ':generateContent';

/**
 * Gemini APIを呼び出す
 */
function callGeminiAPI(userMessage, conversationHistory) {
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    return 'APIキーが設定されていません。管理者に連絡してください。';
  }

  const systemPrompt = getSystemPrompt();

  // 会話履歴を構築
  const contents = buildContents(systemPrompt, conversationHistory, userMessage);

  const payload = {
    contents: contents,
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1024,
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
    ]
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(GEMINI_API_URL + '?key=' + apiKey, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    if (responseCode !== 200) {
      Logger.log('Gemini API Error: ' + responseCode + ' - ' + responseText);
      return 'すみません、一時的にエラーが発生しました。もう一度お試しください。';
    }

    const result = JSON.parse(responseText);

    if (result.candidates && result.candidates.length > 0) {
      const candidate = result.candidates[0];
      if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
        return candidate.content.parts[0].text;
      }
    }

    return 'すみません、応答を生成できませんでした。';

  } catch (error) {
    Logger.log('Gemini API Exception: ' + error.message);
    return 'すみません、エラーが発生しました。もう一度お試しください。';
  }
}

/**
 * APIキー取得
 */
function getGeminiApiKey() {
  // スクリプトプロパティから取得
  const props = PropertiesService.getScriptProperties();
  return props.getProperty('GEMINI_API_KEY');
}

/**
 * システムプロンプト取得
 */
function getSystemPrompt() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const configSheet = ss.getSheetByName(SHEET_NAMES.CONFIG);
    const data = configSheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === 'SYSTEM_PROMPT') {
        return data[i][1];
      }
    }
  } catch (e) {
    Logger.log('Error getting system prompt: ' + e.message);
  }

  return getDefaultSystemPrompt();
}

/**
 * 会話内容を構築
 */
function buildContents(systemPrompt, history, userMessage) {
  const contents = [];

  // システムプロンプトをユーザーの最初のメッセージとして追加
  // （Gemini APIはsystem roleがないため）
  contents.push({
    role: 'user',
    parts: [{ text: 'あなたへの指示:\n' + systemPrompt + '\n\n以上の指示に従って会話してください。' }]
  });
  contents.push({
    role: 'model',
    parts: [{ text: '承知しました。上記の指示に従って、壁打ち相手として対話します。' }]
  });

  // 会話履歴を追加
  for (const msg of history) {
    contents.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    });
  }

  // 今回のユーザーメッセージ
  contents.push({
    role: 'user',
    parts: [{ text: userMessage }]
  });

  return contents;
}

/**
 * 会話履歴を取得
 */
function getConversationHistory(sessionId) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const logSheet = ss.getSheetByName(SHEET_NAMES.LOGS);
  const data = logSheet.getDataRange().getValues();

  const history = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === sessionId) {
      history.push({
        role: data[i][2],        // 'user' or 'assistant'
        content: data[i][3],     // メッセージ
        timestamp: data[i][4]    // タイムスタンプ
      });
    }
  }

  // 直近20ターンに制限（コンテキスト長対策）
  return history.slice(-20);
}
