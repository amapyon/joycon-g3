# Joy-Con Multi Cursor & PowerPoint Controller

Joy-Con を使用して Windows 上で複数のマウスカーソル操作や PowerPoint のスライドショー制御を行う Electron アプリケーションです。

## 📁 プロジェクト構成

ソースコードは `src/` 配下に配置され、ビルド時に `dist/` へ出力されます。

### 主要ディレクトリ・ファイル
*   **Main Process** (バックグラウンド処理)
    *   `src/main/main.ts`: アプリケーションのエントリーポイント。ライフサイクル管理、IPC通信の統括。
    *   `src/main/joycon.ts`: Joy-Con (HID) との通信、ジャイロデータの取得処理。
    *   `src/main/imu-processor.ts`: ジャイロ/加速度センサーデータの解析・補正ロジック。
    *   `src/main/window-manager.ts`: ウィンドウの生成・管理（設定画面・カーソルオーバーレイ）。
    *   `src/main/ipc-handler.ts`: Renderer プロセスとの IPC 通信ハンドリング。
    *   `src/main/powerpoint-control.ts`: `winax` を使用した PowerPoint COM 操作。

*   **Renderer Process** (画面表示)
    *   **設定画面 (Main Window)**
        *   `src/renderer/main-window.html`: アプリ起動時の設定UI。
        *   `src/renderer/main-renderer.ts`: UIロジック、設定値の IPC 送信。
    *   **カーソルオーバーレイ (Cursor Window)**
        *   `src/renderer/cursor-window.html`: 画面上に Joy-Con カーソルを描画する透明ウィンドウ。
        *   `src/renderer/cursor-renderer.ts`: カーソルの描画更新処理。

*   **Preload**
    *   `src/preload/preload.ts`: ContextBridge を使用し、Main プロセスの機能を安全に Renderer へ公開。

*   **Assets**
    *   `assets/`: アイコンなどの静的リソース。
    *   `src/renderer/styles/style.css`: 共通スタイルシート。

## 使い方

詳細な操作手順は [USAGE.md](./USAGE.md) を参照してください。

### WiFiタイマー連携
- メイン画面からローカルネットワーク上の WiFi タイマーと連携できます。
- WiFi タイマーの WebAPI 仕様とサンプルプログラムの参照元は `amapyon/led_timer` リポジトリです: `https://github.com/amapyon/led_timer`
- タイマー開始 / 一時停止 / 再開 / 初期秒数変更の同期に対応しています。
- WiFi タイマー設定 UI では、輝度、表示回転、表示色演出、音設定、Wi-Fi プロファイル管理、再起動を行えます。
- 音設定の音色一覧、カスタムアラーム音管理、ライブストリーム再生に対応しています。
- 音設定では sample WebUI と同様に `chime` を `custom_alert.pcm`、`gong` を `toneKind=7` として扱います。
- ライブストリーム再生中は `Pause Stream` / `Resume Stream` でデバイス側の再生を一時停止・再開できます。
- ローカル音声ストリームは、WiFi タイマー本体の標準 WebUI と同系統の送信方式に合わせています。
- メインウィンドウはバックグラウンド時のスロットリングを無効化しており、別アプリを前面にしてもストリーム再生が途切れにくい構成です。
- 表示色演出は `stage1 >= stage2 >= stage3 >= blink` の条件でしきい値と色を設定でき、`Preset: Dramatic` も利用できます。
- Wi-Fi プロファイルは接続、追加、削除に加えて優先順位の移動にも対応しています。
- 設定 UI は `PAD` セクションの次にあり、折りたたみ表示に対応しています。
- API の詳細は上記リポジトリを参照してください。アプリ側の使い方は [USAGE.md](./USAGE.md) の `WiFiタイマー連携` を参照してください。

## 🚀 開発環境セットアップと起動

Node.js (Windows環境推奨) が必要です。ネイティブモジュール (`node-hid`, `winax`) を使用しているため、ビルドツール等の環境依存に注意してください。

### 1. インストール
```powershell
npm install
```
※ ネイティブモジュールでエラーが出る場合は `npm run rebuild` を実行してください。

### 2. 開発モードでの起動
TypeScript のコンパイルと Electron の起動を行います。

**ターミナル A (コンパイル監視):**
```powershell
npm run watch
```
**ターミナル B (アプリ起動):**
```powershell
npm start
```

## 📜 主要スクリプト (npm scripts)

| コマンド | 説明 |
| --- | --- |
| `npm run build` | TypeScript をコンパイルし、HTML/CSS を `dist/` へコピーします。 |
| `npm run copy-renderer` | HTML/CSS を `dist/` へコピーします。 |
| `npm run watch` | HTML/CSS をコピー後、TypeScript の変更を監視し、自動的に再コンパイルします (`tsc -w`)。 |
| `npm start` | コンパイル済みのファイル (`dist/main/main.js`) を Electron で起動します。 |
| `npm run rebuild` | `electron-rebuild` を使い、`node-hid` や `winax` を現在の Electron バージョンに合わせて再ビルドします。 |
| `npm run package-win` | Windows 用の実行ファイル (`.exe`) をビルド・パッケージングします。 |

## 🤖 CI

GitHub Actions で `push` / `pull_request` 時に以下を実行します。

1. `npm ci`
2. `npm run test`
3. `npm run build`

ワークフロー定義: `.github/workflows/ci.yml`

## 📦 ビルドとパッケージング (配布用)

配布用の `.exe` ファイルを作成する手順です。

1.  **クリーンビルド**
    ```powershell
    npm run build
    ```
2.  **パッケージング**
    ```powershell
    npm run package-win
    ```
    *   完了すると `dist_packager/JoyCon Clicker-win32-x64/` フォルダ内に実行ファイルが生成されます。
    *   配布時はこのフォルダごと配布してください。

## ⚠️ 注意事項
*   **Windows 専用**: `winax` (ActiveX/COM) を使用しているため、PowerPoint 連携機能は Windows 環境でのみ動作します。
*   **再ビルド**: Electron のバージョンを変更した場合や、Node.js の環境が変わった場合は必ず `npm run rebuild` を実行してください。

