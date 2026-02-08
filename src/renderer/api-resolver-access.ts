{
type RendererApiResolverAccessApi = import('../shared/renderer-api-resolver-types').RendererApiResolverAccessApi;
type RendererApiResolverUtilsApi = import('../shared/renderer-api-resolver-types').RendererApiResolverUtilsApi;

/**
 * rendererApiResolverUtils を取得する。
 * グローバル登録済み API を優先し、無ければ CommonJS で読み込む。
 * @returns API リゾルバー
 */
const getRendererApiResolverUtils = (): RendererApiResolverUtilsApi => {
    const root = globalThis as typeof globalThis & {
        rendererApiResolverUtils?: RendererApiResolverUtilsApi;
    };
    if (root.rendererApiResolverUtils) {
        return root.rendererApiResolverUtils;
    }
    if (typeof require !== 'undefined') {
        // eslint-disable-next-line @typescript-eslint/no-var-requires -- CommonJS 形式の読み込みが必要
        return require('./api-resolver-utils') as RendererApiResolverUtilsApi;
    }
    throw new Error('rendererApiResolverUtils API is not available');
};

const rendererApiResolverAccessApi: RendererApiResolverAccessApi = {
    getRendererApiResolverUtils,
};

const rendererApiResolverAccessRoot = globalThis as typeof globalThis & {
    rendererApiResolverAccess?: RendererApiResolverAccessApi;
};
rendererApiResolverAccessRoot.rendererApiResolverAccess = rendererApiResolverAccessApi;

if (typeof module !== 'undefined' && module && module.exports) {
    module.exports = rendererApiResolverAccessApi;
}
}
