// main.ts
import { app, BrowserWindow, ipcMain } from 'electron';
import JoyConManager from './joycon';
import powerpointControl from './powerpoint-control';
import googleSlidesControl from './google-slides-control';
import WindowManager from './window-manager';
import * as IpcHandler from './ipc-handler';
import imuProcessor from './imu-processor';
import {
    createTimerState,
} from './timer-state';
import { registerMainIpcHandlers } from './main-ipc-registration';
import {
    CursorId,
    CursorMapConfig,
} from './imu-pointer';
import { registerMainJoyConEvents } from './main-joycon-events';
import { createTimerWindowBootstrap, initializeScreenSize } from './main-bootstrap';

// --- IMU Pointer Control Variables ---
const isCursorVisible: { cursorLeft: boolean; cursorRight: boolean } = { cursorLeft: false, cursorRight: false }; // Track visibility per cursor
let countdownInitialValue: number = 10; // Default value
let timerState = createTimerState();
let soundPlayDelayMs = 200;

const joyconManager = new JoyConManager();

// --- カーソルマップ設定を保持する変数 ---
let cursorMapConfig: CursorMapConfig = {};

app.whenReady().then(() => {
    // 物理ピクセルでの画面サイズを初期化
    initializeScreenSize();
    // console.log('App Ready. Initializing modules...');
    WindowManager.createMainWindow();
    IpcHandler.setupIpcHandlers(WindowManager, joyconManager);
    const timerWindowBootstrap = createTimerWindowBootstrap({
        windowManager: WindowManager,
        getTimerState: (): typeof timerState => timerState,
        getSoundPlayDelayMs: (): number => soundPlayDelayMs,
    });
    const { ensureTimerWindow, toggleTimerWindowVisibility } = timerWindowBootstrap;

    // Joy-Con 未接続時でもタイマーウィンドウを起動時に表示する
    ensureTimerWindow();

    const mainWin = WindowManager.getMainWindow();
    if (mainWin) {
        mainWin.webContents.on('did-finish-load', () => {
            if (powerpointControl) {
                // プレゼンテーションリスト送信など
            }
        });
    }

    registerMainIpcHandlers({
        ipcMain,
        windowManager: WindowManager,
        joyConRumbleApi: joyconManager,
        state: {
            setCursorMapConfig: (config: CursorMapConfig): void => {
                cursorMapConfig = config;
            },
            setCursorVisibility: (id: CursorId, isVisible: boolean): void => {
                isCursorVisible[id] = isVisible;
            },
            setCountdownInitialValue: (value: number): void => {
                countdownInitialValue = value;
            },
            getCountdownInitialValue: (): number => countdownInitialValue,
            getTimerState: (): typeof timerState => timerState,
            setTimerState: (nextState: typeof timerState): void => {
                timerState = nextState;
            },
            setSoundPlayDelayMs: (delayMs: number): void => {
                soundPlayDelayMs = delayMs;
            },
        },
        toggleTimerWindowVisibility,
    });

    registerMainJoyConEvents({
        joyConManager: joyconManager,
        imuProcessor,
        windowManager: WindowManager,
        ensureTimerWindow,
        toggleTimerWindowVisibility,
        getCursorMapConfig: (): CursorMapConfig => cursorMapConfig,
        getCursorVisibility: (id: CursorId): boolean => isCursorVisible[id],
        powerpointControl,
        googleSlidesControl,
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
