export type TimerWindowMode = 'setup' | 'timer';

export type TimerState = {
    isCounting: boolean;
    isPaused: boolean;
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
    return { isCounting: false, isPaused: false };
}

/**
 * タイマーのカウント状態を更新する。
 * @param state 現在の状態
 * @param isCounting 計測中かどうか
 * @returns 更新後の状態
 */
export function setTimerCounting(state: TimerState, isCounting: boolean): TimerState {
    if (!isCounting) {
        return { ...state, isCounting: false, isPaused: false };
    }
    return { ...state, isCounting: true, isPaused: false };
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
    return (state.isCounting || state.isPaused) ? 'timer' : 'setup';
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
