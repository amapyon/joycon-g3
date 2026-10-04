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
- 音設定では参照先サンプルと同様に `chime` / `gong` を組み込み音として扱います。
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

## ポインターの引っかかり・一瞬の非表示を測定する

詳細な測定手順、JSON の仕様、修正前後の実機確認結果は
[ポインター検証ガイド](./docs/pointer-validation.md#引っかかり一瞬の非表示の検証)を参照してください。

姿勢・操作検証モードの JSON（`schemaVersion: 2`）には、センサー値に加えて
`runtimeEvents` が含まれます。通常動作を変えず、検証モードが有効な間だけ測定します。

1. アプリを終了して最新ビルドで再起動してください。開発版は `npm start`、配布版は
   `npm run package-win` の完了後に生成先の実行ファイルを起動します。
2. R を接続し、補正方式は重力基準、速度は `0.05`、Deadzone はまず `30` にします。
   ボタンを離して通常の向きで静止させ、キャリブレーション完了を待ちます。
   測定中はキャリブレーションしません。
3. 検証モードを有効にし、対象 R・通常持ちを選びます。操作ラベルで該当するものが
   ない場合は「メモ」に「静止」または「水平に左右往復」と記載してください。
4. X ボタンを押し続けて表示し、画面端から離れた場所にポインターを置きます。
   「記録開始」を押すと準備 2 秒、記録 5 秒です。最初は静止を記録して JSON を保存します。
5. 同じ設定で再度記録し、準備終了後からゆっくり左右に往復してください。
   振る角度を画面上の距離に合わせる必要はありません。画面端へ当たらない小さな範囲で
   振り、X は記録終了まで離さないでください。
6. JSON を毎回保存します。症状が出たか、記録開始からおよそ何秒後かをメモに残して
   共有してください。発生しなければ左右往復を数回取り直します。
7. Deadzone の影響を比較する場合だけ、同じ動作を `70` でも記録します。
   他の設定は変えず、静止時の揺れと動き始めの停止感も比較してください。

測定イベントの意味：

- `device-scan`: `timestampMs` は探索開始時刻、`durationMs` は処理全体、
  `discoveryDurationMs` は非同期デバイス列挙の経過時間、`batteryDurationMs` は電池情報要求の
  同期処理時間です。電池の応答待ち時間ではありません。単位はすべて ms です。
  `discoverySkipped: true` は接続・再接続が不要なため列挙を省略したことを示し、
  その場合の `discoveryDurationMs` は 0 です。非同期列挙の経過時間だけでは
  メイン処理が停止していたとは判断できないため、位置更新間隔と併せて比較します。
- `button`: 表示用ボタンの押下状態が変わった時刻と `pressed`。
- `visibility`: アプリが受け取った表示・非表示の通知と `visible`。
- `render`: 約 250 ms ごとの描画測定。`maxFrameIntervalMs` は最大描画間隔、
  `maxUpdateIntervalMs` は最大位置更新受信間隔、`lastUpdateAgeMs` は最後の受信からの
  経過時間（未受信は null）。`visible`、`documentHidden`、`cssVisibility` と描画座標も記録します。

イベントは次のセンサーサンプルと一緒に転送するため、記録の先頭には直前のイベントが
含まれることがあります。また、記録終了直前の未転送イベントは含まれないことがあります。
`timestampMs` で発生順を比較してください。探索イベントがなければ再記録してください。
この測定だけで OS の画面合成や Bluetooth 側の停止まで断定はできません。

定期探索は、未接続・接続処理中でない・自動接続が有効な Joy-Con がある場合だけ実行します。
両方が接続済みの場合は電池情報更新だけを続けます。R のみ接続し L の自動接続が有効な
場合は、L を検出するための非同期探索が続きます。手動の接続要求も非同期で処理します。
OS によるデバイス列挙は非同期でも Bluetooth 通信へ影響する可能性があるため、
改善確認では同じ設定で左右往復を複数回記録し、位置更新間隔と症状の有無を比較してください。
あわせて切断後の自動再接続と、手動の接続操作が正常に動くか確認してください。

## ⚠️ 注意事項
*   **Windows 専用**: `winax` (ActiveX/COM) を使用しているため、PowerPoint 連携機能は Windows 環境でのみ動作します。
*   **再ビルド**: Electron のバージョンを変更した場合や、Node.js の環境が変わった場合は必ず `npm run rebuild` を実行してください。

