import { IMUProcessor } from '../main/imu-processor';

/**
 * テスト用の IMU データを生成する。
 * @param id カーソル ID
 * @returns IMU データ
 */
function createImuData(id: 'cursorLeft' | 'cursorRight'): {
    id: 'cursorLeft' | 'cursorRight';
    accel: { x: number; y: number; z: number };
    gyro: { x: number; y: number; z: number };
} {
    return {
        id,
        accel: { x: 0, y: 0, z: 0 },
        gyro: { x: 0, y: 0, z: 0 },
    };
}

describe('IMUProcessor の動作', (): void => {
    it('初期状態の生成が正しい', (): void => {
        const processor = new IMUProcessor(0.8);
        const stateLeft = processor.states.cursorLeft;
        const stateRight = processor.states.cursorRight;

        expect(stateLeft.alpha).toBe(0.8);
        expect(stateRight.alpha).toBe(0.8);
        expect(stateLeft.pitch).toBe(0);
        expect(stateLeft.roll).toBe(0);
        expect(stateLeft.yaw).toBe(0);
    });

    it('recenter がオフセットを更新する', (): void => {
        const processor = new IMUProcessor(0.95);
        const state = processor.states.cursorLeft;
        state.roll = 10;
        state.pitch = -5;
        state.yaw = 3;

        processor.recenter('cursorLeft');

        expect(state.rollOffset).toBe(10);
        expect(state.pitchOffset).toBe(-5);
        expect(state.yawOffset).toBe(3);
    });

    it('キャリブレーション中はデータが蓄積される', (): void => {
        const processor = new IMUProcessor(0.95);
        const id = 'cursorRight';
        processor.isCalibrating[id] = true;
        processor.calibrationData[id] = { x: [], y: [], z: [] };

        processor.update(createImuData(id));
        processor.update(createImuData(id));

        expect(processor.calibrationData[id].x.length).toBe(2);
        expect(processor.calibrationData[id].y.length).toBe(2);
        expect(processor.calibrationData[id].z.length).toBe(2);
    });
});
