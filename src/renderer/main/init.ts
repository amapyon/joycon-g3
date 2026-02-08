((): void => {
    const mainRenderer = (window as Window & { mainRenderer?: MainRendererContext }).mainRenderer;
    if (!mainRenderer) {
        throw new Error('mainRenderer is not available');
    }
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
