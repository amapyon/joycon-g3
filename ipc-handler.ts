// ipc-handler.ts
import { ipcMain, screen } from 'electron';
import WindowManager from './window-manager';
import powerpointControl from './powerpoint-control';
import imuProcessor from './imu-processor';
import JoyConManager from './joycon';

export function setupIpcHandlers(windowManagerInstance = WindowManager, joyconManager: JoyConManager) {
    console.log('Setting up IPC Handlers...');

    ipcMain.on('launch-cursor-window', (event, displayId) => {
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
            const selectedDisplay = displays.find((d) => d.id === targetId);
            if (selectedDisplay) {
                windowManagerInstance.createCursorWindow(selectedDisplay);
            } else {
                windowManagerInstance.sendLaunchErrorToMain(`Display ${targetId} not found.`);
            }
        } catch (e: any) {
            console.error('IPC launch-cursor-window error:', e);
            windowManagerInstance.sendLaunchErrorToMain(`Launch Error: ${e.message}`);
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

    ipcMain.on('set-target-presentation', (event, identifier) => {
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

    ipcMain.on('recenter-imu', (event, id: 'cursorLeft' | 'cursorRight') => {
        console.log(`[IPC Handler] Received 'recenter-imu' request for ${id}.`);
        imuProcessor.recenter(id);
    });

    ipcMain.handle('get-open-powerpoint-presentations', async () => {
        console.log("[IPC Handler] Received 'get-open-powerpoint-presentations' request.");
        try {
            const presentations = powerpointControl.getOpenPresentations();
            return presentations;
        } catch (e: any) {
            console.error('[IPC Handler] Error getting open PowerPoint presentations:', e.message);
            return [];
        }
    });

    ipcMain.on('start-countdown-timer', (event, duration: number) => {
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

    ipcMain.on('set-target-display', (event, displayId: number | string) => {
        console.log(`[IPC Handler] Received 'set-target-display': ${displayId}`);
        const id = typeof displayId === 'string' ? parseInt(displayId, 10) : displayId;
        if (!process.platform || !Number.isNaN(id)) { // Basic check
            windowManagerInstance.setTargetDisplay(id);
        }
    });

    ipcMain.on('connect-joycon', (event, isLeft: boolean) => {
        console.log(`[IPC Handler] Received 'connect-joycon' request for ${isLeft ? 'L' : 'R'}.`);
        if (isLeft) joyconManager.autoConnectL = true;
        else joyconManager.autoConnectR = true;
        joyconManager.connectAll(); // Trigger immediate check
        event.reply('joycon-status-update', joyconManager.getConnectionStatus());
    });

    ipcMain.on('shutdown-joycon', (event, isLeft: boolean) => {
        console.log(`[IPC Handler] Received 'shutdown-joycon' request for ${isLeft ? 'L' : 'R'}.`);
        joyconManager.shutdownJoyCon(isLeft);
        event.reply('joycon-status-update', joyconManager.getConnectionStatus());
    });

    console.log('IPC Handlers setup complete.');
}
