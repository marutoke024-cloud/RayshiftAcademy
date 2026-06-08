// =====================================================================
// アプリ本体（ハッシュルーター & 起動処理）
// ---------------------------------------------------------------------
// GitHub Pages（サブパス配信）でも動くようハッシュルーティングを使用。
//   #/                      → トップ（カリキュラム一覧）
//   #/curriculum/:id        → カリキュラム詳細
// =====================================================================

import { store } from "./storage/store.js";
import { isPC, toast } from "./utils.js";
import { renderHome } from "./views/home.js";
import { renderCurriculumDetail } from "./views/detail.js";

const appRoot = () => document.getElementById("app");

/** 画面遷移（ハッシュを更新するだけ。実描画は hashchange で行う） */
export function navigate(path) {
  const target = path.startsWith("#") ? path : "#" + path;
  if (location.hash === target) {
    route(); // 同一ハッシュでも再描画
  } else {
    location.hash = target;
  }
}

function parseHash() {
  const raw = location.hash.replace(/^#/, "") || "/";
  const parts = raw.split("/").filter(Boolean); // 先頭の "/" を除く
  return { raw, parts };
}

async function route() {
  const root = appRoot();
  if (!root) return;
  const { parts } = parseHash();

  try {
    if (parts.length === 0) {
      await renderHome(root);
    } else if (parts[0] === "curriculum" && parts[1]) {
      await renderCurriculumDetail(root, decodeURIComponent(parts[1]));
    } else {
      // 未知のルートはトップへ
      await renderHome(root);
    }
    // 画面遷移時は先頭にスクロール
    window.scrollTo({ top: 0 });
  } catch (e) {
    console.error("ルーティングエラー:", e);
    root.innerHTML = `<div class="error-state card">
      <h2>表示中にエラーが発生しました</h2>
      <pre>${(e && e.message) || e}</pre>
      <button class="btn btn-primary" onclick="location.hash='#/'">トップへ戻る</button>
    </div>`;
  }
}

function setupHeader() {
  const header = document.getElementById("app-header");
  if (!header) return;
  header.innerHTML = `
    <a class="brand" href="#/">
      <span class="brand-mark">✨</span>
      <span class="brand-name">Rayshift Academy</span>
    </a>
    <div class="header-right">
      <span class="device-pill">${isPC() ? "PC モード" : "復習モード（モバイル）"}</span>
    </div>
  `;
}

async function boot() {
  setupHeader();
  try {
    await store.init();
    console.info(`ストレージ: ${store.backendName} バックエンドを使用`);
  } catch (e) {
    console.error(e);
    toast(`ストレージ初期化に失敗: ${e.message}`, "error");
  }

  window.addEventListener("hashchange", route);
  // 画面幅が変わったらヘッダーのモード表示を更新
  window.addEventListener("resize", debounce(setupHeader, 200));

  await route();
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

boot();
