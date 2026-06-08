// =====================================================================
// フィードバックアップロード画面（Phase 2）
// ---------------------------------------------------------------------
// 仕様:
//   - マシュから受け取ったフィードバックを貼り付けるテキストエリア
//   - 「アップロード」ボタン
//       - フィードバック内容を md に Append
//       - mastery +1（extended は +0.5）
//       - 次ステップを解錠
//   - 解錠演出（マシュ SD イラスト＋称賛メッセージ）
// =====================================================================

import { store } from "../storage/store.js";
import { navigate } from "../app.js";
import { escapeHtml, toast } from "../utils.js";
import { renderMarkdown } from "../lib/markdown.js";
import { createMashBubble } from "../components/mash.js";
import { completeStepWithFeedback } from "../services/progress.js";

export async function renderFeedback(root, curriculumId, stepId) {
  const curriculum = await store.getCurriculum(curriculumId);
  const step = curriculum && (await store.getStep(curriculumId, stepId));
  if (!curriculum || !step) {
    root.innerHTML = `<div class="flow-page"><div class="empty-state"><p>ステップが見つかりません。</p></div></div>`;
    return;
  }
  if (step.status === "locked") {
    toast("このステップはまだ解錠されていません", "warn");
    return navigate(`/curriculum/${encodeURIComponent(curriculumId)}`);
  }

  const alreadyDone = step.status === "completed";

  root.innerHTML = `
    <div class="flow-page feedback-page">
      <div class="flow-topbar">
        <button class="btn btn-ghost" id="back">← リコールへ戻る</button>
        <div class="flow-steps">
          <span class="fs done">① 解説</span>
          <span class="fs done">② リコール</span>
          <span class="fs active">③ フィードバック</span>
        </div>
      </div>

      <header class="card">
        <div class="flow-breadcrumb"><b>${escapeHtml(curriculum.title)}</b></div>
        <h1 class="flow-steptitle">Step ${escapeHtml(step.step)}: ${escapeHtml(
    step.title
  )}</h1>
      </header>

      <section class="card">
        <p class="feedback-note">
          Claude（マシュ）から受け取ったフィードバックを、そのまま下に貼り付けて
          「アップロード」してください。md に追記され、マスタリーが上がり、次のステップが解錠されます。
        </p>
        <textarea id="fb-input" class="field-input" style="min-height:180px"
          placeholder="マシュからのフィードバックをここに貼り付け"></textarea>
        <div class="feedback-actions" style="margin-top:14px">
          <button class="btn btn-primary" id="upload">⬆️ アップロード</button>
        </div>
      </section>

      ${
        step.feedback
          ? `<section class="card">
               <div class="section-title" style="margin-top:0">これまでのフィードバック</div>
               <div class="note-block feedback-block md-body">${renderMarkdown(
                 step.feedback
               )}</div>
             </section>`
          : ""
      }
      ${
        alreadyDone
          ? `<p class="phase-note">※ このステップは完了済みです。追記アップロードも可能です。</p>`
          : ""
      }
    </div>
  `;

  root.querySelector("#back").addEventListener("click", () =>
    navigate(
      `/curriculum/${encodeURIComponent(curriculumId)}/step/${encodeURIComponent(
        stepId
      )}/recall`
    )
  );

  root.querySelector("#upload").addEventListener("click", async () => {
    const text = root.querySelector("#fb-input").value.trim();
    if (!text) {
      toast("フィードバックを貼り付けてください", "warn");
      return;
    }
    const btn = root.querySelector("#upload");
    btn.disabled = true;
    try {
      const result = await completeStepWithFeedback(curriculumId, stepId, text);
      await showUnlockOverlay(curriculumId, result);
    } catch (e) {
      console.error(e);
      toast(`アップロードに失敗しました: ${e.message}`, "error");
      btn.disabled = false;
    }
  });
}

// ---------------------------------------------------------------------
// 解錠演出
// ---------------------------------------------------------------------
async function showUnlockOverlay(curriculumId, result) {
  const { unlocked, allCompleted, masteryGain, curriculum } = result;

  const overlay = document.createElement("div");
  overlay.className = "unlock-overlay";

  const card = document.createElement("div");
  card.className = "unlock-card";
  overlay.appendChild(card);

  const emoji = allCompleted ? "👑" : "🎉";
  const heading = allCompleted ? "カリキュラム完了！" : "ステップ解錠！";
  card.innerHTML = `
    <div class="unlock-emoji">${emoji}</div>
    <h2>${heading}</h2>
    <p>マスタリー +${masteryGain}（現在 ${curriculum.mastery} / 5）</p>
    <div class="unlock-bubble"></div>
    <div class="unlock-actions"></div>
  `;

  const msg = allCompleted
    ? `先輩、全ステップ制覇です…！ 本当にお疲れさまでした。称号「${
        curriculum.shougou || curriculum.title + " マスター"
      }」を贈ります！`
    : unlocked
    ? `お見事です、先輩！ 次のステップ「${unlocked.title}」を解錠しました。続けて挑戦しましょう！`
    : "お見事です、先輩！ しっかり理解できていますね。";

  const bubble = await createMashBubble(msg);
  card.querySelector(".unlock-bubble").appendChild(bubble);

  const actions = card.querySelector(".unlock-actions");
  if (unlocked) {
    const nextBtn = document.createElement("button");
    nextBtn.className = "btn btn-primary";
    nextBtn.textContent = `次のステップへ →`;
    nextBtn.addEventListener("click", () => {
      overlay.remove();
      navigate(
        `/curriculum/${encodeURIComponent(
          curriculumId
        )}/step/${encodeURIComponent(unlocked.id)}/learn`
      );
    });
    actions.appendChild(nextBtn);
  }
  const backBtn = document.createElement("button");
  backBtn.className = "btn btn-ghost";
  backBtn.textContent = "カリキュラムへ戻る";
  backBtn.addEventListener("click", () => {
    overlay.remove();
    navigate(`/curriculum/${encodeURIComponent(curriculumId)}`);
  });
  actions.appendChild(backBtn);

  // オーバーレイの外側クリックで閉じる
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      overlay.remove();
      navigate(`/curriculum/${encodeURIComponent(curriculumId)}`);
    }
  });

  document.body.appendChild(overlay);
}
