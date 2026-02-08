((): void => {
    type TimerNotificationConfig = import('../../shared/timer-notification-config').TimerNotificationConfig;

    type TimerStorageApi = {
        loadCountdownInitialValue: (fallback: number) => number;
        saveCountdownInitialValue: (value: number) => void;
        loadTimerFontSize: (fallback: number) => number;
        saveTimerFontSize: (value: number) => void;
        loadTimerPresets: (fallback: number[]) => number[];
        saveTimerPresets: (presets: number[]) => void;
        loadTimerOpacity: (fallback: number) => number;
        saveTimerOpacity: (opacity: number) => void;
        loadNotifications: (fallback: TimerNotificationConfig[]) => TimerNotificationConfig[];
        saveNotifications: (configs: TimerNotificationConfig[]) => void;
        loadSoundPlayDelay: () => number | null;
        saveSoundPlayDelay: (delayMs: number) => void;
    };

    const KEY_COUNTDOWN_INITIAL_VALUE = 'countdownInitialValue';
    const KEY_TIMER_FONT_SIZE = 'timerFontSize';
    const KEY_TIMER_PRESETS = 'timerPresets';
    const KEY_TIMER_WINDOW_OPACITY = 'timerWindowOpacity';
    const KEY_TIMER_NOTIFICATIONS = 'timerNotifications';
    const KEY_SOUND_PLAY_DELAY_MS = 'soundPlayDelayMs';

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
        if (!raw) {
            return fallback;
        }
        const parsed = Number.parseInt(raw, 10);
        return Number.isNaN(parsed) ? fallback : parsed;
    };

    /**
     * 浮動小数点値を読み取る。
     * @param raw 生文字列
     * @param fallback 変換失敗時の値
     * @returns 変換結果
     */
    const parseFloatValue = (raw: string | null, fallback: number): number => {
        if (!raw) {
            return fallback;
        }
        const parsed = Number.parseFloat(raw);
        return Number.isNaN(parsed) ? fallback : parsed;
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
            const raw = localStorage.getItem(KEY_SOUND_PLAY_DELAY_MS);
            if (!raw) {
                return null;
            }
            const parsed = Number.parseInt(raw, 10);
            return Number.isNaN(parsed) ? null : parsed;
        },
        saveSoundPlayDelay: (delayMs: number): void => { localStorage.setItem(KEY_SOUND_PLAY_DELAY_MS, String(delayMs)); },
    };

    const root = (typeof window !== 'undefined' ? window : globalThis) as unknown as { timerStorage?: TimerStorageApi };
    root.timerStorage = api;
})();
