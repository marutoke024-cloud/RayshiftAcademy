// =====================================================================
// Mash's English Class レッスン md パーサー
// ---------------------------------------------------------------------
// テンプレート:
//   ---
//   title:
//   date:
//   ---
//   ## Situation
//   ## Your Response
//   ## Mash's Feedback
//   ### What You Did Well
//   ### More Natural Expressions & Corrections
//   ### From Mash
// =====================================================================

import { parseFrontmatter } from "./frontmatter.js";

/** 本文を見出し（## / ###）単位のセクションに分割（外部公開） */
export function splitLessonSections(content) {
  return splitByHeadings(content);
}

/** 本文を見出し（## / ###）単位のセクションに分割 */
function splitByHeadings(content) {
  const lines = content.split(/\r?\n/);
  const sections = [];
  let current = null;
  for (const line of lines) {
    const m = line.match(/^(#{2,3})\s+(.*?)\s*$/);
    if (m) {
      if (current) sections.push(current);
      current = { level: m[1].length, heading: m[2].trim(), body: [] };
    } else if (current) {
      current.body.push(line);
    }
  }
  if (current) sections.push(current);
  return sections.map((s) => ({
    level: s.level,
    heading: s.heading,
    body: s.body.join("\n").trim(),
  }));
}

function findSection(sections, name) {
  const hit = sections.find(
    (s) => s.heading.toLowerCase() === name.toLowerCase()
  );
  return hit ? hit.body : "";
}

/**
 * レッスン md をパースして構造化オブジェクトを返す。
 * @returns {{title, date, situation, yourResponse, feedback:{wellDone, corrections, fromMash}}}
 */
export function parseLesson(mdText) {
  const { data, content } = parseFrontmatter(mdText || "");
  const sections = splitByHeadings(content);

  return {
    title: data.title || "(Untitled Lesson)",
    date: data.date || "",
    // フロントマターを除いた本文全体（詳細表示はこれをそのままレンダリング）
    content,
    situation: findSection(sections, "Situation"),
    yourResponse: findSection(sections, "Your Response"),
    feedback: {
      wellDone: findSection(sections, "What You Did Well"),
      corrections: findSection(
        sections,
        "More Natural Expressions & Corrections"
      ),
      fromMash: findSection(sections, "From Mash"),
    },
  };
}
