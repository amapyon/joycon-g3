import { buildLeftButtonEvents, buildRightButtonEvents, JoyConButtonStateSnapshot } from '../main/joycon-button-utils';

/**
 * ボタン状態の初期値を作成する。
 * @returns 初期状態
 */
function createInitialButtonState(): JoyConButtonStateSnapshot {
    return {
        slPressed: false,
        srPressed: false,
        downPressed: false,
        leftPressed: false,
        rightPressed: false,
        xPressed: false,
        aPressed: false,
        yPressed: false,
        plusPressed: false,
        minusPressed: false,
        rStickPressed: false,
        homePressed: false,
    };
}

describe('Joy-Conボタンユーティリティ', (): void => {
    it('左 Joy-Con の押下エッジでイベントを生成する', (): void => {
        const lastState = createInitialButtonState();
        const result = buildLeftButtonEvents(0x11, 0x01, 'cursorLeft', lastState);
        type EventName = { name: string };
        const eventNames = result.events.map((event: EventName): string => event.name);

        expect(eventNames).toContain('button-down');
        expect(eventNames).toContain('button-down-pressed');
        expect(eventNames).toContain('button-sr');
        expect(eventNames).toContain('button-sr-pressed');
        expect(eventNames).toContain('button-minus');
        expect(eventNames).toContain('button-minus-pressed');
        expect(result.nextState.downPressed).toBe(true);
        expect(result.nextState.srPressed).toBe(true);
        expect(result.nextState.minusPressed).toBe(true);
    });

    it('右 Joy-Con の押下エッジでイベントを生成する', (): void => {
        const lastState = createInitialButtonState();
        const result = buildRightButtonEvents(0x1b, 0x17, 'cursorRight', lastState);
        type EventName = { name: string };
        const eventNames = result.events.map((event: EventName): string => event.name);

        expect(eventNames).toContain('button-x');
        expect(eventNames).toContain('button-x-pressed');
        expect(eventNames).toContain('button-plus');
        expect(eventNames).toContain('button-plus-pressed');
        expect(eventNames).toContain('button-minus');
        expect(eventNames).toContain('button-minus-pressed');
        expect(eventNames).toContain('button-sr');
        expect(eventNames).toContain('button-sr-pressed');
        expect(eventNames).toContain('r-stick');
        expect(eventNames).toContain('r-stick-pressed');
        expect(eventNames).toContain('button-home');
        expect(eventNames).toContain('button-home-pressed');
    });

    it('継続押下では pressed イベントを重複生成しない', (): void => {
        const lastState = createInitialButtonState();
        lastState.downPressed = true;
        lastState.srPressed = true;
        lastState.minusPressed = true;

        const result = buildLeftButtonEvents(0x11, 0x01, 'cursorLeft', lastState);
        type EventName = { name: string };
        const eventNames = result.events.map((event: EventName): string => event.name);

        expect(eventNames).toContain('button-down');
        expect(eventNames).toContain('button-sr');
        expect(eventNames).toContain('button-minus');
        expect(eventNames).not.toContain('button-down-pressed');
        expect(eventNames).not.toContain('button-sr-pressed');
        expect(eventNames).not.toContain('button-minus-pressed');
    });
});
