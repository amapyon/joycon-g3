import { PointerPositions, decidePointerUpdate } from './imu-pointer';
import { decideRStickAnalog, decideRStickPress } from './r-stick-handler';
import { getScreenSize } from './screen-state';
import { sendToWindow } from './main-joycon-window-dispatch';
import {
    parseAttitudeData,
    parseCalibrationStatus,
    parseImuData,
    parseJoyConButtonStateData,
    parseJoyConStickAnalogData,
} from './main-joycon-event-parsers';
import { JOYCON_IPC_CHANNELS, JOYCON_MANAGER_EVENTS } from '../shared/joycon-event-channels';
import type { JoyConEventsContext } from './main-joycon-events-types';

let pointerPositions: PointerPositions | null = null;

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
export function registerImuHandlers(context: JoyConEventsContext): void {
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
 * R スティックイベントを登録する。
 * @param context イベント登録コンテキスト
 */
export function registerRStickHandlers(context: JoyConEventsContext): void {
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
