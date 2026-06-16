// =====================================================================
// ミックス復習モード
// ---------------------------------------------------------------------
// 仕様:
//   - 複数カリキュラムにまたがって完了済みステップをランダム出題
//   - 復習モードと同じ表示形式（解説＋理解メモ＋フィードバック）
//   - 「次のステップ」ボタンでランダムに次を表示
// =====================================================================

import { navigate } from "../app.js?v=20260610c";
import { getLibrary, allCompletedSteps } from "../services/library.js?v=20260610c";
import { createReviewBlock } from "../components/reviewBlock.js?v=20260610c";
import { createMashBubble } from "../components/mash.js?v=20260610c";

export async function renderMixReview(root) {
  const library = await getLibrary();
  const pool = allCompletedSteps(library); // [{curriculum, step}]

  root.innerHTML = `
    <div class="flow-page mix-page">
      <div class="flow-topbar">
        <button class="btn btn-ghost" id="back">← トップへ</button>
        <span class="status-pill">🔀 ミックス復習</span>
      </div>
      <div id="mix-intro"></div>
      <div id="mix-body"></div>
      <div class="mix-actions" id="mix-actions"></div>
    </div>
  `;

  root.querySelector("#back").addEventListener("click", () => navigate("/"));

  const intro = root.querySelector("#mix-intro");
  const body = root.querySelector("#mix-body");
  const actions = root.querySelector("#mix-actions");

  if (pool.length === 0) {
    intro.appendChild(
      await createMashBubble(
        "先輩、まだ完了したステップがありません。まずは学習を進めて、完了ステップを増やしましょう！"
      )
    );
    return;
  }

  let lastIndex = -1;

  function pickRandomIndex() {
    if (pool.length === 1) return 0;
    let i;
    do {
      i = Math.floor(Math.random() * pool.length);
    } while (i === lastIndex);
    return i;
  }

  function showNext() {
    const i = pickRandomIndex();
    lastIndex = i;
    const { curriculum, step } = pool[i];
    body.innerHTML = "";
    body.appendChild(
      createReviewBlock(curriculum, step, { showCurriculumName: true })
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // 出題プール件数の案内
  const introBubble = await createMashBubble(
    `完了済みの ${pool.length} ステップからランダムに出題します。記憶の定着、いきましょう先輩！`
  );
  intro.appendChild(introBubble);

  // アクションボタン
  const nextBtn = document.createElement("button");
  nextBtn.className = "btn btn-primary";
  nextBtn.textContent = "🔀 次のステップ";
  nextBtn.addEventListener("click", showNext);
  actions.appendChild(nextBtn);

  showNext();
}
