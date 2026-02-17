/**
 * dashboard.js — 管理者向け統計ダッシュボード
 * 
 * パスワード認証付き。
 * 統計・イベント管理・おすすめ本管理のタブ構成。
 */

(function () {
  'use strict';

  // ============================================================
  // Admin Password Config
  // パスワードを変更する場合: ブラウザのコンソールで以下を実行し、
  //   crypto.subtle.digest('SHA-256', new TextEncoder().encode('新しいパスワード'))
  //     .then(h => console.log(Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,'0')).join('')))
  // 出力されたハッシュを ADMIN_PASSWORD_HASH に設定する。
  // ============================================================
  // デフォルトパスワード: "uno2026"
  const ADMIN_PASSWORD_HASH = '55ea05a620d8f14dce1111e7b15ee23ec1373e18ef571ecf62d98e334dad9cae';

  async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // ============================================================
  // Admin Gate
  // ============================================================
  const adminGate = document.getElementById('admin-gate');
  const dashboardContent = document.getElementById('dashboard-content');
  const adminPasswordInput = document.getElementById('admin-password');
  const btnAdminLogin = document.getElementById('btn-admin-login');
  const adminError = document.getElementById('admin-error');

  function showDashboard() {
    adminGate.style.display = 'none';
    dashboardContent.style.display = 'block';
    init();
  }

  if (sessionStorage.getItem('uno_admin') === 'true') {
    showDashboard();
  }

  btnAdminLogin.addEventListener('click', async () => {
    const pw = adminPasswordInput.value;
    if (!pw) return;

    btnAdminLogin.disabled = true;
    const hash = await hashPassword(pw);

    if (hash === ADMIN_PASSWORD_HASH) {
      sessionStorage.setItem('uno_admin', 'true');
      showDashboard();
    } else {
      adminError.textContent = 'パスワードが正しくありません';
      adminError.className = 'status-bar show error';
      btnAdminLogin.disabled = false;
      adminPasswordInput.value = '';
      adminPasswordInput.focus();
    }
  });

  adminPasswordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') btnAdminLogin.click();
  });

  // ============================================================
  // Tab Navigation
  // ============================================================
  const tabs = document.querySelectorAll('.dash-tab');
  const tabContents = document.querySelectorAll('.dash-tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;

      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      tabContents.forEach(tc => tc.classList.remove('active'));
      document.getElementById('tab-' + target).classList.add('active');
    });
  });

  // ============================================================
  // DOM References — Statistics
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
  // DOM References — Events
  // ============================================================
  const btnAddEvent = document.getElementById('btn-add-event');
  const eventForm = document.getElementById('event-form');
  const eventEditId = document.getElementById('event-edit-id');
  const eventTitle = document.getElementById('event-title');
  const eventDate = document.getElementById('event-date');
  const eventTimeStart = document.getElementById('event-time-start');
  const eventTimeEnd = document.getElementById('event-time-end');
  const eventDescription = document.getElementById('event-description');
  const eventImageInput = document.getElementById('event-image');
  const eventPreview = document.getElementById('event-preview');
  const eventPreviewImg = document.getElementById('event-preview-img');
  const eventUploadPlaceholder = document.getElementById('event-upload-placeholder');
  const btnRemoveEventImage = document.getElementById('btn-remove-event-image');
  const btnSaveEvent = document.getElementById('btn-save-event');
  const btnCancelEvent = document.getElementById('btn-cancel-event');
  const eventListEl = document.getElementById('event-list');

  // ============================================================
  // DOM References — Books
  // ============================================================
  const btnAddBook = document.getElementById('btn-add-book');
  const bookForm = document.getElementById('book-form');
  const bookEditId = document.getElementById('book-edit-id');
  const bookTitle = document.getElementById('book-title');
  const bookAuthor = document.getElementById('book-author');
  const bookGenre = document.getElementById('book-genre');
  const bookComment = document.getElementById('book-comment');
  const bookImageInput = document.getElementById('book-image');
  const bookPreview = document.getElementById('book-preview');
  const bookPreviewImg = document.getElementById('book-preview-img');
  const bookUploadPlaceholder = document.getElementById('book-upload-placeholder');
  const btnRemoveBookImage = document.getElementById('btn-remove-book-image');
  const bookOrder = document.getElementById('book-order');
  const btnSaveBook = document.getElementById('btn-save-book');
  const btnCancelBook = document.getElementById('btn-cancel-book');
  const bookListEl = document.getElementById('book-list');

  // ============================================================
  // DOM References — Crop Modal
  // ============================================================
  const cropModal = document.getElementById('crop-modal');
  const cropImage = document.getElementById('crop-image');
  const cropViewport = document.getElementById('crop-viewport');
  const cropFrame = document.getElementById('crop-frame');
  const cropZoom = document.getElementById('crop-zoom');
  const btnCropConfirm = document.getElementById('btn-crop-confirm');
  const btnCropCancel = document.getElementById('btn-crop-cancel');

  // 画像の一時状態管理
  let eventPendingFile = null;
  let eventExistingImageUrl = '';
  let eventImageRemoved = false;
  let bookPendingFile = null;
  let bookExistingImageUrl = '';
  let bookImageRemoved = false;

  // クロッパー状態
  let cropState = {
    originalFile: null,
    aspectRatio: 16 / 9,
    onConfirm: null,
    imgNatW: 0, imgNatH: 0,
    offsetX: 0, offsetY: 0,
    scale: 1,
    dragging: false, dragStartX: 0, dragStartY: 0,
    startOffsetX: 0, startOffsetY: 0,
  };

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
      loadEventList();
      loadBookList();
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
  // Main Dashboard Load (Statistics)
  // ============================================================
  async function loadDashboard() {
    const historyByDate = await getHistoryForDays(7);
    const dates = Object.keys(historyByDate).sort();
    const todayStr = getTodayDateString();
    const todayRecords = historyByDate[todayStr] || [];

    todayCountEl.textContent = todayRecords.length;

    let weekTotal = 0;
    dates.forEach(d => { weekTotal += historyByDate[d].length; });
    weekTotalEl.textContent = weekTotal;

    const hourCounts = new Array(24).fill(0);
    todayRecords.forEach(r => {
      const h = new Date(r.checkinAt).getHours();
      hourCounts[h]++;
    });
    const peakHourIdx = hourCounts.indexOf(Math.max(...hourCounts));
    peakHourEl.textContent = todayRecords.length > 0
      ? `${peakHourIdx}:00 - ${peakHourIdx + 1}:00`
      : '--';

    renderWeeklyChart(dates, historyByDate);
    renderHourlyChart(hourCounts);
    renderRoleBreakdown(todayRecords);
    renderVisitorList(todayRecords);
  }

  // ============================================================
  // Charts
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
      freelance: 'Freelance',
      student: 'Student',
      designer: 'Designer',
      engineer: 'Engineer',
      writer: 'Writer',
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
  // Image Preview Helpers
  // ============================================================

  function showImagePreview(previewContainer, previewImg, placeholder, url) {
    previewImg.src = url;
    previewContainer.style.display = 'block';
    placeholder.style.display = 'none';
  }

  function hideImagePreview(previewContainer, previewImg, placeholder, fileInput) {
    previewImg.src = '';
    previewContainer.style.display = 'none';
    placeholder.style.display = 'flex';
    if (fileInput) fileInput.value = '';
  }

  // ============================================================
  // Image Cropper
  // ============================================================

  function openCropper(file, aspectRatio, onConfirm) {
    cropState.originalFile = file;
    cropState.aspectRatio = aspectRatio;
    cropState.onConfirm = onConfirm;
    cropState.scale = 1;
    cropState.offsetX = 0;
    cropState.offsetY = 0;
    cropZoom.value = 100;

    const url = URL.createObjectURL(file);
    cropImage.onload = () => {
      cropState.imgNatW = cropImage.naturalWidth;
      cropState.imgNatH = cropImage.naturalHeight;
      positionCropImage();
    };
    cropImage.src = url;
    cropModal.style.display = 'flex';
  }

  function closeCropper() {
    cropModal.style.display = 'none';
    cropImage.src = '';
    cropState.onConfirm = null;
  }

  function positionCropImage() {
    const vpW = cropViewport.clientWidth;
    const vpH = cropViewport.clientHeight;

    const frameW = vpW * 0.85;
    const frameH = frameW / cropState.aspectRatio;
    cropFrame.style.width = frameW + 'px';
    cropFrame.style.height = Math.min(frameH, vpH * 0.85) + 'px';
    cropFrame.style.left = (vpW - frameW) / 2 + 'px';
    cropFrame.style.top = (vpH - parseFloat(cropFrame.style.height)) / 2 + 'px';

    const actualFrameH = parseFloat(cropFrame.style.height);
    const fitScale = Math.max(frameW / cropState.imgNatW, actualFrameH / cropState.imgNatH);
    const displayW = cropState.imgNatW * fitScale * cropState.scale;
    const displayH = cropState.imgNatH * fitScale * cropState.scale;

    cropImage.style.width = displayW + 'px';
    cropImage.style.height = displayH + 'px';

    const cx = (vpW - frameW) / 2 + frameW / 2;
    const cy = (vpH - actualFrameH) / 2 + actualFrameH / 2;
    cropImage.style.left = (cx - displayW / 2 + cropState.offsetX) + 'px';
    cropImage.style.top = (cy - displayH / 2 + cropState.offsetY) + 'px';
  }

  cropZoom.addEventListener('input', () => {
    cropState.scale = parseInt(cropZoom.value) / 100;
    positionCropImage();
  });

  cropViewport.addEventListener('mousedown', (e) => {
    e.preventDefault();
    cropState.dragging = true;
    cropState.dragStartX = e.clientX;
    cropState.dragStartY = e.clientY;
    cropState.startOffsetX = cropState.offsetX;
    cropState.startOffsetY = cropState.offsetY;
  });

  document.addEventListener('mousemove', (e) => {
    if (!cropState.dragging) return;
    cropState.offsetX = cropState.startOffsetX + (e.clientX - cropState.dragStartX);
    cropState.offsetY = cropState.startOffsetY + (e.clientY - cropState.dragStartY);
    positionCropImage();
  });

  document.addEventListener('mouseup', () => { cropState.dragging = false; });

  cropViewport.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    cropState.dragging = true;
    cropState.dragStartX = e.touches[0].clientX;
    cropState.dragStartY = e.touches[0].clientY;
    cropState.startOffsetX = cropState.offsetX;
    cropState.startOffsetY = cropState.offsetY;
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (!cropState.dragging || e.touches.length !== 1) return;
    cropState.offsetX = cropState.startOffsetX + (e.touches[0].clientX - cropState.dragStartX);
    cropState.offsetY = cropState.startOffsetY + (e.touches[0].clientY - cropState.dragStartY);
    positionCropImage();
  }, { passive: true });

  document.addEventListener('touchend', () => { cropState.dragging = false; });

  btnCropCancel.addEventListener('click', closeCropper);

  btnCropConfirm.addEventListener('click', () => {
    const vpW = cropViewport.clientWidth;
    const vpH = cropViewport.clientHeight;
    const frameRect = cropFrame.getBoundingClientRect();
    const imgRect = cropImage.getBoundingClientRect();

    const scaleX = cropState.imgNatW / imgRect.width;
    const scaleY = cropState.imgNatH / imgRect.height;
    const sx = (frameRect.left - imgRect.left) * scaleX;
    const sy = (frameRect.top - imgRect.top) * scaleY;
    const sw = frameRect.width * scaleX;
    const sh = frameRect.height * scaleY;

    const outW = Math.min(sw, 1200);
    const outH = outW / cropState.aspectRatio;

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(outW);
    canvas.height = Math.round(outH);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(cropImage, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob && cropState.onConfirm) {
        cropState.onConfirm(blob);
      }
      closeCropper();
    }, 'image/jpeg', 0.85);
  });

  // ============================================================
  // Image Input → Cropper Flow
  // ============================================================

  function setupImageInput(fileInput, previewContainer, previewImg, placeholder, aspectRatio, onCropped) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (file.size > 20 * 1024 * 1024) {
        alert('画像サイズは20MB以下にしてください');
        fileInput.value = '';
        return;
      }

      openCropper(file, aspectRatio, (croppedBlob) => {
        const url = URL.createObjectURL(croppedBlob);
        showImagePreview(previewContainer, previewImg, placeholder, url);
        onCropped(croppedBlob);
      });
      fileInput.value = '';
    });
  }

  setupImageInput(eventImageInput, eventPreview, eventPreviewImg, eventUploadPlaceholder, 16/9, (blob) => {
    eventPendingFile = blob;
    eventImageRemoved = false;
  });

  setupImageInput(bookImageInput, bookPreview, bookPreviewImg, bookUploadPlaceholder, 3/4, (blob) => {
    bookPendingFile = blob;
    bookImageRemoved = false;
  });

  btnRemoveEventImage.addEventListener('click', () => {
    hideImagePreview(eventPreview, eventPreviewImg, eventUploadPlaceholder, eventImageInput);
    eventPendingFile = null;
    eventImageRemoved = true;
  });

  btnRemoveBookImage.addEventListener('click', () => {
    hideImagePreview(bookPreview, bookPreviewImg, bookUploadPlaceholder, bookImageInput);
    bookPendingFile = null;
    bookImageRemoved = true;
  });

  // ============================================================
  // Event Management
  // ============================================================

  function resetEventForm() {
    eventEditId.value = '';
    eventTitle.value = '';
    eventDate.value = '';
    eventTimeStart.value = '';
    eventTimeEnd.value = '';
    eventDescription.value = '';
    hideImagePreview(eventPreview, eventPreviewImg, eventUploadPlaceholder, eventImageInput);
    eventPendingFile = null;
    eventExistingImageUrl = '';
    eventImageRemoved = false;
    eventForm.style.display = 'none';
  }

  function buildTimeString() {
    const start = eventTimeStart.value;
    const end = eventTimeEnd.value;
    if (!start && !end) return '';
    if (start && end) return `${start}〜${end}`;
    return start || end;
  }

  function parseTimeString(timeStr) {
    if (!timeStr) return { start: '', end: '' };
    const parts = timeStr.split(/[〜~\-–—]/);
    return {
      start: (parts[0] || '').trim(),
      end: (parts[1] || '').trim(),
    };
  }

  btnAddEvent.addEventListener('click', () => {
    resetEventForm();
    eventForm.style.display = 'block';
    eventTitle.focus();
  });

  btnCancelEvent.addEventListener('click', () => {
    resetEventForm();
  });

  btnSaveEvent.addEventListener('click', async () => {
    const title = eventTitle.value.trim();
    const date = eventDate.value;

    if (!title) { alert('イベント名を入力してください'); return; }
    if (!date) { alert('開催日を選択してください'); return; }

    btnSaveEvent.disabled = true;
    btnSaveEvent.textContent = '保存中...';

    try {
      const data = {
        title,
        date,
        time: buildTimeString(),
        description: eventDescription.value.trim(),
      };

      const editId = eventEditId.value;

      if (editId) {
        if (eventPendingFile) {
          if (eventExistingImageUrl) await deleteImage(eventExistingImageUrl);
          data.imageUrl = await uploadImage(eventPendingFile, 'events', editId);
        } else if (eventImageRemoved && eventExistingImageUrl) {
          await deleteImage(eventExistingImageUrl);
          data.imageUrl = '';
        }
        await updateEvent(editId, data);
      } else {
        const newId = await addEvent(data);
        if (eventPendingFile) {
          const url = await uploadImage(eventPendingFile, 'events', newId);
          await updateEvent(newId, { imageUrl: url });
        }
      }

      resetEventForm();
      await loadEventList();
    } catch (err) {
      console.error('Event save error:', err);
      alert('保存に失敗しました: ' + err.message);
    } finally {
      btnSaveEvent.disabled = false;
      btnSaveEvent.textContent = '保存';
    }
  });

  async function loadEventList() {
    try {
      const events = await getAllEvents();

      if (events.length === 0) {
        eventListEl.innerHTML = '<p class="dash-empty">イベントはまだ登録されていません</p>';
        return;
      }

      const sorted = events.slice().sort((a, b) => {
        if (a.date > b.date) return -1;
        if (a.date < b.date) return 1;
        return 0;
      });

      let html = '';
      sorted.forEach(ev => {
        const dateObj = new Date(ev.date + 'T00:00:00');
        const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
        const dateLabel = `${dateObj.getMonth() + 1}/${dateObj.getDate()}(${dayNames[dateObj.getDay()]})`;
        const isPast = ev.date < getTodayDateString();
        const statusClass = !ev.active ? 'item-inactive' : isPast ? 'item-past' : '';
        const statusBadge = !ev.active ? '<span class="badge badge-inactive">非表示</span>'
                          : isPast ? '<span class="badge badge-past">終了</span>'
                          : '<span class="badge badge-active">公開中</span>';

        const thumbHtml = ev.imageUrl
          ? `<div class="item-card-thumb"><img src="${esc(ev.imageUrl)}" alt="${esc(ev.title)}"></div>`
          : '';

        html += `
          <div class="item-card ${statusClass}" data-id="${ev.id}">
            <div class="item-card-body">
              ${thumbHtml}
              <div class="item-card-info">
                <div class="item-card-header">
                  <div class="item-card-title">
                    <strong>${esc(ev.title)}</strong>
                    ${statusBadge}
                  </div>
                  <div class="item-card-meta">
                    <span>${dateLabel}</span>
                    ${ev.time ? `<span>${esc(ev.time)}</span>` : ''}
                  </div>
                </div>
                ${ev.description ? `<p class="item-card-desc">${esc(ev.description)}</p>` : ''}
              </div>
            </div>
            <div class="item-card-actions">
              <button class="btn-item-action btn-edit" onclick="window._editEvent('${ev.id}')">編集</button>
              <button class="btn-item-action btn-toggle" onclick="window._toggleEvent('${ev.id}', ${!ev.active})">
                ${ev.active ? '非表示にする' : '表示する'}
              </button>
              <button class="btn-item-action btn-delete" onclick="window._deleteEvent('${ev.id}')">削除</button>
            </div>
          </div>
        `;
      });

      eventListEl.innerHTML = html;
    } catch (err) {
      console.error('Event load error:', err);
      eventListEl.innerHTML = '<p class="dash-empty">読み込みに失敗しました</p>';
    }
  }

  window._editEvent = async function(id) {
    try {
      const events = await getAllEvents();
      const ev = events.find(e => e.id === id);
      if (!ev) return;

      resetEventForm();
      eventEditId.value = id;
      eventTitle.value = ev.title;
      eventDate.value = ev.date;
      const timeParts = parseTimeString(ev.time || '');
      eventTimeStart.value = timeParts.start;
      eventTimeEnd.value = timeParts.end;
      eventDescription.value = ev.description || '';
      eventExistingImageUrl = ev.imageUrl || '';

      if (ev.imageUrl) {
        showImagePreview(eventPreview, eventPreviewImg, eventUploadPlaceholder, ev.imageUrl);
      }

      eventForm.style.display = 'block';
      eventTitle.focus();
    } catch (err) {
      console.error('Edit event error:', err);
    }
  };

  window._toggleEvent = async function(id, active) {
    try {
      await updateEvent(id, { active });
      await loadEventList();
    } catch (err) {
      console.error('Toggle event error:', err);
      alert('更新に失敗しました');
    }
  };

  window._deleteEvent = async function(id) {
    if (!confirm('このイベントを削除しますか？')) return;
    try {
      await deleteEvent(id);
      await loadEventList();
    } catch (err) {
      console.error('Delete event error:', err);
      alert('削除に失敗しました');
    }
  };

  // ============================================================
  // Book Management
  // ============================================================

  function resetBookForm() {
    bookEditId.value = '';
    bookTitle.value = '';
    bookAuthor.value = '';
    bookGenre.value = '';
    bookComment.value = '';
    bookOrder.value = '0';
    hideImagePreview(bookPreview, bookPreviewImg, bookUploadPlaceholder, bookImageInput);
    bookPendingFile = null;
    bookExistingImageUrl = '';
    bookImageRemoved = false;
    bookForm.style.display = 'none';
  }

  btnAddBook.addEventListener('click', () => {
    resetBookForm();
    bookForm.style.display = 'block';
    bookTitle.focus();
  });

  btnCancelBook.addEventListener('click', () => {
    resetBookForm();
  });

  btnSaveBook.addEventListener('click', async () => {
    const title = bookTitle.value.trim();

    if (!title) { alert('書名を入力してください'); return; }

    btnSaveBook.disabled = true;
    btnSaveBook.textContent = '保存中...';

    try {
      const data = {
        title,
        author: bookAuthor.value.trim(),
        genre: bookGenre.value.trim(),
        comment: bookComment.value.trim(),
        order: parseInt(bookOrder.value, 10) || 0,
      };

      const editId = bookEditId.value;

      if (editId) {
        if (bookPendingFile) {
          if (bookExistingImageUrl) await deleteImage(bookExistingImageUrl);
          data.imageUrl = await uploadImage(bookPendingFile, 'books', editId);
        } else if (bookImageRemoved && bookExistingImageUrl) {
          await deleteImage(bookExistingImageUrl);
          data.imageUrl = '';
        }
        await updateBook(editId, data);
      } else {
        const newId = await addBook(data);
        if (bookPendingFile) {
          const url = await uploadImage(bookPendingFile, 'books', newId);
          await updateBook(newId, { imageUrl: url });
        }
      }

      resetBookForm();
      await loadBookList();
    } catch (err) {
      console.error('Book save error:', err);
      alert('保存に失敗しました: ' + err.message);
    } finally {
      btnSaveBook.disabled = false;
      btnSaveBook.textContent = '保存';
    }
  });

  async function loadBookList() {
    try {
      const books = await getAllBooks();

      if (books.length === 0) {
        bookListEl.innerHTML = '<p class="dash-empty">おすすめ本はまだ登録されていません</p>';
        return;
      }

      let html = '';
      books.forEach(bk => {
        const statusBadge = !bk.active
          ? '<span class="badge badge-inactive">非表示</span>'
          : '<span class="badge badge-active">公開中</span>';

        const thumbHtml = bk.imageUrl
          ? `<div class="item-card-thumb"><img src="${esc(bk.imageUrl)}" alt="${esc(bk.title)}"></div>`
          : '';

        html += `
          <div class="item-card ${!bk.active ? 'item-inactive' : ''}" data-id="${bk.id}">
            <div class="item-card-body">
              ${thumbHtml}
              <div class="item-card-info">
                <div class="item-card-header">
                  <div class="item-card-title">
                    <strong>${esc(bk.title)}</strong>
                    ${statusBadge}
                  </div>
                  <div class="item-card-meta">
                    ${bk.author ? `<span>${esc(bk.author)}</span>` : ''}
                    ${bk.genre ? `<span>${esc(bk.genre)}</span>` : ''}
                    <span>順序: ${bk.order}</span>
                  </div>
                </div>
                ${bk.comment ? `<p class="item-card-desc">${esc(bk.comment)}</p>` : ''}
              </div>
            </div>
            <div class="item-card-actions">
              <button class="btn-item-action btn-edit" onclick="window._editBook('${bk.id}')">編集</button>
              <button class="btn-item-action btn-toggle" onclick="window._toggleBook('${bk.id}', ${!bk.active})">
                ${bk.active ? '非表示にする' : '表示する'}
              </button>
              <button class="btn-item-action btn-delete" onclick="window._deleteBook('${bk.id}')">削除</button>
            </div>
          </div>
        `;
      });

      bookListEl.innerHTML = html;
    } catch (err) {
      console.error('Book load error:', err);
      bookListEl.innerHTML = '<p class="dash-empty">読み込みに失敗しました</p>';
    }
  }

  window._editBook = async function(id) {
    try {
      const books = await getAllBooks();
      const bk = books.find(b => b.id === id);
      if (!bk) return;

      resetBookForm();
      bookEditId.value = id;
      bookTitle.value = bk.title;
      bookAuthor.value = bk.author || '';
      bookGenre.value = bk.genre || '';
      bookComment.value = bk.comment || '';
      bookOrder.value = bk.order || 0;
      bookExistingImageUrl = bk.imageUrl || '';

      if (bk.imageUrl) {
        showImagePreview(bookPreview, bookPreviewImg, bookUploadPlaceholder, bk.imageUrl);
      }

      bookForm.style.display = 'block';
      bookTitle.focus();
    } catch (err) {
      console.error('Edit book error:', err);
    }
  };

  window._toggleBook = async function(id, active) {
    try {
      await updateBook(id, { active });
      await loadBookList();
    } catch (err) {
      console.error('Toggle book error:', err);
      alert('更新に失敗しました');
    }
  };

  window._deleteBook = async function(id) {
    if (!confirm('この本を削除しますか？')) return;
    try {
      await deleteBook(id);
      await loadBookList();
    } catch (err) {
      console.error('Delete book error:', err);
      alert('削除に失敗しました');
    }
  };

})();
