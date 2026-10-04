import {
    ImuData,
    PointerUpdateInput,
    decidePointerUpdate,
    inspectPointerMotion,
    scalePointerPosition,
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
        xRotationDegrees: 0,
        xRotationCompensationStrength: 1,
        fixedXRotationDegrees: null,
        screenGyro: null,
        cursorMapConfig: {},
        currentPosition: { x: 100, y: 100 },
        defaultPosition: { x: 600, y: 300 },
        screenSize: { width: 1000, height: 800 },
        moveSpeed: 0.1,
        gyroDeadzone: 90,
        deltaTimeSeconds: 1 / 60,
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

    it('更新間隔に応じて移動量を正規化する', (): void => {
        const data: ImuData = {
            id: 'cursorLeft',
            accel: { x: 0, y: 0, z: 0 },
            gyro: { x: 0, y: 0, z: 200 },
        };
        const fastResult = decidePointerUpdate(createInput({ data, deltaTimeSeconds: 1 / 120 }));
        const slowResult = decidePointerUpdate(createInput({ data, deltaTimeSeconds: 1 / 30 }));

        expect(fastResult?.position.x).toBeCloseTo(110);
        expect(slowResult?.position.x).toBeCloseTo(140);
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

    it('X 軸まわりに 90 度ひねっても水平移動を維持する', (): void => {
        const input = createInput({
            data: {
                id: 'cursorLeft',
                accel: { x: 0, y: 4096, z: 0 },
                gyro: { x: 0, y: 200, z: 0 },
            },
            xRotationDegrees: 90,
        });
        const result = decidePointerUpdate(input);

        expect(result).not.toBeNull();
        if (!result) return;
        expect(result.position.x).toBeCloseTo(120);
        expect(result.position.y).toBeCloseTo(100);
    });

    it('X 軸まわりに 90 度ひねっても垂直移動を維持する', (): void => {
        const input = createInput({
            data: {
                id: 'cursorLeft',
                accel: { x: 0, y: 4096, z: 0 },
                gyro: { x: 0, y: 0, z: -200 },
            },
            xRotationDegrees: 90,
        });
        const result = decidePointerUpdate(input);

        expect(result).not.toBeNull();
        if (!result) return;
        expect(result.position.x).toBeCloseTo(100);
        expect(result.position.y).toBeCloseTo(120);
    });

    it('推定角度に 50% の補正強度を適用する', (): void => {
        const result = decidePointerUpdate(createInput({
            xRotationDegrees: 60,
            xRotationCompensationStrength: 0.5,
        }));

        expect(result?.diagnostics.appliedXRotationDegrees).toBe(30);
    });

    it('自動推定の代わりに実験用の固定角度を使用する', (): void => {
        const result = decidePointerUpdate(createInput({
            xRotationDegrees: 15,
            xRotationCompensationStrength: 0.75,
            fixedXRotationDegrees: -60,
        }));

        expect(result?.diagnostics.appliedXRotationDegrees).toBe(-45);
    });

    it('補正後の Y と Z から軸漏れ率を算出する', (): void => {
        const result = decidePointerUpdate(createInput({
            data: {
                id: 'cursorLeft',
                accel: { x: 0, y: 0, z: 4096 },
                gyro: { x: 0, y: 100, z: 200 },
            },
        }));

        expect(result?.diagnostics.axisLeakageRatio).toBeCloseTo(0.5);
    });

    it('画面基準ジャイロがあれば保持角補正より優先する', (): void => {
        const result = decidePointerUpdate(createInput({
            data: {
                id: 'cursorLeft',
                accel: { x: 0, y: 4096, z: 0 },
                gyro: { x: 0, y: 500, z: 500 },
            },
            xRotationDegrees: 90,
            screenGyro: { x: 0, y: 0, z: 200 },
        }));

        expect(result?.position.x).toBeCloseTo(120);
        expect(result?.position.y).toBeCloseTo(100);
    });
});

describe('scalePointerPosition の動作', (): void => {
    it('表示先変更時に相対位置を維持する', (): void => {
        expect(scalePointerPosition(
            { x: 960, y: 540 },
            { width: 1920, height: 1080 },
            { width: 1280, height: 720 },
        )).toEqual({ x: 640, y: 360 });
    });
});

describe('姿勢検証用の処理段階別データ', (): void => {
    it('非表示でも生値とバイアス補正と閾値前後を取得し座標を変えない', (): void => {
        const input = createInput({
            cursorVisible: false,
            data: { id: 'cursorRight', accel: { x: 0, y: 0, z: -4096 }, gyro: { x: 100, y: 200, z: 300 } },
            gyroBias: { x: 10, y: 20, z: 30 },
            screenGyro: { x: 0, y: 50, z: 200 },
            cursorId: 'cursorRight',
            cursorMapConfig: { cursorRight: { xSign: 1, ySign: -1 } },
        });
        const diagnostics = inspectPointerMotion(input);

        expect(decidePointerUpdate(input)).toBeNull();
        expect(input.currentPosition).toEqual({ x: 100, y: 100 });
        expect(diagnostics.sample).toMatchObject({
            cursorVisible: false,
            rawGyro: { x: 100, y: 200, z: 300 },
            accelG: { x: 0, y: 0, z: -1 },
            accelerationMagnitudeG: 1,
            gyroDps: { x: 90 * 2000 / 32768, y: 180 * 2000 / 32768, z: 270 * 2000 / 32768 },
            projectedGyroRaw: { x: 0, y: 50, z: 200 },
            filteredGyroRaw: { x: 0, y: 0, z: 200 },
            requestedDeltaPixels: { x: 20, y: -0 },
            actualDeltaPixels: { x: 0, y: 0 },
        });
    });

    it('予定移動と画面端の制限後の実移動を区別する', (): void => {
        const decision = decidePointerUpdate(createInput({
            currentPosition: { x: 995, y: 100 },
            screenGyro: { x: 0, y: 0, z: 200 },
        }));
        expect(decision?.diagnostics.sample?.requestedDeltaPixels.x).toBe(20);
        expect(decision?.diagnostics.sample?.actualDeltaPixels.x).toBe(5);
        expect(decision?.diagnostics.sample?.positionPixels).toEqual(decision?.position);
    });
});
