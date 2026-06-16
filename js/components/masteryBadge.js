// =====================================================================
// マスタリーバッジ（画像優先 / SVG 代替）
// ---------------------------------------------------------------------
// assets/badges/mastery_[0-5].png があればそれを表示、無ければ
// utils.masteryBadgeSVG の SVG を表示します。
// =====================================================================

import { store } from "../storage/store.js?v=20260610c";
import { masteryBadgeSVG } from "../utils.js?v=20260610c";

// バッジ画像 URL のキャッシュ（mastery レベル → url|null）
const badgeCache = new Map();

export function resetBadgeCache() {
  badgeCache.clear();
}

async function getBadgeImageURL(level) {
  if (badgeCache.has(level)) return badgeCache.get(level);
  const url = await store.getAsset(`badges/mastery_${level}.png`);
  badgeCache.set(level, url || null);
  return url || null;
}

/**
 * 指定コンテナにバッジを描画する。
 * まず SVG を即時表示し、画像があれば差し替える（チラつき防止）。
 */
export async function applyMasteryBadge(container, mastery, size = 84) {
  if (!container) return;
  const level = Math.max(0, Math.min(5, Math.round(Number(mastery) || 0)));
  container.innerHTML = masteryBadgeSVG(mastery, size);
  const url = await getBadgeImageURL(level);
  if (url) {
    container.innerHTML = `<img class="mastery-badge-img" src="${url}"
      width="${size}" height="${size}" alt="マスタリー ${level} / 5"
      style="border-radius:12px" />`;
  }
}
