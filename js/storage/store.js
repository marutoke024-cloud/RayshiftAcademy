// =====================================================================
// ストレージ facade
// ---------------------------------------------------------------------
// アプリの他の部分はこの `store` だけを参照します。
// USE_FIREBASE の値に応じて、内部のバックエンドを切り替えます。
// （= 保存先が IndexedDB でも Firebase でも、呼び出し側は変えなくてよい）
// =====================================================================

import { USE_FIREBASE } from "../config/firebase-config.js";
import { localBackend } from "./localBackend.js";
import { firebaseBackend } from "./firebaseBackend.js";

const backend = USE_FIREBASE ? firebaseBackend : localBackend;

let initPromise = null;

export const store = {
  backendName: backend.name,

  init() {
    if (!initPromise) initPromise = backend.init();
    return initPromise;
  },

  // カリキュラム
  getCurricula: (...a) => backend.getCurricula(...a),
  getCurriculum: (...a) => backend.getCurriculum(...a),
  saveCurriculum: (...a) => backend.saveCurriculum(...a),
  deleteCurriculum: (...a) => backend.deleteCurriculum(...a),

  // ステップ
  getSteps: (...a) => backend.getSteps(...a),
  getStep: (...a) => backend.getStep(...a),
  saveStep: (...a) => backend.saveStep(...a),

  // アセット
  saveAsset: (...a) => backend.saveAsset(...a),
  getAsset: (...a) => backend.getAsset(...a),
  listAssets: (...a) => backend.listAssets(...a),
  deleteAsset: (...a) => backend.deleteAsset(...a),

  // ステップ md（Firebase Storage: curricula/{cid}/{stepId}.md）
  saveStepMd: (...a) => backend.saveStepMd(...a),
  getStepMd: (...a) => backend.getStepMd(...a),

  // 汎用ドキュメントコレクション（tips / english_lessons / phrase_bank）
  saveDoc: (...a) => backend.saveDoc(...a),
  getDoc: (...a) => backend.getDoc(...a),
  listDocs: (...a) => backend.listDocs(...a),
  deleteDoc: (...a) => backend.deleteDoc(...a),

  // メタ
  saveMeta: (...a) => backend.saveMeta(...a),
  getMeta: (...a) => backend.getMeta(...a),

  // デバッグ
  clearAll: (...a) => backend.clearAll(...a),
};
