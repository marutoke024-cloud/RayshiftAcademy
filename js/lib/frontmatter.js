// =====================================================================
// フロントマター解析
// ---------------------------------------------------------------------
// md ファイル先頭の `---` で囲まれた YAML 風メタデータを解析します。
// 仕様書で使うフィールド（文字列 / 数値 / 真偽値 / 配列 [a, b] / 空値 /
// 日付文字列）に対応した軽量パーサーです。外部ライブラリは不要。
// =====================================================================

/**
 * 値の文字列を JS の値に変換する。
 *  - "[]" や "[a, b]" → 配列
 *  - 数値文字列 → 数値
 *  - true / false → 真偽値
 *  - 空 → ""（呼び出し側で扱いやすいよう空文字に）
 *  - それ以外 → 文字列（前後のクオートは除去）
 */
function coerce(raw) {
  const v = (raw ?? "").trim();
  if (v === "") return "";

  // 配列: [a, b, c] 形式
  if (v.startsWith("[") && v.endsWith("]")) {
    const inner = v.slice(1, -1).trim();
    if (inner === "") return [];
    return inner
      .split(",")
      .map((s) => stripQuotes(s.trim()))
      .filter((s) => s !== "");
  }

  if (v === "true") return true;
  if (v === "false") return false;
  if (v === "null") return null;

  // 数値（先頭ゼロの連番タイトル等は壊さないよう、純粋な数値表現のみ）
  if (/^-?\d+(\.\d+)?$/.test(v)) {
    return Number(v);
  }

  return stripQuotes(v);
}

function stripQuotes(s) {
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    return s.slice(1, -1);
  }
  return s;
}

/**
 * md テキストを { data, content } に分解する。
 * data: フロントマターのオブジェクト（無ければ {}）
 * content: フロントマターを除いた本文
 */
export function parseFrontmatter(text) {
  // 先頭の BOM / 余白を除去
  const normalized = text.replace(/^﻿/, "");

  // 先頭が "---" で始まるブロックのみフロントマターとして扱う
  const match = normalized.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*(\r?\n|$)/);
  if (!match) {
    return { data: {}, content: normalized.trim() };
  }

  const yaml = match[1];
  const content = normalized.slice(match[0].length).trim();
  const data = {};

  for (const line of yaml.split(/\r?\n/)) {
    // コメント行・空行はスキップ
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    // ネスト（インデント付き）は今回の仕様では未使用なのでスキップ
    if (/^\s/.test(line) && !line.includes(":")) continue;

    const idx = line.indexOf(":");
    if (idx === -1) continue;

    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1);

    // 行末コメントを除去（クオート外の # 以降）。簡易対応。
    value = stripInlineComment(value);

    data[key] = coerce(value);
  }

  return { data, content };
}

function stripInlineComment(value) {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < value.length; i++) {
    const c = value[i];
    if (c === "'" && !inDouble) inSingle = !inSingle;
    else if (c === '"' && !inSingle) inDouble = !inDouble;
    else if (c === "#" && !inSingle && !inDouble) {
      // 直前が空白のときだけコメントとみなす（URL の # 等を誤判定しない）
      if (i === 0 || /\s/.test(value[i - 1])) {
        return value.slice(0, i);
      }
    }
  }
  return value;
}
