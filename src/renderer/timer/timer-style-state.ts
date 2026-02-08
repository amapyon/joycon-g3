((): void => {
    type TimerStyleStateApi = import('../../shared/timer-renderer-types').TimerStyleStateApi;

    /**
     * 数値を指定範囲に収める。
     * @param value 対象値
     * @param min 最小値
     * @param max 最大値
     * @returns 補正後の値
     */
    const clampNumber = (value: number, min: number, max: number): number => {
        return Math.min(max, Math.max(min, value));
    };

    /**
     * フォントサイズの次の値を計算する。
     * @param current 現在値
     * @param delta 増減量
     * @param min 最小値
     * @param max 最大値
     * @returns 計算後のフォントサイズ
     */
    const calcNextFontSize = (current: number, delta: number, min: number, max: number): number => {
        return clampNumber(current + delta, min, max);
    };

    /**
     * 透明度の次の値を計算する。
     * @param current 現在値
     * @param delta 増減量
     * @param min 最小値
     * @param max 最大値
     * @returns 計算後の透明度
     */
    const calcNextOpacity = (current: number, delta: number, min: number, max: number): number => {
        return clampNumber(current + delta, min, max);
    };

    const api: TimerStyleStateApi = {
        clampNumber,
        calcNextFontSize,
        calcNextOpacity,
    };

    const root = globalThis as unknown as { timerStyleState?: TimerStyleStateApi };
    root.timerStyleState = api;
})();
