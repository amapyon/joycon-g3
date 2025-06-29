// window-manager.ts
import { BrowserWindow, screen, Display } from 'electron';
import path from 'path';

let mainWindow: BrowserWindow | null = null;
let cursorWindow: BrowserWindow | null = null;

export function createWindow(): BrowserWindow {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.focus();
        return mainWindow;
    }
    mainWindow = new BrowserWindow({
        width: 500,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });
    mainWindow.loadFile(path.join(__dirname, 'main-window.html'));
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
    if (!targetDisplay || typeof targetDisplay.id !== 'number') return;
    if (cursorWindow && !cursorWindow.isDestroyed()) {
        cursorWindow.close();
    }
    createCursorWindowInternal(targetDisplay);
}

function createCursorWindowInternal(targetDisplay: Display) {
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
    cursorWindow.webContents.on('did-finish-load', () => {});
    cursorWindow.on('closed', () => {
        cursorWindow = null;
        sendCursorWindowClosedToMain();
    });
    cursorWindow.on('leave-full-screen', () => {
        if (cursorWindow && !cursorWindow.isDestroyed()) {
            cursorWindow.close();
        }
    });
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
    if (cursorWin) cursorWin.close();
    if (mainWin) mainWin.close();
}

export default {
    createWindow,
    createCursorWindow,
    sendAvailableDisplays,
    sendLaunchErrorToMain,
    getMainWindow,
    getCursorWindow,
    closeAllWindows,
};
