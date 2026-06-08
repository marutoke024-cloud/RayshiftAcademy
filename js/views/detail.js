// =====================================================================
// カリキュラム詳細画面（Phase 1: ステップ一覧の表示まで）
// ---------------------------------------------------------------------
// 仕様:
//   - ステップ一覧（完了=解錠アイコン / 未完了=鍵アイコン）
//   - 各ステップへのリンク
// 学習フロー本体（解説/リコール/フィードバック）は Phase 2 で実装します。
// =====================================================================

import { store } from "../storage/store.js";
import { escapeHtml, masteryBadgeSVG, statusLabel, toast } from "../utils.js";
import { navigate } from "../app.js";
import { renderMarkdown } from "../lib/markdown.js";

export async function renderCurriculumDetail(root, curriculumId) {
  const c = await store.getCurriculum(curriculumId);
  if (!c) {
    root.innerHTML = `
      <div class="detail">
        <button class="btn btn-ghost" id="back">← 戻る</button>
        <div class="empty-state"><p>カリキュラムが見つかりません。</p></div>
      </div>`;
    root.querySelector("#back").addEventListener("click", () => navigate("/"));
    return;
  }

  const steps = await store.getSteps(curriculumId);

  root.innerHTML = `
    <div class="detail">
      <div class="detail-topbar">
        <button class="btn btn-ghost" id="back">← トップへ</button>
        <button class="btn btn-danger-ghost" id="delete">このカリキュラムを削除</button>
      </div>

      <header class="detail-header card">
        <div class="detail-badge">${masteryBadgeSVG(c.mastery || 0, 96)}</div>
        <div class="detail-headinfo">
          <h1 class="detail-title">${escapeHtml(c.title)}</h1>
          <div class="detail-meta">
            ${c.category ? `<span class="chip">${escapeHtml(c.category)}</span>` : ""}
            <span class="chip">${escapeHtml(c.mode || "standard")}</span>
            <span class="chip">${c.total_steps || steps.length} ステップ</span>
            <span class="status-pill">${escapeHtml(statusLabel(c.status))}</span>
          </div>
          ${
            (c.tags || []).length
              ? `<div class="card-tags">${c.tags
                  .map((t) => `<span class="tag">#${escapeHtml(t)}</span>`)
                  .join("")}</div>`
              : ""
          }
        </div>
      </header>

      ${
        c.overview
          ? `<section class="card detail-overview">
               <h2 class="section-title">カリキュラム概要</h2>
               <div class="md-body">${renderMarkdown(c.overview)}</div>
             </section>`
          : ""
      }

      <h2 class="section-title">ステップ一覧</h2>
      <ol class="step-list" id="step-list"></ol>

      <p class="phase-note">※ 学習フロー（解説・リコール・フィードバック）は Phase 2 で実装予定です。</p>
    </div>
  `;

  root.querySelector("#back").addEventListener("click", () => navigate("/"));
  root.querySelector("#delete").addEventListener("click", async () => {
    if (
      confirm(`「${c.title}」を削除します。よろしいですか？（進捗も消えます）`)
    ) {
      await store.deleteCurriculum(curriculumId);
      toast("カリキュラムを削除しました", "info");
      navigate("/");
    }
  });

  const list = root.querySelector("#step-list");
  if (steps.length === 0) {
    list.innerHTML = `<li class="step-empty">ステップがありません。</li>`;
    return;
  }
  for (const s of steps) {
    list.appendChild(stepRow(curriculumId, s));
  }
}

function stepRow(curriculumId, s) {
  const li = document.createElement("li");
  const locked = s.status === "locked";
  const completed = s.status === "completed";
  li.className = `step-row ${locked ? "locked" : ""} ${completed ? "completed" : ""}`;

  const icon = completed ? "🔓" : locked ? "🔒" : "▶️";
  const stateLabel = completed ? "完了" : locked ? "未解錠" : "学習中";

  li.innerHTML = `
    <span class="step-icon" aria-hidden="true">${icon}</span>
    <span class="step-num">Step ${escapeHtml(s.step)}</span>
    <span class="step-title">${escapeHtml(s.title)}</span>
    ${s.key_concept ? `<span class="step-key">🔑 ${escapeHtml(s.key_concept)}</span>` : ""}
    <span class="step-state">${stateLabel}</span>
  `;

  if (!locked) {
    li.classList.add("clickable");
    li.addEventListener("click", () => {
      // Phase 2 で学習ページへ遷移予定
      toast("学習ページは Phase 2 で実装予定です", "info");
    });
  }
  return li;
}
