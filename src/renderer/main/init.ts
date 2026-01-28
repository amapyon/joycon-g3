((): void => {
    const mainRenderer = (window as unknown as { mainRenderer: MainRendererContext }).mainRenderer;
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
