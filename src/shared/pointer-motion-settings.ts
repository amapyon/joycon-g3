/**
 * Joy-Con ポインター移動設定。
 */
export type PointerMotionSettings = {
    moveSpeed: number;
    gyroDeadzone: number;
    xRotationCompensationStrength: number;
    fixedXRotationDegrees: number | null;
    diagnosticsEnabled: boolean;
};

/**
 * ポインター補正の実験用診断値。
 */
export type PointerMotionDiagnostics = {
    id: import('./cursor-types').CursorId;
    estimatedXRotationDegrees: number;
    appliedXRotationDegrees: number;
    correctedGyroY: number;
    correctedGyroZ: number;
    axisLeakageRatio: number | null;
    coordinateMode: 'gravity-frame' | 'x-rotation';
    sample?: PointerValidationSample;
    runtimeEvents?: import('./pointer-runtime-trace').PointerRuntimeEvent[];
};

/** センサーの各処理段階を比較するための検証サンプル。値の単位はフィールド名に示す。 */
export type PointerValidationSample = {
    timestampMs: number;
    cursorVisible: boolean;
    isCalibrating: boolean;
    deltaTimeSeconds: number;
    rawAccel: PointerValidationVector;
    rawGyro: PointerValidationVector;
    gyroBiasRaw: PointerValidationVector;
    accelG: PointerValidationVector;
    accelerationMagnitudeG: number;
    gyroDps: PointerValidationVector;
    gravity: PointerValidationVector | null;
    verticalAxis: PointerValidationVector | null;
    projectedGyroRaw: PointerValidationVector;
    filteredGyroRaw: PointerValidationVector;
    requestedDeltaPixels: { x: number; y: number };
    actualDeltaPixels: { x: number; y: number };
    positionPixels: { x: number; y: number };
    settings: PointerMotionSettings;
    signs: { x: number; y: number };
};

/** 検証データの3軸値。 */
export type PointerValidationVector = { x: number; y: number; z: number };

/**
 * X 軸補正の実験で選択できる固定角度。
 */
export const X_ROTATION_FIXED_ANGLE_PRESETS = [-60, -30, 0, 30, 60] as const;

/**
 * ポインター移動速度の最小値。
 */
export const POINTER_MOVE_SPEED_MIN = 0.01;

/**
 * ポインター移動速度の最大値。
 */
export const POINTER_MOVE_SPEED_MAX = 0.12;

/**
 * ジャイロデッドゾーンの最小値。
 */
export const POINTER_GYRO_DEADZONE_MIN = 0;

/**
 * ジャイロデッドゾーンの最大値。
 */
export const POINTER_GYRO_DEADZONE_MAX = 300;

/**
 * ポインター移動設定の既定値。
 */
export const DEFAULT_POINTER_MOTION_SETTINGS: PointerMotionSettings = {
    moveSpeed: 0.05,
    gyroDeadzone: 120,
    xRotationCompensationStrength: 1,
    fixedXRotationDegrees: null,
    diagnosticsEnabled: false,
};

/**
 * ポインター移動設定を正規化する。
 * @param value 入力値
 * @returns 正規化済み設定
 */
export function normalizePointerMotionSettings(value: Partial<PointerMotionSettings> | null | undefined): PointerMotionSettings {
    const moveSpeed = typeof value?.moveSpeed === 'number' && !Number.isNaN(value.moveSpeed)
        ? Math.min(Math.max(value.moveSpeed, POINTER_MOVE_SPEED_MIN), POINTER_MOVE_SPEED_MAX)
        : DEFAULT_POINTER_MOTION_SETTINGS.moveSpeed;
    const gyroDeadzone = typeof value?.gyroDeadzone === 'number' && !Number.isNaN(value.gyroDeadzone)
        ? Math.round(Math.min(Math.max(value.gyroDeadzone, POINTER_GYRO_DEADZONE_MIN), POINTER_GYRO_DEADZONE_MAX))
        : DEFAULT_POINTER_MOTION_SETTINGS.gyroDeadzone;
    const xRotationCompensationStrength = typeof value?.xRotationCompensationStrength === 'number'
        && Number.isFinite(value.xRotationCompensationStrength)
        ? Math.min(Math.max(value.xRotationCompensationStrength, 0), 1)
        : DEFAULT_POINTER_MOTION_SETTINGS.xRotationCompensationStrength;
    const fixedXRotationDegrees = typeof value?.fixedXRotationDegrees === 'number'
        && X_ROTATION_FIXED_ANGLE_PRESETS.some((preset: number): boolean => preset === value.fixedXRotationDegrees)
        ? value.fixedXRotationDegrees
        : null;
    const diagnosticsEnabled = typeof value?.diagnosticsEnabled === 'boolean'
        ? value.diagnosticsEnabled
        : DEFAULT_POINTER_MOTION_SETTINGS.diagnosticsEnabled;

    return {
        moveSpeed: Math.round(moveSpeed * 100) / 100,
        gyroDeadzone,
        xRotationCompensationStrength: Math.round(xRotationCompensationStrength * 100) / 100,
        fixedXRotationDegrees,
        diagnosticsEnabled,
    };
}
