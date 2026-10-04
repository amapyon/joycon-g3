/**
 * main プロセスで受信する IPC チャネル定義。
 */
export const MAIN_IPC_INBOUND_CHANNELS = {
    CURSOR_MAP_CONFIG: 'cursor-map-config',
    UPDATE_POINTER_MOTION_SETTINGS: 'update-pointer-motion-settings',
    CURSOR_VISIBILITY_UPDATE: 'cursor-visibility-update',
    CURSOR_RENDER_TRACE: 'cursor-render-trace',
    COUNTDOWN_INITIAL_VALUE: 'countdown-initial-value',
    UPDATE_TIMER_PRESETS: 'update-timer-presets',
    UPDATE_TIMER_NOTIFICATIONS: 'update-timer-notifications',
    UPDATE_SOUND_PLAY_DELAY: 'update-sound-play-delay',
    UPDATE_WIFI_TIMER_SETTINGS: 'update-wifi-timer-settings',
    HIDE_TIMER_WINDOW: 'hide-timer-window',
    TOGGLE_TIMER_WINDOW: 'toggle-timer-window',
    SHOW_CLOCK_TIMER_WINDOW: 'show-clock-timer-window',
    TIMER_DISPLAY_MODE_UPDATE: 'timer-display-mode-update',
    TIMER_COUNTDOWN_UPDATE: 'timer-countdown-update',
    TIMER_NOTIFICATION_TRIGGER: 'timer-notification-trigger',
} as const;

/**
 * main プロセスから送信する IPC チャネル定義。
 */
export const MAIN_IPC_OUTBOUND_CHANNELS = {
    UPDATE_COUNTDOWN_INITIAL_VALUE: 'update-countdown-initial-value',
    UPDATE_TIMER_PRESETS: 'update-timer-presets',
    UPDATE_TIMER_NOTIFICATIONS: 'update-timer-notifications',
    UPDATE_SOUND_PLAY_DELAY: 'update-sound-play-delay',
    MAIN_TIMER_UPDATE: 'main-timer-update',
} as const;
