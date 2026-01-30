// window-manager.ts
import { app, BrowserWindow, screen, Display } from 'electron';
import path from 'path';

let mainWindow: BrowserWindow | null = null;
let cursorWindow: BrowserWindow | null = null;
let timerWindow: BrowserWindow | null = null;
let messageWindow: BrowserWindow | null = null;

/**
 * メインウィンドウを生成する。
 * @returns メインウィンドウ
 */
export function createMainWindow(): BrowserWindow {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.focus();
        return mainWindow;
    }
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, '..', 'preload', 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
        },
    });
    mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'main-window.html'));
    if (!app.isPackaged) {
        mainWindow.webContents.openDevTools();
    }
    mainWindow.webContents.on('did-finish-load', () => {
        sendAvailableDisplays();
    });
    mainWindow.on('closed', () => {
        mainWindow = null;
        // Close other windows to ensure app.quit() is triggered via window-all-closed
        if (cursorWindow && !cursorWindow.isDestroyed()) {
            cursorWindow.close();
        }
        if (timerWindow && !timerWindow.isDestroyed()) {
            timerWindow.close();
        }
        if (messageWindow && !messageWindow.isDestroyed()) {
            messageWindow.close();
        }
    });
    return mainWindow;
}

/**
 * カーソル表示ウィンドウを生成する。
 * @param targetDisplay 対象ディスプレイ
 */
export function createCursorWindow(targetDisplay: Display): void {
    console.log(`[WindowManager] createCursorWindow called for display ID: ${targetDisplay.id}`); // 追加ログ
    if (!targetDisplay || typeof targetDisplay.id !== 'number') return;
    if (cursorWindow && !cursorWindow.isDestroyed()) {
        console.log('[WindowManager] Existing cursorWindow found, closing it before creating a new one.'); // 追加ログ
        cursorWindow.close();
    }
    createCursorWindowInternal(targetDisplay);
}

/**
 * カーソル表示ウィンドウの内部生成処理。
 * @param targetDisplay 対象ディスプレイ
 */
function createCursorWindowInternal(targetDisplay: Display): void {
    console.log(`[WindowManager] createCursorWindowInternal called for display ID: ${targetDisplay.id}`); // 追加ログ
    const bounds = targetDisplay.bounds;
    const width = Math.max(bounds.width, targetDisplay.size.width);
    const height = Math.max(bounds.height, targetDisplay.size.height);
    const cursorBounds = { x: bounds.x, y: bounds.y, width, height };
    cursorWindow = new BrowserWindow({
        x: cursorBounds.x,
        y: cursorBounds.y,
        width: cursorBounds.width,
        height: cursorBounds.height,
        fullscreen: false, // Changed to false to prevent display capture issues
        frame: false,
        resizable: false,
        movable: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        transparent: true,
        hasShadow: false,
        show: false,
        webPreferences: {
            preload: path.join(__dirname, '..', 'preload', 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            backgroundThrottling: false,
            sandbox: false,
        },
    });
    cursorWindow.setIgnoreMouseEvents(true, { forward: true });
    cursorWindow.setBounds(cursorBounds);
    cursorWindow.loadFile(path.join(__dirname, '..', 'renderer', 'cursor-window.html'));
    // cursorWindow.webContents.openDevTools({ mode: 'detach' });
    cursorWindow.once('ready-to-show', () => {
        if (!cursorWindow || cursorWindow.isDestroyed()) return;
        cursorWindow.setBounds(cursorBounds);
        cursorWindow.show();
    });
    cursorWindow.webContents.on('did-finish-load', () => {
        sendCursorWindowOpenedToMain();
    });
    cursorWindow.on('closed', () => {
        console.log('[WindowManager] cursorWindow closed.'); // 追加ログ
        cursorWindow = null;
        // Do not close timerWindow here to allow independent operation
        sendCursorWindowClosedToMain();
    });
    cursorWindow.on('leave-full-screen', () => {
    });

}

let storedTargetDisplay: Display | null = null;

/**
 * カーソル表示対象ディスプレイを保存する。
 * @param displayId ディスプレイ ID
 */
export function setTargetDisplay(displayId: number): void {
    const displays = screen.getAllDisplays();
    const target = displays.find((d: Display) => d.id === displayId);
    if (target) {
        storedTargetDisplay = target;
        console.log(`[WindowManager] Target display set to: ${target.id}`);
    } else {
        console.warn(`[WindowManager] Target display ID ${displayId} not found.`);
    }
}

let storedTimerBounds: { x: number, y: number, width: number, height: number } | null = null;

/**
 * タイマーウィンドウを生成する。
 * @param targetDisplay 表示先ディスプレイ
 * @returns タイマーウィンドウ
 */
export function createTimerWindow(targetDisplay?: Display): BrowserWindow | null {
    console.log('[WindowManager] Creating Timer Window...');
    // Use valid targetDisplay arg, OR storedTargetDisplay, OR primary display
    // (Note: storedTargetDisplay is separate from bounds, we might want to prioritize bounds' display if available, but keeping it simple)
    const displayToUse = targetDisplay || storedTargetDisplay || screen.getPrimaryDisplay();
    
    if (timerWindow && !timerWindow.isDestroyed()) {
        return timerWindow;
    }

    let initialX: number;
    let initialY: number;
    let initialWidth = 300;
    let initialHeight = 200;

    if (storedTimerBounds) {
        initialX = storedTimerBounds.x;
        initialY = storedTimerBounds.y;
        initialWidth = storedTimerBounds.width;
        initialHeight = storedTimerBounds.height;
    } else {
        // Calculate center position on the display
        initialX = displayToUse.bounds.x + (displayToUse.bounds.width - initialWidth) / 2;
        initialY = displayToUse.bounds.y + (displayToUse.bounds.height - initialHeight) / 2;
    }

    timerWindow = new BrowserWindow({
        x: initialX,
        y: initialY,
        width: initialWidth,
        height: initialHeight,
        minWidth: 150,
        minHeight: 100,
        fullscreen: false,
        frame: false,
        resizable: true,
        movable: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        transparent: true,
        hasShadow: false,
        webPreferences: {
            preload: path.join(__dirname, '..', 'preload', 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            backgroundThrottling: false,
            sandbox: false,
        },
    });

    timerWindow.loadFile(path.join(__dirname, '..', 'renderer', 'timer-window.html'));
    timerWindow.show(); // Show the window immediately after loading
    
    // Uncomment for debugging
    // timerWindow.webContents.openDevTools({ mode: 'detach' });

    const updateBounds = (): void => {
        if (timerWindow && !timerWindow.isDestroyed()) {
            const bounds = timerWindow.getBounds();
            storedTimerBounds = bounds;
        }
    };

    timerWindow.on('move', updateBounds);
    timerWindow.on('resize', updateBounds);

    timerWindow.on('closed', () => {
        timerWindow = null;
    });

    return timerWindow;
}

let storedMessageBounds: { x: number, y: number, width: number, height: number } | null = null;

/**
 * メッセージウィンドウを生成する。
 * @param targetDisplay 表示先ディスプレイ
 * @returns メッセージウィンドウ
 */
export function createMessageWindow(targetDisplay?: Display): BrowserWindow | null {
    if (messageWindow && !messageWindow.isDestroyed()) return messageWindow;
    
    const displayToUse = targetDisplay || storedTargetDisplay || screen.getPrimaryDisplay();
    
    let initialWidth = 600;
    let initialHeight = 150;
    let initialX: number;
    let initialY: number;

    if (storedMessageBounds) {
        initialX = storedMessageBounds.x;
        initialY = storedMessageBounds.y;
        initialWidth = storedMessageBounds.width;
        initialHeight = storedMessageBounds.height;
    } else {
        initialX = displayToUse.bounds.x + (displayToUse.bounds.width - initialWidth) / 2;
        initialY = displayToUse.bounds.y + (displayToUse.bounds.height - initialHeight) / 2;
    }

    messageWindow = new BrowserWindow({
        x: initialX,
        y: initialY,
        width: initialWidth,
        height: initialHeight,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        hasShadow: false,
        resizable: true,
        webPreferences: {
            preload: path.join(__dirname, '..', 'preload', 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
        },
    });

    messageWindow.loadFile(path.join(__dirname, '..', 'renderer', 'message-window.html'));
    messageWindow.show();

    const updateBounds = (): void => {
        if (messageWindow && !messageWindow.isDestroyed()) {
            storedMessageBounds = messageWindow.getBounds();
        }
    };
    messageWindow.on('move', updateBounds);
    messageWindow.on('resize', updateBounds);

    messageWindow.on('closed', () => {
        messageWindow = null;
    });

    return messageWindow;
}

/**
 * メッセージウィンドウを取得する。
 * @returns メッセージウィンドウ
 */
export function getMessageWindow(): BrowserWindow | null {
    if (messageWindow && !messageWindow.isDestroyed()) return messageWindow;
    return null;
}

/**
 * タイマーウィンドウを取得する。
 * @returns タイマーウィンドウ
 */
export function getTimerWindow(): BrowserWindow | null {
    if (timerWindow && !timerWindow.isDestroyed()) return timerWindow;
    return null;
}

/**
 * 利用可能なディスプレイ一覧をメインウィンドウへ送信する。
 */
export function sendAvailableDisplays(): void {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    try {
        const displays = screen.getAllDisplays();
        mainWindow.webContents.send('available-displays', displays);
    } catch (e) {
        sendLaunchErrorToMain('Failed to get display list.');
    }
}

/**
 * カーソルウィンドウの起動完了を通知する。
 */
export function sendCursorWindowOpenedToMain(): void {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('cursor-window-opened');
    }
}

/**
 * カーソルウィンドウの終了を通知する。
 */
export function sendCursorWindowClosedToMain(): void {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('cursor-window-closed');
    }
}

/**
 * 起動エラーをメインウィンドウへ送信する。
 * @param message エラーメッセージ
 */
export function sendLaunchErrorToMain(message: string): void {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('launch-error', message);
    }
}

/**
 * メインウィンドウを取得する。
 * @returns メインウィンドウ
 */
export function getMainWindow(): BrowserWindow | null {
    if (mainWindow && !mainWindow.isDestroyed()) return mainWindow;
    return null;
}

/**
 * カーソルウィンドウを取得する。
 * @returns カーソルウィンドウ
 */
export function getCursorWindow(): BrowserWindow | null {
    if (cursorWindow && !cursorWindow.isDestroyed()) return cursorWindow;
    return null;
}

/**
 * 全てのウィンドウを閉じる。
 */
export function closeAllWindows(): void {
    const mainWin = getMainWindow();
    const cursorWin = getCursorWindow();
    const timerWin = getTimerWindow();
    const msgWin = getMessageWindow();
    if (msgWin) msgWin.close();
    if (timerWin) timerWin.close();
    if (cursorWin) cursorWin.close();
    if (mainWin) mainWin.close();
}

/**
 * カーソルウィンドウを閉じる。
 */
export function closeCursorWindow(): void {
    if (cursorWindow && !cursorWindow.isDestroyed()) {
        console.log('[WindowManager] Closing cursor window due to external request.');
        cursorWindow.close();
    }
}

export default {
    createMainWindow,
    createCursorWindow,
    sendAvailableDisplays,
    sendLaunchErrorToMain,
    getMainWindow,
    getCursorWindow,
    closeAllWindows,
    closeCursorWindow,
    createTimerWindow,
    getTimerWindow,
    setTargetDisplay,
    createMessageWindow,
    getMessageWindow,
};
