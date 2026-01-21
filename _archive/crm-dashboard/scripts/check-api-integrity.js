#!/usr/bin/env node
/**
 * API整合性チェックスクリプト
 *
 * HTMLファイルから google.script.run.xxx() の呼び出しを抽出し、
 * WebApp.gs（およびConfig.gs）に対応する関数が存在するかチェックする。
 *
 * 使い方:
 *   node scripts/check-api-integrity.js
 *   npm run check
 */

const fs = require('fs');
const path = require('path');

// 設定
const HTML_DIR = path.join(__dirname, '..');
const GAS_FILES = [
  path.join(__dirname, '..', 'WebApp.gs'),
  path.join(__dirname, '..', 'Config.gs'),
  path.join(__dirname, '..', 'SheetService.gs'),
  path.join(__dirname, '..', 'ArchiveService.gs'),
  path.join(__dirname, '..', 'AlertService.gs'),
  path.join(__dirname, '..', 'AssignService.gs'),
  path.join(__dirname, '..', 'BadgeService.gs'),
  path.join(__dirname, '..', 'BuddyFeedbackService.gs'),
  path.join(__dirname, '..', 'DashboardService.gs'),
  path.join(__dirname, '..', 'DealReportService.gs'),
  path.join(__dirname, '..', 'NotificationService.gs'),
  path.join(__dirname, '..', 'ProspectRank.gs'),
  path.join(__dirname, '..', 'ReminderService.gs'),
  path.join(__dirname, '..', 'ReportService.gs'),
  path.join(__dirname, '..', 'ShiftService.gs'),
  path.join(__dirname, '..', 'Triggers.gs'),
  path.join(__dirname, '..', 'SetupIntegratedSheet.gs'),
  path.join(__dirname, '..', 'SetupDealReport.gs'),
  path.join(__dirname, '..', 'Code.gs')
];

// HTMLファイルからgoogle.script.run呼び出しを抽出
function extractApiCalls(htmlDir) {
  const calls = [];
  const files = fs.readdirSync(htmlDir).filter(f => f.endsWith('.html'));

  files.forEach(file => {
    const content = fs.readFileSync(path.join(htmlDir, file), 'utf8');

    // google.script.run.xxx( または google.script.run.withXxx().xxx( をマッチ
    // パターン1: .getLeads(
    // パターン2: .withSuccessHandler(...).withFailureHandler(...).getLeads(
    const regex = /google\.script\.run(?:\.with\w+\([^)]*\))*\.(\w+)\s*\(/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      // 行番号を取得
      const beforeMatch = content.substring(0, match.index);
      const lineNumber = (beforeMatch.match(/\n/g) || []).length + 1;

      calls.push({
        function: match[1],
        file: file,
        line: lineNumber
      });
    }
  });

  // 重複を除去（ファイル名と関数名の組み合わせで）
  const unique = [];
  const seen = new Set();
  calls.forEach(call => {
    const key = `${call.file}:${call.function}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(call);
    }
  });

  return unique;
}

// GASファイルから公開関数を抽出
function extractGasFunctions(gasFiles) {
  const functions = new Set();

  gasFiles.forEach(gasFile => {
    if (!fs.existsSync(gasFile)) {
      console.warn(`Warning: ${gasFile} が見つかりません`);
      return;
    }

    const content = fs.readFileSync(gasFile, 'utf8');

    // function xxx( をマッチ（行頭から始まるもの）
    const regex = /^function\s+(\w+)\s*\(/gm;
    let match;
    while ((match = regex.exec(content)) !== null) {
      functions.add(match[1]);
    }
  });

  return functions;
}

// メイン処理
function main() {
  console.log('========================================');
  console.log('  API整合性チェック');
  console.log('========================================\n');

  // API呼び出しを抽出
  console.log('1. HTMLファイルからAPI呼び出しを抽出中...');
  const apiCalls = extractApiCalls(HTML_DIR);
  console.log(`   ${apiCalls.length} 件の呼び出しを検出\n`);

  // GAS関数を抽出
  console.log('2. GASファイルから関数を抽出中...');
  const gasFunctions = extractGasFunctions(GAS_FILES);
  console.log(`   ${gasFunctions.size} 件の関数を検出\n`);

  // 整合性チェック
  console.log('3. 整合性チェック中...\n');

  const errors = [];
  const warnings = [];

  apiCalls.forEach(call => {
    if (!gasFunctions.has(call.function)) {
      errors.push({
        file: call.file,
        line: call.line,
        function: call.function
      });
    }
  });

  // 結果出力
  if (errors.length > 0) {
    console.log('----------------------------------------');
    console.log('  エラー: 存在しない関数の呼び出し');
    console.log('----------------------------------------\n');

    errors.forEach(err => {
      console.error(`  ${err.file}:${err.line}`);
      console.error(`    関数 "${err.function}" が GASファイルに存在しません\n`);
    });

    console.log('========================================');
    console.log('  チェック失敗');
    console.log('========================================');
    console.log('\n修正方法:');
    console.log('  1. WebApp.gs に該当関数を追加する');
    console.log('  2. または、HTMLファイルの呼び出しを既存の関数名に修正する\n');

    process.exit(1);
  } else {
    console.log('========================================');
    console.log('  チェック成功');
    console.log('========================================');
    console.log('\n全ての呼び出しに対応する関数が存在します。\n');

    // 呼び出し一覧を表示（オプション）
    if (process.argv.includes('--verbose') || process.argv.includes('-v')) {
      console.log('検出されたAPI呼び出し:');
      apiCalls.forEach(call => {
        console.log(`  ${call.file}: ${call.function}()`);
      });
      console.log('');
    }

    process.exit(0);
  }
}

main();
