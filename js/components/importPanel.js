// =====================================================================
// インポートパネル（ドラッグ＆ドロップ UI）
// ---------------------------------------------------------------------
// カリキュラムの md / 画像フォルダを受け取って importer に渡す UI 部品。
// PC 版トップ画面でのみ使用します。
// =====================================================================

import {
  collectFromDataTransfer,
  collectFromFileList,
  importFiles,
} from "../import/importer.js";
import { toast } from "../utils.js";
import { createHelpButton } from "./helpModal.js";

/**
 * @param {() => void} onImported インポート完了後に呼ばれる（一覧再描画など）
 * @returns {HTMLElement}
 */
export function createImportPanel(onImported) {
  const wrap = document.createElement("section");
  wrap.className = "import-panel card";
  wrap.innerHTML = `
    <div class="import-dropzone" id="dropzone" tabindex="0" role="button"
         aria-label="md カリキュラムをドラッグ＆ドロップ、またはクリックして選択">
      <div class="import-icon">📥</div>
      <div class="import-text">
        <strong>カリキュラムをインポート</strong>
        <span>Obsidian の <code>curricula/[題材名]</code> フォルダや、md・画像を
        ここにドラッグ＆ドロップ</span>
        <span class="import-sub">（クリックでフォルダ選択も可能）</span>
      </div>
    </div>
    <div class="import-status" id="import-status" hidden></div>
    <input type="file" id="file-input" multiple webkitdirectory directory hidden />
    <input type="file" id="file-input-files" multiple hidden
           accept=".md,image/*" />
    <div class="import-actions">
      <button class="btn btn-ghost" id="pick-folder">フォルダを選択</button>
      <button class="btn btn-ghost" id="pick-files">ファイルを選択</button>
      <span class="help-slot" id="import-help-slot"></span>
    </div>
  `;
  wrap
    .querySelector("#import-help-slot")
    .appendChild(createHelpButton("curriculum"));

  const dropzone = wrap.querySelector("#dropzone");
  const statusEl = wrap.querySelector("#import-status");
  const folderInput = wrap.querySelector("#file-input");
  const filesInput = wrap.querySelector("#file-input-files");

  function setStatus(msg, busy = true) {
    statusEl.hidden = false;
    statusEl.textContent = msg;
    statusEl.classList.toggle("busy", busy);
  }

  async function runImport(collected) {
    if (!collected || collected.length === 0) {
      toast("md ファイルが見つかりませんでした", "warn");
      return;
    }
    setStatus("インポート中…", true);
    try {
      const summary = await importFiles(collected, (m) => setStatus(m, true));
      const parts = [];
      if (summary.curricula) parts.push(`カリキュラム ${summary.curricula} 件`);
      if (summary.steps) parts.push(`ステップ ${summary.steps} 件`);
      if (summary.assets) parts.push(`画像 ${summary.assets} 件`);
      const msg =
        parts.length > 0
          ? `インポート完了: ${parts.join(" / ")}`
          : "インポート対象が見つかりませんでした";
      setStatus(msg, false);
      toast(msg, summary.curricula ? "success" : "warn");
      if (summary.messages.length) {
        console.warn("インポート時の注意:", summary.messages);
      }
      if (summary.curricula || summary.steps || summary.assets) {
        onImported?.();
      }
    } catch (e) {
      console.error(e);
      setStatus(`インポート失敗: ${e.message}`, false);
      toast(`インポート失敗: ${e.message}`, "error");
    }
  }

  // --- ドラッグ＆ドロップ ---
  ["dragenter", "dragover"].forEach((ev) =>
    dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add("dragover");
    })
  );
  ["dragleave", "drop"].forEach((ev) =>
    dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove("dragover");
    })
  );
  dropzone.addEventListener("drop", async (e) => {
    const collected = await collectFromDataTransfer(e.dataTransfer);
    runImport(collected);
  });

  // --- クリックでフォルダ選択 ---
  dropzone.addEventListener("click", () => folderInput.click());
  dropzone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") folderInput.click();
  });
  wrap.querySelector("#pick-folder").addEventListener("click", () =>
    folderInput.click()
  );
  wrap.querySelector("#pick-files").addEventListener("click", () =>
    filesInput.click()
  );

  folderInput.addEventListener("change", () => {
    runImport(collectFromFileList(folderInput.files));
    folderInput.value = "";
  });
  filesInput.addEventListener("change", () => {
    runImport(collectFromFileList(filesInput.files));
    filesInput.value = "";
  });

  return wrap;
}
