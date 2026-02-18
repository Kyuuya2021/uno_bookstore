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
  let onSlideChanged = null;
  let detailExpanded = false;
  let dpParticipantUnsub = null;

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
        id: ev.id,
        isToday,
        dateLabel,
        date: ev.date,
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
        id: bk.id,
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
    if (detailExpanded) collapseInfoArea();

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

    // Slide tap → detail modal (ignore if swiped)
    carouselSlides.querySelectorAll('.carousel-slide').forEach(slide => {
      slide.style.cursor = 'pointer';
      slide.addEventListener('click', () => {
        if (carouselSwiped) return;
        const idx = parseInt(slide.dataset.index, 10);
        if (idx >= 0 && idx < carouselItems.length) {
          openDetailModal(carouselItems[idx]);
        }
      });
    });

    carouselIndex = 0;
    resetCarouselTimer();
  }

  function goToSlide(index) {
    const slides = carouselSlides.querySelectorAll('.carousel-slide');
    const dots = carouselDots.querySelectorAll('.carousel-dot');
    if (slides.length === 0) return;

    carouselIndex = ((index % slides.length) + slides.length) % slides.length;

    slides.forEach((s, i) => s.classList.toggle('active', i === carouselIndex));
    dots.forEach((d, i) => d.classList.toggle('active', i === carouselIndex));

    if (onSlideChanged) onSlideChanged();
  }

  function nextSlide() {
    if (carouselItems.length === 0) return;
    goToSlide(carouselIndex + 1);
  }

  function prevSlide() {
    if (carouselItems.length === 0) return;
    goToSlide((carouselIndex - 1 + carouselItems.length) % carouselItems.length);
  }

  function resetCarouselTimer() {
    if (carouselTimer) clearInterval(carouselTimer);
    carouselTimer = setInterval(nextSlide, CAROUSEL_INTERVAL);
  }

  // Swipe support for carousel (sets flag to suppress tap)
  let carouselSwiped = false;

  (function setupCarouselSwipe() {
    const target = document.getElementById('screen-info-area');
    if (!target) return;

    let startX = 0;
    let startY = 0;
    let tracking = false;

    target.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      tracking = true;
      carouselSwiped = false;
    }, { passive: true });

    target.addEventListener('touchend', (e) => {
      if (!tracking) return;
      tracking = false;

      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const dx = endX - startX;
      const dy = endY - startY;

      if (Math.abs(dx) < 40 || Math.abs(dy) > Math.abs(dx)) return;

      carouselSwiped = true;
      if (dx < 0) {
        nextSlide();
      } else {
        prevSlide();
      }
      if (!detailExpanded) resetCarouselTimer();
    }, { passive: true });
  })();

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
      renderDrawerEvents();
    });

    listenToBooks((books) => {
      log('CAROUSEL books updated:', books.length);
      cachedBooks = books;
      carouselItems = buildCarouselSlides(cachedEvents, cachedBooks);
      renderCarousel();
      renderDrawerBooks();
    });
  }

  // ============================================================
  // Comment System: Speech Bubbles
  // ============================================================
  const COMMENT_COOLDOWN = 10000;
  let lastCommentTime = 0;

  // Large screen (TV) comment FAB elements
  const commentBar = document.getElementById('comment-bar');
  const commentFab = document.getElementById('comment-fab');
  const commentExpand = document.getElementById('comment-expand');
  const commentInput = document.getElementById('comment-input');
  const commentSendBtn = document.getElementById('comment-send-btn');
  const commentBarHint = document.getElementById('comment-bar-hint');

  // Drawer comment elements (mobile)
  const drawerCommentSection = document.getElementById('drawer-comment-section');
  const drawerCommentInput = document.getElementById('drawer-comment-input');
  const drawerCommentSend = document.getElementById('drawer-comment-send');
  const drawerCommentHint = document.getElementById('drawer-comment-hint');

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
  // Sidebar Drawer System (mobile)
  // ============================================================
  const drawerToggle = document.getElementById('drawer-toggle');
  const drawer = document.getElementById('drawer');
  const drawerOverlay = document.getElementById('drawer-overlay');
  const drawerClose = document.getElementById('drawer-close');
  const drawerAvatar = document.getElementById('drawer-avatar');
  const drawerNickname = document.getElementById('drawer-nickname');
  const drawerAuthStatus = document.getElementById('drawer-auth-status');
  const drawerBtnGoogle = document.getElementById('drawer-btn-google');
  const drawerBtnLogout = document.getElementById('drawer-btn-logout');
  const drawerEventList = document.getElementById('drawer-event-list');
  const drawerBookList = document.getElementById('drawer-book-list');
  const drawerWifiBtn = document.getElementById('drawer-wifi-btn');
  const drawerWifiContent = document.getElementById('drawer-wifi-content');

  function openDrawer() {
    if (!drawer) return;
    drawer.classList.add('open');
    drawerOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove('open');
    drawerOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (drawerToggle) drawerToggle.addEventListener('click', openDrawer);
  if (drawerClose) drawerClose.addEventListener('click', closeDrawer);
  if (drawerOverlay) drawerOverlay.addEventListener('click', closeDrawer);

  function updateDrawerProfile() {
    const user = auth.currentUser;

    if (!user) {
      if (drawerNickname) drawerNickname.textContent = 'ゲスト';
      if (drawerAuthStatus) {
        drawerAuthStatus.textContent = '未ログイン';
        drawerAuthStatus.classList.remove('logged-in');
      }
      if (drawerBtnGoogle) drawerBtnGoogle.style.display = 'flex';
      if (drawerBtnLogout) drawerBtnLogout.style.display = 'none';
      if (drawerAvatar) drawerAvatar.innerHTML = '';
      return;
    }

    const userData = avatarMap.get(user.uid);
    if (userData) {
      if (drawerNickname) drawerNickname.textContent = userData.data.nickname || 'Guest';
      if (drawerAvatar) {
        drawerAvatar.innerHTML = createAvatarHTML(userData.data);
      }
    } else if (user.displayName) {
      if (drawerNickname) drawerNickname.textContent = user.displayName;
    }

    if (user.isAnonymous) {
      if (drawerAuthStatus) {
        drawerAuthStatus.textContent = '匿名ユーザー';
        drawerAuthStatus.classList.remove('logged-in');
      }
      if (drawerBtnGoogle) drawerBtnGoogle.style.display = 'flex';
      if (drawerBtnLogout) drawerBtnLogout.style.display = 'none';
    } else {
      if (drawerAuthStatus) {
        drawerAuthStatus.textContent = 'Google ログイン済み';
        drawerAuthStatus.classList.add('logged-in');
      }
      if (drawerBtnGoogle) drawerBtnGoogle.style.display = 'none';
      if (drawerBtnLogout) drawerBtnLogout.style.display = 'flex';
    }
  }

  // Drawer Google login
  if (drawerBtnGoogle) {
    drawerBtnGoogle.addEventListener('click', async () => {
      drawerBtnGoogle.disabled = true;
      drawerBtnGoogle.textContent = '連携中...';

      try {
        const user = await linkWithGoogle();
        log('Google linked from drawer, uid:', user.uid);

        const userData = avatarMap.get(user.uid);
        if (userData) {
          await saveProfile({
            nickname: userData.data.nickname,
            color: userData.data.color,
            role: userData.data.role,
          });
        }

        updateDrawerProfile();
        updateCommentBarVisibility();
        updateDrawerCommentVisibility();

      } catch (error) {
        console.error('Google link error:', error);
        drawerBtnGoogle.disabled = false;

        if (error.code === 'auth/popup-closed-by-user') {
          drawerBtnGoogle.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16" style="vertical-align:middle;margin-right:0.3rem;">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google でログイン`;
          return;
        }

        drawerBtnGoogle.textContent = 'エラー - 再試行';
      }
    });
  }

  // Drawer Logout
  if (drawerBtnLogout) {
    drawerBtnLogout.addEventListener('click', async () => {
      drawerBtnLogout.disabled = true;
      drawerBtnLogout.textContent = 'ログアウト中...';

      try {
        await auth.signOut();
        log('User signed out');
        closeDrawer();
        updateDrawerProfile();
        updateCommentBarVisibility();
        updateDrawerCommentVisibility();
      } catch (e) {
        console.error('Logout error:', e);
        drawerBtnLogout.textContent = 'エラー - 再試行';
      }

      drawerBtnLogout.disabled = false;
      drawerBtnLogout.textContent = 'ログアウト';
    });
  }

  // Drawer Events
  function renderDrawerEvents() {
    if (!drawerEventList) return;

    const todayStr = getTodayDateString();
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    const activeEvents = (cachedEvents || []).filter(e => e.active && e.date >= todayStr);
    activeEvents.sort((a, b) => a.date.localeCompare(b.date));

    if (activeEvents.length === 0) {
      drawerEventList.innerHTML = '<p class="drawer-empty">予定されているイベントはありません</p>';
      return;
    }

    drawerEventList.innerHTML = activeEvents.slice(0, 8).map(ev => {
      const d = new Date(ev.date + 'T00:00:00');
      const dateLabel = `${d.getMonth() + 1}/${d.getDate()}(${dayNames[d.getDay()]})`;
      const isToday = ev.date === todayStr;
      const todayBadge = isToday ? '<span style="color:#FF6B6B;font-weight:600;margin-left:0.3rem;">TODAY</span>' : '';

      return `
        <div class="drawer-event-card" data-event-id="${ev.id}">
          ${ev.imageUrl ? `<div class="drawer-card-thumb"><img src="${escapeHTML(ev.imageUrl)}" alt=""></div>` : ''}
          <div class="drawer-card-info">
            <div class="drawer-card-title">${escapeHTML(ev.title)}</div>
            <div class="drawer-card-meta">${escapeHTML(dateLabel)}${ev.time ? ' ' + escapeHTML(ev.time) : ''}${todayBadge}</div>
            <div class="drawer-card-actions">
              <button class="drawer-event-join-btn" data-event-id="${ev.id}">参加する</button>
              <span class="drawer-event-count" data-event-id="${ev.id}" style="font-size:0.68rem;color:rgba(255,255,255,0.4);margin-left:0.3rem;"></span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Setup participation listeners for each event
    activeEvents.slice(0, 8).forEach(ev => {
      const btn = drawerEventList.querySelector(`.drawer-event-join-btn[data-event-id="${ev.id}"]`);
      const countEl = drawerEventList.querySelector(`.drawer-event-count[data-event-id="${ev.id}"]`);

      listenToEventParticipants(ev.id, (count, isJoined) => {
        if (btn) {
          btn.textContent = isJoined ? '参加済み' : '参加する';
          btn.classList.toggle('joined', isJoined);
        }
        if (countEl) {
          countEl.textContent = count > 0 ? `${count}人参加` : '';
        }
      });

      if (btn) {
        btn.addEventListener('click', async () => {
          const user = auth.currentUser;
          if (!user || user.isAnonymous) {
            btn.textContent = 'ログインが必要です';
            setTimeout(() => { btn.textContent = '参加する'; }, 2000);
            return;
          }

          btn.disabled = true;
          try {
            const joined = btn.classList.contains('joined');
            if (joined) {
              await leaveEvent(ev.id);
            } else {
              await joinEvent(ev.id);
            }
          } catch (e) {
            console.error('Event join/leave error:', e);
          }
          btn.disabled = false;
        });
      }
    });
  }

  // Drawer Books
  function renderDrawerBooks() {
    if (!drawerBookList) return;

    const activeBooks = (cachedBooks || []).filter(b => b.active);

    if (activeBooks.length === 0) {
      drawerBookList.innerHTML = '<p class="drawer-empty">おすすめ情報はありません</p>';
      return;
    }

    drawerBookList.innerHTML = activeBooks.slice(0, 8).map(bk => `
      <div class="drawer-book-card">
        ${bk.imageUrl ? `<div class="drawer-card-thumb"><img src="${escapeHTML(bk.imageUrl)}" alt=""></div>` : ''}
        <div class="drawer-card-info">
          <div class="drawer-card-title">${escapeHTML(bk.title)}</div>
          ${bk.author ? `<div class="drawer-card-meta">${escapeHTML(bk.author)}</div>` : ''}
          ${bk.genre ? `<div class="drawer-card-meta" style="color:var(--color-primary);">${escapeHTML(bk.genre)}</div>` : ''}
          ${bk.comment ? `<div class="drawer-card-meta" style="margin-top:0.15rem;">${escapeHTML(bk.comment).substring(0, 60)}${bk.comment.length > 60 ? '...' : ''}</div>` : ''}
        </div>
      </div>
    `).join('');
  }

  // Drawer Wi-Fi
  function setupDrawerWifi() {
    if (!drawerWifiBtn || !drawerWifiContent) return;

    function showDrawerWifiInfo() {
      drawerWifiContent.innerHTML = `
        <div class="drawer-wifi-info">
          <div class="drawer-wifi-row">
            <div>
              <div class="drawer-wifi-label">ネットワーク名</div>
              <div class="drawer-wifi-value">Uno-book-store</div>
            </div>
            <button class="drawer-wifi-copy" data-copy="Uno-book-store">Copy</button>
          </div>
          <div class="drawer-wifi-row">
            <div>
              <div class="drawer-wifi-label">パスワード</div>
              <div class="drawer-wifi-value">2NT8425E63</div>
            </div>
            <button class="drawer-wifi-copy" data-copy="2NT8425E63">Copy</button>
          </div>
        </div>
      `;

      drawerWifiContent.querySelectorAll('.drawer-wifi-copy').forEach(btn => {
        btn.addEventListener('click', async () => {
          const val = btn.dataset.copy;
          try {
            await navigator.clipboard.writeText(val);
          } catch (e) {
            const ta = document.createElement('textarea');
            ta.value = val;
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
          }
          btn.textContent = 'Done';
          btn.classList.add('copied');
          setTimeout(() => {
            btn.textContent = 'Copy';
            btn.classList.remove('copied');
          }, 1800);
        });
      });
    }

    if (isSurveyDone()) {
      showDrawerWifiInfo();
    } else {
      drawerWifiBtn.addEventListener('click', () => {
        closeDrawer();
        showModal(screenSurveyModal);
      });
    }
  }

  // Drawer Comment Input (mobile)
  function updateDrawerCommentVisibility() {
    if (!drawerCommentSection) return;
    const user = auth.currentUser;
    drawerCommentSection.style.display = (user && !user.isAnonymous) ? 'block' : 'none';
  }

  function setupDrawerComment() {
    if (!drawerCommentInput || !drawerCommentSend) return;

    drawerCommentInput.addEventListener('input', () => {
      const hasText = drawerCommentInput.value.trim().length > 0;
      const canSend = Date.now() - lastCommentTime >= COMMENT_COOLDOWN;
      drawerCommentSend.disabled = !hasText || !canSend;
    });

    drawerCommentInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !drawerCommentSend.disabled) {
        doSendDrawerComment();
      }
    });

    drawerCommentSend.addEventListener('click', () => {
      doSendDrawerComment();
    });
  }

  async function doSendDrawerComment() {
    const text = drawerCommentInput.value.trim();
    if (!text) return;

    const now = Date.now();
    if (now - lastCommentTime < COMMENT_COOLDOWN) {
      const remaining = Math.ceil((COMMENT_COOLDOWN - (now - lastCommentTime)) / 1000);
      if (drawerCommentHint) drawerCommentHint.textContent = `${remaining}秒後に送信できます`;
      return;
    }

    drawerCommentSend.disabled = true;
    drawerCommentInput.disabled = true;

    try {
      const user = auth.currentUser;
      const userData = avatarMap.get(user.uid);
      const nickname = user.displayName || (userData ? userData.data.nickname : 'Guest');
      const color = userData ? userData.data.color : 'blue';

      await sendComment(text, nickname, color);

      drawerCommentInput.value = '';
      lastCommentTime = Date.now();
      if (drawerCommentHint) drawerCommentHint.textContent = '送信しました';
      setTimeout(() => {
        if (drawerCommentHint) drawerCommentHint.textContent = '';
      }, 2000);
    } catch (e) {
      console.error('Drawer comment error:', e);
      if (drawerCommentHint) drawerCommentHint.textContent = 'エラー: ' + e.message;
    } finally {
      drawerCommentInput.disabled = false;
      drawerCommentSend.disabled = true;
    }
  }

  // ============================================================
  // Google Account Linking Banner (large screen only)
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
        if (commentBar) commentBar.style.display = 'block';
        updateDrawerProfile();
        updateDrawerCommentVisibility();

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
  // Handle Redirect Auth Result (iOS Safari)
  // ============================================================
  async function processRedirectResult() {
    try {
      const user = await handleRedirectResult();
      if (user && !user.isAnonymous) {
        log('Redirect auth success:', user.uid);
        const userData = avatarMap.get(user.uid);
        if (userData) {
          await saveProfile({
            nickname: userData.data.nickname,
            color: userData.data.color,
            role: userData.data.role,
          });
        }
        if (linkBanner) linkBanner.style.display = 'none';
        if (commentBar) commentBar.style.display = 'block';
        updateDrawerProfile();
        updateDrawerCommentVisibility();
      }
    } catch (e) {
      console.error('Redirect result error:', e);
    }
  }

  processRedirectResult();

  // ============================================================
  // Auth State & Connection
  // ============================================================
  auth.onAuthStateChanged((user) => {
    if (user) {
      log('AUTH signed in:', user.uid);
    } else {
      log('AUTH signed out (null)');
    }
    updateCommentBarVisibility();
    updateLinkBannerVisibility();
    updateDrawerProfile();
    updateDrawerCommentVisibility();
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
    const card = modal.querySelector('.modal-card') || modal.querySelector('.wifi-mini-card');
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

  // ============================================================
  // Detail: inline expansion of info area
  // ============================================================
  const infoHandle = document.getElementById('info-handle');

  function buildSlideDetail(item) {
    let html = '';

    if (item.type === 'event') {
      if (item.description) {
        html += `<div class="slide-detail-desc">${escapeHTML(item.description)}</div>`;
      }

      const user = auth.currentUser;
      if (user && !user.isAnonymous) {
        html += `
          <div class="slide-detail-actions">
            <button class="slide-detail-join" data-event-id="${escapeHTML(item.id || '')}">参加する</button>
            <span class="slide-detail-count"></span>
          </div>`;
      } else {
        html += `
          <div class="slide-detail-actions">
            <span class="slide-detail-count"></span>
          </div>
          <div class="slide-detail-hint">Google ログインするとイベントに参加できます</div>`;
      }
    } else {
      if (item.comment) {
        html += `<div class="slide-detail-desc">${escapeHTML(item.comment)}</div>`;
      }
    }

    return html;
  }

  function injectSlideDetails() {
    carouselSlides.querySelectorAll('.carousel-slide').forEach((slide, i) => {
      if (slide.querySelector('.slide-detail')) return;
      const item = carouselItems[i];
      if (!item) return;
      const div = document.createElement('div');
      div.className = 'slide-detail';
      div.innerHTML = buildSlideDetail(item);
      slide.querySelector('.carousel-slide-body').appendChild(div);
    });
  }

  function cleanupParticipantListener() {
    if (dpParticipantUnsub) {
      dpParticipantUnsub();
      dpParticipantUnsub = null;
    }
  }

  function attachParticipantLogic() {
    cleanupParticipantListener();

    const activeSlide = carouselSlides.querySelector('.carousel-slide.active');
    if (!activeSlide) return;

    const idx = parseInt(activeSlide.dataset.index, 10);
    const item = carouselItems[idx];
    if (!item || item.type !== 'event' || !item.id) return;

    const joinBtn = activeSlide.querySelector('.slide-detail-join');
    const countEl = activeSlide.querySelector('.slide-detail-count');

    const ref = db.ref(`event_participants/${item.id}`);
    const onValue = (snapshot) => {
      const count = snapshot.numChildren();
      const u = auth.currentUser;
      const isJoined = u ? snapshot.hasChild(u.uid) : false;
      if (joinBtn) {
        joinBtn.textContent = isJoined ? '参加済み' : '参加する';
        joinBtn.classList.toggle('joined', isJoined);
      }
      if (countEl) {
        countEl.textContent = count > 0 ? `${count}人が参加予定` : '';
      }
    };
    ref.on('value', onValue);
    dpParticipantUnsub = () => ref.off('value', onValue);

    if (joinBtn) {
      joinBtn.addEventListener('click', async () => {
        const u = auth.currentUser;
        if (!u || u.isAnonymous) return;
        joinBtn.disabled = true;
        try {
          if (joinBtn.classList.contains('joined')) {
            await leaveEvent(item.id);
          } else {
            await joinEvent(item.id);
          }
        } catch (e) {
          console.error('Join error:', e);
        }
        joinBtn.disabled = false;
      });
    }
  }

  function expandInfoArea() {
    if (detailExpanded) return;
    detailExpanded = true;

    if (carouselTimer) clearInterval(carouselTimer);

    injectSlideDetails();
    infoArea.classList.add('expanded');

    attachParticipantLogic();

    onSlideChanged = () => {
      if (detailExpanded) attachParticipantLogic();
    };
  }

  function collapseInfoArea() {
    if (!detailExpanded) return;
    detailExpanded = false;

    infoArea.classList.remove('expanded');
    cleanupParticipantListener();
    onSlideChanged = null;

    resetCarouselTimer();
  }

  function forceExpand() {
    detailExpanded = false;
    expandInfoArea();
  }

  function forceCollapse() {
    detailExpanded = true;
    collapseInfoArea();
  }

  function openDetailModal(item) {
    expandInfoArea();
  }

  // ============================================================
  // Drag handle: tap to toggle + drag to resize + snap
  // ============================================================
  (function setupDragHandle() {
    if (!infoHandle || !infoArea) return;

    const isMobile = () => window.innerWidth <= 600;
    const collapsedRatio = () => isMobile() ? 0.33 : 0.50;
    const expandedRatio  = () => isMobile() ? 0.85 : 0.80;
    const snapThreshold  = () => (collapsedRatio() + expandedRatio()) / 2;

    let startY = 0;
    let startH = 0;
    let dragged = false;
    let lastY = 0;
    let lastTime = 0;
    let velocity = 0;

    function onStart(clientY) {
      startY = clientY;
      startH = infoArea.getBoundingClientRect().height;
      dragged = false;
      lastY = clientY;
      lastTime = Date.now();
      velocity = 0;
      infoArea.classList.add('dragging');
      infoHandle.classList.add('dragging');
    }

    function onMove(clientY) {
      const dy = clientY - startY;
      if (Math.abs(dy) > 4) dragged = true;
      if (!dragged) return;

      const vh = window.innerHeight;
      const minH = vh * collapsedRatio() * 0.8;
      const maxH = vh * expandedRatio();
      const newH = Math.min(maxH, Math.max(minH, startH + dy));
      infoArea.style.height = newH + 'px';

      const now = Date.now();
      const dt = now - lastTime;
      if (dt > 0) {
        velocity = (clientY - lastY) / dt;
      }
      lastY = clientY;
      lastTime = now;
    }

    function onEnd() {
      infoHandle.classList.remove('dragging');

      if (!dragged) {
        infoArea.classList.remove('dragging');
        infoArea.style.height = '';
        if (detailExpanded) {
          collapseInfoArea();
        } else {
          expandInfoArea();
        }
        return;
      }

      const vh = window.innerHeight;
      const currentH = infoArea.getBoundingClientRect().height;
      const ratio = currentH / vh;

      const flickExpand = velocity > 0.4;
      const flickCollapse = velocity < -0.4;

      infoArea.classList.remove('dragging');
      infoArea.style.height = '';

      if (flickExpand || (!flickCollapse && ratio > snapThreshold())) {
        forceExpand();
      } else {
        forceCollapse();
      }
    }

    infoHandle.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      onStart(e.touches[0].clientY);
    }, { passive: true });

    infoHandle.addEventListener('touchmove', (e) => {
      e.preventDefault();
      onMove(e.touches[0].clientY);
    }, { passive: false });

    infoHandle.addEventListener('touchend', () => onEnd(), { passive: true });
    infoHandle.addEventListener('touchcancel', () => onEnd(), { passive: true });

    infoHandle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      onStart(e.clientY);

      const moveHandler = (ev) => onMove(ev.clientY);
      const upHandler = () => {
        onEnd();
        document.removeEventListener('mousemove', moveHandler);
        document.removeEventListener('mouseup', upHandler);
      };
      document.addEventListener('mousemove', moveHandler);
      document.addEventListener('mouseup', upHandler);
    });
  })();

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

      // Refresh drawer wifi content (replace button with wifi info)
      setupDrawerWifi();

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
  // NPC Characters（常駐キャラクター）
  // NPCはavatarMapとは別管理。DOM上限カウントに含めない。
  // ============================================================
  const npcMap = new Map();

  function renderNPCs() {
    if (typeof NPC_CHARACTERS === 'undefined') return;

    NPC_CHARACTERS.forEach((npc) => {
      if (npcMap.has(npc.id)) return;

      const pos = randomPosition();

      const container = document.createElement('div');
      container.className = 'avatar-container npc-avatar idle';
      container.dataset.npcId = npc.id;
      container.style.left = pos.x + 'px';
      container.style.top = pos.y + 'px';

      const wrapper = document.createElement('div');
      wrapper.className = 'avatar-wrapper';
      wrapper.innerHTML = createNPCAvatarHTML(npc.id);

      const label = document.createElement('div');
      label.className = 'avatar-label';
      label.innerHTML = `
        <span class="avatar-nickname">${escapeHTML(npc.nickname)}</span>
        <span class="npc-badge npc-badge-${npc.badge}">STAFF</span>
      `;

      container.appendChild(wrapper);
      container.appendChild(label);
      walkZone.appendChild(container);

      const npcEntry = {
        element: container,
        wanderTimer: null,
      };
      npcMap.set(npc.id, npcEntry);

      // NPCも歩き回る（avatarMapに入れず独自管理）
      startNPCWandering(npc.id);
    });

    log('NPCs rendered:', npcMap.size);
  }

  function startNPCWandering(npcId) {
    const entry = npcMap.get(npcId);
    if (!entry) return;

    const wander = () => {
      const currentEntry = npcMap.get(npcId);
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
        if (!npcMap.has(npcId)) return;
        el.classList.remove('walking');
        el.classList.add('idle');
      }, moveDuration);

      const nextDelay = WANDER_MIN_DELAY + Math.random() * (WANDER_MAX_DELAY - WANDER_MIN_DELAY);
      currentEntry.wanderTimer = setTimeout(wander, moveDuration + nextDelay);
    };

    const initialDelay = 500 + Math.random() * 3000;
    entry.wanderTimer = setTimeout(wander, initialDelay);
  }

  // ============================================================
  // Init
  // ============================================================
  log('=== screen.js initializing ===');
  log('auth.currentUser:', auth.currentUser ? auth.currentUser.uid : 'null');

  renderNPCs();
  startListening();
  startCarouselListeners();
  startCommentListener();
  setupCommentInput();
  setupDrawerComment();
  setupDrawerWifi();
  updateCommentBarVisibility();
  updateLinkBannerVisibility();
  updateDrawerProfile();
  updateDrawerCommentVisibility();

  setTimeout(() => {
    log('=== 5s health check ===');
    log('avatarMap size:', avatarMap.size);
    log('npcMap size:', npcMap.size);
    log('avatarMap keys:', [...avatarMap.keys()]);
  }, 5000);

})();
