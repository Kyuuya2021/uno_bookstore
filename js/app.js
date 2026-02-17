/**
 * app.js — ユーザー入力画面のロジック
 * 
 * フロー:
 *   新規ユーザー → 匿名チェックイン → fly-away演出 → screen.html へ遷移
 *   リターニングユーザー → 保存済みアバターで即チェックイン → screen.html へ遷移
 *   アンケート・Wi-Fi・Google連携はすべて screen.html 側で行う
 */

(function () {
  'use strict';

  function log(label, ...args) {
    console.log(`[app.js] ${label}`, ...args);
  }

  // ============================================================
  // State
  // ============================================================
  const state = {
    uid: null,
    nickname: '',
    color: null,
    role: null,
    mode: null,
    savedProfile: null,
  };

  // ============================================================
  // DOM References
  // ============================================================
  const nicknameInput = document.getElementById('nickname-input');
  const colorOptions = document.getElementById('color-options');
  const roleOptions = document.getElementById('role-options');
  const modeOptions = document.getElementById('mode-options');
  const btnCheckin = document.getElementById('btn-checkin');
  const statusBar = document.getElementById('status-bar');
  const previewEl = document.getElementById('avatar-preview');

  // Returning user banner
  const returningBanner = document.getElementById('returning-banner');
  const returningGreeting = document.getElementById('returning-greeting');
  const returningAvatar = document.getElementById('returning-avatar');
  const btnReturningCheckin = document.getElementById('btn-returning-checkin');
  const btnReturningNew = document.getElementById('btn-returning-new');

  // ============================================================
  // Nickname Input
  // ============================================================
  nicknameInput.addEventListener('input', () => {
    state.nickname = nicknameInput.value.trim();
    validateForm();
  });

  // ============================================================
  // Option Selection Logic
  // ============================================================
  function setupOptionGroup(container, stateKey) {
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('.option-btn');
      if (!btn) return;

      container.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      state[stateKey] = btn.dataset.value;

      updatePreview();
      validateForm();
    });
  }

  setupOptionGroup(colorOptions, 'color');
  setupOptionGroup(roleOptions, 'role');
  setupOptionGroup(modeOptions, 'mode');

  // ============================================================
  // Form Validation
  // ============================================================
  function validateForm() {
    const isValid = state.nickname.length > 0 && state.color && state.role && state.mode;
    btnCheckin.disabled = !isValid;
    return isValid;
  }

  // ============================================================
  // Preview
  // ============================================================
  function updatePreview() {
    if (!state.color) {
      previewEl.innerHTML = '';
      return;
    }

    const html = createAvatarHTML({
      color: state.color,
      role: state.role || 'freelance',
      mode: state.mode || 'work',
    });
    previewEl.innerHTML = html;
  }

  // ============================================================
  // Status Bar
  // ============================================================
  function showStatus(message, type = 'info') {
    statusBar.textContent = message;
    statusBar.className = 'status-bar show ' + type;
  }

  // ============================================================
  // Fly-away Animation
  // ============================================================
  function playFlyAwayAnimation() {
    return new Promise((resolve) => {
      const previewWrapper = previewEl;
      if (!previewWrapper) { resolve(); return; }

      spawnParticles(previewWrapper);
      previewWrapper.classList.add('fly-away');

      const overlay = document.createElement('div');
      overlay.className = 'checkin-success-overlay';
      document.body.appendChild(overlay);

      previewWrapper.addEventListener('animationend', function onEnd() {
        previewWrapper.removeEventListener('animationend', onEnd);
        overlay.addEventListener('animationend', () => overlay.remove());
        resolve();
      });
    });
  }

  function spawnParticles(sourceEl) {
    const rect = sourceEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const colors = ['#4A90D9', '#E74C3C', '#27AE60', '#F1C40F', '#8E44AD', '#E67E22'];

    for (let i = 0; i < 10; i++) {
      const p = document.createElement('div');
      p.className = 'fly-particle';
      p.style.left = (cx + (Math.random() - 0.5) * 60) + 'px';
      p.style.top = (cy + (Math.random() - 0.5) * 40) + 'px';
      p.style.background = colors[Math.floor(Math.random() * colors.length)];
      p.style.animationDelay = (Math.random() * 0.3) + 's';
      document.body.appendChild(p);
      p.addEventListener('animationend', () => p.remove());
    }
  }

  // ============================================================
  // Check-in Flow (simplified: check-in → fly-away → screen)
  // ============================================================
  btnCheckin.addEventListener('click', async () => {
    if (!validateForm()) return;

    btnCheckin.disabled = true;
    showStatus('認証中...', 'info');

    try {
      if (!state.uid) {
        state.uid = await signInAnonymously();
      }

      showStatus('データ保存中...', 'info');

      await saveUserData({
        uid: state.uid,
        nickname: state.nickname,
        color: state.color,
        role: state.role,
        mode: state.mode,
      });

      showStatus('スクリーンへ送信中...', 'info');
      await playFlyAwayAnimation();

      showStatus('チェックイン完了！', 'success');

      setTimeout(() => {
        window.location.href = 'screen.html';
      }, 600);

    } catch (error) {
      console.error('Check-in error:', error);
      showStatus('エラー: ' + error.message, 'error');
      btnCheckin.disabled = false;
    }
  });

  // ============================================================
  // Returning User: 保存済みアバターの復元
  // ============================================================
  function showReturningBanner(profile) {
    const displayName = auth.currentUser.displayName || profile.nickname;
    returningGreeting.textContent = `おかえりなさい、${displayName} さん！`;

    returningAvatar.innerHTML = createAvatarHTML({
      color: profile.color,
      role: profile.role,
      mode: 'work',
    });

    state.savedProfile = profile;
    returningBanner.style.display = 'flex';
  }

  btnReturningCheckin.addEventListener('click', async () => {
    const profile = state.savedProfile;
    if (!profile) return;

    btnReturningCheckin.disabled = true;
    btnReturningCheckin.textContent = 'チェックイン中...';

    try {
      await saveUserData({
        uid: state.uid,
        nickname: profile.nickname,
        color: profile.color,
        role: profile.role,
        mode: 'work',
      });

      returningBanner.style.display = 'none';
      showStatus('チェックイン完了！スクリーンへ移動します...', 'success');
      setTimeout(() => {
        window.location.href = 'screen.html';
      }, 800);

    } catch (error) {
      console.error('Returning check-in error:', error);
      showStatus('エラー: ' + error.message, 'error');
      btnReturningCheckin.disabled = false;
      btnReturningCheckin.textContent = 'このアバターでチェックイン';
    }
  });

  btnReturningNew.addEventListener('click', () => {
    returningBanner.style.display = 'none';
  });

  // ============================================================
  // Init: Auth state + Profile restoration
  // ============================================================
  auth.onAuthStateChanged(async (user) => {
    if (!user) return;

    state.uid = user.uid;
    log('Auth state:', user.isAnonymous ? 'anonymous' : 'linked', user.uid);

    if (!user.isAnonymous) {
      try {
        const profile = await loadProfile();
        if (profile) {
          log('Profile loaded:', profile);
          showReturningBanner(profile);
        }
      } catch (e) {
        console.error('Profile load error:', e);
      }
    }
  });

})();
