// =====================================================================
// マシュ吹き出し（一口メモ / おすすめ など共通 UI）
// ---------------------------------------------------------------------
// assets/mash_sd.png があれば表示、無ければプレースホルダー。
// =====================================================================

import { store } from "../storage/store.js";
import { escapeHtml } from "../utils.js";

let cachedMashUrl;

async function getMashImageURL() {
  if (cachedMashUrl !== undefined) return cachedMashUrl;
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

  const url = await getMashImageURL();
  const avatar = url
    ? `<img class="mash-avatar" src="${url}" alt="マシュ" width="${size}" height="${size}" />`
    : `<div class="mash-avatar mash-placeholder" style="width:${size}px;height:${size}px"
          title="assets/mash_sd.png をインポートすると表示されます">マシュ</div>`;

  el.innerHTML = `
    ${avatar}
    <div class="mash-speech">${escapeHtml(text)}</div>
  `;
  return el;
}
