// =====================================================================
// アプリ本体（ハッシュルーター & 起動処理）
// ---------------------------------------------------------------------
// GitHub Pages（サブパス配信）でも動くようハッシュルーティングを使用。
//   #/                      → トップ（カリキュラム一覧）
//   #/curriculum/:id        → カリキュラム詳細
// =====================================================================

import { store } from "./storage/store.js?v=20260610c";
import { deviceClass, toast } from "./utils.js?v=20260610c";
import { renderHome } from "./views/home.js?v=20260610c";
import { renderCurriculumDetail } from "./views/detail.js?v=20260610c";
import { renderLearn } from "./views/learn.js?v=20260610c";
import { renderRecall } from "./views/recall.js?v=20260610c";
import { renderFeedback } from "./views/feedback.js?v=20260610c";
import { renderReview } from "./views/review.js?v=20260610c";
import { renderMixReview } from "./views/mixReview.js?v=20260610c";
import { renderDesignCourse } from "./views/designCourse.js?v=20260610c";
import { renderEnglishClass } from "./views/englishClass.js?v=20260610c";
import { mountChatWidget } from "./components/chatWidget.js?v=20260610c";
import { mashLogoUrl, iconOnerrorAttr } from "./lib/mashIcon.js?v=20260610c";

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

  // ヘッダーはロゴ固定・各アイコンは描画時に箇所ごと独立ランダムのため、
  // ルート毎の一括リロールは不要（ヘッダーは boot で 1 度だけ構築）。

  try {
    if (parts.length === 0) {
      await renderHome(root);
    } else if (parts[0] === "mix-review") {
      await renderMixReview(root);
    } else if (parts[0] === "design") {
      await renderDesignCourse(root);
    } else if (parts[0] === "english") {
      await renderEnglishClass(root, parts.slice(1));
    } else if (parts[0] === "curriculum" && parts[1]) {
      const curriculumId = decodeURIComponent(parts[1]);
      // #/curriculum/:id/review
      if (parts[2] === "review") {
        await renderReview(root, curriculumId);
        window.scrollTo({ top: 0 });
        return;
      }
      // #/curriculum/:id/step/:stepId/(learn|recall|feedback)
      // 全デバイスで学習フローを利用可能（モバイルも PC と同じ機能）
      if (parts[2] === "step" && parts[3]) {
        const stepId = decodeURIComponent(parts[3]);
        const mode = parts[4] || "learn";
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
      <img class="brand-logo" src="${mashLogoUrl()}" alt="Rayshift Academy"
        onerror="${iconOnerrorAttr()}" />
      <span class="brand-name">Rayshift&nbsp;Academy</span>
    </a>
    <nav class="header-nav">
      <a class="header-link" href="#/design">🎨 デザイン講座</a>
      <a class="header-link" href="#/english">🛡️ マシュの英語教室</a>
    </nav>
    <div class="header-right">
      <button class="header-sync" id="header-sync" aria-label="同期">🔄 同期</button>
    </div>
  `;
  header
    .querySelector("#header-sync")
    ?.addEventListener("click", syncNow);
}

function applyDeviceClass() {
  document.body.dataset.device = deviceClass();
}

// ---------------------------------------------------------------------
// 手動同期: 押したときだけ Firestore から再取得して現在ページを再描画
// （リアルタイム同期/onSnapshot は使用しない）
// ---------------------------------------------------------------------
let syncing = false;
async function syncNow() {
  if (syncing) return;
  syncing = true;
  showSyncIndicator(true);
  try {
    await route(); // バックエンドから最新を再取得して再描画
    toast("同期しました", "success");
  } catch (e) {
    console.error("同期エラー:", e);
    toast("同期に失敗しました", "error");
  } finally {
    showSyncIndicator(false);
    syncing = false;
  }
}

function showSyncIndicator(on) {
  let el = document.getElementById("sync-indicator");
  if (on) {
    if (!el) {
      el = document.createElement("div");
      el.id = "sync-indicator";
      el.className = "sync-indicator";
      el.innerHTML = `<span class="sync-spinner">🔄</span> 同期中…`;
      document.body.appendChild(el);
    }
  } else {
    el?.remove();
  }
}

async function boot() {
  applyDeviceClass();
  setupHeader();
  mountChatWidget(); // 全ページ右下に常駐
  try {
    await store.init();
    console.info(`ストレージ: ${store.backendName} バックエンドを使用`);
  } catch (e) {
    console.error(e);
    toast(`ストレージ初期化に失敗: ${e.message}`, "error");
  }

  window.addEventListener("hashchange", route);

  // 画面サイズ / 向きの変化に追従（全デバイス同一機能なので CSS 用クラスのみ更新。
  // 入力中の内容を失わないよう route() の再描画はしない）
  const onResize = debounce(() => {
    applyDeviceClass();
  }, 200);
  window.addEventListener("resize", onResize);
  window.addEventListener("orientationchange", onResize);

  await route();
  hideSplash();
}

// ---------------------------------------------------------------------
// スターティングアニメーション（ロゴ・スプラッシュ）を閉じる
// ---------------------------------------------------------------------
function hideSplash() {
  const splash = document.getElementById("splash");
  if (!splash) return;
  const reduce =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const minMs = reduce ? 300 : 1900; // 最低表示時間（演出を見せる）
  const wait = Math.max(0, minMs - performance.now());
  const dismiss = () => {
    splash.classList.add("is-hiding");
    setTimeout(() => splash.remove(), 720);
  };
  const timer = setTimeout(dismiss, wait);
  // クリック/タップでスキップ
  splash.addEventListener("click", () => {
    clearTimeout(timer);
    dismiss();
  });
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

boot();
