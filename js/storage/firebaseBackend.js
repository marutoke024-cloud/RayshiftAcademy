// =====================================================================
// Firebase バックエンド（プレースホルダー）
// ---------------------------------------------------------------------
// USE_FIREBASE が true のときに使用されます。Phase 1 では未実装で、
// 後続フェーズ／Firebase 有効化時に CDN 版モジュラー SDK を使って実装します。
//
// 実装方針メモ（後で参照用）:
//   import { initializeApp } from
//     "https://www.gstatic.com/firebasejs/10.x.x/firebase-app.js";
//   import { getFirestore, ... } from ".../firebase-firestore.js";
//   import { getStorage, ... } from ".../firebase-storage.js";
//   - Firestore: users/{uid}/curricula/{curriculumId} と
//     その配下 steps/{stepId}
//   - Storage:   users/{uid}/curricula/{curriculumId}/{stepId}.md と
//                users/{uid}/assets/...
//   localBackend.js と同じメソッドシグネチャを実装すれば差し替え可能。
// =====================================================================

function notImplemented() {
  throw new Error(
    "Firebase バックエンドは未実装です。js/config/firebase-config.js の " +
      "USE_FIREBASE を false にするか、firebaseBackend.js を実装してください。"
  );
}

export const firebaseBackend = {
  name: "firebase",
  async init() {
    notImplemented();
  },
  async getCurricula() {
    notImplemented();
  },
  async getCurriculum() {
    notImplemented();
  },
  async saveCurriculum() {
    notImplemented();
  },
  async deleteCurriculum() {
    notImplemented();
  },
  async getSteps() {
    notImplemented();
  },
  async getStep() {
    notImplemented();
  },
  async saveStep() {
    notImplemented();
  },
  async saveAsset() {
    notImplemented();
  },
  async getAsset() {
    notImplemented();
  },
  async listAssets() {
    notImplemented();
  },
  async saveMeta() {
    notImplemented();
  },
  async getMeta() {
    notImplemented();
  },
  async clearAll() {
    notImplemented();
  },
};
