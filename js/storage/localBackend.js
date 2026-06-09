// =====================================================================
// ローカルストレージ・バックエンド（IndexedDB 実装）
// ---------------------------------------------------------------------
// Firebase を使わないときの保存先。store.js の facade から利用されます。
// データ構造は Firebase 版へ移行しやすいよう、仕様書の Firestore 構造に
// 寄せています。
// =====================================================================

import { idb, STORES } from "../lib/idb.js";

function stepKey(curriculumId, stepId) {
  return `${curriculumId}/${stepId}`;
}

export const localBackend = {
  name: "local",

  async init() {
    // IndexedDB は遅延オープンなので、ここでは特に処理不要。
    return true;
  },

  // ---------- カリキュラム ----------
  async getCurricula() {
    const list = await idb.getAll(STORES.CURRICULA);
    // created の昇順（無ければタイトル順）で安定ソート
    return list.sort((a, b) => {
      const ca = a.created || "";
      const cb = b.created || "";
      if (ca && cb && ca !== cb) return ca < cb ? -1 : 1;
      return (a.title || "").localeCompare(b.title || "");
    });
  },

  async getCurriculum(id) {
    return (await idb.get(STORES.CURRICULA, id)) || null;
  },

  async saveCurriculum(curriculum) {
    await idb.put(STORES.CURRICULA, curriculum);
    return curriculum;
  },

  async deleteCurriculum(id) {
    const steps = await this.getSteps(id);
    await Promise.all(
      steps.map((s) => idb.delete(STORES.STEPS, stepKey(id, s.id)))
    );
    await idb.delete(STORES.CURRICULA, id);
  },

  // ---------- ステップ ----------
  async getSteps(curriculumId) {
    const list = await idb.getAllByIndex(
      STORES.STEPS,
      "curriculumId",
      curriculumId
    );
    return list.sort((a, b) => (a.step || 0) - (b.step || 0));
  },

  async getStep(curriculumId, stepId) {
    return (await idb.get(STORES.STEPS, stepKey(curriculumId, stepId))) || null;
  },

  async saveStep(curriculumId, step) {
    const record = {
      ...step,
      curriculumId,
      _key: stepKey(curriculumId, step.id),
    };
    await idb.put(STORES.STEPS, record);
    return record;
  },

  // ---------- アセット（画像など） ----------
  async saveAsset(path, dataUrl) {
    await idb.put(STORES.ASSETS, { path, dataUrl });
    return path;
  },

  async getAsset(path) {
    const rec = await idb.get(STORES.ASSETS, path);
    return rec ? rec.dataUrl : null;
  },

  async listAssets() {
    return await idb.getAll(STORES.ASSETS);
  },

  // ---------- ステップ md（ローカルでは META に保持） ----------
  async saveStepMd(curriculumId, stepId, md) {
    const key = `md:${stepKey(curriculumId, stepId)}`;
    await idb.put(STORES.META, { key, value: md });
    return md;
  },

  async getStepMd(curriculumId, stepId) {
    const key = `md:${stepKey(curriculumId, stepId)}`;
    const rec = await idb.get(STORES.META, key);
    return rec ? rec.value : null;
  },

  // ---------- 汎用メタ（称号スナップショットなど） ----------
  async saveMeta(key, value) {
    await idb.put(STORES.META, { key, value });
    return value;
  },

  async getMeta(key) {
    const rec = await idb.get(STORES.META, key);
    return rec ? rec.value : null;
  },

  // ---------- 全消去（デバッグ用） ----------
  async clearAll() {
    await Promise.all([
      idb.clear(STORES.CURRICULA),
      idb.clear(STORES.STEPS),
      idb.clear(STORES.ASSETS),
      idb.clear(STORES.META),
    ]);
  },
};
