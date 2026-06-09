// =====================================================================
// Firebase バックエンド（Firestore + Firebase Storage 実装）
// ---------------------------------------------------------------------
// USE_FIREBASE が true のときに使用されます。localBackend.js と同じ
// メソッドシグネチャを実装しているので、store.js の facade から透過的に
// 差し替え可能です。
//
// データ構造:
//   Firestore:
//     users/{uid}/curricula/{curriculumId}                 … カリキュラム
//     users/{uid}/curricula/{curriculumId}/steps/{stepId}  … ステップ
//     users/{uid}/meta/{key}                               … 汎用メタ
//   Storage:
//     users/{uid}/assets/{path}                            … 画像など
//
// SDK は CDN（gstatic）からモジュラー版を動的 import します。
// （USE_FIREBASE が false のときは読み込まれません）
// =====================================================================

import { firebaseConfig, DEFAULT_USER_ID } from "../config/firebase-config.js";

const SDK = "https://www.gstatic.com/firebasejs/10.12.2";
const uid = DEFAULT_USER_ID;

let fs; // firestore モジュール（関数群）
let st; // storage モジュール（関数群）
let db; // Firestore インスタンス
let storage; // Storage インスタンス
let initPromise = null;

// ---------- 初期化 ----------
async function doInit() {
  const [appMod, fsMod, stMod] = await Promise.all([
    import(`${SDK}/firebase-app.js`),
    import(`${SDK}/firebase-firestore.js`),
    import(`${SDK}/firebase-storage.js`),
  ]);
  const app = appMod.initializeApp(firebaseConfig);
  fs = fsMod;
  st = stMod;
  db = fsMod.getFirestore(app);
  storage = stMod.getStorage(app);
  return true;
}

function ready() {
  if (!initPromise) initPromise = doInit();
  return initPromise;
}

// undefined フィールドを除去し、Firestore が受け付ける素のオブジェクトにする
function clean(obj) {
  return JSON.parse(JSON.stringify(obj ?? null));
}

// ---------- 参照ヘルパー ----------
const curriculaCol = () => fs.collection(db, "users", uid, "curricula");
const curriculumDoc = (id) => fs.doc(db, "users", uid, "curricula", id);
const stepsCol = (cid) =>
  fs.collection(db, "users", uid, "curricula", cid, "steps");
const stepDoc = (cid, sid) =>
  fs.doc(db, "users", uid, "curricula", cid, "steps", sid);
const metaCol = () => fs.collection(db, "users", uid, "meta");
const metaDoc = (key) => fs.doc(db, "users", uid, "meta", key);
const assetRef = (path) => st.ref(storage, `users/${uid}/assets/${path}`);
const assetsDir = () => st.ref(storage, `users/${uid}/assets`);
const stepMdRef = (cid, sid) =>
  st.ref(storage, `users/${uid}/curricula/${cid}/${sid}.md`);

export const firebaseBackend = {
  name: "firebase",

  async init() {
    return ready();
  },

  // ---------- カリキュラム ----------
  async getCurricula() {
    await ready();
    const snap = await fs.getDocs(curriculaCol());
    const list = snap.docs.map((d) => d.data());
    return list.sort((a, b) => {
      const ca = a.created || "";
      const cb = b.created || "";
      if (ca && cb && ca !== cb) return ca < cb ? -1 : 1;
      return (a.title || "").localeCompare(b.title || "");
    });
  },

  async getCurriculum(id) {
    await ready();
    const d = await fs.getDoc(curriculumDoc(id));
    return d.exists() ? d.data() : null;
  },

  async saveCurriculum(curriculum) {
    await ready();
    await fs.setDoc(curriculumDoc(curriculum.id), clean(curriculum));
    return curriculum;
  },

  async deleteCurriculum(id) {
    await ready();
    const snap = await fs.getDocs(stepsCol(id));
    await Promise.all(snap.docs.map((d) => fs.deleteDoc(d.ref)));
    await fs.deleteDoc(curriculumDoc(id));
    // Storage 上の md ファイルも削除
    try {
      const dir = st.ref(storage, `users/${uid}/curricula/${id}`);
      const res = await st.listAll(dir);
      await Promise.all(res.items.map((i) => st.deleteObject(i)));
    } catch (_) {
      /* md ディレクトリが無い場合は無視 */
    }
  },

  // ---------- ステップ ----------
  async getSteps(curriculumId) {
    await ready();
    const snap = await fs.getDocs(stepsCol(curriculumId));
    const list = snap.docs.map((d) => d.data());
    return list.sort((a, b) => (a.step || 0) - (b.step || 0));
  },

  async getStep(curriculumId, stepId) {
    await ready();
    const d = await fs.getDoc(stepDoc(curriculumId, stepId));
    return d.exists() ? d.data() : null;
  },

  async saveStep(curriculumId, step) {
    await ready();
    const record = { ...step, curriculumId };
    await fs.setDoc(stepDoc(curriculumId, step.id), clean(record));
    return record;
  },

  // ---------- アセット（画像など → Storage） ----------
  async saveAsset(path, dataUrl) {
    await ready();
    await st.uploadString(assetRef(path), dataUrl, "data_url");
    return path;
  },

  async getAsset(path) {
    await ready();
    try {
      return await st.getDownloadURL(assetRef(path));
    } catch (e) {
      if (e && e.code === "storage/object-not-found") return null;
      throw e;
    }
  },

  async listAssets() {
    await ready();
    const res = await st.listAll(assetsDir());
    return Promise.all(
      res.items.map(async (item) => ({
        path: item.name,
        dataUrl: await st.getDownloadURL(item),
      }))
    );
  },

  // ---------- ステップ md（Storage: curricula/{cid}/{sid}.md） ----------
  async saveStepMd(curriculumId, stepId, md) {
    await ready();
    // UTF-8 を確実に保持するため Blob（uploadBytes）で送る
    const blob = new Blob([md ?? ""], {
      type: "text/markdown;charset=utf-8",
    });
    await st.uploadBytes(stepMdRef(curriculumId, stepId), blob);
    return await st.getDownloadURL(stepMdRef(curriculumId, stepId));
  },

  async getStepMd(curriculumId, stepId) {
    await ready();
    try {
      const url = await st.getDownloadURL(stepMdRef(curriculumId, stepId));
      const res = await fetch(url);
      return res.ok ? await res.text() : null;
    } catch (e) {
      if (e && e.code === "storage/object-not-found") return null;
      throw e;
    }
  },

  // ---------- 汎用メタ ----------
  async saveMeta(key, value) {
    await ready();
    await fs.setDoc(metaDoc(key), { value: clean(value) });
    return value;
  },

  async getMeta(key) {
    await ready();
    const d = await fs.getDoc(metaDoc(key));
    return d.exists() ? d.data().value : null;
  },

  // ---------- 全消去（デバッグ用） ----------
  async clearAll() {
    await ready();
    const curr = await fs.getDocs(curriculaCol());
    await Promise.all(
      curr.docs.map(async (d) => {
        const steps = await fs.getDocs(stepsCol(d.id));
        await Promise.all(steps.docs.map((s) => fs.deleteDoc(s.ref)));
        await fs.deleteDoc(d.ref);
        // Storage の md も削除
        try {
          const dir = st.ref(storage, `users/${uid}/curricula/${d.id}`);
          const res = await st.listAll(dir);
          await Promise.all(res.items.map((i) => st.deleteObject(i)));
        } catch (_) {
          /* 無視 */
        }
      })
    );
    const meta = await fs.getDocs(metaCol());
    await Promise.all(meta.docs.map((d) => fs.deleteDoc(d.ref)));
    try {
      const assets = await st.listAll(assetsDir());
      await Promise.all(assets.items.map((i) => st.deleteObject(i)));
    } catch (_) {
      /* assets ディレクトリが無い場合は無視 */
    }
  },
};
