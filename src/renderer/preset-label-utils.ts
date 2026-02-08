type TimerPresetLabelUtilsApi = {
    formatTimerPresetLabel: (seconds: number) => string;
};

/**
 * タイマープリセットの表示ラベルを生成する。
 * @param seconds 秒数
 * @returns 表示ラベル
 */
function formatTimerPresetLabel(seconds: number): string {
    if (seconds < 60) {
        return `${seconds}s`;
    }
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs === 0 ? `${mins}m` : `${mins}m${secs}s`;
}

const timerPresetLabelUtilsApi: TimerPresetLabelUtilsApi = {
    formatTimerPresetLabel,
};

const timerPresetLabelRoot = globalThis as typeof globalThis & {
    timerPresetLabel?: TimerPresetLabelUtilsApi;
};
timerPresetLabelRoot.timerPresetLabel = timerPresetLabelUtilsApi;

if (typeof module !== 'undefined' && module && module.exports) {
    module.exports = timerPresetLabelUtilsApi;
}
