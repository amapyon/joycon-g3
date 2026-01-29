import {
    ImuData,
    PointerUpdateInput,
    decidePointerUpdate,
} from '../main/imu-pointer';

/**
 * テスト用の入力データを生成する。
 * @param overrides 上書きする値
 * @returns 入力データ
 */
function createInput(overrides: Partial<PointerUpdateInput> = {}): PointerUpdateInput {
    const defaultData: ImuData = {
        id: 'cursorLeft',
        accel: { x: 0, y: 0, z: 0 },
        gyro: { x: 0, y: 0, z: 0 },
    };

    return {
        data: defaultData,
        cursorId: 'cursorLeft',
        cursorVisible: true,
        isCalibrating: false,
        gyroBias: { x: 0, y: 0, z: 0 },
        cursorMapConfig: {},
        currentPosition: { x: 100, y: 100 },
        defaultPosition: { x: 600, y: 300 },
        screenSize: { width: 1000, height: 800 },
        moveSpeed: 0.1,
        gyroDeadzone: 90,
        ...overrides,
    };
}

describe('decidePointerUpdate の動作', (): void => {
    it('非表示の場合は更新しない', (): void => {
        const input = createInput({ cursorVisible: false });

        expect(decidePointerUpdate(input)).toBeNull();
    });

    it('キャリブレーション中は更新しない', (): void => {
        const input = createInput({ isCalibrating: true });

        expect(decidePointerUpdate(input)).toBeNull();
    });

    it('デッドゾーンを適用して移動量を計算する', (): void => {
        const data: ImuData = {
            id: 'cursorLeft',
            accel: { x: 0, y: 0, z: 0 },
            gyro: { x: 10, y: 100, z: -200 },
        };
        const input = createInput({ data });
        const result = decidePointerUpdate(input);

        expect(result).not.toBeNull();
        if (!result) return;
        expect(result.position.x).toBe(80);
        expect(result.position.y).toBe(110);
    });

    it('バイアスを除外して移動量を計算する', (): void => {
        const data: ImuData = {
            id: 'cursorRight',
            accel: { x: 0, y: 0, z: 0 },
            gyro: { x: 0, y: 130, z: 110 },
        };
        const input = createInput({
            data,
            cursorId: 'cursorRight',
            gyroBias: { x: 0, y: 30, z: 10 },
        });
        const result = decidePointerUpdate(input);

        expect(result).not.toBeNull();
        if (!result) return;
        expect(result.position.x).toBe(110);
        expect(result.position.y).toBe(110);
    });

    it('画面サイズに合わせて座標をクランプする', (): void => {
        const data: ImuData = {
            id: 'cursorLeft',
            accel: { x: 0, y: 0, z: 0 },
            gyro: { x: 0, y: -1000, z: 10000 },
        };
        const input = createInput({
            data,
            currentPosition: { x: 950, y: 20 },
            screenSize: { width: 1000, height: 800 },
        });
        const result = decidePointerUpdate(input);

        expect(result).not.toBeNull();
        if (!result) return;
        expect(result.position.x).toBe(1000);
        expect(result.position.y).toBe(0);
    });

    it('カーソルマップ未設定の場合はデフォルト符号を使う', (): void => {
        const data: ImuData = {
            id: 'cursorLeft',
            accel: { x: 0, y: 0, z: 0 },
            gyro: { x: 0, y: 100, z: 100 },
        };
        const input = createInput({ data });
        const result = decidePointerUpdate(input);

        expect(result).not.toBeNull();
        if (!result) return;
        expect(result.configMissing).toBe(true);
        expect(result.sendPayload.id).toBe('cursorLeft');
    });

    it('カーソルマップ設定を反映する', (): void => {
        const data: ImuData = {
            id: 'cursorLeft',
            accel: { x: 0, y: 0, z: 0 },
            gyro: { x: 0, y: 100, z: 100 },
        };
        const input = createInput({
            data,
            cursorMapConfig: {
                cursorLeft: { xSign: -1, ySign: -1 },
            },
        });
        const result = decidePointerUpdate(input);

        expect(result).not.toBeNull();
        if (!result) return;
        expect(result.configMissing).toBe(false);
        expect(result.position.x).toBe(90);
        expect(result.position.y).toBe(90);
    });
});
