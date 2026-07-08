import {
    createTimerState,
    decideToggleTimerWindow,
    getTimerWindowMode,
    setTimerCounting,
    setTimerPaused,
    setTimerWindowMode,
    type TimerWindowStatus,
} from '../main/timer-state';

describe('タイマー状態', (): void => {
    it('初期状態はカウント停止かつ未一時停止', (): void => {
        const state = createTimerState();
        expect(state.isCounting).toBe(false);
        expect(state.isPaused).toBe(false);
        expect(state.windowMode).toBe('setup');
    });

    it('カウントしていない場合は setup を返す', (): void => {
        const state = createTimerState();
        expect(getTimerWindowMode(state)).toBe('setup');
    });

    it('カウント中は timer を返す', (): void => {
        const state = setTimerCounting(createTimerState(), true);
        expect(getTimerWindowMode(state)).toBe('timer');
        expect(state.isPaused).toBe(false);
    });

    it('一時停止中は timer を返す', (): void => {
        const state = setTimerPaused(setTimerCounting(createTimerState(), true), true);
        expect(getTimerWindowMode(state)).toBe('timer');
        expect(state.isPaused).toBe(true);
    });

    it('停止中は一時停止を解除する', (): void => {
        const paused = setTimerPaused(setTimerCounting(createTimerState(), true), true);
        const stopped = setTimerCounting(paused, false);
        expect(stopped.isCounting).toBe(false);
        expect(stopped.isPaused).toBe(false);
    });

    it('非カウント中は一時停止を保持しない', (): void => {
        const state = setTimerPaused(createTimerState(), true);
        expect(state.isPaused).toBe(false);
    });

    it('ウィンドウが無い場合は create を返す', (): void => {
        const state = createTimerState();
        const status: TimerWindowStatus = { hasWindow: false, isVisible: false };
        expect(decideToggleTimerWindow(state, status)).toEqual({ action: 'create', mode: 'setup' });
    });

    it('表示中の場合は hide を返す', (): void => {
        const state = createTimerState();
        const status: TimerWindowStatus = { hasWindow: true, isVisible: true };
        expect(decideToggleTimerWindow(state, status)).toEqual({ action: 'hide', mode: 'setup' });
    });

    it('非表示の場合は show を返す', (): void => {
        const state = setTimerCounting(createTimerState(), true);
        const status: TimerWindowStatus = { hasWindow: true, isVisible: false };
        expect(decideToggleTimerWindow(state, status)).toEqual({ action: 'show', mode: 'timer' });
    });
    it('時計表示中に停止通知を受けても clock モードを保持する', (): void => {
        const clockState = setTimerWindowMode(createTimerState(), 'clock');
        const stopped = setTimerCounting(clockState, false);

        expect(getTimerWindowMode(stopped)).toBe('clock');
    });

    it('時計表示中の再表示は clock モードを返す', (): void => {
        const state = setTimerWindowMode(createTimerState(), 'clock');
        const status: TimerWindowStatus = { hasWindow: true, isVisible: false };
        expect(decideToggleTimerWindow(state, status)).toEqual({ action: 'show', mode: 'clock' });
    });
});
