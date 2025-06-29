// main.ts
import { app, BrowserWindow } from 'electron';
import path from 'path';
import JoyConManager from './joycon';
import powerpointControl from './powerpoint-control';
import WindowManager from './window-manager';
import * as IpcHandler from './ipc-handler';
import imuProcessor from './imu-processor';

const joyconManager = new JoyConManager();

app.whenReady().then(() => {
    console.log('App Ready. Initializing modules...');
    const connected = powerpointControl.connect();
    if (!connected) {
        console.warn('Initial connection to PowerPoint failed. Ensure PowerPoint is running.');
    }
    WindowManager.createWindow();
    IpcHandler.setupIpcHandlers(WindowManager);
    const mainWin = WindowManager.getMainWindow();
    if (mainWin) {
        mainWin.webContents.on('did-finish-load', () => {
            if (powerpointControl) {
                // プレゼンテーションリスト送信など
            }
        });
    }
    joyconManager.on('imu-data', (data: any) => {
        imuProcessor.update(data);
    });
    imuProcessor.on('attitude-update', (attitudeData: any) => {
        const targetWindow = WindowManager.getCursorWindow();
        if (targetWindow && !targetWindow.isDestroyed()) {
            targetWindow.webContents.send('joycon-attitude', attitudeData);
        }
    });
    joyconManager.on('status-update', (status: any) => {
        const targetWindow = WindowManager.getMainWindow();
        if (targetWindow && !targetWindow.isDestroyed()) {
            targetWindow.webContents.send('joycon-status-update', status);
        }
    });
    ['button-x', 'button-down'].forEach((eventName) => {
        joyconManager.on(eventName, (data: any) => {
            const targetWindow = WindowManager.getCursorWindow();
            if (targetWindow && !targetWindow.isDestroyed()) {
                targetWindow.webContents.send(
                    eventName === 'button-x' ? 'joycon-button-x' : 'joycon-button-down',
                    data
                );
            }
        });
    });
    joyconManager.on('button-x-pressed', (data: any) => {
        imuProcessor.recenter(data.id);
        const targetWindow = WindowManager.getCursorWindow();
        if (targetWindow && !targetWindow.isDestroyed()) {
            targetWindow.webContents.send('button-x-pressed', data);
        }
    });
    joyconManager.on('button-down-pressed', (data: any) => {
        imuProcessor.recenter(data.id);
        const targetWindow = WindowManager.getCursorWindow();
        if (targetWindow && !targetWindow.isDestroyed()) {
            targetWindow.webContents.send('button-down-pressed', data);
        }
    });
    joyconManager.on('ppt-next', () => {
        powerpointControl.next();
    });
    joyconManager.on('ppt-prev', () => {
        powerpointControl.previous();
    });
    imuProcessor.on('attitude-update', (attitudeData: any) => {
        const targetWindow = WindowManager.getCursorWindow();
        if (targetWindow && !targetWindow.isDestroyed()) {
            targetWindow.webContents.send('joycon-attitude', attitudeData);
        }
    });
    imuProcessor.on('calibration-status', (statusInfo: any) => {
        const targetWindow = WindowManager.getMainWindow();
        if (targetWindow && !targetWindow.isDestroyed()) {
            targetWindow.webContents.send('calibration-status-update', statusInfo);
        }
    });
    joyconManager.on('battery-status-update', (status: any) => {
        const targetWindow = WindowManager.getMainWindow();
        if (targetWindow && !targetWindow.isDestroyed()) {
            targetWindow.webContents.send('joycon-battery-status-update', status);
        }
    });
    joyconManager.startScanningAndConnect();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            WindowManager.createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('will-quit', () => {
    joyconManager.closeAll();
    WindowManager.closeAllWindows();
});
