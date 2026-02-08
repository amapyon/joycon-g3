import { BrowserWindow, IpcMain, IpcMainEvent } from 'electron';
import { createStrongTripleRumblePattern, RumbleStep } from './rumble-pattern';
import { registerTimerIpcHandlers } from './timer-ipc';
import { CursorId, CursorMapConfig } from './imu-pointer';
import { setTimerCounting, setTimerPaused, TimerState } from './timer-state';

type TimerNotificationConfig = Record<string, unknown>;

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

/**
 * main プロセス用の IPC ハンドラ群を登録する。
 * @param options 依存と状態アクセサ
 */
export function registerMainIpcHandlers(options: RegisterMainIpcHandlersOptions): void {
    const {
        ipcMain,
        windowManager,
        joyConRumbleApi,
        state,
        toggleTimerWindowVisibility,
    } = options;

    /**
     * 指定チャネルを多重登録せずに登録する。
     * @param channel チャネル名
     * @param handler ハンドラ
     */
    const registerOnChannel = (channel: string, handler: (event: IpcMainEvent, ...args: unknown[]) => void): void => {
        if (!ipcMain.listenerCount(channel)) {
            ipcMain.on(channel, handler);
        }
    };

    /**
     * 関連ウィンドウへメッセージを配信する。
     * @param channel チャネル名
     * @param payload ペイロード
     */
    const broadcastToAppWindows = (channel: string, payload: unknown): void => {
        [windowManager.getCursorWindow(), windowManager.getTimerWindow(), windowManager.getMainWindow()].forEach((win: BrowserWindow | null): void => {
            if (win && !win.isDestroyed()) {
                win.webContents.send(channel, payload);
            }
        });
    };

    registerOnChannel('cursor-map-config', (event: IpcMainEvent, config: unknown): void => {
        void event;
        const nextConfig = config as CursorMapConfig;
        state.setCursorMapConfig(nextConfig);
        console.log('[main.ts] Received cursorMapConfig from renderer:', nextConfig);
    });

    registerOnChannel('cursor-visibility-update', (event: IpcMainEvent, data: unknown): void => {
        void event;
        const typedData = data as { id: CursorId; isVisible: boolean };
        state.setCursorVisibility(typedData.id, typedData.isVisible);
    });

    registerOnChannel('countdown-initial-value', (event: IpcMainEvent, value: unknown): void => {
        void event;
        const nextValue = value as number;
        state.setCountdownInitialValue(nextValue);
        console.log(`[main.ts] Received countdown initial value: ${state.getCountdownInitialValue()}`);
        broadcastToAppWindows('update-countdown-initial-value', state.getCountdownInitialValue());
    });

    registerOnChannel('update-timer-presets', (event: IpcMainEvent, presets: unknown): void => {
        void event;
        const typedPresets = presets as number[];
        console.log(`[main.ts] Received timer presets: ${typedPresets}`);
        broadcastToAppWindows('update-timer-presets', typedPresets);
    });

    registerOnChannel('update-timer-notifications', (event: IpcMainEvent, configs: unknown): void => {
        void event;
        const typedConfigs = configs as TimerNotificationConfig[];
        console.log('[main.ts] Received timer notifications update:', typedConfigs);
        broadcastToAppWindows('update-timer-notifications', typedConfigs);
    });

    registerOnChannel('update-sound-play-delay', (event: IpcMainEvent, delayMs: unknown): void => {
        void event;
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
            console.log(`[main.ts] Timer status update: ${isCountingUpdate}`);
            state.setTimerState(setTimerCounting(state.getTimerState(), isCountingUpdate));
        },
        onPauseUpdate: (isPausedUpdate: boolean): void => {
            console.log(`[main.ts] Timer pause update: ${isPausedUpdate}`);
            state.setTimerState(setTimerPaused(state.getTimerState(), isPausedUpdate));
        },
    });

    registerOnChannel('hide-timer-window', (event: IpcMainEvent): void => {
        void event;
        const timerWindow = windowManager.getTimerWindow();
        if (timerWindow && !timerWindow.isDestroyed()) {
            timerWindow.hide();
        }
    });

    registerOnChannel('toggle-timer-window', (event: IpcMainEvent): void => {
        void event;
        console.log('[Main] Received toggle-timer-window IPC from renderer.');
        toggleTimerWindowVisibility();
    });

    registerOnChannel('timer-countdown-update', (event: IpcMainEvent, remainingTime: unknown): void => {
        void event;
        const mainWindow = windowManager.getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('main-timer-update', remainingTime as number);
        }
    });

    registerOnChannel('timer-notification-trigger', (event: IpcMainEvent, seconds: unknown, shouldRumble: unknown): void => {
        void event;
        void seconds;
        if (shouldRumble as boolean) {
            joyConRumbleApi.playRumblePattern(createStrongTripleRumblePattern());
        }
    });
}
