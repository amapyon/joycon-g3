import { ACCEL_SCALE_G } from '../shared/imu-units';

export type CursorId = import('../shared/cursor-types').CursorId;
export type Vector3 = { x: number; y: number; z: number };
export type ImuData = { id: string; accel: Vector3; gyro: Vector3 };
export type PointerPosition = { x: number; y: number };
export type PointerPositions = { [key in CursorId]: PointerPosition };
export type CursorMapConfig = import('../shared/cursor-types').PartialCursorMapConfig;
export type PointerMotionDiagnostics = import('../shared/pointer-motion-settings').PointerMotionDiagnostics;

export type PointerUpdateInput = {
    data: ImuData;
    cursorId: CursorId;
    cursorVisible: boolean;
    isCalibrating: boolean;
    gyroBias: Vector3;
    xRotationDegrees: number;
    xRotationCompensationStrength: number;
    fixedXRotationDegrees: number | null;
    screenGyro: Vector3 | null;
    cursorMapConfig: CursorMapConfig;
    currentPosition: PointerPosition | null;
    defaultPosition: PointerPosition;
    screenSize: { width: number; height: number };
    moveSpeed: number;
    gyroDeadzone: number;
    deltaTimeSeconds: number;
};

export type PointerUpdateDecision = {
    position: PointerPosition;
    sendPayload: { id: CursorId; x: number; y: number };
    configMissing: boolean;
    diagnostics: PointerMotionDiagnostics;
};

const POINTER_REFERENCE_RATE_HZ = 60;
const POINTER_DEFAULT_DELTA_TIME_SECONDS = 1 / POINTER_REFERENCE_RATE_HZ;
const POINTER_MIN_DELTA_TIME_SECONDS = 1 / 240;
const POINTER_MAX_DELTA_TIME_SECONDS = 1 / 20;

/**
 * ポインターの更新結果を判定する。
 * @param input IMU 入力と現在の状態
 * @returns 更新結果。更新不要なら null
 */
export function decidePointerUpdate(input: PointerUpdateInput): PointerUpdateDecision | null {
    if (!input.cursorVisible || input.isCalibrating) {
        return null;
    }

    const diagnostics = inspectPointerMotion(input);
    const position = input.currentPosition ?? input.defaultPosition;
    const config = input.cursorMapConfig[input.cursorId];
    const frameScale = normalizePointerDeltaTime(input.deltaTimeSeconds) * POINTER_REFERENCE_RATE_HZ;
    const nextPosition = clampPosition({
        x: position.x + diagnostics.correctedGyroZ * input.moveSpeed * frameScale * (config?.xSign ?? 1),
        y: position.y + diagnostics.correctedGyroY * input.moveSpeed * frameScale * (config?.ySign ?? 1),
    }, input.screenSize);

    if (diagnostics.sample) {
        diagnostics.sample.actualDeltaPixels = { x: nextPosition.x - position.x, y: nextPosition.y - position.y };
        diagnostics.sample.positionPixels = nextPosition;
    }
    return {
        position: nextPosition,
        sendPayload: { id: input.cursorId, x: nextPosition.x, y: nextPosition.y },
        configMissing: !config,
        diagnostics,
    };
}

/**
 * 表示状態に関係なく、実際の移動処理と同じ変換から検証値を生成する。
 * @param input IMU 入力と設定
 * @returns 処理段階別の診断値。座標更新の副作用はない
 */
export function inspectPointerMotion(input: PointerUpdateInput): PointerMotionDiagnostics {
    const appliedXRotationDegrees = resolveXAxisCompensationDegrees(
        input.xRotationDegrees,
        input.xRotationCompensationStrength,
        input.fixedXRotationDegrees,
    );
    const deviceGyro = compensateXAxisRotation(
        subtractVector(input.data.gyro, input.gyroBias),
        appliedXRotationDegrees,
    );
    const screenGyro = input.screenGyro && isFiniteVector(input.screenGyro)
        ? input.screenGyro
        : deviceGyro;
    const gyro = applyDeadzone(screenGyro, input.gyroDeadzone);
    const config = input.cursorMapConfig[input.cursorId];
    const xSign = config?.xSign ?? 1;
    const ySign = config?.ySign ?? 1;
    const frameScale = normalizePointerDeltaTime(input.deltaTimeSeconds) * POINTER_REFERENCE_RATE_HZ;

    const accelG = {
        x: input.data.accel.x * ACCEL_SCALE_G,
        y: input.data.accel.y * ACCEL_SCALE_G,
        z: input.data.accel.z * ACCEL_SCALE_G,
    };
    const unbiasedGyro = subtractVector(input.data.gyro, input.gyroBias);
    return {
        id: input.cursorId,
        estimatedXRotationDegrees: input.xRotationDegrees,
        appliedXRotationDegrees,
        correctedGyroY: gyro.y,
        correctedGyroZ: gyro.z,
        axisLeakageRatio: gyro.z === 0 ? null : Math.abs(gyro.y) / Math.abs(gyro.z),
        coordinateMode: input.screenGyro && isFiniteVector(input.screenGyro) ? 'gravity-frame' : 'x-rotation',
        sample: {
            timestampMs: Date.now(),
            cursorVisible: input.cursorVisible,
            isCalibrating: input.isCalibrating,
            deltaTimeSeconds: input.deltaTimeSeconds,
            rawAccel: { ...input.data.accel },
            rawGyro: { ...input.data.gyro },
            gyroBiasRaw: { ...input.gyroBias },
            accelG,
            accelerationMagnitudeG: Math.hypot(accelG.x, accelG.y, accelG.z),
            gyroDps: { x: unbiasedGyro.x * 2000 / 32768, y: unbiasedGyro.y * 2000 / 32768, z: unbiasedGyro.z * 2000 / 32768 },
            gravity: null,
            verticalAxis: null,
            projectedGyroRaw: { ...screenGyro },
            filteredGyroRaw: { ...gyro },
            requestedDeltaPixels: {
                x: gyro.z * input.moveSpeed * frameScale * xSign,
                y: gyro.y * input.moveSpeed * frameScale * ySign,
            },
            actualDeltaPixels: { x: 0, y: 0 },
            positionPixels: { ...(input.currentPosition ?? input.defaultPosition) },
            settings: {
                moveSpeed: input.moveSpeed,
                gyroDeadzone: input.gyroDeadzone,
                xRotationCompensationStrength: input.xRotationCompensationStrength,
                fixedXRotationDegrees: input.fixedXRotationDegrees,
                diagnosticsEnabled: true,
            },
            signs: { x: xSign, y: ySign },
        },
    };
}

/**
 * ベクトルの全成分が有限値か判定する。
 * @param value 判定対象ベクトル
 * @returns 全成分が有限値なら true
 */
function isFiniteVector(value: Vector3): boolean {
    return Number.isFinite(value.x) && Number.isFinite(value.y) && Number.isFinite(value.z);
}

/**
 * ポインター移動に使う経過時間を安全な範囲へ正規化する。
 * @param deltaTimeSeconds 前回更新からの経過秒
 * @returns 正規化後の経過秒
 */
export function normalizePointerDeltaTime(deltaTimeSeconds: number): number {
    if (!Number.isFinite(deltaTimeSeconds) || deltaTimeSeconds <= 0) {
        return POINTER_DEFAULT_DELTA_TIME_SECONDS;
    }
    return Math.min(Math.max(deltaTimeSeconds, POINTER_MIN_DELTA_TIME_SECONDS), POINTER_MAX_DELTA_TIME_SECONDS);
}

/**
 * 表示先の変更後も相対位置を維持するようポインター座標を変換する。
 * @param position 変更前のポインター座標
 * @param previousSize 変更前の画面サイズ
 * @param nextSize 変更後の画面サイズ
 * @returns 変更後の画面に対応する座標
 */
export function scalePointerPosition(
    position: PointerPosition,
    previousSize: { width: number; height: number },
    nextSize: { width: number; height: number },
): PointerPosition {
    if (previousSize.width <= 0 || previousSize.height <= 0) {
        return { x: nextSize.width / 2, y: nextSize.height / 2 };
    }
    return clampPosition({
        x: position.x * nextSize.width / previousSize.width,
        y: position.y * nextSize.height / previousSize.height,
    }, nextSize);
}

/**
 * 推定角度または固定角度へ補正強度を適用する。
 * @param estimatedDegrees 推定された X 軸まわりの角度
 * @param strength 補正強度（0～1）
 * @param fixedDegrees 実験用の固定角度。null の場合は推定角度を使用する
 * @returns 実際に座標変換へ使用する角度
 */
export function resolveXAxisCompensationDegrees(
    estimatedDegrees: number,
    strength: number,
    fixedDegrees: number | null,
): number {
    const sourceDegrees = typeof fixedDegrees === 'number' && Number.isFinite(fixedDegrees)
        ? fixedDegrees
        : estimatedDegrees;
    const safeStrength = Number.isFinite(strength) ? Math.min(Math.max(strength, 0), 1) : 1;
    return sourceDegrees * safeStrength;
}

/**
 * Joy-Con の X 軸まわりの保持角度を打ち消し、ジャイロを基準座標へ変換する。
 * @param value バイアス補正済みのジャイロ値
 * @param rotationDegrees X 軸まわりの保持角度（度）
 * @returns 基準座標へ変換したジャイロ値
 */
function compensateXAxisRotation(value: Vector3, rotationDegrees: number): Vector3 {
    const safeRotation = Number.isFinite(rotationDegrees) ? rotationDegrees : 0;
    const radians = safeRotation * Math.PI / 180;
    const cosine = Math.cos(radians);
    const sine = Math.sin(radians);

    return {
        x: value.x,
        y: value.y * cosine - value.z * sine,
        z: value.y * sine + value.z * cosine,
    };
}

/**
 * ベクトルを減算する。
 * @param value 入力ベクトル
 * @param bias バイアス
 * @returns 減算結果
 */
function subtractVector(value: Vector3, bias: Vector3): Vector3 {
    return {
        x: value.x - bias.x,
        y: value.y - bias.y,
        z: value.z - bias.z,
    };
}

/**
 * デッドゾーンを適用する。
 * @param value 入力ベクトル
 * @param deadzone デッドゾーン値
 * @returns デッドゾーン適用後のベクトル
 */
function applyDeadzone(value: Vector3, deadzone: number): Vector3 {
    return {
        x: Math.abs(value.x) < deadzone ? 0 : value.x,
        y: Math.abs(value.y) < deadzone ? 0 : value.y,
        z: Math.abs(value.z) < deadzone ? 0 : value.z,
    };
}

/**
 * 画面内に座標を収める。
 * @param position 座標
 * @param screenSize 画面サイズ
 * @returns 画面内に収めた座標
 */
function clampPosition(position: PointerPosition, screenSize: { width: number; height: number }): PointerPosition {
    return {
        x: Math.max(0, Math.min(screenSize.width, position.x)),
        y: Math.max(0, Math.min(screenSize.height, position.y)),
    };
}
