type ElectronAPI = import('../../shared/main-renderer-types').ElectronAPI;
type MainRendererContext = import('../../shared/main-renderer-types').MainRendererContext;
type LocalStorageStoreApi = import('../../shared/local-storage-store-types').LocalStorageStoreApi;
type MainWindowApiAccessorApi = import('../../shared/main-window-api-types').MainWindowApiAccessorApi;
type WifiTimerSettings = import('../../shared/wifi-timer-settings').WifiTimerSettings;
type StorageKeys = typeof import('../../shared/storage-keys').storageKeys;
type MainRendererElementsFactoryApi = {
    createMainRendererElements: () => MainRendererContext['elements'];
};

const storageKeys = (globalThis as typeof globalThis & { storageKeys?: StorageKeys }).storageKeys;
if (!storageKeys) {
    throw new Error('storageKeys is not available');
}
const mainRendererElementsFactory = (globalThis as typeof globalThis & {
    mainRendererElementsFactory?: MainRendererElementsFactoryApi;
}).mainRendererElementsFactory;
if (!mainRendererElementsFactory) {
    throw new Error('mainRendererElementsFactory is not available');
}

const DEFAULT_WIFI_TIMER_SETTINGS: WifiTimerSettings = {
    enabled: false,
    ipAddress: '',
};

((): void => {
    const mainWindowApiAccessor = (globalThis as typeof globalThis & {
        mainWindowApiAccessor?: MainWindowApiAccessorApi;
    }).mainWindowApiAccessor;
    if (!mainWindowApiAccessor) {
        throw new Error('mainWindowApiAccessor is not available');
    }
    const electronAPI = mainWindowApiAccessor.getApi<ElectronAPI>('electronAPI');
    const localStorageStore = mainWindowApiAccessor.getApi<LocalStorageStoreApi>('localStorageStore');
    const mainRenderer: MainRendererContext = {
        electronAPI,
        elements: mainRendererElementsFactory.createMainRendererElements(),
        state: {
            currentPresets: localStorageStore.getJsonValue<number[]>(storageKeys.timerPresets, [10, 60, 120, 180, 300]),
            wifiTimerSettings: localStorageStore.getJsonValue<WifiTimerSettings>(storageKeys.wifiTimerSettings, DEFAULT_WIFI_TIMER_SETTINGS),
        },
    };

    mainWindowApiAccessor.setApi<MainRendererContext>('mainRenderer', mainRenderer);
})();

