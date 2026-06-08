# Rayshift Academy

Obsidian に保存した md カリキュラムをインポートして e-learning 形式で学習し、
マシュ（Claude）とのフィードバックループで理解を深める個人向け学習アプリ。

- **デプロイ先:** GitHub Pages → `https://marutoke024-cloud.github.io/RayshiftAcademy/`
- **技術スタック:** 素の HTML / CSS / JavaScript（ビルド不要）
- **ストレージ:** ブラウザ内 IndexedDB（初期）／ Firebase（任意・後から差し込み可）
- **md パーサー:** marked.js（CDN）

---

## 実装状況

- [x] **Phase 1: 基盤構築**
  - [x] プロジェクト初期化・GitHub Pages 設定・Firebase 設定の枠組み
  - [x] md インポート機能（ドラッグ＆ドロップ、フロントマター解析）
  - [x] カリキュラム一覧画面（トップ画面）
- [x] **Phase 2: 学習フロー**
  - [x] 解説ページ（md 描画・一口メモ UI）
  - [x] リコールページ（理解メモ入力・アクティブリコール制御）
  - [x] md エクスポート（理解メモを md 化して保存＋ダウンロード）
  - [x] フィードバックアップロード・ステップ解錠ロジック（mastery 更新・解錠演出）
- [ ] Phase 3: 復習・モチベーション機能
- [ ] Phase 4: モバイル対応の最適化

> テーマカラーは Microsoft Teams 風（Fluent ライト配色・Teams パープル `#5B5FC7`）。

---

## ローカルでの動かし方

ビルドは不要です。ただし ES Modules を使っているため、`index.html` を
ファイルダブルクリックで開くと CORS 制限で動きません。**簡易サーバー経由**で開いてください。

### 方法A: VS Code の Live Server 拡張（おすすめ）
1. VS Code でこのフォルダを開く
2. 拡張機能「Live Server」をインストール
3. `index.html` を右クリック → 「Open with Live Server」

### 方法B: Python の簡易サーバー（Python が入っている場合）
```powershell
cd "C:\Users\煮込みカプチーノ\OneDrive\ドキュメント\RayshiftAcademy"
python -m http.server 5500
```
ブラウザで http://localhost:5500 を開く。

---

## GitHub Pages へのデプロイ

このプロジェクトはビルド不要なので、リポジトリにファイルを push するだけで公開できます。

1. GitHub で `RayshiftAcademy` リポジトリを作成（アカウント: `marutoke024-cloud`）
2. このフォルダを push:
   ```powershell
   git remote add origin https://github.com/marutoke024-cloud/RayshiftAcademy.git
   git push -u origin main
   ```
3. GitHub のリポジトリ → **Settings → Pages** で
   - **Source:** `Deploy from a branch`
   - **Branch:** `main` / `(root)`
   を選択して保存
4. 数分後に `https://marutoke024-cloud.github.io/RayshiftAcademy/` で公開される

> `.nojekyll` を置いてあるので、フォルダ構成はそのまま配信されます。

---

## Firebase を後から有効にする

初期状態ではブラウザ内の IndexedDB にデータを保存します（ネット不要・即動作）。
Firebase を使いたくなったら:

1. [Firebase コンソール](https://console.firebase.google.com/) でプロジェクトを作成
2. 「ウェブアプリを追加」して表示される `firebaseConfig` をコピー
3. [`js/config/firebase-config.js`](js/config/firebase-config.js) を開き
   - `USE_FIREBASE` を `true` に
   - `firebaseConfig` を自分の値に置き換え
4. Firestore と Storage を有効化

> Firebase の Web API キーは公開されても問題ない種類のキーです（セキュリティは
> Firestore/Storage のルールで担保します）。ただしルール設定は必ず行ってください。

---

## md カリキュラムのフォルダ構成（インポート対象）

```
RayshiftAcademy/                （Obsidian 側のフォルダ）
├── curricula/
│   └── [題材名]/
│       ├── 00_index.md         ← カリキュラム定義（必須）
│       ├── 01_[タイトル].md     ← ステップ1
│       ├── 02_[タイトル].md     ← ステップ2
│       └── ...
└── assets/
    ├── mash_sd.png             ← マシュ SD イラスト（任意）
    └── badges/                 ← バッジ画像（任意）
```

トップ画面の「インポート」エリアに、上記フォルダ（または個別の md / 画像）を
ドラッグ＆ドロップするとカリキュラムが登録されます。
