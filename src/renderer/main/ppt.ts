((): void => {
    type MainRendererAccessApi = import('../../shared/main-renderer-types').MainRendererAccessApi;
    type PresentationInfo = import('../../shared/main-renderer-types').PresentationInfo;
    type MainWindowApiAccessorApi = import('../../shared/main-window-api-types').MainWindowApiAccessorApi;

    const mainWindowApiAccessor = (globalThis as typeof globalThis & {
        mainWindowApiAccessor?: MainWindowApiAccessorApi;
    }).mainWindowApiAccessor;
    if (!mainWindowApiAccessor) {
        throw new Error('mainWindowApiAccessor is not available');
    }
    const mainRendererAccess = mainWindowApiAccessor.getApi<MainRendererAccessApi>('mainRendererAccess');
    const mainRenderer = mainRendererAccess.getMainRenderer();
    const { electronAPI, elements } = mainRenderer;

    /**
     * PowerPoint プレゼンテーションをロードして UI を更新する。
     * @returns 処理完了を示す Promise
     */
    const loadPowerPointPresentations = async (): Promise<void> => {
        elements.pptSelect.innerHTML = '<option value="">-- Loading Presentations --</option>';
        elements.pptSelect.disabled = true;
        try {
            const presentations = await electronAPI.getOpenPowerPointPresentations();
            elements.pptSelect.innerHTML = '';
            if (presentations && presentations.length > 0) {
                presentations.forEach((ppt: PresentationInfo): void => {
                    const option = document.createElement('option');
                    option.value = ppt.id;
                    option.text = ppt.name + (ppt.isRunning ? ' (Running)' : '');
                    elements.pptSelect.appendChild(option);
                });
                elements.pptSelect.disabled = false;
                elements.pptSelect.value = presentations[0].id;
                electronAPI.setTargetPresentation(presentations[0].id);
            } else {
                const option = document.createElement('option');
                option.value = '';
                option.text = '-- No Presentations Found --';
                elements.pptSelect.appendChild(option);
                elements.pptSelect.disabled = true;
            }
        } catch {
            const option = document.createElement('option');
            option.value = '';
            option.text = '-- Error Loading Presentations --';
            elements.pptSelect.appendChild(option);
            elements.pptSelect.disabled = true;
        }
    };

    /**
     * PPT セクションを初期化する。
     * @returns なし
     */
    const initPptSection = (): void => {
        electronAPI.onAvailablePresentations((): void => {
            void loadPowerPointPresentations();
        });

        elements.pptSelect.addEventListener('change', (): void => {
            const selectedId = elements.pptSelect.value;
            if (selectedId) {
                electronAPI.setTargetPresentation(selectedId);
            }
        });

        void loadPowerPointPresentations();
    };

    mainRenderer.initPptSection = initPptSection;
})();
