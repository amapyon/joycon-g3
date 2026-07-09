((): void => {
    type TimerNotificationConfig = import('../../shared/timer-notification-config').TimerNotificationConfig;
    type TimerStorageApi = import('../../shared/timer-renderer-types').TimerStorageApi;
    type ParseNumberUtilsApi = import('../../shared/parse-number-utils-types').ParseNumberUtilsApi;
    type LocalStorageStoreApi = import('../../shared/local-storage-store-types').LocalStorageStoreApi;
    type StorageKeys = typeof import('../../shared/storage-keys').storageKeys;

    const storageKeys = (globalThis as typeof globalThis & { storageKeys?: StorageKeys }).storageKeys;
    if (!storageKeys) {
        throw new Error('storageKeys is not available');
    }

    const parseNumberUtils = ((): ParseNumberUtilsApi => {
        const root = globalThis as typeof globalThis & { parseNumberUtils?: ParseNumberUtilsApi };
        if (root.parseNumberUtils) {
            return root.parseNumberUtils;
        }
        // eslint-disable-next-line @typescript-eslint/no-var-requires -- CommonJS 形式の読み込みが必要
        return require('../parse-number-utils') as ParseNumberUtilsApi;
    })();
    const localStorageStore = ((): LocalStorageStoreApi => {
        const root = globalThis as typeof globalThis & { localStorageStore?: LocalStorageStoreApi };
        if (root.localStorageStore) {
            return root.localStorageStore;
        }
        // eslint-disable-next-line @typescript-eslint/no-var-requires -- CommonJS 形式の読み込みが必要
        return require('../local-storage-store') as LocalStorageStoreApi;
    })();

    /**
     * JSON を配列として読み取る。
     * @param raw 生文字列
     * @param fallback 変換失敗時の値
     * @returns 変換結果
     */
    const parseArrayJson = <T>(raw: string | null, fallback: T[]): T[] => {
        if (!raw) {
            return fallback;
        }
        try {
            const parsed = JSON.parse(raw) as unknown;
            return Array.isArray(parsed) ? parsed as T[] : fallback;
        } catch {
            return fallback;
        }
    };

    /**
     * 整数値を読み取る。
     * @param raw 生文字列
     * @param fallback 変換失敗時の値
     * @returns 変換結果
     */
    const parseIntValue = (raw: string | null, fallback: number): number => {
        return parseNumberUtils.parseIntOrFallback(raw, fallback);
    };

    /**
     * 浮動小数点値を読み取る。
     * @param raw 生文字列
     * @param fallback 変換失敗時の値
     * @returns 変換結果
     */
    const parseFloatValue = (raw: string | null, fallback: number): number => {
        return parseNumberUtils.parseFloatOrFallback(raw, fallback);
    };

    const api: TimerStorageApi = {
        loadCountdownInitialValue: (fallback: number): number => parseIntValue(localStorageStore.getString(storageKeys.countdownInitialValue, ''), fallback),
        saveCountdownInitialValue: (value: number): void => { localStorageStore.setString(storageKeys.countdownInitialValue, String(value)); },
        loadTimerFontSize: (fallback: number): number => parseIntValue(localStorageStore.getString(storageKeys.timerFontSize, ''), fallback),
        saveTimerFontSize: (value: number): void => { localStorageStore.setString(storageKeys.timerFontSize, String(value)); },
        loadTimerPresets: (fallback: number[]): number[] => parseArrayJson<number>(localStorageStore.getString(storageKeys.timerPresets, ''), fallback),
        saveTimerPresets: (presets: number[]): void => { localStorageStore.setJsonValue(storageKeys.timerPresets, presets); },
        loadTimerOpacity: (fallback: number): number => parseFloatValue(localStorageStore.getString(storageKeys.timerWindowOpacity, ''), fallback),
        saveTimerOpacity: (opacity: number): void => { localStorageStore.setString(storageKeys.timerWindowOpacity, String(opacity)); },
        loadNotifications: (fallback: TimerNotificationConfig[]): TimerNotificationConfig[] => {
            return parseArrayJson<TimerNotificationConfig>(localStorageStore.getString(storageKeys.timerNotifications, ''), fallback);
        },
        saveNotifications: (configs: TimerNotificationConfig[]): void => { localStorageStore.setJsonValue(storageKeys.timerNotifications, configs); },
        loadSoundPlayDelay: (): number | null => {
            return parseNumberUtils.parseIntOrNull(localStorageStore.getString(storageKeys.soundPlayDelayMs, ''));
        },
        saveSoundPlayDelay: (delayMs: number): void => { localStorageStore.setString(storageKeys.soundPlayDelayMs, String(delayMs)); },
    };

    const root = globalThis as typeof globalThis & { timerStorage?: TimerStorageApi };
    root.timerStorage = api;
})();
