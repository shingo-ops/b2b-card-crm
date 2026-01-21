/**
 * 採用診断アプリ - Code.gs
 * PROJECT_MASTER v4 仕様準拠
 * 面接支援アプリとの連携対応
 */

// ===== 設定管理 =====

function getConfig() {
  const props = PropertiesService.getScriptProperties();
  return {
    spreadsheetId: props.getProperty('SPREADSHEET_ID') || '',
    geminiApiKey: props.getProperty('GEMINI_API_KEY') || '',
    contactEmail: props.getProperty('CONTACT_EMAIL') || 'info@treasureislandjp.com'
  };
}

function setInitialConfig(config) {
  const props = PropertiesService.getScriptProperties();
  if (config && config.spreadsheetId) {
    props.setProperty('SPREADSHEET_ID', config.spreadsheetId);
  }
  if (config && config.geminiApiKey) {
    props.setProperty('GEMINI_API_KEY', config.geminiApiKey);
  }
  if (config && config.contactEmail) {
    props.setProperty('CONTACT_EMAIL', config.contactEmail);
  }
  Logger.log('設定を保存しました');
  return { success: true, message: '設定を保存しました' };
}

function checkConfig() {
  const config = getConfig();
  Logger.log('現在の設定:');
  Logger.log('SPREADSHEET_ID: ' + config.spreadsheetId);
  Logger.log('GEMINI_API_KEY: ' + (config.geminiApiKey ? '****' : '未設定'));
  Logger.log('CONTACT_EMAIL: ' + config.contactEmail);
  return config;
}

function getSpreadsheet() {
  const config = getConfig();
  if (!config.spreadsheetId) {
    throw new Error('スプレッドシートが設定されていません。setupRecruitmentSystem()を実行してください。');
  }
  return SpreadsheetApp.openById(config.spreadsheetId);
}

// ===== 定数定義 =====

const SHEET_NAMES = {
  CANDIDATES: '候補者マスタ',
  RESULTS: '診断結果',
  ANSWERS: '回答詳細',
  INTERVIEWS: '面接シート'
};

const CANDIDATE_STATUS = {
  NOT_STARTED: '未開始',
  IN_PROGRESS: '進行中',
  COMPLETED: '完了',
  INTERRUPTED: '中断'
};

const INTERRUPTION_REASONS = {
  BROWSER_CLOSE: 'ブラウザ終了',
  PAGE_LEAVE: 'ページ離脱',
  TIMEOUT: 'タイムアウト',
  REACCESS: '再アクセス時中断'
};

// セクション構成
const SECTIONS = [
  { id: 1, name: '行動スタイル', type: 'disc', questionCount: 20, timeLimit: 20, hasPractice: true, practiceCount: 2 },
  { id: 2, name: '性格特性', type: 'bigfive', questionCount: 16, timeLimit: 20, hasPractice: true, practiceCount: 2 },
  { id: 3, name: '自由記述', type: 'freeform', questionCount: 5, timeLimit: 180, hasPractice: false, practiceCount: 0 },
  { id: 4, name: '一貫性チェック', type: 'consistency', questionCount: 3, timeLimit: 20, hasPractice: false, practiceCount: 0 }
];

// ===== セクション1: DISC設問（16問）=====

const DISC_QUESTIONS = [
  {
    id: 1,
    text: '初対面のお客様との商談で、最初にどう接しますか？',
    options: [
      { label: '積極的に主導権を取る', type: 'D' },
      { label: '明るく親しみやすく話しかける', type: 'I' },
      { label: '相手のペースに合わせて丁寧に', type: 'S' },
      { label: '事前準備した情報を正確に伝える', type: 'C' }
    ]
  },
  {
    id: 2,
    text: '長期的な大口顧客との関係構築で重視することは？',
    options: [
      { label: '成果を出し続けて信頼を勝ち取る', type: 'D' },
      { label: '定期的なコミュニケーションで関係維持', type: 'I' },
      { label: '安定したサービス提供で信頼構築', type: 'S' },
      { label: '正確な情報提供と約束の履行', type: 'C' }
    ]
  },
  {
    id: 3,
    text: '競合他社との比較を求められた場合は？',
    options: [
      { label: '自社の強みを強調して勝負する', type: 'D' },
      { label: '顧客のニーズに合わせた提案で差別化', type: 'I' },
      { label: '両社の違いを客観的に説明する', type: 'S' },
      { label: '詳細な比較資料を準備して説明', type: 'C' }
    ]
  },
  {
    id: 4,
    text: 'チームミーティングでの自分の役割は？',
    options: [
      { label: '議論をリードし、結論を導く', type: 'D' },
      { label: '場を盛り上げ、意見を引き出す', type: 'I' },
      { label: '全員の意見を聞き、まとめる', type: 'S' },
      { label: 'データや事実に基づいて発言する', type: 'C' }
    ]
  },
  {
    id: 5,
    text: '同僚が困っている時、どうしますか？',
    options: [
      { label: '具体的な解決策を提案する', type: 'D' },
      { label: '励まして一緒に解決しようとする', type: 'I' },
      { label: 'じっくり話を聞いてサポートする', type: 'S' },
      { label: '状況を整理して論理的にアドバイス', type: 'C' }
    ]
  },
  {
    id: 6,
    text: '複数の案件が同時に進行している時、どう優先順位をつけますか？',
    options: [
      { label: '最も成果が出そうな案件を優先', type: 'D' },
      { label: '関係者との調整がスムーズな案件から', type: 'I' },
      { label: '約束した期限を守れる順序で', type: 'S' },
      { label: 'リスクと影響を分析して決定', type: 'C' }
    ]
  },
  {
    id: 7,
    text: '上司から急な方針変更を告げられた時は？',
    options: [
      { label: 'すぐに新しい方針に沿って行動開始', type: 'D' },
      { label: 'チームメンバーと情報共有して調整', type: 'I' },
      { label: '変更の影響を確認してから対応', type: 'S' },
      { label: '変更の理由と詳細を確認してから動く', type: 'C' }
    ]
  },
  {
    id: 8,
    text: '意見が対立した時の対処法は？',
    options: [
      { label: '自分の意見を論理的に主張する', type: 'D' },
      { label: '話し合いで妥協点を見つける', type: 'I' },
      { label: '相手の意見を尊重して調整する', type: 'S' },
      { label: '客観的な事実に基づいて判断', type: 'C' }
    ]
  },
  {
    id: 9,
    text: '目標達成が難しそうな月末、どう行動しますか？',
    options: [
      { label: '追加のアプローチを積極的に仕掛ける', type: 'D' },
      { label: '周囲に協力を求めてチームで達成を目指す', type: 'I' },
      { label: '着実にできることを一つずつこなす', type: 'S' },
      { label: '現状を分析し、現実的な見込みを報告', type: 'C' }
    ]
  },
  {
    id: 10,
    text: 'フィードバックを受けた時の反応は？',
    options: [
      { label: 'すぐに改善行動に移す', type: 'D' },
      { label: '感謝を伝えて前向きに受け止める', type: 'I' },
      { label: '素直に受け入れて検討する', type: 'S' },
      { label: '具体的な改善点を確認する', type: 'C' }
    ]
  },
  {
    id: 11,
    text: 'ミスを発見した時の対応は？',
    options: [
      { label: 'すぐに修正して先に進む', type: 'D' },
      { label: '関係者に報告して一緒に対処', type: 'I' },
      { label: '影響範囲を確認してから対応', type: 'S' },
      { label: '原因を分析して再発防止策を講じる', type: 'C' }
    ]
  },
  {
    id: 12,
    text: 'お客様から厳しいクレームを受けた時、どう対応しますか？',
    options: [
      { label: '問題解決に向けてすぐに行動する', type: 'D' },
      { label: 'まず共感を示し、感情に寄り添う', type: 'I' },
      { label: '冷静に話を聞き、相手を落ち着かせる', type: 'S' },
      { label: '事実を整理し、原因を分析する', type: 'C' }
    ]
  },
  {
    id: 13,
    text: '自分の強みだと思うことは？',
    options: [
      { label: '決断力と実行力', type: 'D' },
      { label: 'コミュニケーション力と明るさ', type: 'I' },
      { label: '忍耐力と協調性', type: 'S' },
      { label: '分析力と正確性', type: 'C' }
    ]
  },
  {
    id: 14,
    text: 'ストレスを感じる場面は？',
    options: [
      { label: '物事が進まない時', type: 'D' },
      { label: '一人で孤立している時', type: 'I' },
      { label: '急な変化が多い時', type: 'S' },
      { label: '曖昧な指示を受けた時', type: 'C' }
    ]
  },
  {
    id: 15,
    text: 'モチベーションが上がる時は？',
    options: [
      { label: '目標を達成した時', type: 'D' },
      { label: '周囲から認められた時', type: 'I' },
      { label: 'チームに貢献できた時', type: 'S' },
      { label: '完璧な仕事ができた時', type: 'C' }
    ]
  },
  {
    id: 16,
    text: '苦手だと感じることは？',
    options: [
      { label: '細かい作業を長時間続けること', type: 'D' },
      { label: '一人で黙々と作業すること', type: 'I' },
      { label: '変化の多い環境での仕事', type: 'S' },
      { label: '曖昧なまま進めること', type: 'C' }
    ]
  }
];

// DISC練習問題（2問）
const DISC_PRACTICE_QUESTIONS = [
  {
    id: 'P1',
    text: '【練習】休日の過ごし方として最も当てはまるものは？',
    options: [
      { label: '新しい場所を探検する', type: 'D' },
      { label: '友人と楽しく過ごす', type: 'I' },
      { label: '家でゆっくり過ごす', type: 'S' },
      { label: '趣味に没頭する', type: 'C' }
    ]
  },
  {
    id: 'P2',
    text: '【練習】旅行の計画を立てる時、あなたは？',
    options: [
      { label: '行きたい場所を即決する', type: 'D' },
      { label: 'みんなの意見を聞いて決める', type: 'I' },
      { label: '無理のないプランを立てる', type: 'S' },
      { label: '細かく調べてから決める', type: 'C' }
    ]
  }
];

// ===== セクション2: Big Five設問（16問）+ 状況設問（4問）=====

const BIGFIVE_QUESTIONS = [
  // 誠実性（Conscientiousness）4問
  { id: 1, text: '一度始めたことは、困難があっても最後までやり遂げる', trait: 'conscientiousness' },
  { id: 2, text: '締め切りは必ず守る方だ', trait: 'conscientiousness' },
  { id: 3, text: '物事を計画的に進めるのが得意だ', trait: 'conscientiousness' },
  { id: 4, text: '細かいルールでも、決められたことはきちんと守る', trait: 'conscientiousness' },
  // 協調性（Agreeableness）4問
  { id: 5, text: 'チームの意見がまとまるなら、自分の意見を譲ることができる', trait: 'agreeableness' },
  { id: 6, text: '他人の気持ちを考えて行動する方だ', trait: 'agreeableness' },
  { id: 7, text: '人と争うことは避けたいと思う', trait: 'agreeableness' },
  { id: 8, text: '困っている人がいたら、自分から手を差し伸べる', trait: 'agreeableness' },
  // 神経症傾向（Neuroticism）4問 ※逆転項目
  { id: 9, text: '失敗してもすぐに気持ちを切り替えられる', trait: 'neuroticism', reversed: true },
  { id: 10, text: 'プレッシャーがかかる状況でも冷静でいられる', trait: 'neuroticism', reversed: true },
  { id: 11, text: '小さなことでくよくよ悩むことは少ない', trait: 'neuroticism', reversed: true },
  { id: 12, text: '将来のことを考えて不安になることは少ない', trait: 'neuroticism', reversed: true },
  // 開放性（Openness）4問
  { id: 13, text: '新しいやり方やアイデアを試すのが好きだ', trait: 'openness' },
  { id: 14, text: '自分と異なる意見や価値観にも興味を持てる', trait: 'openness' },
  { id: 15, text: '知らないことを学ぶのは楽しい', trait: 'openness' },
  { id: 16, text: '変化の多い環境でも楽しめる方だ', trait: 'openness' }
];

// 状況設問（4問）
const SITUATION_QUESTIONS = [
  {
    id: 17,
    text: 'チームのルールに問題があると感じた時、どうしますか？',
    options: [
      { label: 'すぐに上司やチームに意見を伝える', score: 4 },
      { label: '信頼できる同僚にまず相談する', score: 3 },
      { label: 'しばらく様子を見てから判断する', score: 2 },
      { label: 'ルールに従い、自分の仕事に集中する', score: 1 }
    ]
  },
  {
    id: 18,
    text: '自分のミスに気づいた時、どうしますか？',
    options: [
      { label: 'すぐに報告し、対応策を提案する', score: 4 },
      { label: '上司に報告し、指示を仰ぐ', score: 3 },
      { label: '自分で修正できる範囲で対応する', score: 2 },
      { label: '大きな問題にならなければ様子を見る', score: 1 }
    ]
  },
  {
    id: 19,
    text: 'チームメンバーが明らかに間違った方向に進んでいる時、どうしますか？',
    options: [
      { label: 'その場で指摘して修正を促す', score: 4 },
      { label: '1対1で話す機会を作って伝える', score: 3 },
      { label: 'リーダーに相談して対応を任せる', score: 2 },
      { label: '自分の担当に集中し、深入りしない', score: 1 }
    ]
  },
  {
    id: 20,
    text: '新しい仕事のやり方を提案して却下された時、どうしますか？',
    options: [
      { label: '理由を確認し、改善して再提案する', score: 4 },
      { label: '一度は受け入れ、別の機会を待つ', score: 3 },
      { label: '却下された理由を分析して次に活かす', score: 2 },
      { label: '提案するのをやめて指示に従う', score: 1 }
    ]
  }
];

// Big Five練習問題（2問）
const BIGFIVE_PRACTICE_QUESTIONS = [
  { id: 'P1', text: '【練習】朝早く起きるのは得意だ', trait: 'practice' },
  { id: 'P2', text: '【練習】初対面の人とも気軽に話せる', trait: 'practice' }
];

// ===== セクション3: 自由記述設問（5問）=====

const FREEFORM_QUESTIONS = [
  { id: 1, text: 'これまでで最も困難だった経験を教えてください' },
  { id: 2, text: 'チームで何かを成し遂げた経験を教えてください' },
  { id: 3, text: '誰かに感謝された経験を教えてください' },
  { id: 4, text: '自分の考えや行動が大きく変わったきっかけを教えてください' },
  { id: 5, text: '仕事をする上で、あなたが最も大切にしていることは何ですか' }
];

// ===== セクション4: 一貫性チェック設問テンプレート =====

const CONSISTENCY_TEMPLATES = {
  // D型傾向が強い人向け
  D_high: [
    {
      text: '仕事で最も重視することは？',
      options: [
        { label: '結果を出すこと', type: 'consistent' },
        { label: 'プロセスを丁寧に進めること', type: 'inconsistent' },
        { label: 'チームの和を保つこと', type: 'neutral' },
        { label: '正確さを追求すること', type: 'neutral' }
      ]
    }
  ],
  // I型傾向が強い人向け
  I_high: [
    {
      text: '仕事の進め方として理想的なのは？',
      options: [
        { label: 'チームで協力して進める', type: 'consistent' },
        { label: '一人で集中して進める', type: 'inconsistent' },
        { label: '計画通りに着実に進める', type: 'neutral' },
        { label: '状況を分析しながら進める', type: 'neutral' }
      ]
    }
  ],
  // S型傾向が強い人向け
  S_high: [
    {
      text: '職場環境で最も重要なのは？',
      options: [
        { label: '安定した環境', type: 'consistent' },
        { label: '常に挑戦できる環境', type: 'inconsistent' },
        { label: '自由度の高い環境', type: 'neutral' },
        { label: '成果が評価される環境', type: 'neutral' }
      ]
    }
  ],
  // C型傾向が強い人向け
  C_high: [
    {
      text: '仕事で最も大切にしたいことは？',
      options: [
        { label: '正確性と品質', type: 'consistent' },
        { label: 'スピードと効率', type: 'inconsistent' },
        { label: '人間関係の構築', type: 'neutral' },
        { label: '新しいアイデアの創出', type: 'neutral' }
      ]
    }
  ],
  // 協調性が高い人向け
  agreeableness_high: [
    {
      text: 'チームで意見が分かれた時は？',
      options: [
        { label: 'みんなの意見を調整する', type: 'consistent' },
        { label: '自分の意見を主張する', type: 'inconsistent' },
        { label: 'データに基づいて判断する', type: 'neutral' },
        { label: 'リーダーの判断に従う', type: 'neutral' }
      ]
    }
  ],
  // 誠実性が高い人向け
  conscientiousness_high: [
    {
      text: '締め切りに対する考え方は？',
      options: [
        { label: '必ず守るべきもの', type: 'consistent' },
        { label: '目安程度のもの', type: 'inconsistent' },
        { label: '品質が優先されるもの', type: 'neutral' },
        { label: 'チームで調整するもの', type: 'neutral' }
      ]
    }
  ]
};

// ===== Webアプリケーション =====

function doGet(e) {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('採用診断システム')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ===== データ取得関数 =====

function getSections() {
  return SECTIONS;
}

function getDISCQuestions() {
  return DISC_QUESTIONS;
}

function getDISCPracticeQuestions() {
  return DISC_PRACTICE_QUESTIONS;
}

function getBigFiveQuestions() {
  return BIGFIVE_QUESTIONS;
}

function getSituationQuestions() {
  return SITUATION_QUESTIONS;
}

function getBigFivePracticeQuestions() {
  return BIGFIVE_PRACTICE_QUESTIONS;
}

function getFreeformQuestions() {
  return FREEFORM_QUESTIONS;
}

function getContactEmail() {
  return getConfig().contactEmail;
}

// 全設問を取得（JavaScript.htmlから呼び出し）
function getAllQuestions() {
  return {
    disc: DISC_QUESTIONS,
    bigfive: BIGFIVE_QUESTIONS,
    situation: SITUATION_QUESTIONS,
    freeform: FREEFORM_QUESTIONS
  };
}

// 練習問題を取得（JavaScript.htmlから呼び出し）
function getPracticeQuestions() {
  return {
    disc: DISC_PRACTICE_QUESTIONS,
    bigfive: BIGFIVE_PRACTICE_QUESTIONS
  };
}

// 進捗保存（セクションと問題番号を受け取る）
function saveProgress(candidateId, sectionIndex, questionIndex) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAMES.CANDIDATES);
    const data = sheet.getDataRange().getValues();
    const now = new Date();

    // 進捗を「セクション番号-問題番号」の形式で保存
    const progressInfo = `${sectionIndex + 1}-${questionIndex + 1}`;

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === candidateId) {
        sheet.getRange(i + 1, 12).setValue(progressInfo);
        sheet.getRange(i + 1, 16).setValue(now);
        return { success: true };
      }
    }
    return { success: false };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ===== 一貫性チェック問題生成 =====

function generateConsistencyQuestions(discScores, bigfiveScores) {
  const questions = [];

  // DISCスコアから最も高いタイプを特定
  const discTypes = ['D', 'I', 'S', 'C'];
  let maxDiscType = 'D';
  let maxDiscScore = discScores.D || 0;
  discTypes.forEach(type => {
    if ((discScores[type] || 0) > maxDiscScore) {
      maxDiscScore = discScores[type];
      maxDiscType = type;
    }
  });

  // Big Fiveから特徴的な傾向を特定
  const traits = ['conscientiousness', 'agreeableness', 'neuroticism', 'openness'];
  let maxTrait = 'conscientiousness';
  let maxTraitScore = bigfiveScores.conscientiousness || 0;
  traits.forEach(trait => {
    if ((bigfiveScores[trait] || 0) > maxTraitScore) {
      maxTraitScore = bigfiveScores[trait];
      maxTrait = trait;
    }
  });

  // テンプレートから問題を生成
  const discTemplate = CONSISTENCY_TEMPLATES[maxDiscType + '_high'];
  if (discTemplate && discTemplate.length > 0) {
    const q = discTemplate[0];
    questions.push({
      id: 1,
      text: q.text,
      options: shuffleArray([...q.options]),
      expectedType: 'consistent',
      basedOn: 'DISC_' + maxDiscType
    });
  }

  // Big Five関連の問題
  const traitTemplate = CONSISTENCY_TEMPLATES[maxTrait + '_high'];
  if (traitTemplate && traitTemplate.length > 0) {
    const q = traitTemplate[0];
    questions.push({
      id: 2,
      text: q.text,
      options: shuffleArray([...q.options]),
      expectedType: 'consistent',
      basedOn: 'BigFive_' + maxTrait
    });
  }

  // 3問目：一般的な一貫性チェック
  questions.push({
    id: 3,
    text: 'あなたの回答に最も近いものは？',
    options: shuffleArray([
      { label: '自分の強みを活かして働きたい', type: 'consistent' },
      { label: '苦手なことも克服したい', type: 'neutral' },
      { label: '周りに合わせて柔軟に対応したい', type: 'neutral' },
      { label: '特にこだわりはない', type: 'inconsistent' }
    ]),
    expectedType: 'consistent',
    basedOn: 'general'
  });

  return questions;
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ===== 候補者管理 =====

function generateCandidateId() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.CANDIDATES);
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return 'APP-001';
  }

  const lastId = sheet.getRange(lastRow, 1).getValue();
  const num = parseInt(lastId.replace('APP-', '')) + 1;
  return `APP-${String(num).padStart(3, '0')}`;
}

function registerCandidate(data) {
  try {
    const ss = getSpreadsheet();

    // シートが存在しない場合は自動作成
    ensureSheetsExist();

    const sheet = ss.getSheetByName(SHEET_NAMES.CANDIDATES);

    // 既存チェック
    const existing = getCandidateByEmail(data.email);
    if (existing) {
      if (existing.status === CANDIDATE_STATUS.COMPLETED) {
        return { success: false, error: '既に診断を完了しています', status: 'completed', candidateId: existing.candidateId };
      } else if (existing.status === CANDIDATE_STATUS.INTERRUPTED) {
        return { success: false, error: '診断が中断されています', status: 'interrupted', candidateId: existing.candidateId };
      } else if (existing.status === CANDIDATE_STATUS.IN_PROGRESS) {
        // 進行中なら中断に更新
        updateCandidateInterruption(existing.candidateId, INTERRUPTION_REASONS.REACCESS);
        return { success: false, error: '診断が中断されました', status: 'interrupted', candidateId: existing.candidateId };
      }
    }

    const candidateId = generateCandidateId();
    const now = new Date();

    // 候補者マスタ（16列）
    sheet.appendRow([
      candidateId,           // A: 候補者ID
      data.lastName,         // B: 姓
      data.firstName,        // C: 名
      data.lastNameKana,     // D: セイ
      data.firstNameKana,    // E: メイ
      data.email,            // F: メール
      data.phone,            // G: 電話番号
      data.source || '',     // H: 応募経路
      CANDIDATE_STATUS.NOT_STARTED, // I: 診断ステータス
      '',                    // J: 中断理由
      '',                    // K: 中断日時
      0,                     // L: 最終回答問番号
      '',                    // M: 診断開始日時
      '',                    // N: 診断完了日時
      now,                   // O: 作成日時
      now                    // P: 更新日時
    ]);

    return { success: true, candidateId: candidateId, status: 'new' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function getCandidateByEmail(email) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.CANDIDATES);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][5] === email) {
      return {
        candidateId: data[i][0],
        lastName: data[i][1],
        firstName: data[i][2],
        lastNameKana: data[i][3],
        firstNameKana: data[i][4],
        email: data[i][5],
        phone: data[i][6],
        source: data[i][7],
        status: data[i][8],
        interruptionReason: data[i][9],
        interruptionDate: data[i][10],
        lastQuestionNumber: data[i][11],
        startDate: data[i][12],
        completedDate: data[i][13],
        createdAt: data[i][14],
        updatedAt: data[i][15],
        rowIndex: i + 1
      };
    }
  }
  return null;
}

function getCandidate(candidateId) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.CANDIDATES);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === candidateId) {
      return {
        candidateId: data[i][0],
        lastName: data[i][1],
        firstName: data[i][2],
        lastNameKana: data[i][3],
        firstNameKana: data[i][4],
        name: data[i][1] + ' ' + data[i][2],
        email: data[i][5],
        phone: data[i][6],
        source: data[i][7],
        status: data[i][8],
        interruptionReason: data[i][9],
        interruptionDate: data[i][10],
        lastQuestionNumber: data[i][11],
        startDate: data[i][12],
        completedDate: data[i][13],
        createdAt: data[i][14],
        updatedAt: data[i][15]
      };
    }
  }
  return null;
}

function getAllCandidates() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.CANDIDATES);
  const data = sheet.getDataRange().getValues();
  const candidates = [];

  for (let i = 1; i < data.length; i++) {
    candidates.push({
      candidateId: data[i][0],
      name: data[i][1] + ' ' + data[i][2],
      email: data[i][5],
      phone: data[i][6],
      status: data[i][8],
      createdAt: data[i][14]
    });
  }

  return candidates;
}

function startDiagnosisSession(candidateId) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.CANDIDATES);
  const data = sheet.getDataRange().getValues();
  const now = new Date();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === candidateId) {
      sheet.getRange(i + 1, 9).setValue(CANDIDATE_STATUS.IN_PROGRESS);
      sheet.getRange(i + 1, 13).setValue(now);
      sheet.getRange(i + 1, 16).setValue(now);
      return { success: true };
    }
  }
  return { success: false, error: '候補者が見つかりません' };
}

function updateCandidateProgress(candidateId, questionNumber) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.CANDIDATES);
  const data = sheet.getDataRange().getValues();
  const now = new Date();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === candidateId) {
      sheet.getRange(i + 1, 12).setValue(questionNumber);
      sheet.getRange(i + 1, 16).setValue(now);
      return { success: true };
    }
  }
  return { success: false };
}

function updateCandidateInterruption(candidateId, reason) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.CANDIDATES);
  const data = sheet.getDataRange().getValues();
  const now = new Date();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === candidateId) {
      sheet.getRange(i + 1, 9).setValue(CANDIDATE_STATUS.INTERRUPTED);
      sheet.getRange(i + 1, 10).setValue(reason);
      sheet.getRange(i + 1, 11).setValue(now);
      sheet.getRange(i + 1, 16).setValue(now);
      return { success: true };
    }
  }
  return { success: false };
}

function recordInterruption(candidateId, sectionIndex, questionIndex, reason) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAMES.CANDIDATES);
    const data = sheet.getDataRange().getValues();
    const now = new Date();

    // 進捗を「セクション番号-問題番号」の形式で保存
    const progressInfo = `${sectionIndex + 1}-${questionIndex + 1}`;

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === candidateId) {
        sheet.getRange(i + 1, 9).setValue(CANDIDATE_STATUS.INTERRUPTED);
        sheet.getRange(i + 1, 10).setValue(reason);
        sheet.getRange(i + 1, 11).setValue(now);
        sheet.getRange(i + 1, 12).setValue(progressInfo);
        sheet.getRange(i + 1, 16).setValue(now);
        return { success: true };
      }
    }
    return { success: false, error: '候補者が見つかりません' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ===== 診断結果保存 =====

function saveDiagnosisResult(candidateId, allAnswers, totalTime, clientDiscScores, clientBigfiveScores) {
  try {
    const ss = getSpreadsheet();

    // シートが存在しない場合は自動作成
    ensureSheetsExist();

    const resultsSheet = ss.getSheetByName(SHEET_NAMES.RESULTS);
    const answersSheet = ss.getSheetByName(SHEET_NAMES.ANSWERS);
    const candidatesSheet = ss.getSheetByName(SHEET_NAMES.CANDIDATES);
    const interviewsSheet = ss.getSheetByName(SHEET_NAMES.INTERVIEWS);

    // シートの存在確認（念のため）
    if (!resultsSheet || !answersSheet || !candidatesSheet || !interviewsSheet) {
      return { success: false, error: 'シートの初期化に失敗しました。管理者に連絡してください。' };
    }

    const now = new Date();
    const resultId = generateResultId();

    // クライアントから渡されたスコアを使用（なければ回答から計算）
    const discScores = clientDiscScores || { D: 0, I: 0, S: 0, C: 0 };
    const bigfiveScores = clientBigfiveScores || { Conscientiousness: 0, Agreeableness: 0, Neuroticism: 0, Openness: 0 };

    // 状況設問と一貫性スコアは回答から計算
    const situationScore = calculateSituationScoreFromAnswers(allAnswers);
    const consistencyScore = calculateConsistencyScoreFromAnswers(allAnswers);

    // DISCタイプ判定
    const discType = determineDISCType(discScores);

    // 診断結果シートに保存（17列）
    resultsSheet.appendRow([
      resultId,                          // A: 結果ID
      candidateId,                       // B: 候補者ID
      discType,                          // C: DISCタイプ
      discScores.D || 0,                 // D: Dスコア
      discScores.I || 0,                 // E: Iスコア
      discScores.S || 0,                 // F: Sスコア
      discScores.C || 0,                 // G: Cスコア
      bigfiveScores.Conscientiousness || 0, // H: 誠実性スコア
      bigfiveScores.Agreeableness || 0,     // I: 協調性スコア
      bigfiveScores.Neuroticism || 0,       // J: 神経症傾向スコア
      bigfiveScores.Openness || 0,          // K: 開放性スコア
      situationScore,                    // L: 状況設問スコア
      consistencyScore,                  // M: 一貫性スコア
      '',                                // N: 総合評価コメント（AI生成予定）
      '',                                // O: 矛盾点・懸念点（AI生成予定）
      '',                                // P: 推奨質問（AI生成予定）
      now                                // Q: 診断日時
    ]);

    // 回答詳細シートに保存（10列）
    // allAnswersはフラット配列: [{sectionId, questionId, selectedOption, ...}, ...]
    const sectionQuestionCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };
    const freeformAnswers = [];

    allAnswers.forEach((answer, idx) => {
      const sectionId = answer.sectionId || 1;
      sectionQuestionCounts[sectionId]++;
      const questionNum = sectionQuestionCounts[sectionId];

      // 回答内容を取得
      let answerContent = '';
      let answerType = '';

      if (sectionId === 3) {
        // 自由記述
        answerContent = answer.freeformAnswer || '';
        answerType = 'freeform';
        freeformAnswers.push(answer.freeformAnswer || '');
      } else if (answer.scaleValue !== undefined && answer.scaleValue !== null) {
        // 5段階評価
        answerContent = String(answer.scaleValue);
        answerType = answer.trait || '';
      } else {
        // 4択
        answerContent = answer.selectedOption || '';
        answerType = answer.type || '';
      }

      answersSheet.appendRow([
        `ANS-${resultId}-${String(idx + 1).padStart(3, '0')}`,
        candidateId,
        sectionId,
        questionNum,
        '',  // 質問文はデータ量を考慮して省略
        answerContent,
        answerType,
        answer.responseTime || 0,
        answer.timeout ? 'TRUE' : 'FALSE',
        now
      ]);
    });

    // 候補者ステータス更新
    const candidateData = candidatesSheet.getDataRange().getValues();
    let candidate = null;
    for (let i = 1; i < candidateData.length; i++) {
      if (candidateData[i][0] === candidateId) {
        candidate = {
          name: candidateData[i][1] + ' ' + candidateData[i][2],
          email: candidateData[i][5],
          phone: candidateData[i][6]
        };
        candidatesSheet.getRange(i + 1, 9).setValue(CANDIDATE_STATUS.COMPLETED);
        candidatesSheet.getRange(i + 1, 14).setValue(now);
        candidatesSheet.getRange(i + 1, 16).setValue(now);
        break;
      }
    }

    // 面接シートに基本情報を転記（A-U列のみ。V列以降は面接官入力用）
    // ※ V列以降（面接記録）はGASからの自動書き込み禁止
    if (candidate) {
      interviewsSheet.appendRow([
        candidateId,                       // A: 候補者ID
        candidate.name,                    // B: 氏名
        candidate.email,                   // C: メール
        candidate.phone,                   // D: 電話番号
        now,                               // E: 診断完了日
        discType,                          // F: DISCタイプ
        discScores.D,                      // G: Dスコア
        discScores.I,                      // H: Iスコア
        discScores.S,                      // I: Sスコア
        discScores.C,                      // J: Cスコア
        bigfiveScores.Conscientiousness || 0, // K: 誠実性スコア
        bigfiveScores.Agreeableness || 0,     // L: 協調性スコア
        bigfiveScores.Neuroticism || 0,       // M: 神経症傾向スコア
        bigfiveScores.Openness || 0,          // N: 開放性スコア
        freeformAnswers[0] || '',          // O: 自由記述Q1
        freeformAnswers[1] || '',          // P: 自由記述Q2
        freeformAnswers[2] || '',          // Q: 自由記述Q3
        freeformAnswers[3] || '',          // R: 自由記述Q4
        freeformAnswers[4] || '',          // S: 自由記述Q5
        '',                                // T: AI分析（矛盾点）- 後で追加
        ''                                 // U: AI分析（推奨質問）- 後で追加
        // V列以降は面接官が入力するため、ここでは書き込まない
      ]);
    }

    return {
      success: true,
      resultId: resultId,
      diagnosisId: resultId,  // JavaScript.htmlとの互換性のため
      discType: discType,
      discScores: discScores,
      bigfiveScores: bigfiveScores,
      situationScore: situationScore,
      consistencyScore: consistencyScore
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function generateResultId() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.RESULTS);
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return 'RES-001';
  }

  const lastId = sheet.getRange(lastRow, 1).getValue();
  const num = parseInt(lastId.replace('RES-', '')) + 1;
  return `RES-${String(num).padStart(3, '0')}`;
}

// ===== スコア計算 =====

function calculateDISCScores(answers) {
  const scores = { D: 0, I: 0, S: 0, C: 0 };
  answers.forEach(answer => {
    if (answer.type && scores.hasOwnProperty(answer.type)) {
      scores[answer.type]++;
    }
  });
  return scores;
}

function determineDISCType(scores) {
  const types = ['D', 'I', 'S', 'C'];
  let maxType = 'D';
  let maxScore = scores.D;

  types.forEach(type => {
    if (scores[type] > maxScore) {
      maxScore = scores[type];
      maxType = type;
    }
  });

  return maxType;
}

function calculateBigFiveScores(answers) {
  const scores = {
    conscientiousness: 0,
    agreeableness: 0,
    neuroticism: 0,
    openness: 0
  };
  const counts = {
    conscientiousness: 0,
    agreeableness: 0,
    neuroticism: 0,
    openness: 0
  };

  answers.forEach(answer => {
    if (answer.trait && scores.hasOwnProperty(answer.trait)) {
      let score = answer.score || 0;
      // 逆転項目の処理（神経症傾向）
      if (answer.reversed) {
        score = 6 - score; // 5段階なので6から引く
      }
      scores[answer.trait] += score;
      counts[answer.trait]++;
    }
  });

  // 平均スコア（1-5）を計算
  Object.keys(scores).forEach(trait => {
    if (counts[trait] > 0) {
      scores[trait] = Math.round((scores[trait] / counts[trait]) * 10) / 10;
    }
  });

  return scores;
}

function calculateSituationScore(answers) {
  let total = 0;
  answers.forEach(answer => {
    total += answer.score || 0;
  });
  return total;
}

function calculateConsistencyScore(answers) {
  let consistent = 0;
  let total = answers.length;

  answers.forEach(answer => {
    if (answer.type === 'consistent') {
      consistent++;
    }
  });

  return total > 0 ? Math.round((consistent / total) * 100) : 0;
}

// 回答配列から状況スコアを計算
function calculateSituationScoreFromAnswers(allAnswers) {
  let score = 0;
  allAnswers.forEach(answer => {
    if (answer.sectionId === 2 && answer.score) {
      score += answer.score;
    }
  });
  return score;
}

// 回答配列から一貫性スコアを計算
function calculateConsistencyScoreFromAnswers(allAnswers) {
  let consistent = 0;
  let total = 0;

  allAnswers.forEach(answer => {
    if (answer.sectionId === 4) {
      total++;
      if (answer.type === 'consistent') {
        consistent++;
      }
    }
  });

  return total > 0 ? Math.round((consistent / total) * 100) : 0;
}

// ===== 管理機能 =====

function authenticateAdmin(password) {
  const config = getConfig();
  const adminPassword = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD') || 'admin123';
  return password === adminPassword;
}

function getDashboardStats() {
  const candidates = getAllCandidates();

  const stats = {
    totalCandidates: candidates.length,
    diagnosisCompleted: 0,
    diagnosisWaiting: 0,
    interrupted: 0,
    inProgress: 0
  };

  candidates.forEach(c => {
    switch (c.status) {
      case CANDIDATE_STATUS.COMPLETED:
        stats.diagnosisCompleted++;
        break;
      case CANDIDATE_STATUS.INTERRUPTED:
        stats.interrupted++;
        break;
      case CANDIDATE_STATUS.IN_PROGRESS:
        stats.inProgress++;
        break;
      default:
        stats.diagnosisWaiting++;
    }
  });

  return stats;
}

function getCandidateDiagnosis(candidateId) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.RESULTS);
  const data = sheet.getDataRange().getValues();

  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][1] === candidateId) {
      return {
        resultId: data[i][0],
        candidateId: data[i][1],
        discType: data[i][2],
        scores: {
          D: data[i][3],
          I: data[i][4],
          S: data[i][5],
          C: data[i][6]
        },
        bigfiveScores: {
          conscientiousness: data[i][7],
          agreeableness: data[i][8],
          neuroticism: data[i][9],
          openness: data[i][10]
        },
        situationScore: data[i][11],
        consistencyScore: data[i][12],
        diagnosisDate: data[i][16]
      };
    }
  }
  return null;
}

// ===== セットアップ関数 =====

// シートが存在しない場合に作成する
function ensureSheetsExist() {
  const ss = getSpreadsheet();

  // 候補者マスタ
  if (!ss.getSheetByName(SHEET_NAMES.CANDIDATES)) {
    // LockService使用（TROUBLE-018対応）
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(30000);
      if (!ss.getSheetByName(SHEET_NAMES.CANDIDATES)) {
        const sheet = ss.insertSheet(SHEET_NAMES.CANDIDATES);
        sheet.getRange(1, 1, 1, 16).setValues([[
          '候補者ID', '姓', '名', 'セイ', 'メイ', 'メール', '電話番号', '応募経路',
          '診断ステータス', '中断理由', '中断日時', '最終回答問番号',
          '診断開始日時', '診断完了日時', '作成日時', '更新日時'
        ]]);
        sheet.setFrozenRows(1);
        sheet.getRange(1, 1, 1, 16).setBackground('#4285f4').setFontColor('white').setFontWeight('bold');
      }
    } finally {
      lock.releaseLock();
    }
  }

  // 診断結果
  if (!ss.getSheetByName(SHEET_NAMES.RESULTS)) {
    // LockService使用（TROUBLE-018対応）
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(30000);
      if (!ss.getSheetByName(SHEET_NAMES.RESULTS)) {
        const sheet = ss.insertSheet(SHEET_NAMES.RESULTS);
        sheet.getRange(1, 1, 1, 17).setValues([[
          '結果ID', '候補者ID', 'DISCタイプ', 'Dスコア', 'Iスコア', 'Sスコア', 'Cスコア',
          '誠実性スコア', '協調性スコア', '神経症傾向スコア', '開放性スコア',
          '状況設問スコア', '一貫性スコア', '総合評価コメント', '矛盾点・懸念点', '推奨質問', '診断日時'
        ]]);
        sheet.setFrozenRows(1);
        sheet.getRange(1, 1, 1, 17).setBackground('#34a853').setFontColor('white').setFontWeight('bold');
      }
    } finally {
      lock.releaseLock();
    }
  }

  // 回答詳細
  if (!ss.getSheetByName(SHEET_NAMES.ANSWERS)) {
    // LockService使用（TROUBLE-018対応）
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(30000);
      if (!ss.getSheetByName(SHEET_NAMES.ANSWERS)) {
        const sheet = ss.insertSheet(SHEET_NAMES.ANSWERS);
        sheet.getRange(1, 1, 1, 10).setValues([[
          '回答ID', '候補者ID', 'セクション番号', '質問番号', '質問文',
          '回答内容', '回答タイプ', '回答時間（秒）', 'タイムアウトフラグ', '回答日時'
        ]]);
        sheet.setFrozenRows(1);
        sheet.getRange(1, 1, 1, 10).setBackground('#fbbc04').setFontColor('white').setFontWeight('bold');
      }
    } finally {
      lock.releaseLock();
    }
  }

  // 面接シート
  if (!ss.getSheetByName(SHEET_NAMES.INTERVIEWS)) {
    // LockService使用（TROUBLE-018対応）
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(30000);
      if (!ss.getSheetByName(SHEET_NAMES.INTERVIEWS)) {
        const sheet = ss.insertSheet(SHEET_NAMES.INTERVIEWS);
        sheet.getRange(1, 1, 1, 32).setValues([[
          '候補者ID', '氏名', 'メール', '電話番号', '診断完了日',
          'DISCタイプ', 'Dスコア', 'Iスコア', 'Sスコア', 'Cスコア',
          '誠実性スコア', '協調性スコア', '神経症傾向スコア', '開放性スコア',
          '自由記述Q1', '自由記述Q2', '自由記述Q3', '自由記述Q4', '自由記述Q5',
          'AI分析（矛盾点）', 'AI分析（推奨質問）',
          '面接日', '面接官名', 'Q1深掘り回答', 'Q2深掘り回答', 'Q3深掘り回答',
          'Q4深掘り回答', 'Q5深掘り回答', '面接官コメント', '総合評価', '最終判定', '判定理由'
        ]]);
        sheet.setFrozenRows(1);
        sheet.getRange(1, 1, 1, 21).setBackground('#ea4335').setFontColor('white').setFontWeight('bold');
        sheet.getRange(1, 22, 1, 11).setBackground('#9c27b0').setFontColor('white').setFontWeight('bold');
      }
    } finally {
      lock.releaseLock();
    }
  }

  return { success: true };
}

function setupRecruitmentSystem() {
  const props = PropertiesService.getScriptProperties();
  const existingId = props.getProperty('SPREADSHEET_ID');

  if (existingId) {
    Logger.log('既にセットアップ済みです。');
    Logger.log('SPREADSHEET_ID: ' + existingId);
    return { success: false, message: '既にセットアップ済みです', spreadsheetId: existingId };
  }

  const ss = SpreadsheetApp.create('採用診断システム v4');
  const spreadsheetId = ss.getId();

  props.setProperty('SPREADSHEET_ID', spreadsheetId);

  Logger.log('スプレッドシートが作成されました！');
  Logger.log('ID: ' + spreadsheetId);
  Logger.log('URL: ' + ss.getUrl());

  const defaultSheet = ss.getSheetByName('シート1');

  // LockService使用（TROUBLE-018対応）- 全シート作成を1つのロックで囲む
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);

    // 候補者マスタ（16列）
    const candidatesSheet = ss.insertSheet(SHEET_NAMES.CANDIDATES);
    candidatesSheet.getRange(1, 1, 1, 16).setValues([[
      '候補者ID', '姓', '名', 'セイ', 'メイ', 'メール', '電話番号', '応募経路',
      '診断ステータス', '中断理由', '中断日時', '最終回答問番号',
      '診断開始日時', '診断完了日時', '作成日時', '更新日時'
    ]]);
    candidatesSheet.setFrozenRows(1);
    candidatesSheet.getRange(1, 1, 1, 16).setBackground('#4285f4').setFontColor('white').setFontWeight('bold');

    // 診断結果（17列）
    const resultsSheet = ss.insertSheet(SHEET_NAMES.RESULTS);
    resultsSheet.getRange(1, 1, 1, 17).setValues([[
      '結果ID', '候補者ID', 'DISCタイプ', 'Dスコア', 'Iスコア', 'Sスコア', 'Cスコア',
      '誠実性スコア', '協調性スコア', '神経症傾向スコア', '開放性スコア',
      '状況設問スコア', '一貫性スコア', '総合評価コメント', '矛盾点・懸念点', '推奨質問', '診断日時'
    ]]);
    resultsSheet.setFrozenRows(1);
    resultsSheet.getRange(1, 1, 1, 17).setBackground('#34a853').setFontColor('white').setFontWeight('bold');

    // 回答詳細（10列）
    const answersSheet = ss.insertSheet(SHEET_NAMES.ANSWERS);
    answersSheet.getRange(1, 1, 1, 10).setValues([[
      '回答ID', '候補者ID', 'セクション番号', '質問番号', '質問文',
      '回答内容', '回答タイプ', '回答時間（秒）', 'タイムアウトフラグ', '回答日時'
    ]]);
    answersSheet.setFrozenRows(1);
    answersSheet.getRange(1, 1, 1, 10).setBackground('#fbbc04').setFontColor('white').setFontWeight('bold');

    // 面接シート（32列）※V列以降は面接官入力用
    const interviewsSheet = ss.insertSheet(SHEET_NAMES.INTERVIEWS);
    interviewsSheet.getRange(1, 1, 1, 32).setValues([[
      '候補者ID', '氏名', 'メール', '電話番号', '診断完了日',
      'DISCタイプ', 'Dスコア', 'Iスコア', 'Sスコア', 'Cスコア',
      '誠実性スコア', '協調性スコア', '神経症傾向スコア', '開放性スコア',
      '自由記述Q1', '自由記述Q2', '自由記述Q3', '自由記述Q4', '自由記述Q5',
      'AI分析（矛盾点）', 'AI分析（推奨質問）',
      '面接日', '面接官名', 'Q1深掘り回答', 'Q2深掘り回答', 'Q3深掘り回答',
      'Q4深掘り回答', 'Q5深掘り回答', '面接官コメント', '総合評価', '最終判定', '判定理由'
    ]]);
    interviewsSheet.setFrozenRows(1);
    interviewsSheet.getRange(1, 1, 1, 21).setBackground('#ea4335').setFontColor('white').setFontWeight('bold');
    // V列以降（面接官入力）は別の色
    interviewsSheet.getRange(1, 22, 1, 11).setBackground('#9c27b0').setFontColor('white').setFontWeight('bold');

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
