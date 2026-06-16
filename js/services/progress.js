// =====================================================================
// 進捗サービス（理解メモ保存 / マスタリー更新 / ステップ解錠）
// ---------------------------------------------------------------------
// 学習フローの状態遷移ロジックを 1 か所に集約します。
// =====================================================================

import { store } from "../storage/store.js?v=20260610c";
import { buildExportMd } from "../lib/stepDoc.js?v=20260610c";
import { todayISO } from "../utils.js?v=20260610c";

/** mode に応じた 1 ステップあたりの mastery 獲得量 */
function masteryGainFor(curriculum, step) {
  const mode = step.mode || curriculum.mode || "standard";
  return mode === "extended" ? 0.5 : 1;
}

/**
 * 理解メモを保存する（mdエクスポート時に呼ぶ）。
 * 初回メモが未設定なら firstNote に、常に latestNote に保存。
 * @returns {Promise<{step:object, mdDoc:string}>}
 */
export async function saveUnderstandingNote(curriculumId, stepId, noteText, raw = null) {
  const curriculum = await store.getCurriculum(curriculumId);
  const step = await store.getStep(curriculumId, stepId);
  if (!curriculum || !step) throw new Error("ステップが見つかりません");

  if (!step.firstNote) step.firstNote = noteText;
  step.latestNote = noteText;
  // リコール入力欄の生テキスト（再表示用に保持）
  if (raw) {
    step.recallGeneral = raw.general ?? step.recallGeneral ?? "";
    step.recallKeyConcept = raw.keyConcept ?? step.recallKeyConcept ?? "";
  }
  step.mdDoc = buildExportMd(curriculum, step);
  step.updatedAt = new Date().toISOString();

  const saved = await store.saveStep(curriculumId, step);
  // md を Storage（curricula/{cid}/{stepId}.md）へアップロード（失敗は非致命）
  const storageOk = await uploadStepMd(curriculumId, stepId, step.mdDoc);
  return { step: saved, mdDoc: step.mdDoc, storageOk };
}

/** ステップ md を Storage へアップロード。失敗しても処理は止めない。 */
async function uploadStepMd(curriculumId, stepId, mdDoc) {
  try {
    await store.saveStepMd(curriculumId, stepId, mdDoc);
    return true;
  } catch (e) {
    console.warn("md の Storage アップロードに失敗しました:", e);
    return false;
  }
}

function appendFeedback(existing, addition) {
  const a = (addition || "").trim();
  if (!a) return existing || "";
  if (!existing) return a;
  return `${existing}\n\n---\n\n${a}`;
}

/**
 * フィードバックを登録し、ステップを完了 → 次ステップ解錠 → マスタリー更新。
 * @returns {Promise<{curriculum, step, unlocked, allCompleted, masteryGain}>}
 */
export async function completeStepWithFeedback(
  curriculumId,
  stepId,
  feedbackText
) {
  const curriculum = await store.getCurriculum(curriculumId);
  const steps = await store.getSteps(curriculumId);
  const step = steps.find((s) => s.id === stepId);
  if (!curriculum || !step) throw new Error("ステップが見つかりません");

  const firstTime = step.status !== "completed";
  const masteryGain = masteryGainFor(curriculum, step);

  // フィードバックを追記
  step.feedback = appendFeedback(step.feedback, feedbackText);
  step.status = "completed";
  step.completedAt = step.completedAt || new Date().toISOString();
  // マスタリー獲得は初回完了時のみ
  if (firstTime || !step.mastery_gained) {
    step.mastery_gained = masteryGain;
  }
  step.mdDoc = buildExportMd(curriculum, step);
  await store.saveStep(curriculumId, step);
  // フィードバックを追記した md を Storage へ反映（失敗は非致命）
  const storageOk = await uploadStepMd(curriculumId, stepId, step.mdDoc);

  // 次ステップを解錠
  const sorted = [...steps].sort((a, b) => (a.step || 0) - (b.step || 0));
  const idx = sorted.findIndex((s) => s.id === stepId);
  let unlocked = null;
  if (idx >= 0 && idx + 1 < sorted.length) {
    const next = sorted[idx + 1];
    if (next.status === "locked") {
      next.status = "in_progress";
      await store.saveStep(curriculumId, next);
      unlocked = next;
    }
  }

  // カリキュラムのマスタリー / 進捗 / ステータスを再計算
  const fresh = await store.getSteps(curriculumId);
  const completed = fresh.filter((s) => s.status === "completed");
  const total = curriculum.total_steps || fresh.length;
  let mastery = completed.reduce((acc, s) => acc + (s.mastery_gained || 0), 0);
  mastery = Math.min(5, Math.round(mastery * 2) / 2);

  curriculum.mastery = mastery;
  curriculum.completedSteps = completed.length;

  const allCompleted = completed.length >= total && total > 0;
  if (allCompleted) {
    curriculum.status = "完了";
    curriculum.completed = curriculum.completed || todayISO();
    curriculum.mastery = 5;
    if (!curriculum.shougou) {
      curriculum.shougou = `${curriculum.title} マスター`;
    }
  } else {
    curriculum.status = "進行中";
  }
  await store.saveCurriculum(curriculum);

  return {
    curriculum,
    step,
    unlocked,
    allCompleted,
    masteryGain,
    storageOk,
  };
}

/** 完了ステップ数を集計（表示用） */
export async function getProgress(curriculumId) {
  const steps = await store.getSteps(curriculumId);
  const completed = steps.filter((s) => s.status === "completed").length;
  return { completed, total: steps.length };
}
