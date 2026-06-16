// =====================================================================
// 今日のおすすめ
// ---------------------------------------------------------------------
// 優先順位（仕様）:
//   1. 未完了ステップ（解錠済みで学習中のステップ）
//   2. 完了済みの中で mastery_gained が低いステップ（復習向き）
// =====================================================================

import { inProgressSteps, allCompletedSteps } from "./library.js?v=20260610c";

/**
 * @returns {null | {curriculum, step, reason: "next"|"review"}}
 */
export function pickTodaysStep(library) {
  // 1) 学習中ステップを優先（カリキュラム mastery が低い順）
  const inProg = inProgressSteps(library);
  if (inProg.length) {
    inProg.sort(
      (a, b) => (a.curriculum.mastery || 0) - (b.curriculum.mastery || 0)
    );
    return { ...inProg[0], reason: "next" };
  }

  // 2) 完了済みで mastery_gained が低いステップ（復習）
  const completed = allCompletedSteps(library);
  if (completed.length) {
    completed.sort(
      (a, b) => (a.step.mastery_gained || 0) - (b.step.mastery_gained || 0)
    );
    return { ...completed[0], reason: "review" };
  }

  return null;
}
