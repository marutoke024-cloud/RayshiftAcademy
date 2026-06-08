// =====================================================================
// 復習モード（カリキュラム単位）
// ---------------------------------------------------------------------
// 仕様:
//   - 全ステップ完了で解放
//   - ステップごとに 解説全文 / 初回メモ / 最新メモ / フィードバック を表示
//   - 成長記録（初回と最新の比較）
// =====================================================================

import { store } from "../storage/store.js";
import { navigate } from "../app.js";
import { escapeHtml, statusLabel } from "../utils.js";
import { createReviewBlock } from "../components/reviewBlock.js";

export async function renderReview(root, curriculumId) {
  const curriculum = await store.getCurriculum(curriculumId);
  if (!curriculum) {
    root.innerHTML = `<div class="flow-page"><div class="empty-state"><p>カリキュラムが見つかりません。</p></div></div>`;
    return;
  }
  const steps = await store.getSteps(curriculumId);
  const completed = steps.filter((s) => s.status === "completed");
  const total = curriculum.total_steps || steps.length;
  const isUnlocked =
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

  if (!isUnlocked) {
    body.innerHTML = `
      <div class="card empty-state">
        <div class="empty-emoji">🔒</div>
        <p>復習モードは<strong>全ステップ完了</strong>で解放されます。</p>
        <p class="empty-sub">現在 ${completed.length} / ${total} ステップ完了</p>
      </div>`;
    return;
  }

  if (steps.length === 0) {
    body.innerHTML = `<div class="card empty-state"><p>ステップがありません。</p></div>`;
    return;
  }

  for (const s of steps) {
    body.appendChild(createReviewBlock(curriculum, s));
  }
}
