import { readFileSync } from 'fs';
import { join } from 'path';
import { performance } from 'perf_hooks';
import { IMUProcessor } from '../main/imu-processor';
import { decidePointerUpdate, Vector3 } from '../main/imu-pointer';

type RecordedMotion = {
    source: string;
    action: string;
    bias: Vector3;
    initialGravity: Vector3;
    samples: [number, number, number, number, number, number, number][];
};

const recordings: RecordedMotion[] = JSON.parse(readFileSync(
    join(__dirname, 'fixtures/joycon-r-motion.json'), 'utf8',
)) as RecordedMotion[];

/**
 * 実測した経過時間で右 Joy-Con の姿勢を更新する。
 * @param processor テスト対象
 * @param accel 生加速度
 * @param gyro 生ジャイロ
 * @param dt 経過秒
 */
function updateRecordedMotion(processor: IMUProcessor, accel: Vector3, gyro: Vector3, dt: number): void {
    processor.states.cursorRight.lastTimestamp = performance.now() - dt * 1000;
    processor.update({ id: 'cursorRight', accel, gyro });
}

describe('右 Joy-Con の実測記録による回帰検証', (): void => {
    it.each(recordings)('$action の実測データを正しい画面軸へ変換する', (recording: RecordedMotion): void => {
        const processor = new IMUProcessor();
        const state = processor.states.cursorRight;
        state.gyroBiasX = recording.bias.x;
        state.gyroBiasY = recording.bias.y;
        state.gyroBiasZ = recording.bias.z;
        state.pointerGravity = { ...recording.initialGravity };
        state.hasPointerGravity = true;
        const first = recording.samples[0];

        // 測定手順の準備時間を再現し、記録時の誤った姿勢から復帰させる。
        for (let index = 0; index < 120; index += 1) {
            updateRecordedMotion(processor, { x: first[1], y: first[2], z: first[3] }, recording.bias, 1 / 60);
        }
        expect(state.pointerGravity.z).toBeGreaterThan(0.95);

        let horizontal = 0;
        let vertical = 0;
        let horizontalDistance = 0;
        let verticalDistance = 0;
        for (const [dt, ax, ay, az, gx, gy, gz] of recording.samples) {
            const accel = { x: ax, y: ay, z: az };
            const gyro = { x: gx, y: gy, z: gz };
            updateRecordedMotion(processor, accel, gyro, dt);
            const decision = decidePointerUpdate({
                data: { id: 'cursorRight', accel, gyro },
                cursorId: 'cursorRight', cursorVisible: true, isCalibrating: false,
                gyroBias: recording.bias,
                xRotationDegrees: state.xRotation, xRotationCompensationStrength: 1,
                fixedXRotationDegrees: null,
                screenGyro: { x: 0, y: state.pointerGyroY, z: state.pointerGyroZ },
                cursorMapConfig: { cursorRight: { xSign: 1, ySign: -1 } },
                currentPosition: { x: 960, y: 540 }, defaultPosition: { x: 960, y: 540 },
                screenSize: { width: 1920, height: 1080 },
                moveSpeed: 0.05, gyroDeadzone: 120, deltaTimeSeconds: dt,
            });
            const delta = decision?.diagnostics.sample?.requestedDeltaPixels;
            expect(delta).toBeDefined();
            if (!delta) continue;
            horizontal += delta.x;
            vertical += delta.y;
            horizontalDistance += Math.abs(delta.x);
            verticalDistance += Math.abs(delta.y);
        }

        if (recording.action === '右へ振る' || recording.action === '左へ振る') {
            expect(horizontal * (recording.action === '右へ振る' ? 1 : -1)).toBeGreaterThan(100);
            expect(verticalDistance).toBeLessThan(horizontalDistance * 0.2);
        } else {
            expect(vertical * (recording.action === '下へ振る' ? 1 : -1)).toBeGreaterThan(100);
            expect(horizontalDistance).toBeLessThan(verticalDistance * 0.2);
        }
    });
});
