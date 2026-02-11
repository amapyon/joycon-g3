/**
 * ipc-handler が受信する IPC チャネル定義。
 */
export const IPC_HANDLER_INBOUND_CHANNELS = {
    LAUNCH_CURSOR_WINDOW: 'launch-cursor-window',
    CLOSE_CURSOR_WINDOW: 'close-cursor-window',
    SET_TARGET_PRESENTATION: 'set-target-presentation',
    GET_OPEN_POWERPOINT_PRESENTATIONS: 'get-open-powerpoint-presentations',
    START_CALIBRATION: 'start-calibration',
    REQUEST_JOYCON_STATUS: 'request-joycon-status',
    RECENTER_IMU: 'recenter-imu',
    START_COUNTDOWN_TIMER: 'start-countdown-timer',
    TOGGLE_TIMER_PAUSE: 'toggle-timer-pause',
    ADD_MINUTE_TIMER: 'add-minute-timer',
    SET_TARGET_DISPLAY: 'set-target-display',
    CONNECT_JOYCON: 'connect-joycon',
    SHUTDOWN_JOYCON: 'shutdown-joycon',
    SELECT_MEDIA_FOLDER: 'select-media-folder',
    GET_MEDIA_FILES: 'get-media-files',
    GET_MEDIA_BASE_PATH: 'get-media-base-path',
    SET_MEDIA_BASE_PATH: 'set-media-base-path',
    SEND_MESSAGE_TEXT: 'send-message-text',
    TOGGLE_MESSAGE_WINDOW: 'toggle-message-window',
} as const;

/**
 * ipc-handler が送信する IPC チャネル定義。
 */
export const IPC_HANDLER_OUTBOUND_CHANNELS = {
    SET_TIMER_MODE: 'set-timer-mode',
    START_COUNTDOWN: 'start-countdown',
    CURSOR_WINDOW_CLOSED: 'cursor-window-closed',
    JOYCON_STATUS_UPDATE: 'joycon-status-update',
    TIMER_TOGGLE_PAUSE: 'timer-toggle-pause',
    TIMER_ADD_MINUTE: 'timer-add-minute',
    UPDATE_MESSAGE_TEXT: 'update-message-text',
} as const;
