// =====================================================================
// Markdown 描画
// ---------------------------------------------------------------------
// marked.js（CDN, グローバル `marked`）を使って md → HTML に変換します。
// marked が読み込めなかった場合は、最低限のフォールバック描画を行います。
// =====================================================================

import { escapeHtml } from "../utils.js?v=20260610c";

/** md 文字列を HTML 文字列に変換して返す */
export function renderMarkdown(md) {
  const text = md || "";
  try {
    if (window.marked) {
      // marked v5+ は marked.parse、旧版は marked() で呼べる
      const parse = window.marked.parse || window.marked;
      return parse(text, { breaks: true, gfm: true });
    }
  } catch (e) {
    console.warn("marked 描画に失敗、フォールバックします:", e);
  }
  return fallbackMarkdown(text);
}

/** marked 不在時の最小フォールバック（見出し・段落・改行のみ） */
function fallbackMarkdown(text) {
  return escapeHtml(text)
    .split(/\n{2,}/)
    .map((block) => {
      const h = block.match(/^(#{1,6})\s+(.*)$/);
      if (h) {
        const level = h[1].length;
        return `<h${level}>${h[2]}</h${level}>`;
      }
      return `<p>${block.replace(/\n/g, "<br>")}</p>`;
    })
    .join("\n");
}
