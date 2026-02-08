// eslint-disable-next-line @typescript-eslint/no-var-requires -- CommonJS 形式の読み込みが必要
const parseNumberUtils = require('../renderer/parse-number-utils') as {
    parseIntOrFallback: (raw: string | null | undefined, fallback: number) => number;
    parseFloatOrFallback: (raw: string | null | undefined, fallback: number) => number;
    parseIntOrNull: (raw: string | null | undefined) => number | null;
};

describe('数値パースユーティリティ', (): void => {
    it('整数パースの失敗時に既定値を返す', (): void => {
        expect(parseNumberUtils.parseIntOrFallback('120', 10)).toBe(120);
        expect(parseNumberUtils.parseIntOrFallback('abc', 10)).toBe(10);
        expect(parseNumberUtils.parseIntOrFallback(null, 10)).toBe(10);
    });

    it('浮動小数点パースの失敗時に既定値を返す', (): void => {
        expect(parseNumberUtils.parseFloatOrFallback('0.8', 1)).toBe(0.8);
        expect(parseNumberUtils.parseFloatOrFallback('abc', 1)).toBe(1);
        expect(parseNumberUtils.parseFloatOrFallback(undefined, 1)).toBe(1);
    });

    it('整数パースの失敗時にnullを返す', (): void => {
        expect(parseNumberUtils.parseIntOrNull('200')).toBe(200);
        expect(parseNumberUtils.parseIntOrNull('abc')).toBeNull();
        expect(parseNumberUtils.parseIntOrNull('')).toBeNull();
    });
});
