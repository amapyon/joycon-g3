/**
 * Joy-Con マネージャーのイベント名定義。
 */
export const JOYCON_MANAGER_EVENTS = {
    IMU_DATA: 'imu-data',
    STATUS_UPDATE: 'status-update',
    BATTERY_STATUS_UPDATE: 'battery-status-update',
    BUTTON_X: 'button-x',
    BUTTON_DOWN: 'button-down',
    BUTTON_PLUS: 'button-plus',
    BUTTON_X_PRESSED: 'button-x-pressed',
    BUTTON_PLUS_PRESSED: 'button-plus-pressed',
    BUTTON_MINUS_PRESSED: 'button-minus-pressed',
    BUTTON_SR_PRESSED: 'button-sr-pressed',
    BUTTON_DOWN_PRESSED: 'button-down-pressed',
    BUTTON_HOME_PRESSED: 'button-home-pressed',
    R_STICK: 'r-stick',
    R_STICK_ANALOG: 'r-stick-analog',
    PPT_NEXT: 'ppt-next',
    PPT_PREV: 'ppt-prev',
} as const;

/**
 * main から renderer へ送る Joy-Con 関連 IPC チャネル定義。
 */
export const JOYCON_IPC_CHANNELS = {
    UPDATE_POINTER: 'update-pointer',
    JOYCON_ATTITUDE: 'joycon-attitude',
    CALIBRATION_STATUS_UPDATE: 'calibration-status-update',
    JOYCON_STATUS_UPDATE: 'joycon-status-update',
    JOYCON_BATTERY_STATUS_UPDATE: 'joycon-battery-status-update',
    JOYCON_BUTTON_X: 'joycon-button-x',
    JOYCON_BUTTON_DOWN: 'joycon-button-down',
    JOYCON_BUTTON_PLUS: 'joycon-button-plus',
    BUTTON_X_PRESSED: 'button-x-pressed',
    BUTTON_PLUS_PRESSED: 'button-plus-pressed',
    BUTTON_MINUS_PRESSED: 'button-minus-pressed',
    BUTTON_SR_PRESSED: 'button-sr-pressed',
    BUTTON_DOWN_PRESSED: 'button-down-pressed',
} as const;

export type JoyConManagerEventName = (typeof JOYCON_MANAGER_EVENTS)[keyof typeof JOYCON_MANAGER_EVENTS];
export type JoyConIpcChannel = (typeof JOYCON_IPC_CHANNELS)[keyof typeof JOYCON_IPC_CHANNELS];
