type JoyConLogicSide = 'L' | 'R';

type JoyConStatusView = {
    text: string;
    className: 'connected' | 'disconnected';
    buttonText: 'ON' | 'OFF';
    buttonBackgroundColor: string;
};

type CalibrationStatusView = {
    message: string;
    enableCalibrateButton: boolean;
};

type JoyConMainLogicApi = {
    buildJoyConStatusView: (side: JoyConLogicSide, connected: boolean) => JoyConStatusView;
    formatBatteryText: (level: number) => string;
    resolveCalibrationStatusView: (status: string) => CalibrationStatusView;
    shouldConnectOnActionClick: (isConnected: boolean) => boolean;
};

/**
 * Joy-Con 接続状態表示と操作ボタン表示を計算する。
 * @param side Joy-Con 側
 * @param connected 接続状態
 * @returns 表示情報
 */
function buildJoyConStatusView(side: JoyConLogicSide, connected: boolean): JoyConStatusView {
    return {
        text: `${side}: ${connected ? '🟢' : '⚪'}`,
        className: connected ? 'connected' : 'disconnected',
        buttonText: connected ? 'OFF' : 'ON',
        buttonBackgroundColor: connected ? '#dc3545' : '#28a745',
    };
}

/**
 * バッテリー値を表示用文字列へ変換する。
 * @param level バッテリーレベル
 * @returns 表示文字列
 */
function formatBatteryText(level: number): string {
    const batteryMap: Record<number, { icon: string; percentage: number }> = {
        0: { icon: '🪫', percentage: 0 },
        1: { icon: '🔋', percentage: 25 },
        2: { icon: '🔋', percentage: 50 },
        3: { icon: '🔋', percentage: 75 },
        4: { icon: '🔋', percentage: 100 },
    };
    const selected = batteryMap[level] ?? { icon: '❓', percentage: 0 };
    return `${selected.icon} ${selected.percentage}%`;
}

/**
 * キャリブレーション状態を表示情報へ変換する。
 * @param status キャリブレーション状態
 * @returns 表示情報
 */
function resolveCalibrationStatusView(status: string): CalibrationStatusView {
    if (status === 'complete') {
        return {
            message: 'Calibration complete!',
            enableCalibrateButton: true,
        };
    }
    if (status === 'failed') {
        return {
            message: 'Calibration failed.',
            enableCalibrateButton: true,
        };
    }
    return {
        message: `Calibration ${status}.`,
        enableCalibrateButton: false,
    };
}

/**
 * 接続状態から操作ボタン押下時の動作を判定する。
 * @param isConnected 現在の接続状態
 * @returns true の場合は接続処理を呼ぶ
 */
function shouldConnectOnActionClick(isConnected: boolean): boolean {
    return !isConnected;
}

const joyConMainLogicApi: JoyConMainLogicApi = {
    buildJoyConStatusView,
    formatBatteryText,
    resolveCalibrationStatusView,
    shouldConnectOnActionClick,
};

const joyConMainLogicRoot = globalThis as unknown as {
    joyConMainLogic?: JoyConMainLogicApi;
};
joyConMainLogicRoot.joyConMainLogic = joyConMainLogicApi;

if (typeof module !== 'undefined' && module && module.exports) {
    module.exports = joyConMainLogicApi;
}
