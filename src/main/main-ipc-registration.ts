import { BrowserWindow, IpcMain, IpcMainEvent } from 'electron';
import { createStrongTripleRumblePattern, RumbleStep } from './rumble-pattern';
import { registerTimerIpcHandlers } from './timer-ipc';
import { CursorId, CursorMapConfig } from './imu-pointer';
import { setTimerCounting, setTimerPaused, TimerState } from './timer-state';
import type { TimerNotificationConfig } from '../shared/timer-notification-config';

type WindowManagerApi = {
    getCursorWindow: () => BrowserWindow | null;
    getTimerWindow: () => BrowserWindow | null;
    getMainWindow: () => BrowserWindow | null;
};

type JoyConRumbleApi = {
    playRumblePattern: (pattern: RumbleStep[]) => void;
};

type MainIpcStateAccessors = {
    setCursorMapConfig: (config: CursorMapConfig) => void;
    setCursorVisibility: (id: CursorId, isVisible: boolean) => void;
    setCountdownInitialValue: (value: number) => void;
    getCountdownInitialValue: () => number;
    getTimerState: () => TimerState;
    setTimerState: (state: TimerState) => void;
    setSoundPlayDelayMs: (delayMs: number) => void;
};

type RegisterMainIpcHandlersOptions = {
    ipcMain: IpcMain;
    windowManager: WindowManagerApi;
    joyConRumbleApi: JoyConRumbleApi;
    state: MainIpcStateAccessors;
    toggleTimerWindowVisibility: () => void;
};

type RegisterOnChannel = (channel: string, handler: (event: IpcMainEvent, ...args: unknown[]) => void) => void;

/**
 * 関連ウィンドウへメッセージを配信する。
 * @param windowManager ウィンドウ管理 API
 * @param channel チャネル名
 * @param payload ペイロード
 */
function broadcastToAppWindows(windowManager: WindowManagerApi, channel: string, payload: unknown): void {
    [windowManager.getCursorWindow(), windowManager.getTimerWindow(), windowManager.getMainWindow()].forEach((win: BrowserWindow | null): void => {
        if (win && !win.isDestroyed()) {
            win.webContents.send(channel, payload);
        }
    });
}

/**
 * カーソル・タイマー設定更新系 IPC を登録する。
 * @param registerOnChannel 多重登録防止付き登録関数
 * @param options 登録オプション
 */
function registerStateSyncHandlers(registerOnChannel: RegisterOnChannel, options: RegisterMainIpcHandlersOptions): void {
    const { state, windowManager } = options;

    registerOnChannel('cursor-map-config', (_event: IpcMainEvent, config: unknown): void => {
        const nextConfig = config as CursorMapConfig;
        state.setCursorMapConfig(nextConfig);
        // console.log('[main.ts] Received cursorMapConfig from renderer:', nextConfig);
    });

    registerOnChannel('cursor-visibility-update', (_event: IpcMainEvent, data: unknown): void => {
        const typedData = data as { id: CursorId; isVisible: boolean };
        state.setCursorVisibility(typedData.id, typedData.isVisible);
    });

    registerOnChannel('countdown-initial-value', (_event: IpcMainEvent, value: unknown): void => {
        state.setCountdownInitialValue(value as number);
        // console.log(`[main.ts] Received countdown initial value: ${state.getCountdownInitialValue()}`);
        broadcastToAppWindows(windowManager, 'update-countdown-initial-value', state.getCountdownInitialValue());
    });

    registerOnChannel('update-timer-presets', (_event: IpcMainEvent, presets: unknown): void => {
        const typedPresets = presets as number[];
        // console.log(`[main.ts] Received timer presets: ${typedPresets}`);
        broadcastToAppWindows(windowManager, 'update-timer-presets', typedPresets);
    });

    registerOnChannel('update-timer-notifications', (_event: IpcMainEvent, configs: unknown): void => {
        const typedConfigs = configs as TimerNotificationConfig[];
        // console.log('[main.ts] Received timer notifications update:', typedConfigs);
        broadcastToAppWindows(windowManager, 'update-timer-notifications', typedConfigs);
    });
}

/**
 * タイマー関連の IPC を登録する。
 * @param registerOnChannel 多重登録防止付き登録関数
 * @param options 登録オプション
 */
function registerTimerHandlers(registerOnChannel: RegisterOnChannel, options: RegisterMainIpcHandlersOptions): void {
    const { ipcMain, state, windowManager, toggleTimerWindowVisibility, joyConRumbleApi } = options;

    registerOnChannel('update-sound-play-delay', (_event: IpcMainEvent, delayMs: unknown): void => {
        const parsedDelay = delayMs as number;
        const normalizedDelay = Number.isNaN(parsedDelay) ? 200 : Math.min(Math.max(parsedDelay, 0), 5000);
        state.setSoundPlayDelayMs(normalizedDelay);
        const timerWindow = windowManager.getTimerWindow();
        if (timerWindow && !timerWindow.isDestroyed()) {
            timerWindow.webContents.send('update-sound-play-delay', normalizedDelay);
        }
    });

    registerTimerIpcHandlers(ipcMain, {
        onStatusUpdate: (isCountingUpdate: boolean): void => {
            // console.log(`[main.ts] Timer status update: ${isCountingUpdate}`);
            state.setTimerState(setTimerCounting(state.getTimerState(), isCountingUpdate));
        },
        onPauseUpdate: (isPausedUpdate: boolean): void => {
            // console.log(`[main.ts] Timer pause update: ${isPausedUpdate}`);
            state.setTimerState(setTimerPaused(state.getTimerState(), isPausedUpdate));
        },
    });

    registerOnChannel('hide-timer-window', (): void => {
        const timerWindow = windowManager.getTimerWindow();
        if (timerWindow && !timerWindow.isDestroyed()) {
            timerWindow.hide();
        }
    });

    registerOnChannel('toggle-timer-window', (): void => {
        // console.log('[Main] Received toggle-timer-window IPC from renderer.');
        toggleTimerWindowVisibility();
    });

    registerOnChannel('timer-countdown-update', (_event: IpcMainEvent, remainingTime: unknown): void => {
        const mainWindow = windowManager.getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('main-timer-update', remainingTime as number);
        }
    });

    registerOnChannel('timer-notification-trigger', (_event: IpcMainEvent, _seconds: unknown, shouldRumble: unknown): void => {
        if (shouldRumble as boolean) {
            joyConRumbleApi.playRumblePattern(createStrongTripleRumblePattern());
        }
    });
}

/**
 * main プロセス用の IPC ハンドラ群を登録する。
 * @param options 依存と状態アクセサ
 */
export function registerMainIpcHandlers(options: RegisterMainIpcHandlersOptions): void {
    const { ipcMain } = options;

    const registerOnChannel: RegisterOnChannel = (channel: string, handler: (event: IpcMainEvent, ...args: unknown[]) => void): void => {
        if (!ipcMain.listenerCount(channel)) {
            ipcMain.on(channel, handler);
        }
    };

    registerStateSyncHandlers(registerOnChannel, options);
    registerTimerHandlers(registerOnChannel, options);
}
