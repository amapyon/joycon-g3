import { PointerPositions, decidePointerUpdate } from './imu-pointer';
import { RStickConfig, RStickState, decideRStickAnalog, decideRStickPress } from './r-stick-handler';
import { getScreenSize } from './screen-state';
import { isCursorId } from './payload-parse-utils';
import { dispatchRStickActions, sendToTimerWhenReady, sendToWindow } from './main-joycon-window-dispatch';
import {
    parseAttitudeData,
    parseBatteryStatus,
    parseCalibrationStatus,
    parseImuData,
    parseJoyConButtonStateData,
    parseJoyConCursorIdData,
    parseJoyConStatus,
    parseJoyConStickAnalogData,
} from './main-joycon-event-parsers';
import { JOYCON_IPC_CHANNELS, JOYCON_MANAGER_EVENTS, JoyConIpcChannel, JoyConManagerEventName } from '../shared/joycon-event-channels';
import {
    JoyConEventsContext,
    RegisterMainJoyConEventsOptions,
} from './main-joycon-events-types';

let pointerPositions: PointerPositions | null = null;

type ButtonForwardConfig = {
    sourceEvent: JoyConManagerEventName;
    targetChannel: JoyConIpcChannel;
};

type PressForwardConfig = {
    eventName: JoyConManagerEventName;
    shouldEnsureTimerWindow: boolean;
    beforeSend?: (id: 'cursorLeft' | 'cursorRight') => void;
    onRightCursorOnly?: () => void;
};

/**
 * IMU イベントの ID からカーソル ID を解決する。
 * @param id Joy-Con 側 ID
 * @returns 対応するカーソル ID。対象外なら null
 */
function resolveCursorIdFromImuId(id: string): 'cursorLeft' | 'cursorRight' | null {
    if (id === 'R' || id === 'cursorRight') {
        return 'cursorRight';
    }
    if (id === 'L' || id === 'cursorLeft') {
        return 'cursorLeft';
    }
    return null;
}

/**
 * 初期ポインター位置を確保する。
 * @returns 初期化済みポインター位置
 */
function ensurePointerPositions(): PointerPositions {
    if (!pointerPositions) {
        pointerPositions = { cursorLeft: { x: 600, y: 300 }, cursorRight: { x: 600, y: 300 } };
    }
    return pointerPositions;
}

/**
 * IMU データイベントを登録する。
 * @param context イベント登録コンテキスト
 */
function registerImuHandlers(context: JoyConEventsContext): void {
    const { options } = context;
    const { joyConManager, imuProcessor, windowManager } = options;

    joyConManager.on(JOYCON_MANAGER_EVENTS.IMU_DATA, (data: unknown): void => {
        const imuData = parseImuData(data);
        if (!imuData) {
            return;
        }
        const cursorId = resolveCursorIdFromImuId(imuData.id);
        if (!cursorId) {
            return;
        }
        imuProcessor.update({ id: cursorId, accel: imuData.accel, gyro: imuData.gyro });

        const positions = ensurePointerPositions();
        const state = imuProcessor.states[cursorId];
        const decision = decidePointerUpdate({
            data: imuData,
            cursorId,
            cursorVisible: options.getCursorVisibility(cursorId),
            isCalibrating: imuProcessor.isCalibrating[cursorId],
            gyroBias: { x: state.gyroBiasX, y: state.gyroBiasY, z: state.gyroBiasZ },
            cursorMapConfig: options.getCursorMapConfig(),
            currentPosition: positions[cursorId],
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
        positions[cursorId] = decision.position;
        sendToWindow(windowManager.getCursorWindow(), JOYCON_IPC_CHANNELS.UPDATE_POINTER, decision.sendPayload);
    });

    imuProcessor.on('attitude-update', (attitudeData: unknown): void => {
        const typedData = parseAttitudeData(attitudeData);
        if (!typedData) {
            return;
        }
        sendToWindow(windowManager.getCursorWindow(), JOYCON_IPC_CHANNELS.JOYCON_ATTITUDE, typedData);
    });

    imuProcessor.on('calibration-status', (statusInfo: unknown): void => {
        const typedStatusInfo = parseCalibrationStatus(statusInfo);
        if (!typedStatusInfo) {
            return;
        }
        sendToWindow(windowManager.getMainWindow(), JOYCON_IPC_CHANNELS.CALIBRATION_STATUS_UPDATE, typedStatusInfo);
    });
}

/**
 * ステータス・バッテリー通知イベントを登録する。
 * @param context イベント登録コンテキスト
 */
function registerStatusHandlers(context: JoyConEventsContext): void {
    const { joyConManager, windowManager } = context.options;

    joyConManager.on(JOYCON_MANAGER_EVENTS.STATUS_UPDATE, (status: unknown): void => {
        const typedStatus = parseJoyConStatus(status);
        if (!typedStatus) {
            return;
        }
        sendToWindow(windowManager.getMainWindow(), JOYCON_IPC_CHANNELS.JOYCON_STATUS_UPDATE, typedStatus);
    });

    joyConManager.on(JOYCON_MANAGER_EVENTS.BATTERY_STATUS_UPDATE, (status: unknown): void => {
        const typedStatus = parseBatteryStatus(status);
        if (!typedStatus) {
            return;
        }
        sendToWindow(windowManager.getMainWindow(), JOYCON_IPC_CHANNELS.JOYCON_BATTERY_STATUS_UPDATE, typedStatus);
    });
}

/**
 * ボタン押下イベントの通常通知を登録する。
 * @param context イベント登録コンテキスト
 */
function registerButtonForwardHandlers(context: JoyConEventsContext): void {
    const { joyConManager, windowManager } = context.options;
    const forwardConfigs: ButtonForwardConfig[] = [
        { sourceEvent: JOYCON_MANAGER_EVENTS.BUTTON_X, targetChannel: JOYCON_IPC_CHANNELS.JOYCON_BUTTON_X },
        { sourceEvent: JOYCON_MANAGER_EVENTS.BUTTON_DOWN, targetChannel: JOYCON_IPC_CHANNELS.JOYCON_BUTTON_DOWN },
        { sourceEvent: JOYCON_MANAGER_EVENTS.BUTTON_PLUS, targetChannel: JOYCON_IPC_CHANNELS.JOYCON_BUTTON_PLUS },
    ];
    forwardConfigs.forEach((config: ButtonForwardConfig): void => {
        joyConManager.on(config.sourceEvent, (data: unknown): void => {
            const typedData = parseJoyConButtonStateData(data);
            if (!typedData) {
                return;
            }
            sendToWindow(windowManager.getCursorWindow(), config.targetChannel, typedData);
        });
    });
}

/**
 * ボタン押下イベントの特殊動作を登録する。
 * @param context イベント登録コンテキスト
 */
function registerButtonPressHandlers(context: JoyConEventsContext): void {
    const { joyConManager, imuProcessor, windowManager, ensureTimerWindow, toggleTimerWindowVisibility } = context.options;
    const pressForwardConfigs: PressForwardConfig[] = [
        {
            eventName: JOYCON_MANAGER_EVENTS.BUTTON_X_PRESSED,
            shouldEnsureTimerWindow: false,
            beforeSend: (id: 'cursorLeft' | 'cursorRight'): void => {
                if (isCursorId(id)) {
                    imuProcessor.recenter(id);
                }
            },
        },
        {
            eventName: JOYCON_MANAGER_EVENTS.BUTTON_PLUS_PRESSED,
            shouldEnsureTimerWindow: false,
            beforeSend: (): void => {
                toggleTimerWindowVisibility();
            },
        },
        {
            eventName: JOYCON_MANAGER_EVENTS.BUTTON_MINUS_PRESSED,
            shouldEnsureTimerWindow: true,
        },
        {
            eventName: JOYCON_MANAGER_EVENTS.BUTTON_SR_PRESSED,
            shouldEnsureTimerWindow: true,
        },
        {
            eventName: JOYCON_MANAGER_EVENTS.BUTTON_DOWN_PRESSED,
            shouldEnsureTimerWindow: false,
            beforeSend: (id: 'cursorLeft' | 'cursorRight'): void => {
                if (isCursorId(id)) {
                    imuProcessor.recenter(id);
                }
            },
        },
        {
            eventName: JOYCON_MANAGER_EVENTS.BUTTON_HOME_PRESSED,
            shouldEnsureTimerWindow: false,
            onRightCursorOnly: (): void => {
                windowManager.closeCursorWindow();
            },
        },
    ];

    pressForwardConfigs.forEach((config: PressForwardConfig): void => {
        joyConManager.on(config.eventName, (data: unknown): void => {
            const typedData = parseJoyConCursorIdData(data);
            if (!typedData) {
                return;
            }

            if (config.beforeSend) {
                config.beforeSend(typedData.id);
            }

            if (config.onRightCursorOnly) {
                if (typedData.id === 'cursorRight') {
                    config.onRightCursorOnly();
                }
                return;
            }

            if (config.shouldEnsureTimerWindow) {
                sendToTimerWhenReady(ensureTimerWindow(), config.eventName, typedData);
                return;
            }

            if (config.eventName === JOYCON_MANAGER_EVENTS.BUTTON_PLUS_PRESSED) {
                sendToWindow(windowManager.getTimerWindow(), JOYCON_IPC_CHANNELS.BUTTON_PLUS_PRESSED, typedData);
                return;
            }

            if (config.eventName === JOYCON_MANAGER_EVENTS.BUTTON_X_PRESSED) {
                sendToWindow(windowManager.getCursorWindow(), JOYCON_IPC_CHANNELS.BUTTON_X_PRESSED, typedData);
                return;
            }

            if (config.eventName === JOYCON_MANAGER_EVENTS.BUTTON_DOWN_PRESSED) {
                sendToWindow(windowManager.getCursorWindow(), JOYCON_IPC_CHANNELS.BUTTON_DOWN_PRESSED, typedData);
            }
        });
    });
}

/**
 * ボタン押下イベントを登録する。
 * @param context イベント登録コンテキスト
 */
function registerButtonHandlers(context: JoyConEventsContext): void {
    registerButtonForwardHandlers(context);
    registerButtonPressHandlers(context);
}

/**
 * R スティックイベントを登録する。
 * @param context イベント登録コンテキスト
 */
function registerRStickHandlers(context: JoyConEventsContext): void {
    const { joyConManager, windowManager, ensureTimerWindow } = context.options;

    joyConManager.on(JOYCON_MANAGER_EVENTS.R_STICK, (data: unknown): void => {
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

    joyConManager.on(JOYCON_MANAGER_EVENTS.R_STICK_ANALOG, (data: unknown): void => {
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

    joyConManager.on(JOYCON_MANAGER_EVENTS.PPT_NEXT, (): void => {
        const handled = powerpointControl.next();
        if (!handled) {
            googleSlidesControl.next();
        }
    });

    joyConManager.on(JOYCON_MANAGER_EVENTS.PPT_PREV, (): void => {
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
