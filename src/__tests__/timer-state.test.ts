import {
    createTimerState,
    decideToggleTimerWindow,
    getTimerWindowMode,
    setTimerCounting,
    type TimerWindowStatus,
} from '../main/timer-state';

describe('タイマー状態', (): void => {
    it('カウントしていない場合は setup を返す', (): void => {
        const state = createTimerState();
        expect(getTimerWindowMode(state)).toBe('setup');
    });

    it('カウント中は timer を返す', (): void => {
        const state = setTimerCounting(createTimerState(), true);
        expect(getTimerWindowMode(state)).toBe('timer');
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
});
