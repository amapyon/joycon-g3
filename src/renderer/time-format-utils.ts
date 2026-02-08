type TimerTimeFormatUtilsApi = {
    formatMinutesSeconds: (seconds: number) => string;
};

/**
 * 秒数を M:SS 形式に整形する。
 * @param seconds 秒数
 * @returns 表示用文字列
 */
function formatMinutesSeconds(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
}

const timerTimeFormatUtilsApi: TimerTimeFormatUtilsApi = {
    formatMinutesSeconds,
};

const timerTimeFormatRoot = (typeof window !== 'undefined' ? window : globalThis) as unknown as {
    timerTimeFormat?: TimerTimeFormatUtilsApi;
};
timerTimeFormatRoot.timerTimeFormat = timerTimeFormatUtilsApi;

if (typeof module !== 'undefined' && module && module.exports) {
    module.exports = timerTimeFormatUtilsApi;
}
