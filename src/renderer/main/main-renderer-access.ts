((): void => {
    type MainRendererContext = import('../../shared/main-renderer-types').MainRendererContext;
    type MainRendererAccessApi = import('../../shared/main-renderer-types').MainRendererAccessApi;
    type MainWindowApiAccessorApi = import('../../shared/main-window-api-types').MainWindowApiAccessorApi;

    const mainWindowApiAccessor = (globalThis as typeof globalThis & {
        mainWindowApiAccessor?: MainWindowApiAccessorApi;
    }).mainWindowApiAccessor;
    if (!mainWindowApiAccessor) {
        throw new Error('mainWindowApiAccessor is not available');
    }

    /**
     * 共有された mainRenderer コンテキストを取得する。
     * @returns メインレンダラーコンテキスト
     */
    const getMainRenderer = (): MainRendererContext => {
        return mainWindowApiAccessor.getApi<MainRendererContext>('mainRenderer');
    };

    const mainRendererAccessApi: MainRendererAccessApi = {
        getMainRenderer,
    };

    const root = globalThis as typeof globalThis & { mainRendererAccess?: MainRendererAccessApi };
    root.mainRendererAccess = mainRendererAccessApi;
})();
