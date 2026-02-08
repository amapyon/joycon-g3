// main.ts
import { app, BrowserWindow, ipcMain, screen } from 'electron';
import JoyConManager from './joycon';
import powerpointControl from './powerpoint-control';
import googleSlidesControl from './google-slides-control';
import WindowManager from './window-manager';
import * as IpcHandler from './ipc-handler';
import imuProcessor from './imu-processor';
import { setScreenSize } from './screen-state';
import {
    createTimerState,
    decideToggleTimerWindow,
    getTimerWindowMode,
} from './timer-state';
import { registerMainIpcHandlers } from './main-ipc-registration';
import {
    CursorId,
    CursorMapConfig,
} from './imu-pointer';
import { registerMainJoyConEvents } from './main-joycon-events';

// --- IMU Pointer Control Variables ---
const isCursorVisible: { cursorLeft: boolean; cursorRight: boolean } = { cursorLeft: false, cursorRight: false }; // Track visibility per cursor
let countdownInitialValue: number = 10; // Default value
let timerState = createTimerState();
let soundPlayDelayMs = 200;

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
                    createdWindow.webContents.send('update-sound-play-delay', soundPlayDelayMs);
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
