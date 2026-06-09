// =====================================================================
// Mash's English Class サービス（lessons / phrase bank）
// ---------------------------------------------------------------------
//  - english_lessons コレクション: パース済みレッスン
//  - phrase_bank コレクション: 登録フレーズ（登録元レッスン ID 付き）
// =====================================================================

import { store } from "../storage/store.js";
import { uid } from "../utils.js";
import { parseLesson } from "../lib/lessonDoc.js";

const LESSONS = "english_lessons";
const PHRASES = "phrase_bank";

// ---------- レッスン ----------
export async function listLessons() {
  try {
    const list = await store.listDocs(LESSONS);
    return list.sort((a, b) => {
      const da = a.date || a.createdAt || "";
      const db = b.date || b.createdAt || "";
      return db.localeCompare(da);
    });
  } catch (e) {
    console.warn("Lessons の読み取りに失敗しました:", e);
    return [];
  }
}

export async function getLesson(id) {
  return store.getDoc(LESSONS, id);
}

/** md テキストを取り込み、パースして保存 */
export async function importLessonMd(mdText) {
  const parsed = parseLesson(mdText);
  const id = uid("lesson");
  const doc = {
    title: parsed.title,
    date: parsed.date || new Date().toISOString().slice(0, 10),
    situation: parsed.situation,
    yourResponse: parsed.yourResponse,
    feedback: parsed.feedback,
    selfReview: "",
    raw: mdText,
    createdAt: new Date().toISOString(),
  };
  return store.saveDoc(LESSONS, id, doc);
}

export async function updateLesson(id, patch) {
  const cur = await store.getDoc(LESSONS, id);
  if (!cur) throw new Error("Lesson not found");
  return store.saveDoc(LESSONS, id, { ...cur, ...patch });
}

export async function deleteLesson(id) {
  await store.deleteDoc(LESSONS, id);
}

// ---------- Phrase Bank ----------
export async function listPhrases() {
  try {
    const list = await store.listDocs(PHRASES);
    return list.sort((a, b) =>
      (b.createdAt || "").localeCompare(a.createdAt || "")
    );
  } catch (e) {
    console.warn("Phrases の読み取りに失敗しました:", e);
    return [];
  }
}

export async function addPhrase(phrase, lessonId, lessonTitle) {
  const text = (phrase || "").trim();
  if (!text) return null;
  const id = uid("phrase");
  return store.saveDoc(PHRASES, id, {
    phrase: text,
    lessonId: lessonId || null,
    lessonTitle: lessonTitle || "",
    createdAt: new Date().toISOString(),
  });
}

export async function deletePhrase(id) {
  await store.deleteDoc(PHRASES, id);
}

/** Daily Expression（Phrase Bank からランダム 1 件） */
export function pickDailyPhrase(phrases) {
  if (!phrases.length) return null;
  return phrases[Math.floor(Math.random() * phrases.length)];
}
