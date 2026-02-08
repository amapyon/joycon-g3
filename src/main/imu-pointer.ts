export type CursorId = import('../shared/cursor-types').CursorId;
export type Vector3 = { x: number; y: number; z: number };
export type ImuData = { id: string; accel: Vector3; gyro: Vector3 };
export type PointerPosition = { x: number; y: number };
export type PointerPositions = { [key in CursorId]: PointerPosition };
export type CursorMapConfig = import('../shared/cursor-types').PartialCursorMapConfig;

export type PointerUpdateInput = {
    data: ImuData;
    cursorId: CursorId;
    cursorVisible: boolean;
    isCalibrating: boolean;
    gyroBias: Vector3;
    cursorMapConfig: CursorMapConfig;
    currentPosition: PointerPosition | null;
    defaultPosition: PointerPosition;
    screenSize: { width: number; height: number };
    moveSpeed: number;
    gyroDeadzone: number;
};

export type PointerUpdateDecision = {
    position: PointerPosition;
    sendPayload: { id: CursorId; x: number; y: number };
    configMissing: boolean;
};

/**
 * ポインターの更新結果を判定する。
 * @param input IMU 入力と現在の状態
 * @returns 更新結果。更新不要なら null
 */
export function decidePointerUpdate(input: PointerUpdateInput): PointerUpdateDecision | null {
    if (!input.cursorVisible || input.isCalibrating) {
        return null;
    }

    const position = input.currentPosition ?? input.defaultPosition;
    const gyro = applyDeadzone(
        subtractVector(input.data.gyro, input.gyroBias),
        input.gyroDeadzone,
    );
    const config = input.cursorMapConfig[input.cursorId];
    const xSign = config?.xSign ?? 1;
    const ySign = config?.ySign ?? 1;

    const nextPosition = clampPosition({
        x: position.x + gyro.z * input.moveSpeed * xSign,
        y: position.y + gyro.y * input.moveSpeed * ySign,
    }, input.screenSize);

    return {
        position: nextPosition,
        sendPayload: { id: input.cursorId, x: nextPosition.x, y: nextPosition.y },
        configMissing: !config,
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
