export {};
// eslint-disable-next-line @typescript-eslint/no-var-requires -- CommonJS 形式の読み込みが必要
const cursorRuntimeLogic = require('../renderer/cursor-runtime-logic') as {
    isValidViewport: (width: number, height: number) => boolean;
    resolveResetPosition: (width: number, height: number, fallback: number) => { x: number; y: number };
    resolveCursorMapSendDecision: (input: {
        hasSendCursorMapConfig: boolean;
        hasSend: boolean;
        hasIpcRenderer: boolean;
        retry: number;
        maxRetry: number;
    }) => {
        method: 'api' | 'send' | 'ipc' | 'retry' | 'none';
        nextRetry: number | null;
    };
    calculateTimeBasedSmoothingFactor: (deltaTimeMs: number, timeConstantMs: number) => number;
};

describe('カーソルランタイムロジック', (): void => {
    it('viewport の妥当性を判定する', (): void => {
        expect(cursorRuntimeLogic.isValidViewport(1920, 1080)).toBe(true);
        expect(cursorRuntimeLogic.isValidViewport(0, 1080)).toBe(false);
        expect(cursorRuntimeLogic.isValidViewport(Number.NaN, 1080)).toBe(false);
    });

    it('リセット座標を画面中央またはフォールバックで返す', (): void => {
        expect(cursorRuntimeLogic.resolveResetPosition(1200, 800, 100)).toEqual({ x: 600, y: 400 });
        expect(cursorRuntimeLogic.resolveResetPosition(0, 800, 100)).toEqual({ x: 100, y: 100 });
    });

    it('cursorMap送信手段を優先順で決定する', (): void => {
        expect(cursorRuntimeLogic.resolveCursorMapSendDecision({
            hasSendCursorMapConfig: true,
            hasSend: true,
            hasIpcRenderer: true,
            retry: 0,
            maxRetry: 10,
        })).toEqual({ method: 'api', nextRetry: null });

        expect(cursorRuntimeLogic.resolveCursorMapSendDecision({
            hasSendCursorMapConfig: false,
            hasSend: true,
            hasIpcRenderer: true,
            retry: 0,
            maxRetry: 10,
        })).toEqual({ method: 'send', nextRetry: null });

        expect(cursorRuntimeLogic.resolveCursorMapSendDecision({
            hasSendCursorMapConfig: false,
            hasSend: false,
            hasIpcRenderer: true,
            retry: 0,
            maxRetry: 10,
        })).toEqual({ method: 'ipc', nextRetry: null });
    });

    it('送信手段がない場合はリトライと終了を判定する', (): void => {
        expect(cursorRuntimeLogic.resolveCursorMapSendDecision({
            hasSendCursorMapConfig: false,
            hasSend: false,
            hasIpcRenderer: false,
            retry: 2,
            maxRetry: 10,
        })).toEqual({ method: 'retry', nextRetry: 3 });

        expect(cursorRuntimeLogic.resolveCursorMapSendDecision({
            hasSendCursorMapConfig: false,
            hasSend: false,
            hasIpcRenderer: false,
            retry: 10,
            maxRetry: 10,
        })).toEqual({ method: 'none', nextRetry: null });
    });

    it('描画間隔から時間ベースの平滑化係数を計算する', (): void => {
        const oneFrame = cursorRuntimeLogic.calculateTimeBasedSmoothingFactor(1000 / 60, 20);
        const twoFrames = cursorRuntimeLogic.calculateTimeBasedSmoothingFactor(2000 / 60, 20);

        expect(oneFrame).toBeGreaterThan(0);
        expect(oneFrame).toBeLessThan(1);
        expect(1 - twoFrames).toBeCloseTo((1 - oneFrame) ** 2);
        expect(cursorRuntimeLogic.calculateTimeBasedSmoothingFactor(16, 0)).toBe(1);
    });
});
