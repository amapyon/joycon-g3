// main.ts
import { app, BrowserWindow, ipcMain, screen, IpcMainEvent } from 'electron';
import JoyConManager from './joycon';
import powerpointControl from './powerpoint-control';
import WindowManager from './window-manager';
import * as IpcHandler from './ipc-handler';
import imuProcessor from './imu-processor';
import { getScreenSize, setScreenSize } from './screen-state';
import {
    createTimerState,
    decideToggleTimerWindow,
    getTimerWindowMode,
    setTimerCounting,
    setTimerPaused,
} from './timer-state';
import { registerTimerIpcHandlers } from './timer-ipc';
import { createStrongTripleRumblePattern } from './rumble-pattern';
import {
    CursorId,
    CursorMapConfig,
    ImuData,
    PointerPositions,
    decidePointerUpdate,
} from './imu-pointer';
import {
    RStickAction,
    RStickConfig,
    RStickState,
    decideRStickAnalog,
    decideRStickPress,
} from './r-stick-handler';

type TimerNotificationConfig = Record<string, unknown>;
type JoyConEventData = { id?: string } & Record<string, unknown>;
type JoyConStatus = Record<string, unknown>;
type AttitudeData = Record<string, unknown>;
type CalibrationStatus = Record<string, unknown>;
type BatteryStatus = Record<string, unknown>;

/**
 * カーソル ID かどうかを判定する。
 * @param value 判定対象
 * @returns カーソル ID の場合は true
 */
function isCursorId(value: unknown): value is CursorId {
    return value === 'cursorLeft' || value === 'cursorRight';
}

// --- IMU Pointer Control Variables ---
const isCursorVisible: { cursorLeft: boolean; cursorRight: boolean } = { cursorLeft: false, cursorRight: false }; // Track visibility per cursor
let countdownInitialValue: number = 10; // Default value
let isRStickPressed: boolean = false; // Track R-stick press state
let lastAnalogData: { x: number; y: number } | null = null; // Store last analog stick data
const FONT_SIZE_CHANGE_AMOUNT = 2; // Pixels to change font size
const FONT_SIZE_CHANGE_INTERVAL = 100; // Milliseconds between font size changes
let lastFontSizeChangeTime = 0; // Timestamp of the last font size change
let isTimerMenuNavActive = false; // Track if stick is currently tilted for menu navigation
let timerState = createTimerState();

const rStickConfig: RStickConfig = {
    fontSizeChangeAmount: FONT_SIZE_CHANGE_AMOUNT,
    fontSizeChangeInterval: FONT_SIZE_CHANGE_INTERVAL,
    analogCenter: 2048,
    fontSizeDeadzone: 200,
    navDeadzone: 600,
};

let rStickState: RStickState = {
    isPressed: isRStickPressed,
    lastAnalogData,
    lastFontSizeChangeTime,
    isTimerMenuNavActive,
};

/**
 * R スティックの状態を同期する。
 * @param state 新しい状態
 */
function applyRStickState(state: RStickState): void {
    rStickState = state;
    isRStickPressed = state.isPressed;
    lastAnalogData = state.lastAnalogData;
    lastFontSizeChangeTime = state.lastFontSizeChangeTime;
    isTimerMenuNavActive = state.isTimerMenuNavActive;
}

/**
 * R スティックのアクションを実行する。
 * @param actions アクション一覧
 * @param timerWindow タイマーウィンドウ
 * @param cursorWindow カーソルウィンドウ
 */
function dispatchRStickActions(
    actions: RStickAction[],
    timerWindow: BrowserWindow | null,
    cursorWindow: BrowserWindow | null,
): void {
    actions.forEach((action: RStickAction) => {
        if (action.target === 'timer') {
            if (timerWindow && !timerWindow.isDestroyed()) {
                if (action.payload === undefined) {
                    timerWindow.webContents.send(action.channel);
                } else {
                    timerWindow.webContents.send(action.channel, action.payload);
                }
            }
            return;
        }

        if (cursorWindow && !cursorWindow.isDestroyed()) {
            if (action.payload === undefined) {
                cursorWindow.webContents.send(action.channel);
            } else {
                cursorWindow.webContents.send(action.channel, action.payload);
            }
        }
    });
}

/**
 * 物理ピクセルでの画面サイズを取得する。
 * @returns 画面サイズ
 */
function getPhysicalScreenSize(): { width: number; height: number } {
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

const joyconManager = new JoyConManager();

// --- カーソルマップ設定を保持する変数 ---
let cursorMapConfig: CursorMapConfig = {};

app.whenReady().then(() => {
    // 物理ピクセルでの画面サイズを初期化
    const { width, height } = getPhysicalScreenSize();
    setScreenSize(width, height);
    console.log('App Ready. Initializing modules...');
    WindowManager.createMainWindow();
    IpcHandler.setupIpcHandlers(WindowManager, joyconManager);

    /**
     * タイマーウィンドウを必要に応じて生成する。
     * @returns タイマーウィンドウ
     */
    function ensureTimerWindow(): BrowserWindow | null {
        const existingWindow = WindowManager.getTimerWindow();
        if (existingWindow && !existingWindow.isDestroyed()) {
            return existingWindow;
        }

        const mainWin = WindowManager.getMainWindow();
        const mainWinBounds = mainWin ? mainWin.getBounds() : screen.getPrimaryDisplay().bounds;
        const mainDisplay = screen.getDisplayNearestPoint({ x: mainWinBounds.x, y: mainWinBounds.y });
        const createdWindow = WindowManager.createTimerWindow(mainDisplay);
        if (createdWindow) {
            createdWindow.webContents.once('did-finish-load', () => {
                if (createdWindow && !createdWindow.isDestroyed()) {
                    createdWindow.webContents.send('set-timer-mode', getTimerWindowMode(timerState));
                }
            });
        }
        return createdWindow;
    }

    /**
     * タイマーウィンドウの表示/非表示を切り替える。
     */
    function toggleTimerWindowVisibility(): void {
        console.log('[Main] toggleTimerWindowVisibility called.');
        const existingWindow = WindowManager.getTimerWindow();
        const hasWindow = !!existingWindow && !existingWindow.isDestroyed();
        const status = {
            hasWindow,
            isVisible: hasWindow ? existingWindow.isVisible() : false,
        };
        const decision = decideToggleTimerWindow(timerState, status);

        if (decision.action === 'create') {
            const createdWindow = ensureTimerWindow();
            if (!createdWindow) {
                console.error('[Main] Failed to create timer window.');
                return;
            }
            createdWindow.show();
            createdWindow.webContents.send('set-timer-mode', decision.mode);
            return;
        }

        if (!existingWindow || existingWindow.isDestroyed()) {
            return;
        }

        if (decision.action === 'hide') {
            existingWindow.hide();
            return;
        }

        existingWindow.show();
        existingWindow.webContents.send('set-timer-mode', decision.mode);
    }

    const mainWin = WindowManager.getMainWindow();
    if (mainWin) {
        mainWin.webContents.on('did-finish-load', () => {
            if (powerpointControl) {
                // プレゼンテーションリスト送信など
            }
        });
    }

    // --- IPCでcursorMapConfigを受信 ---
    if (!ipcMain.listenerCount('cursor-map-config')) {
        ipcMain.on('cursor-map-config', (event: IpcMainEvent, config: CursorMapConfig) => {
            cursorMapConfig = config;
            console.log('[main.ts] Received cursorMapConfig from renderer:', cursorMapConfig);
        });
    }

    // Add IPC listener for cursor visibility updates
    if (!ipcMain.listenerCount('cursor-visibility-update')) {
        ipcMain.on('cursor-visibility-update', (event: IpcMainEvent, data: { id: CursorId; isVisible: boolean }) => {
            isCursorVisible[data.id] = data.isVisible;
            // console.log(`[main.ts] Cursor ${data.id} visibility updated to ${data.isVisible}`);
        });
    }
    // --- IPCでcountdown-initial-valueを受信 ---
    if (!ipcMain.listenerCount('countdown-initial-value')) {
        ipcMain.on('countdown-initial-value', (event: IpcMainEvent, value: number) => {
            countdownInitialValue = value;
            console.log(`[main.ts] Received countdown initial value: ${countdownInitialValue}`);
            // Broadcast to all windows
            [WindowManager.getCursorWindow(), WindowManager.getTimerWindow(), WindowManager.getMainWindow()].forEach((win: BrowserWindow | null) => {
                if (win && !win.isDestroyed()) win.webContents.send('update-countdown-initial-value', countdownInitialValue);
            });
        });
    }

    // --- IPCでtimer presetsを受信 ---
    if (!ipcMain.listenerCount('update-timer-presets')) {
        ipcMain.on('update-timer-presets', (event: IpcMainEvent, presets: number[]) => {
            console.log(`[main.ts] Received timer presets: ${presets}`);
            // Broadcast to all windows
            [WindowManager.getCursorWindow(), WindowManager.getTimerWindow(), WindowManager.getMainWindow()].forEach((win: BrowserWindow | null) => {
                if (win && !win.isDestroyed()) win.webContents.send('update-timer-presets', presets);
            });
        });
    }

    // --- IPCでtimer notificationsを受信 ---
    if (!ipcMain.listenerCount('update-timer-notifications')) {
        ipcMain.on('update-timer-notifications', (event: IpcMainEvent, configs: TimerNotificationConfig[]) => {
            console.log('[main.ts] Received timer notifications update:', configs);
            // Broadcast to all windows
            [WindowManager.getCursorWindow(), WindowManager.getTimerWindow(), WindowManager.getMainWindow()].forEach((win: BrowserWindow | null) => {
                if (win && !win.isDestroyed()) win.webContents.send('update-timer-notifications', configs);
            });
        });
    }

    // --- IPC for Timer Status ---
    registerTimerIpcHandlers(ipcMain, {
        onStatusUpdate: (isCountingUpdate: boolean): void => {
            console.log(`[main.ts] Timer status update: ${isCountingUpdate}`);
            timerState = setTimerCounting(timerState, isCountingUpdate);
        },
        onPauseUpdate: (isPausedUpdate: boolean): void => {
            console.log(`[main.ts] Timer pause update: ${isPausedUpdate}`);
            timerState = setTimerPaused(timerState, isPausedUpdate);
        },
    });
    if (!ipcMain.listenerCount('hide-timer-window')) {
        ipcMain.on('hide-timer-window', () => {
            const timerWindow = WindowManager.getTimerWindow();
            if (timerWindow && !timerWindow.isDestroyed()) {
                timerWindow.hide();
            }
        });
    }

    // Add IPC listener for toggling timer window from main-renderer
    if (!ipcMain.listenerCount('toggle-timer-window')) {
        ipcMain.on('toggle-timer-window', () => {
            console.log('[Main] Received toggle-timer-window IPC from renderer.');
            toggleTimerWindowVisibility();
        });
    }

    // Add IPC listener for timer countdown updates from timer-renderer
    if (!ipcMain.listenerCount('timer-countdown-update')) {
        ipcMain.on('timer-countdown-update', (event: IpcMainEvent, remainingTime: number) => {
            // console.log(`[Main] Received timer countdown update: ${remainingTime}`);
            const mainWindow = WindowManager.getMainWindow();
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('main-timer-update', remainingTime);
            }
        });
    }

    if (!ipcMain.listenerCount('timer-notification-trigger')) {
        ipcMain.on('timer-notification-trigger', (event: IpcMainEvent, seconds: number, shouldRumble: boolean) => {
            void event;
            void seconds;
            if (shouldRumble) {
                joyconManager.playRumblePattern(createStrongTripleRumblePattern());
            }
        });
    }

    joyconManager.on('imu-data', handleImuData);

    /**
     * IMU データを受け取り、ポインター座標を更新する。
     * @param data IMU データ
     */
    function handleImuData(data: ImuData): void {
        const cursorId = (data.id === 'R' || data.id === 'cursorRight') ? 'cursorRight' : 'cursorLeft';

        // Feed data to imuProcessor for calibration and attitude calculation
        imuProcessor.update({
            id: cursorId,
            accel: data.accel,
            gyro: data.gyro
        });

        const moveSpeed = 0.1; // Adjusted to a more reasonable default
        const gyroDeadzone = 90; // Increased to account for higher noise/bias

        const state = imuProcessor.states[cursorId];

        // --- JoyConごとにポインター座標を分離 ---
        const id = data.id === 'R' || data.id === 'cursorRight' ? 'cursorRight' : 'cursorLeft';
        // ポインターごとの座標を保持
        const g = globalThis as typeof globalThis & { pointerPositions?: PointerPositions; cursorMapConfig?: CursorMapConfig };
        if (!g.pointerPositions) g.pointerPositions = { cursorLeft: { x: 600, y: 300 }, cursorRight: { x: 600, y: 300 } };
        const pointerPosition = g.pointerPositions[id];
        const decision = decidePointerUpdate({
            data,
            cursorId: id,
            cursorVisible: isCursorVisible[id],
            isCalibrating: imuProcessor.isCalibrating[id],
            gyroBias: { x: state.gyroBiasX, y: state.gyroBiasY, z: state.gyroBiasZ },
            cursorMapConfig,
            currentPosition: pointerPosition,
            defaultPosition: { x: 600, y: 300 },
            screenSize: getScreenSize(),
            moveSpeed,
            gyroDeadzone,
        });

        if (!decision) {
            return;
        }

        if (decision.configMissing) {
            console.warn(`[main.ts] cursorMapConfig for ${id} is undefined. Using default signs.`);
        }

        g.pointerPositions[id] = decision.position;
        const pointerWindow = WindowManager.getCursorWindow();

        if (pointerWindow && !pointerWindow.isDestroyed()) {
            pointerWindow.webContents.send('update-pointer', decision.sendPayload);
        }
    }
    imuProcessor.on('attitude-update', (attitudeData: AttitudeData) => {
        const targetWindow = WindowManager.getCursorWindow();
        if (targetWindow && !targetWindow.isDestroyed()) {
            targetWindow.webContents.send('joycon-attitude', attitudeData);
        }
    });
    joyconManager.on('status-update', (status: JoyConStatus) => {
        const targetWindow = WindowManager.getMainWindow();
        if (targetWindow && !targetWindow.isDestroyed()) {
            targetWindow.webContents.send('joycon-status-update', status);
        }
    });
    ['button-x', 'button-down', 'button-plus'].forEach((eventName: string) => {
        joyconManager.on(eventName, (data: JoyConEventData) => {
            // console.log(`[Main] Event forwarded from JoyCon: ${eventName}`, data);
            const targetWindow = WindowManager.getCursorWindow();
            if (targetWindow && !targetWindow.isDestroyed()) {
                const channel = eventName === 'button-x'
                    ? 'joycon-button-x'
                    : eventName === 'button-down'
                        ? 'joycon-button-down'
                        : 'joycon-button-plus'; // New event name
                targetWindow.webContents.send(channel, data);
            }
        });
    });
    joyconManager.on('button-x-pressed', (data: JoyConEventData) => {
        console.log(`[Main] button-x-pressed received for ${data?.id}`);
        const cursorId = isCursorId(data.id) ? data.id : null;
        if (cursorId) {
            imuProcessor.recenter(cursorId);
        }
        const targetWindow = WindowManager.getCursorWindow();
        if (targetWindow && !targetWindow.isDestroyed()) {
            targetWindow.webContents.send('button-x-pressed', data);
        }
    });

    joyconManager.on('button-plus-pressed', (data: JoyConEventData) => {
        console.log(`[Main] button-plus-pressed received for ${data?.id}. Toggle logic.`);
        toggleTimerWindowVisibility();

        // Send event to renderer anyway if visibility logic allows (some features might rely on it)
        const targetWindow = WindowManager.getTimerWindow();
        if (targetWindow && !targetWindow.isDestroyed()) {
            targetWindow.webContents.send('button-plus-pressed', data);
        }
    });
    joyconManager.on('button-minus-pressed', (data: JoyConEventData) => {
        console.log(`[Main] button-minus-pressed received from JoyConManager for ${data?.id}`);
        const timerWindow = ensureTimerWindow();
        if (timerWindow && !timerWindow.isDestroyed()) {
            timerWindow.show();
            if (timerWindow.webContents.isLoading()) {
                timerWindow.webContents.once('did-finish-load', () => {
                    if (timerWindow && !timerWindow.isDestroyed()) {
                        timerWindow.webContents.send('button-minus-pressed', data);
                    }
                });
            } else {
                timerWindow.webContents.send('button-minus-pressed', data);
            }
        }
    });
    joyconManager.on('button-sr-pressed', (data: JoyConEventData) => {
        console.log(`[Main] button-sr-pressed received from JoyConManager for ${data?.id}`);
        const timerWindow = ensureTimerWindow();
        if (timerWindow && !timerWindow.isDestroyed()) {
            timerWindow.show();
            if (timerWindow.webContents.isLoading()) {
                timerWindow.webContents.once('did-finish-load', () => {
                    if (timerWindow && !timerWindow.isDestroyed()) {
                        timerWindow.webContents.send('button-sr-pressed', data);
                    }
                });
            } else {
                timerWindow.webContents.send('button-sr-pressed', data);
            }
        }
    });
    joyconManager.on('button-down-pressed', (data: JoyConEventData) => {
        console.log(`[Main] button-down-pressed received for ${data?.id} -> calling imuProcessor.recenter`);
        const cursorId = isCursorId(data.id) ? data.id : null;
        if (cursorId) {
            imuProcessor.recenter(cursorId);
        }
        const targetWindow = WindowManager.getCursorWindow();
        if (targetWindow && !targetWindow.isDestroyed()) {
            targetWindow.webContents.send('button-down-pressed', data);
        }
    });
    // Listen for R-stick press/release
    joyconManager.on('r-stick', (data: { pressed: boolean }) => {
        const decision = decideRStickPress({
            pressed: data.pressed,
            now: Date.now(),
            state: rStickState,
            config: rStickConfig,
        });
        applyRStickState(decision.state);

        const timerWindow = decision.shouldEnsureTimerWindow ? ensureTimerWindow() : null;
        const cursorWindow = WindowManager.getCursorWindow();
        dispatchRStickActions(decision.actions, timerWindow, cursorWindow);
    });

    // Listen for R-stick analog data
    joyconManager.on('r-stick-analog', (data: { x: number, y: number }) => {
        const decision = decideRStickAnalog({
            analog: data,
            now: Date.now(),
            state: rStickState,
            config: rStickConfig,
        });
        applyRStickState(decision.state);

        const timerWindow = decision.shouldEnsureTimerWindow ? ensureTimerWindow() : null;
        const cursorWindow = WindowManager.getCursorWindow();
        dispatchRStickActions(decision.actions, timerWindow, cursorWindow);
    });
    joyconManager.on('ppt-next', () => {
        powerpointControl.next();
    });
    joyconManager.on('ppt-prev', () => {
        powerpointControl.previous();
    });
    imuProcessor.on('attitude-update', (attitudeData: AttitudeData) => {
        const targetWindow = WindowManager.getCursorWindow();
        if (targetWindow && !targetWindow.isDestroyed()) {
            targetWindow.webContents.send('joycon-attitude', attitudeData);
        }
    });
    imuProcessor.on('calibration-status', (statusInfo: CalibrationStatus) => {
        const targetWindow = WindowManager.getMainWindow();
        if (targetWindow && !targetWindow.isDestroyed()) {
            targetWindow.webContents.send('calibration-status-update', statusInfo);
        }
    });
    joyconManager.on('battery-status-update', (status: BatteryStatus) => {
        const targetWindow = WindowManager.getMainWindow();
        if (targetWindow && !targetWindow.isDestroyed()) {
            targetWindow.webContents.send('joycon-battery-status-update', status);
        }
    });

    joyconManager.on('button-home-pressed', (data: { id: 'cursorLeft' | 'cursorRight' }) => {
        if (data.id === 'cursorRight') {
            console.log('[Main] R Joy-Con Home button pressed. Closing cursor window.');
            WindowManager.closeCursorWindow();
        }
    });

    joyconManager.startScanningAndConnect();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            WindowManager.createMainWindow();
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
