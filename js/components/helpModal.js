// =====================================================================
// ヘルプ（コンテキスト別）
// ---------------------------------------------------------------------
// 各操作箇所の近くに置く「？」ボタンから、その箇所に関連するガイドのみを
// モーダルで表示する。topic ごとに内容を定義。
// =====================================================================

import { toast } from "../utils.js?v=20260610c";

// 各トピックの内容。block 種別: p（段落）/ phrase（合言葉・コピー可）/ steps（手順）/ h（小見出し）
const TOPICS = {
  overview: {
    title: "❓ Rayshift Academy の使い方",
    blocks: [
      { type: "p", text: "Obsidian で作った学習カリキュラムを取り込み、マシュ（Claude）と一緒に学ぶアプリです。" },
      { type: "h", text: "基本の流れ" },
      {
        type: "steps",
        items: [
          "カリキュラムを「インポート」から取り込む",
          "各ステップを ①解説 → ②リコール（理解メモ）→ ③フィードバック の順で学習",
          "フィードバックを貼ると次のステップが解錠され、マスタリーが上がる",
          "全ステップ完了で復習モード・称号が解放",
        ],
      },
      { type: "h", text: "その他の機能" },
      {
        type: "steps",
        items: [
          "🎨 デザイン講座：イラスト Tips を画像つきで保存",
          "🛡️ マシュの英語教室：英語レッスンログと Phrase Bank",
          "右下のマシュ小窓：記録をキーワード検索",
          "各画面の「？」：その操作のガイドを表示",
        ],
      },
    ],
  },

  curriculum: {
    title: "📚 カリキュラム作成・インポート",
    blocks: [
      { type: "h", text: "① マシュに作ってもらう（合言葉）" },
      {
        type: "phrase",
        text: `以下の2ファイルを読んでください。
- RayshiftAcademy/00_起動プロンプト.md
- 00_Important/03_Claudeプロフ.md

読み込み完了したら
MODE A：○○のカリキュラム作って`,
      },
      {
        type: "steps",
        items: [
          "新しいチャットを開く",
          "上記合言葉を入力して送信",
          "マシュが「読み込みました」と返答するのを待つ",
          "マシュのヒアリングに答える",
          "完成した md を保存する",
        ],
      },
      { type: "h", text: "② アプリに取り込む" },
      {
        type: "steps",
        items: [
          "「フォルダを選択」で curricula/[題材名] フォルダを選ぶ",
          "または md・画像をドラッグ＆ドロップ",
          "フロントマターが解析され本棚に並びます",
        ],
      },
    ],
  },

  feedback: {
    title: "💬 フィードバック依頼",
    blocks: [
      { type: "h", text: "合言葉" },
      {
        type: "phrase",
        text: `RayshiftAcademy/00_起動プロンプト.md を読んで。
MODE B：curricula/○○/○○.md の Step○のフィードバックして`,
      },
      {
        type: "steps",
        items: [
          "リコールで「md エクスポート」or「Claude へ」を押す",
          "新しいチャットを開く",
          "上記合言葉にファイルパスを入れて送信",
          "返ってきたフィードバックをコピー",
          "この画面のテキスト欄に貼り付けて「アップロード」",
        ],
      },
    ],
  },

  notes: {
    title: "🧠 理解メモの書き方・エクスポート",
    blocks: [
      { type: "p", text: "学んだ内容を自分の言葉で思い出して書く「アクティブリコール」のページです。" },
      {
        type: "steps",
        items: [
          "解説は隠したまま、まず思い出して2つの欄に記入",
          "思い出せないときだけ「解説を見る」で確認",
          "「md エクスポート」で理解メモを md 保存＋Storage 連携",
          "「Claude へ」で理解メモをコピーしマシュに添削を依頼",
          "もらったフィードバックは次の画面で貼り付け",
        ],
      },
    ],
  },

  english: {
    title: "🛡️ Mash's English Class — Guide",
    lang: "en",
    blocks: [
      { type: "h", text: "Get a lesson (passphrase)" },
      {
        type: "phrase",
        text: `Please read these two files.
- RayshiftAcademy/00_起動プロンプト.md
- 00_Important/03_Claudeプロフ.md

MODE D: English lesson please`,
      },
      {
        type: "steps",
        items: [
          "Open a new chat and send the passphrase above",
          "Have your lesson with Mash",
          "Export the lesson as a .md file when you finish",
        ],
      },
      { type: "h", text: "Import" },
      {
        type: "steps",
        items: [
          "Tap “Import Lesson(s)”",
          "Use “Import folder” for a whole folder, or “Choose .md file(s)”",
          "You can also paste the markdown directly",
        ],
      },
      { type: "h", text: "Phrase Bank" },
      {
        type: "steps",
        items: [
          "Open a lesson and select any text",
          "Tap the “Add to Phrase Bank” popup that appears",
          "Saved phrases link back to their source lesson",
          "“Mash's Daily Expression” shows a random saved phrase",
        ],
      },
    ],
  },

  tips: {
    title: "🎨 デザイン講座 Tips の登録",
    blocks: [
      {
        type: "steps",
        items: [
          "「＋ Tips を追加」を押す",
          "タイトルを入力",
          "画像を複数選択（端末から）",
          "⭐ ボタンでサムネイルを選び、ドラッグ＆ズームでクロップ調整",
          "カテゴリを複数選択し、メモを記入",
          "「保存」で登録（画像は Storage に保存）",
        ],
      },
      { type: "p", text: "カードの画像をタップすると全画面表示。カテゴリチップで絞り込みできます。" },
    ],
  },
};

/**
 * 「？」ボタン要素を生成して返す。
 * @param {string} topic TOPICS のキー
 * @param {object} opts { label?: string }
 */
export function createHelpButton(topic, opts = {}) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "help-btn-inline";
  btn.setAttribute("aria-label", "使い方");
  btn.textContent = opts.label || "？";
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    openHelpModal(topic);
  });
  return btn;
}

export function openHelpModal(topic = "overview") {
  if (document.getElementById("help-overlay")) return;
  const data = TOPICS[topic] || TOPICS.overview;

  const overlay = document.createElement("div");
  overlay.id = "help-overlay";
  overlay.className = "form-overlay";
  overlay.innerHTML = `
    <div class="form-modal card help-modal"${data.lang ? ` lang="${data.lang}"` : ""}>
      <div class="help-head">
        <h2 class="section-title" style="margin:0">${escapeText(data.title)}</h2>
        <button class="chat-close" id="help-close" aria-label="close">✕</button>
      </div>
      <div class="help-body">${data.blocks.map(renderBlock).join("")}</div>
      <div class="form-actions">
        <button class="btn btn-primary" id="help-ok">${
          data.lang === "en" ? "Close" : "閉じる"
        }</button>
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
        await navigator.clipboard.writeText(pre.dataset.raw);
        toast(data.lang === "en" ? "Copied" : "合言葉をコピーしました", "success");
      } catch {
        toast(
          data.lang === "en" ? "Copy failed" : "コピーできませんでした",
          "warn"
        );
      }
    });
  });
}

function renderBlock(b) {
  if (b.type === "h") return `<h3 class="help-title">${escapeText(b.text)}</h3>`;
  if (b.type === "p") return `<p class="help-p">${escapeText(b.text)}</p>`;
  if (b.type === "phrase") {
    return `<pre class="help-phrase" data-raw="${escapeAttr(
      b.text
    )}" title="click to copy">${escapeText(b.text)}</pre>`;
  }
  if (b.type === "steps") {
    return `<ol class="help-steps">${b.items
      .map((s) => `<li>${escapeText(s)}</li>`)
      .join("")}</ol>`;
  }
  return "";
}

function escapeText(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
function escapeAttr(str) {
  return escapeText(str).replace(/"/g, "&quot;");
}
