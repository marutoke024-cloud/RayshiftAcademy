// =====================================================================
// 称号システム
// ---------------------------------------------------------------------
// 仕様:
//   - カリキュラム完了（mastery 5）で個別称号を付与
//   - 複数カリキュラム完了で上位称号を付与
//   - 称号はトップ画面に表示・（Firebase 有効時に）記録
// =====================================================================

import { completedCurricula } from "./library.js";
import { store } from "../storage/store.js";

// 完了数に応じた上位称号のしきい値
const OVERALL_TIERS = [
  { count: 2, label: "二冠の探究者", emoji: "🥈" },
  { count: 3, label: "三冠達成", emoji: "🥉" },
  { count: 5, label: "学究の徒", emoji: "📖" },
  { count: 10, label: "叡智の継承者", emoji: "👑" },
];

/**
 * @returns {{individual: {label, emoji, curriculumId}[], overall: {label, emoji}[], completedCount: number}}
 */
export function computeTitles(library) {
  const completed = completedCurricula(library);

  const individual = completed.map((c) => ({
    curriculumId: c.id,
    emoji: "🏅",
    label: firstLine(c.shougou) || `${c.title} マスター`,
  }));

  const overall = OVERALL_TIERS.filter((t) => completed.length >= t.count).map(
    (t) => ({ label: t.label, emoji: t.emoji })
  );

  return { individual, overall, completedCount: completed.length };
}

/**
 * 称号スナップショットを META に保存（Firebase 有効化時の記録用）。
 */
export async function persistTitles(titles) {
  try {
    await store.saveMeta?.("titles", {
      ...titles,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    /* META 未対応バックエンドでは無視 */
  }
}

function firstLine(text) {
  return String(text || "")
    .split(/\r?\n/)[0]
    .replace(/^#+\s*/, "")
    .trim();
}
