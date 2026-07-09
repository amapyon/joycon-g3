// window-manager.ts
import { app, BrowserWindow, screen, Display } from 'electron';
import fs from 'fs';
import path from 'path';
import { resolveInitialWindowBounds } from './window-bounds-logic';
import { isUsableWindow } from './browser-window-utils';
import type { MessageWindowBounds } from '../shared/main-renderer-types';

let mainWindow: BrowserWindow | null = null;
let cursorWindow: BrowserWindow | null = null;
let timerWindow: BrowserWindow | null = null;
let messageWindow: BrowserWindow | null = null;
let messageAlwaysOnTop = true;

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
        // Close other windows to ensure app.quit() is triggered via window-all-closed
        if (isUsableWindow(cursorWindow)) {
            cursorWindow.close();
        }
        if (isUsableWindow(timerWindow)) {
            timerWindow.close();
        }
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
    // console.log(`[WindowManager] createCursorWindow called for display ID: ${targetDisplay.id}`); // 追加ログ
    if (!targetDisplay || typeof targetDisplay.id !== 'number') return;
    if (isUsableWindow(cursorWindow)) {
        // console.log('[WindowManager] Existing cursorWindow found, closing it before creating a new one.'); // 追加ログ
        cursorWindow.close();
    }
    createCursorWindowInternal(targetDisplay);
}

/**
 * カーソル表示ウィンドウの内部生成処理。
 * @param targetDisplay 対象ディスプレイ
 */
function createCursorWindowInternal(targetDisplay: Display): void {
    // console.log(`[WindowManager] createCursorWindowInternal called for display ID: ${targetDisplay.id}`); // 追加ログ
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
        if (!isUsableWindow(cursorWindow)) return;
        cursorWindow.setBounds(cursorBounds);
        cursorWindow.show();
    });
    cursorWindow.webContents.on('did-finish-load', () => {
        sendCursorWindowOpenedToMain();
    });
    cursorWindow.on('closed', () => {
        // console.log('[WindowManager] cursorWindow closed.'); // 追加ログ
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
        // console.log(`[WindowManager] Target display set to: ${target.id}`);
    } else {
        // console.warn(`[WindowManager] Target display ID ${displayId} not found.`);
    }
}

let storedTimerBounds: { x: number, y: number, width: number, height: number } | null = null;

/**
 * タイマーウィンドウを生成する。
 * @param targetDisplay 表示先ディスプレイ
 * @returns タイマーウィンドウ
 */
export function createTimerWindow(targetDisplay?: Display): BrowserWindow | null {
    // console.log('[WindowManager] Creating Timer Window...');
    // Use valid targetDisplay arg, OR storedTargetDisplay, OR primary display
    // (Note: storedTargetDisplay is separate from bounds, we might want to prioritize bounds' display if available, but keeping it simple)
    const displayToUse = targetDisplay || storedTargetDisplay || screen.getPrimaryDisplay();
    
    if (isUsableWindow(timerWindow)) {
        return timerWindow;
    }

    const initialBounds = resolveInitialWindowBounds(storedTimerBounds, displayToUse.bounds, 300, 200);

    timerWindow = new BrowserWindow({
        x: initialBounds.x,
        y: initialBounds.y,
        width: initialBounds.width,
        height: initialBounds.height,
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
        if (isUsableWindow(timerWindow)) {
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

let storedMessageBounds: MessageWindowBounds | null = null;
let messageBoundsSaveTimer: ReturnType<typeof setTimeout> | null = null;
let messageBoundsUnlockTimer: ReturnType<typeof setTimeout> | null = null;
let isMessageBoundsPersistEnabled = false;
const minMessageWindowWidth = 100;
const minMessageWindowHeight = 50;
const minLegacyMessageWindowWidth = 360;
const minLegacyMessageWindowHeight = 150;
const messageWindowBoundsFileName = 'message-window-bounds.json';

/**
 * 指定値を範囲内に収める。
 * @param value 対象値
 * @param min 最小値
 * @param max 最大値
 * @returns 範囲内に収めた値
 */
function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

/**
 * メッセージウィンドウの位置とサイズとして使える値か判定する。
 * @param value 判定対象
 * @returns 利用可能な場合は true
 */
function isMessageWindowBoundsValue(value: unknown): value is MessageWindowBounds {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const bounds = value as MessageWindowBounds;
    return Number.isFinite(bounds.x)
        && Number.isFinite(bounds.y)
        && Number.isFinite(bounds.width)
        && Number.isFinite(bounds.height)
        && bounds.width >= minMessageWindowWidth
        && bounds.height >= minMessageWindowHeight;
}

/**
 * メッセージウィンドウの位置とサイズ保存ファイルパスを取得する。
 * @returns 保存ファイルパス
 */
function getMessageWindowBoundsFilePath(): string {
    return path.join(app.getPath('userData'), messageWindowBoundsFileName);
}

/**
 * Mainプロセス基準のメッセージウィンドウ位置とサイズを読み込む。
 * @returns 保存済みの位置とサイズ
 */
function loadMessageWindowBounds(): MessageWindowBounds | null {
    try {
        const filePath = getMessageWindowBoundsFilePath();
        if (!fs.existsSync(filePath)) {
            return null;
        }
        const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
        if (!isMessageWindowBoundsValue(parsed)) {
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
}

/**
 * Mainプロセス基準のメッセージウィンドウ位置とサイズを保存する。
 * @param bounds 保存する位置とサイズ
 */
function saveMessageWindowBounds(bounds: MessageWindowBounds): void {
    const nextBounds: MessageWindowBounds = {
        ...bounds,
        source: 'main-bounds',
        version: 2,
    };
    storedMessageBounds = nextBounds;
    try {
        const filePath = getMessageWindowBoundsFilePath();
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, JSON.stringify(nextBounds), 'utf8');
    } catch {
        // 保存に失敗してもウィンドウ操作自体は継続する。
    }
}

/**
 * 接続中ディスプレイ内に収まるメッセージウィンドウ境界へ補正する。
 * @param bounds 復元候補の位置とサイズ
 * @returns 接続中ディスプレイ内へ補正した位置とサイズ
 */
function resolveConnectedMessageWindowBounds(bounds: MessageWindowBounds): MessageWindowBounds {
    const display = screen.getDisplayMatching(bounds);
    const displayBounds = display.workArea;
    const width = Math.min(Math.max(Math.round(bounds.width), minMessageWindowWidth), displayBounds.width);
    const height = Math.min(Math.max(Math.round(bounds.height), minMessageWindowHeight), displayBounds.height);
    const maxX = displayBounds.x + displayBounds.width - width;
    const maxY = displayBounds.y + displayBounds.height - height;

    return {
        x: clamp(Math.round(bounds.x), displayBounds.x, Math.max(displayBounds.x, maxX)),
        y: clamp(Math.round(bounds.y), displayBounds.y, Math.max(displayBounds.y, maxY)),
        width,
        height,
    };
}

/**
 * Renderer座標で保存されていた古いメッセージウィンドウ境界をMain座標へ移行する。
 * @param bounds 移行前の位置とサイズ
 * @returns 移行後の位置とサイズ
 */
function migrateLegacyMessageWindowBounds(bounds: MessageWindowBounds): MessageWindowBounds {
    if (bounds.source === 'main-bounds' && bounds.version === 2) {
        return bounds;
    }

    const display = screen.getDisplayMatching(bounds);
    const scaleFactor = Math.max(display.scaleFactor || 1, 1);
    let width = Math.round(bounds.width * scaleFactor);
    let height = Math.round(bounds.height * scaleFactor);

    if (scaleFactor > 1) {
        while (
            (width < minLegacyMessageWindowWidth || height < minLegacyMessageWindowHeight)
            && width * scaleFactor <= display.workArea.width
            && height * scaleFactor <= display.workArea.height
        ) {
            width = Math.round(width * scaleFactor);
            height = Math.round(height * scaleFactor);
        }
    }

    width = Math.max(width, Math.min(minLegacyMessageWindowWidth, display.workArea.width));
    height = Math.max(height, Math.min(minLegacyMessageWindowHeight, display.workArea.height));

    return {
        x: Math.round(bounds.x + (bounds.width - width) / 2),
        y: Math.round(bounds.y + (bounds.height - height) / 2),
        width,
        height,
        source: 'main-bounds',
        version: 2,
    };
}

/**
 * メッセージウィンドウの現在位置とサイズを取得する。
 * @returns 現在の位置とサイズ
 */
function getCurrentMessageWindowBounds(): MessageWindowBounds | null {
    if (!isUsableWindow(messageWindow)) {
        return null;
    }
    const bounds = messageWindow.getBounds();
    return {
        ...bounds,
        source: 'main-bounds',
        version: 2,
    };
}

/**
 * メッセージウィンドウの現在位置とサイズを保存する。
 */
function saveCurrentMessageWindowBounds(): void {
    const bounds = getCurrentMessageWindowBounds();
    if (!bounds) {
        return;
    }
    saveMessageWindowBounds(bounds);
}

/**
 * メッセージウィンドウの位置とサイズ保存を予約する。
 */
function scheduleMessageWindowBoundsSave(): void {
    if (!isMessageBoundsPersistEnabled) {
        return;
    }
    if (messageBoundsSaveTimer) {
        clearTimeout(messageBoundsSaveTimer);
    }
    messageBoundsSaveTimer = setTimeout((): void => {
        messageBoundsSaveTimer = null;
        saveCurrentMessageWindowBounds();
    }, 200);
}

/**
 * メッセージウィンドウの起動直後サイズロックを解除する。
 */
function unlockInitialMessageWindowSize(): void {
    messageBoundsUnlockTimer = null;
    if (!isUsableWindow(messageWindow)) {
        return;
    }
    messageWindow.setMinimumSize(minMessageWindowWidth, minMessageWindowHeight);
    isMessageBoundsPersistEnabled = true;
    saveCurrentMessageWindowBounds();
}

/**
 * メッセージウィンドウを生成する。
 * @param targetDisplay 表示先ディスプレイ
 * @returns メッセージウィンドウ
 */
export function createMessageWindow(targetDisplay?: Display): BrowserWindow | null {
    if (isUsableWindow(messageWindow)) return messageWindow;

    isMessageBoundsPersistEnabled = false;
    if (messageBoundsSaveTimer) {
        clearTimeout(messageBoundsSaveTimer);
        messageBoundsSaveTimer = null;
    }
    if (messageBoundsUnlockTimer) {
        clearTimeout(messageBoundsUnlockTimer);
        messageBoundsUnlockTimer = null;
    }

    const displayToUse = targetDisplay || storedTargetDisplay || screen.getPrimaryDisplay();
    
    if (!storedMessageBounds) {
        storedMessageBounds = loadMessageWindowBounds();
    }
    const restoredBounds = storedMessageBounds
        ? resolveConnectedMessageWindowBounds(migrateLegacyMessageWindowBounds(storedMessageBounds))
        : null;
    const initialBounds = resolveInitialWindowBounds(restoredBounds, displayToUse.bounds, 600, 150);

    messageWindow = new BrowserWindow({
        x: initialBounds.x,
        y: initialBounds.y,
        width: initialBounds.width,
        height: initialBounds.height,
        minWidth: initialBounds.width,
        minHeight: initialBounds.height,
        frame: false,
        transparent: true,
        alwaysOnTop: messageAlwaysOnTop,
        skipTaskbar: true,
        hasShadow: false,
        resizable: true,
        show: false,
        webPreferences: {
            preload: path.join(__dirname, '..', 'preload', 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
        },
    });

    messageWindow.loadFile(path.join(__dirname, '..', 'renderer', 'message-window.html'));

    let hasShownMessageWindow = false;
    const showMessageWindow = (): void => {
        if (!isUsableWindow(messageWindow) || hasShownMessageWindow) {
            return;
        }
        hasShownMessageWindow = true;
        messageWindow.setBounds(initialBounds);
        messageWindow.setMinimumSize(initialBounds.width, initialBounds.height);
        messageWindow.show();
        messageBoundsUnlockTimer = setTimeout(unlockInitialMessageWindowSize, 1500);
    };

    messageWindow.on('move', scheduleMessageWindowBoundsSave);
    messageWindow.on('resize', scheduleMessageWindowBoundsSave);
    messageWindow.on('close', saveCurrentMessageWindowBounds);
    messageWindow.once('ready-to-show', showMessageWindow);
    messageWindow.webContents.once('did-finish-load', showMessageWindow);

    messageWindow.on('closed', () => {
        if (messageBoundsSaveTimer) {
            clearTimeout(messageBoundsSaveTimer);
            messageBoundsSaveTimer = null;
        }
        if (messageBoundsUnlockTimer) {
            clearTimeout(messageBoundsUnlockTimer);
            messageBoundsUnlockTimer = null;
        }
        isMessageBoundsPersistEnabled = false;
        messageWindow = null;
    });

    return messageWindow;
}

/**
 * メッセージウィンドウを取得する。
 * @returns メッセージウィンドウ
 */
export function getMessageWindow(): BrowserWindow | null {
    if (isUsableWindow(messageWindow)) return messageWindow;
    return null;
}

/**
 * メッセージウィンドウの最前面固定を設定する。
 * @param alwaysOnTop 最前面に固定するか
 */
export function setMessageAlwaysOnTop(alwaysOnTop: boolean): void {
    messageAlwaysOnTop = alwaysOnTop;
    if (isUsableWindow(messageWindow)) {
        messageWindow.setAlwaysOnTop(alwaysOnTop);
    }
}

/**
 * メッセージウィンドウの位置とサイズを復元する。
 * @param bounds 復元する位置とサイズ
 */
export function setMessageWindowBounds(bounds: MessageWindowBounds): void {
    const resolvedBounds = resolveConnectedMessageWindowBounds(migrateLegacyMessageWindowBounds(bounds));
    saveMessageWindowBounds({
        ...resolvedBounds,
        source: 'main-bounds',
        version: 2,
    });
    if (isUsableWindow(messageWindow)) {
        messageWindow.setBounds(resolvedBounds);
        saveCurrentMessageWindowBounds();
    }
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
    } catch (e) {
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
        // console.log('[WindowManager] Closing cursor window due to external request.');
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
    setMessageWindowBounds,
};
