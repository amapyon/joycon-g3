// eslint-disable-next-line @typescript-eslint/no-var-requires -- CommonJS 形式の読み込みが必要
const numberUtils = require('../renderer/number-utils') as {
    clamp: (value: number, min: number, max: number) => number;
    normalizeNumber: (value: number, fallback: number, min: number, max: number) => number;
};

describe('数値ユーティリティ', (): void => {
    it('数値を指定範囲に収める', (): void => {
        expect(numberUtils.clamp(-1, 0, 10)).toBe(0);
        expect(numberUtils.clamp(5, 0, 10)).toBe(5);
        expect(numberUtils.clamp(12, 0, 10)).toBe(10);
    });

    it('NaN時は既定値を返して範囲内に正規化する', (): void => {
        expect(numberUtils.normalizeNumber(Number.NaN, 200, 0, 5000)).toBe(200);
        expect(numberUtils.normalizeNumber(-10, 200, 0, 5000)).toBe(0);
        expect(numberUtils.normalizeNumber(6000, 200, 0, 5000)).toBe(5000);
    });
});
