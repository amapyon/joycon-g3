import { BrowserWindow, IpcMain, IpcMainEvent } from 'electron';
import { createStrongTripleRumblePattern, RumbleStep } from './rumble-pattern';
import { registerTimerIpcHandlers } from './timer-ipc';
import { CursorId, CursorMapConfig } from './imu-pointer';
import { setTimerCounting, setTimerPaused, setTimerWindowMode, TimerState, TimerWindowMode } from './timer-state';
import { isCursorId, isRecord, parseNumberArrayPayload, parseNumberPayload } from './payload-parse-utils';
import { MAIN_IPC_INBOUND_CHANNELS, MAIN_IPC_OUTBOUND_CHANNELS } from '../shared/main-ipc-channels';
import { normalizePointerMotionSettings, PointerMotionSettings } from '../shared/pointer-motion-settings';
import type { TimerNotificationConfig } from '../shared/timer-notification-config';
import type { WifiTimerSettings } from '../shared/wifi-timer-settings';
import type { WifiTimerClientApi } from './wifi-timer-client';

type WindowManagerApi = {
    getCursorWindow: () => BrowserWindow | null;
    getTimerWindow: () => BrowserWindow | null;
    getMainWindow: () => BrowserWindow | null;
};

type JoyConRumbleApi = {
    playRumblePattern: (pattern: RumbleStep[]) => void;
    getConnectionStatus?: () => { leftConnected: boolean; rightConnected: boolean };
    connectAll?: () => void;
};

type MainIpcStateAccessors = {
    setCursorMapConfig: (config: CursorMapConfig) => void;
    setPointerMotionSettings: (settings: PointerMotionSettings) => void;
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
    wifiTimerClient: WifiTimerClientApi;
    state: MainIpcStateAccessors;
    toggleTimerWindowVisibility: () => void;
    ensureTimerWindow?: () => BrowserWindow | null;
};

type RegisterOnChannel = (channel: string, handler: (event: IpcMainEvent, ...args: unknown[]) => void) => void;
type CursorVisibilityPayload = { id: CursorId; isVisible: boolean };

/**
 * タイマーウィンドウの表示モードを検証する。
 * @param value 入力値
 * @returns 表示モード。無効な場合は null
 */
function parseTimerWindowMode(value: unknown): TimerWindowMode | null {
    if (value === 'setup' || value === 'timer' || value === 'clock') {
        return value;
    }
    return null;
}

/**
 * タイマーウィンドウへ表示モードを送信する。
 * @param timerWindow タイマーウィンドウ
 * @param mode 表示モード
 */
function sendTimerWindowMode(timerWindow: BrowserWindow, mode: TimerWindowMode): void {
    const sendMode = (): void => {
        if (!timerWindow.isDestroyed()) {
            timerWindow.webContents.send('set-timer-mode', mode);
        }
    };
    if (timerWindow.webContents.isLoading()) {
        timerWindow.webContents.once('did-finish-load', sendMode);
        return;
    }
    sendMode();
}

/**
 * WiFi タイマー設定を解析する。
 * @param value 入力値
 * @returns 設定。無効な場合は null
 */
function parseWifiTimerSettings(value: unknown): WifiTimerSettings | null {
    if (!isRecord(value) || typeof value.enabled !== 'boolean' || typeof value.ipAddress !== 'string') {
        return null;
    }
    return {
        enabled: value.enabled,
        ipAddress: value.ipAddress.trim(),
    };
}

/**
 * 単一のタイマー通知設定を解析する。
 * @param value 入力値
 * @returns 通知設定。無効な場合は null
 */
function parseTimerNotificationConfigItem(value: unknown): TimerNotificationConfig | null {
    if (!isRecord(value)) {
        return null;
    }
    const parsedTime = parseNumberPayload(value.time);
    if (parsedTime === null || typeof value.filename !== 'string' || typeof value.absolutePath !== 'string') {
        return null;
    }
    if (value.rumble !== undefined && typeof value.rumble !== 'boolean') {
        return null;
    }
    return {
        time: parsedTime,
        filename: value.filename,
        absolutePath: value.absolutePath,
        rumble: value.rumble,
    };
}

/**
 * ポインター移動設定を解析する。
 * @param value 入力値
 * @returns 設定。無効な場合は null
 */
function parsePointerMotionSettings(value: unknown): PointerMotionSettings | null {
    if (!isRecord(value)) {
        return null;
    }
    const moveSpeed = parseNumberPayload(value.moveSpeed);
    const gyroDeadzone = parseNumberPayload(value.gyroDeadzone);
    if (moveSpeed === null || gyroDeadzone === null) {
        return null;
    }
    return normalizePointerMotionSettings({ moveSpeed, gyroDeadzone });
}

/**
 * タイマー通知設定配列を解析する。
 * @param value 入力値
 * @returns 通知設定配列。無効な場合は null
 */
function parseTimerNotificationConfigs(value: unknown): TimerNotificationConfig[] | null {
    if (!Array.isArray(value)) {
        return null;
    }
    const parsedConfigs: TimerNotificationConfig[] = [];
    for (const item of value) {
        const parsedItem = parseTimerNotificationConfigItem(item);
        if (!parsedItem) {
            return null;
        }
        parsedConfigs.push(parsedItem);
    }
    return parsedConfigs;
}

/**
 * カーソル可視状態ペイロードを解析する。
 * @param value 入力値
 * @returns 可視状態。無効な場合は null
 */
function parseCursorVisibilityPayload(value: unknown): CursorVisibilityPayload | null {
    if (!isRecord(value)) {
        return null;
    }
    if (!isCursorId(value.id) || typeof value.isVisible !== 'boolean') {
        return null;
    }
    return { id: value.id, isVisible: value.isVisible };
}

/**
 * カーソルマップ設定を解析する。
 * @param value 入力値
 * @returns カーソルマップ設定。無効な場合は null
 */
function parseCursorMapConfig(value: unknown): CursorMapConfig | null {
    if (!isRecord(value)) {
        return null;
    }
    const nextConfig: CursorMapConfig = {};
    const cursorIds: CursorId[] = ['cursorLeft', 'cursorRight'];
    cursorIds.forEach((cursorId: CursorId): void => {
        const entry = value[cursorId];
        if (!isRecord(entry)) {
            return;
        }
        const xSign = parseNumberPayload(entry.xSign);
        const ySign = parseNumberPayload(entry.ySign);
        if (xSign === null || ySign === null) {
            return;
        }
        nextConfig[cursorId] = {
            xSign,
            ySign,
        };
    });
    return nextConfig;
}

/**
 * 振動実行前に Joy-Con 接続状態を確認し、必要なら再接続を試行する。
 * @param joyConRumbleApi Joy-Con 振動 API
 * @returns 振動を続行できる場合は true
 */
function ensureJoyConReadyForRumble(joyConRumbleApi: JoyConRumbleApi): boolean {
    if (!joyConRumbleApi.getConnectionStatus || !joyConRumbleApi.connectAll) {
        return true;
    }
    const status = joyConRumbleApi.getConnectionStatus();
    if (status.leftConnected || status.rightConnected) {
        return true;
    }
    joyConRumbleApi.connectAll();
    return false;
}

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
    const { state, windowManager, wifiTimerClient } = options;

    registerOnChannel(MAIN_IPC_INBOUND_CHANNELS.CURSOR_MAP_CONFIG, (_event: IpcMainEvent, config: unknown): void => {
        const nextConfig = parseCursorMapConfig(config);
        if (!nextConfig) {
            return;
        }
        state.setCursorMapConfig(nextConfig);
        // console.log('[main.ts] Received cursorMapConfig from renderer:', nextConfig);
    });

    registerOnChannel(MAIN_IPC_INBOUND_CHANNELS.UPDATE_POINTER_MOTION_SETTINGS, (_event: IpcMainEvent, settings: unknown): void => {
        const nextSettings = parsePointerMotionSettings(settings);
        if (!nextSettings) {
            return;
        }
        state.setPointerMotionSettings(nextSettings);
    });

    registerOnChannel(MAIN_IPC_INBOUND_CHANNELS.CURSOR_VISIBILITY_UPDATE, (_event: IpcMainEvent, data: unknown): void => {
        const typedData = parseCursorVisibilityPayload(data);
        if (!typedData) {
            return;
        }
        state.setCursorVisibility(typedData.id, typedData.isVisible);
    });

    registerOnChannel(MAIN_IPC_INBOUND_CHANNELS.COUNTDOWN_INITIAL_VALUE, (_event: IpcMainEvent, value: unknown): void => {
        const nextValue = parseNumberPayload(value);
        if (nextValue === null) {
            return;
        }
        state.setCountdownInitialValue(nextValue);
        // console.log(`[main.ts] Received countdown initial value: ${state.getCountdownInitialValue()}`);
        broadcastToAppWindows(windowManager, MAIN_IPC_OUTBOUND_CHANNELS.UPDATE_COUNTDOWN_INITIAL_VALUE, state.getCountdownInitialValue());
        void wifiTimerClient.syncInitialValue(state.getCountdownInitialValue()).catch(() => undefined);
    });

    registerOnChannel(MAIN_IPC_INBOUND_CHANNELS.UPDATE_TIMER_PRESETS, (_event: IpcMainEvent, presets: unknown): void => {
        const typedPresets = parseNumberArrayPayload(presets);
        if (!typedPresets) {
            return;
        }
        // console.log(`[main.ts] Received timer presets: ${typedPresets}`);
        broadcastToAppWindows(windowManager, MAIN_IPC_OUTBOUND_CHANNELS.UPDATE_TIMER_PRESETS, typedPresets);
    });

    registerOnChannel(MAIN_IPC_INBOUND_CHANNELS.UPDATE_TIMER_NOTIFICATIONS, (_event: IpcMainEvent, configs: unknown): void => {
        const typedConfigs = parseTimerNotificationConfigs(configs);
        if (!typedConfigs) {
            return;
        }
        // console.log('[main.ts] Received timer notifications update:', typedConfigs);
        broadcastToAppWindows(windowManager, MAIN_IPC_OUTBOUND_CHANNELS.UPDATE_TIMER_NOTIFICATIONS, typedConfigs);
    });

    registerOnChannel(MAIN_IPC_INBOUND_CHANNELS.UPDATE_WIFI_TIMER_SETTINGS, (_event: IpcMainEvent, settings: unknown): void => {
        const typedSettings = parseWifiTimerSettings(settings);
        if (!typedSettings) {
            return;
        }
        wifiTimerClient.updateSettings(typedSettings);
    });
}

/**
 * タイマー関連の IPC を登録する。
 * @param registerOnChannel 多重登録防止付き登録関数
 * @param options 登録オプション
 */
function registerTimerHandlers(registerOnChannel: RegisterOnChannel, options: RegisterMainIpcHandlersOptions): void {
    const { ipcMain, state, windowManager, toggleTimerWindowVisibility, ensureTimerWindow, joyConRumbleApi, wifiTimerClient } = options;

    registerOnChannel(MAIN_IPC_INBOUND_CHANNELS.UPDATE_SOUND_PLAY_DELAY, (_event: IpcMainEvent, delayMs: unknown): void => {
        const parsedDelay = parseNumberPayload(delayMs);
        const normalizedDelay = parsedDelay === null ? 200 : Math.min(Math.max(parsedDelay, 0), 5000);
        state.setSoundPlayDelayMs(normalizedDelay);
        const timerWindow = windowManager.getTimerWindow();
        if (timerWindow && !timerWindow.isDestroyed()) {
            timerWindow.webContents.send(MAIN_IPC_OUTBOUND_CHANNELS.UPDATE_SOUND_PLAY_DELAY, normalizedDelay);
        }
    });

    registerTimerIpcHandlers(ipcMain, {
        onStatusUpdate: (isCountingUpdate: boolean): void => {
            // console.log(`[main.ts] Timer status update: ${isCountingUpdate}`);
            const previousState = state.getTimerState();
            state.setTimerState(setTimerCounting(state.getTimerState(), isCountingUpdate));
            if (!previousState.isCounting && isCountingUpdate) {
                void wifiTimerClient.handleTimerStarted(state.getCountdownInitialValue()).catch(() => undefined);
            }
        },
        onPauseUpdate: (isPausedUpdate: boolean): void => {
            // console.log(`[main.ts] Timer pause update: ${isPausedUpdate}`);
            const previousState = state.getTimerState();
            state.setTimerState(setTimerPaused(state.getTimerState(), isPausedUpdate));
            if (!previousState.isCounting) {
                return;
            }
            if (isPausedUpdate) {
                void wifiTimerClient.handleTimerPaused().catch(() => undefined);
                return;
            }
            if (previousState.isPaused) {
                void wifiTimerClient.handleTimerResumed().catch(() => undefined);
            }
        },
    });

    registerOnChannel(MAIN_IPC_INBOUND_CHANNELS.HIDE_TIMER_WINDOW, (): void => {
        const timerWindow = windowManager.getTimerWindow();
        if (timerWindow && !timerWindow.isDestroyed()) {
            timerWindow.hide();
        }
    });

    registerOnChannel(MAIN_IPC_INBOUND_CHANNELS.TOGGLE_TIMER_WINDOW, (): void => {
        // console.log('[Main] Received toggle-timer-window IPC from renderer.');
        toggleTimerWindowVisibility();
    });

    registerOnChannel(MAIN_IPC_INBOUND_CHANNELS.SHOW_CLOCK_TIMER_WINDOW, (): void => {
        state.setTimerState(setTimerWindowMode(state.getTimerState(), 'clock'));
        const timerWindow = ensureTimerWindow ? ensureTimerWindow() : windowManager.getTimerWindow();
        if (!timerWindow || timerWindow.isDestroyed()) {
            return;
        }
        timerWindow.show();
        sendTimerWindowMode(timerWindow, 'clock');
    });

    registerOnChannel(MAIN_IPC_INBOUND_CHANNELS.TIMER_DISPLAY_MODE_UPDATE, (_event: IpcMainEvent, mode: unknown): void => {
        const parsedMode = parseTimerWindowMode(mode);
        if (!parsedMode) {
            return;
        }
        state.setTimerState(setTimerWindowMode(state.getTimerState(), parsedMode));
    });

    registerOnChannel(MAIN_IPC_INBOUND_CHANNELS.TIMER_COUNTDOWN_UPDATE, (_event: IpcMainEvent, remainingTime: unknown): void => {
        const parsedRemaining = parseNumberPayload(remainingTime);
        if (parsedRemaining === null) {
            return;
        }
        const mainWindow = windowManager.getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send(MAIN_IPC_OUTBOUND_CHANNELS.MAIN_TIMER_UPDATE, parsedRemaining);
        }
    });

    registerOnChannel(MAIN_IPC_INBOUND_CHANNELS.TIMER_NOTIFICATION_TRIGGER, (_event: IpcMainEvent, _seconds: unknown, shouldRumble: unknown): void => {
        if (shouldRumble === true) {
            if (!ensureJoyConReadyForRumble(joyConRumbleApi)) {
                return;
            }
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
