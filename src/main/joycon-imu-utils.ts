export type JoyConImuSample = {
    accel: { x: number; y: number; z: number };
    gyro: { x: number; y: number; z: number };
};

/**
 * Joy-Con の入力バッファから IMU サンプルを抽出する。
 * @param data 入力バッファ
 * @returns 抽出した IMU サンプル
 */
export function decodeImuSample(data: Buffer): JoyConImuSample {
    const accelOffsetX = 13;
    const accelOffsetY = 15;
    const accelOffsetZ = 17;
    const gyroOffsetX = 19;
    const gyroOffsetY = 21;
    const gyroOffsetZ = 23;

    return {
        accel: {
            x: data.readInt16LE(accelOffsetX),
            y: data.readInt16LE(accelOffsetY),
            z: data.readInt16LE(accelOffsetZ),
        },
        gyro: {
            x: data.readInt16LE(gyroOffsetX),
            y: data.readInt16LE(gyroOffsetY),
            z: data.readInt16LE(gyroOffsetZ),
        },
    };
}
