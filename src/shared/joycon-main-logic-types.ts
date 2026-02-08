/**
 * Joy-Con の左右識別子。
 */
export type JoyConLogicSide = 'L' | 'R';

/**
 * Joy-Con 接続状態表示情報。
 */
export type JoyConStatusView = {
    text: string;
    className: 'connected' | 'disconnected';
    buttonText: 'ON' | 'OFF';
    buttonBackgroundColor: string;
};

/**
 * キャリブレーション状態表示情報。
 */
export type CalibrationStatusView = {
    message: string;
    enableCalibrateButton: boolean;
};

/**
 * メイン画面の Joy-Con ロジックAPI。
 */
export type JoyConMainLogicApi = {
    buildJoyConStatusView: (side: JoyConLogicSide, connected: boolean) => JoyConStatusView;
    formatBatteryText: (level: number) => string;
    resolveCalibrationStatusView: (status: string) => CalibrationStatusView;
    shouldConnectOnActionClick: (isConnected: boolean) => boolean;
};
