import { decodeImuSample } from '../main/joycon-imu-utils';

describe('Joy-Con IMUユーティリティ', (): void => {
    it('入力バッファから加速度とジャイロを抽出する', (): void => {
        const data = Buffer.alloc(25);
        data.writeInt16LE(1000, 13);
        data.writeInt16LE(-2000, 15);
        data.writeInt16LE(3000, 17);
        data.writeInt16LE(-4000, 19);
        data.writeInt16LE(5000, 21);
        data.writeInt16LE(-6000, 23);

        const imu = decodeImuSample(data);

        expect(imu).toEqual({
            accel: { x: 1000, y: -2000, z: 3000 },
            gyro: { x: -4000, y: 5000, z: -6000 },
        });
    });
});
