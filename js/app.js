/**
 * app.js — ユーザー入力画面のロジック
 * 
 * 匿名認証 → ニックネーム入力 → カラー/ロール/モード選択 → Firebase保存
 */

(function () {
  'use strict';

  // ============================================================
  // State
  // ============================================================
  const state = {
    uid: null,
    nickname: '',
    color: null,
    role: null,
    mode: null,
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

      showStatus('チェックイン完了！スクリーンにアバターが表示されます', 'success');

    } catch (error) {
      console.error('Check-in error:', error);
      showStatus('エラー: ' + error.message, 'error');
      btnCheckin.disabled = false;
    }
  });

  // ============================================================
  // Init: Restore session if already signed in
  // ============================================================
  auth.onAuthStateChanged((user) => {
    if (user) {
      state.uid = user.uid;
    }
  });

})();
