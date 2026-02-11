((): void => {
    type MainRendererAccessApi = import('../../shared/main-renderer-types').MainRendererAccessApi;
    type MainWindowApiAccessorApi = import('../../shared/main-window-api-types').MainWindowApiAccessorApi;

    const mainWindowApiAccessor = (globalThis as typeof globalThis & {
        mainWindowApiAccessor?: MainWindowApiAccessorApi;
    }).mainWindowApiAccessor;
    if (!mainWindowApiAccessor) {
        throw new Error('mainWindowApiAccessor is not available');
    }
    const mainRendererAccess = mainWindowApiAccessor.getApi<MainRendererAccessApi>('mainRendererAccess');
    const mainRenderer = mainRendererAccess.getMainRenderer();
    const { elements } = mainRenderer;

    /**
     * メインウィンドウ全体の初期化を行う。
     * @returns なし
     */
    const init = (): void => {
        elements.cursorToggleBtn.disabled = true;
        elements.pptSelect.disabled = true;

        mainRenderer.initDisplaySection?.();
        mainRenderer.initPptSection?.();
        mainRenderer.initJoyConSection?.();
        mainRenderer.initTimerSection?.();
        mainRenderer.initMessageSection?.();
    };

    init();
})();
