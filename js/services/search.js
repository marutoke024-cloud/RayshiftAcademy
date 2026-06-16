// =====================================================================
// 横断キーワード検索（マシュチャット小窓用）
// ---------------------------------------------------------------------
// 対象: カリキュラム / Tips / 英語レッスン / Phrase Bank
// Claude API は使わず、保存済みデータをキーワードで部分一致検索する。
// 各コレクションの読み取りは失敗しても全体は止めない（Firestore 未設定でも動く）。
// =====================================================================

import { store } from "../storage/store.js?v=20260610c";

/**
 * @returns {Promise<{type, id, title, snippet, href}[]>}
 */
export async function searchAll(keywordRaw) {
  const kw = (keywordRaw || "").trim().toLowerCase();
  if (!kw) return [];

  const has = (s) => String(s ?? "").toLowerCase().includes(kw);
  const results = [];

  // --- カリキュラム ---
  try {
    const curricula = await store.getCurricula();
    for (const c of curricula) {
      if (has(c.title) || has(c.category) || (c.tags || []).some((t) => has(t))) {
        results.push({
          type: "curriculum",
          icon: "📚",
          id: c.id,
          title: c.title,
          snippet: c.category || "カリキュラム",
          href: `/curriculum/${encodeURIComponent(c.id)}`,
        });
      }
    }
  } catch (e) {
    console.warn("検索: カリキュラム読み取り失敗", e);
  }

  // --- Tips ---
  try {
    const tips = await store.listDocs("tips");
    for (const t of tips) {
      if (has(t.title) || has(t.memo) || (t.categories || []).some((c) => has(c))) {
        results.push({
          type: "tip",
          icon: "🎨",
          id: t.id,
          title: t.title,
          snippet: (t.categories || []).join(" / ") || "Tips",
          href: `/design`,
        });
      }
    }
  } catch (e) {
    console.warn("検索: Tips 読み取り失敗", e);
  }

  // --- 英語レッスン ---
  try {
    const lessons = await store.listDocs("english_lessons");
    for (const l of lessons) {
      if (has(l.title) || has(l.situation) || has(l.yourResponse)) {
        results.push({
          type: "lesson",
          icon: "🛡️",
          id: l.id,
          title: l.title,
          snippet: "English lesson",
          href: `/english/lesson/${encodeURIComponent(l.id)}`,
        });
      }
    }
  } catch (e) {
    console.warn("検索: 英語レッスン読み取り失敗", e);
  }

  // --- Phrase Bank ---
  try {
    const phrases = await store.listDocs("phrase_bank");
    for (const p of phrases) {
      if (has(p.phrase)) {
        results.push({
          type: "phrase",
          icon: "💬",
          id: p.id,
          title: p.phrase,
          snippet: "Phrase Bank",
          href: `/english/phrases`,
        });
      }
    }
  } catch (e) {
    console.warn("検索: Phrase Bank 読み取り失敗", e);
  }

  return results;
}
