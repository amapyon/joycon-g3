((): void => {
    type TimerNotificationConfig = import('../../shared/timer-notification-config').TimerNotificationConfig;
    type TimerStorageApi = import('../../shared/timer-renderer-types').TimerStorageApi;
    type ParseNumberUtilsApi = import('../../shared/parse-number-utils-types').ParseNumberUtilsApi;

    const KEY_COUNTDOWN_INITIAL_VALUE = 'countdownInitialValue';
    const KEY_TIMER_FONT_SIZE = 'timerFontSize';
    const KEY_TIMER_PRESETS = 'timerPresets';
    const KEY_TIMER_WINDOW_OPACITY = 'timerWindowOpacity';
    const KEY_TIMER_NOTIFICATIONS = 'timerNotifications';
    const KEY_SOUND_PLAY_DELAY_MS = 'soundPlayDelayMs';
    const parseNumberUtils = ((): ParseNumberUtilsApi => {
        const root = globalThis as unknown as { parseNumberUtils?: ParseNumberUtilsApi };
        if (root.parseNumberUtils) {
            return root.parseNumberUtils;
        }
        // eslint-disable-next-line @typescript-eslint/no-var-requires -- CommonJS 形式の読み込みが必要
        return require('../parse-number-utils') as ParseNumberUtilsApi;
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
        loadCountdownInitialValue: (fallback: number): number => parseIntValue(localStorage.getItem(KEY_COUNTDOWN_INITIAL_VALUE), fallback),
        saveCountdownInitialValue: (value: number): void => { localStorage.setItem(KEY_COUNTDOWN_INITIAL_VALUE, String(value)); },
        loadTimerFontSize: (fallback: number): number => parseIntValue(localStorage.getItem(KEY_TIMER_FONT_SIZE), fallback),
        saveTimerFontSize: (value: number): void => { localStorage.setItem(KEY_TIMER_FONT_SIZE, String(value)); },
        loadTimerPresets: (fallback: number[]): number[] => parseArrayJson<number>(localStorage.getItem(KEY_TIMER_PRESETS), fallback),
        saveTimerPresets: (presets: number[]): void => { localStorage.setItem(KEY_TIMER_PRESETS, JSON.stringify(presets)); },
        loadTimerOpacity: (fallback: number): number => parseFloatValue(localStorage.getItem(KEY_TIMER_WINDOW_OPACITY), fallback),
        saveTimerOpacity: (opacity: number): void => { localStorage.setItem(KEY_TIMER_WINDOW_OPACITY, String(opacity)); },
        loadNotifications: (fallback: TimerNotificationConfig[]): TimerNotificationConfig[] => {
            return parseArrayJson<TimerNotificationConfig>(localStorage.getItem(KEY_TIMER_NOTIFICATIONS), fallback);
        },
        saveNotifications: (configs: TimerNotificationConfig[]): void => { localStorage.setItem(KEY_TIMER_NOTIFICATIONS, JSON.stringify(configs)); },
        loadSoundPlayDelay: (): number | null => {
            return parseNumberUtils.parseIntOrNull(localStorage.getItem(KEY_SOUND_PLAY_DELAY_MS));
        },
        saveSoundPlayDelay: (delayMs: number): void => { localStorage.setItem(KEY_SOUND_PLAY_DELAY_MS, String(delayMs)); },
    };

    const root = globalThis as unknown as { timerStorage?: TimerStorageApi };
    root.timerStorage = api;
})();
