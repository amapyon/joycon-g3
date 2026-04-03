/**
 * WiFi タイマー連携設定。
 */
export type WifiTimerSettings = {
    enabled: boolean;
    ipAddress: string;
};

/**
 * WiFi タイマー設定の既定値。
 */
export const DEFAULT_WIFI_TIMER_SETTINGS: WifiTimerSettings = {
    enabled: false,
    ipAddress: '',
};

