export {};
// eslint-disable-next-line @typescript-eslint/no-var-requires -- CommonJS 形式の読み込みが必要
const joyConMainLogic = require('../renderer/main/joycon-logic') as {
    buildJoyConStatusView: (
        side: 'L' | 'R',
        connected: boolean
    ) => {
        text: string;
        className: 'connected' | 'disconnected';
        buttonText: 'ON' | 'OFF';
        buttonBackgroundColor: string;
    };
    formatBatteryText: (level: number) => string;
    resolveCalibrationStatusView: (status: string) => {
        message: string;
        enableCalibrateButton: boolean;
    };
    shouldConnectOnActionClick: (isConnected: boolean) => boolean;
};

describe('メインJoy-Conロジック', (): void => {
    it('接続状態に応じて表示とボタン状態を返す', (): void => {
        expect(joyConMainLogic.buildJoyConStatusView('L', true)).toEqual({
            text: 'L: 🟢',
            className: 'connected',
            buttonText: 'OFF',
            buttonBackgroundColor: '#dc3545',
        });
        expect(joyConMainLogic.buildJoyConStatusView('R', false)).toEqual({
            text: 'R: ⚪',
            className: 'disconnected',
            buttonText: 'ON',
            buttonBackgroundColor: '#28a745',
        });
    });

    it('バッテリー表示文字列をレベルから生成する', (): void => {
        expect(joyConMainLogic.formatBatteryText(4)).toBe('🔋 100%');
        expect(joyConMainLogic.formatBatteryText(0)).toBe('🪫 0%');
        expect(joyConMainLogic.formatBatteryText(99)).toBe('❓ 0%');
    });

    it('キャリブレーション状態に応じた表示情報を返す', (): void => {
        expect(joyConMainLogic.resolveCalibrationStatusView('complete')).toEqual({
            message: 'Calibration complete!',
            enableCalibrateButton: true,
        });
        expect(joyConMainLogic.resolveCalibrationStatusView('failed')).toEqual({
            message: 'Calibration failed.',
            enableCalibrateButton: true,
        });
        expect(joyConMainLogic.resolveCalibrationStatusView('running')).toEqual({
            message: 'Calibration running.',
            enableCalibrateButton: false,
        });
    });

    it('ボタン押下時の接続処理判定を返す', (): void => {
        expect(joyConMainLogic.shouldConnectOnActionClick(true)).toBe(false);
        expect(joyConMainLogic.shouldConnectOnActionClick(false)).toBe(true);
    });
});
