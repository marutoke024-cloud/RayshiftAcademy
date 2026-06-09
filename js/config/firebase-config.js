// =====================================================================
// Firebase 設定
// ---------------------------------------------------------------------
// 初期状態では Firebase を使わず、ブラウザ内の IndexedDB に保存します。
// （ネット接続不要で、今すぐ動作確認できます）
//
// Firebase を使いたくなったら:
//   1. https://console.firebase.google.com/ でプロジェクトを作成
//   2. 「ウェブアプリを追加」で表示される firebaseConfig をコピー
//   3. 下の USE_FIREBASE を true にして firebaseConfig を貼り替え
//   4. Firestore と Storage を有効化
// =====================================================================

// Firebase を使うかどうか（false の間はローカル IndexedDB を使用）
export const USE_FIREBASE = true;

// Firebase コンソールからコピーした設定をここに貼り付け
export const firebaseConfig = {
  apiKey: "AIzaSyAcBxusT9NMApCy971E1CxE93dJKzUZJjw",
  authDomain: "rayshift-academy.firebaseapp.com",
  projectId: "rayshift-academy",
  storageBucket: "rayshift-academy.firebasestorage.app",
  messagingSenderId: "866533784515",
  appId: "1:866533784515:web:790ac53d42c7f50a89db76",
};

// 個人利用アプリのため、当面は固定のユーザー ID を使用します。
// （Firebase Auth を導入したら、ここをログインユーザーの uid に差し替え）
export const DEFAULT_USER_ID = "senpai";
