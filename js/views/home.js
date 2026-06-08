// =====================================================================
// トップ画面（カリキュラム一覧 / 本棚）
// ---------------------------------------------------------------------
// 仕様:
//   - カリキュラム一覧（本棚形式）＋マスタリーバッジ
//   - 称号・実績表示エリア
//   - 今日のおすすめ（マシュピックアップ）
//   - ミックス復習ボタン（Phase 3 で実装予定）
//   - md インポート（PC のみ）
// =====================================================================

import { store } from "../storage/store.js";
import { createImportPanel } from "../components/importPanel.js";
import { createMashBubble, resetMashImageCache } from "../components/mash.js";
import {
  escapeHtml,
  isPC,
  masteryBadgeSVG,
  statusLabel,
  toast,
} from "../utils.js";
import { navigate } from "../app.js";

export async function renderHome(root) {
  root.innerHTML = `<div class="home"></div>`;
  const home = root.querySelector(".home");

  const curricula = await store.getCurricula();

  // --- 今日のおすすめ ---
  const recommendArea = document.createElement("section");
  recommendArea.className = "recommend-area";
  home.appendChild(recommendArea);
  renderRecommendation(recommendArea, curricula);

  // --- アクションバー（ミックス復習など） ---
  const actions = document.createElement("section");
  actions.className = "home-actions";
  actions.innerHTML = `
    <button class="btn btn-primary" id="mix-review" ${
      anyCompletedStep(curricula) ? "" : "disabled"
    }>
      🔀 ミックス復習
    </button>
    <span class="home-actions-note">複数カリキュラムからランダム出題（Phase 3）</span>
  `;
  actions.querySelector("#mix-review").addEventListener("click", () => {
    toast("ミックス復習は Phase 3 で実装予定です", "info");
  });
  home.appendChild(actions);

  // --- インポート（PC のみ） ---
  if (isPC()) {
    const panel = createImportPanel(() => {
      resetMashImageCache();
      renderHome(root); // 再描画
    });
    home.appendChild(panel);
  } else {
    const note = document.createElement("div");
    note.className = "mobile-note card";
    note.innerHTML = `📱 スマホ／iPad では<strong>復習モードのみ</strong>利用できます。
      学習・インポートは PC（画面幅 1024px 以上）で行ってください。`;
    home.appendChild(note);
  }

  // --- 称号・実績エリア ---
  const titlesArea = document.createElement("section");
  titlesArea.className = "titles-area card";
  renderTitles(titlesArea, curricula);
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
        <p class="empty-sub">${
          isPC()
            ? "上のエリアに Obsidian の md フォルダをドラッグ＆ドロップしてください。"
            : "PC でカリキュラムをインポートしてください。"
        }</p>
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

  const completedSteps = 0; // Phase 2 で step 状態から算出
  const tags = (c.tags || [])
    .map((t) => `<span class="tag">#${escapeHtml(t)}</span>`)
    .join("");

  card.innerHTML = `
    <div class="card-badge">${masteryBadgeSVG(c.mastery || 0, 84)}</div>
    <div class="card-body">
      <h3 class="card-title">${escapeHtml(c.title)}</h3>
      ${c.category ? `<div class="card-category">${escapeHtml(c.category)}</div>` : ""}
      <div class="card-meta">
        <span class="status-pill status-${escapeHtml(rawStatus(c.status))}">${escapeHtml(
    statusLabel(c.status)
  )}</span>
        <span class="card-steps">${c.total_steps || 0} ステップ</span>
        <span class="card-mode">${escapeHtml(c.mode || "standard")}</span>
      </div>
      <div class="card-tags">${tags}</div>
    </div>
  `;

  const go = () => navigate(`/curriculum/${encodeURIComponent(c.id)}`);
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
// 今日のおすすめ
// ---------------------------------------------------------------------
async function renderRecommendation(area, curricula) {
  const pick = pickRecommendation(curricula);
  if (!pick) {
    const bubble = await createMashBubble(
      "先輩、カリキュラムをインポートしたら、ここで今日のおすすめを紹介しますね！"
    );
    area.appendChild(wrapRecommend(bubble, null));
    return;
  }
  const bubble = await createMashBubble(
    `今日はこれどうですか、先輩！「${pick.title}」、一緒に進めましょう！`
  );
  area.appendChild(wrapRecommend(bubble, pick));
}

function wrapRecommend(bubbleEl, pick) {
  const box = document.createElement("div");
  box.className = "recommend card";
  box.appendChild(bubbleEl);
  if (pick) {
    const btn = document.createElement("button");
    btn.className = "btn btn-primary recommend-go";
    btn.textContent = `「${pick.title}」を開く`;
    btn.addEventListener("click", () =>
      navigate(`/curriculum/${encodeURIComponent(pick.id)}`)
    );
    box.appendChild(btn);
  }
  return box;
}

/** 優先: 未完了カリキュラム > mastery が低いカリキュラム */
function pickRecommendation(curricula) {
  if (!curricula.length) return null;
  const incomplete = curricula.filter(
    (c) => rawStatus(c.status) !== "completed"
  );
  const pool = incomplete.length ? incomplete : curricula;
  return [...pool].sort((a, b) => (a.mastery || 0) - (b.mastery || 0))[0];
}

// ---------------------------------------------------------------------
// 称号・実績
// ---------------------------------------------------------------------
function renderTitles(area, curricula) {
  const completed = curricula.filter(
    (c) => rawStatus(c.status) === "completed"
  );
  const badges = [];
  for (const c of completed) {
    if (c.shougou) {
      badges.push(`<span class="title-badge">🏅 ${escapeHtml(firstLine(c.shougou))}</span>`);
    } else {
      badges.push(`<span class="title-badge">🏅 ${escapeHtml(c.title)} マスター</span>`);
    }
  }
  if (completed.length >= 3) {
    badges.unshift(`<span class="title-badge title-badge-gold">👑 三冠達成</span>`);
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

function firstLine(text) {
  return String(text || "").split(/\r?\n/)[0].replace(/^#+\s*/, "").trim();
}

function anyCompletedStep(curricula) {
  // Phase 1 では step 状態を集計しないため、完了カリキュラムがあれば有効化
  return curricula.some((c) => rawStatus(c.status) === "completed");
}
