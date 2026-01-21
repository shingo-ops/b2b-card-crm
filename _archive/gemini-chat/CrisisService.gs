/**
 * 危機介入サービス
 *
 * 深刻な悩みを検知した場合、専門家への相談を案内する
 */

// ===== 危機介入キーワード =====
const DEFAULT_CRISIS_KEYWORDS = [
  '死にたい',
  '死にたくなる',
  '消えたい',
  '消えてしまいたい',
  '限界',
  'もう無理',
  '生きてる意味',
  '生きている意味',
  '誰もわかってくれない',
  '自殺',
  '自傷',
  'リストカット'
];

/**
 * 危機キーワードをチェック
 */
function checkCrisisKeywords(message) {
  const keywords = getCrisisKeywords();

  for (const keyword of keywords) {
    if (message.includes(keyword)) {
      return {
        detected: true,
        keyword: keyword,
        tag: 'crisis_' + keyword.replace(/\s/g, '_')
      };
    }
  }

  return {
    detected: false,
    keyword: null,
    tag: null
  };
}

/**
 * 危機キーワード一覧を取得
 */
function getCrisisKeywords() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const configSheet = ss.getSheetByName(SHEET_NAMES.CONFIG);
    const data = configSheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === 'CRISIS_KEYWORDS') {
        return data[i][1].split(',').map(k => k.trim());
      }
    }
  } catch (e) {
    Logger.log('Error getting crisis keywords: ' + e.message);
  }

  return DEFAULT_CRISIS_KEYWORDS;
}

/**
 * 危機介入メッセージを取得
 */
function getCrisisInterventionMessage() {
  return `つらい気持ちを話してくれてありがとうございます。
あなたの気持ちは大切です。

私はAIなので、深刻なお悩みには十分なサポートができません。
専門の相談窓口に話を聞いてもらうことをお勧めします。

【相談窓口】
よりそいホットライン: 0120-279-338（24時間）
いのちの電話: 0120-783-556
こころの健康相談統一ダイヤル: 0570-064-556

今すぐ話したいときは、上記に電話してみてください。
あなたは一人じゃありません。`;
}

/**
 * 感情タグを推定（簡易版）
 */
function estimateEmotion(message) {
  // ポジティブキーワード
  const positiveKeywords = ['嬉しい', 'ありがとう', '楽しい', '良かった', 'できた', '成功'];
  for (const keyword of positiveKeywords) {
    if (message.includes(keyword)) {
      return 'positive';
    }
  }

  // ネガティブキーワード
  const negativeKeywords = ['辛い', 'つらい', '悲しい', '不安', '心配', '困った', '失敗'];
  for (const keyword of negativeKeywords) {
    if (message.includes(keyword)) {
      return 'negative';
    }
  }

  // 質問キーワード
  const questionKeywords = ['？', '?', 'どう', 'なぜ', 'どうして'];
  for (const keyword of questionKeywords) {
    if (message.includes(keyword)) {
      return 'question';
    }
  }

  return 'neutral';
}
