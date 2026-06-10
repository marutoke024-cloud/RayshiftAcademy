// =====================================================================
// マシュチャット小窓（全ページ右下に常駐）
// ---------------------------------------------------------------------
// 仕様:
//   - アイコンボタン 70〜80px・shadow 付き（通常アイコンをランダム表示）
//   - LINE ライクな UI・マシュ紫系で統一
//   - Firestore キーワード検索ベース（Claude API 不使用）
//   - 検索対象: カリキュラム / Tips / 英語レッスン / Phrase Bank
//   - ヒットあり / 複数ヒット / ヒットなしで返答をランダム表示
//   - ヒットなし時のみ mash_icon_sad.png を表示
// =====================================================================

import { navigate } from "../app.js";
import { escapeHtml } from "../utils.js";
import { searchAll } from "../services/search.js";
import {
  mashIconUrl,
  mashSadUrl,
  iconOnerrorAttr,
  applyMashIcon,
} from "../lib/mashIcon.js";

const REPLY_HIT = [
  "見つけましたよ、先輩！",
  "これのことですか？",
  "こちらに記録がありました！",
  "お任せください、先輩！",
  "ありました！すぐお持ちします！",
  "先輩のこと、ちゃんと覚えてますよ！",
  "わかりました、こちらです！",
  "探してきました、先輩！",
];
const REPLY_MULTI = [
  (n) => `${n}件見つかりました！`,
  (n) => `いくつか候補があります、先輩！`,
  (n) => `${n}件ありましたよ、どれですか？`,
  (n) => `たくさんありました！絞り込みますか？`,
];
const REPLY_NONE = [
  "うーん、見当たりませんでした…",
  "まだ学習していないかもしれません！",
  "記録がないみたいです、先輩…",
  "新しいカリキュラムで学んでみましょう！",
  "ごめんなさい、見つけられませんでした…",
  "それはまだ未開拓ですね、先輩！",
  "一緒に学びに行きましょう、先輩！",
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

let root; // ウィジェットのルート要素

/** ウィジェットを body に 1 度だけ設置 */
export function mountChatWidget() {
  if (document.getElementById("mash-chat")) return;

  root = document.createElement("div");
  root.id = "mash-chat";
  root.innerHTML = `
    <button class="chat-fab" id="chat-fab" aria-label="マシュに聞く">
      <img class="chat-fab-icon" src="${mashIconUrl()}" alt="マシュ"
        onerror="${iconOnerrorAttr()}" />
    </button>
    <div class="chat-panel" id="chat-panel" hidden>
      <div class="chat-header">
        <div class="chat-head-text">
          <strong>マシュ</strong>
          <span>記録から探します</span>
        </div>
        <button class="chat-close" id="chat-close" aria-label="閉じる">✕</button>
      </div>
      <div class="chat-log" id="chat-log"></div>
      <form class="chat-input" id="chat-form">
        <input type="text" id="chat-text" placeholder="キーワードで検索（例: 配列）"
          autocomplete="off" />
        <button type="submit" class="chat-send">送信</button>
      </form>
    </div>
  `;
  document.body.appendChild(root);

  const fab = root.querySelector("#chat-fab");
  const panel = root.querySelector("#chat-panel");
  const log = root.querySelector("#chat-log");

  const open = () => {
    panel.hidden = false;
    fab.classList.add("is-open");
    if (!log.childElementCount) {
      addMash(
        "こんにちは、先輩！ 探したいキーワードを入力してください。カリキュラム・Tips・英語レッスン・フレーズから探します！"
      );
    }
    root.querySelector("#chat-text").focus();
  };
  const close = () => {
    panel.hidden = true;
    fab.classList.remove("is-open");
  };

  fab.addEventListener("click", () => (panel.hidden ? open() : close()));
  root.querySelector("#chat-close").addEventListener("click", close);

  root.querySelector("#chat-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = root.querySelector("#chat-text");
    const q = input.value.trim();
    if (!q) return;
    addUser(q);
    input.value = "";
    await runSearch(q);
  });

  // --- メッセージ追加ヘルパー ---
  function addUser(text) {
    const el = document.createElement("div");
    el.className = "chat-msg chat-msg-user";
    el.innerHTML = `<div class="chat-bubble">${escapeHtml(text)}</div>`;
    log.appendChild(el);
    scroll();
  }
  function addMash(text, { sad = false, results = [] } = {}) {
    const el = document.createElement("div");
    el.className = "chat-msg chat-msg-mash";
    const icon = sad ? mashSadUrl() : mashIconUrl();
    el.innerHTML = `
      <img class="chat-msg-icon" src="${icon}" alt="マシュ" onerror="${iconOnerrorAttr()}" />
      <div class="chat-bubble">${escapeHtml(text)}</div>
    `;
    if (results.length) {
      const jumps = document.createElement("div");
      jumps.className = "chat-results";
      results.forEach((r) => {
        const b = document.createElement("button");
        b.className = "chat-result";
        b.innerHTML = `<span class="chat-result-ico">${r.icon}</span>
          <span class="chat-result-main"><b>${escapeHtml(
            r.title
          )}</b><small>${escapeHtml(r.snippet)}</small></span>`;
        b.addEventListener("click", () => {
          close();
          navigate(r.href);
        });
        jumps.appendChild(b);
      });
      el.appendChild(jumps);
    }
    log.appendChild(el);
    scroll();
  }
  function scroll() {
    log.scrollTop = log.scrollHeight;
  }

  async function runSearch(q) {
    const results = await searchAll(q);
    if (results.length === 0) {
      addMash(pick(REPLY_NONE), { sad: true });
    } else if (results.length === 1) {
      addMash(pick(REPLY_HIT), { results });
    } else {
      addMash(pick(REPLY_MULTI)(results.length), {
        results: results.slice(0, 8),
      });
    }
  }
}

/** ルート遷移時にアイコンを現在のページのものへ更新（onerror を再武装して安定表示） */
export function refreshChatWidgetIcon() {
  if (!root) return;
  root.querySelectorAll(".chat-fab-icon").forEach((img) => {
    applyMashIcon(img);
  });
}
