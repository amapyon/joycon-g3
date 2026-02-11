export {};
// eslint-disable-next-line @typescript-eslint/no-var-requires -- CommonJS 形式の読み込みが必要
const messageLogic = require('../renderer/message-logic') as {
    normalizeNumber: (value: number, fallback: number, min: number, max: number) => number;
    resolveWheelAction: (deltaY: number, shiftKey: boolean) => { kind: 'fontSize' | 'opacity'; delta: number };
    isWheelTargetInZone: (target: Node | null, wheelZone: HTMLElement | null) => boolean;
};

describe('メッセージロジック', (): void => {
    it('数値を範囲内に正規化する', (): void => {
        expect(messageLogic.normalizeNumber(5, 64, 10, 1000)).toBe(10);
        expect(messageLogic.normalizeNumber(1200, 64, 10, 1000)).toBe(1000);
        expect(messageLogic.normalizeNumber(Number.NaN, 64, 10, 1000)).toBe(64);
        expect(messageLogic.normalizeNumber(0.01, 0.8, 0.1, 1.0)).toBe(0.1);
        expect(messageLogic.normalizeNumber(1.5, 0.8, 0.1, 1.0)).toBe(1.0);
        expect(messageLogic.normalizeNumber(Number.NaN, 0.8, 0.1, 1.0)).toBe(0.8);
    });

    it('ホイール操作の種別と増減量を判定する', (): void => {
        expect(messageLogic.resolveWheelAction(-1, false)).toEqual({ kind: 'fontSize', delta: 5 });
        expect(messageLogic.resolveWheelAction(1, false)).toEqual({ kind: 'fontSize', delta: -5 });
        expect(messageLogic.resolveWheelAction(-1, true)).toEqual({ kind: 'opacity', delta: 0.05 });
        expect(messageLogic.resolveWheelAction(1, true)).toEqual({ kind: 'opacity', delta: -0.05 });
    });

    it('ホイール対象がゾーン内か判定する', (): void => {
        const zone = {
            contains: (target: Node): boolean => target === nodeInZone,
        } as unknown as HTMLElement;
        const nodeInZone = {} as Node;
        const nodeOutZone = {} as Node;

        expect(messageLogic.isWheelTargetInZone(nodeInZone, zone)).toBe(true);
        expect(messageLogic.isWheelTargetInZone(nodeOutZone, zone)).toBe(false);
        expect(messageLogic.isWheelTargetInZone(null, zone)).toBe(false);
        expect(messageLogic.isWheelTargetInZone(nodeInZone, null)).toBe(false);
    });
});
