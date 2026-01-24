// window-manager.ts
import { BrowserWindow, screen, Display } from 'electron';
import path from 'path';

let mainWindow: BrowserWindow | null = null;

let cursorWindow: BrowserWindow | null = null;
let timerWindow: BrowserWindow | null = null;

export function createWindow(): BrowserWindow {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.focus();
        return mainWindow;
    }
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });
    mainWindow.loadFile(path.join(__dirname, 'main-window.html'));
    mainWindow.webContents.openDevTools(); // 開発者ツールを開く
    mainWindow.webContents.on('did-finish-load', () => {
        sendAvailableDisplays();
    });
    mainWindow.on('closed', () => {
        mainWindow = null;
        if (cursorWindow && !cursorWindow.isDestroyed()) {
            cursorWindow.close();
        }
    });
    return mainWindow;
}

export function createCursorWindow(targetDisplay: Display) {
    console.log(`[WindowManager] createCursorWindow called for display ID: ${targetDisplay.id}`); // 追加ログ
    if (!targetDisplay || typeof targetDisplay.id !== 'number') return;
    if (cursorWindow && !cursorWindow.isDestroyed()) {
        console.log('[WindowManager] Existing cursorWindow found, closing it before creating a new one.'); // 追加ログ
        cursorWindow.close();
    }
    createCursorWindowInternal(targetDisplay);
}

function createCursorWindowInternal(targetDisplay: Display) {
    console.log(`[WindowManager] createCursorWindowInternal called for display ID: ${targetDisplay.id}`); // 追加ログ
    cursorWindow = new BrowserWindow({
        x: targetDisplay.bounds.x,
        y: targetDisplay.bounds.y,
        width: targetDisplay.bounds.width,
        height: targetDisplay.bounds.height,
        fullscreen: true,
        frame: false,
        resizable: false,
        movable: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        transparent: true,
        hasShadow: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            backgroundThrottling: false,
        },
    });
    cursorWindow.setIgnoreMouseEvents(true, { forward: true });
    cursorWindow.loadFile(path.join(__dirname, 'cursor-window.html'));
    cursorWindow.webContents.openDevTools({ mode: 'detach' });
    cursorWindow.webContents.on('did-finish-load', () => {});
    cursorWindow.on('closed', () => {
        console.log('[WindowManager] cursorWindow closed.'); // 追加ログ
        cursorWindow = null;
        // Do not close timerWindow here to allow independent operation
        sendCursorWindowClosedToMain();
    });
    cursorWindow.on('leave-full-screen', () => {
    });
    // Create timer window on the same display
    createTimerWindow(targetDisplay);
}

let storedTargetDisplay: Display | null = null;

export function setTargetDisplay(displayId: number) {
    const displays = screen.getAllDisplays();
    const target = displays.find(d => d.id === displayId);
    if (target) {
        storedTargetDisplay = target;
        console.log(`[WindowManager] Target display set to: ${target.id}`);
    } else {
        console.warn(`[WindowManager] Target display ID ${displayId} not found.`);
    }
}

export function createTimerWindow(targetDisplay?: Display) {
    console.log('[WindowManager] Creating Timer Window...');
    // Use valid targetDisplay arg, OR storedTargetDisplay, OR primary display
    const displayToUse = targetDisplay || storedTargetDisplay || screen.getPrimaryDisplay();
    
    if (timerWindow && !timerWindow.isDestroyed()) {
        return timerWindow;
    }

    timerWindow = new BrowserWindow({
        x: displayToUse.bounds.x,
        y: displayToUse.bounds.y,
        width: displayToUse.bounds.width,
        height: displayToUse.bounds.height,
        fullscreen: true,
        frame: false,
        resizable: false,
        movable: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        transparent: true,
        hasShadow: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            backgroundThrottling: false,
        },
    });

    timerWindow.setIgnoreMouseEvents(true, { forward: true });
    timerWindow.loadFile(path.join(__dirname, 'timer-window.html'));
    
    // Uncomment for debugging
    // timerWindow.webContents.openDevTools({ mode: 'detach' });

    timerWindow.on('closed', () => {
        timerWindow = null;
    });

    return timerWindow;
}

export function getTimerWindow() {
    if (timerWindow && !timerWindow.isDestroyed()) return timerWindow;
    return null;
}

export function sendAvailableDisplays() {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    try {
        const displays = screen.getAllDisplays();
        mainWindow.webContents.send('available-displays', displays);
    } catch (e) {
        sendLaunchErrorToMain('Failed to get display list.');
    }
}

export function sendCursorWindowClosedToMain() {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('cursor-window-closed');
    }
}

export function sendLaunchErrorToMain(message: string) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('launch-error', message);
    }
}

export function getMainWindow() {
    if (mainWindow && !mainWindow.isDestroyed()) return mainWindow;
    return null;
}

export function getCursorWindow() {
    if (cursorWindow && !cursorWindow.isDestroyed()) return cursorWindow;
    return null;
}

export function closeAllWindows() {
    const mainWin = getMainWindow();
    const cursorWin = getCursorWindow();
    const timerWin = getTimerWindow();
    if (timerWin) timerWin.close();
    if (cursorWin) cursorWin.close();
    if (mainWin) mainWin.close();
}

export function closeCursorWindow() {
    if (cursorWindow && !cursorWindow.isDestroyed()) {
        console.log('[WindowManager] Closing cursor window due to external request.');
        cursorWindow.close();
    }
}

export default {
    createWindow,
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
};
