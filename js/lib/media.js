// =====================================================================
// 画像メディア・ヘルパー
// ---------------------------------------------------------------------
//  - ファイル → dataURL 変換
//  - 大きすぎる画像の縮小（Storage / 表示負荷の軽減）
//  - 正方形クロップ（サムネイル生成）
//  - 画像全画面モーダル
// =====================================================================

/** File を dataURL（base64）に読み込む */
export function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** dataURL から HTMLImageElement を生成（読み込み完了を待つ） */
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
    img.src = src;
  });
}

/**
 * 画像を長辺 maxSize px 以下に縮小した dataURL を返す（JPEG）。
 * すでに小さければそのまま再エンコードのみ。
 */
export async function shrinkImage(dataUrl, maxSize = 1600, quality = 0.85) {
  const img = await loadImage(dataUrl);
  let { width, height } = img;
  if (Math.max(width, height) > maxSize) {
    const scale = maxSize / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

/**
 * 画像から正方形領域を切り出して dataURL（JPEG）を返す。
 * @param {HTMLImageElement} img 元画像
 * @param {{sx:number, sy:number, size:number}} crop 元画像座標系の切り出し矩形（正方形）
 * @param {number} out 出力ピクセルサイズ
 */
export function cropSquare(img, crop, out = 480) {
  const canvas = document.createElement("canvas");
  canvas.width = out;
  canvas.height = out;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(
    img,
    crop.sx,
    crop.sy,
    crop.size,
    crop.size,
    0,
    0,
    out,
    out
  );
  return canvas.toDataURL("image/jpeg", 0.85);
}

/** 画像を全画面モーダルで表示する */
export function openImageModal(src, alt = "") {
  const overlay = document.createElement("div");
  overlay.className = "img-modal-overlay";
  overlay.innerHTML = `
    <div class="img-modal">
      <button class="img-modal-close" aria-label="閉じる">✕</button>
      <img src="${src}" alt="${alt}" />
    </div>
  `;
  const close = () => overlay.remove();
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay || e.target.classList.contains("img-modal-close")) {
      close();
    }
  });
  document.addEventListener(
    "keydown",
    function onKey(e) {
      if (e.key === "Escape") {
        close();
        document.removeEventListener("keydown", onKey);
      }
    }
  );
  document.body.appendChild(overlay);
}
