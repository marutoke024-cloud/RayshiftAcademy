// =====================================================================
// トップ画面（カリキュラム一覧 / 本棚）
// ---------------------------------------------------------------------
// 仕様:
//   - カリキュラム一覧（本棚形式）＋マスタリーバッジ
//   - 称号・実績表示エリア
//   - 今日のおすすめ（マシュピックアップ・ステップ単位）
//   - ミックス復習ボタン
//   - md インポート（PC のみ）
// =====================================================================

import { createImportPanel } from "../components/importPanel.js?v=20260610c";
import { createMashBubble, resetMashImageCache } from "../components/mash.js?v=20260610c";
import { applyMasteryBadge, resetBadgeCache } from "../components/masteryBadge.js?v=20260610c";
import { escapeHtml, statusLabel } from "../utils.js?v=20260610c";
import { navigate } from "../app.js?v=20260610c";
import { getLibrary, allCompletedSteps } from "../services/library.js?v=20260610c";
import { pickTodaysStep } from "../services/recommend.js?v=20260610c";
import { computeTitles, persistTitles } from "../services/titles.js?v=20260610c";
import { createHelpButton } from "../components/helpModal.js?v=20260610c";

export async function renderHome(root) {
  root.innerHTML = `<div class="home"></div>`;
  const home = root.querySelector(".home");

  // アプリ全体の使い方（？）
  const helpRow = document.createElement("div");
  helpRow.className = "page-help-row";
  helpRow.appendChild(
    createHelpButton("overview", { label: "❓ アプリの使い方" })
  );
  home.appendChild(helpRow);

  const library = await getLibrary();
  const curricula = library.map((x) => x.curriculum);
  const completedStepCount = allCompletedSteps(library).length;

  // --- 今日のおすすめ（全デバイス） ---
  const recommendArea = document.createElement("section");
  recommendArea.className = "recommend-area";
  home.appendChild(recommendArea);
  renderRecommendation(recommendArea, library);

  // --- アクションバー（ミックス復習・全デバイス） ---
  const actions = document.createElement("section");
  actions.className = "home-actions";
  actions.innerHTML = `
    <button class="btn btn-primary" id="mix-review" ${
      completedStepCount > 0 ? "" : "disabled"
    }>
      🔀 ミックス復習
    </button>
    <span class="home-actions-note">${
      completedStepCount > 0
        ? `完了済み ${completedStepCount} ステップからランダム出題`
        : "完了したステップが増えると利用できます"
    }</span>
  `;
  actions
    .querySelector("#mix-review")
    .addEventListener("click", () => navigate("/mix-review"));
  home.appendChild(actions);

  // --- インポート（全デバイス） ---
  const panel = createImportPanel(() => {
    resetMashImageCache();
    resetBadgeCache();
    renderHome(root); // 再描画
  });
  home.appendChild(panel);

  // --- 称号・実績エリア ---
  const titlesArea = document.createElement("section");
  titlesArea.className = "titles-area card";
  renderTitles(titlesArea, library);
  home.appendChild(titlesArea);

  // --- 本棚（カリキュラム一覧） ---
  const shelfHeader = document.createElement("h2");
  shelfHeader.className = "section-title";
  shelfHeader.textContent = "📚 カリキュラム";
  home.appendChild(shelfHeader);

  const shelf = document.createElement("section");
  shelf.className = "bookshelf";
  home.appendChild(shelf);

  if (curricula.length === 0) {
    shelf.innerHTML = `
      <div class="empty-state">
        <div class="empty-emoji">🗂️</div>
        <p>まだカリキュラムがありません。</p>
        <p class="empty-sub">上の「インポート」から Obsidian の md フォルダ（または md・画像）を取り込んでください。</p>
      </div>`;
    return;
  }

  for (const c of curricula) {
    shelf.appendChild(curriculumCard(c));
  }
}

// ---------------------------------------------------------------------
// カリキュラムカード
// ---------------------------------------------------------------------
function curriculumCard(c) {
  const card = document.createElement("article");
  card.className = "curriculum-card";
  card.tabIndex = 0;
  card.setAttribute("role", "button");

  const total = c.total_steps || 0;
  const completedSteps = c.completedSteps || 0;
  const pct = total ? Math.round((completedSteps / total) * 100) : 0;
  const tags = (c.tags || [])
    .map((t) => `<span class="tag">#${escapeHtml(t)}</span>`)
    .join("");

  card.innerHTML = `
    <div class="card-badge"></div>
    <div class="card-body">
      <h3 class="card-title">${escapeHtml(c.title)}</h3>
      ${c.category ? `<div class="card-category">${escapeHtml(c.category)}</div>` : ""}
      <div class="card-meta">
        <span class="status-pill status-${rawStatus(c.status)}">${escapeHtml(
    statusLabel(c.status)
  )}</span>
        <span class="card-steps">${total} ステップ</span>
        <span class="card-mode">${escapeHtml(c.mode || "standard")}</span>
      </div>
      <div class="card-tags">${tags}</div>
      ${
        total
          ? `<div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
             <div class="progress-label">${completedSteps} / ${total} 完了</div>`
          : ""
      }
    </div>
  `;

  // マスタリーバッジ（画像があれば画像、無ければ SVG）
  applyMasteryBadge(card.querySelector(".card-badge"), c.mastery || 0, 84);

  // 全デバイスで学習ハブ（詳細）へ
  const go = () =>
    navigate(`/curriculum/${encodeURIComponent(c.id)}`);
  card.addEventListener("click", go);
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      go();
    }
  });
  return card;
}

function rawStatus(status) {
  if (status === "完了" || status === "completed") return "completed";
  if (status === "進行中" || status === "in_progress") return "in_progress";
  return "not_started";
}

// ---------------------------------------------------------------------
// 今日のおすすめ（ステップ単位）
// ---------------------------------------------------------------------
async function renderRecommendation(area, library) {
  const pick = pickTodaysStep(library);
  if (!pick) {
    const bubble = await createMashBubble(
      "先輩、カリキュラムをインポートして学習を始めたら、ここで今日のおすすめを紹介しますね！"
    );
    area.appendChild(wrapRecommend(bubble, null));
    return;
  }

  const { curriculum, step, reason } = pick;
  const message =
    reason === "next"
      ? `今日はこれどうですか、先輩！「${curriculum.title}」の Step ${step.step}「${step.title}」、一緒に進めましょう！`
      : `先輩、「${curriculum.title}」の Step ${step.step}「${step.title}」を復習しませんか？ 記憶を定着させましょう！`;

  const bubble = await createMashBubble(message);
  const action = {
    label: reason === "next" ? "このステップを学ぶ" : "復習する",
    href: `/curriculum/${encodeURIComponent(
      curriculum.id
    )}/step/${encodeURIComponent(step.id)}/learn`,
  };
  area.appendChild(wrapRecommend(bubble, action));
}

function wrapRecommend(bubbleEl, action) {
  const box = document.createElement("div");
  box.className = "recommend card";
  box.appendChild(bubbleEl);
  if (action) {
    const btn = document.createElement("button");
    btn.className = "btn btn-primary recommend-go";
    btn.textContent = action.label;
    btn.addEventListener("click", () => navigate(action.href));
    box.appendChild(btn);
  }
  return box;
}

// ---------------------------------------------------------------------
// 称号・実績
// ---------------------------------------------------------------------
function renderTitles(area, library) {
  const titles = computeTitles(library);
  persistTitles(titles); // Firebase 有効時の記録用（ローカルでも META に保存）

  const badges = [];
  for (const t of titles.overall) {
    badges.push(
      `<span class="title-badge title-badge-gold">${t.emoji} ${escapeHtml(
        t.label
      )}</span>`
    );
  }
  for (const t of titles.individual) {
    badges.push(
      `<span class="title-badge">${t.emoji} ${escapeHtml(t.label)}</span>`
    );
  }

  area.innerHTML = `
    <h2 class="section-title">🏆 称号・実績</h2>
    <div class="titles-list">
      ${
        badges.length
          ? badges.join("")
          : `<span class="titles-empty">カリキュラムを完了すると称号が手に入ります</span>`
      }
    </div>
  `;
}
