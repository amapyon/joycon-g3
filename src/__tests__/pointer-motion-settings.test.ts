import {
    DEFAULT_POINTER_MOTION_SETTINGS,
    normalizePointerMotionSettings,
} from '../shared/pointer-motion-settings';

describe('ポインター補正設定', (): void => {
    it('補正強度と固定角度と診断表示を正規化する', (): void => {
        expect(normalizePointerMotionSettings({
            moveSpeed: 0.05,
            gyroDeadzone: 120,
            xRotationCompensationStrength: 0.75,
            fixedXRotationDegrees: -30,
            diagnosticsEnabled: true,
        })).toEqual({
            moveSpeed: 0.05,
            gyroDeadzone: 120,
            xRotationCompensationStrength: 0.75,
            fixedXRotationDegrees: -30,
            diagnosticsEnabled: true,
        });
    });

    it('範囲外の補正強度を制限し未対応の固定角度を自動へ戻す', (): void => {
        const settings = normalizePointerMotionSettings({
            xRotationCompensationStrength: 1.5,
            fixedXRotationDegrees: 45,
        });

        expect(settings.xRotationCompensationStrength).toBe(1);
        expect(settings.fixedXRotationDegrees).toBeNull();
    });

    it('設定がない場合は既定値を使用する', (): void => {
        expect(normalizePointerMotionSettings(undefined)).toEqual(DEFAULT_POINTER_MOTION_SETTINGS);
    });
});
