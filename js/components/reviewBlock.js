// =====================================================================
// 復習ブロック（復習モード / ミックス復習で共通利用）
// ---------------------------------------------------------------------
// 1 ステップ分を表示:
//   - 解説コンテンツ（全文・折りたたみ）
//   - 初回理解メモ / 最新理解メモ
//   - マシュのフィードバック
//   - 成長記録（初回と最新の比較）
// =====================================================================

import { escapeHtml } from "../utils.js?v=20260610c";
import { renderMarkdown } from "../lib/markdown.js?v=20260610c";

/**
 * @param {object} curriculum
 * @param {object} step
 * @param {object} opts { showCurriculumName?: boolean }
 * @returns {HTMLElement}
 */
export function createReviewBlock(curriculum, step, opts = {}) {
  const el = document.createElement("section");
  el.className = "card review-block";

  const hasFirst = !!(step.firstNote && step.firstNote.trim());
  const hasLatest = !!(step.latestNote && step.latestNote.trim());
  const grew = hasFirst && hasLatest && step.firstNote !== step.latestNote;

  el.innerHTML = `
    ${
      opts.showCurriculumName
        ? `<div class="flow-breadcrumb"><b>${escapeHtml(
            curriculum.title
          )}</b></div>`
        : ""
    }
    <h3 class="review-title">Step ${escapeHtml(step.step)}: ${escapeHtml(
    step.title
  )}</h3>
    <div class="review-meta">
      ${
        step.key_concept
          ? `<span class="step-key">🔑 ${escapeHtml(step.key_concept)}</span>`
          : ""
      }
      ${
        step.mastery_gained
          ? `<span class="chip">獲得 +${step.mastery_gained}</span>`
          : ""
      }
    </div>

    <details class="review-explanation">
      <summary>📘 解説を読む（全文）</summary>
      <div class="md-body">${renderMarkdown(step.content || "")}</div>
    </details>

    <div class="review-notes">
      ${noteColumn("🧠 初回の理解メモ", step.firstNote, !hasFirst)}
      ${
        grew
          ? noteColumn("🌱 最新の理解メモ", step.latestNote, false)
          : hasLatest && !hasFirst
          ? noteColumn("🧠 理解メモ", step.latestNote, false)
          : ""
      }
    </div>

    ${
      grew
        ? `<div class="growth-record">📈 成長記録: 初回から理解が更新されています</div>`
        : hasFirst
        ? `<div class="growth-record subtle">初回メモのまま（更新なし）</div>`
        : ""
    }

    ${
      step.feedback && step.feedback.trim()
        ? `<div class="review-feedback">
             <div class="review-subtitle">💬 マシュのフィードバック</div>
             <div class="note-block feedback-block md-body">${renderMarkdown(
               step.feedback
             )}</div>
           </div>`
        : ""
    }
  `;

  return el;
}

function noteColumn(title, text, empty) {
  if (empty) {
    return `<div class="note-col">
      <div class="review-subtitle">${title}</div>
      <div class="note-block subtle">（メモはありません）</div>
    </div>`;
  }
  return `<div class="note-col">
    <div class="review-subtitle">${title}</div>
    <div class="note-block">${escapeHtml(text)}</div>
  </div>`;
}
