/**
 * Firebase Configuration
 * 
 * ⚠️ 使用前に以下の手順で設定してください:
 * 1. Firebase Console (https://console.firebase.google.com/) でプロジェクトを作成
 * 2. Realtime Database を有効化
 * 3. Anonymous Authentication を有効化
 * 4. 以下の firebaseConfig を自分のプロジェクトの値に置き換え
 */

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Firebase初期化
firebase.initializeApp(firebaseConfig);

const db = firebase.database();
const auth = firebase.auth();

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
 * @param {Object} data - { uid, color, role, mode }
 */
async function saveUserData(data) {
  const payload = {
    uid: data.uid,
    timestamp: firebase.database.ServerValue.TIMESTAMP,
    color: data.color,
    role: data.role,
    mode: data.mode,
  };

  await db.ref('users/' + data.uid).set(payload);
  return payload;
}

/**
 * ユーザーデータを削除（退出時）
 * @param {string} uid
 */
async function removeUserData(uid) {
  await db.ref('users/' + uid).remove();
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
