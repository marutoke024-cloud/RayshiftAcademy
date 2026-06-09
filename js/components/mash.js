// =====================================================================
// マシュ吹き出し（一口メモ / おすすめ など共通 UI）
// ---------------------------------------------------------------------
// 優先順: インポートされた mash_sd.png > 同梱の ./assets/mash_bg.jpg。
// =====================================================================

import { store } from "../storage/store.js";
import { escapeHtml } from "../utils.js";
import { mashIconUrl, MASH_FALLBACK } from "../lib/mashIcon.js";

let cachedMashUrl;

async function getMashImageURL() {
  if (cachedMashUrl !== undefined) return cachedMashUrl;
  // インポートされた SD イラストがあれば優先、無ければ同梱画像
  cachedMashUrl = (await store.getAsset("mash_sd.png")) || null;
  return cachedMashUrl;
}

/** マシュ画像をリセット（再インポート後に再取得させる） */
export function resetMashImageCache() {
  cachedMashUrl = undefined;
}

/**
 * マシュ吹き出し要素を生成。
 * @param {string} text 吹き出し本文（プレーンテキスト）
 * @param {object} opts { size?: number }
 */
export async function createMashBubble(text, opts = {}) {
  const size = opts.size || 96;
  const el = document.createElement("div");
  el.className = "mash-bubble";

  const uploaded = await getMashImageURL();
  const src = uploaded || mashIconUrl();
  // 同梱の全身イラストは顔が見えるよう上寄せ（is-fallback）
  const fallbackClass = uploaded ? "" : " is-fallback";
  // 番号付きアイコンが無ければ mash_icon.png → それも無ければプレースホルダー
  const onerr = uploaded
    ? `this.onerror=null;this.outerHTML='<div class=&quot;mash-avatar mash-placeholder&quot; style=&quot;width:${size}px;height:${size}px&quot;>マシュ</div>'`
    : `this.onerror=function(){this.onerror=null;this.outerHTML='<div class=&quot;mash-avatar mash-placeholder&quot; style=&quot;width:${size}px;height:${size}px&quot;>マシュ</div>'};this.src='${MASH_FALLBACK}'`;
  const avatar = `<img class="mash-avatar${fallbackClass}" src="${src}" alt="マシュ"
      width="${size}" height="${size}"
      onerror="${onerr}" />`;

  // 改行（句点改行など）を <br> として表示
  const speechHtml = escapeHtml(text).replace(/\n/g, "<br>");
  el.innerHTML = `
    ${avatar}
    <div class="mash-speech">${speechHtml}</div>
  `;
  return el;
}
