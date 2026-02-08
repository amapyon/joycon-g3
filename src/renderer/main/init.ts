((): void => {
    type MainRendererAccessApi = import('../../shared/main-renderer-types').MainRendererAccessApi;
    const mainRendererAccess = (window as Window & { mainRendererAccess?: MainRendererAccessApi }).mainRendererAccess;
    if (!mainRendererAccess) {
        throw new Error('mainRendererAccess is not available');
    }
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
