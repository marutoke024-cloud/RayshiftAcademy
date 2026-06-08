// =====================================================================
// ライブラリ集約サービス
// ---------------------------------------------------------------------
// カリキュラムとステップをまとめて読み込み、復習/おすすめ/称号などの
// 各機能が共通で使う集計を提供します。
// =====================================================================

import { store } from "../storage/store.js";

/** [{curriculum, steps}] を返す（steps は step 番号順） */
export async function getLibrary() {
  const curricula = await store.getCurricula();
  const out = [];
  for (const c of curricula) {
    const steps = await store.getSteps(c.id);
    out.push({ curriculum: c, steps });
  }
  return out;
}

/** 完了済みステップ一覧 [{curriculum, step}] */
export function allCompletedSteps(library) {
  const res = [];
  for (const { curriculum, steps } of library) {
    for (const s of steps) {
      if (s.status === "completed") res.push({ curriculum, step: s });
    }
  }
  return res;
}

/** 学習中（解錠済み・未完了）ステップ一覧 [{curriculum, step}] */
export function inProgressSteps(library) {
  const res = [];
  for (const { curriculum, steps } of library) {
    for (const s of steps) {
      if (s.status === "in_progress") res.push({ curriculum, step: s });
    }
  }
  return res;
}

/** 完了済みカリキュラム一覧 */
export function completedCurricula(library) {
  return library
    .map((x) => x.curriculum)
    .filter((c) => c.status === "完了" || c.status === "completed");
}
