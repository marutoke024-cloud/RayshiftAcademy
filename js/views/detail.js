// =====================================================================
// カリキュラム詳細画面
// ---------------------------------------------------------------------
// 仕様:
//   - ステップ一覧（完了=解錠アイコン / 未完了=鍵アイコン）
//   - 各ステップへのリンク（解錠済みは学習フローへ遷移）
//   - 進捗バー
// =====================================================================

import { store } from "../storage/store.js?v=20260610c";
import { escapeHtml, statusLabel, toast } from "../utils.js?v=20260610c";
import { navigate } from "../app.js?v=20260610c";
import { renderMarkdown } from "../lib/markdown.js?v=20260610c";
import { applyMasteryBadge } from "../components/masteryBadge.js?v=20260610c";

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
  const completedCount = steps.filter((s) => s.status === "completed").length;
  const total = c.total_steps || steps.length;
  const isCompleted =
    c.status === "完了" || c.status === "completed" ||
    (total > 0 && completedCount >= total);

  root.innerHTML = `
    <div class="detail">
      <div class="detail-topbar">
        <button class="btn btn-ghost" id="back">← トップへ</button>
        <div class="detail-topbar-right">
          ${
            isCompleted
              ? `<button class="btn btn-primary" id="review">📖 復習モード</button>`
              : ""
          }
          <button class="btn btn-danger-ghost" id="delete">削除</button>
        </div>
      </div>

      <header class="detail-header card">
        <div class="detail-badge"></div>
        <div class="detail-headinfo">
          <h1 class="detail-title">${escapeHtml(c.title)}</h1>
          <div class="detail-meta">
            ${c.category ? `<span class="chip">${escapeHtml(c.category)}</span>` : ""}
            <span class="chip">${escapeHtml(c.mode || "standard")}</span>
            <span class="chip">${c.total_steps || steps.length} ステップ</span>
            <span class="status-pill status-${rawStatus(c.status)}">${escapeHtml(
    statusLabel(c.status)
  )}</span>
          </div>
          ${
            (c.tags || []).length
              ? `<div class="card-tags">${c.tags
                  .map((t) => `<span class="tag">#${escapeHtml(t)}</span>`)
                  .join("")}</div>`
              : ""
          }
          ${progressBar(completedCount, c.total_steps || steps.length)}
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
    </div>
  `;

  applyMasteryBadge(root.querySelector(".detail-badge"), c.mastery || 0, 96);

  root.querySelector("#back").addEventListener("click", () => navigate("/"));
  const reviewBtn = root.querySelector("#review");
  if (reviewBtn) {
    reviewBtn.addEventListener("click", () =>
      navigate(`/curriculum/${encodeURIComponent(curriculumId)}/review`)
    );
  }
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
      navigate(
        `/curriculum/${encodeURIComponent(curriculumId)}/step/${encodeURIComponent(
          s.id
        )}/learn`
      );
    });
  }
  return li;
}

function rawStatus(status) {
  if (status === "完了" || status === "completed") return "completed";
  if (status === "進行中" || status === "in_progress") return "in_progress";
  return "not_started";
}

function progressBar(completed, total) {
  if (!total) return "";
  const pct = Math.round((completed / total) * 100);
  return `
    <div class="progress-bar" style="max-width:320px">
      <div class="progress-fill" style="width:${pct}%"></div>
    </div>
    <div class="progress-label">${completed} / ${total} ステップ完了</div>`;
}
