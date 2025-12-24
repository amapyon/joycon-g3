// main.ts
import { app, BrowserWindow } from 'electron';
import path from 'path';
import JoyConManager from './joycon';
import powerpointControl from './powerpoint-control';
import WindowManager from './window-manager';
import * as IpcHandler from './ipc-handler';
import imuProcessor from './imu-processor';

// --- IMU Pointer Control Variables ---
let isCalibrating = false;
const CALIBRATION_SAMPLE_COUNT = 100;
let calibrationSamples: { x: number; y: number; z: number }[] = [];
let biasX = 0, biasY = 0, biasZ = 0;
let isCursorVisible: { cursorLeft: boolean, cursorRight: boolean } = { cursorLeft: false, cursorRight: false }; // Track visibility per cursor
let currentPointerPosition = { x: 600, y: 300 }; // Keep this, it's still used for initial position
let countdownInitialValue: number = 10; // Default value
let isRStickPressed: boolean = false; // Track R-stick press state
let lastAnalogData: { x: number, y: number } | null = null; // Store last analog stick data
const FONT_SIZE_CHANGE_AMOUNT = 2; // Pixels to change font size
const FONT_SIZE_CHANGE_INTERVAL = 100; // Milliseconds between font size changes
let lastFontSizeChangeTime = 0; // Timestamp of the last font size change

// 物理ピクセルでの画面サイズを取得する関数
function getPhysicalScreenSize() {
    const { screen } = require('electron');
    const primaryDisplay = screen.getPrimaryDisplay();
    if (primaryDisplay && primaryDisplay.size && primaryDisplay.scaleFactor) {
        return {
            width: primaryDisplay.size.width * primaryDisplay.scaleFactor,
            height: primaryDisplay.size.height * primaryDisplay.scaleFactor,
        };
    }
    // fallback
    return { width: 1200, height: 600 };
}

let screenWidth = 1200;
let screenHeight = 600;

const joyconManager = new JoyConManager();

// --- カーソルマップ設定を保持する変数 ---
let cursorMapConfig: { [key in 'cursorLeft' | 'cursorRight']?: { xSign: number, ySign: number } } = {};

app.whenReady().then(() => {
    // 物理ピクセルでの画面サイズを初期化
    const { width, height } = getPhysicalScreenSize();
    screenWidth = width;
    screenHeight = height;
    console.log('App Ready. Initializing modules...');
    const connected = powerpointControl.connect();
    if (!connected) {
        console.warn('Initial connection to PowerPoint failed. Ensure PowerPoint is running.');
    }
    WindowManager.createWindow();
    IpcHandler.setupIpcHandlers(WindowManager, joyconManager);

    // --- IPCでcursorMapConfigを受信 ---
    const { ipcMain } = require('electron');
    if (!ipcMain.listenerCount('cursor-map-config')) {
        ipcMain.on('cursor-map-config', (event: any, config: any) => {
            cursorMapConfig = config;
            console.log('[main.ts] Received cursorMapConfig from renderer:', cursorMapConfig);
        });
    }
    // Add IPC listener for cursor visibility updates
    if (!ipcMain.listenerCount('cursor-visibility-update')) {
        ipcMain.on('cursor-visibility-update', (event: any, data: { id: 'cursorLeft' | 'cursorRight', isVisible: boolean }) => {
            isCursorVisible[data.id] = data.isVisible;
            // console.log(`[main.ts] Cursor ${data.id} visibility updated to ${data.isVisible}`);
        });
    }
    // --- IPCでcountdown-initial-valueを受信 ---
    if (!ipcMain.listenerCount('countdown-initial-value')) {
        ipcMain.on('countdown-initial-value', (event: any, value: number) => {
            countdownInitialValue = value;
            console.log(`[main.ts] Received countdown initial value: ${countdownInitialValue}`);
            // Optionally, send to windows immediately if they're open
            const cursorWindow = WindowManager.getCursorWindow();
            if (cursorWindow && !cursorWindow.isDestroyed()) {
                cursorWindow.webContents.send('update-countdown-initial-value', countdownInitialValue);
            }
            const mainWindow = WindowManager.getMainWindow();
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('update-countdown-initial-value', countdownInitialValue);
            }
        });
    }
    const mainWin = WindowManager.getMainWindow();
    if (mainWin) {
        mainWin.webContents.on('did-finish-load', () => {
            if (powerpointControl) {
                // プレゼンテーションリスト送信など
            }
        });
    }
        // --- IMU Pointer Control ---
        joyconManager.on('imu-data', handleImuData);

        function handleImuData(data: { id: string, accel: { x: number, y: number, z: number }, gyro: { x: number, y: number, z: number } }) {
            if (isCalibrating) {
                calibrationSamples.push(data.gyro);
                if (calibrationSamples.length >= CALIBRATION_SAMPLE_COUNT) {
                    // Calculate average bias
                    const sum = calibrationSamples.reduce((acc, gyro) => {
                        acc.x += gyro.x;
                        acc.y += gyro.y;
                        acc.z += gyro.z;
                        return acc;
                    }, { x: 0, y: 0, z: 0 });

                    biasX = sum.x / CALIBRATION_SAMPLE_COUNT;
                    biasY = sum.y / CALIBRATION_SAMPLE_COUNT;
                    biasZ = sum.z / CALIBRATION_SAMPLE_COUNT;

                    isCalibrating = false;
                    calibrationSamples.length = 0; // Clear samples
                    console.log(`Calibration complete. Bias: X=${biasX.toFixed(2)}, Y=${biasY.toFixed(2)}, Z=${biasZ.toFixed(2)}`);
                }
                return; // Don't move pointer during calibration
            }

            const cursorId = data.id === 'R' || data.id === 'cursorRight' ? 'cursorRight' : 'cursorLeft';
            if (!isCursorVisible[cursorId]) { // Check visibility for the specific cursor
                return; // Don't move pointer if not visible
            }

            const moveSpeed = 0.1; // Adjusted to a more reasonable default
            const gyroDeadzone = 90; // Increased to account for higher noise/bias

            // Apply bias correction
            let effectiveGyroX = data.gyro.x - biasX;
            let effectiveGyroY = data.gyro.y - biasY;
            let effectiveGyroZ = data.gyro.z - biasZ;

            // Apply deadzone
            if (Math.abs(effectiveGyroX) < gyroDeadzone) effectiveGyroX = 0;
            if (Math.abs(effectiveGyroY) < gyroDeadzone) effectiveGyroY = 0;
            if (Math.abs(effectiveGyroZ) < gyroDeadzone) effectiveGyroZ = 0;

            // console.log(`Effective Gyro: X=${effectiveGyroX.toFixed(2)}, Y=${effectiveGyroY.toFixed(2)}, Z=${effectiveGyroZ.toFixed(2)}`);

            // --- JoyConごとにポインター座標を分離 ---
            const id = data.id === 'R' || data.id === 'cursorRight' ? 'cursorRight' : 'cursorLeft';
            // ポインターごとの座標を保持（型定義を追加して型エラー回避）
            type PointerPositions = { cursorLeft: { x: number, y: number }, cursorRight: { x: number, y: number } };
            type CursorMapConfig = { [key in 'cursorLeft' | 'cursorRight']: { xSign: number, ySign: number } };
            const g = globalThis as typeof globalThis & { pointerPositions?: PointerPositions, cursorMapConfig?: CursorMapConfig };
            if (!g.pointerPositions) g.pointerPositions = { cursorLeft: { x: 600, y: 300 }, cursorRight: { x: 600, y: 300 } };
            const pointerPosition = g.pointerPositions[id];

            // --- Use sign from cursor-renderer.ts mapping ---
            // Default signs in case not received from renderer
            let xSign = 1;
            let ySign = 1;

            if (cursorMapConfig && cursorMapConfig[id]) {
                xSign = cursorMapConfig[id].xSign;
                ySign = cursorMapConfig[id].ySign;
            } else {
                // console.warn(`[main.ts] cursorMapConfig for ${id} is undefined. Using default signs.`);
            }

            pointerPosition.x += effectiveGyroZ * moveSpeed * xSign; // Gyro Z for screen X
            pointerPosition.y += effectiveGyroY * moveSpeed * ySign; // Gyro Y for screen Y, inverted
            pointerPosition.x = Math.max(0, Math.min(screenWidth, pointerPosition.x));
            pointerPosition.y = Math.max(0, Math.min(screenHeight, pointerPosition.y));
            const pointerWindow = WindowManager.getCursorWindow();
            if (pointerWindow && !pointerWindow.isDestroyed()) {
                pointerWindow.webContents.send('update-pointer', { id, x: pointerPosition.x, y: pointerPosition.y });
            }
        }
    imuProcessor.on('attitude-update', (attitudeData: any) => {
        const targetWindow = WindowManager.getCursorWindow();
        if (targetWindow && !targetWindow.isDestroyed()) {
            console.log('[Main] Sending attitude update to cursor window.', attitudeData);
            targetWindow.webContents.send('joycon-attitude', attitudeData);
        }
    });
    joyconManager.on('status-update', (status: any) => {
        const targetWindow = WindowManager.getMainWindow();
        if (targetWindow && !targetWindow.isDestroyed()) {
            targetWindow.webContents.send('joycon-status-update', status);
        }
    });
    ['button-x', 'button-down', 'button-plus'].forEach((eventName) => {
        joyconManager.on(eventName, (data: any) => {
            // console.log(`[Main] Event forwarded from JoyCon: ${eventName}`, data);
            const targetWindow = WindowManager.getCursorWindow();
            if (targetWindow && !targetWindow.isDestroyed()) {
                targetWindow.webContents.send(
                    eventName === 'button-x' ? 'joycon-button-x' :
                    eventName === 'button-down' ? 'joycon-button-down' :
                    'joycon-button-plus', // New event name
                    data
                );
            }
        });
    });
    joyconManager.on('button-x-pressed', (data: any) => {
        console.log(`[Main] button-x-pressed received for ${data?.id}`);
        imuProcessor.recenter(data.id);
        const targetWindow = WindowManager.getCursorWindow();
        if (targetWindow && !targetWindow.isDestroyed()) {
            targetWindow.webContents.send('button-x-pressed', data);
        }
    });
    // Add listener for button-plus-pressed
    joyconManager.on('button-plus-pressed', (data: any) => {
        console.log(`[Main] button-plus-pressed received from JoyConManager for ${data?.id}`); // ADD THIS LOG
        const targetWindow = WindowManager.getCursorWindow();
        if (targetWindow && !targetWindow.isDestroyed()) {
            console.log(`[Main] Sending button-plus-pressed IPC to renderer for ${data?.id}`); // ADD THIS LOG
            targetWindow.webContents.send('button-plus-pressed', data);
        }
    });
    joyconManager.on('button-minus-pressed', (data: any) => {
        console.log(`[Main] button-minus-pressed received from JoyConManager for ${data?.id}`);
        const targetWindow = WindowManager.getCursorWindow();
        if (targetWindow && !targetWindow.isDestroyed()) {
            targetWindow.webContents.send('button-minus-pressed', data);
        }
    });
    joyconManager.on('button-sr-pressed', (data: any) => {
        console.log(`[Main] button-sr-pressed received from JoyConManager for ${data?.id}`);
        const targetWindow = WindowManager.getCursorWindow();
        if (targetWindow && !targetWindow.isDestroyed()) {
            targetWindow.webContents.send('button-sr-pressed', data);
        }
    });
    joyconManager.on('button-down-pressed', (data: any) => {
        console.log(`[Main] button-down-pressed received for ${data?.id} -> calling imuProcessor.recenter`);
        imuProcessor.recenter(data.id);
        const targetWindow = WindowManager.getCursorWindow();
        if (targetWindow && !targetWindow.isDestroyed()) {
            targetWindow.webContents.send('button-down-pressed', data);
        }
    });
    // Listen for R-stick press/release
    joyconManager.on('r-stick', (data: { pressed: boolean }) => {
        isRStickPressed = data.pressed;
        console.log(`[Main] R-stick pressed: ${isRStickPressed}`);

        // If stick is pressed and we have previous analog data, immediately process it
        if (isRStickPressed && lastAnalogData) {
            const now = Date.now();
            if (now - lastFontSizeChangeTime < FONT_SIZE_CHANGE_INTERVAL) {
                return; // Rate limit
            }

            const joystickY = lastAnalogData.y;
            const center = 2048;
            const deadzone = 200;

            if (joystickY < center - deadzone) { // Tilted upwards
                console.log(`[Main] R-stick pressed and tilted Upwards (Y: ${joystickY})`);
                const cursorWindow = WindowManager.getCursorWindow();
                if (cursorWindow && !cursorWindow.isDestroyed()) {
                    cursorWindow.webContents.send('change-font-size', FONT_SIZE_CHANGE_AMOUNT);
                    lastFontSizeChangeTime = now;
                }
            } else if (joystickY > center + deadzone) { // Tilted downwards
                console.log(`[Main] R-stick pressed and tilted Downwards (Y: ${joystickY})`);
                const cursorWindow = WindowManager.getCursorWindow();
                if (cursorWindow && !cursorWindow.isDestroyed()) {
                    cursorWindow.webContents.send('change-font-size', -FONT_SIZE_CHANGE_AMOUNT);
                    lastFontSizeChangeTime = now;
                }
            }
        }
    });

    // Listen for R-stick analog data
    joyconManager.on('r-stick-analog', (data: { x: number, y: number }) => {
        lastAnalogData = data; // Always update last analog data

        if (isRStickPressed) { // Only process analog if stick is pressed
            const now = Date.now();
            if (now - lastFontSizeChangeTime < FONT_SIZE_CHANGE_INTERVAL) {
                return; // Rate limit the font size changes
            }

            // Assuming joystick Y-axis is roughly 0-4095, with center around 2048
            // Upwards tilt: Y < 2048, Downwards tilt: Y > 2048
            const joystickY = data.y;
            const center = 2048; // Approximate center for 12-bit analog stick
            const deadzone = 200; // To prevent accidental changes

            if (joystickY < center - deadzone) { // Tilted upwards
                console.log(`[Main] R-stick analog: Upwards tilt (Y: ${joystickY})`);
                const cursorWindow = WindowManager.getCursorWindow();
                if (cursorWindow && !cursorWindow.isDestroyed()) {
                    cursorWindow.webContents.send('change-font-size', FONT_SIZE_CHANGE_AMOUNT);
                    lastFontSizeChangeTime = now; // Update timestamp after sending event
                }
            } else if (joystickY > center + deadzone) { // Tilted downwards
                console.log(`[Main] R-stick analog: Downwards tilt (Y: ${joystickY})`);
                const cursorWindow = WindowManager.getCursorWindow();
                if (cursorWindow && !cursorWindow.isDestroyed()) {
                    cursorWindow.webContents.send('change-font-size', -FONT_SIZE_CHANGE_AMOUNT);
                    lastFontSizeChangeTime = now; // Update timestamp after sending event
                }
            }
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
