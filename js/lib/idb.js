// =====================================================================
// IndexedDB 軽量ラッパー
// ---------------------------------------------------------------------
// 画像（data URL）も扱うため localStorage ではなく IndexedDB を使用。
// Promise ベースの最小限の API を提供します。
// =====================================================================

const DB_NAME = "rayshift_academy";
const DB_VERSION = 1;

// オブジェクトストア定義
export const STORES = {
  CURRICULA: "curricula", // keyPath: "id"
  STEPS: "steps", // keyPath: "_key" (= curriculumId + "/" + stepId)
  ASSETS: "assets", // keyPath: "path"
  META: "meta", // keyPath: "key"  （汎用 key-value）
};

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORES.CURRICULA)) {
        db.createObjectStore(STORES.CURRICULA, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORES.STEPS)) {
        const steps = db.createObjectStore(STORES.STEPS, { keyPath: "_key" });
        steps.createIndex("curriculumId", "curriculumId", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.ASSETS)) {
        db.createObjectStore(STORES.ASSETS, { keyPath: "path" });
      }
      if (!db.objectStoreNames.contains(STORES.META)) {
        db.createObjectStore(STORES.META, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(storeName, mode, fn) {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        let result;
        Promise.resolve(fn(store))
          .then((r) => {
            result = r;
          })
          .catch(reject);
        transaction.oncomplete = () => resolve(result);
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      })
  );
}

function reqToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const idb = {
  put(storeName, value) {
    return tx(storeName, "readwrite", (store) => reqToPromise(store.put(value)));
  },

  get(storeName, key) {
    return tx(storeName, "readonly", (store) => reqToPromise(store.get(key)));
  },

  getAll(storeName) {
    return tx(storeName, "readonly", (store) =>
      reqToPromise(store.getAll())
    );
  },

  delete(storeName, key) {
    return tx(storeName, "readwrite", (store) =>
      reqToPromise(store.delete(key))
    );
  },

  clear(storeName) {
    return tx(storeName, "readwrite", (store) => reqToPromise(store.clear()));
  },

  // index を使った絞り込み取得
  getAllByIndex(storeName, indexName, value) {
    return tx(storeName, "readonly", (store) => {
      const index = store.index(indexName);
      return reqToPromise(index.getAll(value));
    });
  },
};
