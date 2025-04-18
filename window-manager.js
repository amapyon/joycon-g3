// window-manager.js
// メインウィンドウとカーソルウィンドウの生成・管理を担当するモジュール

const { BrowserWindow, screen } = require('electron');
const path = require('path');

// このモジュール内でウィンドウの参照を管理する
let mainWindow = null;
let cursorWindow = null;

/**
 * メインUIウィンドウを作成し表示する関数
 * 既に存在する場合はフォーカスする
 */
function createWindow() {
    if (mainWindow && !mainWindow.isDestroyed()) {
        console.log("[WindowManager] Main window already exists. Focusing.");
        mainWindow.focus();
        return mainWindow; // 既存のウィンドウ参照を返す
    }
    console.log("[WindowManager] Creating main window...");
    mainWindow = new BrowserWindow({
        width: 500,
        height: 400, // ステータス表示用に高さを確保
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'), // preloadスクリプト指定
            contextIsolation: true,
            nodeIntegration: false,
        }
    });

    mainWindow.loadFile(path.join(__dirname, 'main-window.html')); // メインUI用HTML

    // ウィンドウ読み込み完了後にディスプレイリストを送信
    mainWindow.webContents.on('did-finish-load', () => {
        console.log("[WindowManager] Main window loaded. Getting display list...");
        sendAvailableDisplays(); // ディスプレイリストを送信
        // 接続状態は main.js 側で joyconManager のイベントを監視して送信する
    });

    // ウィンドウが閉じられたときの処理
    mainWindow.on('closed', () => {
        console.log("[WindowManager] Main window closed.");
        mainWindow = null; // 参照を破棄
        // メインウィンドウが閉じられたらカーソルウィンドウも閉じる
        if (cursorWindow && !cursorWindow.isDestroyed()) {
            console.log("[WindowManager] Closing cursor window because main window closed.");
            cursorWindow.close();
        }
        // macOS以外ではアプリ終了 (これはappのイベントで処理される)
    });

    mainWindow.webContents.openDevTools(); // デバッグ用
    return mainWindow; // 作成したウィンドウ参照を返す
}

/**
 * カーソル表示用ウィンドウを指定ディスプレイでフルスクリーン作成する関数
 * 既存のカーソルウィンドウがあれば閉じてから作成する
 * @param {Electron.Display} targetDisplay - 表示対象のディスプレイオブジェクト
 */
function createCursorWindow(targetDisplay) {
    if (!targetDisplay || typeof targetDisplay.id !== 'number') { // targetDisplayが有効かチェック
        console.error("[WindowManager] Target display is invalid or not specified.");
        sendLaunchErrorToMain('Target display is invalid.'); // メインウィンドウにエラー通知
        return;
    }
    // 既存のカーソルウィンドウがあれば閉じる (非同期処理に注意)
    if (cursorWindow && !cursorWindow.isDestroyed()) {
        console.log("[WindowManager] Closing existing cursor window before opening new one...");
        // closed イベントで mainWindow への通知が行われる
        // closed イベントを待たずに新しいウィンドウを開くと問題が起きる可能性があるため、
        // 少し待機時間を設けるか、closed イベント後に生成するのがより安全
        cursorWindow.once('closed', () => {
             // 閉じた後に新しいウィンドウを生成
             createCursorWindowInternal(targetDisplay);
        });
        cursorWindow.close();
    } else {
        // 既存ウィンドウがなければすぐに生成
        createCursorWindowInternal(targetDisplay);
    }
}

/**
 * createCursorWindow の内部実装 (ウィンドウオブジェクトの生成と設定)
 * @param {Electron.Display} targetDisplay - 表示対象のディスプレイオブジェクト
 */
function createCursorWindowInternal(targetDisplay) {
    console.log(`[WindowManager] Creating cursor window internally on display ${targetDisplay.id}...`);
    cursorWindow = new BrowserWindow({
        x: targetDisplay.bounds.x, y: targetDisplay.bounds.y,
        width: targetDisplay.bounds.width, height: targetDisplay.bounds.height,
        fullscreen: true, // フルスクリーン
        frame: false,     // フレームなし
        resizable: false,
        movable: false,
        alwaysOnTop: true, // 最前面
        skipTaskbar: true, // タスクバーに表示しない
        transparent: true, // 背景透過有効化 (CSSでrgba指定が必要)
        hasShadow: false,  // 影なし
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'), // preload指定
            contextIsolation: true,
            nodeIntegration: false,
            backgroundThrottling: false // 非アクティブでも動作
        }
    });

    cursorWindow.loadFile(path.join(__dirname, 'cursor-window.html')); // カーソル用HTML

    cursorWindow.webContents.on('did-finish-load', () => {
        console.log("[WindowManager] Cursor window loaded.");
        // 接続状態は main.js で監視して送信
    });

    cursorWindow.on('closed', () => {
        cursorWindow = null; // 参照解除
        console.log("[WindowManager] Cursor window closed event.");
        // メインウィンドウに通知を送る
        sendCursorWindowClosedToMain();
    });

    // フルスクリーン解除で閉じる
    cursorWindow.on('leave-full-screen', () => {
        console.log("[WindowManager] Cursor window left full screen. Closing.");
        if (cursorWindow && !cursorWindow.isDestroyed()) {
            cursorWindow.close();
        }
    });

    // デバッグ用DevTools (別ウィンドウで開く)
    cursorWindow.webContents.openDevTools({ mode: 'detach' });
}

/** 利用可能なディスプレイリストをメインウィンドウに送信 */
function sendAvailableDisplays() {
    if (!mainWindow || mainWindow.isDestroyed()) {
        console.warn("[WindowManager] Cannot send display list: Main window not available.");
        return;
    }
     try {
        const displays = screen.getAllDisplays();
        // screen APIが利用できない場合のフォールバック
        if (!displays || !screen.getPrimaryDisplay) { throw new Error("Screen API unavailable."); }
        const primaryDisplayId = screen.getPrimaryDisplay().id;
        const displayInfoList = displays.map(d => ({
            id: d.id,
            label: `Display ${d.id} (${d.bounds.width}x${d.bounds.height}) ${d.id === primaryDisplayId ? '[Primary]' : ''}`,
            bounds: d.bounds,
            isPrimary: d.id === primaryDisplayId
        }));
        console.log(`[WindowManager] Found ${displayInfoList.length} displays. Sending list to main window.`);
        mainWindow.webContents.send('available-displays', displayInfoList);
    } catch(e) {
        console.error("[WindowManager] Error getting/sending display list:", e);
        sendLaunchErrorToMain(`Error getting displays: ${e.message}`); // エラー通知
        if (mainWindow && !mainWindow.isDestroyed()) {
             mainWindow.webContents.send('available-displays', []); // 空リストを送る
        }
    }
}

/** カーソルウィンドウが閉じたことをメインウィンドウに通知 */
function sendCursorWindowClosedToMain() {
    if (mainWindow && !mainWindow.isDestroyed()) {
        console.log("[WindowManager] Sending 'cursor-window-closed' to main window.");
        mainWindow.webContents.send('cursor-window-closed');
    } else {
         console.log("[WindowManager] Main window not available to send close notification.");
    }
}

/** 起動エラーをメインウィンドウに通知 */
function sendLaunchErrorToMain(message) {
     if (mainWindow && !mainWindow.isDestroyed()) {
        console.log(`[WindowManager] Sending launch error to main window: ${message}`);
        mainWindow.webContents.send('launch-error', message);
     } else {
          console.warn(`[WindowManager] Main window not available to send launch error: ${message}`);
     }
}

/** メインウィンドウの参照を取得 */
function getMainWindow() {
    // 存在し、破棄されていないウィンドウのみ返す
    if (mainWindow && !mainWindow.isDestroyed()) {
        return mainWindow;
    }
    return null;
}

/** カーソルウィンドウの参照を取得 */
function getCursorWindow() {
     // 存在し、破棄されていないウィンドウのみ返す
    if (cursorWindow && !cursorWindow.isDestroyed()) {
        return cursorWindow;
    }
    return null;
}

/** 管理している全てのウィンドウを閉じる (アプリ終了時用) */
function closeAllWindows() {
    console.log("[WindowManager] Closing all windows...");
    const mainWin = getMainWindow();
    const cursorWin = getCursorWindow();
    // 順番に閉じる (依存関係がある場合などを考慮)
    if (cursorWin) {
        cursorWin.close();
    }
    if (mainWin) {
        mainWin.close();
    }
}


// --- モジュールとして関数を公開 ---
module.exports = {
    createWindow,              // メインウィンドウを作成
    createCursorWindow,        // カーソルウィンドウを作成 (外部から呼ぶ用)
    // createCursorWindowInternal, // 内部実装は公開しない
    sendAvailableDisplays,     // ディスプレイリスト送信 (必要なら外部から呼ぶ)
    sendLaunchErrorToMain,     // エラー通知 (必要なら外部から呼ぶ)
    getMainWindow,             // メインウィンドウ参照取得
    getCursorWindow,           // カーソルウィンドウ参照取得
    closeAllWindows            // 全ウィンドウを閉じる
};
