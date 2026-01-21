/**
 * 営業教育アプリ - Code.gs
 * B2Bカード決済営業向け スキルアップ・振り返りシステム
 */

// ===== 設定管理 =====

/**
 * スクリプトプロパティから設定を取得
 */
function getConfig() {
  const props = PropertiesService.getScriptProperties();
  return {
    spreadsheetId: props.getProperty('SPREADSHEET_ID') || '',
    crmSpreadsheetId: props.getProperty('CRM_SPREADSHEET_ID') || '',
    quizPassingScore: parseInt(props.getProperty('QUIZ_PASSING_SCORE') || '70'),
    weeklyReflectionDeadline: props.getProperty('WEEKLY_REFLECTION_DEADLINE') || '金'
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
  if (config && config.crmSpreadsheetId) {
    props.setProperty('CRM_SPREADSHEET_ID', config.crmSpreadsheetId);
  }
  if (config && config.quizPassingScore) {
    props.setProperty('QUIZ_PASSING_SCORE', String(config.quizPassingScore));
  }
  if (config && config.weeklyReflectionDeadline) {
    props.setProperty('WEEKLY_REFLECTION_DEADLINE', config.weeklyReflectionDeadline);
  }

  Logger.log('設定を保存しました');
  Logger.log('SPREADSHEET_ID: ' + props.getProperty('SPREADSHEET_ID'));
  Logger.log('CRM_SPREADSHEET_ID: ' + props.getProperty('CRM_SPREADSHEET_ID'));

  return { success: true, message: '設定を保存しました' };
}

/**
 * 現在の設定を確認（デバッグ用）
 */
function checkConfig() {
  const config = getConfig();
  Logger.log('現在の設定:');
  Logger.log('SPREADSHEET_ID: ' + config.spreadsheetId);
  Logger.log('CRM_SPREADSHEET_ID: ' + config.crmSpreadsheetId);
  Logger.log('QUIZ_PASSING_SCORE: ' + config.quizPassingScore);
  Logger.log('WEEKLY_REFLECTION_DEADLINE: ' + config.weeklyReflectionDeadline);
  return config;
}

/**
 * スプレッドシートを取得（エラーハンドリング付き）
 */
function getSpreadsheet() {
  const config = getConfig();
  if (!config.spreadsheetId) {
    throw new Error('スプレッドシートが設定されていません。setupTrainingSystem()を実行してください。');
  }
  return SpreadsheetApp.openById(config.spreadsheetId);
}

// ===== 定数定義 =====
const SHEET_NAMES = {
  EMPLOYEES: '営業担当者マスタ',
  REFLECTIONS: '振り返りサマリー',
  TRAININGS: '研修記録',
  QUIZZES: 'クイズ問題',
  QUIZ_RESULTS: 'クイズ結果',
  TIPS: '営業Tips',
  SETTINGS: '設定'
};

// スキルカテゴリ
const SKILL_CATEGORIES = {
  'ヒアリング': { color: '#3b82f6', icon: '👂' },
  '提案力': { color: '#10b981', icon: '💡' },
  'クロージング': { color: '#f59e0b', icon: '🎯' },
  '交渉力': { color: '#8b5cf6', icon: '🤝' },
  '製品知識': { color: '#ef4444', icon: '📚' },
  'コミュニケーション': { color: '#06b6d4', icon: '💬' }
};

// ===== Web アプリケーション =====

function doGet(e) {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('営業教育アプリ')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ===== スプレッドシート初期化 =====

function initializeSpreadsheet() {
  const ss = getSpreadsheet();
  const existingSheets = ss.getSheets().map(s => s.getName());

  // 振り返りサマリー
  if (!existingSheets.includes(SHEET_NAMES.REFLECTIONS)) {
    // LockService使用（TROUBLE-018対応）
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(30000);
      if (!ss.getSheetByName(SHEET_NAMES.REFLECTIONS)) {
        const sheet = ss.insertSheet(SHEET_NAMES.REFLECTIONS);
        sheet.getRange(1, 1, 1, 9).setValues([[
          'サマリーID', '担当者ID', '週', '直近の気づき', '継続している課題',
          'モチベーション', '来週のアクション', '上長コメント', '作成日時'
        ]]);
        sheet.setFrozenRows(1);
        sheet.getRange(1, 1, 1, 9).setBackground('#4285f4').setFontColor('white').setFontWeight('bold');
      }
    } finally {
      lock.releaseLock();
    }
  }

  // 研修記録
  if (!existingSheets.includes(SHEET_NAMES.TRAININGS)) {
    // LockService使用（TROUBLE-018対応）
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(30000);
      if (!ss.getSheetByName(SHEET_NAMES.TRAININGS)) {
        const sheet = ss.insertSheet(SHEET_NAMES.TRAININGS);
        sheet.getRange(1, 1, 1, 8).setValues([[
          '研修ID', '担当者ID', '研修名', 'カテゴリ', '完了日',
          'スコア', 'ステータス', '作成日時'
        ]]);
        sheet.setFrozenRows(1);
        sheet.getRange(1, 1, 1, 8).setBackground('#34a853').setFontColor('white').setFontWeight('bold');
      }
    } finally {
      lock.releaseLock();
    }
  }

  // クイズ問題
  if (!existingSheets.includes(SHEET_NAMES.QUIZZES)) {
    // LockService使用（TROUBLE-018対応）
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(30000);
      if (!ss.getSheetByName(SHEET_NAMES.QUIZZES)) {
        const sheet = ss.insertSheet(SHEET_NAMES.QUIZZES);
        sheet.getRange(1, 1, 1, 8).setValues([[
          'クイズID', 'カテゴリ', '難易度', '問題文', '選択肢1', '選択肢2', '選択肢3', '正解'
        ]]);
        sheet.setFrozenRows(1);
        sheet.getRange(1, 1, 1, 8).setBackground('#fbbc04').setFontColor('white').setFontWeight('bold');

        // サンプルクイズ
        const quizzes = [
          ['QZ-001', 'ヒアリング', '初級', '顧客のニーズを引き出す際に最も重要なことは？', 'すぐに提案する', '相手の話をよく聞く', '商品説明を詳しくする', '2'],
          ['QZ-002', '提案力', '初級', '提案書で最初に記載すべき内容は？', '価格', '顧客の課題', '自社の強み', '2'],
          ['QZ-003', 'クロージング', '中級', 'クロージングのタイミングとして適切なのは？', '商談開始直後', '顧客が前向きなサインを出した時', '価格提示直後', '2'],
          ['QZ-004', '製品知識', '初級', 'カード決済の主なメリットは？', '現金管理の手間削減', 'コスト増加', '処理時間の増加', '1'],
          ['QZ-005', '交渉力', '中級', '価格交渉で避けるべき行動は？', '代替案の提示', '即座の値引き', '付加価値の説明', '2']
        ];
        quizzes.forEach(q => sheet.appendRow(q));
      }
    } finally {
      lock.releaseLock();
    }
  }

  // クイズ結果
  if (!existingSheets.includes(SHEET_NAMES.QUIZ_RESULTS)) {
    // LockService使用（TROUBLE-018対応）
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(30000);
      if (!ss.getSheetByName(SHEET_NAMES.QUIZ_RESULTS)) {
        const sheet = ss.insertSheet(SHEET_NAMES.QUIZ_RESULTS);
        sheet.getRange(1, 1, 1, 7).setValues([[
          '結果ID', '担当者ID', 'クイズID', '回答', '正誤', 'スコア', '回答日時'
        ]]);
        sheet.setFrozenRows(1);
        sheet.getRange(1, 1, 1, 7).setBackground('#ea4335').setFontColor('white').setFontWeight('bold');
      }
    } finally {
      lock.releaseLock();
    }
  }

  // 営業Tips
  if (!existingSheets.includes(SHEET_NAMES.TIPS)) {
    // LockService使用（TROUBLE-018対応）
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(30000);
      if (!ss.getSheetByName(SHEET_NAMES.TIPS)) {
        const sheet = ss.insertSheet(SHEET_NAMES.TIPS);
        sheet.getRange(1, 1, 1, 5).setValues([[
          'TipID', 'カテゴリ', 'タイトル', '内容', '作成日時'
        ]]);
        sheet.setFrozenRows(1);
        sheet.getRange(1, 1, 1, 5).setBackground('#9c27b0').setFontColor('white').setFontWeight('bold');

        // サンプルTips
        const tips = [
          ['TIP-001', 'ヒアリング', '沈黙を恐れない', '顧客が考えている時の沈黙は価値ある時間です。焦って話を遮らないようにしましょう。', new Date()],
          ['TIP-002', '提案力', '数字で語る', '「とても良い」より「30%改善」の方が説得力があります。具体的な数字を使いましょう。', new Date()],
          ['TIP-003', 'クロージング', '小さなYesを積み重ねる', '大きな決断の前に、小さな同意を得ることで、最終的な成約率が上がります。', new Date()],
          ['TIP-004', '製品知識', '競合との違いを3つ言える', 'お客様から「他社と何が違うの？」と聞かれた時、即座に3つの違いを説明できるようにしましょう。', new Date()]
        ];
        tips.forEach(t => sheet.appendRow(t));
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
        sheet.getRange(1, 1, 3, 2).setValues([
          ['設定項目', '値'],
          ['週次振り返り締切曜日', '金'],
          ['クイズ合格ライン', '70']
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

// ===== ID生成 =====

function generateSummaryId() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.REFLECTIONS);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return 'SUM-001';
  const lastId = sheet.getRange(lastRow, 1).getValue();
  const num = parseInt(lastId.replace('SUM-', '')) + 1;
  return `SUM-${String(num).padStart(3, '0')}`;
}

function generateTrainingId() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.TRAININGS);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return 'TRN-001';
  const lastId = sheet.getRange(lastRow, 1).getValue();
  const num = parseInt(lastId.replace('TRN-', '')) + 1;
  return `TRN-${String(num).padStart(3, '0')}`;
}

// ===== 担当者情報取得（CRM連携） =====

function getEmployee(empId) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.EMPLOYEES);
  if (!sheet) return null;

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === empId) {
      return {
        id: data[i][0],
        name: data[i][1],
        email: data[i][2],
        phone: data[i][3],
        team: data[i][4],
        position: data[i][5],
        discType: data[i][6],
        skills: data[i][7],
        target: data[i][8],
        actual: data[i][9]
      };
    }
  }
  return null;
}

function getAllEmployees() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.EMPLOYEES);
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  const employees = [];

  for (let i = 1; i < data.length; i++) {
    employees.push({
      id: data[i][0],
      name: data[i][1],
      email: data[i][2],
      team: data[i][4],
      position: data[i][5],
      discType: data[i][6],
      skills: data[i][7],
      target: data[i][8],
      actual: data[i][9]
    });
  }

  return employees;
}

// ===== 振り返り管理 =====

function addReflection(data) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAMES.REFLECTIONS);
    const summaryId = generateSummaryId();
    const now = new Date();

    // 今週の週番号を取得
    const weekNumber = getWeekNumber(now);

    sheet.appendRow([
      summaryId,
      data.employeeId,
      weekNumber,
      data.recentInsights || '',
      data.ongoingChallenges || '',
      data.motivation || 3,
      data.nextActions || '',
      '',
      now
    ]);

    return { success: true, summaryId: summaryId };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function getEmployeeReflections(empId, limit) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.REFLECTIONS);
  const data = sheet.getDataRange().getValues();
  const reflections = [];

  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][1] === empId) {
      reflections.push({
        summaryId: data[i][0],
        employeeId: data[i][1],
        week: data[i][2],
        recentInsights: data[i][3],
        ongoingChallenges: data[i][4],
        motivation: data[i][5],
        nextActions: data[i][6],
        managerComment: data[i][7],
        createdAt: data[i][8]
      });

      if (limit && reflections.length >= limit) break;
    }
  }

  return reflections;
}

function getAllReflections(limit) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.REFLECTIONS);
  const data = sheet.getDataRange().getValues();
  const reflections = [];

  for (let i = data.length - 1; i >= 1; i--) {
    reflections.push({
      summaryId: data[i][0],
      employeeId: data[i][1],
      week: data[i][2],
      recentInsights: data[i][3],
      ongoingChallenges: data[i][4],
      motivation: data[i][5],
      nextActions: data[i][6],
      managerComment: data[i][7],
      createdAt: data[i][8]
    });

    if (limit && reflections.length >= limit) break;
  }

  return reflections;
}

// ===== クイズ管理 =====

function getQuizzes(category) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.QUIZZES);
  const data = sheet.getDataRange().getValues();
  const quizzes = [];

  for (let i = 1; i < data.length; i++) {
    if (!category || data[i][1] === category) {
      quizzes.push({
        quizId: data[i][0],
        category: data[i][1],
        difficulty: data[i][2],
        question: data[i][3],
        options: [data[i][4], data[i][5], data[i][6]],
        correctAnswer: parseInt(data[i][7])
      });
    }
  }

  return quizzes;
}

function submitQuizAnswer(empId, quizId, answer) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAMES.QUIZ_RESULTS);

    // クイズを取得して正誤判定
    const quizzes = getQuizzes();
    const quiz = quizzes.find(q => q.quizId === quizId);
    if (!quiz) return { success: false, error: 'クイズが見つかりません' };

    const isCorrect = answer === quiz.correctAnswer;
    const score = isCorrect ? 10 : 0;

    const resultId = `QR-${Date.now()}`;

    sheet.appendRow([
      resultId,
      empId,
      quizId,
      answer,
      isCorrect ? '正解' : '不正解',
      score,
      new Date()
    ]);

    return {
      success: true,
      isCorrect: isCorrect,
      correctAnswer: quiz.correctAnswer,
      score: score
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function getQuizStats(empId) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.QUIZ_RESULTS);
  const data = sheet.getDataRange().getValues();

  let total = 0;
  let correct = 0;
  let totalScore = 0;
  const categoryStats = {};

  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === empId) {
      total++;
      if (data[i][4] === '正解') correct++;
      totalScore += data[i][5] || 0;

      // カテゴリ別集計（クイズIDからカテゴリを取得する必要がある）
    }
  }

  return {
    totalQuizzes: total,
    correctAnswers: correct,
    accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
    totalScore: totalScore
  };
}

// ===== 営業Tips =====

function getAllTips() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.TIPS);
  const data = sheet.getDataRange().getValues();
  const tips = [];

  for (let i = 1; i < data.length; i++) {
    tips.push({
      tipId: data[i][0],
      category: data[i][1],
      title: data[i][2],
      content: data[i][3],
      createdAt: data[i][4]
    });
  }

  return tips;
}

function getRandomTip() {
  const tips = getAllTips();
  if (tips.length === 0) return null;
  return tips[Math.floor(Math.random() * tips.length)];
}

// ===== ダッシュボード統計 =====

function getTrainingDashboardStats(empId) {
  const employee = getEmployee(empId);
  const reflections = getEmployeeReflections(empId, 5);
  const quizStats = getQuizStats(empId);

  // スキルレベル（仮のロジック）
  const skills = {};
  Object.keys(SKILL_CATEGORIES).forEach(cat => {
    skills[cat] = Math.floor(Math.random() * 40) + 60; // 60-100の仮の値
  });

  return {
    employee: employee,
    reflections: reflections,
    quizStats: quizStats,
    skills: skills,
    achievement: employee ? Math.round((employee.actual / employee.target) * 100) : 0
  };
}

// ===== スキルカテゴリ取得 =====

function getSkillCategories() {
  return SKILL_CATEGORIES;
}

// ===== ユーティリティ =====

function getWeekNumber(date) {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return `${date.getFullYear()}-W${String(Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)).padStart(2, '0')}`;
}

// ===== セットアップ関数 =====

/**
 * 営業教育システム用スプレッドシートを作成してセットアップ
 */
function setupTrainingSystem() {
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

  const ss = SpreadsheetApp.create('営業教育アプリ');
  const spreadsheetId = ss.getId();

  // スクリプトプロパティに自動保存
  props.setProperty('SPREADSHEET_ID', spreadsheetId);

  Logger.log('===========================================');
  Logger.log('スプレッドシートが作成されました！');
  Logger.log('スプレッドシートID: ' + spreadsheetId);
  Logger.log('URL: ' + ss.getUrl());
  Logger.log('スクリプトプロパティに自動保存しました');
  Logger.log('===========================================');

  const defaultSheet = ss.getSheetByName('シート1');
  const now = new Date();

  // LockService使用（TROUBLE-018対応）- 全シート作成を1つのロックで囲む
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);

    // 営業担当者マスタ（CRMと共有用）
    const employeesSheet = ss.insertSheet(SHEET_NAMES.EMPLOYEES);
  employeesSheet.getRange(1, 1, 1, 12).setValues([[
    '担当者ID', '氏名', 'メール', '電話', 'チーム', '役職',
    'DISCタイプ', 'スキル', '目標', '実績', '作成日時', '更新日時'
  ]]);
  employeesSheet.setFrozenRows(1);
  employeesSheet.getRange(1, 1, 1, 12).setBackground('#4285f4').setFontColor('white').setFontWeight('bold');
  // サンプルデータ
  employeesSheet.appendRow(['EMP-001', '山田太郎', 'yamada@example.com', '090-1234-5678', 'チームA', 'リーダー', 'D', 'クロージング,交渉', 100, 85, now, now]);
  employeesSheet.appendRow(['EMP-002', '鈴木花子', 'suzuki@example.com', '090-2345-6789', 'チームA', 'メンバー', 'I', 'ヒアリング,提案', 80, 72, now, now]);

  // 振り返りサマリー
  const reflectionsSheet = ss.insertSheet(SHEET_NAMES.REFLECTIONS);
  reflectionsSheet.getRange(1, 1, 1, 9).setValues([[
    'サマリーID', '担当者ID', '週', '直近の気づき', '継続している課題',
    'モチベーション', '来週のアクション', '上長コメント', '作成日時'
  ]]);
  reflectionsSheet.setFrozenRows(1);
  reflectionsSheet.getRange(1, 1, 1, 9).setBackground('#34a853').setFontColor('white').setFontWeight('bold');

  // 研修記録
  const trainingsSheet = ss.insertSheet(SHEET_NAMES.TRAININGS);
  trainingsSheet.getRange(1, 1, 1, 8).setValues([[
    '研修ID', '担当者ID', '研修名', 'カテゴリ', '完了日',
    'スコア', 'ステータス', '作成日時'
  ]]);
  trainingsSheet.setFrozenRows(1);
  trainingsSheet.getRange(1, 1, 1, 8).setBackground('#fbbc04').setFontColor('white').setFontWeight('bold');

  // クイズ問題
  const quizzesSheet = ss.insertSheet(SHEET_NAMES.QUIZZES);
  quizzesSheet.getRange(1, 1, 1, 8).setValues([[
    'クイズID', 'カテゴリ', '難易度', '問題文', '選択肢1', '選択肢2', '選択肢3', '正解'
  ]]);
  quizzesSheet.setFrozenRows(1);
  quizzesSheet.getRange(1, 1, 1, 8).setBackground('#ea4335').setFontColor('white').setFontWeight('bold');
  // サンプルクイズ
  const quizzes = [
    ['QZ-001', 'ヒアリング', '初級', '顧客のニーズを引き出す際に最も重要なことは？', 'すぐに提案する', '相手の話をよく聞く', '商品説明を詳しくする', '2'],
    ['QZ-002', '提案力', '初級', '提案書で最初に記載すべき内容は？', '価格', '顧客の課題', '自社の強み', '2'],
    ['QZ-003', 'クロージング', '中級', 'クロージングのタイミングとして適切なのは？', '商談開始直後', '顧客が前向きなサインを出した時', '価格提示直後', '2'],
    ['QZ-004', '製品知識', '初級', 'カード決済の主なメリットは？', '現金管理の手間削減', 'コスト増加', '処理時間の増加', '1'],
    ['QZ-005', '交渉力', '中級', '価格交渉で避けるべき行動は？', '代替案の提示', '即座の値引き', '付加価値の説明', '2']
  ];
  quizzes.forEach(q => quizzesSheet.appendRow(q));

  // クイズ結果
  const quizResultsSheet = ss.insertSheet(SHEET_NAMES.QUIZ_RESULTS);
  quizResultsSheet.getRange(1, 1, 1, 7).setValues([[
    '結果ID', '担当者ID', 'クイズID', '回答', '正誤', 'スコア', '回答日時'
  ]]);
  quizResultsSheet.setFrozenRows(1);
  quizResultsSheet.getRange(1, 1, 1, 7).setBackground('#9c27b0').setFontColor('white').setFontWeight('bold');

  // 営業Tips
  const tipsSheet = ss.insertSheet(SHEET_NAMES.TIPS);
  tipsSheet.getRange(1, 1, 1, 5).setValues([[
    'TipID', 'カテゴリ', 'タイトル', '内容', '作成日時'
  ]]);
  tipsSheet.setFrozenRows(1);
  tipsSheet.getRange(1, 1, 1, 5).setBackground('#607d8b').setFontColor('white').setFontWeight('bold');
  // サンプルTips
  const tips = [
    ['TIP-001', 'ヒアリング', '沈黙を恐れない', '顧客が考えている時の沈黙は価値ある時間です。焦って話を遮らないようにしましょう。', now],
    ['TIP-002', '提案力', '数字で語る', '「とても良い」より「30%改善」の方が説得力があります。具体的な数字を使いましょう。', now],
    ['TIP-003', 'クロージング', '小さなYesを積み重ねる', '大きな決断の前に、小さな同意を得ることで、最終的な成約率が上がります。', now],
    ['TIP-004', '製品知識', '競合との違いを3つ言える', 'お客様から「他社と何が違うの？」と聞かれた時、即座に3つの違いを説明できるようにしましょう。', now]
  ];
  tips.forEach(t => tipsSheet.appendRow(t));

  // 設定
  const settingsSheet = ss.insertSheet(SHEET_NAMES.SETTINGS);
  settingsSheet.getRange(1, 1, 3, 2).setValues([
    ['設定項目', '値'],
    ['週次振り返り締切曜日', '金'],
    ['クイズ合格ライン', '70']
  ]);
  settingsSheet.setFrozenRows(1);
  settingsSheet.getRange(1, 1, 1, 2).setBackground('#455a64').setFontColor('white').setFontWeight('bold');

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
