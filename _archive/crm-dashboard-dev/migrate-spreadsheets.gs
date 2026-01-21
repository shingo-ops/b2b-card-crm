/**
 * 3環境スプレッドシート移動・リネームスクリプト
 *
 * 【実行方法】
 * 1. このスクリプトをGASエディタに貼り付け
 * 2. migrateAllSpreadsheets() を実行
 * 3. 権限を許可
 *
 * 【対象】
 * - 開発環境（DEV）
 * - 提案環境（PROP）
 */

// ===== 設定 =====

const CONFIG = {
  // 移動先フォルダID
  folders: {
    DEV: '1rV7ZKxZZtCubafp-9lMyCIPgmaAbJjh_',   // 開発
    PROP: '1kDfjsZt6k6iXPRC6QRbjM6Kyfz2I1Bm5'   // 提案
  },

  // スプレッドシートID
  spreadsheets: {
    DEV: '1EpqO7HL3o7jTbkvZuHqf8LMU4_RwQTJM8PyRx6Qj6uM',
    PROP: '18sz_gkOAHqkJbpBkuvaDJbepc-X8dzErqUWa4ao395Q'
  },

  // プレフィックス
  prefixes: {
    DEV: '[開発]',
    PROP: '[提案]'
  }
};

// ===== メイン関数 =====

/**
 * 全スプレッドシートを移動・リネーム（DEV + PROP）
 */
function migrateAllSpreadsheets() {
  const results = [];

  // 開発
  results.push(migrateSpreadsheet('DEV'));

  // 提案
  results.push(migrateSpreadsheet('PROP'));

  // 結果サマリー
  Logger.log('\n===== 実行結果 =====');
  results.forEach(r => {
    if (r) {
      Logger.log(`${r.env}: ${r.success ? '✅ 成功' : '❌ 失敗'} - ${r.message}`);
    }
  });
}

/**
 * 個別スプレッドシートを移動・リネーム
 */
function migrateSpreadsheet(env) {
  const spreadsheetId = CONFIG.spreadsheets[env];
  const targetFolderId = CONFIG.folders[env];
  const prefix = CONFIG.prefixes[env];

  if (!spreadsheetId) {
    return { env, success: false, message: 'スプレッドシートID未設定' };
  }

  try {
    // スプレッドシート取得
    const file = DriveApp.getFileById(spreadsheetId);
    const originalName = file.getName();

    // 既にプレフィックスがある場合はスキップ
    if (originalName.startsWith(prefix)) {
      Logger.log(`${env}: 既にプレフィックス付き - ${originalName}`);
    } else {
      // リネーム
      const newName = prefix + originalName;
      file.setName(newName);
      Logger.log(`${env}: リネーム完了 - ${originalName} → ${newName}`);
    }

    // 現在のフォルダから削除して新しいフォルダに追加（移動）
    const targetFolder = DriveApp.getFolderById(targetFolderId);
    const currentParents = file.getParents();

    // 既に正しいフォルダにあるかチェック
    let alreadyInTarget = false;
    while (currentParents.hasNext()) {
      const parent = currentParents.next();
      if (parent.getId() === targetFolderId) {
        alreadyInTarget = true;
        break;
      }
    }

    if (alreadyInTarget) {
      Logger.log(`${env}: 既に正しいフォルダに配置済み`);
    } else {
      // 移動
      targetFolder.addFile(file);

      // 元のフォルダから削除
      const parentsToRemove = file.getParents();
      while (parentsToRemove.hasNext()) {
        const parent = parentsToRemove.next();
        if (parent.getId() !== targetFolderId) {
          parent.removeFile(file);
        }
      }
      Logger.log(`${env}: フォルダ移動完了`);
    }

    return {
      env,
      success: true,
      message: `${file.getName()} を ${targetFolder.getName()} に配置`
    };

  } catch (e) {
    Logger.log(`${env}: エラー - ${e.message}`);
    return { env, success: false, message: e.message };
  }
}

// ===== ユーティリティ関数 =====

/**
 * 設定確認（実行前チェック用）
 */
function checkConfig() {
  Logger.log('===== 設定確認 =====\n');

  Logger.log('【移動先フォルダ】');
  Object.entries(CONFIG.folders).forEach(([env, id]) => {
    try {
      const folder = DriveApp.getFolderById(id);
      Logger.log(`${env}: ✅ ${folder.getName()} (${id})`);
    } catch (e) {
      Logger.log(`${env}: ❌ アクセス不可 (${id})`);
    }
  });

  Logger.log('\n【スプレッドシート】');
  Object.entries(CONFIG.spreadsheets).forEach(([env, id]) => {
    if (!id) {
      Logger.log(`${env}: ⚠️ 未設定`);
      return;
    }
    try {
      const file = DriveApp.getFileById(id);
      Logger.log(`${env}: ✅ ${file.getName()} (${id})`);
    } catch (e) {
      Logger.log(`${env}: ❌ アクセス不可 (${id})`);
    }
  });
}
