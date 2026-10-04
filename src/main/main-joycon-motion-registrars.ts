import { decidePointerUpdate, inspectPointerMotion, scalePointerPosition } from './imu-pointer';
import type { PointerUpdateInput } from './imu-pointer';
import { decideRStickAnalog, decideRStickPress } from './r-stick-handler';
import { getScreenSize } from './screen-state';
import { sendToWindow } from './main-joycon-window-dispatch';
import { readRuntimeTrace } from './pointer-runtime-trace';
import {
    parseCalibrationStatus,
    parseImuData,
    parseJoyConButtonStateData,
    parseJoyConStickAnalogData,
} from './main-joycon-event-parsers';
import { JOYCON_IPC_CHANNELS, JOYCON_MANAGER_EVENTS } from '../shared/joycon-event-channels';
import type { JoyConEventsContext } from './main-joycon-events-types';

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
 * IMU データイベントを登録する。
 * @param context イベント登録コンテキスト
 */
export function registerImuHandlers(context: JoyConEventsContext): void {
    const { options } = context;
    const { joyConManager, imuProcessor, windowManager } = options;
    let pointerScreenSize = getScreenSize();

    joyConManager.on(JOYCON_MANAGER_EVENTS.IMU_DATA, (data: unknown): void => {
        const imuData = parseImuData(data);
        if (!imuData) {
            return;
        }
        const cursorId = resolveCursorIdFromImuId(imuData.id);
        if (!cursorId) {
            return;
        }
        // ポインターが非表示でも、現在の保持角を追跡するため IMU は常に更新する。
        imuProcessor.update({ id: cursorId, accel: imuData.accel, gyro: imuData.gyro });
        const cursorVisible = options.getCursorVisibility(cursorId);
        const pointerMotionSettings = options.getPointerMotionSettings();
        if (!cursorVisible && !pointerMotionSettings.diagnosticsEnabled) {
            return;
        }

        const positions = context.pointerPositions;
        const screenSize = getScreenSize();
        if (screenSize.width !== pointerScreenSize.width || screenSize.height !== pointerScreenSize.height) {
            positions.cursorLeft = scalePointerPosition(positions.cursorLeft, pointerScreenSize, screenSize);
            positions.cursorRight = scalePointerPosition(positions.cursorRight, pointerScreenSize, screenSize);
            pointerScreenSize = screenSize;
        }
        const state = imuProcessor.states[cursorId];
        const input: PointerUpdateInput = {
            data: imuData,
            cursorId,
            cursorVisible,
            isCalibrating: imuProcessor.isCalibrating[cursorId],
            gyroBias: { x: state.gyroBiasX, y: state.gyroBiasY, z: state.gyroBiasZ },
            xRotationDegrees: state.xRotation ?? 0,
            xRotationCompensationStrength: pointerMotionSettings.xRotationCompensationStrength,
            fixedXRotationDegrees: pointerMotionSettings.fixedXRotationDegrees,
            screenGyro: state.hasPointerGravity && pointerMotionSettings.fixedXRotationDegrees === null
                ? { x: 0, y: state.pointerGyroY ?? 0, z: state.pointerGyroZ ?? 0 }
                : null,
            cursorMapConfig: options.getCursorMapConfig(),
            currentPosition: positions[cursorId],
            defaultPosition: { x: 600, y: 300 },
            screenSize,
            moveSpeed: pointerMotionSettings.moveSpeed,
            gyroDeadzone: pointerMotionSettings.gyroDeadzone,
            deltaTimeSeconds: state.lastDeltaTime ?? 1 / 60,
        };
        const decision = decidePointerUpdate(input);

        if (pointerMotionSettings.diagnosticsEnabled) {
            const diagnostics = decision?.diagnostics ?? inspectPointerMotion(input);
            diagnostics.runtimeEvents = readRuntimeTrace(cursorId);
            if (diagnostics.sample) {
                diagnostics.sample.gravity = state.hasPointerGravity && state.pointerGravity ? { ...state.pointerGravity } : null;
                diagnostics.sample.verticalAxis = state.hasPointerGravity && state.pointerRightAxis ? { ...state.pointerRightAxis } : null;
                diagnostics.sample.settings = { ...pointerMotionSettings };
            }
            sendToWindow(windowManager.getMainWindow(), JOYCON_IPC_CHANNELS.POINTER_MOTION_DIAGNOSTICS, diagnostics);
        }

        if (!decision) {
            return;
        }
        if (decision.configMissing) {
            // console.warn(`[main.ts] cursorMapConfig for ${cursorId} is undefined. Using default signs.`);
        }
        positions[cursorId] = decision.position;
        sendToWindow(windowManager.getCursorWindow(), JOYCON_IPC_CHANNELS.UPDATE_POINTER, decision.sendPayload);
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
