import {
    RStickConfig,
    RStickState,
    decideRStickAnalog,
    decideRStickPress,
} from '../main/r-stick-handler';

const config: RStickConfig = {
    fontSizeChangeAmount: 2,
    fontSizeChangeInterval: 100,
    analogCenter: 2048,
    fontSizeDeadzone: 200,
    navDeadzone: 600,
};

/**
 * テスト用の状態を生成する。
 * @param overrides 上書きする値
 * @returns 状態
 */
function createState(overrides: Partial<RStickState> = {}): RStickState {
    return {
        isPressed: false,
        lastAnalogData: null,
        lastFontSizeChangeTime: 0,
        isTimerMenuNavActive: false,
        ...overrides,
    };
}

describe('R スティックのイベント処理', (): void => {
    it('押下時はタイマーメニュー選択を送る', (): void => {
        const result = decideRStickPress({
            pressed: true,
            now: 1000,
            state: createState(),
            config,
        });

        expect(result.state.isPressed).toBe(true);
        expect(result.shouldEnsureTimerWindow).toBe(true);
        expect(result.actions).toEqual([
            { target: 'timer', channel: 'timer-menu-select' },
        ]);
    });

    it('押下継続中はタイマーメニュー選択を送らない', (): void => {
        const result = decideRStickPress({
            pressed: true,
            now: 1200,
            state: createState({ isPressed: true }),
            config,
        });

        expect(result.actions).toEqual([]);
    });

    it('押下時に前回アナログ値があればフォントサイズを変更する', (): void => {
        const result = decideRStickPress({
            pressed: true,
            now: 1000,
            state: createState({
                lastAnalogData: { x: 2048, y: 1700 },
                lastFontSizeChangeTime: 0,
            }),
            config,
        });

        expect(result.actions).toEqual([
            { target: 'timer', channel: 'timer-menu-select' },
            { target: 'cursor', channel: 'change-font-size', payload: 2 },
        ]);
        expect(result.state.lastFontSizeChangeTime).toBe(1000);
    });

    it('フォントサイズ変更は間隔制限で抑制される', (): void => {
        const result = decideRStickPress({
            pressed: true,
            now: 1050,
            state: createState({
                lastAnalogData: { x: 2048, y: 3000 },
                lastFontSizeChangeTime: 1000,
            }),
            config,
        });

        expect(result.actions).toEqual([
            { target: 'timer', channel: 'timer-menu-select' },
        ]);
        expect(result.state.lastFontSizeChangeTime).toBe(1000);
    });

    it('アナログ入力でメニュー移動を 1 回だけ送る', (): void => {
        const result = decideRStickAnalog({
            analog: { x: 3000, y: 2048 },
            now: 1000,
            state: createState(),
            config,
        });

        expect(result.actions).toEqual([
            { target: 'timer', channel: 'timer-menu-navigate', payload: 1 },
        ]);
        expect(result.state.isTimerMenuNavActive).toBe(true);
    });

    it('アナログ入力でフォントサイズを変更する', (): void => {
        const result = decideRStickAnalog({
            analog: { x: 2048, y: 1500 },
            now: 2000,
            state: createState({
                isPressed: true,
            }),
            config,
        });

        expect(result.actions).toEqual([
            { target: 'cursor', channel: 'change-font-size', payload: 2 },
        ]);
        expect(result.state.lastFontSizeChangeTime).toBe(2000);
    });

    it('中央付近に戻ったらメニュー移動状態が解除される', (): void => {
        const result = decideRStickAnalog({
            analog: { x: 2048, y: 2048 },
            now: 1000,
            state: createState({
                isTimerMenuNavActive: true,
            }),
            config,
        });

        expect(result.state.isTimerMenuNavActive).toBe(false);
    });
});
