export type RStickAnalog = { x: number; y: number };

export type RStickState = {
    isPressed: boolean;
    lastAnalogData: RStickAnalog | null;
    lastFontSizeChangeTime: number;
    isTimerMenuNavActive: boolean;
};

export type RStickConfig = {
    fontSizeChangeAmount: number;
    fontSizeChangeInterval: number;
    analogCenter: number;
    fontSizeDeadzone: number;
    navDeadzone: number;
};

export type RStickAction = {
    target: 'timer' | 'cursor';
    channel: string;
    payload?: number;
};

export type RStickDecision = {
    state: RStickState;
    actions: RStickAction[];
    shouldEnsureTimerWindow: boolean;
};

export type RStickPressInput = {
    pressed: boolean;
    now: number;
    state: RStickState;
    config: RStickConfig;
};

export type RStickAnalogInput = {
    analog: RStickAnalog;
    now: number;
    state: RStickState;
    config: RStickConfig;
};

/**
 * R スティックの押下イベントを処理する。
 * @param input 入力データ
 * @returns 決定結果
 */
export function decideRStickPress(input: RStickPressInput): RStickDecision {
    const nextState: RStickState = {
        ...input.state,
        isPressed: input.pressed,
    };
    const actions: RStickAction[] = [];
    let shouldEnsureTimerWindow = false;

    if (input.pressed) {
        actions.push({ target: 'timer', channel: 'timer-menu-select' });
        shouldEnsureTimerWindow = true;
    }

    if (input.pressed && input.state.lastAnalogData) {
        const fontSizeResult = decideFontSizeChange({
            joystickY: input.state.lastAnalogData.y,
            now: input.now,
            lastFontSizeChangeTime: input.state.lastFontSizeChangeTime,
            config: input.config,
        });
        if (fontSizeResult.changeAmount !== null) {
            actions.push({
                target: 'cursor',
                channel: 'change-font-size',
                payload: fontSizeResult.changeAmount,
            });
            nextState.lastFontSizeChangeTime = fontSizeResult.nextLastChangeTime;
        }
    }

    return { state: nextState, actions, shouldEnsureTimerWindow };
}

/**
 * R スティックのアナログ入力を処理する。
 * @param input 入力データ
 * @returns 決定結果
 */
export function decideRStickAnalog(input: RStickAnalogInput): RStickDecision {
    const nextState: RStickState = {
        ...input.state,
        lastAnalogData: input.analog,
    };
    const actions: RStickAction[] = [];

    const diffX = input.analog.x - input.config.analogCenter;
    if (Math.abs(diffX) < input.config.navDeadzone) {
        nextState.isTimerMenuNavActive = false;
    } else if (!input.state.isTimerMenuNavActive) {
        const direction = diffX < 0 ? -1 : 1;
        actions.push({
            target: 'timer',
            channel: 'timer-menu-navigate',
            payload: direction,
        });
        nextState.isTimerMenuNavActive = true;
    }

    if (input.state.isPressed) {
        const fontSizeResult = decideFontSizeChange({
            joystickY: input.analog.y,
            now: input.now,
            lastFontSizeChangeTime: input.state.lastFontSizeChangeTime,
            config: input.config,
        });
        if (fontSizeResult.changeAmount !== null) {
            actions.push({
                target: 'cursor',
                channel: 'change-font-size',
                payload: fontSizeResult.changeAmount,
            });
            nextState.lastFontSizeChangeTime = fontSizeResult.nextLastChangeTime;
        }
    }

    return { state: nextState, actions, shouldEnsureTimerWindow: true };
}

type FontSizeDecisionInput = {
    joystickY: number;
    now: number;
    lastFontSizeChangeTime: number;
    config: RStickConfig;
};

type FontSizeDecisionResult = {
    changeAmount: number | null;
    nextLastChangeTime: number;
};

/**
 * フォントサイズ変更を判定する。
 * @param input 入力データ
 * @returns 判定結果
 */
function decideFontSizeChange(input: FontSizeDecisionInput): FontSizeDecisionResult {
    if (input.now - input.lastFontSizeChangeTime < input.config.fontSizeChangeInterval) {
        return { changeAmount: null, nextLastChangeTime: input.lastFontSizeChangeTime };
    }

    const center = input.config.analogCenter;
    const deadzone = input.config.fontSizeDeadzone;

    if (input.joystickY < center - deadzone) {
        return { changeAmount: input.config.fontSizeChangeAmount, nextLastChangeTime: input.now };
    }

    if (input.joystickY > center + deadzone) {
        return { changeAmount: -input.config.fontSizeChangeAmount, nextLastChangeTime: input.now };
    }

    return { changeAmount: null, nextLastChangeTime: input.lastFontSizeChangeTime };
}
