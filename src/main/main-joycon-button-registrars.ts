import { isCursorId } from './payload-parse-utils';
import { sendToTimerWhenReady, sendToWindow } from './main-joycon-window-dispatch';
import {
    parseJoyConButtonStateData,
    parseJoyConCursorIdData,
} from './main-joycon-event-parsers';
import { JOYCON_IPC_CHANNELS, JOYCON_MANAGER_EVENTS, JoyConIpcChannel, JoyConManagerEventName } from '../shared/joycon-event-channels';
import type { JoyConEventsContext } from './main-joycon-events-types';
import { appendRuntimeTrace } from './pointer-runtime-trace';

type ButtonForwardConfig = {
    sourceEvent: JoyConManagerEventName;
    targetChannel: JoyConIpcChannel;
};

type PressForwardConfig = {
    eventName: JoyConManagerEventName;
    handle: (id: 'cursorLeft' | 'cursorRight') => void;
};

/**
 * ボタン押下イベントの通常通知を登録する。
 * @param context イベント登録コンテキスト
 */
function registerButtonForwardHandlers(context: JoyConEventsContext): void {
    const { joyConManager, windowManager } = context.options;
    let lastRightButton: boolean | null = null;
    let lastLeftButton: boolean | null = null;
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
            if (config.sourceEvent === JOYCON_MANAGER_EVENTS.BUTTON_X && lastRightButton !== typedData.pressed) {
                appendRuntimeTrace({ kind: 'button', id: 'cursorRight', timestampMs: Date.now(), pressed: typedData.pressed });
                lastRightButton = typedData.pressed;
            }
            if (config.sourceEvent === JOYCON_MANAGER_EVENTS.BUTTON_DOWN && lastLeftButton !== typedData.pressed) {
                appendRuntimeTrace({ kind: 'button', id: 'cursorLeft', timestampMs: Date.now(), pressed: typedData.pressed });
                lastLeftButton = typedData.pressed;
            }
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
            handle: (id: 'cursorLeft' | 'cursorRight'): void => {
                if (isCursorId(id)) {
                    imuProcessor.recenter(id);
                }
                sendToWindow(windowManager.getCursorWindow(), JOYCON_IPC_CHANNELS.BUTTON_X_PRESSED, { id });
            },
        },
        {
            eventName: JOYCON_MANAGER_EVENTS.BUTTON_PLUS_PRESSED,
            handle: (id: 'cursorLeft' | 'cursorRight'): void => {
                toggleTimerWindowVisibility();
                sendToWindow(windowManager.getTimerWindow(), JOYCON_IPC_CHANNELS.BUTTON_PLUS_PRESSED, { id });
            },
        },
        {
            eventName: JOYCON_MANAGER_EVENTS.BUTTON_MINUS_PRESSED,
            handle: (id: 'cursorLeft' | 'cursorRight'): void => {
                sendToTimerWhenReady(ensureTimerWindow(), JOYCON_MANAGER_EVENTS.BUTTON_MINUS_PRESSED, { id });
            },
        },
        {
            eventName: JOYCON_MANAGER_EVENTS.BUTTON_SR_PRESSED,
            handle: (id: 'cursorLeft' | 'cursorRight'): void => {
                sendToTimerWhenReady(ensureTimerWindow(), JOYCON_MANAGER_EVENTS.BUTTON_SR_PRESSED, { id });
            },
        },
        {
            eventName: JOYCON_MANAGER_EVENTS.BUTTON_DOWN_PRESSED,
            handle: (id: 'cursorLeft' | 'cursorRight'): void => {
                if (isCursorId(id)) {
                    imuProcessor.recenter(id);
                }
                sendToWindow(windowManager.getCursorWindow(), JOYCON_IPC_CHANNELS.BUTTON_DOWN_PRESSED, { id });
            },
        },
        {
            eventName: JOYCON_MANAGER_EVENTS.BUTTON_HOME_PRESSED,
            handle: (id: 'cursorLeft' | 'cursorRight'): void => {
                if (id === 'cursorRight') {
                    windowManager.closeCursorWindow();
                }
            },
        },
    ];

    pressForwardConfigs.forEach((config: PressForwardConfig): void => {
        joyConManager.on(config.eventName, (data: unknown): void => {
            const typedData = parseJoyConCursorIdData(data);
            if (!typedData) {
                return;
            }
            config.handle(typedData.id);
        });
    });
}

/**
 * ボタン押下イベントを登録する。
 * @param context イベント登録コンテキスト
 */
export function registerButtonHandlers(context: JoyConEventsContext): void {
    registerButtonForwardHandlers(context);
    registerButtonPressHandlers(context);
}
