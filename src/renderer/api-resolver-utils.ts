type RendererApiResolverUtilsApi = {
    resolveApi: <T>(globalKey: string, requirePath: string) => T;
};

/**
 * グローバル登録済みAPIを優先し、無ければ CommonJS で解決する。
 * @param globalKey グローバルに登録されたAPIキー
 * @param requirePath フォールバック時の require パス
 * @returns 解決したAPI
 */
function resolveRendererApiFromGlobalOrRequire<T>(globalKey: string, requirePath: string): T {
    const root = (typeof window !== 'undefined' ? window : globalThis) as unknown as Record<string, unknown>;
    const api = root[globalKey];
    if (api) {
        return api as T;
    }
    if (typeof require !== 'undefined') {
        // eslint-disable-next-line @typescript-eslint/no-var-requires -- CommonJS 形式の読み込みが必要
        return require(requirePath) as T;
    }
    throw new Error(`${globalKey} API is not available`);
}

const rendererApiResolverUtilsApi: RendererApiResolverUtilsApi = {
    resolveApi: resolveRendererApiFromGlobalOrRequire,
};

const rendererApiResolverUtilsRoot = (typeof window !== 'undefined' ? window : globalThis) as unknown as {
    rendererApiResolverUtils?: RendererApiResolverUtilsApi;
};
rendererApiResolverUtilsRoot.rendererApiResolverUtils = rendererApiResolverUtilsApi;

if (typeof module !== 'undefined' && module && module.exports) {
    module.exports = rendererApiResolverUtilsApi;
}
