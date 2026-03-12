/**
 * Joy-Con ポインター移動設定。
 */
export type PointerMotionSettings = {
    moveSpeed: number;
    gyroDeadzone: number;
};

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

    return {
        moveSpeed: Math.round(moveSpeed * 100) / 100,
        gyroDeadzone,
    };
}
