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

/**
 * 入力データのバリデーション（クライアント側）
 * Security Rules がサーバー側で二重チェックするが、
 * 不正データの送信自体を防いでネットワーク往復を節約する
 */
function validateUserInput(data) {
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
 * @param {Object} data - { uid, color, role, mode }
 */
async function saveUserData(data) {
  validateUserInput(data);

  const userRef = db.ref('users/' + data.uid);

  const payload = {
    uid: data.uid,
    timestamp: firebase.database.ServerValue.TIMESTAMP,
    color: data.color,
    role: data.role,
    mode: data.mode,
  };

  // onDisconnect を先に設定してからデータを書き込む
  // これにより、書き込み直後に切断しても確実にクリーンアップされる
  await userRef.onDisconnect().remove();
  await userRef.set(payload);

  return payload;
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
 * スクリーン用: 読み取り制限付きリスナーを設定
 * Query Constraint: limitToLast(100) + 当日フィルター
 * 
 * @param {Function} onAdd    - child_added コールバック
 * @param {Function} onChange - child_changed コールバック
 * @param {Function} onRemove - child_removed コールバック
 * @returns {firebase.database.Query} クエリ参照（解除用）
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
