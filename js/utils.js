// =====================================================================
// 汎用ユーティリティ
// =====================================================================

/** HTML エスケープ（XSS 対策・テキスト描画用） */
export function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** 文字列を安全な ID 文字列に変換（日本語はそのまま残し、危険文字のみ置換） */
export function slugify(str) {
  return String(str ?? "")
    .trim()
    .replace(/[\\/:*?"<>|#%]/g, "_")
    .replace(/\s+/g, "_");
}

/**
 * デバイス判定。
 * 仕様: 画面幅 1024px 以上 = PC（全機能）、未満 = スマホ/iPad（復習のみ）。
 */
export function isPC() {
  return window.innerWidth >= 1024;
}

/** カリキュラムの進捗ステータス表示用ラベル */
export function statusLabel(status) {
  switch (status) {
    case "未開始":
    case "not_started":
      return "未開始";
    case "完了":
    case "completed":
      return "完了";
    case "進行中":
    case "in_progress":
    default:
      return "進行中";
  }
}

/**
 * マスタリーバッジ（0〜5）の SVG を生成して返す。
 * 画像が未アップロードのときの代替デザイン。
 * 星を 5 つ並べ、mastery 個ぶんを点灯させる。
 */
export function masteryBadgeSVG(mastery, size = 88) {
  const m = Math.max(0, Math.min(5, Math.round(Number(mastery) || 0)));
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.42;

  // 周囲に 5 つの星を円形配置
  let stars = "";
  for (let i = 0; i < 5; i++) {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    const sx = cx + Math.cos(angle) * r;
    const sy = cy + Math.sin(angle) * r;
    const on = i < m;
    stars += starPath(sx, sy, size * 0.11, on);
  }

  return `
  <svg class="mastery-badge-svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"
       role="img" aria-label="マスタリー ${m} / 5">
    <defs>
      <radialGradient id="mbg" cx="50%" cy="40%" r="65%">
        <stop offset="0%" stop-color="#3a2d5e"/>
        <stop offset="100%" stop-color="#221a3a"/>
      </radialGradient>
    </defs>
    <circle cx="${cx}" cy="${cy}" r="${size * 0.46}" fill="url(#mbg)"
            stroke="#8a7bd8" stroke-width="2"/>
    ${stars}
    <text x="${cx}" y="${cy + size * 0.07}" text-anchor="middle"
          font-size="${size * 0.26}" font-weight="700"
          fill="#fff" font-family="system-ui, sans-serif">${m}</text>
  </svg>`;
}

function starPath(cx, cy, radius, on) {
  let points = "";
  for (let i = 0; i < 5; i++) {
    const outer = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    const inner = outer + Math.PI / 5;
    points += `${cx + Math.cos(outer) * radius},${cy + Math.sin(outer) * radius} `;
    points += `${cx + Math.cos(inner) * (radius * 0.45)},${
      cy + Math.sin(inner) * (radius * 0.45)
    } `;
  }
  const fill = on ? "#ffd45e" : "#4b4170";
  const stroke = on ? "#ffb52e" : "#3a3158";
  return `<polygon points="${points.trim()}" fill="${fill}" stroke="${stroke}" stroke-width="0.8"/>`;
}

/** 今日の日付を YYYY-MM-DD で返す */
export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/** 軽量トースト通知 */
export function toast(message, type = "info") {
  let host = document.getElementById("toast-host");
  if (!host) {
    host = document.createElement("div");
    host.id = "toast-host";
    document.body.appendChild(host);
  }
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.textContent = message;
  host.appendChild(el);
  // アニメーション後に削除
  requestAnimationFrame(() => el.classList.add("show"));
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 300);
  }, 3200);
}
