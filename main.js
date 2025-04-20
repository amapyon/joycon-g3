// main.js
const { app, BrowserWindow } = require('electron');
const path = require('path');
const JoyConManager = require('./joycon');
const powerpointControl = require('./powerpoint-control');
const WindowManager = require('./window-manager');
const IpcHandler = require('./ipc-handler');
const imuProcessor = require('./imu-processor');

// --- グローバルインスタンス ---
// 各モジュールはシングルトンとしてインスタンス化 (joyconはクラスなのでnewする)
const joyconManager = new JoyConManager(); // スキャン間隔はデフォルト(5s)

// --- Electron アプリケーションライフサイクル ---

app.whenReady().then(() => {
    console.log('App Ready. Initializing modules...');

    // PowerPoint制御モジュール初期化 (接続試行)
    const connected = powerpointControl.connect();
    if (!connected) {
        console.warn('Initial connection to PowerPoint failed. Ensure PowerPoint is running.');
        // 必要ならメインウィンドウに通知 (WindowManager経由)
        // WindowManager.sendLaunchErrorToMain('Failed to connect to PowerPoint.');
    }

    // メインUIウィンドウ作成 (WindowManager経由)
    WindowManager.createWindow();

    // IPCハンドラー設定 (IpcHandler経由, WindowManagerを渡す)
    IpcHandler.setupIpcHandlers(WindowManager);

    // ★did-finish-loadでプレゼンリストも送信★
    // WindowManager.createWindow が BrowserWindow インスタンスを返すように修正が必要かも
    const mainWin = WindowManager.getMainWindow(); // 作成直後に参照取得 (非同期性に注意)
    if (mainWin) {
        mainWin.webContents.on('did-finish-load', () => {
            // プレゼンテーションリスト取得・送信
            if (powerpointControl) {
                // powerpointControl が初期化失敗している可能性も考慮
                try {
                    const presentations = powerpointControl.getOpenPresentations();
                    if (mainWin && !mainWin.isDestroyed()) {
                        mainWin.webContents.send('available-presentations', presentations);
                    }
                } catch (e) {
                    console.error('Error getting/sending presentations on did-finish-load:', e);
                    if (mainWin && !mainWin.isDestroyed()) {
                        mainWin.webContents.send('available-presentations', []);
                        WindowManager.sendLaunchErrorToMain(`PPT List Error: ${e.message}`);
                    }
                }
            }
            // 初期の接続状態送信
            if (joyconManager && mainWin && !mainWin.isDestroyed()) {
                mainWin.webContents.send('joycon-status-update', {
                    leftConnected: !!joyconManager.hidL,
                    rightConnected: !!joyconManager.hidR,
                });
            }
        });
    } else {
        console.error('Failed to get mainWindow reference immediately after creation.');
    }

    // IMUデータ -> SensorFusion -> カーソルウィンドウへ角度送信
    joyconManager.on('imu-data', (data) => {
        imuProcessor.update(data); // 計算はimuProcessorに任せる
    });

    // ★ 角度更新イベントリスナー -> IPC送信 ★
    imuProcessor.on('attitude-update', (attitudeData) => {
        const targetWindow = WindowManager.getCursorWindow();
        if (targetWindow && !targetWindow.isDestroyed()) {
            // ★ IPCチャンネル名は 'joycon-attitude' ★
            targetWindow.webContents.send('joycon-attitude', attitudeData);
        }
    });

    // 接続状態 -> メインウィンドウへ
    joyconManager.on('status-update', (status) => {
        const targetWindow = WindowManager.getMainWindow();
        if (targetWindow && !targetWindow.isDestroyed()) {
            targetWindow.webContents.send('joycon-status-update', status);
        }
    });

    // ボタン状態通知 -> カーソルウィンドウへ
    ['button-x', 'button-down'].forEach((eventName) => {
        joyconManager.on(eventName, (data) => {
            const targetWindow = WindowManager.getCursorWindow();
            if (targetWindow && !targetWindow.isDestroyed()) {
                // ★ IPCチャンネル名は 'joycon-' + eventName ★
                targetWindow.webContents.send(`joycon-${eventName}`, data);
            }
        });
    });

    // ★ X/Downボタン押下瞬間 (リセンター + レンダラーへリセット通知) ★
    joyconManager.on('button-x-pressed', (data) => {
        console.log(`[Main] X Pressed Trigger for ${data.id}. Recenter.`);
        imuProcessor.recenter(data.id);
        const targetWindow = WindowManager.getCursorWindow();
        if (targetWindow && !targetWindow.isDestroyed()) {
            targetWindow.webContents.send('joycon-button-x-pressed', data); // レンダラーのリセットも呼ぶ
        }
    });
    joyconManager.on('button-down-pressed', (data) => {
        console.log(`[Main] Down Pressed Trigger for ${data.id}. Recenter.`);
        imuProcessor.recenter(data.id);
        const targetWindow = WindowManager.getCursorWindow();
        if (targetWindow && !targetWindow.isDestroyed()) {
            targetWindow.webContents.send('joycon-button-down-pressed', data); // レンダラーのリセットも呼ぶ
        }
    });

    // PowerPoint 操作イベント -> powerpointControl のメソッド呼び出し
    joyconManager.on('ppt-next', () => {
        console.log('[Main] Event PPT Next -> Calling powerpointControl.next()');
        powerpointControl.next();
    });
    joyconManager.on('ppt-prev', () => {
        console.log('[Main] Event PPT Prev -> Calling powerpointControl.previous()');
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
            if (!mainWin || mainWin.isDestroyed()) {
                WindowManager.createWindow();
            }
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
    console.log('Quitting...');
    joyconManager.closeAll(); // JoyConManager経由で閉じる (スキャンも停止)
    WindowManager.closeAllWindows(); // 全ウィンドウを閉じる
    console.log('Cleanup finished.');
});
