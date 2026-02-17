/**
 * screen.js — スクリーン表示画面のロジック
 * 
 * 【必須制約の実装】
 * 1. Layered SVG System: 3層の透過SVGをz-indexで重ねて表示
 * 2. DOMノード制限: 画面上のアバター数が MAX_AVATARS を超えたら最古から削除
 * 3. Firebase読み取り制限: limitToLast(100) + 当日フィルター
 */

(function () {
  'use strict';

  // ============================================================
  // Constants
  // ============================================================
  const MAX_AVATARS = 50;  // DOMノード制限: 画面上の最大アバター数
  const REMOVE_ANIMATION_MS = 400; // 退場アニメーション時間

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
  // UI Update
  // ============================================================
  function updateStats() {
    const count = avatarMap.size;
    statCount.textContent = count;

    // Empty state
    emptyState.style.display = count === 0 ? 'block' : 'none';

    // DOM limit badge
    domLimitBadge.classList.toggle('active', count >= MAX_AVATARS);
  }

  // ============================================================
  // DOM Node Limit: 最古のアバターを削除
  // ============================================================
  function enforceAvatarLimit() {
    while (avatarMap.size > MAX_AVATARS) {
      // Mapは挿入順なので、最初のエントリが最古
      const oldestKey = avatarMap.keys().next().value;
      removeAvatarFromDOM(oldestKey, true);
    }
  }

  // ============================================================
  // Avatar DOM Operations
  // ============================================================

  /**
   * アバターをDOMに追加
   */
  function addAvatarToDOM(uid, data) {
    // 既に存在する場合は更新
    if (avatarMap.has(uid)) {
      updateAvatarInDOM(uid, data);
      return;
    }

    // コンテナ作成
    const container = document.createElement('div');
    container.className = 'avatar-container';
    container.dataset.uid = uid;

    // アバターラッパー（Layered SVG System の入れ物）
    const wrapper = document.createElement('div');
    wrapper.className = 'avatar-wrapper';
    wrapper.innerHTML = createAvatarHTML(data);

    // ラベル
    const label = document.createElement('div');
    label.className = 'avatar-label';

    const modeText = { work: '🔥 作業中', break: '☕ 休憩中', meeting: '💬 会議中' };
    label.innerHTML = `
      ${modeText[data.mode] || data.mode}
      <br>
      <span class="role-tag">${data.role || 'unknown'}</span>
    `;

    container.appendChild(wrapper);
    container.appendChild(label);

    // DOMに追加
    avatarGrid.appendChild(container);

    // Mapに記録
    avatarMap.set(uid, {
      element: container,
      data: data,
      addedAt: Date.now(),
    });

    // DOMノード制限チェック
    enforceAvatarLimit();
    updateStats();
  }

  /**
   * アバターを更新（色・ロール・モード変更時）
   */
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
      label.innerHTML = `
        ${modeText[data.mode] || data.mode}
        <br>
        <span class="role-tag">${data.role || 'unknown'}</span>
      `;
    }

    entry.data = data;
  }

  /**
   * アバターをDOMから削除
   * @param {string} uid
   * @param {boolean} isLimitRemoval - DOM制限による削除か
   */
  function removeAvatarFromDOM(uid, isLimitRemoval = false) {
    const entry = avatarMap.get(uid);
    if (!entry) return;

    const el = entry.element;

    // 退場アニメーション
    el.classList.add('removing');

    setTimeout(() => {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    }, isLimitRemoval ? 0 : REMOVE_ANIMATION_MS);

    // Mapから即座に削除（アニメーション中でも新規追加のカウントに影響しないように）
    avatarMap.delete(uid);
    updateStats();
  }

  // ============================================================
  // Firebase Realtime Listener
  // ============================================================
  function startListening() {
    listenToUsers(
      // child_added
      (uid, data) => {
        addAvatarToDOM(uid, data);
      },

      // child_changed
      (uid, data) => {
        updateAvatarInDOM(uid, data);
      },

      // child_removed
      (uid) => {
        removeAvatarFromDOM(uid);
      }
    );
  }

  // ============================================================
  // Init
  // ============================================================
  startListening();

})();
