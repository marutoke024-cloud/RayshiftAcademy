// =====================================================================
// 解説ページ（カリキュラム・ステップ）
// ---------------------------------------------------------------------
// 仕様:
//   - ヘッダー＋ステップタイトル＋ナビをスクロール追従（sticky）
//   - 解説コンテンツ（md 描画・句点で改行・セクションごとに区切り線）
//   - 各セクション末尾の <!-- mash_comment: ... --> をパースして
//     区切り線の直上に「マシュのひとことコメント」を表示
//   - 一口メモ（マシュ吹き出し・引用記法/区切り線は除去）
//   - 「リコールページへ」ボタン
// =====================================================================

import { store } from "../storage/store.js";
import { navigate } from "../app.js";
import { escapeHtml, toast } from "../utils.js";
import { renderMarkdown } from "../lib/markdown.js";
import {
  removeSection,
  getSectionBody,
  breakAfterPeriods,
  cleanMemoText,
} from "../lib/stepDoc.js";
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

  // 前ステップ（固定ナビの「前のステップ」用）
  const steps = await store.getSteps(curriculumId);
  const idx = steps.findIndex((s) => s.id === stepId);
  const prev = idx > 0 ? steps[idx - 1] : null;

  // 一口メモは別枠（マシュ吹き出し）で表示するため本文から除外
  const memoText = cleanMemoText(getSectionBody(step.content, MEMO_HEADING));
  const bodyMd = removeSection(step.content, MEMO_HEADING);

  root.innerHTML = `
    <div class="flow-page learn-page">
      <div class="learn-sticky">
        <div class="flow-topbar">
          <div class="nav-group">
            <button class="btn btn-ghost btn-sm" id="to-home">🏠 トップ</button>
            <button class="btn btn-ghost btn-sm" id="back">≡ カリキュラム</button>
            ${
              prev
                ? `<button class="btn btn-ghost btn-sm" id="to-prev">◁ 前のステップ</button>`
                : ""
            }
          </div>
          <div class="flow-steps">
            <span class="fs active">① 解説</span>
            <span class="fs">② リコール</span>
            <span class="fs">③ フィードバック</span>
          </div>
        </div>
        <div class="learn-stickytitle">
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
            <span class="chip">${escapeHtml(
              step.mode || curriculum.mode || "standard"
            )}</span>
          </div>
        </div>
      </div>

      <section class="card learn-card">
        <div class="learn-content">${buildSectionsHTML(bodyMd)}</div>
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

  // ナビゲーション
  root
    .querySelector("#to-home")
    .addEventListener("click", () => navigate("/"));
  root
    .querySelector("#back")
    .addEventListener("click", () =>
      navigate(`/curriculum/${encodeURIComponent(curriculumId)}`)
    );
  if (prev) {
    root
      .querySelector("#to-prev")
      .addEventListener("click", () =>
        navigate(
          `/curriculum/${encodeURIComponent(
            curriculumId
          )}/step/${encodeURIComponent(prev.id)}/learn`
        )
      );
  }
  root.querySelector("#to-recall").addEventListener("click", () =>
    navigate(
      `/curriculum/${encodeURIComponent(curriculumId)}/step/${encodeURIComponent(
        stepId
      )}/recall`
    )
  );
}

// ---------------------------------------------------------------------
// セクションごとに描画（句点改行 + マシュコメント + 区切り線）
// ---------------------------------------------------------------------
function buildSectionsHTML(bodyMd) {
  // mash_comment マーカー単位で本文を区切る。
  // → 見出しレベル（##/###）に関係なく、コメントが書かれた各セグメントの
  //   「文章の下・実線の上」にコメントを表示できる。
  const re = /<!--\s*mash_comment:\s*([\s\S]*?)-->/gi;
  let html = "";
  let last = 0;
  let m;

  const renderChunk = (md) => {
    if (md && md.trim()) {
      html += `<div class="md-body">${renderMarkdown(breakAfterPeriods(md))}</div>`;
    }
  };

  while ((m = re.exec(bodyMd)) !== null) {
    renderChunk(bodyMd.slice(last, m.index));
    const comment = (m[1] || "").trim();
    if (comment) {
      html += mashCommentHTML(comment);
      html += `<hr class="section-divider" />`;
    }
    last = m.index + m[0].length;
  }
  // 末尾（最後のコメント以降）
  renderChunk(bodyMd.slice(last));
  return html;
}

function mashCommentHTML(text) {
  return `<div class="mash-comment">
    <img class="mash-comment-icon" src="./assets/mash_icon.png" alt="マシュ"
      onerror="this.onerror=null;this.src='./assets/mash_bg.jpg';this.classList.add('is-fallback')" />
    <div class="mash-comment-text">${escapeHtml(text)}</div>
  </div>`;
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
