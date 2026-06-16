// =====================================================================
// マシュアイコン管理（ランダム表示）
// ---------------------------------------------------------------------
// 仕様:
//   - mash_icon/mash01.png 〜 mash09.png のうち、ランダムプールは
//     mash03 を除く 8 種類（mash03 はチャットのヒットなし返答専用）。
//   - mashIconUrl() は呼ばれるたびに独立してランダム選択するため、
//     同じページ内でも「アイコン箇所ごと」に異なる絵柄になる。
//   - ロゴ（タイトル横・favicon）は mash_icon/mash_logo.png 固定。
//   - ヒットなし返答のときだけ mash03.png（mashSadUrl）。
//
// 注: 画像が見つからない場合は onerror で mash_logo.png に
//     フォールバックして必ず表示できるようにする。
// =====================================================================

const FALLBACK = "./mash_icon/mash_logo.png";

// ランダム表示プール（mash03 は「ヒットなし」専用なので除外）
const POOL = [1, 2, 4, 5, 6, 7, 8, 9];

function iconPath(n) {
  return `./mash_icon/mash${String(n).padStart(2, "0")}.png`;
}

/**
 * 互換用。各箇所が独立ランダムになったため、ページ単位の選び直しは不要。
 * （何もしない）
 */
export function rerollMashIcon() {}

/** 通常アイコン URL（呼ばれるたびにプールから独立ランダム選択） */
export function mashIconUrl() {
  const n = POOL[Math.floor(Math.random() * POOL.length)];
  return iconPath(n);
}

/** ロゴ（アプリアイコン・タイトル横）URL */
export function mashLogoUrl() {
  return "./mash_icon/mash_logo.png";
}

/** ヒットなし返答専用アイコン URL（mash03） */
export function mashSadUrl() {
  return iconPath(3);
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
