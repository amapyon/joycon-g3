import { RStickConfig, RStickState } from './r-stick-handler';
import { dispatchRStickActions, sendToWindow } from './main-joycon-window-dispatch';
import type { PointerPositions } from './imu-pointer';
import {
    parseBatteryStatus,
    parseJoyConStatus,
} from './main-joycon-event-parsers';
import { JOYCON_IPC_CHANNELS, JOYCON_MANAGER_EVENTS } from '../shared/joycon-event-channels';
import { registerImuHandlers, registerRStickHandlers } from './main-joycon-motion-registrars';
import { registerButtonHandlers } from './main-joycon-button-registrars';
import { registerPresentationHandlers } from './main-joycon-presentation-registrar';
import {
    JoyConEventsContext,
    RegisterMainJoyConEventsOptions,
} from './main-joycon-events-types';

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
    const pointerPositions: PointerPositions = {
        cursorLeft: { x: 600, y: 300 },
        cursorRight: { x: 600, y: 300 },
    };
    const context: JoyConEventsContext = {
        options,
        pointerPositions,
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
