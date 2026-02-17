# Uno Bookstore — Avatar Check-in App

ブックストア / コワーキングスペース向けの **リアルタイム・アバター表示アプリ** です。  
来店者がスマホでチェックインすると、共有スクリーンにアバターがリアルタイムで表示されます。

## 技術スタック

| 項目 | 技術 |
|------|------|
| フロントエンド | HTML5 / CSS3 / Vanilla JS |
| 描画方式 | **Layered SVG System**（3層の透過SVGをz-indexで重畳） |
| バックエンド | Firebase (Realtime Database + Anonymous Auth) |
| フレームワーク | なし（Pure Vanilla） |

## 3つの必須制約

### 1. アセット規格の統一（Layered SVG System）
- すべてのSVGパーツは **ViewBox `0 0 500 500`** で統一
- 同一の中心座標を使用し、CSSで重ねるだけで位置合わせ不要
- 3層構造: `Layer 1: 素体` → `Layer 2: ロールアイテム` → `Layer 3: モードエフェクト`

### 2. DOMノード制限
- 画面上のアバター数が **上限 50体** を超えた場合、最古のDOM要素から自動削除
- `Map` の挿入順序を活用した FIFO 方式
- メモリ枯渇・ブラウザフリーズを防止

### 3. Firebase読み取り制限（Query Constraint）
- `orderByChild('timestamp').startAt(todayStart)` で **当日データのみ** をフィルター
- `limitToLast(100)` で最大取得数を制限
- テストデータの蓄積による初期ロード遅延を防止

## セットアップ

### 1. Firebase プロジェクトの作成

1. [Firebase Console](https://console.firebase.google.com/) で新規プロジェクト作成
2. **Realtime Database** を有効化
3. **Authentication** → **Anonymous** を有効化

### 2. Firebase 設定の反映

`js/firebase-config.js` を開き、`firebaseConfig` を自分のプロジェクトの値に置き換えてください:

```js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 3. Realtime Database ルール（必須）

`database.rules.json` の内容を Firebase Console → Realtime Database → ルール に貼り付けてください。  
このルールには以下のセキュリティが含まれます:

- **認証必須**: `auth != null` — 匿名認証済みユーザーのみアクセス可
- **自分のデータのみ書き込み可**: `auth.uid === $uid`
- **データバリデーション**: color / role / mode の値をホワイトリストで制限
- **timestamp 検証**: `newData.val() === now` でサーバー時刻のみ許可
- **不明フィールド拒否**: `$other: { ".validate": false }` で想定外のキーをブロック
- **インデックス**: `timestamp` にインデックスを設定しクエリを高速化

### 4. セキュリティ強化（推奨）

#### App Check の導入

正規のアプリからのみ Firebase にアクセスを許可します:

1. Firebase Console → **App Check** → **reCAPTCHA Enterprise** を選択
2. reCAPTCHA のサイトキーを取得
3. `index.html` / `screen.html` の Firebase SDK 読み込み後に以下を追加:

```html
<script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-check-compat.js"></script>
<script>
  const appCheck = firebase.appCheck();
  appCheck.activate('YOUR_RECAPTCHA_SITE_KEY', true);
</script>
```

4. Firebase Console → Realtime Database → App Check を **「必須」** に設定

#### API キーのリファラー制限

1. [Google Cloud Console](https://console.cloud.google.com/) → **認証情報** → **API キー**
2. 該当の Browser key を選択
3. **アプリケーションの制限** → **HTTP リファラー** を選択
4. 許可するドメインを追加:
   - `your-domain.com/*`
   - `localhost:*/*`（開発時のみ）

### 5. 起動

静的ファイルのみなので、任意のHTTPサーバーで配信できます:

```bash
# Python 3
python3 -m http.server 8080

# Node.js (npx)
npx serve .

# Firebase Hosting
firebase deploy
```

## ファイル構成

```
Uno_bookstore/
├── index.html              ← ユーザー チェックインページ
├── screen.html             ← 共有スクリーン表示ページ
├── css/
│   └── style.css           ← 全スタイル
├── js/
│   ├── firebase-config.js  ← Firebase設定 + DB操作関数
│   ├── svg-assets.js       ← SVGテンプレート（ViewBox 500x500統一）
│   ├── app.js              ← チェックイン画面ロジック
│   └── screen.js           ← スクリーン表示ロジック
├── assets/
│   └── svg/                ← 外部SVGアセット用（将来拡張）
│       ├── base/
│       ├── items/
│       └── effects/
└── README.md
```

## データ構造（Firebase Realtime Database）

通信量を最小化するため、短いIDセットのみを保存:

```json
{
  "users": {
    "anon_user_123": {
      "uid": "anon_user_123",
      "timestamp": 1707812345000,
      "color": "blue",
      "role": "freelance",
      "mode": "work"
    }
  }
}
```

## 使い方

1. **チェックイン（スマホ）:** `index.html` にアクセス → カラー・ロール・モードを選択 → チェックイン
2. **スクリーン表示（大画面）:** `screen.html` を共有モニターに全画面表示
3. アバターがリアルタイムで追加・更新・削除される

## カスタマイズ

### アバターの追加
`js/svg-assets.js` の `ROLE_ITEMS` や `MODE_EFFECTS` にエントリを追加してください。  
**必ず ViewBox `0 0 500 500` を維持してください。**

### DOM上限の変更
`js/screen.js` の `MAX_AVATARS` 定数を変更:

```js
const MAX_AVATARS = 50; // この値を変更
```

## ライセンス

MIT
