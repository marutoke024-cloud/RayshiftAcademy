// =====================================================================
// マシュアイコン管理（ランダム表示）
// ---------------------------------------------------------------------
// 仕様:
//   - mash_icon/mash01.png 〜 mash09.png の 9 種類
//   - ページ（ルート）表示のたびにランダムで 1 枚を選択
//   - そのページ内では全箇所同じ画像を使用（遷移ごとに切り替わる）
//   - ヒットなし時のみ mash_icon_sad.png（チャット小窓用）
//   - ロゴ（タイトル横・favicon）は mash_icon/mash_logo.png 固定
//
// 注: 画像が見つからない場合は onerror で mash_logo.png に
//     フォールバックして必ず表示できるようにする。
// =====================================================================

const FALLBACK = "./mash_icon/mash_logo.png";
const COUNT = 9;

let current = pickRandom();

function pickRandom() {
  return Math.floor(Math.random() * COUNT) + 1;
}

/** ルート遷移ごとに呼び、アイコンを選び直す */
export function rerollMashIcon() {
  current = pickRandom();
  return mashIconUrl();
}

/** 現在のページの通常アイコン URL */
export function mashIconUrl() {
  return `./mash_icon/mash${String(current).padStart(2, "0")}.png`;
}

/** ロゴ（アプリアイコン・タイトル横）URL */
export function mashLogoUrl() {
  return "./mash_icon/mash_logo.png";
}

/** しょんぼりアイコン URL */
export function mashSadUrl() {
  return "./mash_icon/mash_sad.png";
}

export const MASH_FALLBACK = FALLBACK;

/**
 * <img> の onerror 用文字列。番号付き / sad が無ければ mash_icon.png に差し替え。
 * （二重発火防止のため onerror を解除してから差し替える）
 */
export function iconOnerrorAttr() {
  return `this.onerror=null;this.src='${FALLBACK}'`;
}

/**
 * <img> 要素にマシュアイコンを安定適用する。
 * src を変えるたびに onerror を「再武装」するため、番号付きアイコンが
 * 404 でも必ず mash_icon.png にフォールバックする（チラつき/未表示を防止）。
 */
export function applyMashIcon(img, { sad = false } = {}) {
  if (!img) return;
  img.onerror = function () {
    // フォールバック自身も失敗したら無限ループを避けて停止
    this.onerror = null;
    if (this.src.indexOf(FALLBACK.replace("./", "")) === -1) {
      this.src = FALLBACK;
    }
  };
  img.src = sad ? mashSadUrl() : mashIconUrl();
}
