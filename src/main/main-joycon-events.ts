import { BrowserWindow } from 'electron';
import { CursorId, ImuData, PointerPositions, decidePointerUpdate } from './imu-pointer';
import { RStickAction, RStickConfig, RStickState, decideRStickAnalog, decideRStickPress } from './r-stick-handler';
import { getScreenSize } from './screen-state';
import {
    AttitudeData,
    BatteryStatus,
    CalibrationStatus,
    JoyConButtonStateData,
    JoyConCursorIdData,
    JoyConStickAnalogData,
    JoyConEventsContext,
    JoyConStatus,
    RegisterMainJoyConEventsOptions,
} from './main-joycon-events-types';

/**
 * カーソル ID かどうかを判定する。
 * @param value 判定対象
 * @returns カーソル ID の場合は true
 */
function isCursorId(value: unknown): value is CursorId {
    return value === 'cursorLeft' || value === 'cursorRight';
}

/**
 * ウィンドウが有効な場合に IPC を送る。
 * @param win 対象ウィンドウ
 * @param channel チャネル名
 * @param payload ペイロード
 */
function sendToWindow(win: BrowserWindow | null, channel: string, payload?: unknown): void {
    if (!win || win.isDestroyed()) {
        return;
    }
    if (payload === undefined) {
        win.webContents.send(channel);
        return;
    }
    win.webContents.send(channel, payload);
}

/**
 * タイマーウィンドウのロード完了を待ってメッセージを送る。
 * @param timerWindow タイマーウィンドウ
 * @param channel チャネル名
 * @param payload ペイロード
 */
function sendToTimerWhenReady(timerWindow: BrowserWindow, channel: string, payload: unknown): void {
    timerWindow.show();
    if (timerWindow.webContents.isLoading()) {
        timerWindow.webContents.once('did-finish-load', () => {
            if (timerWindow && !timerWindow.isDestroyed()) {
                timerWindow.webContents.send(channel, payload);
            }
        });
        return;
    }
    timerWindow.webContents.send(channel, payload);
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
    actions.forEach((action: RStickAction): void => {
        const targetWindow = action.target === 'timer' ? timerWindow : cursorWindow;
        sendToWindow(targetWindow, action.channel, action.payload);
    });
}

/**
 * IMU データイベントを登録する。
 * @param context イベント登録コンテキスト
 */
function registerImuHandlers(context: JoyConEventsContext): void {
    const { options } = context;
    const { joyConManager, imuProcessor, windowManager } = options;

    joyConManager.on('imu-data', (data: unknown): void => {
        const imuData = data as ImuData;
        const cursorId = (imuData.id === 'R' || imuData.id === 'cursorRight') ? 'cursorRight' : 'cursorLeft';
        imuProcessor.update({ id: cursorId, accel: imuData.accel, gyro: imuData.gyro });

        const state = imuProcessor.states[cursorId];
        const g = globalThis as typeof globalThis & { pointerPositions?: PointerPositions };
        if (!g.pointerPositions) {
            g.pointerPositions = { cursorLeft: { x: 600, y: 300 }, cursorRight: { x: 600, y: 300 } };
        }

        const decision = decidePointerUpdate({
            data: imuData,
            cursorId,
            cursorVisible: options.getCursorVisibility(cursorId),
            isCalibrating: imuProcessor.isCalibrating[cursorId],
            gyroBias: { x: state.gyroBiasX, y: state.gyroBiasY, z: state.gyroBiasZ },
            cursorMapConfig: options.getCursorMapConfig(),
            currentPosition: g.pointerPositions[cursorId],
            defaultPosition: { x: 600, y: 300 },
            screenSize: getScreenSize(),
            moveSpeed: 0.1,
            gyroDeadzone: 90,
        });

        if (!decision) {
            return;
        }
        if (decision.configMissing) {
            // console.warn(`[main.ts] cursorMapConfig for ${cursorId} is undefined. Using default signs.`);
        }
        g.pointerPositions[cursorId] = decision.position;
        sendToWindow(windowManager.getCursorWindow(), 'update-pointer', decision.sendPayload);
    });

    imuProcessor.on('attitude-update', (attitudeData: unknown): void => {
        sendToWindow(windowManager.getCursorWindow(), 'joycon-attitude', attitudeData as AttitudeData);
    });

    imuProcessor.on('calibration-status', (statusInfo: unknown): void => {
        sendToWindow(windowManager.getMainWindow(), 'calibration-status-update', statusInfo as CalibrationStatus);
    });
}

/**
 * ステータス・バッテリー通知イベントを登録する。
 * @param context イベント登録コンテキスト
 */
function registerStatusHandlers(context: JoyConEventsContext): void {
    const { joyConManager, windowManager } = context.options;

    joyConManager.on('status-update', (status: unknown): void => {
        sendToWindow(windowManager.getMainWindow(), 'joycon-status-update', status as JoyConStatus);
    });

    joyConManager.on('battery-status-update', (status: unknown): void => {
        sendToWindow(windowManager.getMainWindow(), 'joycon-battery-status-update', status as BatteryStatus);
    });
}

/**
 * ボタン押下イベントを登録する。
 * @param context イベント登録コンテキスト
 */
function registerButtonHandlers(context: JoyConEventsContext): void {
    const { joyConManager, imuProcessor, windowManager, ensureTimerWindow, toggleTimerWindowVisibility } = context.options;

    const forwardMap: Record<string, string> = {
        'button-x': 'joycon-button-x',
        'button-down': 'joycon-button-down',
        'button-plus': 'joycon-button-plus',
    };

    Object.keys(forwardMap).forEach((eventName: string): void => {
        joyConManager.on(eventName, (data: unknown): void => {
            sendToWindow(windowManager.getCursorWindow(), forwardMap[eventName], data as JoyConButtonStateData);
        });
    });

    joyConManager.on('button-x-pressed', (data: unknown): void => {
        const typedData = data as JoyConCursorIdData;
        // console.log(`[Main] button-x-pressed received for ${typedData?.id}`);
        if (isCursorId(typedData.id)) {
            imuProcessor.recenter(typedData.id);
        }
        sendToWindow(windowManager.getCursorWindow(), 'button-x-pressed', typedData);
    });

    joyConManager.on('button-plus-pressed', (data: unknown): void => {
        const typedData = data as JoyConCursorIdData;
        // console.log(`[Main] button-plus-pressed received for ${typedData?.id}. Toggle logic.`);
        toggleTimerWindowVisibility();
        sendToWindow(windowManager.getTimerWindow(), 'button-plus-pressed', typedData);
    });

    ['button-minus-pressed', 'button-sr-pressed'].forEach((eventName: string): void => {
        joyConManager.on(eventName, (data: unknown): void => {
            const typedData = data as JoyConCursorIdData;
            // console.log(`[Main] ${eventName} received from JoyConManager for ${typedData?.id}`);
            const timerWindow = ensureTimerWindow();
            if (timerWindow && !timerWindow.isDestroyed()) {
                sendToTimerWhenReady(timerWindow, eventName, typedData);
            }
        });
    });

    joyConManager.on('button-down-pressed', (data: unknown): void => {
        const typedData = data as JoyConCursorIdData;
        // console.log(`[Main] button-down-pressed received for ${typedData?.id} -> calling imuProcessor.recenter`);
        if (isCursorId(typedData.id)) {
            imuProcessor.recenter(typedData.id);
        }
        sendToWindow(windowManager.getCursorWindow(), 'button-down-pressed', typedData);
    });

    joyConManager.on('button-home-pressed', (data: unknown): void => {
        const typedData = data as JoyConCursorIdData;
        if (typedData.id === 'cursorRight') {
            // console.log('[Main] R Joy-Con Home button pressed. Closing cursor window.');
            windowManager.closeCursorWindow();
        }
    });
}

/**
 * R スティックイベントを登録する。
 * @param context イベント登録コンテキスト
 */
function registerRStickHandlers(context: JoyConEventsContext): void {
    const { joyConManager, windowManager, ensureTimerWindow } = context.options;

    joyConManager.on('r-stick', (data: unknown): void => {
        const decision = decideRStickPress({
            pressed: (data as JoyConButtonStateData).pressed,
            now: Date.now(),
            state: context.rStickState,
            config: context.rStickConfig,
        });
        context.setRStickState(decision.state);
        const timerWindow = decision.shouldEnsureTimerWindow ? ensureTimerWindow() : null;
        context.dispatchRStickActions(decision.actions, timerWindow, windowManager.getCursorWindow());
    });

    joyConManager.on('r-stick-analog', (data: unknown): void => {
        const decision = decideRStickAnalog({
            analog: data as JoyConStickAnalogData,
            now: Date.now(),
            state: context.rStickState,
            config: context.rStickConfig,
        });
        context.setRStickState(decision.state);
        const timerWindow = decision.shouldEnsureTimerWindow ? ensureTimerWindow() : null;
        context.dispatchRStickActions(decision.actions, timerWindow, windowManager.getCursorWindow());
    });
}

/**
 * プレゼン送りイベントを登録する。
 * @param context イベント登録コンテキスト
 */
function registerPresentationHandlers(context: JoyConEventsContext): void {
    const { joyConManager, powerpointControl, googleSlidesControl } = context.options;

    joyConManager.on('ppt-next', (): void => {
        const handled = powerpointControl.next();
        if (!handled) {
            googleSlidesControl.next();
        }
    });

    joyConManager.on('ppt-prev', (): void => {
        const handled = powerpointControl.previous();
        if (!handled) {
            googleSlidesControl.previous();
        }
    });
}

/**
 * Joy-Con と IMU のイベントを main プロセスへ登録する。
 * @param options 登録に必要な依存
 */
export function registerMainJoyConEvents(options: RegisterMainJoyConEventsOptions): void {
    const rStickConfig: RStickConfig = {
        fontSizeChangeAmount: 2,
        fontSizeChangeInterval: 100,
        analogCenter: 2048,
        fontSizeDeadzone: 200,
        navDeadzone: 600,
    };
    let rStickState: RStickState = {
        isPressed: false,
        lastAnalogData: null,
        lastFontSizeChangeTime: 0,
        isTimerMenuNavActive: false,
    };
    const context: JoyConEventsContext = {
        options,
        rStickConfig,
        rStickState,
        setRStickState: (state: RStickState): void => { rStickState = state; context.rStickState = state; },
        dispatchRStickActions,
    };

    registerImuHandlers(context);
    registerStatusHandlers(context);
    registerButtonHandlers(context);
    registerRStickHandlers(context);
    registerPresentationHandlers(context);
}
