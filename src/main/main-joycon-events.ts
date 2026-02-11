import { RStickConfig, RStickState } from './r-stick-handler';
import { isCursorId } from './payload-parse-utils';
import { dispatchRStickActions, sendToTimerWhenReady, sendToWindow } from './main-joycon-window-dispatch';
import {
    parseBatteryStatus,
    parseJoyConButtonStateData,
    parseJoyConCursorIdData,
    parseJoyConStatus,
} from './main-joycon-event-parsers';
import { JOYCON_IPC_CHANNELS, JOYCON_MANAGER_EVENTS, JoyConIpcChannel, JoyConManagerEventName } from '../shared/joycon-event-channels';
import { registerImuHandlers, registerRStickHandlers } from './main-joycon-motion-registrars';
import {
    JoyConEventsContext,
    RegisterMainJoyConEventsOptions,
} from './main-joycon-events-types';

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
