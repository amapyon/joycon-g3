((): void => {
    type MainRendererAccessApi = import('../../shared/main-renderer-types').MainRendererAccessApi;
    type PresentationInfo = import('../../shared/main-renderer-types').PresentationInfo;
    type LocalStorageStoreApi = import('../../shared/local-storage-store-types').LocalStorageStoreApi;
    type MainWindowApiAccessorApi = import('../../shared/main-window-api-types').MainWindowApiAccessorApi;

    const SELECTED_PRESENTATION_TARGET_KEY = 'selectedPresentationTarget';

    const mainWindowApiAccessor = (globalThis as typeof globalThis & {
        mainWindowApiAccessor?: MainWindowApiAccessorApi;
    }).mainWindowApiAccessor;
    if (!mainWindowApiAccessor) {
        throw new Error('mainWindowApiAccessor is not available');
    }
    const mainRendererAccess = mainWindowApiAccessor.getApi<MainRendererAccessApi>('mainRendererAccess');
    const localStorageStore = mainWindowApiAccessor.getApi<LocalStorageStoreApi>('localStorageStore');
    const mainRenderer = mainRendererAccess.getMainRenderer();
    const { electronAPI, elements } = mainRenderer;

    /**
     * プレゼン操作対象の選択値を作成する。
     * @param presentation プレゼン操作対象
     * @returns セレクトボックス用の値
     */
    const createPresentationTargetValue = (presentation: PresentationInfo): string => {
        return `${presentation.type}|${presentation.id}`;
    };

    /**
     * プレゼン操作対象の表示名を作成する。
     * @param presentation プレゼン操作対象
     * @returns セレクトボックス用の表示名
     */
    const createPresentationTargetLabel = (presentation: PresentationInfo): string => {
        const prefix = presentation.type === 'google-slides' ? 'Google Slides' : 'PowerPoint';
        return `${prefix}: ${presentation.name}${presentation.isRunning ? ' (Running)' : ''}`;
    };

    /**
     * プレゼン操作対象を選択して保存する。
     * @param selectedValue セレクトボックスの値
     */
    const selectPresentationTarget = (selectedValue: string): void => {
        if (!selectedValue) {
            return;
        }
        elements.pptSelect.value = selectedValue;
        localStorageStore.setString(SELECTED_PRESENTATION_TARGET_KEY, selectedValue);
        electronAPI.setTargetPresentation(selectedValue);
    };

    /**
     * プレゼン操作対象をロードして UI を更新する。
     * @returns 処理完了を示す Promise
     */
    const loadPresentationTargets = async (): Promise<void> => {
        elements.pptSelect.innerHTML = '<option value="">-- Loading Presentations --</option>';
        elements.pptSelect.disabled = true;
        elements.pptRefreshBtn.disabled = true;
        try {
            const presentations = await electronAPI.getOpenPresentationTargets();
            elements.pptSelect.innerHTML = '';
            if (presentations && presentations.length > 0) {
                presentations.forEach((presentation: PresentationInfo): void => {
                    const option = document.createElement('option');
                    option.value = createPresentationTargetValue(presentation);
                    option.text = createPresentationTargetLabel(presentation);
                    elements.pptSelect.appendChild(option);
                });
                elements.pptSelect.disabled = false;
                const storedValue = localStorageStore.getString(SELECTED_PRESENTATION_TARGET_KEY, '');
                const values = presentations.map(createPresentationTargetValue);
                const selectedValue = values.includes(storedValue) ? storedValue : values[0];
                selectPresentationTarget(selectedValue);
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
        } finally {
            elements.pptRefreshBtn.disabled = false;
        }
    };

    /**
     * PPT セクションを初期化する。
     */
    const initPptSection = (): void => {
        electronAPI.onAvailablePresentations((): void => {
            void loadPresentationTargets();
        });

        elements.pptSelect.addEventListener('change', (): void => {
            selectPresentationTarget(elements.pptSelect.value);
        });

        elements.pptRefreshBtn.addEventListener('click', (): void => {
            void loadPresentationTargets();
        });

        void loadPresentationTargets();
    };

    mainRenderer.initPptSection = initPptSection;
})();
