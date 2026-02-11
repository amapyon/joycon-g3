import { BrowserWindow } from 'electron';
import { ImuData, PointerPositions, decidePointerUpdate } from './imu-pointer';
import { RStickAction, RStickConfig, RStickState, decideRStickAnalog, decideRStickPress } from './r-stick-handler';
import { getScreenSize } from './screen-state';
import { isUsableWindow } from './browser-window-utils';
import { isCursorId, isFiniteNumber, isRecord } from './payload-parse-utils';
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

let pointerPositions: PointerPositions | null = null;

/**
 * 3次元ベクトルを解析する。
 * @param value 入力値
 * @returns 解析結果。無効な場合は null
 */
function parseVector3(value: unknown): { x: number; y: number; z: number } | null {
    if (!isRecord(value) || !isFiniteNumber(value.x) || !isFiniteNumber(value.y) || !isFiniteNumber(value.z)) {
        return null;
    }
    return { x: value.x, y: value.y, z: value.z };
}

/**
 * IMU データを解析する。
 * @param value 入力値
 * @returns 解析結果。無効な場合は null
 */
function parseImuData(value: unknown): ImuData | null {
    if (!isRecord(value) || typeof value.id !== 'string') {
        return null;
    }
    const accel = parseVector3(value.accel);
    const gyro = parseVector3(value.gyro);
    if (!accel || !gyro) {
        return null;
    }
    return { id: value.id, accel, gyro };
}

/**
 * Joy-Con ボタン状態ペイロードを解析する。
 * @param value 入力値
 * @returns 解析結果。無効な場合は null
 */
function parseJoyConButtonStateData(value: unknown): JoyConButtonStateData | null {
    if (!isRecord(value) || typeof value.pressed !== 'boolean') {
        return null;
    }
    return { pressed: value.pressed };
}

/**
 * Joy-Con ボタン押下元ペイロードを解析する。
 * @param value 入力値
 * @returns 解析結果。無効な場合は null
 */
function parseJoyConCursorIdData(value: unknown): JoyConCursorIdData | null {
    if (!isRecord(value) || !isCursorId(value.id)) {
        return null;
    }
    return { id: value.id };
}

/**
 * Joy-Con スティックアナログ値ペイロードを解析する。
 * @param value 入力値
 * @returns 解析結果。無効な場合は null
 */
function parseJoyConStickAnalogData(value: unknown): JoyConStickAnalogData | null {
    if (!isRecord(value) || !isFiniteNumber(value.x) || !isFiniteNumber(value.y)) {
        return null;
    }
    return { x: value.x, y: value.y };
}

/**
 * Joy-Con 姿勢データを解析する。
 * @param value 入力値
 * @returns 解析結果。無効な場合は null
 */
function parseAttitudeData(value: unknown): AttitudeData | null {
    if (!isRecord(value)) {
        return null;
    }
    if (!isCursorId(value.id) || !isFiniteNumber(value.roll) || !isFiniteNumber(value.pitch)) {
        return null;
    }
    if (value.yaw !== undefined && !isFiniteNumber(value.yaw)) {
        return null;
    }
    return {
        id: value.id,
        roll: value.roll,
        pitch: value.pitch,
        yaw: value.yaw,
    };
}

/**
 * キャリブレーション状態を解析する。
 * @param value 入力値
 * @returns 解析結果。無効な場合は null
 */
function parseCalibrationStatus(value: unknown): CalibrationStatus | null {
    if (!isRecord(value) || !isCursorId(value.id) || typeof value.status !== 'string') {
        return null;
    }
    return { id: value.id, status: value.status };
}

/**
 * Joy-Con 接続状態を解析する。
 * @param value 入力値
 * @returns 解析結果。無効な場合は null
 */
function parseJoyConStatus(value: unknown): JoyConStatus | null {
    if (!isRecord(value) || typeof value.leftConnected !== 'boolean' || typeof value.rightConnected !== 'boolean') {
        return null;
    }
    return { leftConnected: value.leftConnected, rightConnected: value.rightConnected };
}

/**
 * Joy-Con バッテリー状態を解析する。
 * @param value 入力値
 * @returns 解析結果。無効な場合は null
 */
function parseBatteryStatus(value: unknown): BatteryStatus | null {
    if (!isRecord(value) || typeof value.isLeft !== 'boolean' || !isFiniteNumber(value.level)) {
        return null;
    }
    return { isLeft: value.isLeft, level: value.level };
}

/**
 * ウィンドウが有効な場合に IPC を送る。
 * @param win 対象ウィンドウ
 * @param channel チャネル名
 * @param payload ペイロード
 */
function sendToWindow(win: BrowserWindow | null, channel: string, payload?: unknown): void {
    if (!isUsableWindow(win)) {
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
            if (isUsableWindow(timerWindow)) {
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
        const imuData = parseImuData(data);
        if (!imuData || (imuData.id !== 'R' && imuData.id !== 'cursorRight' && imuData.id !== 'L' && imuData.id !== 'cursorLeft')) {
            return;
        }
        const cursorId = (imuData.id === 'R' || imuData.id === 'cursorRight') ? 'cursorRight' : 'cursorLeft';
        imuProcessor.update({ id: cursorId, accel: imuData.accel, gyro: imuData.gyro });

        const state = imuProcessor.states[cursorId];
        if (!pointerPositions) {
            pointerPositions = { cursorLeft: { x: 600, y: 300 }, cursorRight: { x: 600, y: 300 } };
        }

        const decision = decidePointerUpdate({
            data: imuData,
            cursorId,
            cursorVisible: options.getCursorVisibility(cursorId),
            isCalibrating: imuProcessor.isCalibrating[cursorId],
            gyroBias: { x: state.gyroBiasX, y: state.gyroBiasY, z: state.gyroBiasZ },
            cursorMapConfig: options.getCursorMapConfig(),
            currentPosition: pointerPositions[cursorId],
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
        pointerPositions[cursorId] = decision.position;
        sendToWindow(windowManager.getCursorWindow(), 'update-pointer', decision.sendPayload);
    });

    imuProcessor.on('attitude-update', (attitudeData: unknown): void => {
        const typedData = parseAttitudeData(attitudeData);
        if (!typedData) {
            return;
        }
        sendToWindow(windowManager.getCursorWindow(), 'joycon-attitude', typedData);
    });

    imuProcessor.on('calibration-status', (statusInfo: unknown): void => {
        const typedStatusInfo = parseCalibrationStatus(statusInfo);
        if (!typedStatusInfo) {
            return;
        }
        sendToWindow(windowManager.getMainWindow(), 'calibration-status-update', typedStatusInfo);
    });
}

/**
 * ステータス・バッテリー通知イベントを登録する。
 * @param context イベント登録コンテキスト
 */
function registerStatusHandlers(context: JoyConEventsContext): void {
    const { joyConManager, windowManager } = context.options;

    joyConManager.on('status-update', (status: unknown): void => {
        const typedStatus = parseJoyConStatus(status);
        if (!typedStatus) {
            return;
        }
        sendToWindow(windowManager.getMainWindow(), 'joycon-status-update', typedStatus);
    });

    joyConManager.on('battery-status-update', (status: unknown): void => {
        const typedStatus = parseBatteryStatus(status);
        if (!typedStatus) {
            return;
        }
        sendToWindow(windowManager.getMainWindow(), 'joycon-battery-status-update', typedStatus);
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
            const typedData = parseJoyConButtonStateData(data);
            if (!typedData) {
                return;
            }
            sendToWindow(windowManager.getCursorWindow(), forwardMap[eventName], typedData);
        });
    });

    joyConManager.on('button-x-pressed', (data: unknown): void => {
        const typedData = parseJoyConCursorIdData(data);
        if (!typedData) {
            return;
        }
        // console.log(`[Main] button-x-pressed received for ${typedData?.id}`);
        if (isCursorId(typedData.id)) {
            imuProcessor.recenter(typedData.id);
        }
        sendToWindow(windowManager.getCursorWindow(), 'button-x-pressed', typedData);
    });

    joyConManager.on('button-plus-pressed', (data: unknown): void => {
        const typedData = parseJoyConCursorIdData(data);
        if (!typedData) {
            return;
        }
        // console.log(`[Main] button-plus-pressed received for ${typedData?.id}. Toggle logic.`);
        toggleTimerWindowVisibility();
        sendToWindow(windowManager.getTimerWindow(), 'button-plus-pressed', typedData);
    });

    ['button-minus-pressed', 'button-sr-pressed'].forEach((eventName: string): void => {
        joyConManager.on(eventName, (data: unknown): void => {
            const typedData = parseJoyConCursorIdData(data);
            if (!typedData) {
                return;
            }
            // console.log(`[Main] ${eventName} received from JoyConManager for ${typedData?.id}`);
            const timerWindow = ensureTimerWindow();
            if (isUsableWindow(timerWindow)) {
                sendToTimerWhenReady(timerWindow, eventName, typedData);
            }
        });
    });

    joyConManager.on('button-down-pressed', (data: unknown): void => {
        const typedData = parseJoyConCursorIdData(data);
        if (!typedData) {
            return;
        }
        // console.log(`[Main] button-down-pressed received for ${typedData?.id} -> calling imuProcessor.recenter`);
        if (isCursorId(typedData.id)) {
            imuProcessor.recenter(typedData.id);
        }
        sendToWindow(windowManager.getCursorWindow(), 'button-down-pressed', typedData);
    });

    joyConManager.on('button-home-pressed', (data: unknown): void => {
        const typedData = parseJoyConCursorIdData(data);
        if (!typedData) {
            return;
        }
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
        const typedData = parseJoyConButtonStateData(data);
        if (!typedData) {
            return;
        }
        const decision = decideRStickPress({
            pressed: typedData.pressed,
            now: Date.now(),
            state: context.rStickState,
            config: context.rStickConfig,
        });
        context.setRStickState(decision.state);
        const timerWindow = decision.shouldEnsureTimerWindow ? ensureTimerWindow() : null;
        context.dispatchRStickActions(decision.actions, timerWindow, windowManager.getCursorWindow());
    });

    joyConManager.on('r-stick-analog', (data: unknown): void => {
        const analogData = parseJoyConStickAnalogData(data);
        if (!analogData) {
            return;
        }
        const decision = decideRStickAnalog({
            analog: analogData,
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
