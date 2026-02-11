import { ImuData } from './imu-pointer';
import { isCursorId, isFiniteNumber, isRecord } from './payload-parse-utils';
import type {
    AttitudeData,
    BatteryStatus,
    CalibrationStatus,
    JoyConButtonStateData,
    JoyConCursorIdData,
    JoyConStatus,
    JoyConStickAnalogData,
} from './main-joycon-events-types';

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
export function parseImuData(value: unknown): ImuData | null {
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
export function parseJoyConButtonStateData(value: unknown): JoyConButtonStateData | null {
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
export function parseJoyConCursorIdData(value: unknown): JoyConCursorIdData | null {
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
export function parseJoyConStickAnalogData(value: unknown): JoyConStickAnalogData | null {
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
export function parseAttitudeData(value: unknown): AttitudeData | null {
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
export function parseCalibrationStatus(value: unknown): CalibrationStatus | null {
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
export function parseJoyConStatus(value: unknown): JoyConStatus | null {
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
export function parseBatteryStatus(value: unknown): BatteryStatus | null {
    if (!isRecord(value) || typeof value.isLeft !== 'boolean' || !isFiniteNumber(value.level)) {
        return null;
    }
    return { isLeft: value.isLeft, level: value.level };
}
