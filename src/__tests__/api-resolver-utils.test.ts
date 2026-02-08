// eslint-disable-next-line @typescript-eslint/no-var-requires -- CommonJS 形式の読み込みが必要
const apiResolverUtils = require('../renderer/api-resolver-utils') as {
    resolveApi: <T>(globalKey: string, requirePath: string) => T;
    resolveGlobal: <T>(globalKey: string) => T;
};

describe('API解決ユーティリティ', (): void => {
    it('グローバル登録済みAPIを優先して返す', (): void => {
        const root = globalThis as typeof globalThis & { sampleApiForTest?: { value: number } };
        root.sampleApiForTest = { value: 42 };

        const resolved = apiResolverUtils.resolveApi<{ value: number }>('sampleApiForTest', './number-utils');

        expect(resolved).toEqual({ value: 42 });
        delete root.sampleApiForTest;
    });

    it('グローバルに無い場合はrequireで解決する', (): void => {
        const resolved = apiResolverUtils.resolveApi<{ clamp: (value: number, min: number, max: number) => number }>('missingApiForTest', './number-utils');

        expect(resolved.clamp(12, 0, 10)).toBe(10);
    });

    it('グローバル専用解決で登録済みAPIを返す', (): void => {
        const root = globalThis as typeof globalThis & { sampleGlobalOnlyApiForTest?: { name: string } };
        root.sampleGlobalOnlyApiForTest = { name: 'ok' };

        const resolved = apiResolverUtils.resolveGlobal<{ name: string }>('sampleGlobalOnlyApiForTest');

        expect(resolved).toEqual({ name: 'ok' });
        delete root.sampleGlobalOnlyApiForTest;
    });
});
