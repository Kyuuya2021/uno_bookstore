/**
 * dashboard.js — 管理者向け統計ダッシュボード
 * 
 * Firebase history コレクションから来訪者データを集計し、
 * CSSベースの棒グラフで可視化する。
 */

(function () {
  'use strict';

  // ============================================================
  // DOM References
  // ============================================================
  const todayCountEl = document.getElementById('today-count');
  const currentOnlineEl = document.getElementById('current-online');
  const weekTotalEl = document.getElementById('week-total');
  const peakHourEl = document.getElementById('peak-hour');
  const weeklyChartEl = document.getElementById('weekly-chart');
  const hourlyChartEl = document.getElementById('hourly-chart');
  const roleBreakdownEl = document.getElementById('role-breakdown');
  const visitorListEl = document.getElementById('visitor-list');

  // ============================================================
  // HTML escape
  // ============================================================
  function esc(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ============================================================
  // Init: 匿名認証してからデータ取得
  // ============================================================
  async function init() {
    try {
      await signInAnonymously();
      await loadDashboard();
      listenToOnlineCount();
    } catch (error) {
      console.error('Dashboard init error:', error);
      visitorListEl.innerHTML = '<p class="dash-empty">データの読み込みに失敗しました</p>';
    }
  }

  // ============================================================
  // Online Count: リアルタイムのオンライン数
  // ============================================================
  function listenToOnlineCount() {
    const todayStart = getTodayStartTimestamp();

    db.ref('users')
      .orderByChild('timestamp')
      .startAt(todayStart)
      .on('value', (snapshot) => {
        const count = snapshot.numChildren();
        currentOnlineEl.textContent = count;
      });
  }

  // ============================================================
  // Main Dashboard Load
  // ============================================================
  async function loadDashboard() {
    const historyByDate = await getHistoryForDays(7);
    const dates = Object.keys(historyByDate).sort();
    const todayStr = getTodayDateString();
    const todayRecords = historyByDate[todayStr] || [];

    // --- Summary Cards ---
    todayCountEl.textContent = todayRecords.length;

    let weekTotal = 0;
    dates.forEach(d => { weekTotal += historyByDate[d].length; });
    weekTotalEl.textContent = weekTotal;

    // Peak hour (today)
    const hourCounts = new Array(24).fill(0);
    todayRecords.forEach(r => {
      const h = new Date(r.checkinAt).getHours();
      hourCounts[h]++;
    });
    const peakHourIdx = hourCounts.indexOf(Math.max(...hourCounts));
    peakHourEl.textContent = todayRecords.length > 0
      ? `${peakHourIdx}:00 - ${peakHourIdx + 1}:00`
      : '--';

    // --- Weekly Bar Chart ---
    renderWeeklyChart(dates, historyByDate);

    // --- Hourly Bar Chart ---
    renderHourlyChart(hourCounts);

    // --- Role Breakdown ---
    renderRoleBreakdown(todayRecords);

    // --- Recent Visitors ---
    renderVisitorList(todayRecords);
  }

  // ============================================================
  // Charts: CSS-based bar charts (no external library)
  // ============================================================

  function renderWeeklyChart(dates, historyByDate) {
    const counts = dates.map(d => historyByDate[d].length);
    const max = Math.max(...counts, 1);

    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];

    let html = '<div class="bar-chart">';
    dates.forEach((date, i) => {
      const count = counts[i];
      const pct = (count / max) * 100;
      const d = new Date(date + 'T00:00:00');
      const dayLabel = `${d.getMonth() + 1}/${d.getDate()}(${dayNames[d.getDay()]})`;
      const isToday = date === getTodayDateString();

      html += `
        <div class="bar-group${isToday ? ' bar-today' : ''}">
          <div class="bar-value">${count}</div>
          <div class="bar-track">
            <div class="bar-fill" style="height:${pct}%"></div>
          </div>
          <div class="bar-label">${dayLabel}</div>
        </div>
      `;
    });
    html += '</div>';
    weeklyChartEl.innerHTML = html;
  }

  function renderHourlyChart(hourCounts) {
    const max = Math.max(...hourCounts, 1);
    const now = new Date().getHours();

    let html = '<div class="bar-chart bar-chart-hourly">';
    for (let h = 7; h <= 23; h++) {
      const count = hourCounts[h];
      const pct = (count / max) * 100;
      const isCurrent = h === now;

      html += `
        <div class="bar-group bar-group-sm${isCurrent ? ' bar-today' : ''}">
          <div class="bar-value">${count || ''}</div>
          <div class="bar-track">
            <div class="bar-fill" style="height:${pct}%"></div>
          </div>
          <div class="bar-label">${h}</div>
        </div>
      `;
    }
    html += '</div>';
    hourlyChartEl.innerHTML = html;
  }

  function renderRoleBreakdown(records) {
    const roleCount = {};
    records.forEach(r => {
      roleCount[r.role] = (roleCount[r.role] || 0) + 1;
    });

    const roleLabels = {
      freelance: '💻 Freelance',
      student: '📖 Student',
      designer: '🎨 Designer',
      engineer: '⚙️ Engineer',
      writer: '✍️ Writer',
    };

    const total = records.length || 1;

    let html = '';
    Object.entries(roleLabels).forEach(([key, label]) => {
      const count = roleCount[key] || 0;
      const pct = Math.round((count / total) * 100);
      html += `
        <div class="role-row">
          <span class="role-row-label">${label}</span>
          <div class="role-bar-track">
            <div class="role-bar-fill" style="width:${pct}%"></div>
          </div>
          <span class="role-row-count">${count}人 (${pct}%)</span>
        </div>
      `;
    });

    roleBreakdownEl.innerHTML = html || '<p class="dash-empty">データなし</p>';
  }

  function renderVisitorList(records) {
    if (records.length === 0) {
      visitorListEl.innerHTML = '<p class="dash-empty">本日のチェックインはまだありません</p>';
      return;
    }

    const sorted = records.slice().sort((a, b) => b.checkinAt - a.checkinAt);
    const display = sorted.slice(0, 20);

    let html = '<div class="visitor-table">';
    html += `
      <div class="visitor-row visitor-header">
        <span>時刻</span><span>ニックネーム</span><span>ロール</span><span>カラー</span>
      </div>
    `;

    display.forEach(r => {
      const time = new Date(r.checkinAt);
      const timeStr = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
      html += `
        <div class="visitor-row">
          <span>${timeStr}</span>
          <span>${esc(r.nickname || 'Guest')}</span>
          <span>${r.role}</span>
          <span><span class="color-dot color-${r.color}"></span>${r.color}</span>
        </div>
      `;
    });

    html += '</div>';
    visitorListEl.innerHTML = html;
  }

  // ============================================================
  // Start
  // ============================================================
  init();

})();
