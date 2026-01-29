type TimerStyleStateApi = {
    clampNumber: (value: number, min: number, max: number) => number;
    calcNextFontSize: (current: number, delta: number, min: number, max: number) => number;
    calcNextOpacity: (current: number, delta: number, min: number, max: number) => number;
};

const loadTimerStyleState = (): TimerStyleStateApi => {
    require('../renderer/timer/timer-style-state');
    return (globalThis as unknown as { timerStyleState: TimerStyleStateApi }).timerStyleState;
};

describe('タイマーのスタイル計算', (): void => {
    it('フォントサイズを最小値でクランプする', (): void => {
        const state = loadTimerStyleState();
        expect(state.calcNextFontSize(15, -10, 20, 500)).toBe(20);
    });

    it('フォントサイズを最大値でクランプする', (): void => {
        const state = loadTimerStyleState();
        expect(state.calcNextFontSize(490, 20, 20, 500)).toBe(500);
    });

    it('透明度を最小値でクランプする', (): void => {
        const state = loadTimerStyleState();
        expect(state.calcNextOpacity(0.2, -0.5, 0.1, 1.0)).toBe(0.1);
    });

    it('透明度を最大値でクランプする', (): void => {
        const state = loadTimerStyleState();
        expect(state.calcNextOpacity(0.9, 0.3, 0.1, 1.0)).toBe(1.0);
    });
});
