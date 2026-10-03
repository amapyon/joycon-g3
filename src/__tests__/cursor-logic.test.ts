export {};
// eslint-disable-next-line @typescript-eslint/no-var-requires -- CommonJS 形式の読み込みが必要
const cursorLogic = require('../renderer/cursor-logic') as {
    decideVisibilityTransition: (
        cursorData: {
            x: number;
            y: number;
            map: { xFrom: 'roll' | 'pitch' | 'yaw'; yFrom: 'roll' | 'pitch' | 'yaw'; xSign: number; ySign: number };
            isVisible: boolean;
            pendingX: number | null;
            pendingY: number | null;
        },
        shouldBeVisible: boolean
    ) => {
        changed: boolean;
        nextIsVisible: boolean;
        nextPendingX: number | null;
        nextPendingY: number | null;
        restoreX: number | null;
        restoreY: number | null;
    };
    clampToViewport: (input: {
        x: number;
        y: number;
        viewportWidth: number;
        viewportHeight: number;
        halfWidth: number;
        halfHeight: number;
    }) => { x: number; y: number };
};

const baseCursor = {
    x: 120,
    y: 80,
    map: { xFrom: 'roll' as const, yFrom: 'pitch' as const, xSign: 1, ySign: -1 },
    isVisible: false,
    pendingX: null,
    pendingY: null,
};

describe('カーソルロジック', (): void => {
    it('可視化時にpending座標を復元する遷移を返す', (): void => {
        const result = cursorLogic.decideVisibilityTransition(
            {
                ...baseCursor,
                isVisible: false,
                pendingX: 321,
                pendingY: 222,
            },
            true
        );

        expect(result).toEqual({
            changed: true,
            nextIsVisible: true,
            nextPendingX: null,
            nextPendingY: null,
            restoreX: 321,
            restoreY: 222,
        });
    });

    it('非表示化時にpendingがなければ現在座標を保存する', (): void => {
        const result = cursorLogic.decideVisibilityTransition(
            {
                ...baseCursor,
                isVisible: true,
                x: 123.6,
                y: 88.2,
                pendingX: null,
                pendingY: null,
            },
            false
        );

        expect(result).toEqual({
            changed: true,
            nextIsVisible: false,
            nextPendingX: 124,
            nextPendingY: 88,
            restoreX: null,
            restoreY: null,
        });
    });

    it('状態が変わらない場合は変更なしを返す', (): void => {
        const result = cursorLogic.decideVisibilityTransition(
            {
                ...baseCursor,
                isVisible: true,
                pendingX: 50,
                pendingY: 70,
            },
            true
        );

        expect(result).toEqual({
            changed: false,
            nextIsVisible: true,
            nextPendingX: 50,
            nextPendingY: 70,
            restoreX: null,
            restoreY: null,
        });
    });

    it('座標を表示領域内に丸める', (): void => {
        const clamped = cursorLogic.clampToViewport({
            x: 999,
            y: -50,
            viewportWidth: 400,
            viewportHeight: 300,
            halfWidth: 8,
            halfHeight: 12,
        });

        expect(clamped).toEqual({
            x: 392,
            y: 12,
        });
    });
});
