// =====================================================================
// md インポート
// ---------------------------------------------------------------------
// ドラッグ＆ドロップ（フォルダ/ファイル）または <input webkitdirectory> で
// 受け取った md・画像を解析して store に登録します。
//   - フロントマター解析 → カリキュラム/ステップのメタデータ
//   - 画像 → アセットとして data URL 保存
//   - 既存データとの差分更新（進捗・理解メモ・フィードバックは保持）
// =====================================================================

import { parseFrontmatter } from "../lib/frontmatter.js";
import { store } from "../storage/store.js";
import { slugify } from "../utils.js";

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg)$/i;
const MD_EXT = /\.md$/i;

// ---------------------------------------------------------------------
// 1) DataTransfer / FileList からファイル収集（相対パス付き）
// ---------------------------------------------------------------------

/** ドロップされた items からファイルを再帰収集（フォルダ対応） */
export async function collectFromDataTransfer(dataTransfer) {
  const items = Array.from(dataTransfer.items || []);
  const entries = items
    .map((it) => (it.webkitGetAsEntry ? it.webkitGetAsEntry() : null))
    .filter(Boolean);

  if (entries.length > 0) {
    const collected = [];
    for (const entry of entries) {
      await walkEntry(entry, "", collected);
    }
    return collected;
  }

  // webkitGetAsEntry 非対応環境のフォールバック（フォルダは取れない）
  return Array.from(dataTransfer.files || []).map((file) => ({
    path: file.name,
    file,
  }));
}

/** <input type="file" webkitdirectory> / 複数選択からの収集 */
export function collectFromFileList(fileList) {
  return Array.from(fileList || []).map((file) => ({
    path: file.webkitRelativePath || file.name,
    file,
  }));
}

function walkEntry(entry, prefix, out) {
  return new Promise((resolve, reject) => {
    if (entry.isFile) {
      entry.file((file) => {
        out.push({ path: prefix + entry.name, file });
        resolve();
      }, reject);
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      const all = [];
      const readBatch = () => {
        reader.readEntries(async (batch) => {
          if (batch.length === 0) {
            // 子をすべて再帰処理
            for (const child of all) {
              await walkEntry(child, prefix + entry.name + "/", out);
            }
            resolve();
          } else {
            all.push(...batch);
            readBatch(); // readEntries はバッチで返るため繰り返し呼ぶ
          }
        }, reject);
      };
      readBatch();
    } else {
      resolve();
    }
  });
}

// ---------------------------------------------------------------------
// 2) ファイル読み込みヘルパー
// ---------------------------------------------------------------------

function readText(file) {
  if (file.text) return file.text();
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsText(file);
  });
}

function readDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

// ---------------------------------------------------------------------
// 3) パス解析ヘルパー
// ---------------------------------------------------------------------

function basename(path) {
  return path.split("/").pop();
}
function dirname(path) {
  const parts = path.split("/");
  parts.pop();
  return parts.join("/");
}
function isIndexFile(name) {
  // "00_index.md" / "0_index.md" / "index.md" などを索引ファイルとみなす
  return /^(\d+[_\-\s]*)?index\.md$/i.test(name);
}
/** ファイル名先頭の連番（"01_xxx.md" → 1）。無ければ null */
function leadingNumber(name) {
  const m = name.match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}
/** アセットの保存キー（assets/ 以降、無ければ basename） */
function assetKey(path) {
  const lower = path.toLowerCase();
  const idx = lower.lastIndexOf("assets/");
  if (idx !== -1) return path.slice(idx + "assets/".length);
  return basename(path);
}
/** ステップ ID（拡張子なしのファイル名をスラッグ化） */
function stepIdFromName(name) {
  return slugify(name.replace(MD_EXT, ""));
}
/** ファイル名からタイトル候補（"01_配列とは.md" → "配列とは"） */
function titleFromName(name) {
  return name.replace(MD_EXT, "").replace(/^\d+[_\-\s]*/, "");
}

// ---------------------------------------------------------------------
// 4) index 本文からのセクション抽出（軽量）
// ---------------------------------------------------------------------

function extractSection(markdown, heading) {
  // "## 見出し" から次の同レベル以上の見出し("#"/"##")までを行単位で抜き出す
  const lines = (markdown || "").split(/\r?\n/);
  const target = heading.trim();
  let capturing = false;
  const out = [];
  for (const line of lines) {
    const h2 = line.match(/^##\s+(.*?)\s*$/);
    const h1 = line.match(/^#\s+(.*?)\s*$/);
    if (capturing) {
      // 次の見出しに当たったら終了
      if (h2 || h1) break;
      out.push(line);
    } else if (h2 && h2[1].trim() === target) {
      capturing = true;
    }
  }
  return out
    .join("\n")
    .replace(/<!--[\s\S]*?-->/g, "")
    .trim();
}

// ---------------------------------------------------------------------
// 5) メイン: インポート実行
// ---------------------------------------------------------------------

/**
 * 収集済みファイル配列 [{path, file}] をインポートする。
 * @returns {Promise<{curricula:number, steps:number, assets:number, messages:string[]}>}
 */
export async function importFiles(collected, onProgress = () => {}) {
  const summary = { curricula: 0, steps: 0, assets: 0, messages: [] };

  // --- 画像（アセット）を保存 ---
  const images = collected.filter((c) => IMAGE_EXT.test(c.path));
  for (const img of images) {
    try {
      const dataUrl = await readDataURL(img.file);
      const key = assetKey(img.path);
      await store.saveAsset(key, dataUrl);
      summary.assets++;
      onProgress(`画像を保存: ${key}`);
    } catch (e) {
      summary.messages.push(`画像の保存に失敗: ${img.path} (${e.message})`);
    }
  }

  // --- md をディレクトリ単位でグループ化 ---
  const mdFiles = collected.filter((c) => MD_EXT.test(c.path));
  // assets 配下の md は無視（基本無いが念のため）
  const groups = new Map(); // dir -> [{path, file}]
  for (const md of mdFiles) {
    if (assetKey(md.path) !== basename(md.path) && /assets\//i.test(md.path))
      continue;
    const dir = dirname(md.path);
    if (!groups.has(dir)) groups.set(dir, []);
    groups.get(dir).push(md);
  }

  for (const [dir, files] of groups) {
    try {
      const created = await importCurriculumGroup(dir, files, onProgress);
      if (created) {
        summary.curricula++;
        summary.steps += created.stepCount;
      }
    } catch (e) {
      summary.messages.push(`カリキュラム取り込み失敗 (${dir}): ${e.message}`);
    }
  }

  return summary;
}

async function importCurriculumGroup(dir, files, onProgress) {
  const indexFile = files.find((f) => isIndexFile(basename(f.path)));
  const stepFiles = files
    .filter((f) => !isIndexFile(basename(f.path)))
    .filter((f) => leadingNumber(basename(f.path)) !== null || !indexFile);

  // index も step も無ければスキップ
  if (!indexFile && stepFiles.length === 0) return null;

  // --- カリキュラム ID / タイトル ---
  const folderName = dir.split("/").filter(Boolean).pop() || "";
  let indexData = {};
  let indexContent = "";
  if (indexFile) {
    const parsed = parseFrontmatter(await readText(indexFile.file));
    indexData = parsed.data;
    indexContent = parsed.content;
  }

  const title =
    indexData.title || folderName || "（無題のカリキュラム）";
  const curriculumId = slugify(folderName || title);

  // --- 既存データ（差分更新のため取得） ---
  const existing = await store.getCurriculum(curriculumId);

  // --- ステップを構築・保存 ---
  stepFiles.sort(
    (a, b) =>
      (leadingNumber(basename(a.path)) || 0) -
      (leadingNumber(basename(b.path)) || 0)
  );

  let stepCount = 0;
  const stepListForIndex = [];
  for (let i = 0; i < stepFiles.length; i++) {
    const sf = stepFiles[i];
    const name = basename(sf.path);
    const { data, content } = parseFrontmatter(await readText(sf.file));
    const stepId = stepIdFromName(name);
    const stepNumber = data.step ?? leadingNumber(name) ?? i + 1;
    const stepTitle = data.title || titleFromName(name);

    const existingStep = await store.getStep(curriculumId, stepId);

    const stepRecord = {
      id: stepId,
      step: stepNumber,
      title: stepTitle,
      key_concept: data.key_concept || "",
      level: data.level ?? 1,
      mode: data.mode || indexData.mode || "standard",
      category: data.category || indexData.category || "",
      tags: data.tags || [],
      created: data.created || "",
      content, // md 本文（Phase 2 でセクション描画に使用）

      // --- 進捗系: 既存があれば保持（差分更新） ---
      status: existingStep?.status ?? (stepNumber === 1 ? "in_progress" : "locked"),
      mastery_gained: existingStep?.mastery_gained ?? (data.mastery_gained || 0),
      completedAt: existingStep?.completedAt ?? null,
      firstNote: existingStep?.firstNote ?? null,
      latestNote: existingStep?.latestNote ?? null,
      feedback: existingStep?.feedback ?? null,
    };

    await store.saveStep(curriculumId, stepRecord);
    stepListForIndex.push({ step: stepNumber, title: stepTitle, id: stepId });
    stepCount++;
    onProgress(`ステップを保存: ${title} / ${stepTitle}`);
  }

  // --- カリキュラムのメタデータを構築・保存 ---
  const totalSteps =
    indexData.total_steps || stepCount || existing?.total_steps || 0;

  const curriculum = {
    id: curriculumId,
    title,
    category: indexData.category || existing?.category || "",
    tags: indexData.tags || existing?.tags || [],
    mode: indexData.mode || existing?.mode || "standard",
    total_steps: totalSteps,
    difficulty_rating: indexData.difficulty_rating || existing?.difficulty_rating || "",
    created: indexData.created || existing?.created || new Date().toISOString().slice(0, 10),

    // index 本文から抽出
    overview: extractSection(indexContent, "カリキュラム概要") || existing?.overview || "",
    dependencies: extractSection(indexContent, "依存カリキュラム") || existing?.dependencies || "",
    soutei: extractSection(indexContent, "総評") || existing?.soutei || "",
    shougou: extractSection(indexContent, "称号") || existing?.shougou || "",
    indexContent,

    // --- 進捗系: 既存を優先して保持 ---
    mastery: existing?.mastery ?? (indexData.mastery || 0),
    status: existing?.status ?? (indexData.status || "未開始"),
    completed: existing?.completed ?? (indexData.completed || ""),

    steps: stepListForIndex,
    updatedAt: new Date().toISOString(),
  };

  await store.saveCurriculum(curriculum);
  return { stepCount };
}
