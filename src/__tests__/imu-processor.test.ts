import { IMUProcessor } from '../main/imu-processor';
import { performance } from 'perf_hooks';

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

    it('重力方向から X 軸まわりの保持角度を初期化する', (): void => {
        const processor = new IMUProcessor(0.95);
        const data = createImuData('cursorLeft');
        data.accel = { x: 0, y: 16384, z: 0 };

        processor.update(data);

        expect(processor.states.cursorLeft.xRotation).toBeCloseTo(90);
        expect(processor.states.cursorLeft.hasXRotation).toBe(true);
    });

    it('右 Joy-Con は反対向きの Z 軸を水平保持の基準にする', (): void => {
        const processor = new IMUProcessor(0.95);
        const data = createImuData('cursorRight');
        data.accel = { x: 0, y: 0, z: -16384 };

        processor.update(data);

        expect(processor.states.cursorRight.xRotation).toBeCloseTo(0);
        expect(processor.states.cursorRight.hasXRotation).toBe(true);
    });

    it('左右操作中の加速度を X 軸まわりのひねりとして取り込まない', (): void => {
        const processor = new IMUProcessor(0.95);
        const stationaryData = createImuData('cursorLeft');
        stationaryData.accel = { x: 0, y: 0, z: 16384 };
        processor.update(stationaryData);

        const movingData = createImuData('cursorLeft');
        movingData.accel = { x: 0, y: 8192, z: 14189 };
        movingData.gyro = { x: 0, y: 0, z: 1000 };
        for (let index = 0; index < 20; index += 1) {
            processor.update(movingData);
        }

        expect(processor.states.cursorLeft.xRotation).toBeCloseTo(0);
    });

    it('90度ねじった状態でも水平操作を画面の横軸へ変換する', (): void => {
        const processor = new IMUProcessor(0.95);
        const data = createImuData('cursorLeft');
        data.accel = { x: 0, y: 16384, z: 0 };
        data.gyro = { x: 0, y: 200, z: 0 };

        processor.update(data);

        expect(processor.states.cursorLeft.hasPointerGravity).toBe(true);
        expect(processor.states.cursorLeft.pointerGyroZ).toBeCloseTo(200, 0);
        expect(processor.states.cursorLeft.pointerGyroY).toBeCloseTo(0, 0);
    });

    it('90度ねじった状態でも垂直操作を画面の縦軸へ変換する', (): void => {
        const processor = new IMUProcessor(0.95);
        const data = createImuData('cursorLeft');
        data.accel = { x: 0, y: 16384, z: 0 };
        data.gyro = { x: 0, y: 0, z: -200 };

        processor.update(data);

        expect(processor.states.cursorLeft.pointerGyroZ).toBeCloseTo(0, 0);
        expect(processor.states.cursorLeft.pointerGyroY).toBeCloseTo(200, 0);
    });

    it('右 Joy-Con のセンサー向きを共通座標へ揃える', (): void => {
        const processor = new IMUProcessor(0.95);
        const data = createImuData('cursorRight');
        data.accel = { x: 0, y: 0, z: -16384 };
        data.gyro = { x: 0, y: 150, z: 250 };

        processor.update(data);

        expect(processor.states.cursorRight.pointerGyroY).toBeCloseTo(150, 0);
        expect(processor.states.cursorRight.pointerGyroZ).toBeCloseTo(250, 0);
    });

    it('右 Joy-Con の通常持ちで左右操作を画面の横軸へ変換する', (): void => {
        const processor = new IMUProcessor(0.95);
        const data = createImuData('cursorRight');
        data.accel = { x: 0, y: 0, z: -16384 };
        data.gyro = { x: 0, y: 0, z: 200 };

        processor.update(data);

        expect(processor.states.cursorRight.pointerGyroZ).toBeCloseTo(200, 0);
        expect(processor.states.cursorRight.pointerGyroY).toBeCloseTo(0, 0);
    });

    it('右 Joy-Con の通常持ちで上下操作を画面の縦軸へ変換する', (): void => {
        const processor = new IMUProcessor(0.95);
        const data = createImuData('cursorRight');
        data.accel = { x: 0, y: 0, z: -16384 };
        data.gyro = { x: 0, y: 200, z: 0 };

        processor.update(data);

        expect(processor.states.cursorRight.pointerGyroZ).toBeCloseTo(0, 0);
        expect(processor.states.cursorRight.pointerGyroY).toBeCloseTo(200, 0);
    });

    it('右 Joy-Con の長手方向のひねりをポインター移動へ混入させない', (): void => {
        const processor = new IMUProcessor(0.95);
        const data = createImuData('cursorRight');
        data.accel = { x: 0, y: 0, z: -16384 };
        data.gyro = { x: 200, y: 0, z: 0 };

        processor.update(data);

        expect(processor.states.cursorRight.pointerGyroZ).toBeCloseTo(0, 0);
        expect(processor.states.cursorRight.pointerGyroY).toBeCloseTo(0, 0);
    });

    it.each([-90, -60, -30, 0, 30, 60, 90])(
        '右 Joy-Con は保持角 %d 度でも画面の縦横軸を維持する',
        (degrees: number): void => {
            const radians = degrees * Math.PI / 180;
            const horizontalProcessor = new IMUProcessor(0.95);
            const horizontal = createImuData('cursorRight');
            horizontal.accel = {
                x: 0,
                y: -Math.sin(radians) * 16384,
                z: -Math.cos(radians) * 16384,
            };
            horizontal.gyro = {
                x: 0,
                y: Math.sin(radians) * 200,
                z: Math.cos(radians) * 200,
            };
            horizontalProcessor.update(horizontal);

            const verticalProcessor = new IMUProcessor(0.95);
            const vertical = createImuData('cursorRight');
            vertical.accel = { ...horizontal.accel };
            vertical.gyro = {
                x: 0,
                y: Math.cos(radians) * 200,
                z: -Math.sin(radians) * 200,
            };
            verticalProcessor.update(vertical);

            expect(horizontalProcessor.states.cursorRight.pointerGyroZ).toBeCloseTo(200, 0);
            expect(horizontalProcessor.states.cursorRight.pointerGyroY).toBeCloseTo(0, 0);
            expect(verticalProcessor.states.cursorRight.pointerGyroZ).toBeCloseTo(0, 0);
            expect(verticalProcessor.states.cursorRight.pointerGyroY).toBeCloseTo(200, 0);
        },
    );

    it.each([-90, -60, -30, 0, 30, 60, 90])(
        '保持角 %d 度でも画面の縦横軸を維持する',
        (degrees: number): void => {
            const radians = degrees * Math.PI / 180;
            const horizontalProcessor = new IMUProcessor(0.95);
            const horizontal = createImuData('cursorLeft');
            horizontal.accel = {
                x: 0,
                y: Math.sin(radians) * 16384,
                z: Math.cos(radians) * 16384,
            };
            horizontal.gyro = {
                x: 0,
                y: Math.sin(radians) * 200,
                z: Math.cos(radians) * 200,
            };
            horizontalProcessor.update(horizontal);

            const verticalProcessor = new IMUProcessor(0.95);
            const vertical = createImuData('cursorLeft');
            vertical.accel = { ...horizontal.accel };
            vertical.gyro = {
                x: 0,
                y: Math.cos(radians) * 200,
                z: -Math.sin(radians) * 200,
            };
            verticalProcessor.update(vertical);

            expect(horizontalProcessor.states.cursorLeft.pointerGyroZ).toBeCloseTo(200, 0);
            expect(horizontalProcessor.states.cursorLeft.pointerGyroY).toBeCloseTo(0, 0);
            expect(verticalProcessor.states.cursorLeft.pointerGyroZ).toBeCloseTo(0, 0);
            expect(verticalProcessor.states.cursorLeft.pointerGyroY).toBeCloseTo(200, 0);
        },
    );

    it('操作中にねじっても画面基準の横軸を維持する', (): void => {
        const processor = new IMUProcessor(0.95);
        const data = createImuData('cursorLeft');
        data.accel = { x: 0, y: 0, z: 16384 };
        processor.update(data);

        for (let index = 1; index <= 60; index += 1) {
            const angle = Math.PI * 0.5 * index / 60;
            data.accel = {
                x: 0,
                y: Math.sin(angle) * 16384,
                z: Math.cos(angle) * 16384,
            };
            data.gyro = { x: 1475, y: 0, z: 0 };
            processor.states.cursorLeft.lastTimestamp = performance.now() - 1000 / 60;
            processor.update(data);
        }

        data.accel = { x: 0, y: 16384, z: 0 };
        data.gyro = { x: 0, y: 200, z: 0 };
        processor.states.cursorLeft.lastTimestamp = performance.now() - 1000 / 60;
        processor.update(data);

        expect(processor.states.cursorLeft.pointerGyroZ).toBeCloseTo(200, -1);
        expect(Math.abs(processor.states.cursorLeft.pointerGyroY)).toBeLessThan(20);
    });

    it('1Gから外れる並進加速度で重力方向を急変させない', (): void => {
        const processor = new IMUProcessor(0.95);
        const data = createImuData('cursorLeft');
        data.accel = { x: 0, y: 0, z: 16384 };
        processor.update(data);

        data.accel = { x: 0, y: 24576, z: 0 };
        data.gyro = { x: 0, y: 0, z: 0 };
        processor.states.cursorLeft.lastTimestamp = performance.now() - 1000 / 60;
        processor.update(data);

        expect(processor.states.cursorLeft.pointerGravity.z).toBeCloseTo(1);
        expect(processor.states.cursorLeft.pointerGravity.y).toBeCloseTo(0);
    });
});
