// =====================================================================
// Mash's English Class（全 UI 英語）
// ---------------------------------------------------------------------
// 仕様:
//   - Lesson log list（cards: date / title）
//   - Lesson detail（Situation / Your Response / Mash's Feedback）
//   - Phrase Bank（drag-select → Add to Phrase Bank / link to source）
//   - Mash's Daily Expression（random phrase）
//   - Lesson theme archive
//   - Self-Review（English note per lesson）
//   - Editable / addable on all devices
// =====================================================================

import { navigate } from "../app.js";
import { escapeHtml, toast } from "../utils.js";
import { renderMarkdown } from "../lib/markdown.js";
import { createMashBubble } from "../components/mash.js";
import {
  listLessons,
  getLesson,
  importLessonMd,
  updateLesson,
  deleteLesson,
  listPhrases,
  addPhrase,
  deletePhrase,
  pickDailyPhrase,
} from "../services/english.js";

export async function renderEnglishClass(root, parts = []) {
  if (parts[0] === "lesson" && parts[1]) {
    return renderLessonDetail(root, decodeURIComponent(parts[1]));
  }
  if (parts[0] === "phrases") {
    return renderPhraseBank(root);
  }
  return renderLessonList(root);
}

// ---------------------------------------------------------------------
// Lesson list (home of English Class)
// ---------------------------------------------------------------------
async function renderLessonList(root) {
  root.innerHTML = `
    <div class="page english-page" lang="en">
      <div class="page-topbar">
        <button class="btn btn-ghost" id="back">← Home</button>
        <div class="nav-group">
          <button class="btn btn-ghost" id="phrasebank">📚 Phrase Bank</button>
          <button class="btn btn-primary" id="import">＋ Import Lesson</button>
        </div>
      </div>
      <header class="page-head">
        <h1 class="page-title">🛡️ Mash's English Class</h1>
        <p class="page-sub">Your lesson logs with Mash. Keep practicing, Senpai!</p>
      </header>
      <div id="daily-expr" class="daily-tip-area"></div>
      <h2 class="section-title">📖 Lessons</h2>
      <div id="lesson-grid" class="lesson-grid"></div>
      <div id="archive" class="archive-area"></div>
    </div>
  `;

  root.querySelector("#back").addEventListener("click", () => navigate("/"));
  root
    .querySelector("#phrasebank")
    .addEventListener("click", () => navigate("/english/phrases"));
  root
    .querySelector("#import")
    .addEventListener("click", () => openImportDialog(root));

  const [lessons, phrases] = await Promise.all([listLessons(), listPhrases()]);

  // Mash's Daily Expression
  await renderDailyExpression(root.querySelector("#daily-expr"), phrases);

  // Lesson cards
  const grid = root.querySelector("#lesson-grid");
  if (lessons.length === 0) {
    grid.innerHTML = `<div class="empty-state card">
      <div class="empty-emoji">📭</div>
      <p>No lessons yet. Import a lesson md exported from your chat with Mash.</p>
    </div>`;
  } else {
    grid.innerHTML = "";
    for (const l of lessons) grid.appendChild(lessonCard(l));
  }

  // Theme archive
  renderArchive(root.querySelector("#archive"), lessons);
}

async function renderDailyExpression(area, phrases) {
  const daily = pickDailyPhrase(phrases);
  if (!daily) return;
  const bubble = await createMashBubble(
    `Here's a past expression for you, Senpai!\n"${daily.phrase}"`
  );
  const box = document.createElement("div");
  box.className = "recommend card";
  box.appendChild(bubble);
  if (daily.lessonId) {
    const btn = document.createElement("button");
    btn.className = "btn btn-primary recommend-go";
    btn.textContent = "Open lesson";
    btn.addEventListener("click", () =>
      navigate(`/english/lesson/${encodeURIComponent(daily.lessonId)}`)
    );
    box.appendChild(btn);
  }
  area.appendChild(box);
}

function lessonCard(l) {
  const card = document.createElement("article");
  card.className = "lesson-card card";
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.innerHTML = `
    <div class="lesson-card-date">${escapeHtml(l.date || "")}</div>
    <h3 class="lesson-card-title">${escapeHtml(l.title)}</h3>
    ${
      l.situation
        ? `<p class="lesson-card-sit">${escapeHtml(
            l.situation.slice(0, 90)
          )}${l.situation.length > 90 ? "…" : ""}</p>`
        : ""
    }
  `;
  const go = () =>
    navigate(`/english/lesson/${encodeURIComponent(l.id)}`);
  card.addEventListener("click", go);
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter") go();
  });
  return card;
}

function renderArchive(area, lessons) {
  const withSituation = lessons.filter((l) => l.situation);
  if (withSituation.length === 0) return;
  area.innerHTML = `
    <h2 class="section-title">🗂️ Theme Archive</h2>
    <ul class="archive-list">
      ${withSituation
        .map(
          (l) =>
            `<li class="archive-item" data-id="${escapeHtml(l.id)}">
              <span class="archive-date">${escapeHtml(l.date || "")}</span>
              <span class="archive-theme">${escapeHtml(
                l.title
              )}</span>
            </li>`
        )
        .join("")}
    </ul>
  `;
  area.querySelectorAll(".archive-item").forEach((li) => {
    li.addEventListener("click", () =>
      navigate(`/english/lesson/${encodeURIComponent(li.dataset.id)}`)
    );
  });
}

// ---------------------------------------------------------------------
// Lesson detail
// ---------------------------------------------------------------------
async function renderLessonDetail(root, id) {
  const l = await getLesson(id);
  if (!l) {
    root.innerHTML = `<div class="page english-page"><div class="empty-state"><p>Lesson not found.</p></div></div>`;
    return;
  }

  const fb = l.feedback || {};
  root.innerHTML = `
    <div class="page english-page" lang="en">
      <div class="page-topbar">
        <button class="btn btn-ghost" id="back">← Lessons</button>
        <button class="btn btn-danger-ghost" id="del">Delete</button>
      </div>
      <header class="page-head">
        <div class="lesson-card-date">${escapeHtml(l.date || "")}</div>
        <h1 class="page-title">${escapeHtml(l.title)}</h1>
      </header>

      <section class="card lesson-section" id="lesson-content">
        ${section("🎬 Situation", l.situation)}
        ${section("💬 Your Response", l.yourResponse)}
        <h2 class="lesson-h2">🛡️ Mash's Feedback</h2>
        ${section("✅ What You Did Well", fb.wellDone, 3)}
        ${section("✨ More Natural Expressions & Corrections", fb.corrections, 3)}
        ${section("💌 From Mash", fb.fromMash, 3)}
      </section>

      <section class="card">
        <h2 class="lesson-h2">📝 Self-Review</h2>
        <p class="page-sub">Write a short reflection in English.</p>
        <textarea id="self-review" class="field-input" style="min-height:110px"
          placeholder="What did you learn? What will you try next time?">${escapeHtml(
            l.selfReview || ""
          )}</textarea>
        <div class="form-actions">
          <button class="btn btn-primary" id="save-review">Save Review</button>
        </div>
      </section>

      <p class="page-sub phrase-hint">💡 Tip: select any text above and tap “Add to Phrase Bank”.</p>
    </div>
  `;

  root
    .querySelector("#back")
    .addEventListener("click", () => navigate("/english"));
  root.querySelector("#del").addEventListener("click", async () => {
    if (!confirm("Delete this lesson?")) return;
    await deleteLesson(id);
    toast("Lesson deleted", "info");
    navigate("/english");
  });
  root.querySelector("#save-review").addEventListener("click", async () => {
    const text = root.querySelector("#self-review").value;
    await updateLesson(id, { selfReview: text });
    toast("Self-Review saved", "success");
  });

  // drag-select → Add to Phrase Bank
  setupPhraseSelection(root.querySelector("#lesson-content"), l);

  function section(title, body, level = 2) {
    if (!body || !body.trim()) return "";
    const tag = level === 3 ? "h3" : "h2";
    const cls = level === 3 ? "lesson-h3" : "lesson-h2";
    return `<${tag} class="${cls}">${title}</${tag}>
      <div class="md-body lesson-body">${renderMarkdown(body)}</div>`;
  }
}

// drag-select popup
function setupPhraseSelection(container, lesson) {
  if (!container) return;
  let popup = null;
  const removePopup = () => {
    popup?.remove();
    popup = null;
  };

  const onSelect = () => {
    const sel = window.getSelection();
    const text = sel ? sel.toString().trim() : "";
    if (!text || !sel.rangeCount) return removePopup();
    // 選択範囲がレッスン本文内か確認
    const range = sel.getRangeAt(0);
    if (!container.contains(range.commonAncestorContainer)) {
      return removePopup();
    }
    const rect = range.getBoundingClientRect();
    removePopup();
    popup = document.createElement("button");
    popup.className = "phrase-popup";
    popup.textContent = "➕ Add to Phrase Bank";
    popup.style.top = `${window.scrollY + rect.top - 44}px`;
    popup.style.left = `${window.scrollX + rect.left}px`;
    popup.addEventListener("mousedown", async (e) => {
      e.preventDefault();
      await addPhrase(text, lesson.id, lesson.title);
      toast("Added to Phrase Bank", "success");
      removePopup();
      window.getSelection()?.removeAllRanges();
    });
    document.body.appendChild(popup);
  };

  container.addEventListener("mouseup", () => setTimeout(onSelect, 10));
  container.addEventListener("touchend", () => setTimeout(onSelect, 10));
  document.addEventListener("scroll", removePopup, { passive: true });
}

// ---------------------------------------------------------------------
// Phrase Bank
// ---------------------------------------------------------------------
async function renderPhraseBank(root) {
  const phrases = await listPhrases();
  root.innerHTML = `
    <div class="page english-page" lang="en">
      <div class="page-topbar">
        <button class="btn btn-ghost" id="back">← Lessons</button>
      </div>
      <header class="page-head">
        <h1 class="page-title">📚 Phrase Bank</h1>
        <p class="page-sub">Expressions you saved from your lessons.</p>
      </header>
      <div id="phrase-list"></div>
    </div>
  `;
  root
    .querySelector("#back")
    .addEventListener("click", () => navigate("/english"));

  const list = root.querySelector("#phrase-list");
  if (phrases.length === 0) {
    list.innerHTML = `<div class="empty-state card">
      <div class="empty-emoji">📭</div>
      <p>No phrases yet. Open a lesson, select text, and tap “Add to Phrase Bank”.</p>
    </div>`;
    return;
  }

  list.className = "phrase-list";
  for (const p of phrases) {
    const item = document.createElement("div");
    item.className = "phrase-item card";
    item.innerHTML = `
      <div class="phrase-text">“${escapeHtml(p.phrase)}”</div>
      <div class="phrase-foot">
        ${
          p.lessonId
            ? `<button class="phrase-link" data-id="${escapeHtml(
                p.lessonId
              )}">↩ ${escapeHtml(p.lessonTitle || "source lesson")}</button>`
            : `<span></span>`
        }
        <button class="btn btn-danger-ghost btn-sm phrase-del">Delete</button>
      </div>
    `;
    item.querySelector(".phrase-link")?.addEventListener("click", () =>
      navigate(`/english/lesson/${encodeURIComponent(p.lessonId)}`)
    );
    item.querySelector(".phrase-del").addEventListener("click", async () => {
      await deletePhrase(p.id);
      toast("Phrase deleted", "info");
      renderPhraseBank(root);
    });
    list.appendChild(item);
  }
}

// ---------------------------------------------------------------------
// Import dialog
// ---------------------------------------------------------------------
function openImportDialog(root) {
  const overlay = document.createElement("div");
  overlay.className = "form-overlay";
  overlay.innerHTML = `
    <div class="form-modal card" lang="en">
      <h2 class="section-title" style="margin-top:0">＋ Import Lesson</h2>
      <p class="page-sub">Drop a .md file, or paste the lesson markdown below.</p>
      <input type="file" id="imp-file" accept=".md,text/markdown" />
      <textarea id="imp-text" class="field-input" style="min-height:200px;margin-top:10px"
        placeholder="---\ntitle: ...\ndate: ...\n---\n\n## Situation\n..."></textarea>
      <div class="form-actions">
        <button class="btn btn-ghost" id="imp-cancel">Cancel</button>
        <button class="btn btn-primary" id="imp-save">Import</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const textArea = overlay.querySelector("#imp-text");
  overlay.querySelector("#imp-file").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (file) textArea.value = await file.text();
  });

  const close = () => overlay.remove();
  overlay.querySelector("#imp-cancel").addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  overlay.querySelector("#imp-save").addEventListener("click", async () => {
    const md = textArea.value.trim();
    if (!md) return toast("Paste lesson markdown first", "warn");
    try {
      await importLessonMd(md);
      toast("Lesson imported", "success");
      close();
      renderEnglishClass(root, []);
    } catch (err) {
      console.error(err);
      toast(`Import failed: ${err.message}`, "error");
    }
  });
}
