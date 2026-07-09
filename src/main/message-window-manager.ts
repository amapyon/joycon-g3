import { app, BrowserWindow, Display, screen } from 'electron';
import path from 'path';
import { isUsableWindow } from './browser-window-utils';
import {
    migrateLegacyMessageWindowBounds,
    type MessageWindowBounds,
} from './message-window-bounds';
import { resolveInitialWindowBounds } from './window-bounds-logic';
import {
    loadWindowBounds,
    resolveBoundsWithinDisplay,
    saveWindowBounds,
    type WindowBoundsRect,
} from './window-bounds-store';

let messageWindow: BrowserWindow | null = null;
let storedMessageBounds: MessageWindowBounds | null = null;
let messageBoundsSaveTimer: ReturnType<typeof setTimeout> | null = null;
let messageBoundsUnlockTimer: ReturnType<typeof setTimeout> | null = null;
let isMessageBoundsPersistEnabled = false;
let messageAlwaysOnTop = true;

const minMessageWindowWidth = 100;
const minMessageWindowHeight = 50;
const messageWindowBoundsFileName = 'message-window-bounds.json';

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
    return loadWindowBounds<MessageWindowBounds>(
        getMessageWindowBoundsFilePath(),
        minMessageWindowWidth,
        minMessageWindowHeight
    );
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
    saveWindowBounds(getMessageWindowBoundsFilePath(), nextBounds);
}

/**
 * 接続中ディスプレイ内に収まるメッセージウィンドウ境界へ補正する。
 * @param bounds 復元候補の位置とサイズ
 * @returns 接続中ディスプレイ内へ補正した位置とサイズ
 */
function resolveConnectedMessageWindowBounds(bounds: MessageWindowBounds): MessageWindowBounds {
    const display = screen.getDisplayMatching(bounds);
    const resolvedBounds = resolveBoundsWithinDisplay(
        bounds,
        display.workArea,
        minMessageWindowWidth,
        minMessageWindowHeight
    );

    return {
        ...resolvedBounds,
        source: 'main-bounds',
        version: 2,
    };
}

/**
 * Renderer座標で保存されていた古いメッセージウィンドウ境界をMain座標へ移行する。
 * @param bounds 移行前の位置とサイズ
 * @returns 移行後の位置とサイズ
 */
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
 * メッセージウィンドウの保存タイマーを破棄する。
 */
function clearMessageWindowTimers(): void {
    if (messageBoundsSaveTimer) {
        clearTimeout(messageBoundsSaveTimer);
        messageBoundsSaveTimer = null;
    }
    if (messageBoundsUnlockTimer) {
        clearTimeout(messageBoundsUnlockTimer);
        messageBoundsUnlockTimer = null;
    }
}

/**
 * メッセージウィンドウの初期位置とサイズを決定する。
 * @param targetDisplay 表示先ディスプレイ
 * @returns 初期位置とサイズ
 */
function resolveMessageWindowInitialBounds(targetDisplay: Display): WindowBoundsRect {
    if (!storedMessageBounds) {
        storedMessageBounds = loadMessageWindowBounds();
    }
    const legacyDisplay = storedMessageBounds ? screen.getDisplayMatching(storedMessageBounds) : null;
    const migratedBounds = storedMessageBounds && legacyDisplay
        ? migrateLegacyMessageWindowBounds(storedMessageBounds, legacyDisplay.workArea, legacyDisplay.scaleFactor)
        : null;
    const restoredBounds = storedMessageBounds
        ? resolveConnectedMessageWindowBounds(migratedBounds || storedMessageBounds)
        : null;
    return resolveInitialWindowBounds(restoredBounds, targetDisplay.bounds, 600, 150);
}

/**
 * メッセージウィンドウを生成する。
 * @param targetDisplay 表示先ディスプレイ
 * @returns メッセージウィンドウ
 */
export function createMessageWindow(targetDisplay: Display): BrowserWindow | null {
    if (isUsableWindow(messageWindow)) return messageWindow;

    isMessageBoundsPersistEnabled = false;
    clearMessageWindowTimers();

    const initialBounds = resolveMessageWindowInitialBounds(targetDisplay);

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
        clearMessageWindowTimers();
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
