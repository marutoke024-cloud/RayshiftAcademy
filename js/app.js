// =====================================================================
// アプリ本体（ハッシュルーター & 起動処理）
// ---------------------------------------------------------------------
// GitHub Pages（サブパス配信）でも動くようハッシュルーティングを使用。
//   #/                      → トップ（カリキュラム一覧）
//   #/curriculum/:id        → カリキュラム詳細
// =====================================================================

import { store } from "./storage/store.js";
import { isPC, deviceClass, toast } from "./utils.js";
import { renderHome } from "./views/home.js";
import { renderCurriculumDetail } from "./views/detail.js";
import { renderLearn } from "./views/learn.js";
import { renderRecall } from "./views/recall.js";
import { renderFeedback } from "./views/feedback.js";
import { renderReview } from "./views/review.js";
import { renderMixReview } from "./views/mixReview.js";

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
    } else if (parts[0] === "mix-review") {
      await renderMixReview(root);
    } else if (parts[0] === "curriculum" && parts[1]) {
      const curriculumId = decodeURIComponent(parts[1]);
      // #/curriculum/:id/review
      if (parts[2] === "review") {
        await renderReview(root, curriculumId);
        window.scrollTo({ top: 0 });
        return;
      }
      // #/curriculum/:id/step/:stepId/(learn|recall|feedback)
      if (parts[2] === "step" && parts[3]) {
        const stepId = decodeURIComponent(parts[3]);
        const mode = parts[4] || "learn";
        // モバイル/タブレットは復習専用 → 学習フローは復習モードへ誘導
        if (!isPC()) {
          toast("学習は PC で行えます。モバイルは復習専用です", "info");
          await renderReview(root, curriculumId);
          window.scrollTo({ top: 0 });
          return;
        }
        if (mode === "recall") {
          await renderRecall(root, curriculumId, stepId);
        } else if (mode === "feedback") {
          await renderFeedback(root, curriculumId, stepId);
        } else {
          await renderLearn(root, curriculumId, stepId);
        }
      } else {
        await renderCurriculumDetail(root, curriculumId);
      }
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

function applyDeviceClass() {
  document.body.dataset.device = deviceClass();
}

async function boot() {
  applyDeviceClass();
  setupHeader();
  try {
    await store.init();
    console.info(`ストレージ: ${store.backendName} バックエンドを使用`);
  } catch (e) {
    console.error(e);
    toast(`ストレージ初期化に失敗: ${e.message}`, "error");
  }

  window.addEventListener("hashchange", route);

  // 画面サイズ / 向きの変化に追従（PC⇔モバイルが切り替わったら再描画）
  let lastPC = isPC();
  const onResize = debounce(() => {
    applyDeviceClass();
    setupHeader();
    const nowPC = isPC();
    if (nowPC !== lastPC) {
      lastPC = nowPC;
      route(); // 利用可能機能が変わるので画面を作り直す
    }
  }, 200);
  window.addEventListener("resize", onResize);
  window.addEventListener("orientationchange", onResize);

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
