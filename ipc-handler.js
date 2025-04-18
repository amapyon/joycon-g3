// ipc-handler.js
// IPCイベントのハンドリングを担当するモジュール

const { ipcMain, screen } = require('electron');
// WindowManagerモジュールをインポートして、ウィンドウ操作を行う
const WindowManager = require('./window-manager');

/**
 * IPCイベントリスナーをセットアップする関数
 * アプリケーション起動時に main.js から呼び出される
 * @param {object} windowManagerInstance - WindowManager のインスタンス (依存性の注入)
 */
function setupIpcHandlers(windowManagerInstance = WindowManager) {
    console.log("Setting up IPC Handlers...");

    // --- メインウィンドウ (main-renderer.js) からの指示を受信 ---

    /**
     * カーソルウィンドウ起動指示 ('launch-cursor-window')
     * メインウィンドウでディスプレイが選択され、起動ボタンが押されたときに送信される
     * @param {Electron.IpcMainEvent} event - IPCイベントオブジェクト
     * @param {string | number} displayId - 起動対象のディスプレイID
     */
    ipcMain.on('launch-cursor-window', (event, displayId) => {
        console.log(`IPC Handler: Received 'launch-cursor-window' for display ID: ${displayId}`);
        try {
            const targetId = parseInt(displayId, 10); // IDを数値に変換
            if (isNaN(targetId)) {
                throw new Error(`Invalid display ID received: ${displayId}`);
            }

            // screenモジュールを使ってディスプレイ情報を取得
            const displays = screen.getAllDisplays();
            if (!displays) {
                throw new Error("Screen API unavailable or returned invalid display list.");
            }
            const selectedDisplay = displays.find(d => d.id === targetId);

            if (selectedDisplay) {
                // WindowManager経由でカーソルウィンドウを作成
                console.log(`IPC Handler: Calling WindowManager.createCursorWindow for display ${targetId}`);
                windowManagerInstance.createCursorWindow(selectedDisplay);
            } else {
                // 指定されたIDのディスプレイが見つからない場合
                console.error(`IPC Handler: Display with ID ${targetId} not found.`);
                // WindowManager経由でエラーをメインウィンドウに通知
                windowManagerInstance.sendLaunchErrorToMain(`Display ${targetId} not found.`);
            }
        } catch (e) {
            // その他の予期せぬエラー
            console.error("IPC launch-cursor-window error:", e);
            // WindowManager経由でエラーをメインウィンドウに通知
            windowManagerInstance.sendLaunchErrorToMain(`Launch Error: ${e.message}`);
        }
    });

    /**
     * カーソルウィンドウ終了指示 ('close-cursor-window')
     * メインウィンドウの「Close Cursor Window」ボタンが押されたときに送信される
     */
    ipcMain.on('close-cursor-window', () => {
        console.log("IPC Handler: Received 'close-cursor-window' request.");
        // WindowManager経由でカーソルウィンドウの参照を取得
        const windowToClose = windowManagerInstance.getCursorWindow();
        if (windowToClose && !windowToClose.isDestroyed()) {
            console.log("IPC Handler: Closing cursor window.");
            windowToClose.close(); // ウィンドウを閉じる
            // 'closed' イベントは window-manager.js 内のリスナーで処理され、
            // メインウィンドウへの通知 ('cursor-window-closed') が行われる
        } else {
            console.log("IPC Handler: Cursor window already closed or not found.");
            // 必要ならメインウィンドウに「既に閉じている」ことを通知しても良い
            // windowManagerInstance.sendLaunchErrorToMain('Cursor window is already closed.');
             // メインウィンドウのUI状態をリセットするために通知だけ送る
             const mainWin = windowManagerInstance.getMainWindow();
             if (mainWin && !mainWin.isDestroyed()){
                mainWin.webContents.send('cursor-window-closed');
             }
        }
    });

    // 他にメインプロセスがレンダラーから受け取る必要のある指示があれば、
    // ここに ipcMain.on(...) を追加します。
    // 例: 設定の保存、Joy-Con感度の変更指示など

    console.log("IPC Handlers setup complete.");
}

// セットアップ関数をエクスポート
module.exports = {
    setupIpcHandlers
};
