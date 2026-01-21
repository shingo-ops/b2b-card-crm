/**
 * CRM設定・定数
 */

// ============================================================
// 環境設定（本番/開発切り替え）
// ============================================================

/**
 * 本番環境の固定ID
 */
const PRODUCTION_IDS = {
  SPREADSHEET_ID: '1kF-o4jCrbQePktWaFEBvWhJJjRXhkuw5-AcISa4ClAk',
  ARCHIVE_BOOK_ID: '1J4VFKwwV5xbEy15TrbwriFRDiYTH-YfrVTzwTQJpXpI',
  DEV_FOLDER_ID: '1BKFjFJIxEM2j-HFaxgFuTLAcgAnRuXMi'
};

/**
 * デプロイID
 */
const DEPLOY_IDS = {
  PRODUCTION: 'AKfycbzpeOkyBzA0kyD6T9aDE1uYVIil1z6KY0Ssc6Hta5EX7xoIAk_-EkxgmjILhN9Ceg5M',
  TEST: 'AKfycbwGUUcdUs_L-a4c9Ux9PBPuX9X6t5YMGVnlInL5RGOq63a2QfaJUgIbNdV4ylcN0Xou2g'
};

/**
 * 現在の環境を取得（'production' or 'development'）
 */
function getEnvironment() {
  const props = PropertiesService.getScriptProperties();
  return props.getProperty('ENVIRONMENT') || 'production';
}

/**
 * 環境を設定
 * @param {string} env - 'production' or 'development'
 */
function setEnvironment(env) {
  if (env !== 'production' && env !== 'development') {
    throw new Error('環境は "production" または "development" を指定してください');
  }
  const props = PropertiesService.getScriptProperties();
  props.setProperty('ENVIRONMENT', env);
  Logger.log('環境を ' + env + ' に設定しました');
}

/**
 * スプレッドシートを取得（環境に応じて切り替え）
 */
function getSpreadsheet() {
  const env = getEnvironment();
  const props = PropertiesService.getScriptProperties();

  if (env === 'development') {
    const devId = props.getProperty('DEV_SPREADSHEET_ID');
    if (!devId) {
      Logger.log('警告: DEV_SPREADSHEET_ID が未設定のため、本番スプレッドシートを使用します');
      return SpreadsheetApp.openById(PRODUCTION_IDS.SPREADSHEET_ID);
    }
    return SpreadsheetApp.openById(devId);
  }

  // 本番環境
  return SpreadsheetApp.openById(PRODUCTION_IDS.SPREADSHEET_ID);
}

/**
 * アーカイブブックを取得（環境に応じて切り替え）
 */
function getArchiveBook() {
  const env = getEnvironment();
  const props = PropertiesService.getScriptProperties();

  if (env === 'development') {
    const devArchiveId = props.getProperty('DEV_ARCHIVE_BOOK_ID');
    if (devArchiveId) {
      return SpreadsheetApp.openById(devArchiveId);
    }
    // 開発環境でもアーカイブブックがない場合は本番を使用（読み取り専用想定）
    Logger.log('警告: DEV_ARCHIVE_BOOK_ID が未設定のため、本番アーカイブブックを使用します');
  }

  return SpreadsheetApp.openById(PRODUCTION_IDS.ARCHIVE_BOOK_ID);
}

/**
 * 現在の環境情報を表示（デバッグ用）
 */
function showCurrentEnvironment() {
  const env = getEnvironment();
  const props = PropertiesService.getScriptProperties();

  Logger.log('========================================');
  Logger.log('現在の環境情報');
  Logger.log('========================================');
  Logger.log('ENVIRONMENT: ' + env);

  try {
    const ss = getSpreadsheet();
    Logger.log('スプレッドシート: ' + ss.getName());
    Logger.log('スプレッドシートID: ' + ss.getId());
  } catch (e) {
    Logger.log('スプレッドシート取得エラー: ' + e.message);
  }

  if (env === 'development') {
    Logger.log('DEV_SPREADSHEET_ID: ' + (props.getProperty('DEV_SPREADSHEET_ID') || '未設定'));
    Logger.log('DEV_ARCHIVE_BOOK_ID: ' + (props.getProperty('DEV_ARCHIVE_BOOK_ID') || '未設定'));
  }

  Logger.log('========================================');

  return {
    environment: env,
    spreadsheetId: getSpreadsheet().getId(),
    spreadsheetName: getSpreadsheet().getName()
  };
}

const CONFIG = {
  // シート名
  SHEETS: {
    // 統合リード管理シート（メイン）
    LEADS: 'リード管理',

    // マスタ・設定シート
    STAFF: '担当者マスタ',
    SETTINGS: '設定',
    PERMISSIONS: '権限設定',
    GOALS: '目標設定',
    TEMPLATES: 'テンプレート',

    // レポート・シフトシート
    WEEKLY_REPORT: '週次レポート',
    MONTHLY_REPORT: '月次レポート',
    SHIFT: 'シフト',

    // ログシート
    BUDDY_LOG: 'Buddy対話ログ',

    // 会話ログシート（統合）
    CONVERSATION_LOG: '会話ログ',
    TERM_DICTIONARY: '専門用語辞書',

    // お知らせシート
    NOTICES: 'お知らせ',
    READ_STATUS: '既読管理'
  },

  // リードID接頭辞（インバウンド: LDI-, アウトバウンド: LDO-）
  LEAD_ID_PREFIX_IN: 'LDI-',
  LEAD_ID_PREFIX_OUT: 'LDO-',

  // 担当者ID接頭辞
  STAFF_ID_PREFIX: 'EMP-',

  // リマインド閾値（時間）
  REMIND_THRESHOLD_HOURS: 48,

  // 進捗ステータス（設定シート参照が基本、これはフォールバック）
  PROGRESS_STATUSES: {
    // リード段階（CS）
    NEW: '新規',
    IN_PROGRESS: '対応中',
    NOT_APPLICABLE_LEAD: '対象外',
    // 商談段階（営業）
    ASSIGNED: 'アサイン確定',
    DEALING: '商談中',
    ESTIMATE: '見積もり提示',
    // 完了段階
    WON: '成約',
    LOST: '失注',
    FOLLOW_UP: '追客',
    NOT_APPLICABLE: '対象外',
    ARCHIVED: 'アーカイブ'
  },

  // リード種別
  LEAD_TYPES: {
    INBOUND: 'インバウンド',
    OUTBOUND: 'アウトバウンド'
  },

  // リード段階のステータス（リマインド対象外）
  LEAD_STATUSES: ['新規', '対応中', '対象外'],

  // 商談段階のステータス（リマインド対象）
  DEAL_STATUSES: ['アサイン確定', '商談中', '見積もり提示'],

  // 完了ステータス（アーカイブ対象）
  CLOSED_STATUSES: ['成約', '失注', '追客', '対象外', 'アーカイブ'],

  // ボトルネック特定設定
  BOTTLENECK_SETTINGS: {
    STAGNATION_HOURS: 48,           // 停滞判定（時間）- 商談メモ未更新
    LONG_DEAL_DAYS: 7,              // クロージング長期化判定（日）
    CONVERSION_DROP_THRESHOLD: 20,  // 成約率低下閾値（%）
    STAGNATION_WARNING_COUNT: 3     // 要介入判定の停滞件数
  }
};

/**
 * プルダウン選択肢（デフォルト値・初期設定用）
 * 基本的には設定シートを参照するが、設定シートがない場合のフォールバック
 */
const DEFAULT_DROPDOWN_OPTIONS = {
  '流入経路（IN）': [],
  '流入経路（OUT）': [],
  国: ['USA', 'Canada', 'UK', 'Germany', 'France', 'Australia', 'Philippines', 'Thailand', 'Malaysia', 'Singapore', 'Indonesia', 'Hong Kong', 'Taiwan', 'Korea', 'China', 'その他'],
  温度感: ['高', '中', '低'],
  想定規模: ['大口', '中規模', '小口', '不明'],
  顧客タイプ: ['信頼重視', '価格重視', '不明'],
  返信速度: ['24h以内', '48h以内', '3日以上', '未返信'],
  連絡手段: ['Instagram DM', 'WhatsApp', 'Email', 'Discord', 'LINE', '電話', 'その他'],
  進捗ステータス: ['新規', '対応中', '対象外', 'アサイン確定', '商談中', '見積もり提示', '成約', '失注', '追客', 'アーカイブ'],
  次回アクション日: ['相手の返信後', '不明点を確認後', '本日中', '明日までに', '3日以内', '1週間以内'],
  取り扱いタイトル: ['Pokemon', 'One Piece', 'Yu-Gi-Oh', 'Dragon Ball', 'Weiss Schwarz', '複数', 'その他'],
  販売形態: ['実店舗', 'EC', 'ライブ配信', '複合', '不明'],
  競合比較中: ['はい', 'いいえ', '不明'],
  購入頻度: ['週1回以上', '月2-3回', '月1回', '不定期'],
  商談結果: ['成約', '失注', '追客', '対象外'],
  商談の手応え: ['◎ 非常に良い', '○ 良い', '△ 普通', '× 厳しい'],
  アーカイブ理由: ['連絡不通', '対象外', '重複', 'その他'],
  対象外理由: ['予算不足', 'ニーズ不一致', '地域対象外', 'その他'],
  失注理由: ['競合負け', '価格不一致', 'タイミング合わず', '予算凍結', 'その他'],
  役割: ['オーナー', 'システム管理者', 'リーダー', '営業', 'CS'],
  ステータス: ['有効', '無効'],
  期間タイプ: ['月次', '週次', '四半期', '年次']
};

/**
 * プルダウン項目名（設定シートのヘッダー順）
 */
const DROPDOWN_COLUMNS = [
  '流入経路（IN）', '流入経路（OUT）', '国', '温度感', '想定規模', '顧客タイプ', '返信速度', '連絡手段',
  '進捗ステータス', '次回アクション日', '取り扱いタイトル', '販売形態', '競合比較中', '購入頻度',
  '商談結果', '商談の手応え', 'アーカイブ理由', '対象外理由', '失注理由', '役割', 'ステータス', '期間タイプ'
];

/**
 * ヘッダー定義（統合リード管理シート：60列）
 * SetupIntegratedSheet.gs の LEAD_SHEET_HEADERS と同期必須
 * CLAUDE.md Section 2.2 準拠
 */
const HEADERS = {
  // 統合リード管理シート（60列）
  LEADS: [
    // カテゴリ1: 基本情報（4列）
    'リードID',           // 1: 自動（LDI-00001 or LDO-00001）
    '登録日',             // 2: 自動
    'リード種別',         // 3: インバウンド/アウトバウンド（自動）
    'シート更新日',       // 4: 自動
    // カテゴリ2: CS記入（15列）
    '流入経路',           // 5: プルダウン（設定シート参照）
    '顧客名',             // 6: テキスト
    '呼び方（英語）',     // 7: テキスト
    '国',                 // 8: プルダウン（設定シート参照）
    'メール',             // 9: テキスト
    '電話番号',           // 10: テキスト
    '連絡手段',           // 11: プルダウン（設定シート参照）
    'メッセージURL',      // 12: テキスト
    '初回接触日',         // 13: 日付
    '温度感',             // 14: プルダウン（設定シート参照）
    '想定規模',           // 15: プルダウン（設定シート参照）
    '顧客タイプ',         // 16: プルダウン（設定シート参照）
    '返信速度',           // 17: プルダウン（設定シート参照）
    'CSメモ',             // 18: テキスト
    '問い合わせ回数',     // 19: 自動（重複検知用）
    // カテゴリ3: アサイン・担当（5列）
    '進捗ステータス',     // 20: プルダウン（自動入力ルールあり）
    '担当者',             // 21: プルダウン（担当者マスタ参照）
    '担当者ID',           // 22: 自動
    'アサイン日',         // 23: 自動
    '最終対応者ID',       // 24: 自動
    // カテゴリ4: 営業（商談中）（13列）
    '見込度',             // 25: 自動計算（商談情報から算出）
    '次回アクション',     // 26: テキスト
    '次回アクション日',   // 27: プルダウン（旧：再アプローチ日を統合）
    '商談メモ',           // 28: テキスト
    '相手の課題',         // 29: テキスト
    '取り扱いタイトル',   // 30: 複数選択プルダウン
    '販売形態',           // 31: プルダウン（設定シート参照）
    '月間見込み金額',     // 32: 数値
    '1回の発注金額',      // 33: 数値
    '購入頻度',           // 34: プルダウン（設定シート参照）
    '競合比較中',         // 35: プルダウン（設定シート参照）
    '商談の手応え',       // 36: プルダウン（設定シート参照）
    'アラート確認日',     // 37: 自動
    // カテゴリ5: 営業（レポート）（13列）
    '商談結果',           // 38: プルダウン（設定シート参照）
    '対象外理由',         // 39: プルダウン（設定シート参照）
    '失注理由',           // 40: プルダウン（設定シート参照）
    '初回取引日',         // 41: 日付
    '初回取引金額',       // 42: 数値
    '累計取引金額',       // 43: 自動計算
    'Good Point',         // 44: テキスト（商談ごとの振り返り）
    'More Point',         // 45: テキスト（商談ごとの振り返り）
    '反省と今後の抱負',   // 46: テキスト（商談ごとの振り返り）
    'レポート提出日',     // 47: 自動
    'レポート確認者',     // 48: プルダウン
    'レポート確認日',     // 49: 自動
    'レポートコメント',   // 50: テキスト
    // カテゴリ6: アーカイブ（2列）
    'アーカイブ日',       // 51: 自動
    'アーカイブ理由',     // 52: プルダウン（設定シート参照）
    // カテゴリ7: Buddy・AI（1列）
    'Buddyフィードバック', // 53: AIからのFB
    // カテゴリ8: 会話ログ連携（3列）
    '会話要約',           // 54: 自動
    '最終会話日時',       // 55: 自動
    '会話数',             // 56: 自動
    // カテゴリ9: 重複管理（4列）
    '重複フラグ',         // 57: 自動
    '重複元リードID',     // 58: 自動
    '重複確認日',         // 59: 日付
    '重複確認者'          // 60: 自動
  ],
  STAFF: [
    '担当者ID', '苗字（日本語）', '名前（日本語）', '苗字（英語）', '名前（英語）',
    'メール', 'Discord ID', '役割', 'ステータス', '元候補者ID'
  ],
  WEEKLY_REPORT: [
    'レポートID', '担当者ID', '担当者名', '対象週', '今週の成果', '良かった点',
    '改善点', '来週の目標', '困っていること', 'Buddyへの質問', 'Buddyフィードバック', '提出日時'
  ],
  MONTHLY_REPORT: [
    'レポートID', '担当者ID', '担当者名', '対象月', '今月の成果', '良かった点',
    '改善点', '来月の目標', 'Buddyフィードバック', '提出日時'
  ],
  SHIFT: [
    'シフトID', '担当者ID', '担当者名', '対象週', '曜日',
    '時間帯1_開始', '時間帯1_終了', '時間帯2_開始', '時間帯2_終了',
    '時間帯3_開始', '時間帯3_終了', '提出日時', '更新日時'
  ],
  TEMPLATES: [
    'テンプレートID', 'テンプレート名', 'カテゴリ', '本文', '使用場面', '更新日'
  ],
  // 設定シートはDROPDOWN_COLUMNSを使用
  SETTINGS: DROPDOWN_COLUMNS,
  // 権限設定シートのヘッダー
  PERMISSIONS: [
    '役割名', 'dashboard_view', 'dashboard_cs', 'dashboard_sales', 'dashboard_leader',
    'lead_view', 'lead_add', 'lead_edit', 'lead_delete',
    'deal_view_all', 'deal_view_own', 'deal_edit', 'team_stats',
    'staff_manage', 'settings', 'admin_access', 'force_reset'
  ],
  // 会話ログシート（リード用・商談用共通：9列）
  CONVERSATION_LOG: [
    'ログID',         // 1: 自動採番（LOG-00001）
    'リードID',       // 2: LDI-00001 / LDO-00001
    '日時',           // 3: メッセージの日時
    '送受信',         // 4: 送信/受信
    '発言者',         // 5: 担当者名 or 顧客名
    '原文',           // 6: オリジナルメッセージ
    '翻訳文',         // 7: 日本語訳
    '記録者ID',       // 8: 記録した担当者ID
    '記録日時'        // 9: 記録した日時
  ],
  // 専門用語辞書シート（5列）
  TERM_DICTIONARY: [
    '英語',           // 1: Box
    '日本語',         // 2: ボックス
    'カテゴリ',       // 3: 商品形態
    '説明',           // 4: 30パック入り
    '有効'            // 5: TRUE/FALSE
  ],
  // お知らせシート（11列）
  NOTICES: [
    'お知らせID',     // 1: NOTICE-00001
    '日時',           // 2: 投稿日時
    '種別',           // 3: 重要/お知らせ/メンテナンス/個人
    'タイトル',       // 4: 件名
    '本文',           // 5: 内容
    '対象種別',       // 6: 全員/役割/個人
    '対象値',         // 7: 全員 / CS,営業 / EMP-001
    '有効期限',       // 8: 表示期限
    '作成者',         // 9: システム/管理者名
    'アクションURL',  // 10: リンク先（任意）
    'アクションラベル' // 11: ボタンラベル（任意）
  ],
  // 既読管理シート（3列）
  READ_STATUS: [
    '担当者ID',       // 1: EMP-001
    'お知らせID',     // 2: NOTICE-00001
    '既読日時'        // 3: 2026/01/13 10:30
  ]
};

/**
 * 目標設定シートのヘッダー
 */
const GOALS_HEADERS = [
  '目標ID',
  '担当者ID',
  '担当者名',
  '期間タイプ',
  '期間',
  '商談数目標',
  '成約数目標',
  '成約率目標',
  '売上目標',
  'メモ',
  '作成日',
  '更新日'
];

/**
 * 権限項目の定義（表示名とキーのマッピング）
 */
const PERMISSION_DEFINITIONS = {
  // 基本機能
  dashboard_view: { name: 'ダッシュボード閲覧', category: '基本機能' },
  dashboard_cs: { name: 'CSダッシュボード', category: 'ダッシュボード' },
  dashboard_sales: { name: '営業ダッシュボード', category: 'ダッシュボード' },
  dashboard_leader: { name: 'リーダーダッシュボード', category: 'ダッシュボード' },
  lead_view: { name: 'リード一覧閲覧', category: 'リード管理' },
  lead_add: { name: 'リード追加', category: 'リード管理' },
  lead_edit: { name: 'リード編集', category: 'リード管理' },
  lead_delete: { name: 'リード削除', category: 'リード管理' },
  deal_view_all: { name: '商談閲覧（全員）', category: '商談管理' },
  deal_view_own: { name: '商談閲覧（自分のみ）', category: '商談管理' },
  deal_edit: { name: '商談編集', category: '商談管理' },
  team_stats: { name: 'チーム成績閲覧', category: '商談管理' },
  staff_manage: { name: '担当者管理', category: '管理機能' },
  settings: { name: '設定変更', category: '管理機能' },
  admin_access: { name: '管理者設定アクセス', category: '管理機能' },
  force_reset: { name: '強制リセット', category: '管理機能' }
};

/**
 * デフォルト役割定義
 */
const DEFAULT_ROLES = {
  'オーナー': {
    dashboard_view: true,
    dashboard_cs: true,
    dashboard_sales: true,
    dashboard_leader: true,
    lead_view: true,
    lead_add: true,
    lead_edit: true,
    lead_delete: true,
    deal_view_all: true,
    deal_view_own: true,
    deal_edit: true,
    team_stats: true,
    staff_manage: true,
    settings: true,
    admin_access: true,
    force_reset: true
  },
  'システム管理者': {
    dashboard_view: true,
    dashboard_cs: true,
    dashboard_sales: true,
    dashboard_leader: true,
    lead_view: true,
    lead_add: false,
    lead_edit: false,
    lead_delete: false,
    deal_view_all: true,
    deal_view_own: false,
    deal_edit: false,
    team_stats: true,
    staff_manage: true,
    settings: true,
    admin_access: true,
    force_reset: false
  },
  'リーダー': {
    dashboard_view: true,
    dashboard_cs: true,
    dashboard_sales: true,
    dashboard_leader: true,
    lead_view: true,
    lead_add: true,
    lead_edit: true,
    lead_delete: true,
    deal_view_all: true,
    deal_view_own: true,
    deal_edit: true,
    team_stats: true,
    staff_manage: true,
    settings: false,
    admin_access: false,
    force_reset: false
  },
  '営業': {
    dashboard_view: true,
    dashboard_cs: false,
    dashboard_sales: true,
    dashboard_leader: false,
    lead_view: false,
    lead_add: false,
    lead_edit: false,
    lead_delete: false,
    deal_view_all: false,
    deal_view_own: true,
    deal_edit: true,
    team_stats: true,
    staff_manage: false,
    settings: false,
    admin_access: false,
    force_reset: false
  },
  'CS': {
    dashboard_view: true,
    dashboard_cs: true,
    dashboard_sales: false,
    dashboard_leader: false,
    lead_view: true,
    lead_add: true,
    lead_edit: true,
    lead_delete: false,
    deal_view_all: false,
    deal_view_own: false,
    deal_edit: false,
    team_stats: false,
    staff_manage: false,
    settings: false,
    admin_access: false,
    force_reset: false
  }
};

/**
 * スクリプトプロパティから値を取得
 */
function getProperty(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

/**
 * Discord Webhook URL取得
 */
function getDiscordWebhook() {
  return getProperty('DISCORD_WEBHOOK_URL');
}

/**
 * リマインド用Discord Webhook URL取得
 */
function getRemindWebhook() {
  return getProperty('NSREMIND_DISCORDWEBHOOK') || getProperty('DISCORD_WEBHOOK_URL');
}

/**
 * プルダウン選択肢を取得（クライアント用）
 * 設定シートから動的に読み取る
 */
function getDropdownOptions() {
  // キャッシュをチェック
  const cacheKey = 'DROPDOWN_OPTIONS_CACHE';
  const cache = CacheService.getScriptCache();
  const cached = cache.get(cacheKey);

  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      // キャッシュが壊れている場合は再取得
    }
  }

  // 設定シートから取得
  const options = getDropdownOptionsFromSheet();

  // キャッシュに保存（10分間）
  try {
    cache.put(cacheKey, JSON.stringify(options), 600);
  } catch (e) {
    // キャッシュ保存エラーは無視
  }

  return options;
}

/**
 * 設定シートからプルダウン選択肢を取得
 */
function getDropdownOptionsFromSheet() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.SETTINGS);

  // シートがない、またはデータがない場合はデフォルト値を返す
  if (!sheet || sheet.getLastRow() < 2 || sheet.getLastColumn() < 1) {
    return DEFAULT_DROPDOWN_OPTIONS;
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const options = {};

  // 各列のデータを取得
  headers.forEach((header, colIndex) => {
    if (!header) return;

    const values = [];
    for (let rowIndex = 1; rowIndex < data.length; rowIndex++) {
      const value = data[rowIndex][colIndex];
      if (value !== '' && value !== null && value !== undefined) {
        values.push(String(value));
      }
    }

    if (values.length > 0) {
      options[header] = values;
    }
  });

  // 取得できなかった項目はデフォルト値で補完
  Object.keys(DEFAULT_DROPDOWN_OPTIONS).forEach(key => {
    if (!options[key] || options[key].length === 0) {
      options[key] = DEFAULT_DROPDOWN_OPTIONS[key];
    }
  });

  return options;
}

/**
 * プルダウンキャッシュをクリア
 */
function clearDropdownCache() {
  const cache = CacheService.getScriptCache();
  cache.remove('DROPDOWN_OPTIONS_CACHE');
  cache.remove('STATUS_OPTIONS_CACHE');
  Logger.log('プルダウンキャッシュをクリアしました');
}

/**
 * ステータス設定のデフォルト値
 * 基本的には設定シートを参照するが、設定シートがない場合のフォールバック
 */
const DEFAULT_STATUS_SETTINGS = {
  // リード段階のステータス（CSが使用）
  LEAD_STATUSES: [
    { value: '新規', order: 1, description: 'リード登録直後' },
    { value: '対応中', order: 2, description: 'CSが対応中' },
    { value: '対象外', order: 3, description: 'リード段階で対象外判定' }
  ],
  // 商談段階のステータス（営業が使用）
  DEAL_STATUSES: [
    { value: 'アサイン確定', order: 1, description: '営業にアサインされた直後' },
    { value: '商談中', order: 2, description: '商談進行中' },
    { value: '見積もり提示', order: 3, description: '見積書送付済み' }
  ],
  // 完了ステータス（共通）
  CLOSED_STATUSES: [
    { value: '成約', order: 1, description: '契約締結' },
    { value: '失注', order: 2, description: '失注確定' },
    { value: '追客', order: 3, description: '再アプローチ対象' },
    { value: '対象外', order: 4, description: '対象外判定' }
  ]
};

/**
 * 設定シートからステータス設定を取得
 * @returns {Object} ステータス設定オブジェクト
 */
function getStatusSettings() {
  // キャッシュをチェック
  const cacheKey = 'STATUS_OPTIONS_CACHE';
  const cache = CacheService.getScriptCache();
  const cached = cache.get(cacheKey);

  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      // キャッシュが壊れている場合は再取得
    }
  }

  // 設定シートから取得
  const settings = getStatusSettingsFromSheet();

  // キャッシュに保存（10分間）
  try {
    cache.put(cacheKey, JSON.stringify(settings), 600);
  } catch (e) {
    // キャッシュ保存エラーは無視
  }

  return settings;
}

/**
 * 設定シートからステータス設定を取得（内部関数）
 */
function getStatusSettingsFromSheet() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.SETTINGS);

  // シートがない場合はデフォルト値を返す
  if (!sheet) {
    return DEFAULT_STATUS_SETTINGS;
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  // 「設定キー」列を探す（新形式の設定シート）
  const keyColIndex = headers.indexOf('設定キー');

  // 新形式の設定シートでない場合はデフォルト値を返す
  if (keyColIndex === -1) {
    return DEFAULT_STATUS_SETTINGS;
  }

  const valueColIndex = headers.indexOf('設定値');
  const descColIndex = headers.indexOf('説明');

  if (valueColIndex === -1) {
    return DEFAULT_STATUS_SETTINGS;
  }

  const result = {
    LEAD_STATUSES: [],
    DEAL_STATUSES: [],
    CLOSED_STATUSES: []
  };

  // データを解析
  for (let i = 1; i < data.length; i++) {
    const key = String(data[i][keyColIndex] || '');
    const value = String(data[i][valueColIndex] || '');
    const desc = descColIndex >= 0 ? String(data[i][descColIndex] || '') : '';

    if (!key || !value) continue;

    // LEAD_STATUS_N の形式
    if (key.startsWith('LEAD_STATUS_')) {
      const order = parseInt(key.replace('LEAD_STATUS_', ''));
      if (!isNaN(order)) {
        result.LEAD_STATUSES.push({ value, order, description: desc });
      }
    }
    // DEAL_STATUS_N の形式
    else if (key.startsWith('DEAL_STATUS_')) {
      const order = parseInt(key.replace('DEAL_STATUS_', ''));
      if (!isNaN(order)) {
        result.DEAL_STATUSES.push({ value, order, description: desc });
      }
    }
    // CLOSED_STATUS_N の形式
    else if (key.startsWith('CLOSED_STATUS_')) {
      const order = parseInt(key.replace('CLOSED_STATUS_', ''));
      if (!isNaN(order)) {
        result.CLOSED_STATUSES.push({ value, order, description: desc });
      }
    }
  }

  // orderでソート
  result.LEAD_STATUSES.sort((a, b) => a.order - b.order);
  result.DEAL_STATUSES.sort((a, b) => a.order - b.order);
  result.CLOSED_STATUSES.sort((a, b) => a.order - b.order);

  // データがない場合はデフォルト値で補完
  if (result.LEAD_STATUSES.length === 0) {
    result.LEAD_STATUSES = DEFAULT_STATUS_SETTINGS.LEAD_STATUSES;
  }
  if (result.DEAL_STATUSES.length === 0) {
    result.DEAL_STATUSES = DEFAULT_STATUS_SETTINGS.DEAL_STATUSES;
  }
  if (result.CLOSED_STATUSES.length === 0) {
    result.CLOSED_STATUSES = DEFAULT_STATUS_SETTINGS.CLOSED_STATUSES;
  }

  return result;
}

/**
 * リード段階のステータス一覧を取得（クライアント用）
 * @returns {Array} ステータス配列 [{value, description}, ...]
 */
function getLeadStatuses() {
  const settings = getStatusSettings();
  return settings.LEAD_STATUSES.map(s => ({
    value: s.value,
    description: s.description
  }));
}

/**
 * 商談段階のステータス一覧を取得（クライアント用）
 * @returns {Array} ステータス配列 [{value, description}, ...]
 */
function getDealStatuses() {
  const settings = getStatusSettings();
  return settings.DEAL_STATUSES.map(s => ({
    value: s.value,
    description: s.description
  }));
}

/**
 * 完了ステータス一覧を取得（クライアント用）
 * @returns {Array} ステータス配列 [{value, description}, ...]
 */
function getClosedStatuses() {
  const settings = getStatusSettings();
  return settings.CLOSED_STATUSES.map(s => ({
    value: s.value,
    description: s.description
  }));
}

/**
 * 全ステータスを取得（クライアント用）
 * @returns {Object} { leadStatuses, dealStatuses, closedStatuses }
 */
function getAllStatuses() {
  return {
    leadStatuses: getLeadStatuses(),
    dealStatuses: getDealStatuses(),
    closedStatuses: getClosedStatuses()
  };
}
