/**
 * app.js — ユーザー入力画面のロジック
 * 
 * 匿名認証 → カラー/ロール/モード選択 → Firebase保存
 */

(function () {
  'use strict';

  // ============================================================
  // State
  // ============================================================
  const state = {
    uid: null,
    color: null,
    role: null,
    mode: null,
  };

  // ============================================================
  // DOM References
  // ============================================================
  const colorOptions = document.getElementById('color-options');
  const roleOptions = document.getElementById('role-options');
  const modeOptions = document.getElementById('mode-options');
  const btnCheckin = document.getElementById('btn-checkin');
  const statusBar = document.getElementById('status-bar');
  const previewEl = document.getElementById('avatar-preview');

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
    const isValid = state.color && state.role && state.mode;
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
      role: state.role || 'manufacturing',
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

  function hideStatus() {
    statusBar.className = 'status-bar';
  }

  // ============================================================
  // Check-in Flow
  // ============================================================
  btnCheckin.addEventListener('click', async () => {
    if (!validateForm()) return;

    btnCheckin.disabled = true;
    showStatus('認証中...', 'info');

    try {
      // Anonymous Auth
      if (!state.uid) {
        state.uid = await signInAnonymously();
      }

      showStatus('データ保存中...', 'info');

      // Save to Firebase
      await saveUserData({
        uid: state.uid,
        color: state.color,
        role: state.role,
        mode: state.mode,
      });

      // onDisconnect() は saveUserData 内で自動設定済み
      // Firebase サーバー側で接続切断を検知し、データを自動削除する
      showStatus('チェックイン完了！スクリーンにアバターが表示されます 🎉', 'success');

    } catch (error) {
      console.error('Check-in error:', error);
      showStatus('エラーが発生しました: ' + error.message, 'error');
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
