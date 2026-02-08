((): void => {
    type MainRendererContext = import('../../shared/main-renderer-types').MainRendererContext;
    type MainRendererAccessApi = import('../../shared/main-renderer-types').MainRendererAccessApi;

    /**
     * 共有された mainRenderer コンテキストを取得する。
     * @returns メインレンダラーコンテキスト
     */
    const getMainRenderer = (): MainRendererContext => {
        const mainRenderer = (window as Window & { mainRenderer?: MainRendererContext }).mainRenderer;
        if (!mainRenderer) {
            throw new Error('mainRenderer is not available');
        }
        return mainRenderer;
    };

    const mainRendererAccessApi: MainRendererAccessApi = {
        getMainRenderer,
    };

    const root = globalThis as typeof globalThis & { mainRendererAccess?: MainRendererAccessApi };
    root.mainRendererAccess = mainRendererAccessApi;
})();
