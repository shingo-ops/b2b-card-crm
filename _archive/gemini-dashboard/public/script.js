/**
 * Gemini Usage Dashboard - Frontend Script
 * XSS対策・UI改善適用済み（Gemini監査による改善）
 */

// Auto refresh interval (30 seconds)
const AUTO_REFRESH_INTERVAL = 30000;

// Fetch usage data
async function fetchData() {
  const refreshBtn = document.querySelector('.refresh-btn');
  const refreshBtnText = refreshBtn.querySelector('span');

  refreshBtn.disabled = true;
  if (refreshBtnText) {
    refreshBtnText.textContent = 'Refreshing...';
  }

  try {
    const [usageRes, historyRes] = await Promise.all([
      fetch('/api/usage'),
      fetch('/api/history')
    ]);

    if (!usageRes.ok || !historyRes.ok) {
      throw new Error(`API request failed with status: ${usageRes.status}, ${historyRes.status}`);
    }

    const usage = await usageRes.json();
    const history = await historyRes.json();

    updateUI(usage, history);
    document.getElementById('loading').style.display = 'none';
    document.getElementById('mainContent').style.display = 'block';
  } catch (error) {
    console.error('Error fetching data:', error);
    const loadingEl = document.getElementById('loading');
    loadingEl.innerHTML = '';

    const p1 = document.createElement('p');
    p1.style.color = 'var(--accent-red)';
    p1.textContent = 'Error loading data';

    const p2 = document.createElement('p');
    p2.style.marginTop = '10px';
    p2.style.fontSize = '0.9rem';
    p2.textContent = error.message;

    const btn = document.createElement('button');
    btn.className = 'refresh-btn';
    btn.style.marginTop = '20px';
    btn.onclick = fetchData;

    const btnText = document.createElement('span');
    btnText.textContent = 'Retry';
    btn.appendChild(btnText);

    loadingEl.append(p1, p2, btn);
    loadingEl.style.display = 'block';
    document.getElementById('mainContent').style.display = 'none';

  } finally {
    refreshBtn.disabled = false;
    if (refreshBtnText) {
      refreshBtnText.textContent = 'Refresh';
    }
  }
}

// Update UI with data
function updateUI(usage, history) {
  // Usage values (XSS対策: textContentを使用)
  document.getElementById('usageValue').textContent = usage.daily_count.toLocaleString();
  document.getElementById('usageLimit').textContent = usage.daily_limit.toLocaleString();
  document.getElementById('percentLabel').textContent = `${usage.percent}%`;

  // Progress bar
  const progressBar = document.getElementById('progressBar');
  progressBar.style.width = `${Math.min(usage.percent, 100)}%`;
  progressBar.className = `progress-bar ${usage.alert.level}`;

  // Alert banner
  const alertBanner = document.getElementById('alertBanner');
  const alertMessage = document.getElementById('alertMessage');
  if (usage.alert.level !== 'normal') {
    alertBanner.className = `alert-banner ${usage.alert.level}`;
    alertMessage.textContent = usage.alert.message;
  } else {
    alertBanner.className = 'alert-banner';
  }

  // Rate limit (動的に設定値を使用)
  const rateLimitStatEl = document.querySelector('.card:nth-child(2) .stat-value');
  if (rateLimitStatEl) {
    rateLimitStatEl.innerHTML = `<span id="rateValue">${usage.rate_limit.current}</span> / ${usage.rate_limit.limit}`;
  }
  updateRateLimitBar(usage.rate_limit.current, usage.rate_limit.limit);

  // Reset timer
  document.getElementById('resetTime').textContent =
    `${usage.reset.hours}h ${usage.reset.minutes}m`;

  // Last updated
  const updatedTime = new Date(usage.updated_at);
  document.getElementById('lastUpdated').textContent =
    updatedTime.toLocaleString('ja-JP');

  // History chart
  updateHistoryChart(history.records || []);
}

// Update rate limit visualization
function updateRateLimitBar(current, limit) {
  const container = document.getElementById('rateLimitBar');
  container.innerHTML = '';
  const numSegments = 12;
  const activeSegments = limit > 0 ? Math.ceil((current / limit) * numSegments) : 0;

  for (let i = 0; i < numSegments; i++) {
    const segment = document.createElement('div');
    segment.className = 'segment' + (i < activeSegments ? ' active' : '');
    container.appendChild(segment);
  }
}

// Update history chart (XSS対策: DOM APIを使用)
function updateHistoryChart(records) {
  const chartContainer = document.getElementById('historyChart');
  const labelsContainer = document.getElementById('chartLabels');
  chartContainer.innerHTML = '';
  labelsContainer.innerHTML = '';

  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    last7Days.push(date.toISOString().split('T')[0]);
  }

  const maxCount = Math.max(
    ...last7Days.map(date => (records.find(r => r.date === date) || {}).daily_count || 0),
    100
  );

  last7Days.forEach(date => {
    const record = records.find(r => r.date === date);
    const count = record ? record.daily_count : 0;
    const height = maxCount > 0 ? (count / maxCount) * 100 : 0;

    const bar = document.createElement('div');
    bar.className = 'chart-bar';
    bar.style.height = `${Math.max(height, 2)}%`;

    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = `${count} requests`;
    bar.appendChild(tooltip);

    chartContainer.appendChild(bar);

    const label = document.createElement('span');
    label.textContent = date.slice(5).replace('-', '/');
    labelsContainer.appendChild(label);
  });
}

// Initial load
fetchData();

// Auto refresh
setInterval(fetchData, AUTO_REFRESH_INTERVAL);
