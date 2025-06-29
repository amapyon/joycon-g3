// ipc-handler.ts
import { ipcMain, screen, BrowserWindow } from 'electron';
import WindowManager from './window-manager';
import powerpointControl from './powerpoint-control';
import imuProcessor from './imu-processor';

export function setupIpcHandlers(windowManagerInstance = WindowManager) {
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
        imuProcessor.startGyroCalibration('cursor1');
        imuProcessor.startGyroCalibration('cursor2');
    });

    console.log('IPC Handlers setup complete.');
}
