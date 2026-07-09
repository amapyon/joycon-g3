import { app, BrowserWindow, Display, screen } from 'electron';
import path from 'path';
import { isUsableWindow } from './browser-window-utils';
import {
    createMessageWindow,
    getMessageWindow,
    setMessageAlwaysOnTop,
} from './message-window-manager';
import {
    loadWindowBounds,
    resolveBoundsWithinDisplay,
    saveWindowBounds,
    type WindowBoundsRect,
} from './window-bounds-store';
import { resolveInitialWindowBounds } from './window-bounds-logic';

let mainWindow: BrowserWindow | null = null;
let cursorWindow: BrowserWindow | null = null;
let timerWindow: BrowserWindow | null = null;
let storedTargetDisplay: Display | null = null;
let storedTimerBounds: WindowBoundsRect | null = null;
const minTimerWindowWidth = 150;
const minTimerWindowHeight = 100;
const timerWindowBoundsFileName = 'timer-window-bounds.json';

/**
 * タイマーウィンドウの位置とサイズ保存ファイルパスを取得する。
 * @returns 保存ファイルパス
 */
function getTimerWindowBoundsFilePath(): string {
    return path.join(app.getPath('userData'), timerWindowBoundsFileName);
}

/**
 * タイマーウィンドウの保存済み位置とサイズを読み込む。
 * @returns 保存済みの位置とサイズ
 */
function loadTimerWindowBounds(): WindowBoundsRect | null {
    return loadWindowBounds<WindowBoundsRect>(
        getTimerWindowBoundsFilePath(),
        minTimerWindowWidth,
        minTimerWindowHeight
    );
}

/**
 * タイマーウィンドウの位置とサイズを保存する。
 * @param bounds 保存する位置とサイズ
 */
function saveTimerWindowBounds(bounds: WindowBoundsRect): void {
    storedTimerBounds = bounds;
    saveWindowBounds(getTimerWindowBoundsFilePath(), bounds);
}

/**
 * メインウィンドウを生成する。
 * @returns メインウィンドウ
 */
export function createMainWindow(): BrowserWindow {
    if (isUsableWindow(mainWindow)) {
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
            backgroundThrottling: false,
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
        if (isUsableWindow(cursorWindow)) {
            cursorWindow.close();
        }
        if (isUsableWindow(timerWindow)) {
            timerWindow.close();
        }
        const messageWindow = getMessageWindow();
        if (isUsableWindow(messageWindow)) {
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
    if (!targetDisplay || typeof targetDisplay.id !== 'number') return;
    if (isUsableWindow(cursorWindow)) {
        cursorWindow.close();
    }
    createCursorWindowInternal(targetDisplay);
}

/**
 * カーソル表示ウィンドウの内部生成処理。
 * @param targetDisplay 対象ディスプレイ
 */
function createCursorWindowInternal(targetDisplay: Display): void {
    const bounds = targetDisplay.bounds;
    const width = Math.max(bounds.width, targetDisplay.size.width);
    const height = Math.max(bounds.height, targetDisplay.size.height);
    const cursorBounds = { x: bounds.x, y: bounds.y, width, height };
    cursorWindow = new BrowserWindow({
        x: cursorBounds.x,
        y: cursorBounds.y,
        width: cursorBounds.width,
        height: cursorBounds.height,
        fullscreen: false,
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
    cursorWindow.once('ready-to-show', () => {
        if (!isUsableWindow(cursorWindow)) return;
        cursorWindow.setBounds(cursorBounds);
        cursorWindow.show();
    });
    cursorWindow.webContents.on('did-finish-load', () => {
        sendCursorWindowOpenedToMain();
    });
    cursorWindow.on('closed', () => {
        cursorWindow = null;
        sendCursorWindowClosedToMain();
    });
    cursorWindow.on('leave-full-screen', () => {
    });
}

/**
 * カーソル表示対象ディスプレイを保存する。
 * @param displayId ディスプレイ ID
 */
export function setTargetDisplay(displayId: number): void {
    const displays = screen.getAllDisplays();
    const target = displays.find((d: Display) => d.id === displayId);
    if (target) {
        storedTargetDisplay = target;
    }
}

/**
 * タイマーウィンドウを生成する。
 * @param targetDisplay 表示先ディスプレイ
 * @returns タイマーウィンドウ
 */
export function createTimerWindow(targetDisplay?: Display): BrowserWindow | null {
    const displayToUse = targetDisplay || storedTargetDisplay || screen.getPrimaryDisplay();

    if (isUsableWindow(timerWindow)) {
        return timerWindow;
    }

    if (!storedTimerBounds) {
        storedTimerBounds = loadTimerWindowBounds();
    }
    const restoredBounds = storedTimerBounds
        ? resolveBoundsWithinDisplay(storedTimerBounds, displayToUse.workArea, minTimerWindowWidth, minTimerWindowHeight)
        : null;
    const initialBounds = resolveInitialWindowBounds(restoredBounds, displayToUse.bounds, 300, 200);

    timerWindow = new BrowserWindow({
        x: initialBounds.x,
        y: initialBounds.y,
        width: initialBounds.width,
        height: initialBounds.height,
        minWidth: minTimerWindowWidth,
        minHeight: minTimerWindowHeight,
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
    timerWindow.show();

    const updateBounds = (): void => {
        if (isUsableWindow(timerWindow)) {
            saveTimerWindowBounds(timerWindow.getBounds());
        }
    };

    timerWindow.on('move', updateBounds);
    timerWindow.on('resize', updateBounds);

    timerWindow.on('closed', () => {
        timerWindow = null;
    });

    return timerWindow;
}

/**
 * タイマーウィンドウを取得する。
 * @returns タイマーウィンドウ
 */
export function getTimerWindow(): BrowserWindow | null {
    if (isUsableWindow(timerWindow)) return timerWindow;
    return null;
}

/**
 * 利用可能なディスプレイ一覧をメインウィンドウへ送信する。
 */
export function sendAvailableDisplays(): void {
    if (!isUsableWindow(mainWindow)) return;
    try {
        const displays = screen.getAllDisplays();
        mainWindow.webContents.send('available-displays', displays);
    } catch {
        sendLaunchErrorToMain('Failed to get display list.');
    }
}

/**
 * カーソルウィンドウの起動完了を通知する。
 */
export function sendCursorWindowOpenedToMain(): void {
    if (isUsableWindow(mainWindow)) {
        mainWindow.webContents.send('cursor-window-opened');
    }
}

/**
 * カーソルウィンドウの終了を通知する。
 */
export function sendCursorWindowClosedToMain(): void {
    if (isUsableWindow(mainWindow)) {
        mainWindow.webContents.send('cursor-window-closed');
    }
}

/**
 * 起動エラーをメインウィンドウへ送信する。
 * @param message エラーメッセージ
 */
export function sendLaunchErrorToMain(message: string): void {
    if (isUsableWindow(mainWindow)) {
        mainWindow.webContents.send('launch-error', message);
    }
}

/**
 * メインウィンドウを取得する。
 * @returns メインウィンドウ
 */
export function getMainWindow(): BrowserWindow | null {
    if (isUsableWindow(mainWindow)) return mainWindow;
    return null;
}

/**
 * カーソルウィンドウを取得する。
 * @returns カーソルウィンドウ
 */
export function getCursorWindow(): BrowserWindow | null {
    if (isUsableWindow(cursorWindow)) return cursorWindow;
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
    if (isUsableWindow(cursorWindow)) {
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
    setMessageAlwaysOnTop,
};
