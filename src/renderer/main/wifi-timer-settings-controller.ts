{
    type WifiTimerSettings = import('../../shared/wifi-timer-settings').WifiTimerSettings;
    type MainRendererContext = import('../../shared/main-renderer-types').MainRendererContext;
    type TimerMainLogicApi = import('../../shared/timer-main-logic-types').TimerMainLogicApi;
    type LocalStorageStoreApi = import('../../shared/local-storage-store-types').LocalStorageStoreApi;

    type WifiTimerSettingsControllerDeps = {
        elements: MainRendererContext['elements'];
        state: MainRendererContext['state'];
        electronAPI: MainRendererContext['electronAPI'];
        localStorageStore: LocalStorageStoreApi;
        timerMainLogic: TimerMainLogicApi;
        wifiTimerSettingsStorageKey: string;
        wifiTimerPanelVisibilityStorageKey: string;
    };

    type WifiTimerSettingsControllerApi = {
        initWifiTimerSettings: () => void;
        applyWifiTimerPanelVisibility: (isVisible: boolean) => void;
    };

    const defaultWifiTimerSettings: WifiTimerSettings = { enabled: false, ipAddress: '' };

    /**
     * WiFi タイマー設定コントローラーを作成する。
     * @param deps 初期化に必要な依存
     * @returns WiFi タイマー設定コントローラー
     */
    const createWifiTimerSettingsController = (deps: WifiTimerSettingsControllerDeps): WifiTimerSettingsControllerApi => {
        const {
            elements,
            state,
            electronAPI,
            localStorageStore,
            timerMainLogic,
            wifiTimerSettingsStorageKey,
            wifiTimerPanelVisibilityStorageKey,
        } = deps;

        /**
         * WiFi タイマー設定をフォームへ反映する。
         * @param settings 設定値
         */
        const applyWifiTimerSettingsToForm = (settings: WifiTimerSettings): void => {
            elements.wifiTimerEnabledInput.checked = settings.enabled;
            elements.wifiTimerIpAddressInput.value = settings.ipAddress;
        };

        /**
         * フォームから WiFi タイマー設定を読み取る。
         * @returns 読み取った設定
         */
        const readWifiTimerSettingsFromForm = (): WifiTimerSettings => {
            return {
                enabled: elements.wifiTimerEnabledInput.checked,
                ipAddress: elements.wifiTimerIpAddressInput.value.trim(),
            };
        };

        /**
         * WiFi タイマー設定を保存してメインプロセスへ通知する。
         * @param settings 保存する設定
         */
        const persistWifiTimerSettings = (settings: WifiTimerSettings): void => {
            state.wifiTimerSettings = settings;
            localStorageStore.setJsonValue(wifiTimerSettingsStorageKey, settings);
            electronAPI.updateWifiTimerSettings(settings);
            const currentCountdownValue = timerMainLogic.parseCountdownInitialValue(elements.countdownInitialValueInput.value, 1, 3600);
            if (currentCountdownValue !== null) {
                electronAPI.sendCountdownInitialValue(currentCountdownValue);
            }
        };

        /**
         * WiFi タイマー設定 UI を初期化する。
         */
        const initWifiTimerSettings = (): void => {
            const storedSettings = localStorageStore.getJsonValue<WifiTimerSettings>(wifiTimerSettingsStorageKey, defaultWifiTimerSettings);
            state.wifiTimerSettings = {
                enabled: storedSettings.enabled,
                ipAddress: storedSettings.ipAddress.trim(),
            };
            applyWifiTimerSettingsToForm(state.wifiTimerSettings);
            electronAPI.updateWifiTimerSettings(state.wifiTimerSettings);

            const handleChange = (): void => {
                const nextSettings = readWifiTimerSettingsFromForm();
                applyWifiTimerSettingsToForm(nextSettings);
                persistWifiTimerSettings(nextSettings);
            };

            elements.wifiTimerEnabledInput.addEventListener('change', handleChange);
            elements.wifiTimerIpAddressInput.addEventListener('change', handleChange);
        };

        /**
         * WiFi タイマーパネルの表示状態を反映する。
         * @param isVisible 表示するなら true
         */
        const applyWifiTimerPanelVisibility = (isVisible: boolean): void => {
            elements.wifiTimerPanelContainer.querySelector('.wifi-timer-panel')?.setAttribute('style', `display: ${isVisible ? 'block' : 'none'};`);
            elements.wifiTimerPanelToggleBtn.textContent = isVisible ? 'Hide WiFi Timer' : 'Show WiFi Timer';
            localStorageStore.setString(wifiTimerPanelVisibilityStorageKey, isVisible ? '1' : '0');
        };

        return {
            initWifiTimerSettings,
            applyWifiTimerPanelVisibility,
        };
    };

    const root = globalThis as typeof globalThis & {
        mainWifiTimerSettingsController?: {
            createWifiTimerSettingsController: typeof createWifiTimerSettingsController;
        };
    };
    root.mainWifiTimerSettingsController = { createWifiTimerSettingsController };
}
