// =====================================================================
// 復習モード（カリキュラム単位）
// ---------------------------------------------------------------------
// 仕様:
//   - 全ステップ完了で解放
//   - ステップごとに 解説全文 / 初回メモ / 最新メモ / フィードバック を表示
//   - 成長記録（初回と最新の比較）
// =====================================================================

import { store } from "../storage/store.js?v=20260610c";
import { navigate } from "../app.js?v=20260610c";
import { escapeHtml, statusLabel } from "../utils.js?v=20260610c";
import { createReviewBlock } from "../components/reviewBlock.js?v=20260610c";

export async function renderReview(root, curriculumId) {
  const curriculum = await store.getCurriculum(curriculumId);
  if (!curriculum) {
    root.innerHTML = `<div class="flow-page"><div class="empty-state"><p>カリキュラムが見つかりません。</p></div></div>`;
    return;
  }
  const steps = await store.getSteps(curriculumId);
  const completed = steps.filter((s) => s.status === "completed");
  const total = curriculum.total_steps || steps.length;
  const allDone =
    curriculum.status === "完了" ||
    (total > 0 && completed.length >= total);

  root.innerHTML = `
    <div class="flow-page review-page">
      <div class="flow-topbar">
        <button class="btn btn-ghost" id="back">← カリキュラムへ</button>
        <span class="status-pill">${escapeHtml(statusLabel(curriculum.status))}</span>
      </div>
      <header class="card">
        <h1 class="flow-steptitle">📖 復習モード</h1>
        <div class="flow-breadcrumb"><b>${escapeHtml(curriculum.title)}</b></div>
      </header>
      <div id="review-body"></div>
    </div>
  `;

  root.querySelector("#back").addEventListener("click", () =>
    navigate(`/curriculum/${encodeURIComponent(curriculumId)}`)
  );

  const body = root.querySelector("#review-body");

  // まだ 1 つも完了していない場合のみロック表示
  if (completed.length === 0) {
    body.innerHTML = `
      <div class="card empty-state">
        <div class="empty-emoji">🔒</div>
        <p>まだ完了したステップがありません。</p>
        <p class="empty-sub">学習を進める（PC）と、ここで復習できるようになります。</p>
      </div>`;
    return;
  }

  // 全完了なら全ステップ、未完了なら完了済みステップのみを表示
  const shown = allDone ? steps : completed;

  if (!allDone) {
    const banner = document.createElement("div");
    banner.className = "growth-record";
    banner.style.marginBottom = "12px";
    banner.textContent = `完了済みの ${completed.length} / ${total} ステップを表示中（全ステップ完了で残りも揃います）`;
    body.appendChild(banner);
  }

  for (const s of shown) {
    body.appendChild(createReviewBlock(curriculum, s));
  }
}
