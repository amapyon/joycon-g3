// main.js
const { app, BrowserWindow } = require('electron');
const path = require('path');
const JoyConManager = require('./joycon');
const powerpointControl = require('./powerpoint-control');
const WindowManager = require('./window-manager');
const IpcHandler = require('./ipc-handler');

// --- グローバルインスタンス ---
// 各モジュールはシングルトンとしてインスタンス化 (joyconはクラスなのでnewする)
const joyconManager = new JoyConManager(); // スキャン間隔はデフォルト(5s)

// ---- ★プレゼンテーションリストをメインウィンドウに送信する関数★ ----
function sendAvailablePresentations() {
    const mainWindow = WindowManager.getMainWindow(); // WindowManagerから取得
    if (mainWindow && !mainWindow.isDestroyed()) {
         console.log("[Main] Getting available presentations...");
         try {
             // powerpointControl モジュールに関数を移譲
             const presentations = powerpointControl.getOpenPresentations();
             console.log(`[Main] Sending ${presentations.length} presentations to main window.`);
             mainWindow.webContents.send('available-presentations', presentations);
         } catch (e) {
             console.error("[Main] Error getting/sending presentations:", e);
             // エラー発生時も空リストを送るなどしてUIを更新
             mainWindow.webContents.send('available-presentations', []);
             // エラー通知も検討
             // WindowManager.sendLaunchErrorToMain(`PPT List Error: ${e.message}`);
         }
    }
}

// --- Electron アプリケーションライフサイクル ---

app.whenReady().then(() => {
    console.log("App Ready. Initializing modules...");

    // PowerPoint制御モジュール初期化 (接続試行)
    const connected = powerpointControl.connect();
    if (!connected) {
        console.warn("Initial connection to PowerPoint failed. Ensure PowerPoint is running.");
        // 必要ならメインウィンドウに通知 (WindowManager経由)
        // WindowManager.sendLaunchErrorToMain('Failed to connect to PowerPoint.');
    }

    // メインUIウィンドウ作成 (WindowManager経由)
    WindowManager.createWindow();

    // ★did-finish-loadでプレゼンリストも送信★
    // WindowManager.createWindow が BrowserWindow インスタンスを返すように修正が必要かも
    const mainWin = WindowManager.getMainWindow(); // 作成直後に参照取得 (非同期性に注意)
    if (mainWin) {
        mainWin.webContents.on('did-finish-load', () => {
            // ディスプレイリスト送信は WindowManager 内で行われる
            // プレゼンテーションリスト送信をここからトリガー
            sendAvailablePresentations();
            // 初期の接続状態も送信
            mainWin.webContents.send('joycon-status-update', {
                 leftConnected: !!joyconManager.hidL,
                 rightConnected: !!joyconManager.hidR
             });
        });
    } else {
         console.error("Failed to get mainWindow reference immediately after creation.");
    }

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
             if (targetWindow && !targetWindow.isDestroyed()) {
                 targetWindow.webContents.send(eventName, data);
             }
        });
    });
    // ボタン押下瞬間イベント -> カーソルウィンドウへ転送 (リセット用)
     ['button-x-pressed', 'button-down-pressed'].forEach(eventName => {
        joyconManager.on(eventName, (data) => {
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
    joyconManager.startScanningAndConnect();

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
