/**
 * Gemini Usage Dashboard Server
 *
 * 環境: 提案（Proposal）
 * 設計: Claude Code + Gemini Pro
 * 作成日: 2026-01-17
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3939;

// ファイルパス
const GEMINI_DIR = path.join(os.homedir(), '.gemini');
const USAGE_FILE = path.join(GEMINI_DIR, 'usage.json');
const CONFIG_FILE = path.join(GEMINI_DIR, 'usage-config.json');
const HISTORY_FILE = path.join(GEMINI_DIR, 'usage-history.json');

// 静的ファイル配信
app.use(express.static(path.join(__dirname, 'public')));

// デフォルト設定
const DEFAULT_CONFIG = {
  daily_limit: 1000,
  warnings: [
    { threshold_percent: 95, type: 'critical' },
    { threshold_percent: 80, type: 'warning' }
  ],
  rate_limit: {
    requests: 50,
    window_seconds: 60
  }
};

// デフォルト使用量
const DEFAULT_USAGE = {
  date: new Date().toISOString().split('T')[0],
  daily_count: 0,
  rate_limit_timestamps: []
};

/**
 * JSONファイルを安全に読み込む
 */
function readJsonFile(filePath, defaultValue) {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
  }
  return defaultValue;
}

/**
 * 履歴を保存
 */
function saveHistory(usage) {
  try {
    let history = readJsonFile(HISTORY_FILE, { records: [] });

    // 今日のレコードを更新または追加
    const today = new Date().toISOString().split('T')[0];
    const existingIndex = history.records.findIndex(r => r.date === today);

    const record = {
      date: today,
      daily_count: usage.daily_count,
      timestamp: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      history.records[existingIndex] = record;
    } else {
      history.records.push(record);
    }

    // 直近30日分のみ保持
    history.records = history.records.slice(-30);

    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
  } catch (error) {
    console.error('Error saving history:', error.message);
  }
}

/**
 * API: 使用量データ取得
 */
app.get('/api/usage', (req, res) => {
  const usage = readJsonFile(USAGE_FILE, DEFAULT_USAGE);
  const config = readJsonFile(CONFIG_FILE, DEFAULT_CONFIG);

  // 日付チェック（日が変わっていたらリセット扱い）
  const today = new Date().toISOString().split('T')[0];
  if (usage.date !== today) {
    usage.date = today;
    usage.daily_count = 0;
    usage.rate_limit_timestamps = [];
  }

  // 履歴保存
  saveHistory(usage);

  // レート制限カウント（直近60秒）
  const now = Math.floor(Date.now() / 1000);
  const cutoff = now - (config.rate_limit?.window_seconds || 60);
  const recentCount = (usage.rate_limit_timestamps || []).filter(ts => ts >= cutoff).length;

  // 使用率計算
  const dailyLimit = config.daily_limit || 1000;
  const percent = Math.round((usage.daily_count / dailyLimit) * 100);

  // アラートレベル判定
  let alertLevel = 'normal';
  let alertMessage = '';

  if (percent >= 100) {
    alertLevel = 'error';
    alertMessage = '日次上限に達しました！';
  } else if (percent >= 95) {
    alertLevel = 'critical';
    alertMessage = '使用量が95%を超えました';
  } else if (percent >= 80) {
    alertLevel = 'warning';
    alertMessage = '使用量が80%を超えました';
  }

  // UTC 0時までの残り時間
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  const resetInMs = tomorrow.getTime() - Date.now();
  const resetInHours = Math.floor(resetInMs / (1000 * 60 * 60));
  const resetInMinutes = Math.floor((resetInMs % (1000 * 60 * 60)) / (1000 * 60));

  res.json({
    date: usage.date,
    daily_count: usage.daily_count,
    daily_limit: dailyLimit,
    percent: percent,
    rate_limit: {
      current: recentCount,
      limit: 60,
      window_seconds: config.rate_limit?.window_seconds || 60
    },
    alert: {
      level: alertLevel,
      message: alertMessage
    },
    reset: {
      hours: resetInHours,
      minutes: resetInMinutes
    },
    config: config,
    updated_at: new Date().toISOString()
  });
});

/**
 * API: 履歴データ取得
 */
app.get('/api/history', (req, res) => {
  const history = readJsonFile(HISTORY_FILE, { records: [] });
  res.json(history);
});

/**
 * API: 設定取得
 */
app.get('/api/config', (req, res) => {
  const config = readJsonFile(CONFIG_FILE, DEFAULT_CONFIG);
  res.json(config);
});

/**
 * API: ヘルスチェック
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    environment: 'proposal',
    version: '1.0.0'
  });
});

// サーバー起動
app.listen(PORT, () => {
  console.log('');
  console.log('====================================');
  console.log('  Gemini Usage Dashboard');
  console.log('  環境: 提案（Proposal）');
  console.log('====================================');
  console.log('');
  console.log(`  URL: http://localhost:${PORT}`);
  console.log('');
  console.log('  Press Ctrl+C to stop');
  console.log('');
});
