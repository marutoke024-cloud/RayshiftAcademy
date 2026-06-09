// =====================================================================
// デザイン講座ページ（Tips 管理）
// ---------------------------------------------------------------------
// 仕様:
//   - Tips 登録（画像複数・サムネイルクロップ・カテゴリ複数・メモ）
//   - カード表示（左にメイン画像大・右にタイトル/タグ/メモ/日付）
//   - 画像タップで全画面モーダル
//   - カテゴリ絞り込み
//   - 今日の 1 Tips（マシュ吹き出し）
//   - 全デバイスで編集・追加可能
// =====================================================================

import { navigate } from "../app.js";
import { escapeHtml, toast } from "../utils.js";
import { createMashBubble } from "../components/mash.js";
import { fileToDataURL, openImageModal } from "../lib/media.js";
import { openCropModal } from "../components/cropModal.js";
import {
  TIP_CATEGORIES,
  listTips,
  createTip,
  deleteTip,
  resolveTipImages,
  pickDailyTip,
} from "../services/tips.js";

let activeCategory = ""; // "" = すべて

export async function renderDesignCourse(root) {
  root.innerHTML = `
    <div class="page design-page">
      <div class="page-topbar">
        <button class="btn btn-ghost" id="back">← トップへ</button>
        <button class="btn btn-primary" id="add-tip">＋ Tips を追加</button>
      </div>
      <header class="page-head">
        <h1 class="page-title">🎨 デザイン講座</h1>
        <p class="page-sub">イラスト Tips を画像つきで保存・整理できます。</p>
      </header>
      <div id="daily-tip" class="daily-tip-area"></div>
      <div id="cat-filter" class="cat-filter"></div>
      <div id="tips-grid" class="tips-grid"></div>
    </div>
  `;

  root.querySelector("#back").addEventListener("click", () => navigate("/"));
  root
    .querySelector("#add-tip")
    .addEventListener("click", () => openTipForm(root));

  const tips = await listTips();

  // 今日の 1 Tips
  await renderDailyTip(root.querySelector("#daily-tip"), tips);

  // カテゴリ絞り込み
  renderCategoryFilter(root.querySelector("#cat-filter"), root);

  // 一覧
  await renderTipsGrid(root.querySelector("#tips-grid"), tips, root);
}

// ---------------------------------------------------------------------
async function renderDailyTip(area, tips) {
  const daily = pickDailyTip(tips);
  if (!daily) return;
  const bubble = await createMashBubble(
    `本日のおすすめ Tips です、先輩！「${daily.title}」をどうぞ。`
  );
  const box = document.createElement("div");
  box.className = "recommend card";
  box.appendChild(bubble);
  const btn = document.createElement("button");
  btn.className = "btn btn-primary recommend-go";
  btn.textContent = "見る";
  btn.addEventListener("click", () =>
    document
      .getElementById(`tip-${daily.id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" })
  );
  box.appendChild(btn);
  area.appendChild(box);
}

function renderCategoryFilter(area, root) {
  const chips = ["すべて", ...TIP_CATEGORIES];
  area.innerHTML = chips
    .map((c) => {
      const val = c === "すべて" ? "" : c;
      const on = val === activeCategory ? " is-active" : "";
      return `<button class="filter-chip${on}" data-cat="${escapeHtml(
        val
      )}">${escapeHtml(c)}</button>`;
    })
    .join("");
  area.querySelectorAll(".filter-chip").forEach((btn) => {
    btn.addEventListener("click", async () => {
      activeCategory = btn.dataset.cat;
      area
        .querySelectorAll(".filter-chip")
        .forEach((b) => b.classList.toggle("is-active", b === btn));
      const tips = await listTips();
      await renderTipsGrid(root.querySelector("#tips-grid"), tips, root);
    });
  });
}

async function renderTipsGrid(grid, tips, root) {
  const filtered = activeCategory
    ? tips.filter((t) => (t.categories || []).includes(activeCategory))
    : tips;

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="empty-state card">
      <div class="empty-emoji">🎨</div>
      <p>${
        activeCategory
          ? "このカテゴリの Tips はまだありません。"
          : "まだ Tips がありません。「＋ Tips を追加」から登録できます。"
      }</p>
    </div>`;
    return;
  }

  grid.innerHTML = "";
  for (const tip of filtered) {
    grid.appendChild(await tipCard(tip, root));
  }
}

async function tipCard(tip, root) {
  const { thumbUrl, imageUrls } = await resolveTipImages(tip);
  const card = document.createElement("article");
  card.className = "tip-card card";
  card.id = `tip-${tip.id}`;

  const tags = (tip.categories || [])
    .map((c) => `<span class="tag">#${escapeHtml(c)}</span>`)
    .join("");
  const date = (tip.createdAt || "").slice(0, 10);

  card.innerHTML = `
    <div class="tip-main">
      ${
        thumbUrl
          ? `<img class="tip-img" src="${thumbUrl}" alt="${escapeHtml(
              tip.title
            )}" />`
          : `<div class="tip-img tip-img-empty">No Image</div>`
      }
    </div>
    <div class="tip-info">
      <h3 class="tip-title">${escapeHtml(tip.title)}</h3>
      <div class="tip-tags">${tags}</div>
      ${tip.memo ? `<p class="tip-memo">${escapeHtml(tip.memo)}</p>` : ""}
      <div class="tip-foot">
        <span class="tip-date">${escapeHtml(date)}</span>
        ${
          imageUrls.length > 1
            ? `<span class="tip-count">🖼️ ${imageUrls.length} 枚</span>`
            : ""
        }
        <button class="btn btn-danger-ghost btn-sm tip-del">削除</button>
      </div>
      ${
        imageUrls.length > 1
          ? `<div class="tip-thumbs">${imageUrls
              .map(
                (u, i) =>
                  `<img class="tip-thumb" src="${u}" data-idx="${i}" alt="" />`
              )
              .join("")}</div>`
          : ""
      }
    </div>
  `;

  // 画像タップで全画面
  const mainImg = card.querySelector(".tip-img");
  if (thumbUrl && mainImg) {
    mainImg.addEventListener("click", () =>
      openImageModal(imageUrls[0] || thumbUrl, tip.title)
    );
  }
  card.querySelectorAll(".tip-thumb").forEach((el) => {
    el.addEventListener("click", () =>
      openImageModal(imageUrls[Number(el.dataset.idx)], tip.title)
    );
  });

  // 削除
  card.querySelector(".tip-del").addEventListener("click", async (e) => {
    e.stopPropagation();
    if (!confirm(`「${tip.title}」を削除しますか？`)) return;
    await deleteTip(tip.id);
    toast("Tips を削除しました", "info");
    const tips = await listTips();
    await renderTipsGrid(root.querySelector("#tips-grid"), tips, root);
  });

  return card;
}

// ---------------------------------------------------------------------
// Tips 追加フォーム（モーダル）
// ---------------------------------------------------------------------
function openTipForm(root) {
  const images = []; // {dataUrl}
  let thumbnail = null; // dataURL（クロップ済み）

  const overlay = document.createElement("div");
  overlay.className = "form-overlay";
  overlay.innerHTML = `
    <div class="form-modal card">
      <h2 class="section-title" style="margin-top:0">＋ Tips を追加</h2>
      <label class="form-label">タイトル
        <input type="text" id="t-title" class="field-input" placeholder="例: 線画をきれいに見せるコツ" />
      </label>

      <label class="form-label">画像（複数選択可）
        <input type="file" id="t-images" accept="image/*" multiple />
      </label>
      <div id="t-previews" class="img-previews"></div>
      <div id="t-thumb-wrap" class="thumb-wrap" hidden>
        <div class="form-sublabel">サムネイル</div>
        <img id="t-thumb" class="thumb-preview" alt="サムネイル" />
        <button type="button" class="btn btn-ghost btn-sm" id="t-recrop">クロップし直す</button>
      </div>

      <div class="form-sublabel">カテゴリ（複数選択可）</div>
      <div id="t-cats" class="cat-checks">
        ${TIP_CATEGORIES.map(
          (c) =>
            `<label class="cat-check"><input type="checkbox" value="${escapeHtml(
              c
            )}" /> ${escapeHtml(c)}</label>`
        ).join("")}
      </div>

      <label class="form-label">メモ
        <textarea id="t-memo" class="field-input" style="min-height:90px"
          placeholder="ポイントやコツを書きましょう"></textarea>
      </label>

      <div class="form-actions">
        <button class="btn btn-ghost" id="t-cancel">キャンセル</button>
        <button class="btn btn-primary" id="t-save">保存</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const previews = overlay.querySelector("#t-previews");
  const thumbWrap = overlay.querySelector("#t-thumb-wrap");
  const thumbImg = overlay.querySelector("#t-thumb");

  function refreshPreviews() {
    previews.innerHTML = "";
    images.forEach((im, i) => {
      const wrap = document.createElement("div");
      wrap.className = "img-preview";
      wrap.innerHTML = `
        <img src="${im.dataUrl}" alt="" />
        <button type="button" class="img-preview-thumb" title="サムネイルに設定">⭐</button>
        <button type="button" class="img-preview-del" title="削除">✕</button>
      `;
      wrap
        .querySelector(".img-preview-thumb")
        .addEventListener("click", async () => {
          const cropped = await openCropModal(im.dataUrl);
          if (cropped) {
            thumbnail = cropped;
            thumbImg.src = cropped;
            thumbWrap.hidden = false;
          }
        });
      wrap.querySelector(".img-preview-del").addEventListener("click", () => {
        images.splice(i, 1);
        refreshPreviews();
      });
      previews.appendChild(wrap);
    });
  }

  overlay.querySelector("#t-images").addEventListener("change", async (e) => {
    const files = Array.from(e.target.files || []);
    for (const f of files) {
      const dataUrl = await fileToDataURL(f);
      images.push({ dataUrl });
    }
    refreshPreviews();
    e.target.value = "";
  });

  overlay.querySelector("#t-recrop").addEventListener("click", async () => {
    const src = images[0]?.dataUrl;
    if (!src) return;
    const cropped = await openCropModal(src);
    if (cropped) {
      thumbnail = cropped;
      thumbImg.src = cropped;
    }
  });

  const close = () => overlay.remove();
  overlay.querySelector("#t-cancel").addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  overlay.querySelector("#t-save").addEventListener("click", async () => {
    const title = overlay.querySelector("#t-title").value.trim();
    const memo = overlay.querySelector("#t-memo").value.trim();
    const categories = Array.from(
      overlay.querySelectorAll("#t-cats input:checked")
    ).map((c) => c.value);
    if (!title) return toast("タイトルを入力してください", "warn");
    if (images.length === 0) return toast("画像を 1 枚以上選んでください", "warn");

    const saveBtn = overlay.querySelector("#t-save");
    saveBtn.disabled = true;
    saveBtn.textContent = "保存中…";
    try {
      await createTip({
        title,
        memo,
        categories,
        images: images.map((im) => im.dataUrl),
        thumbnail,
      });
      toast("Tips を保存しました", "success");
      close();
      renderDesignCourse(root);
    } catch (err) {
      console.error(err);
      toast(`保存に失敗しました: ${err.message}`, "error");
      saveBtn.disabled = false;
      saveBtn.textContent = "保存";
    }
  });
}
