# 開発メモ

このリポジトリで開発するための最小手順と注意点をまとめています。

## 前提
- Windows 環境推奨 (PowerPoint 連携は Windows 専用)
- Node.js / npm
- ネイティブモジュールをビルドできる環境
  - `node-hid` と `winax` を使用します
  - Visual Studio Build Tools などの C++ ビルド環境が必要な場合があります
- Joy-Con は事前に Windows にペアリングしておくとスムーズです

## セットアップ
初回のみ依存関係をインストールします。
```bash
npm install
```

ビルド環境の不足で失敗した場合は、先に C++ ビルド環境を整えてから再実行してください。

## 開発起動
ターミナルを 2 つ使います。

**ターミナル A (TypeScript 監視):**
```bash
npm run watch
```

**ターミナル B (アプリ起動):**
```bash
npm start
```

HTML/CSS を編集した場合は `npm run copy-renderer` か `npm run build` を再実行してください。

## よくあるトラブル
- ネイティブモジュールのビルドエラーが出る場合
  ```bash
  npm run rebuild
  ```
- Electron のバージョンを変更した場合も `npm run rebuild` を実行してください
- `npm start` が `dist/main/main.js` を見つけられない場合
  - `npm run build` か `npm run watch` を先に実行してください
- PowerPoint 連携が効かない場合
  - Windows 上で PowerPoint がインストールされているか確認してください
  - すでに PowerPoint が起動中の場合は再起動すると改善することがあります
- Joy-Con が反応しない場合
  - Windows の Bluetooth 設定から一度削除して再ペアリングしてください

## 主要ファイル
- Main Process
  - `src/main/main.ts`: エントリーポイント
  - `src/main/joycon.ts`: Joy-Con 通信
  - `src/main/imu-processor.ts`: センサー処理
  - `src/main/window-manager.ts`: ウィンドウ管理
  - `src/main/ipc-handler.ts`: IPC
  - `src/main/powerpoint-control.ts`: PowerPoint 操作
- Renderer Process
  - `src/renderer/main-window.html` / `src/renderer/main-renderer.ts`: 設定画面
  - `src/renderer/cursor-window.html` / `src/renderer/cursor-renderer.ts`: カーソル表示
- Preload
  - `src/preload/preload.ts`

## ディレクトリ構造
一般的な Electron + TypeScript の構成に合わせたディレクトリ構造です。

```
.
├─ assets/             # アイコンなどの静的リソース
├─ dist/               # ビルド出力 (TypeScript コンパイル結果)
├─ dist_packager/      # 配布用パッケージ出力
├─ media/              # 画像・動画などの素材
├─ src/
│  ├─ main/            # Main Process
│  ├─ renderer/        # Renderer Process (HTML/TS)
│  │  └─ styles/       # Renderer 用スタイル
│  └─ preload/         # Preload
├─ package.json        # npm scripts / 依存関係
└─ tsconfig.json       # TypeScript 設定
```

`node_modules/` は依存関係のため省略しています。

## ビルド
```bash
npm run build
```

## 動作確認
1) ビルド
```bash
npm run build
```

2) アプリ起動
```bash
npm start
```

必要に応じて PowerPoint を起動した状態で挙動を確認してください。

## 単体テスト
```bash
npm run test
```

## 作業後の必須手順
- コード変更後は必ず `npm run build` を実行して `dist/` に反映する

## watch の出力
- `npm run watch` は `dist/` に出力します
- `npm start` は `dist/main/main.js` を起動します

## パッケージング (Windows)
```bash
npm run package-win
```

出力先: `dist_packager/JoyCon Clicker-win32-x64/`
