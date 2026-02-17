/**
 * Firebase Configuration
 * 
 * [注意] セキュリティ設定チェックリスト:
 * 1. Firebase Console でプロジェクト作成 → Realtime Database + Anonymous Auth 有効化
 * 2. database.rules.json の内容を Realtime Database のルールに貼り付け
 * 3. App Check を有効化（reCAPTCHA Enterprise 推奨）
 * 4. Google Cloud Console → 認証情報 → API キーに HTTP リファラー制限を設定
 */

const firebaseConfig = {
  apiKey: "AIzaSyCOJGip0GuFoH_sK69ZUdlAqiGBsrNLuZw",
  authDomain: "uno-bookstore.firebaseapp.com",
  databaseURL: "https://uno-bookstore-default-rtdb.firebaseio.com",
  projectId: "uno-bookstore",
  storageBucket: "uno-bookstore.firebasestorage.app",
  messagingSenderId: "185438865273",
  appId: "1:185438865273:web:c8b954998fb29268f991a8"
};

// Firebase初期化
firebase.initializeApp(firebaseConfig);

const db = firebase.database();
const auth = firebase.auth();
const storage = typeof firebase.storage === 'function' ? firebase.storage() : null;

// ============================================================
// バリデーション定数（Security Rules と同期させること）
// ============================================================
const VALID_COLORS = ['blue', 'red', 'green', 'yellow', 'purple', 'orange'];
const VALID_ROLES  = ['freelance', 'student', 'designer', 'engineer', 'writer'];
const VALID_MODES  = ['work', 'break', 'meeting'];
const NICKNAME_MAX_LENGTH = 20;

/**
 * ニックネームのサニタイズ
 */
function sanitizeNickname(name) {
  return String(name).trim().slice(0, NICKNAME_MAX_LENGTH);
}

/**
 * 入力データのバリデーション（クライアント側）
 */
function validateUserInput(data) {
  if (!data.nickname || sanitizeNickname(data.nickname).length === 0) {
    throw new Error('ニックネームを入力してください');
  }
  if (!VALID_COLORS.includes(data.color)) {
    throw new Error(`Invalid color: ${data.color}`);
  }
  if (!VALID_ROLES.includes(data.role)) {
    throw new Error(`Invalid role: ${data.role}`);
  }
  if (!VALID_MODES.includes(data.mode)) {
    throw new Error(`Invalid mode: ${data.mode}`);
  }
  return true;
}

/**
 * 匿名認証でサインイン
 * @returns {Promise<string>} uid
 */
async function signInAnonymously() {
  try {
    const result = await auth.signInAnonymously();
    return result.user.uid;
  } catch (error) {
    console.error('Anonymous auth failed:', error);
    throw error;
  }
}

/**
 * ユーザーデータを保存
 * @param {Object} data - { uid, nickname, color, role, mode }
 */
async function saveUserData(data) {
  validateUserInput(data);

  const userRef = db.ref('users/' + data.uid);
  const nickname = sanitizeNickname(data.nickname);

  const payload = {
    uid: data.uid,
    timestamp: firebase.database.ServerValue.TIMESTAMP,
    nickname: nickname,
    color: data.color,
    role: data.role,
    mode: data.mode,
  };

  // 以前のセッションで登録された可能性のある onDisconnect を明示的にキャンセル
  await userRef.onDisconnect().cancel();
  console.log('[firebase-config] onDisconnect cancelled for', data.uid);

  await userRef.set(payload);
  console.log('[firebase-config] data set for', data.uid);

  // 履歴にも記録（ダッシュボード用）
  await saveHistory({
    uid: data.uid,
    nickname: nickname,
    color: data.color,
    role: data.role,
  });

  return payload;
}

/**
 * 来訪履歴を保存
 */
async function saveHistory(data) {
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  await db.ref('history').push({
    uid: data.uid,
    nickname: data.nickname,
    color: data.color,
    role: data.role,
    checkinAt: firebase.database.ServerValue.TIMESTAMP,
    date: dateStr,
  });
}

/**
 * ユーザーデータを削除（明示的な退出時）
 * @param {string} uid
 */
async function removeUserData(uid) {
  await db.ref('users/' + uid).remove();
}

// ============================================================
// Account Linking: 匿名 → Google アカウントへ昇格
// ============================================================

/**
 * iOS Safari を検出
 */
function isIOSSafari() {
  const ua = navigator.userAgent;
  return /iP(hone|od|ad)/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * Google アカウントで匿名ユーザーを昇格（Account Linking）
 * iOS Safari ではポップアップがブロックされるため redirect を使用
 * @returns {Promise<firebase.User>} リンク後のユーザー (popup時のみ)
 */
async function linkWithGoogle() {
  const user = auth.currentUser;
  if (!user) throw new Error('ログインしていません');

  const provider = new firebase.auth.GoogleAuthProvider();

  if (isIOSSafari()) {
    await user.linkWithRedirect(provider);
    return user;
  }

  try {
    const result = await user.linkWithPopup(provider);
    console.log('[firebase-config] Google linked:', result.user.uid);
    return result.user;
  } catch (error) {
    if (error.code === 'auth/credential-already-in-use') {
      const result = await auth.signInWithCredential(error.credential);
      console.log('[firebase-config] Signed in with existing Google:', result.user.uid);
      return result.user;
    }
    throw error;
  }
}

/**
 * Google アカウントで直接サインイン（リターニングユーザー用）
 * @returns {Promise<firebase.User>}
 */
async function signInWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();

  if (isIOSSafari()) {
    await auth.signInWithRedirect(provider);
    return auth.currentUser;
  }

  const result = await auth.signInWithPopup(provider);
  return result.user;
}

/**
 * Redirect 認証の結果を処理（ページリロード後に呼ばれる）
 * @returns {Promise<firebase.User|null>}
 */
async function handleRedirectResult() {
  try {
    const result = await auth.getRedirectResult();
    if (result && result.user) {
      console.log('[firebase-config] Redirect auth completed:', result.user.uid);
      return result.user;
    }
  } catch (error) {
    if (error.code === 'auth/credential-already-in-use') {
      const result = await auth.signInWithCredential(error.credential);
      return result.user;
    }
    console.error('[firebase-config] Redirect result error:', error);
  }
  return null;
}

/**
 * 現在のユーザーが匿名かどうか
 */
function isAnonymousUser() {
  return auth.currentUser && auth.currentUser.isAnonymous;
}

/**
 * 現在のユーザーがアカウント連携済みかどうか
 */
function isLinkedUser() {
  const user = auth.currentUser;
  if (!user) return false;
  return !user.isAnonymous;
}

// ============================================================
// Profile: アバター設定の永続保存（アカウント連携済みユーザー用）
// ============================================================

/**
 * プロフィール（アバター設定）を永続保存
 * @param {Object} data - { nickname, color, role }
 */
async function saveProfile(data) {
  const user = auth.currentUser;
  if (!user) throw new Error('ログインしていません');

  await db.ref('profiles/' + user.uid).set({
    nickname: sanitizeNickname(data.nickname),
    color: data.color,
    role: data.role,
    linkedAt: firebase.database.ServerValue.TIMESTAMP,
  });
  console.log('[firebase-config] profile saved for', user.uid);
}

/**
 * 保存済みプロフィールを取得
 * @returns {Promise<Object|null>} プロフィールデータ or null
 */
async function loadProfile() {
  const user = auth.currentUser;
  if (!user) return null;

  const snapshot = await db.ref('profiles/' + user.uid).once('value');
  return snapshot.val();
}

/**
 * 当日の開始タイムスタンプを取得
 * @returns {number} 本日0時のUnixタイムスタンプ（ミリ秒）
 */
function getTodayStartTimestamp() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

/**
 * 日付文字列を取得
 * @returns {string} YYYY-MM-DD
 */
function getTodayDateString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * スクリーン用: 読み取り制限付きリスナーを設定
 */
function listenToUsers(onAdd, onChange, onRemove) {
  const todayStart = getTodayStartTimestamp();

  const query = db.ref('users')
    .orderByChild('timestamp')
    .startAt(todayStart)
    .limitToLast(100);

  query.on('child_added', (snapshot) => {
    onAdd(snapshot.key, snapshot.val());
  });

  query.on('child_changed', (snapshot) => {
    onChange(snapshot.key, snapshot.val());
  });

  query.on('child_removed', (snapshot) => {
    onRemove(snapshot.key);
  });

  return query;
}

/**
 * ダッシュボード用: 履歴データを取得
 * @param {string} date - YYYY-MM-DD（指定しない場合は当日）
 * @returns {Promise<Array>} 履歴レコードの配列
 */
async function getHistoryByDate(date) {
  const targetDate = date || getTodayDateString();
  const snapshot = await db.ref('history')
    .orderByChild('date')
    .equalTo(targetDate)
    .once('value');

  const results = [];
  snapshot.forEach((child) => {
    results.push({ id: child.key, ...child.val() });
  });
  return results;
}

/**
 * ダッシュボード用: 直近N日分の履歴を取得
 * @param {number} days
 * @returns {Promise<Object>} { 'YYYY-MM-DD': [records], ... }
 */
async function getHistoryForDays(days = 7) {
  const results = {};
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    results[dateStr] = await getHistoryByDate(dateStr);
  }
  return results;
}

// ============================================================
// Events: イベント情報の CRUD
// ============================================================

/**
 * 画像を圧縮・リサイズする（アップロード高速化）
 * @param {Blob|File} blob - 元画像
 * @param {number} maxWidth - 最大幅（デフォルト 1200px）
 * @param {number} quality - JPEG品質 0〜1（デフォルト 0.8）
 * @returns {Promise<Blob>} 圧縮済み JPEG Blob
 */
function compressImage(blob, maxWidth = 1200, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let w = img.width;
      let h = img.height;
      if (w > maxWidth) {
        h = Math.round(h * (maxWidth / w));
        w = maxWidth;
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((result) => {
        if (result) resolve(result);
        else reject(new Error('画像の圧縮に失敗しました'));
      }, 'image/jpeg', quality);
    };
    img.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
    img.src = URL.createObjectURL(blob);
  });
}

/**
 * 画像を Firebase Storage にアップロード（自動圧縮付き）
 * @param {File|Blob} file - 画像ファイルまたは Blob
 * @param {string} folder - 保存先フォルダ ('events' or 'books')
 * @param {string} id - アイテムID
 * @returns {Promise<string>} ダウンロードURL
 */
async function uploadImage(file, folder, id) {
  if (!storage) throw new Error('Firebase Storage が利用できません');
  if (!file) throw new Error('ファイルが指定されていません');

  const compressed = await compressImage(file);
  console.log(`[firebase-config] compressed: ${(file.size/1024).toFixed(0)}KB → ${(compressed.size/1024).toFixed(0)}KB`);

  const path = `${folder}/${id}.jpg`;
  const ref = storage.ref(path);

  await ref.put(compressed, { contentType: 'image/jpeg' });
  const url = await ref.getDownloadURL();
  return url;
}

/**
 * Firebase Storage から画像を削除
 * @param {string} imageUrl - 削除する画像の URL
 */
async function deleteImage(imageUrl) {
  if (!storage || !imageUrl) return;
  try {
    const ref = storage.refFromURL(imageUrl);
    await ref.delete();
  } catch (e) {
    console.warn('[firebase-config] Image delete failed (may not exist):', e.message);
  }
}

/**
 * イベントを追加
 * @param {Object} data - { title, date, time, description, imageUrl }
 * @returns {Promise<string>} 生成されたキー
 */
async function addEvent(data) {
  const ref = db.ref('events').push();
  const payload = {
    title: String(data.title).trim().slice(0, 100),
    date: data.date,
    time: data.time || '',
    description: String(data.description || '').trim().slice(0, 500),
    active: true,
    createdAt: firebase.database.ServerValue.TIMESTAMP,
    updatedAt: firebase.database.ServerValue.TIMESTAMP,
  };
  if (data.imageUrl) payload.imageUrl = data.imageUrl;
  await ref.set(payload);
  return ref.key;
}

/**
 * イベントを更新
 * @param {string} eventId
 * @param {Object} data
 */
async function updateEvent(eventId, data) {
  const updates = { updatedAt: firebase.database.ServerValue.TIMESTAMP };
  if (data.title !== undefined) updates.title = String(data.title).trim().slice(0, 100);
  if (data.date !== undefined) updates.date = data.date;
  if (data.time !== undefined) updates.time = data.time;
  if (data.description !== undefined) updates.description = String(data.description).trim().slice(0, 500);
  if (data.active !== undefined) updates.active = Boolean(data.active);
  if (data.imageUrl !== undefined) updates.imageUrl = data.imageUrl;
  await db.ref('events/' + eventId).update(updates);
}

/**
 * イベントを削除
 * @param {string} eventId
 */
async function deleteEvent(eventId) {
  const snapshot = await db.ref('events/' + eventId).once('value');
  const data = snapshot.val();
  if (data && data.imageUrl) {
    await deleteImage(data.imageUrl);
  }
  await db.ref('events/' + eventId).remove();
}

/**
 * 全イベントを取得
 * @returns {Promise<Array>} イベント配列
 */
async function getAllEvents() {
  const snapshot = await db.ref('events').orderByChild('date').once('value');
  const results = [];
  snapshot.forEach((child) => {
    results.push({ id: child.key, ...child.val() });
  });
  return results;
}

/**
 * アクティブなイベントのみ取得
 * @returns {Promise<Array>}
 */
async function getActiveEvents() {
  const all = await getAllEvents();
  return all.filter(e => e.active);
}

/**
 * イベントのリアルタイムリスナー
 */
function listenToEvents(callback) {
  db.ref('events').orderByChild('date').on('value', (snapshot) => {
    const results = [];
    snapshot.forEach((child) => {
      results.push({ id: child.key, ...child.val() });
    });
    callback(results);
  });
}

// ============================================================
// Books: おすすめ本の CRUD
// ============================================================

/**
 * 本を追加
 * @param {Object} data - { title, author, genre, comment }
 * @returns {Promise<string>} 生成されたキー
 */
async function addBook(data) {
  const ref = db.ref('books').push();
  const payload = {
    title: String(data.title).trim().slice(0, 100),
    author: String(data.author || '').trim().slice(0, 50),
    genre: String(data.genre || '').trim().slice(0, 30),
    comment: String(data.comment || '').trim().slice(0, 500),
    order: data.order || 0,
    active: true,
    createdAt: firebase.database.ServerValue.TIMESTAMP,
    updatedAt: firebase.database.ServerValue.TIMESTAMP,
  };
  if (data.imageUrl) payload.imageUrl = data.imageUrl;
  await ref.set(payload);
  return ref.key;
}

/**
 * 本を更新
 * @param {string} bookId
 * @param {Object} data
 */
async function updateBook(bookId, data) {
  const updates = { updatedAt: firebase.database.ServerValue.TIMESTAMP };
  if (data.title !== undefined) updates.title = String(data.title).trim().slice(0, 100);
  if (data.author !== undefined) updates.author = String(data.author).trim().slice(0, 50);
  if (data.genre !== undefined) updates.genre = String(data.genre).trim().slice(0, 30);
  if (data.comment !== undefined) updates.comment = String(data.comment).trim().slice(0, 500);
  if (data.order !== undefined) updates.order = Number(data.order);
  if (data.active !== undefined) updates.active = Boolean(data.active);
  if (data.imageUrl !== undefined) updates.imageUrl = data.imageUrl;
  await db.ref('books/' + bookId).update(updates);
}

/**
 * 本を削除
 * @param {string} bookId
 */
async function deleteBook(bookId) {
  const snapshot = await db.ref('books/' + bookId).once('value');
  const data = snapshot.val();
  if (data && data.imageUrl) {
    await deleteImage(data.imageUrl);
  }
  await db.ref('books/' + bookId).remove();
}

/**
 * 全おすすめ本を取得
 * @returns {Promise<Array>}
 */
async function getAllBooks() {
  const snapshot = await db.ref('books').orderByChild('order').once('value');
  const results = [];
  snapshot.forEach((child) => {
    results.push({ id: child.key, ...child.val() });
  });
  return results;
}

/**
 * アクティブな本のみ取得
 * @returns {Promise<Array>}
 */
async function getActiveBooks() {
  const all = await getAllBooks();
  return all.filter(b => b.active);
}

/**
 * おすすめ本のリアルタイムリスナー
 */
function listenToBooks(callback) {
  db.ref('books').orderByChild('order').on('value', (snapshot) => {
    const results = [];
    snapshot.forEach((child) => {
      results.push({ id: child.key, ...child.val() });
    });
    callback(results);
  });
}

// ============================================================
// Comments (コメント)
// ============================================================

/**
 * コメントを送信（ログイン済みユーザーのみ）
 * @param {string} text - コメントテキスト（50文字以内）
 * @param {string} nickname
 * @param {string} color
 * @returns {Promise<void>}
 */
async function sendComment(text, nickname, color) {
  const user = auth.currentUser;
  if (!user || user.isAnonymous) {
    throw new Error('ログインが必要です');
  }

  const trimmed = text.trim().slice(0, 50);
  if (trimmed.length === 0) return;

  const ref = db.ref('comments').push();
  await ref.set({
    uid: user.uid,
    nickname: nickname || user.displayName || 'Guest',
    text: trimmed,
    color: color || 'blue',
    createdAt: firebase.database.ServerValue.TIMESTAMP,
  });
}

/**
 * コメントのリアルタイムリスナー（直近のみ）
 * @param {Function} callback - (commentData) => void
 */
function listenToComments(callback) {
  const now = Date.now();
  db.ref('comments')
    .orderByChild('createdAt')
    .startAt(now)
    .on('child_added', (snapshot) => {
      callback({ id: snapshot.key, ...snapshot.val() });
    });
}

// ============================================================
// Survey (アンケート)
// ============================================================

/**
 * アンケート回答を保存
 * @param {Object} answers - { q1, q2, q3 }
 * @returns {Promise<void>}
 */
async function saveSurvey(answers) {
  const uid = auth.currentUser ? auth.currentUser.uid : 'anonymous';
  const ref = db.ref('surveys').push();
  await ref.set({
    uid,
    q1_source: answers.q1 || '',
    q2_purpose: answers.q2 || '',
    q3_frequency: answers.q3 || '',
    createdAt: firebase.database.ServerValue.TIMESTAMP,
  });
}
