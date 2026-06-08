// =====================================================================
// 解説ページ（Phase 2）
// ---------------------------------------------------------------------
// 仕様:
//   - ステップタイトル・概要
//   - 解説コンテンツ（md 描画: なぜ必要か / なぜそう設計されているか / 何で
//     あるか / どう動くか / どう使うか / 任意ブロック）
//   - 一口メモ（マシュ SD イラスト＋吹き出し）
//   - 「リコールページへ」ボタン
// =====================================================================

import { store } from "../storage/store.js";
import { navigate } from "../app.js";
import { escapeHtml, toast } from "../utils.js";
import { renderMarkdown } from "../lib/markdown.js";
import { getSectionBody, removeSection } from "../lib/stepDoc.js";
import { createMashBubble } from "../components/mash.js";

const MEMO_HEADING = "一口メモ";

export async function renderLearn(root, curriculumId, stepId) {
  const curriculum = await store.getCurriculum(curriculumId);
  const step = curriculum && (await store.getStep(curriculumId, stepId));
  if (!curriculum || !step) {
    return notFound(root, curriculumId);
  }
  if (step.status === "locked") {
    toast("このステップはまだ解錠されていません", "warn");
    return navigate(`/curriculum/${encodeURIComponent(curriculumId)}`);
  }

  // 一口メモは別枠（マシュ吹き出し）で表示するため本文から除外
  const memoText = getSectionBody(step.content, MEMO_HEADING);
  const bodyMd = removeSection(step.content, MEMO_HEADING);

  root.innerHTML = `
    <div class="flow-page learn-page">
      <div class="flow-topbar">
        <button class="btn btn-ghost" id="back">← カリキュラムへ</button>
        <div class="flow-steps">
          <span class="fs active">① 解説</span>
          <span class="fs">② リコール</span>
          <span class="fs">③ フィードバック</span>
        </div>
      </div>

      <header class="card">
        <div class="flow-breadcrumb"><b>${escapeHtml(curriculum.title)}</b></div>
        <h1 class="flow-steptitle">Step ${escapeHtml(step.step)}: ${escapeHtml(
    step.title
  )}</h1>
        <div class="flow-stepmeta">
          ${
            step.key_concept
              ? `<span class="step-key">🔑 ${escapeHtml(step.key_concept)}</span>`
              : ""
          }
          <span class="chip">${escapeHtml(step.mode || curriculum.mode || "standard")}</span>
        </div>
      </header>

      <section class="card">
        <div class="md-body learn-content">${renderMarkdown(bodyMd)}</div>
      </section>

      <section class="card" id="memo-area"></section>

      <div class="learn-actions">
        <button class="btn btn-primary" id="to-recall">リコールページへ →</button>
      </div>
    </div>
  `;

  // 一口メモ（マシュ吹き出し）
  const memoArea = root.querySelector("#memo-area");
  const bubble = await createMashBubble(
    memoText ||
      "先輩、ここまでお疲れさまです！ 次はリコールで、学んだことを自分の言葉にしてみましょう。"
  );
  const label = document.createElement("div");
  label.className = "section-title";
  label.style.marginTop = "0";
  label.textContent = "💡 一口メモ";
  memoArea.appendChild(label);
  memoArea.appendChild(bubble);

  root
    .querySelector("#back")
    .addEventListener("click", () =>
      navigate(`/curriculum/${encodeURIComponent(curriculumId)}`)
    );
  root.querySelector("#to-recall").addEventListener("click", () =>
    navigate(
      `/curriculum/${encodeURIComponent(curriculumId)}/step/${encodeURIComponent(
        stepId
      )}/recall`
    )
  );
}

function notFound(root, curriculumId) {
  root.innerHTML = `<div class="flow-page">
    <button class="btn btn-ghost" id="back">← 戻る</button>
    <div class="empty-state"><p>ステップが見つかりません。</p></div>
  </div>`;
  root
    .querySelector("#back")
    .addEventListener("click", () =>
      navigate(curriculumId ? `/curriculum/${encodeURIComponent(curriculumId)}` : "/")
    );
}
