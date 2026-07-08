export type TimerWindowMode = 'setup' | 'timer' | 'clock';

export type TimerState = {
    isCounting: boolean;
    isPaused: boolean;
    windowMode: TimerWindowMode;
};

export type TimerWindowStatus = {
    hasWindow: boolean;
    isVisible: boolean;
};

export type ToggleDecision = {
    action: 'create' | 'show' | 'hide';
    mode: TimerWindowMode;
};

/**
 * タイマー状態の初期値を作成する。
 * @returns 初期状態
 */
export function createTimerState(): TimerState {
    return { isCounting: false, isPaused: false, windowMode: 'setup' };
}

/**
 * タイマーのカウント状態を更新する。
 * @param state 現在の状態
 * @param isCounting 計測中かどうか
 * @returns 更新後の状態
 */
export function setTimerCounting(state: TimerState, isCounting: boolean): TimerState {
    if (!isCounting) {
        return {
            ...state,
            isCounting: false,
            isPaused: false,
            windowMode: state.windowMode === 'timer' ? 'setup' : state.windowMode,
        };
    }
    return { ...state, isCounting: true, isPaused: false, windowMode: 'timer' };
}

/**
 * タイマーの一時停止状態を更新する。
 * @param state 現在の状態
 * @param isPaused 一時停止中かどうか
 * @returns 更新後の状態
 */
export function setTimerPaused(state: TimerState, isPaused: boolean): TimerState {
    if (!state.isCounting) {
        return { ...state, isPaused: false };
    }
    return { ...state, isPaused };
}

/**
 * タイマーウィンドウのモードを取得する。
 * @param state 現在の状態
 * @returns モード
 */
export function getTimerWindowMode(state: TimerState): TimerWindowMode {
    return state.windowMode;
}

/**
 * タイマーウィンドウの表示モードを更新する。
 * @param state 現在の状態
 * @param mode 表示モード
 * @returns 更新後の状態
 */
export function setTimerWindowMode(state: TimerState, mode: TimerWindowMode): TimerState {
    return { ...state, windowMode: mode };
}

/**
 * トグル操作に対するウィンドウ操作を決定する。
 * @param state 現在の状態
 * @param status ウィンドウ状態
 * @returns 決定結果
 */
export function decideToggleTimerWindow(state: TimerState, status: TimerWindowStatus): ToggleDecision {
    const mode = getTimerWindowMode(state);
    if (!status.hasWindow) {
        return { action: 'create', mode };
    }
    if (status.isVisible) {
        return { action: 'hide', mode };
    }
    return { action: 'show', mode };
}
