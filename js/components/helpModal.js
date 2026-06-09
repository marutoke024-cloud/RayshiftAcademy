// =====================================================================
// ヘルプモーダル
// ---------------------------------------------------------------------
// 「？」ボタンで起動。カリキュラム作成 / フィードバック依頼 / 英語レッスンの
// 合言葉と手順をステップ形式で表示する。合言葉はコピー可能。
// =====================================================================

import { toast } from "../utils.js";

const SECTIONS = [
  {
    title: "📚 カリキュラム作成",
    phrase: `以下の2ファイルを読んでください。
- RayshiftAcademy/00_起動プロンプト.md
- 00_Important/03_Claudeプロフ.md

読み込み完了したら
MODE A：○○のカリキュラム作って`,
    steps: [
      "新しいチャットを開く",
      "上記合言葉を入力して送信",
      "マシュが「読み込みました」と返答するのを待つ",
      "マシュのヒアリングに答える",
      "完成した md をアプリにインポート",
    ],
  },
  {
    title: "💬 フィードバック依頼",
    phrase: `RayshiftAcademy/00_起動プロンプト.md を読んで。
MODE B：curricula/○○/○○.md の Step○のフィードバックして`,
    steps: [
      "アプリでエクスポートボタンを押す",
      "新しいチャットを開く",
      "上記合言葉にファイルパスを入れて送信",
      "フィードバックをコピーしてアプリにアップロード",
    ],
  },
  {
    title: "🛡️ 英語レッスン",
    phrase: `以下の2ファイルを読んでください。
- RayshiftAcademy/00_起動プロンプト.md
- 00_Important/03_Claudeプロフ.md

MODE D：English lesson please`,
    steps: [
      "新しいチャットを開く",
      "上記合言葉を入力して送信",
      "レッスン終了後 md をエクスポートしてアプリにインポート",
    ],
  },
];

export function openHelpModal() {
  if (document.getElementById("help-overlay")) return;

  const overlay = document.createElement("div");
  overlay.id = "help-overlay";
  overlay.className = "form-overlay";
  overlay.innerHTML = `
    <div class="form-modal card help-modal">
      <div class="help-head">
        <h2 class="section-title" style="margin:0">❓ 使い方・合言葉</h2>
        <button class="chat-close" id="help-close" aria-label="閉じる">✕</button>
      </div>
      <p class="page-sub">Claude（マシュ）への合言葉と手順です。コードはタップでコピーできます。</p>
      ${SECTIONS.map(
        (s, i) => `
        <section class="help-section">
          <h3 class="help-title">${s.title}</h3>
          <div class="help-phrase-label">合言葉</div>
          <pre class="help-phrase" data-idx="${i}" title="クリックでコピー">${escapeText(
          s.phrase
        )}</pre>
          <div class="help-steps-label">手順</div>
          <ol class="help-steps">
            ${s.steps.map((st) => `<li>${escapeText(st)}</li>`).join("")}
          </ol>
        </section>`
      ).join("")}
      <div class="form-actions">
        <button class="btn btn-primary" id="help-ok">閉じる</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector("#help-close").addEventListener("click", close);
  overlay.querySelector("#help-ok").addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  // 合言葉クリックでコピー
  overlay.querySelectorAll(".help-phrase").forEach((pre) => {
    pre.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(SECTIONS[Number(pre.dataset.idx)].phrase);
        toast("合言葉をコピーしました", "success");
      } catch {
        toast("コピーできませんでした（手動で選択してください）", "warn");
      }
    });
  });
}

function escapeText(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
