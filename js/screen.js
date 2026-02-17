/**
 * screen.js — スクリーン表示画面のロジック
 * 
 * レイアウト:
 *   上部: カルーセル（イベント情報・おすすめ本を自動ローテーション）
 *   下部: アバター歩行エリア（ランダムに歩き回る）
 */

(function () {
  'use strict';

  const DEBUG = true;
  function log(label, ...args) {
    if (DEBUG) console.log(`[screen.js] ${label}`, ...args);
  }

  // ============================================================
  // Constants
  // ============================================================
  const MAX_AVATARS = 50;
  const REMOVE_ANIMATION_MS = 400;
  const STAY_TIME_UPDATE_INTERVAL = 30000;
  const CAROUSEL_INTERVAL = 6000;
  const WANDER_MIN_DELAY = 6000;
  const WANDER_MAX_DELAY = 14000;
  const AVATAR_WIDTH = 120;
  const AVATAR_HEIGHT = 175;

  // ============================================================
  // DOM References
  // ============================================================
  const walkZone = document.getElementById('avatar-walk-zone');
  const emptyState = document.getElementById('empty-state');
  const statCount = document.getElementById('stat-count');
  const statTime = document.getElementById('stat-time');
  const domLimitBadge = document.getElementById('dom-limit-badge');
  const infoArea = document.getElementById('screen-info-area');
  const walkArea = document.getElementById('screen-walk-area');
  const carouselSlides = document.getElementById('carousel-slides');
  const carouselDots = document.getElementById('carousel-dots');

  // ============================================================
  // State
  // ============================================================
  const avatarMap = new Map();
  let carouselItems = [];
  let carouselIndex = 0;
  let carouselTimer = null;

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
  // Stay Time
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
  // DOM Node Limit
  // ============================================================
  function enforceAvatarLimit() {
    while (avatarMap.size > MAX_AVATARS) {
      const oldestKey = avatarMap.keys().next().value;
      removeAvatarFromDOM(oldestKey, true);
    }
  }

  // ============================================================
  // HTML escape
  // ============================================================
  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ============================================================
  // Entrance Sound Effect (single AudioContext reused)
  // ============================================================
  let sharedAudioCtx = null;

  function playEntranceSound() {
    try {
      if (!sharedAudioCtx) {
        sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = sharedAudioCtx;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.08);
      osc.frequency.exponentialRampToValueAtTime(1047, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      // silently ignore
    }
  }

  // ============================================================
  // Walk Zone Bounds
  // ============================================================
  function getWalkBounds() {
    const rect = walkZone.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      maxX: Math.max(0, rect.width - AVATAR_WIDTH),
      maxY: Math.max(0, rect.height - AVATAR_HEIGHT),
    };
  }

  function randomPosition() {
    const bounds = getWalkBounds();
    return {
      x: Math.random() * bounds.maxX,
      y: Math.random() * bounds.maxY,
    };
  }

  // ============================================================
  // Avatar Wandering System
  // ============================================================
  function startWandering(uid) {
    const entry = avatarMap.get(uid);
    if (!entry) return;

    const wander = () => {
      const currentEntry = avatarMap.get(uid);
      if (!currentEntry) return;

      const el = currentEntry.element;
      const bounds = getWalkBounds();
      if (bounds.width === 0) return;

      const targetX = Math.random() * bounds.maxX;
      const targetY = Math.random() * bounds.maxY;

      const currentX = parseFloat(el.style.left) || 0;
      el.classList.toggle('facing-left', targetX < currentX);

      el.classList.remove('idle');
      el.classList.add('walking');

      el.style.left = targetX + 'px';
      el.style.top = targetY + 'px';

      const moveDuration = 8000;
      setTimeout(() => {
        if (!avatarMap.has(uid)) return;
        el.classList.remove('walking');
        el.classList.add('idle');
      }, moveDuration);

      const nextDelay = WANDER_MIN_DELAY + Math.random() * (WANDER_MAX_DELAY - WANDER_MIN_DELAY);
      currentEntry.wanderTimer = setTimeout(wander, moveDuration + nextDelay);
    };

    const initialDelay = 1000 + Math.random() * 2000;
    entry.wanderTimer = setTimeout(wander, initialDelay);
  }

  function stopWandering(uid) {
    const entry = avatarMap.get(uid);
    if (entry && entry.wanderTimer) {
      clearTimeout(entry.wanderTimer);
      entry.wanderTimer = null;
    }
  }

  // ============================================================
  // Avatar DOM Operations
  // ============================================================

  function addAvatarToDOM(uid, data) {
    log('ADD', uid, data);

    if (avatarMap.has(uid)) {
      updateAvatarInDOM(uid, data);
      return;
    }

    const pos = randomPosition();

    const container = document.createElement('div');
    container.className = 'avatar-container entering';
    container.dataset.uid = uid;
    container.style.left = pos.x + 'px';
    container.style.top = pos.y + 'px';

    const wrapper = document.createElement('div');
    wrapper.className = 'avatar-wrapper';
    wrapper.innerHTML = createAvatarHTML(data);

    const label = document.createElement('div');
    label.className = 'avatar-label';

    const modeText = { work: '作業中', break: '休憩中', meeting: '会議中' };
    const nickname = escapeHTML(data.nickname || 'Guest');
    const stayTime = data.timestamp ? formatStayTime(data.timestamp) : '';

    label.innerHTML = `
      <span class="avatar-nickname">${nickname}</span>
      <span class="stay-time">${stayTime}</span>
      <span class="role-tag">${modeText[data.mode] || data.mode}</span>
    `;

    container.appendChild(wrapper);
    container.appendChild(label);
    walkZone.appendChild(container);

    setTimeout(() => {
      container.classList.remove('entering');
      container.classList.add('idle');
    }, 600);

    playEntranceSound();

    avatarMap.set(uid, {
      element: container,
      data: data,
      addedAt: Date.now(),
      wanderTimer: null,
    });

    // Clear any floating bubble for this user now that they have an avatar
    const existingFloating = floatingBubbleMap.get(uid);
    if (existingFloating && existingFloating.parentNode) {
      existingFloating.remove();
      floatingBubbleMap.delete(uid);
    }

    startWandering(uid);
    enforceAvatarLimit();
    updateStats();
  }

  function updateAvatarInDOM(uid, data) {
    log('UPDATE', uid, data);
    const entry = avatarMap.get(uid);
    if (!entry) return;

    const wrapper = entry.element.querySelector('.avatar-wrapper');
    if (wrapper) {
      wrapper.innerHTML = createAvatarHTML(data);
    }

    const label = entry.element.querySelector('.avatar-label');
    if (label) {
      const modeText = { work: '作業中', break: '休憩中', meeting: '会議中' };
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
    log('REMOVE', uid, 'isLimitRemoval:', isLimitRemoval);

    const entry = avatarMap.get(uid);
    if (!entry) return;

    stopWandering(uid);

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
  // Carousel System
  // ============================================================
  function buildCarouselSlides(events, books) {
    const todayStr = getTodayDateString();
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    const slides = [];

    const activeEvents = (events || []).filter(e => e.active && e.date >= todayStr);
    activeEvents.sort((a, b) => a.date.localeCompare(b.date));

    activeEvents.slice(0, 5).forEach(ev => {
      const d = new Date(ev.date + 'T00:00:00');
      const dateLabel = `${d.getMonth() + 1}/${d.getDate()}(${dayNames[d.getDay()]})`;
      const isToday = ev.date === todayStr;

      slides.push({
        type: 'event',
        isToday,
        dateLabel,
        time: ev.time || '',
        title: ev.title,
        description: ev.description || '',
        imageUrl: ev.imageUrl || '',
      });
    });

    const activeBooks = (books || []).filter(b => b.active);
    activeBooks.slice(0, 5).forEach(bk => {
      slides.push({
        type: 'book',
        title: bk.title,
        author: bk.author || '',
        genre: bk.genre || '',
        comment: bk.comment || '',
        imageUrl: bk.imageUrl || '',
      });
    });

    return slides;
  }

  function renderCarousel() {
    if (carouselItems.length === 0) {
      infoArea.classList.add('hidden');
      walkArea.classList.add('fullscreen');
      carouselSlides.innerHTML = '';
      carouselDots.innerHTML = '';
      return;
    }

    infoArea.classList.remove('hidden');
    walkArea.classList.remove('fullscreen');

    let slidesHTML = '';
    let dotsHTML = '';

    carouselItems.forEach((item, i) => {
      const activeClass = i === 0 ? ' active' : '';

      if (item.type === 'event') {
        const typeClass = item.isToday ? 'carousel-type-today' : 'carousel-type-event';
        const typeLabel = item.isToday ? 'TODAY' : 'EVENT';

        slidesHTML += `
          <div class="carousel-slide carousel-slide-event${activeClass}" data-index="${i}">
            ${item.imageUrl ? `<div class="carousel-slide-img"><img src="${escapeHTML(item.imageUrl)}" alt="${escapeHTML(item.title)}"></div>` : ''}
            <div class="carousel-slide-body">
              <span class="carousel-slide-type ${typeClass}">${typeLabel}</span>
              <div class="carousel-slide-date">${escapeHTML(item.dateLabel)}${item.time ? ' ' + escapeHTML(item.time) : ''}</div>
              <div class="carousel-slide-title">${escapeHTML(item.title)}</div>
              ${item.description ? `<div class="carousel-slide-desc">${escapeHTML(item.description)}</div>` : ''}
            </div>
          </div>
        `;
      } else {
        slidesHTML += `
          <div class="carousel-slide carousel-slide-event${activeClass}" data-index="${i}">
            ${item.imageUrl ? `<div class="carousel-slide-img"><img src="${escapeHTML(item.imageUrl)}" alt="${escapeHTML(item.title)}"></div>` : ''}
            <div class="carousel-slide-body">
              <span class="carousel-slide-type carousel-type-book">BOOK</span>
              ${item.genre ? `<span class="carousel-slide-genre">${escapeHTML(item.genre)}</span>` : ''}
              <div class="carousel-slide-title">${escapeHTML(item.title)}</div>
              ${item.author ? `<div class="carousel-slide-meta">${escapeHTML(item.author)}</div>` : ''}
              ${item.comment ? `<div class="carousel-slide-desc">${escapeHTML(item.comment)}</div>` : ''}
            </div>
          </div>
        `;
      }

      dotsHTML += `<button class="carousel-dot${activeClass}" data-index="${i}"></button>`;
    });

    carouselSlides.innerHTML = slidesHTML;
    carouselDots.innerHTML = dotsHTML;

    carouselDots.querySelectorAll('.carousel-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        goToSlide(parseInt(dot.dataset.index, 10));
        resetCarouselTimer();
      });
    });

    carouselIndex = 0;
    resetCarouselTimer();
  }

  function goToSlide(index) {
    const slides = carouselSlides.querySelectorAll('.carousel-slide');
    const dots = carouselDots.querySelectorAll('.carousel-dot');
    if (slides.length === 0) return;

    carouselIndex = index % slides.length;

    slides.forEach((s, i) => s.classList.toggle('active', i === carouselIndex));
    dots.forEach((d, i) => d.classList.toggle('active', i === carouselIndex));
  }

  function nextSlide() {
    if (carouselItems.length === 0) return;
    goToSlide(carouselIndex + 1);
  }

  function resetCarouselTimer() {
    if (carouselTimer) clearInterval(carouselTimer);
    carouselTimer = setInterval(nextSlide, CAROUSEL_INTERVAL);
  }

  // ============================================================
  // Firebase Realtime Listener
  // ============================================================
  function startListening() {
    log('startListening called');

    const todayStart = getTodayStartTimestamp();
    log('todayStart:', todayStart, new Date(todayStart).toISOString());

    const query = db.ref('users')
      .orderByChild('timestamp')
      .startAt(todayStart)
      .limitToLast(100);

    query.on('child_added', (snapshot) => {
      log('EVENT child_added', snapshot.key, snapshot.val());
      addAvatarToDOM(snapshot.key, snapshot.val());
    });

    query.on('child_changed', (snapshot) => {
      log('EVENT child_changed', snapshot.key, snapshot.val());
      updateAvatarInDOM(snapshot.key, snapshot.val());
    });

    query.on('child_removed', (snapshot) => {
      log('EVENT child_removed', snapshot.key, snapshot.val());
      removeAvatarFromDOM(snapshot.key);
    });

    query.on('value', (snapshot) => {
      log('EVENT value — total children:', snapshot.numChildren());
    });

    return query;
  }

  // ============================================================
  // Carousel Data Listeners
  // ============================================================
  let cachedEvents = [];
  let cachedBooks = [];

  function startCarouselListeners() {
    listenToEvents((events) => {
      log('CAROUSEL events updated:', events.length);
      cachedEvents = events;
      carouselItems = buildCarouselSlides(cachedEvents, cachedBooks);
      renderCarousel();
    });

    listenToBooks((books) => {
      log('CAROUSEL books updated:', books.length);
      cachedBooks = books;
      carouselItems = buildCarouselSlides(cachedEvents, cachedBooks);
      renderCarousel();
    });
  }

  // ============================================================
  // Comment System: Speech Bubbles
  // ============================================================
  const COMMENT_COOLDOWN = 10000;
  let lastCommentTime = 0;

  const commentBar = document.getElementById('comment-bar');
  const commentFab = document.getElementById('comment-fab');
  const commentExpand = document.getElementById('comment-expand');
  const commentInput = document.getElementById('comment-input');
  const commentSendBtn = document.getElementById('comment-send-btn');
  const commentBarHint = document.getElementById('comment-bar-hint');

  function showBubbleOnAvatar(uid, text) {
    const entry = avatarMap.get(uid);
    if (!entry) return;

    const el = entry.element;

    const existing = el.querySelector('.speech-bubble');
    if (existing) existing.remove();

    const bubble = document.createElement('div');
    bubble.className = 'speech-bubble';
    bubble.textContent = text;
    el.appendChild(bubble);
  }

  function startCommentListener() {
    listenToComments((comment) => {
      log('COMMENT received:', comment);

      if (avatarMap.has(comment.uid)) {
        showBubbleOnAvatar(comment.uid, comment.text);
      } else {
        showFloatingBubble(comment);
      }
    });
  }

  const floatingBubbleMap = new Map();

  function showFloatingBubble(comment) {
    const bounds = getWalkBounds();
    if (bounds.width === 0) return;

    const existingBubble = floatingBubbleMap.get(comment.uid);
    if (existingBubble && existingBubble.parentNode) {
      existingBubble.remove();
    }

    const bubble = document.createElement('div');
    bubble.className = 'speech-bubble';
    bubble.style.position = 'absolute';
    bubble.style.bottom = 'auto';
    bubble.style.left = (Math.random() * (bounds.width - 180)) + 'px';
    bubble.style.top = (Math.random() * (bounds.height * 0.5)) + 'px';
    bubble.style.transform = 'none';
    bubble.textContent = comment.text;

    const nameTag = document.createElement('div');
    nameTag.style.fontSize = '0.65rem';
    nameTag.style.color = '#999';
    nameTag.style.marginTop = '0.2rem';
    nameTag.textContent = '— ' + (comment.nickname || 'Guest');
    bubble.appendChild(nameTag);

    walkZone.appendChild(bubble);
    floatingBubbleMap.set(comment.uid, bubble);
  }

  // Comment FAB toggle + input logic
  function setupCommentInput() {
    if (!commentFab || !commentInput || !commentSendBtn) return;

    // FAB toggle
    commentFab.addEventListener('click', () => {
      const isOpen = commentExpand.classList.contains('open');
      if (isOpen) {
        commentExpand.classList.remove('open');
        commentFab.classList.remove('active');
        commentFab.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
      } else {
        commentExpand.classList.add('open');
        commentFab.classList.add('active');
        commentFab.innerHTML = '&times;';
        setTimeout(() => commentInput.focus(), 100);
      }
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!commentBar.contains(e.target) && commentExpand.classList.contains('open')) {
        commentExpand.classList.remove('open');
        commentFab.classList.remove('active');
        commentFab.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
      }
    });

    commentInput.addEventListener('input', () => {
      const hasText = commentInput.value.trim().length > 0;
      const canSend = Date.now() - lastCommentTime >= COMMENT_COOLDOWN;
      commentSendBtn.disabled = !hasText || !canSend;
    });

    commentInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !commentSendBtn.disabled) {
        doSendComment();
      }
    });

    commentSendBtn.addEventListener('click', () => {
      doSendComment();
    });
  }

  async function doSendComment() {
    const text = commentInput.value.trim();
    if (!text) return;

    const now = Date.now();
    if (now - lastCommentTime < COMMENT_COOLDOWN) {
      const remaining = Math.ceil((COMMENT_COOLDOWN - (now - lastCommentTime)) / 1000);
      commentBarHint.textContent = `${remaining}秒後に送信できます`;
      return;
    }

    commentSendBtn.disabled = true;
    commentInput.disabled = true;

    try {
      const user = auth.currentUser;
      const userData = avatarMap.get(user.uid);
      const nickname = user.displayName || (userData ? userData.data.nickname : 'Guest');
      const color = userData ? userData.data.color : 'blue';

      await sendComment(text, nickname, color);

      commentInput.value = '';
      lastCommentTime = Date.now();
      commentBarHint.textContent = '送信しました';

      // Close panel after short delay
      setTimeout(() => {
        commentExpand.classList.remove('open');
        commentFab.classList.remove('active');
        commentFab.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
        commentBarHint.textContent = '';
      }, 1500);

    } catch (e) {
      console.error('Comment send error:', e);
      commentBarHint.textContent = 'エラー: ' + e.message;
    } finally {
      commentInput.disabled = false;
      commentSendBtn.disabled = true;
    }
  }

  function updateCommentBarVisibility() {
    if (!commentBar) return;
    const user = auth.currentUser;
    if (user && !user.isAnonymous) {
      commentBar.style.display = 'block';
    } else {
      commentBar.style.display = 'none';
    }
  }

  // ============================================================
  // Google Account Linking Banner
  // ============================================================
  const LINK_DISMISSED_KEY = 'uno_link_dismissed';
  const linkBanner = document.getElementById('link-banner');
  const linkBannerGoogle = document.getElementById('link-banner-google');
  const linkBannerDismiss = document.getElementById('link-banner-dismiss');

  function isLinkDismissed() {
    return localStorage.getItem(LINK_DISMISSED_KEY) === 'true';
  }

  function updateLinkBannerVisibility() {
    if (!linkBanner) return;
    const user = auth.currentUser;
    if (user && user.isAnonymous && !isLinkDismissed()) {
      linkBanner.style.display = 'flex';
    } else {
      linkBanner.style.display = 'none';
    }
  }

  if (linkBannerGoogle) {
    linkBannerGoogle.addEventListener('click', async () => {
      linkBannerGoogle.disabled = true;
      linkBannerGoogle.textContent = '連携中...';

      try {
        const user = await linkWithGoogle();
        log('Google linked from banner, uid:', user.uid);

        const userData = avatarMap.get(user.uid);
        if (userData) {
          await saveProfile({
            nickname: userData.data.nickname,
            color: userData.data.color,
            role: userData.data.role,
          });
        }

        linkBanner.style.display = 'none';
        // Force show comment bar immediately (onAuthStateChanged may lag)
        if (commentBar) commentBar.style.display = 'block';

      } catch (error) {
        console.error('Google link error:', error);

        if (error.code === 'auth/popup-closed-by-user') {
          linkBannerGoogle.disabled = false;
          linkBannerGoogle.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16" style="vertical-align:middle;margin-right:0.3rem;">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google で参加`;
          return;
        }

        linkBannerGoogle.disabled = false;
        linkBannerGoogle.textContent = 'エラー - 再試行';
      }
    });
  }

  if (linkBannerDismiss) {
    linkBannerDismiss.addEventListener('click', () => {
      localStorage.setItem(LINK_DISMISSED_KEY, 'true');
      linkBanner.style.display = 'none';
    });
  }

  // ============================================================
  // Debug: Auth & Connection
  // ============================================================
  auth.onAuthStateChanged((user) => {
    if (user) {
      log('AUTH signed in:', user.uid);
    } else {
      log('AUTH signed out (null)');
    }
    updateCommentBarVisibility();
    updateLinkBannerVisibility();
  });

  db.ref('.info/connected').on('value', (snap) => {
    log('CONNECTION:', snap.val() ? 'CONNECTED' : 'DISCONNECTED');
  });

  // ============================================================
  // Wi-Fi FAB + Survey/WiFi Modals
  // ============================================================
  const SURVEY_DONE_KEY = 'uno_survey_done';

  const wifiFab = document.getElementById('wifi-fab');
  const screenSurveyModal = document.getElementById('screen-survey-modal');
  const screenSurveySubmitBtn = document.getElementById('screen-btn-survey-submit');
  const screenWifiModal = document.getElementById('screen-wifi-modal');
  const screenWifiCloseBtn = document.getElementById('screen-wifi-close');

  function isSurveyDone() {
    return localStorage.getItem(SURVEY_DONE_KEY) === 'true';
  }

  function markSurveyDone() {
    localStorage.setItem(SURVEY_DONE_KEY, 'true');
  }

  function showModal(modal) {
    if (!modal) return;
    modal.style.display = 'flex';
    const card = modal.querySelector('.modal-card');
    if (card) {
      card.style.animation = 'none';
      card.offsetHeight;
      card.style.animation = '';
    }
  }

  function hideModal(modal) {
    if (!modal) return;
    modal.style.display = 'none';
  }

  // Wi-Fi FAB click
  if (wifiFab) {
    wifiFab.addEventListener('click', () => {
      if (isSurveyDone()) {
        showModal(screenWifiModal);
      } else {
        showModal(screenSurveyModal);
      }
    });
  }

  // Survey option selection
  const screenSurveyAnswers = { q1: null, q2: null, q3: null };

  document.querySelectorAll('.screen-survey-opt').forEach((btn) => {
    btn.addEventListener('click', () => {
      const q = btn.dataset.q;
      const val = btn.dataset.val;

      document.querySelectorAll(`.screen-survey-opt[data-q="${q}"]`).forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      screenSurveyAnswers[q] = val;

      const allAnswered = screenSurveyAnswers.q1 && screenSurveyAnswers.q2 && screenSurveyAnswers.q3;
      screenSurveySubmitBtn.disabled = !allAnswered;
    });
  });

  // Survey submit
  if (screenSurveySubmitBtn) {
    screenSurveySubmitBtn.addEventListener('click', async () => {
      screenSurveySubmitBtn.disabled = true;
      screenSurveySubmitBtn.textContent = '送信中...';

      try {
        await saveSurvey(screenSurveyAnswers);
      } catch (e) {
        console.error('Survey save error:', e);
      }

      markSurveyDone();
      hideModal(screenSurveyModal);
      showModal(screenWifiModal);

      screenSurveySubmitBtn.textContent = '回答してWi-Fiを見る';
      screenSurveySubmitBtn.disabled = true;
    });
  }

  // Wi-Fi modal close
  if (screenWifiCloseBtn) {
    screenWifiCloseBtn.addEventListener('click', () => {
      hideModal(screenWifiModal);
    });
  }

  // Modal background click to close
  if (screenWifiModal) {
    screenWifiModal.addEventListener('click', (e) => {
      if (e.target === screenWifiModal) hideModal(screenWifiModal);
    });
  }
  if (screenSurveyModal) {
    screenSurveyModal.addEventListener('click', (e) => {
      if (e.target === screenSurveyModal) hideModal(screenSurveyModal);
    });
  }

  // Copy buttons in screen Wi-Fi modal
  document.querySelectorAll('.screen-btn-copy').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const targetId = btn.dataset.target;
      const targetEl = document.getElementById(targetId);
      if (!targetEl) return;

      const text = targetEl.textContent.trim();

      try {
        await navigator.clipboard.writeText(text);
        btn.classList.add('copied');
        btn.textContent = 'Done';
        setTimeout(() => {
          btn.classList.remove('copied');
          btn.textContent = 'Copy';
        }, 1800);
      } catch (e) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);

        btn.classList.add('copied');
        btn.textContent = 'Done';
        setTimeout(() => {
          btn.classList.remove('copied');
          btn.textContent = 'Copy';
        }, 1800);
      }
    });
  });

  // ============================================================
  // Init
  // ============================================================
  log('=== screen.js initializing ===');
  log('auth.currentUser:', auth.currentUser ? auth.currentUser.uid : 'null');

  startListening();
  startCarouselListeners();
  startCommentListener();
  setupCommentInput();
  updateCommentBarVisibility();
  updateLinkBannerVisibility();

  setTimeout(() => {
    log('=== 5s health check ===');
    log('avatarMap size:', avatarMap.size);
    log('avatarMap keys:', [...avatarMap.keys()]);
  }, 5000);

})();
