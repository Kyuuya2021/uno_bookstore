/**
 * screen.js — スクリーン表示画面のロジック
 * 
 * 【必須制約の実装】
 * 1. Layered SVG System: 3層の透過SVGをz-indexで重ねて表示
 * 2. DOMノード制限: 画面上のアバター数が MAX_AVATARS を超えたら最古から削除
 * 3. Firebase読み取り制限: limitToLast(100) + 当日フィルター
 * 
 * 【新機能】
 * 4. ニックネーム表示
 * 5. 滞在時間のリアルタイム表示（○○分滞在中）
 */

(function () {
  'use strict';

  // ============================================================
  // Constants
  // ============================================================
  const MAX_AVATARS = 50;
  const REMOVE_ANIMATION_MS = 400;
  const STAY_TIME_UPDATE_INTERVAL = 30000; // 30秒ごとに滞在時間を更新

  // ============================================================
  // DOM References
  // ============================================================
  const avatarGrid = document.getElementById('avatar-grid');
  const emptyState = document.getElementById('empty-state');
  const statCount = document.getElementById('stat-count');
  const statTime = document.getElementById('stat-time');
  const domLimitBadge = document.getElementById('dom-limit-badge');

  // ============================================================
  // State: 表示中アバターの管理（挿入順序を保持）
  // ============================================================
  const avatarMap = new Map(); // uid → { element, data, addedAt }

  // ============================================================
  // Clock
  // ============================================================
  function updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    statTime.textContent = `${h}:${m}:${s}`;
  }
  updateClock();
  setInterval(updateClock, 1000);

  // ============================================================
  // Stay Time: 滞在時間の計算とフォーマット
  // ============================================================
  function formatStayTime(timestampMs) {
    const now = Date.now();
    const diffMs = now - timestampMs;
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return 'たった今';
    if (diffMin < 60) return `${diffMin}分滞在中`;
    const h = Math.floor(diffMin / 60);
    const m = diffMin % 60;
    return `${h}時間${m}分滞在中`;
  }

  /**
   * 全アバターの滞在時間を一括更新
   */
  function updateAllStayTimes() {
    avatarMap.forEach((entry) => {
      const stayEl = entry.element.querySelector('.stay-time');
      if (stayEl && entry.data.timestamp) {
        stayEl.textContent = formatStayTime(entry.data.timestamp);
      }
    });
  }

  setInterval(updateAllStayTimes, STAY_TIME_UPDATE_INTERVAL);

  // ============================================================
  // UI Update
  // ============================================================
  function updateStats() {
    const count = avatarMap.size;
    statCount.textContent = count;
    emptyState.style.display = count === 0 ? 'block' : 'none';
    domLimitBadge.classList.toggle('active', count >= MAX_AVATARS);
  }

  // ============================================================
  // DOM Node Limit: 最古のアバターを削除
  // ============================================================
  function enforceAvatarLimit() {
    while (avatarMap.size > MAX_AVATARS) {
      const oldestKey = avatarMap.keys().next().value;
      removeAvatarFromDOM(oldestKey, true);
    }
  }

  // ============================================================
  // HTML escape（XSS対策）
  // ============================================================
  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ============================================================
  // Avatar DOM Operations
  // ============================================================

  function addAvatarToDOM(uid, data) {
    if (avatarMap.has(uid)) {
      updateAvatarInDOM(uid, data);
      return;
    }

    const container = document.createElement('div');
    container.className = 'avatar-container';
    container.dataset.uid = uid;

    const wrapper = document.createElement('div');
    wrapper.className = 'avatar-wrapper';
    wrapper.innerHTML = createAvatarHTML(data);

    const label = document.createElement('div');
    label.className = 'avatar-label';

    const modeText = { work: '🔥 作業中', break: '☕ 休憩中', meeting: '💬 会議中' };
    const nickname = escapeHTML(data.nickname || 'Guest');
    const stayTime = data.timestamp ? formatStayTime(data.timestamp) : '';

    label.innerHTML = `
      <span class="avatar-nickname">${nickname}</span>
      <span class="stay-time">${stayTime}</span>
      <span class="role-tag">${modeText[data.mode] || data.mode}</span>
    `;

    container.appendChild(wrapper);
    container.appendChild(label);
    avatarGrid.appendChild(container);

    avatarMap.set(uid, {
      element: container,
      data: data,
      addedAt: Date.now(),
    });

    enforceAvatarLimit();
    updateStats();
  }

  function updateAvatarInDOM(uid, data) {
    const entry = avatarMap.get(uid);
    if (!entry) return;

    const wrapper = entry.element.querySelector('.avatar-wrapper');
    if (wrapper) {
      wrapper.innerHTML = createAvatarHTML(data);
    }

    const label = entry.element.querySelector('.avatar-label');
    if (label) {
      const modeText = { work: '🔥 作業中', break: '☕ 休憩中', meeting: '💬 会議中' };
      const nickname = escapeHTML(data.nickname || 'Guest');
      const stayTime = data.timestamp ? formatStayTime(data.timestamp) : '';

      label.innerHTML = `
        <span class="avatar-nickname">${nickname}</span>
        <span class="stay-time">${stayTime}</span>
        <span class="role-tag">${modeText[data.mode] || data.mode}</span>
      `;
    }

    entry.data = data;
  }

  function removeAvatarFromDOM(uid, isLimitRemoval = false) {
    const entry = avatarMap.get(uid);
    if (!entry) return;

    const el = entry.element;
    el.classList.add('removing');

    setTimeout(() => {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    }, isLimitRemoval ? 0 : REMOVE_ANIMATION_MS);

    avatarMap.delete(uid);
    updateStats();
  }

  // ============================================================
  // Firebase Realtime Listener
  // ============================================================
  function startListening() {
    listenToUsers(
      (uid, data) => { addAvatarToDOM(uid, data); },
      (uid, data) => { updateAvatarInDOM(uid, data); },
      (uid) => { removeAvatarFromDOM(uid); }
    );
  }

  // ============================================================
  // Init
  // ============================================================
  startListening();

})();
