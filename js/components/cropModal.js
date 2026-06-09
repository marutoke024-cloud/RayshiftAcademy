// =====================================================================
// 正方形クロップモーダル（サムネイル調整）
// ---------------------------------------------------------------------
// 画像をドラッグで移動・スライダーでズームして正方形に切り出す。
// confirm で切り出した dataURL を resolve、cancel で null を resolve。
// =====================================================================

import { loadImage, cropSquare } from "../lib/media.js";

const VP = 300; // ビューポート（正方形）px

/**
 * @param {string} dataUrl 元画像 dataURL
 * @returns {Promise<string|null>} 切り出した dataURL（cancel なら null）
 */
export async function openCropModal(dataUrl) {
  const img = await loadImage(dataUrl);

  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "crop-overlay";
    overlay.innerHTML = `
      <div class="crop-modal">
        <div class="crop-title">サムネイルを調整（ドラッグで移動・スライダーで拡大）</div>
        <div class="crop-viewport" style="width:${VP}px;height:${VP}px">
          <img class="crop-img" alt="crop" draggable="false" />
        </div>
        <label class="crop-zoom">
          拡大
          <input type="range" id="crop-zoom" min="1" max="3" step="0.01" value="1" />
        </label>
        <div class="crop-actions">
          <button class="btn btn-ghost" id="crop-cancel">キャンセル</button>
          <button class="btn btn-primary" id="crop-ok">この範囲で決定</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const imgEl = overlay.querySelector(".crop-img");
    imgEl.src = dataUrl;

    // cover スケール（画像がビューポートを覆う最小倍率）
    const baseScale = Math.max(VP / img.naturalWidth, VP / img.naturalHeight);
    let zoom = 1;
    let offsetX = 0;
    let offsetY = 0;

    function dispSize() {
      const f = baseScale * zoom;
      return { w: img.naturalWidth * f, h: img.naturalHeight * f, f };
    }
    function clamp() {
      const { w, h } = dispSize();
      offsetX = Math.min(0, Math.max(VP - w, offsetX));
      offsetY = Math.min(0, Math.max(VP - h, offsetY));
    }
    function apply() {
      clamp();
      const { w, h } = dispSize();
      imgEl.style.width = `${w}px`;
      imgEl.style.height = `${h}px`;
      imgEl.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
    }
    // 初期: 中央寄せ
    (function center() {
      const { w, h } = dispSize();
      offsetX = (VP - w) / 2;
      offsetY = (VP - h) / 2;
      apply();
    })();

    // ドラッグ移動
    let dragging = false;
    let startX = 0;
    let startY = 0;
    const onDown = (e) => {
      dragging = true;
      const p = point(e);
      startX = p.x - offsetX;
      startY = p.y - offsetY;
    };
    const onMove = (e) => {
      if (!dragging) return;
      const p = point(e);
      offsetX = p.x - startX;
      offsetY = p.y - startY;
      apply();
    };
    const onUp = () => (dragging = false);
    function point(e) {
      const t = e.touches ? e.touches[0] : e;
      return { x: t.clientX, y: t.clientY };
    }
    const vp = overlay.querySelector(".crop-viewport");
    vp.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    vp.addEventListener("touchstart", onDown, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onUp);

    // ズーム
    overlay.querySelector("#crop-zoom").addEventListener("input", (e) => {
      zoom = Number(e.target.value);
      apply();
    });

    function cleanup() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
      overlay.remove();
    }

    overlay.querySelector("#crop-cancel").addEventListener("click", () => {
      cleanup();
      resolve(null);
    });
    overlay.querySelector("#crop-ok").addEventListener("click", () => {
      const { f } = dispSize();
      const sx = -offsetX / f;
      const sy = -offsetY / f;
      const size = VP / f;
      const cropped = cropSquare(img, { sx, sy, size }, 480);
      cleanup();
      resolve(cropped);
    });
  });
}
