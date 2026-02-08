{
type RendererApiResolverUtilsApi = import('../shared/renderer-api-resolver-types').RendererApiResolverUtilsApi;
type RendererApiResolverAccessApi = import('../shared/renderer-api-resolver-types').RendererApiResolverAccessApi;
type GlobalApiRegistry = typeof globalThis & { [key: string]: unknown };

/**
 * グローバル登録済みAPIを優先し、無ければ CommonJS で解決する。
 * @param globalKey グローバルに登録されたAPIキー
 * @param requirePath フォールバック時の require パス
 * @returns 解決したAPI
 */
const resolveRendererApiFromGlobalOrRequire = <T>(globalKey: string, requirePath: string): T => {
    const root = globalThis as GlobalApiRegistry;
    const api = root[globalKey];
    if (api) {
        return api as T;
    }
    if (typeof require !== 'undefined') {
        // eslint-disable-next-line @typescript-eslint/no-var-requires -- CommonJS 形式の読み込みが必要
        return require(requirePath) as T;
    }
    throw new Error(`${globalKey} API is not available`);
};

/**
 * グローバル登録済みAPIを解決する。
 * @param globalKey グローバルに登録されたAPIキー
 * @returns 解決したAPI
 */
const resolveRendererApiFromGlobal = <T>(globalKey: string): T => {
    const root = globalThis as GlobalApiRegistry;
    const api = root[globalKey];
    if (api) {
        return api as T;
    }
    throw new Error(`${globalKey} API is not available on global`);
};

const rendererApiResolverUtilsApi: RendererApiResolverUtilsApi = {
    resolveApi: resolveRendererApiFromGlobalOrRequire,
    resolveGlobal: resolveRendererApiFromGlobal,
};

const rendererApiResolverUtilsRoot = globalThis as typeof globalThis & {
    rendererApiResolverUtils?: RendererApiResolverUtilsApi;
};
rendererApiResolverUtilsRoot.rendererApiResolverUtils = rendererApiResolverUtilsApi;

const rendererApiResolverAccessApi: RendererApiResolverAccessApi = {
    getRendererApiResolverUtils: (): RendererApiResolverUtilsApi => rendererApiResolverUtilsApi,
};
const rendererApiResolverAccessRoot = globalThis as typeof globalThis & {
    rendererApiResolverAccess?: RendererApiResolverAccessApi;
};
rendererApiResolverAccessRoot.rendererApiResolverAccess = rendererApiResolverAccessApi;

if (typeof module !== 'undefined' && module && module.exports) {
    module.exports = rendererApiResolverUtilsApi;
}
}
