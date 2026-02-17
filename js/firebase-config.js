/**
 * Firebase Configuration
 * 
 * ⚠️  セキュリティ設定チェックリスト:
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
 * ユーザーデータを保存 + onDisconnect ハンドラを設定
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

  await userRef.onDisconnect().remove();
  await userRef.set(payload);

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
  const userRef = db.ref('users/' + uid);
  await userRef.onDisconnect().cancel();
  await userRef.remove();
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
