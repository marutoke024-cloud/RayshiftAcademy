// =====================================================================
// デザイン講座 Tips サービス
// ---------------------------------------------------------------------
// 画像は Storage（assets/tips/{tipId}/...）、メタは tips コレクションへ。
// =====================================================================

import { store } from "../storage/store.js?v=20260610c";
import { uid } from "../utils.js?v=20260610c";
import { shrinkImage } from "../lib/media.js?v=20260610c";

export const TIP_CATEGORIES = [
  "線画",
  "塗り",
  "加工",
  "システム",
  "アナログ",
  "Clip Studio",
  "Procreate",
  "絵柄",
  "漫画表現",
  "デザイン",
];

/** Tips 一覧（新しい順）。読み取り失敗時は空配列で UI を維持。 */
export async function listTips() {
  try {
    const tips = await store.listDocs("tips");
    return tips.sort((a, b) =>
      (b.createdAt || "").localeCompare(a.createdAt || "")
    );
  } catch (e) {
    console.warn("Tips の読み取りに失敗しました:", e);
    return [];
  }
}

export async function getTip(id) {
  return store.getDoc("tips", id);
}

/**
 * Tips を新規保存。
 * @param {{title, categories:string[], memo, images:string[](dataURL), thumbnail:string(dataURL)}} input
 */
export async function createTip(input) {
  const id = uid("tip");
  const imagePaths = [];
  for (let i = 0; i < input.images.length; i++) {
    const small = await shrinkImage(input.images[i], 1600, 0.85);
    const path = `tips/${id}/img_${i}.jpg`;
    await store.saveAsset(path, small);
    imagePaths.push(path);
  }

  let thumbnailPath = imagePaths[0] || null;
  if (input.thumbnail) {
    thumbnailPath = `tips/${id}/thumb.jpg`;
    await store.saveAsset(thumbnailPath, input.thumbnail);
  }

  const doc = {
    title: input.title || "(無題)",
    categories: input.categories || [],
    memo: input.memo || "",
    imagePaths,
    thumbnailPath,
    createdAt: new Date().toISOString(),
  };
  return store.saveDoc("tips", id, doc);
}

export async function deleteTip(id) {
  const tip = await store.getDoc("tips", id);
  if (tip) {
    const paths = [...(tip.imagePaths || [])];
    if (tip.thumbnailPath && !paths.includes(tip.thumbnailPath)) {
      paths.push(tip.thumbnailPath);
    }
    await Promise.all(
      paths.map((p) => store.deleteAsset?.(p)).filter(Boolean)
    );
  }
  await store.deleteDoc("tips", id);
}

/** 表示用に画像パスを URL（または dataURL）へ解決する */
export async function resolveTipImages(tip) {
  const imageUrls = await Promise.all(
    (tip.imagePaths || []).map((p) => store.getAsset(p))
  );
  const thumbUrl = tip.thumbnailPath
    ? await store.getAsset(tip.thumbnailPath)
    : imageUrls[0] || null;
  return { thumbUrl, imageUrls: imageUrls.filter(Boolean) };
}

/** 今日の 1 Tips（ランダム） */
export function pickDailyTip(tips) {
  if (!tips.length) return null;
  return tips[Math.floor(Math.random() * tips.length)];
}
