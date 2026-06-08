// =====================================================================
// ステップ md ドキュメント関連ヘルパー
// ---------------------------------------------------------------------
//  - 本文 md の "## 見出し" セクション分割／抽出／除去
//  - 理解メモ・フィードバックを含むエクスポート用 md の生成
// =====================================================================

/**
 * md 本文を「プリアンブル」と「## セクション配列」に分割する。
 * @returns {{preamble:string, sections:{heading:string, body:string}[]}}
 */
export function splitSections(md) {
  const lines = (md || "").split(/\r?\n/);
  const preamble = [];
  const sections = [];
  let current = null;

  for (const line of lines) {
    const h = line.match(/^##\s+(.*?)\s*$/);
    if (h) {
      if (current) sections.push(current);
      current = { heading: h[1].trim(), body: [] };
    } else if (current) {
      current.body.push(line);
    } else {
      preamble.push(line);
    }
  }
  if (current) sections.push(current);

  return {
    preamble: preamble.join("\n").trim(),
    sections: sections.map((s) => ({
      heading: s.heading,
      body: s.body.join("\n").trim(),
    })),
  };
}

/** 指定見出しのセクション本文を返す（無ければ ""） */
export function getSectionBody(md, heading) {
  const { sections } = splitSections(md);
  const found = sections.find((s) => s.heading === heading);
  return found ? found.body : "";
}

/** 指定見出しのセクションを除いた md を返す */
export function removeSection(md, heading) {
  const { preamble, sections } = splitSections(md);
  const kept = sections.filter((s) => s.heading !== heading);
  let out = preamble ? preamble + "\n\n" : "";
  out += kept.map((s) => `## ${s.heading}\n${s.body}`).join("\n\n");
  return out.trim();
}

/** ステップのフィールドからフロントマターを再構築する */
function buildFrontmatter(curriculum, step) {
  const tags = Array.isArray(step.tags) ? step.tags : [];
  const lines = [
    "---",
    `title: ${step.title || ""}`,
    `category: ${step.category || curriculum.category || ""}`,
    `tags: [${tags.join(", ")}]`,
    `level: ${step.level ?? 1}`,
    `mode: ${step.mode || curriculum.mode || "standard"}`,
    `step: ${step.step ?? ""}`,
    `key_concept: ${step.key_concept || ""}`,
    `mastery_gained: ${step.mastery_gained || 0}`,
    `created: ${step.created || ""}`,
    "---",
  ];
  return lines.join("\n");
}

/**
 * 理解メモ・フィードバックを含むエクスポート用 md を生成する。
 * 仕様: 復習モードで「初回理解メモ／最新理解メモ／フィードバック」を表示できるよう
 * セクション化して書き出す。
 */
export function buildExportMd(curriculum, step) {
  const parts = [];
  parts.push(buildFrontmatter(curriculum, step));
  parts.push("");
  if (step.content) parts.push(step.content.trim());

  parts.push("\n---\n");

  if (step.firstNote) {
    parts.push("## 🧠 理解メモ（初回）");
    parts.push(step.firstNote.trim());
    parts.push("");
  }
  if (step.latestNote && step.latestNote !== step.firstNote) {
    parts.push("## 🧠 理解メモ（最新）");
    parts.push(step.latestNote.trim());
    parts.push("");
  }
  if (step.feedback) {
    parts.push("## 💬 マシュのフィードバック");
    parts.push(step.feedback.trim());
    parts.push("");
  }

  return parts.join("\n").trim() + "\n";
}

/**
 * リコールの 2 つの入力欄を 1 つの理解メモ md にまとめる。
 */
export function composeNote(generalText, keyConceptText, keyConcept) {
  const blocks = [];
  if (generalText && generalText.trim()) {
    blocks.push(`**学んだことの説明:**\n${generalText.trim()}`);
  }
  if (keyConceptText && keyConceptText.trim()) {
    const label = keyConcept
      ? `**「${keyConcept}」がなぜそう設計されているか:**`
      : "**設計理由の説明:**";
    blocks.push(`${label}\n${keyConceptText.trim()}`);
  }
  return blocks.join("\n\n");
}

/**
 * 句点「。」の後に改行を挿入して読みやすくする。
 * コードフェンス（```）内は対象外。閉じ括弧・改行が続く場合は挿入しない。
 */
export function breakAfterPeriods(md) {
  const parts = (md || "").split(/(```[\s\S]*?```)/g);
  return parts
    .map((p, i) => {
      if (i % 2 === 1) return p; // フェンスコードはそのまま
      return p.replace(/。(?![」』）)\]\n])/g, "。\n");
    })
    .join("");
}

/**
 * セクション本文から「マシュのひとことコメント」を抽出する。
 * md 内の <!-- mash_comment: コメント文 --> 形式をパース。
 * @returns {{comment: string, body: string}} comment は無ければ ""
 */
export function extractMashComment(text) {
  const re = /<!--\s*mash_comment:\s*([\s\S]*?)-->/i;
  const m = (text || "").match(re);
  const comment = m ? m[1].trim() : "";
  const body = (text || "").replace(/<!--\s*mash_comment:[\s\S]*?-->/gi, "").trim();
  return { comment, body };
}

/**
 * 一口メモ用テキストの整形。
 * md のブロック引用記法（行頭の "> "）と区切り線（---, ***, ___）を除去する。
 */
export function cleanMemoText(text) {
  return (text || "")
    .split(/\r?\n/)
    .filter((line) => !/^\s*([-*_])\1{2,}\s*$/.test(line))
    .map((line) => line.replace(/^\s*>\s?/, ""))
    .join("\n")
    .trim();
}

/** ブラウザでファイルとしてダウンロードさせる */
export function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
