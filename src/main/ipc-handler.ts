// ipc-handler.ts
import { ipcMain, screen, IpcMainEvent, Display } from 'electron';
import fs from 'fs';
import path from 'path';
import WindowManager from './window-manager';
import powerpointControl from './powerpoint-control';
import imuProcessor from './imu-processor';
import JoyConManager from './joycon';
import { setScreenSize } from './screen-state';

/**
 * IPC ハンドラを登録する。
 * @param windowManagerInstance ウィンドウ管理インスタンス
 * @param joyconManager Joy-Con 管理インスタンス
 */
export function setupIpcHandlers(windowManagerInstance: typeof WindowManager = WindowManager, joyconManager: JoyConManager): void {
    console.log('Setting up IPC Handlers...');

    ipcMain.on('launch-cursor-window', (event: IpcMainEvent, displayId: string) => {
        console.log(`IPC Handler: Received 'launch-cursor-window' for display ID: ${displayId}`);
        try {
            const targetId = parseInt(displayId, 10);
            if (isNaN(targetId)) {
                throw new Error(`Invalid display ID received: ${displayId}`);
            }
            const displays = screen.getAllDisplays();
            if (!displays) {
                throw new Error('Screen API unavailable or returned invalid display list.');
            }
            const selectedDisplay = displays.find((d: Display) => d.id === targetId);
            if (selectedDisplay) {
                windowManagerInstance.createCursorWindow(selectedDisplay);
            } else {
                windowManagerInstance.sendLaunchErrorToMain(`Display ${targetId} not found.`);
            }
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            console.error('IPC launch-cursor-window error:', e);
            windowManagerInstance.sendLaunchErrorToMain(`Launch Error: ${message}`);
        }
    });

    ipcMain.on('close-cursor-window', () => {
        console.log("IPC Handler: Received 'close-cursor-window' request.");
        const windowToClose = windowManagerInstance.getCursorWindow();
        if (windowToClose && !windowToClose.isDestroyed()) {
            windowToClose.close();
        } else {
            console.log('IPC Handler: Cursor window already closed or not found.');
            const mainWin = windowManagerInstance.getMainWindow();
            if (mainWin && !mainWin.isDestroyed()) {
                mainWin.webContents.send('cursor-window-closed');
            }
        }
    });

    ipcMain.on('set-target-presentation', (event: IpcMainEvent, identifier: string) => {
        console.log(`[IPC Handler] Received 'set-target-presentation': ${identifier}`);
        powerpointControl.setTarget(identifier);
    });

    ipcMain.on('start-calibration', () => {
        console.log("[IPC Handler] Received 'start-calibration' request.");
        imuProcessor.startGyroCalibration('cursorLeft');
        imuProcessor.startGyroCalibration('cursorRight');
    });

    ipcMain.on('request-joycon-status', () => {
        console.log("IPC Handler: Received 'request-joycon-status'.");
        const status = joyconManager.getConnectionStatus();
        const mainWin = windowManagerInstance.getMainWindow();
        if (mainWin && !mainWin.isDestroyed()) {
            mainWin.webContents.send('joycon-status-update', status);
        }
    });

    ipcMain.on('recenter-imu', (event: IpcMainEvent, id: 'cursorLeft' | 'cursorRight') => {
        console.log(`[IPC Handler] Received 'recenter-imu' request for ${id}.`);
        imuProcessor.recenter(id);
    });

    ipcMain.handle('get-open-powerpoint-presentations', async () => {
        console.log("[IPC Handler] Received 'get-open-powerpoint-presentations' request.");
        try {
            const presentations = powerpointControl.getOpenPresentations();
            return presentations;
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            console.error('[IPC Handler] Error getting open PowerPoint presentations:', message);
            return [];
        }
    });

    ipcMain.on('start-countdown-timer', (event: IpcMainEvent, duration: number) => {
        console.log(`[IPC Handler] Received 'start-countdown-timer': ${duration}s`);
        // Route to Timer Window
        const timerWin = windowManagerInstance.getTimerWindow();
        if (timerWin && !timerWin.isDestroyed()) {
            // Timer Window should be visible when starting via button
            timerWin.show();
            timerWin.webContents.send('start-countdown', duration);
        } else {
            // Try to create it if missing (should exist from startup, but for safety)
            const newTimerWin = windowManagerInstance.createTimerWindow();
            if (newTimerWin) {
                newTimerWin.show();
                newTimerWin.webContents.send('start-countdown', duration);
            } else {
                console.warn('[IPC Handler] Failed to find or create Timer window.');
            }
        }
    });

    ipcMain.on('toggle-timer-pause', () => {
        const timerWin = windowManagerInstance.getTimerWindow();
        if (timerWin && !timerWin.isDestroyed()) {
            timerWin.webContents.send('timer-toggle-pause');
        }
    });

    ipcMain.on('add-minute-timer', () => {
        const timerWin = windowManagerInstance.getTimerWindow();
        if (timerWin && !timerWin.isDestroyed()) {
            timerWin.webContents.send('timer-add-minute');
        }
    });


    ipcMain.on('set-target-display', (event: IpcMainEvent, displayId: number | string) => {
        console.log(`[IPC Handler] Received 'set-target-display': ${displayId}`);
        const id = typeof displayId === 'string' ? parseInt(displayId, 10) : displayId;
        if (!process.platform || !Number.isNaN(id)) { // Basic check
            windowManagerInstance.setTargetDisplay(id);
            const target = screen.getAllDisplays().find((display: Display) => display.id === id);
            if (target) {
                const width = target.size.width * target.scaleFactor;
                const height = target.size.height * target.scaleFactor;
                setScreenSize(width, height);
            }
        }
    });

    ipcMain.on('connect-joycon', (event: IpcMainEvent, isLeft: boolean) => {
        console.log(`[IPC Handler] Received 'connect-joycon' request for ${isLeft ? 'L' : 'R'}.`);
        if (isLeft) joyconManager.autoConnectL = true;
        else joyconManager.autoConnectR = true;
        joyconManager.connectAll(); // Trigger immediate check
        event.reply('joycon-status-update', joyconManager.getConnectionStatus());
    });

    ipcMain.on('shutdown-joycon', (event: IpcMainEvent, isLeft: boolean) => {
        console.log(`[IPC Handler] Received 'shutdown-joycon' request for ${isLeft ? 'L' : 'R'}.`);
        joyconManager.shutdownJoyCon(isLeft);
        event.reply('joycon-status-update', joyconManager.getConnectionStatus());
    });

    ipcMain.handle('get-media-files', async () => {
        const mediaDir = path.join(process.cwd(), 'media');
        if (!fs.existsSync(mediaDir)) {
            try {
                fs.mkdirSync(mediaDir);
            } catch (e) {
                console.error('Failed to create media directory:', e);
                return [];
            }
        }
        try {
            const files = fs.readdirSync(mediaDir);
            return files.filter((f: string) => /\.(mp3|wav|ogg)$/i.test(f));
        } catch (e) {
            console.error('Failed to read media directory:', e);
            return [];
        }
    });

    ipcMain.handle('get-media-base-path', () => {
        return path.join(process.cwd(), 'media');
    });

    // --- Message Window Handlers ---
    let lastMessageText = '';
    ipcMain.on('send-message-text', (event: IpcMainEvent, text: string) => {
        lastMessageText = text;
        const msgWin = windowManagerInstance.getMessageWindow();
        if (msgWin && !msgWin.isDestroyed()) {
            msgWin.webContents.send('update-message-text', text);
        }
    });

    ipcMain.on('toggle-message-window', () => {
        let msgWin = windowManagerInstance.getMessageWindow();
        if (msgWin && !msgWin.isDestroyed()) {
            if (msgWin.isVisible()) {
                msgWin.hide();
            } else {
                msgWin.show();
                msgWin.webContents.send('update-message-text', lastMessageText);
            }
        } else {
            const mainWin = windowManagerInstance.getMainWindow();
            const mainWinBounds = mainWin ? mainWin.getBounds() : screen.getPrimaryDisplay().bounds;
            const mainDisplay = screen.getDisplayNearestPoint({ x: mainWinBounds.x, y: mainWinBounds.y });

            msgWin = windowManagerInstance.createMessageWindow(mainDisplay); // Pass mainDisplay here
            if (msgWin) {
                msgWin.webContents.once('did-finish-load', () => {
                    if (msgWin && !msgWin.isDestroyed()) {
                        msgWin.webContents.send('update-message-text', lastMessageText);
                    }
                });
            }
        }
    });

    console.log('IPC Handlers setup complete.');
}
