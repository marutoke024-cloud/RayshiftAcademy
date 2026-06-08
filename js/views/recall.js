// =====================================================================
// リコールページ（Phase 2）
// ---------------------------------------------------------------------
// 仕様:
//   - マシュからの問いかけ表示
//   - 理解メモ入力欄（テキストエリア2つ）
//   - アクティブリコール: 解説は既定で非表示、「解説を見る」で一時表示
//   - 「mdエクスポート」ボタン → 理解メモを md 化して保存＋ダウンロード
//   - 「Claudeへ」ボタン（claude.ai を新タブで開く）
//   - 「フィードバックへ」へ進むボタン
// =====================================================================

import { store } from "../storage/store.js";
import { navigate } from "../app.js";
import { escapeHtml, toast } from "../utils.js";
import { renderMarkdown } from "../lib/markdown.js";
import { removeSection, composeNote, downloadText } from "../lib/stepDoc.js";
import { saveUnderstandingNote } from "../services/progress.js";

const MEMO_HEADING = "一口メモ";
const CLAUDE_URL = "https://claude.ai/new";

export async function renderRecall(root, curriculumId, stepId) {
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

  const keyConcept = step.key_concept || "";
  const bodyMd = removeSection(step.content, MEMO_HEADING);

  root.innerHTML = `
    <div class="flow-page recall-page">
      <div class="flow-topbar">
        <button class="btn btn-ghost" id="back">← 解説へ戻る</button>
        <div class="flow-steps">
          <span class="fs done">① 解説</span>
          <span class="fs active">② リコール</span>
          <span class="fs">③ フィードバック</span>
        </div>
      </div>

      <header class="card">
        <div class="flow-breadcrumb"><b>${escapeHtml(curriculum.title)}</b></div>
        <h1 class="flow-steptitle">Step ${escapeHtml(step.step)}: ${escapeHtml(
    step.title
  )}</h1>
      </header>

      <section class="card recall-question">
        <p>🛡️ 先輩、このステップで学習したことをマシュに教えてみてください！</p>
        ${
          keyConcept
            ? `<p>「<b>${escapeHtml(
                keyConcept
              )}</b>」について、なぜそう設計されているのか説明できますか？</p>`
            : ""
        }
      </section>

      <section class="card">
        <div class="recall-fields">
          <div class="recall-field">
            <label for="ra-general">学んだことの説明
              <span class="field-hint">（自分の言葉で、できるだけ思い出しながら）</span>
            </label>
            <textarea id="ra-general" class="field-input"
              placeholder="このステップで分かったこと・要点を書いてみましょう"></textarea>
          </div>
          <div class="recall-field">
            <label for="ra-key">${
              keyConcept
                ? `「${escapeHtml(keyConcept)}」の設計理由`
                : "設計理由の説明"
            }
              <span class="field-hint">（なぜそう設計されているのか）</span>
            </label>
            <textarea id="ra-key" class="field-input"
              placeholder="なぜそうなっているのか、理由を説明してみましょう"></textarea>
          </div>
        </div>

        <div class="explanation-toggle" style="margin-top:16px">
          <button class="btn btn-ghost" id="toggle-exp" aria-expanded="false">
            👀 解説を見る
          </button>
          <span class="field-hint">（思い出せないときだけ開きましょう）</span>
        </div>
        <div class="explanation-collapsible md-body" id="exp-body" hidden></div>
      </section>

      <div class="recall-actions">
        <button class="btn btn-ghost" id="export-md">💾 md エクスポート</button>
        <button class="btn btn-ghost" id="to-claude">🤖 Claude へ（コピーして開く）</button>
        <button class="btn btn-primary" id="to-feedback">フィードバックを貼り付ける →</button>
      </div>
    </div>
  `;

  // 既存の入力を復元
  const taGeneral = root.querySelector("#ra-general");
  const taKey = root.querySelector("#ra-key");
  taGeneral.value = step.recallGeneral || "";
  taKey.value = step.recallKeyConcept || "";

  // アクティブリコール: 解説の表示トグル
  const expBody = root.querySelector("#exp-body");
  const toggleBtn = root.querySelector("#toggle-exp");
  let expLoaded = false;
  toggleBtn.addEventListener("click", () => {
    const willShow = expBody.hidden;
    if (willShow && !expLoaded) {
      expBody.innerHTML = renderMarkdown(bodyMd);
      expLoaded = true;
    }
    expBody.hidden = !willShow;
    toggleBtn.setAttribute("aria-expanded", String(willShow));
    toggleBtn.textContent = willShow ? "🙈 解説を隠す" : "👀 解説を見る";
  });

  // md エクスポート（保存＋ダウンロード）
  async function doExport(showDownload = true) {
    const note = composeNote(taGeneral.value, taKey.value, keyConcept);
    if (!note.trim()) {
      toast("理解メモを入力してください", "warn");
      return null;
    }
    const { mdDoc } = await saveUnderstandingNote(curriculumId, stepId, note, {
      general: taGeneral.value,
      keyConcept: taKey.value,
    });
    if (showDownload) {
      downloadText(`${stepId}.md`, mdDoc);
      toast("理解メモを保存し、md をダウンロードしました", "success");
    }
    return { note, mdDoc };
  }

  root.querySelector("#export-md").addEventListener("click", () => doExport(true));

  // Claude へ: 理解メモ＋問いをクリップボードにコピーして claude.ai を開く
  root.querySelector("#to-claude").addEventListener("click", async () => {
    const saved = await doExport(false); // 保存はするがダウンロードはしない
    const note = saved?.note || composeNote(taGeneral.value, taKey.value, keyConcept);
    const prompt = buildClaudePrompt(curriculum, step, note);
    try {
      await navigator.clipboard.writeText(prompt);
      toast("理解メモをコピーしました。Claude に貼り付けてください", "success");
    } catch {
      toast("クリップボードにコピーできませんでした（手動でコピーしてください）", "warn");
    }
    window.open(CLAUDE_URL, "_blank", "noopener");
  });

  root.querySelector("#back").addEventListener("click", () =>
    navigate(
      `/curriculum/${encodeURIComponent(curriculumId)}/step/${encodeURIComponent(
        stepId
      )}/learn`
    )
  );
  root.querySelector("#to-feedback").addEventListener("click", async () => {
    // フィードバックへ進む前に、入力があれば保存しておく
    if (taGeneral.value.trim() || taKey.value.trim()) {
      await doExport(false);
    }
    navigate(
      `/curriculum/${encodeURIComponent(curriculumId)}/step/${encodeURIComponent(
        stepId
      )}/feedback`
    );
  });
}

function buildClaudePrompt(curriculum, step, note) {
  return (
    `マシュ、「${curriculum.title}」の Step ${step.step}「${step.title}」を学習しました。\n` +
    (step.key_concept ? `キーコンセプト: ${step.key_concept}\n` : "") +
    `\n--- わたしの理解メモ ---\n${note}\n------------------------\n\n` +
    `この理解について、よかった点・補足修正・マシュからのひとことの形でフィードバックをください。`
  );
}
