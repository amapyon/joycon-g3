// main.js
const { app, BrowserWindow } = require('electron'); // screen, ipcMain は他モジュールへ
const path = require('path');
const JoyConManager = require('./joycon');
const powerpointControl = require('./powerpoint-control'); // リネーム後のモジュール
const WindowManager = require('./window-manager');
const IpcHandler = require('./ipc-handler');

// --- グローバルインスタンス ---
// 各モジュールはシングルトンとしてインスタンス化 (joyconはクラスなのでnewする)
const joyconManager = new JoyConManager(); // スキャン間隔はデフォルト(5s)

// --- Electron アプリケーションライフサイクル ---

app.whenReady().then(() => {
    console.log("App Ready. Initializing modules...");

    // PowerPoint制御モジュール初期化 (接続試行)
    // initialize() は connect() に変更、または constructor で行う設計も可
    const connected = powerpointControl.connect();
    if (!connected) {
        console.warn("Initial connection to PowerPoint failed. Ensure PowerPoint is running.");
        // 必要ならメインウィンドウに通知 (WindowManager経由)
        // WindowManager.sendLaunchErrorToMain('Failed to connect to PowerPoint.');
    }

    // メインUIウィンドウ作成 (WindowManager経由)
    WindowManager.createWindow();

    // IPCハンドラー設定 (IpcHandler経由, WindowManagerを渡す)
    IpcHandler.setupIpcHandlers(WindowManager);

    // --- JoyConManager イベントリスナー設定 ---
    // イベントを受け取り、適切な処理を行う
    joyconManager.on('gyro', (data) => {
        const targetWindow = WindowManager.getCursorWindow(); // WindowManagerから参照取得
        if (targetWindow && !targetWindow.isDestroyed()) {
            targetWindow.webContents.send('joycon-gyro', data);
        }
    });
    joyconManager.on('status-update', (status) => {
        const targetWindow = WindowManager.getMainWindow(); // メインウィンドウに通知
        if (targetWindow && !targetWindow.isDestroyed()) {
            targetWindow.webContents.send('joycon-status-update', status);
        }
    });
    // ボタン状態通知イベント -> カーソルウィンドウへ転送
    ['button-x', 'button-down'].forEach(eventName => {
        joyconManager.on(eventName, (data) => {
             const targetWindow = WindowManager.getCursorWindow();
             console.log("[Main] Received 'button-x' event from JoyConManager:", data);
             if (targetWindow && !targetWindow.isDestroyed()) {
                console.log("[Main] Sending 'joycon-button-x' IPC to cursor window."); // 送信前ログ
                 targetWindow.webContents.send(eventName, data);
             }
        });
    });
    // ボタン押下瞬間イベント -> カーソルウィンドウへ転送 (リセット用)
     ['button-sl', 'button-x-pressed', 'button-down-pressed'].forEach(eventName => {
        joyconManager.on(eventName, (data) => {
            console.log([eventName, data]);
            const targetWindow = WindowManager.getCursorWindow();
             if (targetWindow && !targetWindow.isDestroyed()) {
                 targetWindow.webContents.send(eventName, data);
             }
        });
    });
    // PowerPoint 操作イベント -> powerpointControl のメソッド呼び出し
    joyconManager.on('ppt-next', () => {
        console.log("Main: Event PPT Next -> Calling powerpointControl.next()");
        powerpointControl.next();
    });
    joyconManager.on('ppt-prev', () => {
        console.log("Main: Event PPT Prev -> Calling powerpointControl.previous()");
        powerpointControl.previous();
    });
    // --- ここまで ---

    // JoyCon接続と定期スキャンを開始
    joyconManager.startScanningAndConnect(); // 初回接続とスキャン開始

    // macOS用 activate イベント
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            WindowManager.createWindow(); // WindowManager経由
        } else {
            const mainWin = WindowManager.getMainWindow();
            if (!mainWin || mainWin.isDestroyed()) { WindowManager.createWindow(); }
        }
    });

});

// 全ウィンドウクローズ時 (macOS以外でアプリ終了)
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// アプリ終了直前
app.on('will-quit', () => {
    console.log("Quitting...");
    joyconManager.closeAll(); // JoyConManager経由で閉じる (スキャンも停止)
    WindowManager.closeAllWindows(); // 全ウィンドウを閉じる
    console.log("Cleanup finished.");
});
