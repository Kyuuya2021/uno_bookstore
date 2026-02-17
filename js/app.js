/**
 * app.js — ユーザー入力画面のロジック
 * 
 * フロー:
 *   新規ユーザー → 匿名チェックイン → 「アバター保存しますか？」モーダル
 *   リターニングユーザー → 保存済みアバターで即チェックイン or 新規作成
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

  // Survey modal
  const surveyModal = document.getElementById('survey-modal');
  const btnSurveySubmit = document.getElementById('btn-survey-submit');

  // WiFi modal
  const wifiModal = document.getElementById('wifi-modal');
  const btnWifiContinue = document.getElementById('btn-wifi-continue');

  // Save modal
  const saveModal = document.getElementById('save-modal');
  const modalAvatarPreview = document.getElementById('modal-avatar-preview');
  const btnLinkGoogle = document.getElementById('btn-link-google');
  const btnSaveSkip = document.getElementById('btn-save-skip');

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

  function resetPreviewAfterFly() {
    previewEl.classList.remove('fly-away');
    previewEl.innerHTML = '';
  }

  // ============================================================
  // Check-in Flow
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
        resetPreviewAfterFly();
      }, 300);

      // アンケート → WiFi → 保存モーダル or スクリーンの順で表示
      setTimeout(() => {
        showSurveyModal();
      }, 800);

    } catch (error) {
      console.error('Check-in error:', error);
      showStatus('エラー: ' + error.message, 'error');
      btnCheckin.disabled = false;
    }
  });

  // ============================================================
  // Survey Modal
  // ============================================================
  const surveyAnswers = { q1: null, q2: null, q3: null };

  document.querySelectorAll('.survey-opt').forEach((btn) => {
    btn.addEventListener('click', () => {
      const q = btn.dataset.q;
      const val = btn.dataset.val;

      // 同じ質問内の他のボタンを解除
      document.querySelectorAll(`.survey-opt[data-q="${q}"]`).forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      surveyAnswers[q] = val;

      // 全問回答済みならボタン有効化
      const allAnswered = surveyAnswers.q1 && surveyAnswers.q2 && surveyAnswers.q3;
      btnSurveySubmit.disabled = !allAnswered;
    });
  });

  function showSurveyModal() {
    surveyModal.style.display = 'flex';
  }

  function hideSurveyModal() {
    surveyModal.style.display = 'none';
  }

  btnSurveySubmit.addEventListener('click', async () => {
    btnSurveySubmit.disabled = true;
    btnSurveySubmit.textContent = '送信中...';

    try {
      await saveSurvey(surveyAnswers);
    } catch (e) {
      console.error('Survey save error:', e);
    }

    localStorage.setItem('uno_survey_done', 'true');
    hideSurveyModal();
    showWifiModal();
  });

  // ============================================================
  // WiFi Info Modal
  // ============================================================
  function showWifiModal() {
    wifiModal.style.display = 'flex';
  }

  function hideWifiModal() {
    wifiModal.style.display = 'none';
  }

  // コピー機能
  document.querySelectorAll('.btn-copy').forEach((btn) => {
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
        // Fallback for older browsers
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

  // WiFi → 次のステップ
  btnWifiContinue.addEventListener('click', () => {
    hideWifiModal();

    // 匿名ユーザーならアバター保存モーダル、連携済みならスクリーンへ
    if (isAnonymousUser()) {
      setTimeout(() => {
        showSaveModal();
      }, 200);
    } else {
      window.location.href = 'screen.html';
    }
  });

  // ============================================================
  // Save Avatar Modal
  // ============================================================
  function showSaveModal() {
    modalAvatarPreview.innerHTML = createAvatarHTML({
      color: state.color,
      role: state.role,
      mode: state.mode,
    });
    saveModal.style.display = 'flex';
  }

  function hideSaveModal() {
    saveModal.style.display = 'none';
  }

  // Google で保存
  btnLinkGoogle.addEventListener('click', async () => {
    btnLinkGoogle.disabled = true;
    btnLinkGoogle.textContent = '連携中...';

    try {
      const user = await linkWithGoogle();
      log('Google linked, uid:', user.uid);
      state.uid = user.uid;

      // プロフィールを永続保存
      await saveProfile({
        nickname: state.nickname,
        color: state.color,
        role: state.role,
      });

      hideSaveModal();
      showStatus('コミュニティに参加しました！スクリーンへ移動します...', 'success');
      setTimeout(() => {
        window.location.href = 'screen.html';
      }, 1200);

    } catch (error) {
      console.error('Google link error:', error);

      if (error.code === 'auth/popup-closed-by-user') {
        btnLinkGoogle.disabled = false;
        btnLinkGoogle.innerHTML = `
          <svg viewBox="0 0 24 24" width="18" height="18" style="vertical-align:middle;margin-right:0.4rem;">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Google で参加`;
        return;
      }

      showStatus('連携に失敗しました: ' + error.message, 'error');
      btnLinkGoogle.disabled = false;
    }
  });

  // あとで → スクリーンへ遷移
  btnSaveSkip.addEventListener('click', () => {
    hideSaveModal();
    window.location.href = 'screen.html';
  });

  // モーダル背景クリックで閉じる
  saveModal.addEventListener('click', (e) => {
    if (e.target === saveModal) {
      hideSaveModal();
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

  // 保存済みアバターでチェックイン
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

  // 新しく作る
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

    // アカウント連携済みユーザーならプロフィールを復元
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
