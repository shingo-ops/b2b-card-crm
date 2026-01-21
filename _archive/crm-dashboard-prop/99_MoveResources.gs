/**
 * Google Driveリソース移動スクリプト
 *
 * 目的: 各環境のスプレッドシート・GASプロジェクトを正しいフォルダに移動
 * 関連: TROUBLE-027（設定のみ更新で完了扱い）の対策
 *
 * 使用方法:
 * 1. このコードをGASエディタに貼り付け
 * 2. checkCurrentLocations() を実行して現状確認
 * 3. moveResourcesToCorrectFolders() を実行して移動
 */

// 環境設定（env-config.jsonから）
const ENV_CONFIG = {
  prod: {
    name: "本番",
    driveFolderId: "1JIPeqiT_2ucBUK875sQBcuSYHkT-GtdD",
    spreadsheetId: "1kF-o4jCrbQePktWaFEBvWhJJjRXhkuw5-AcISa4ClAk",
    scriptId: "1CQiLiFG8N77uYzlo3UNgAwml9_8mAJYAmfe4thp3RGsvbiwoaS-kS7X0",
    namingPrefix: ""
  },
  dev: {
    name: "開発",
    driveFolderId: "1rV7ZKxZZtCubafp-9lMyCIPgmaAbJjh_",
    spreadsheetId: "1EpqO7HL3o7jTbkvZuHqf8LMU4_RwQTJM8PyRx6Qj6uM",
    scriptId: "1TW14Q78eA1C5MyXdssxACZR4C5mavzjw9SjNLGzdHNCL1QteWuWKg9s7",
    namingPrefix: "[開発]"
  },
  prop: {
    name: "提案",
    driveFolderId: "1kDfjsZt6k6iXPRC6QRbjM6Kyfz2I1Bm5",
    spreadsheetId: "1k2utJ6uoQg2rRDPBgtdxBnkdzGD3ByAq34oyGqbPuYg",
    scriptId: "1l-NZT9RZrCxlwDa2NT9Op7rxHvLAgZYmqUVvYB_TEZEKBx-A2JKl1lWw",
    namingPrefix: "[提案]"
  }
};

/**
 * 現在のリソース配置を確認
 */
function checkCurrentLocations() {
  const results = [];

  for (const [envKey, env] of Object.entries(ENV_CONFIG)) {
    results.push(`\n=== ${env.name}環境 ===`);

    // スプレッドシートの現在位置を確認
    try {
      const ss = DriveApp.getFileById(env.spreadsheetId);
      const parents = ss.getParents();
      const parentNames = [];
      while (parents.hasNext()) {
        const parent = parents.next();
        parentNames.push(`${parent.getName()} (${parent.getId()})`);
      }

      const targetFolder = DriveApp.getFolderById(env.driveFolderId);
      const isCorrect = parentNames.some(p => p.includes(env.driveFolderId));

      results.push(`スプレッドシート: ${ss.getName()}`);
      results.push(`  現在のフォルダ: ${parentNames.join(", ") || "ルート"}`);
      results.push(`  目標フォルダ: ${targetFolder.getName()} (${env.driveFolderId})`);
      results.push(`  状態: ${isCorrect ? "✅ 正しい位置" : "❌ 移動が必要"}`);
    } catch (e) {
      results.push(`スプレッドシート: エラー - ${e.message}`);
    }
  }

  const output = results.join("\n");
  Logger.log(output);
  return output;
}

/**
 * リソースを正しいフォルダに移動
 */
function moveResourcesToCorrectFolders() {
  const results = [];
  results.push("=== リソース移動開始 ===");
  results.push(`実行日時: ${new Date().toISOString()}`);

  for (const [envKey, env] of Object.entries(ENV_CONFIG)) {
    results.push(`\n--- ${env.name}環境 ---`);

    try {
      const file = DriveApp.getFileById(env.spreadsheetId);
      const targetFolder = DriveApp.getFolderById(env.driveFolderId);

      // 現在の親フォルダを取得
      const currentParents = file.getParents();
      let alreadyInTarget = false;
      const parentsToRemove = [];

      while (currentParents.hasNext()) {
        const parent = currentParents.next();
        if (parent.getId() === env.driveFolderId) {
          alreadyInTarget = true;
        } else {
          parentsToRemove.push(parent);
        }
      }

      if (alreadyInTarget && parentsToRemove.length === 0) {
        results.push(`${file.getName()}: 既に正しいフォルダに配置済み`);
        continue;
      }

      // 目標フォルダに追加（まだ入っていない場合）
      if (!alreadyInTarget) {
        targetFolder.addFile(file);
        results.push(`${file.getName()}: ${targetFolder.getName()}に追加`);
      }

      // 他のフォルダから削除
      for (const parent of parentsToRemove) {
        parent.removeFile(file);
        results.push(`${file.getName()}: ${parent.getName()}から削除`);
      }

      results.push(`✅ ${file.getName()}: 移動完了`);

    } catch (e) {
      results.push(`❌ エラー: ${e.message}`);
    }
  }

  results.push("\n=== 移動完了 ===");

  const output = results.join("\n");
  Logger.log(output);
  return output;
}

/**
 * リソース名を命名規則に従って更新
 */
function updateResourceNames() {
  const results = [];
  results.push("=== リソース名更新開始 ===");

  for (const [envKey, env] of Object.entries(ENV_CONFIG)) {
    results.push(`\n--- ${env.name}環境 ---`);

    try {
      const ss = SpreadsheetApp.openById(env.spreadsheetId);
      const currentName = ss.getName();

      // 期待される名前形式
      const baseName = "CRM-Dashboard";
      const expectedName = env.namingPrefix
        ? `${env.namingPrefix}${baseName}-${envKey.toUpperCase()}`
        : baseName;

      if (currentName === expectedName) {
        results.push(`${currentName}: 名前は正しい`);
      } else {
        results.push(`現在: ${currentName}`);
        results.push(`期待: ${expectedName}`);
        // 実際の名前変更は手動確認後に実行
        // ss.rename(expectedName);
        results.push(`⚠️ 名前変更が必要（手動で確認後にコメントアウト解除して実行）`);
      }

    } catch (e) {
      results.push(`❌ エラー: ${e.message}`);
    }
  }

  const output = results.join("\n");
  Logger.log(output);
  return output;
}

/**
 * 全チェックを実行（移動は行わない）
 */
function runAllChecks() {
  let output = "";
  output += checkCurrentLocations();
  output += "\n\n";
  output += updateResourceNames();
  return output;
}
