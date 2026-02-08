/**
 * カーソル識別子。
 */
export type CursorId = import('../shared/cursor-types').CursorId;

/**
 * タイマーウィンドウの表示モード。
 */
export type TimerMode = import('../shared/timer-mode').TimerMode;

/**
 * カーソル座標変換設定。
 */
export type CursorMapConfig = import('../shared/cursor-types').CursorMapConfig;

/**
 * Joy-Con の接続状態。
 */
export interface JoyConStatus {
    leftConnected: boolean;
    rightConnected: boolean;
}

/**
 * Joy-Con の姿勢情報。
 */
export interface JoyConAttitude {
    id: CursorId;
    roll: number;
    pitch: number;
    yaw?: number;
}

/**
 * Joy-Con ボタンの押下状態。
 */
export interface JoyConButtonState {
    pressed: boolean;
}

/**
 * Joy-Con ボタン押下イベントの発生元。
 */
export interface JoyConButtonPress {
    id: CursorId;
}

/**
 * ディスプレイ情報。
 */
export interface DisplayInfo {
    id: number;
    label?: string;
    size: { width: number; height: number };
    scaleFactor?: number;
}

/**
 * PowerPoint プレゼン情報。
 */
export interface PresentationInfo {
    id: string;
    name: string;
    isRunning: boolean;
}

/**
 * Joy-Con バッテリー状態。
 */
export interface BatteryStatus {
    isLeft: boolean;
    level: number;
}

/**
 * カーソル更新イベント。
 */
export interface UpdatePointerData {
    id: CursorId;
    x: number;
    y: number;
}

/**
 * タイマー通知設定。
 */
export type TimerNotificationConfig = import('../shared/timer-notification-config').TimerNotificationConfig;

/**
 * キャリブレーション状態。
 */
export interface CalibrationStatus {
    id: string;
    status: string;
}

/**
 * プリロード経由でレンダラーへ公開する Electron API 契約。
 * 各メソッドの引数・戻り値は IPC ペイロード仕様として扱う。
 */
export interface ElectronAPI {
    getOpenPowerPointPresentations: () => Promise<PresentationInfo[]>;
    connectJoyCon: (isLeft: boolean) => void;
    shutdownJoyCon: (isLeft: boolean) => void;
    getMediaFiles: () => Promise<string[]>;
    getMediaBasePath: () => Promise<string>;
    selectMediaFolder: () => Promise<string>;
    setMediaBasePath: (dir: string) => Promise<boolean>;
    updateSoundPlayDelay: (delayMs: number) => void;
    onJoyConStatusUpdate: (callback: (status: JoyConStatus) => void) => void;
    onJoyConAttitude: (callback: (data: JoyConAttitude) => void) => void;
    onJoyConButtonX: (callback: (data: JoyConButtonState) => void) => void;
    onJoyConButtonDown: (callback: (data: JoyConButtonState) => void) => void;
    onJoyConButtonXPressed: (callback: (data: JoyConButtonPress) => void) => void;
    onJoyConButtonDownPressed: (callback: (data: JoyConButtonPress) => void) => void;
    onJoyConButtonPlus: (callback: (data: JoyConButtonState) => void) => void;
    onJoyConButtonPlusPressed: (callback: (data: JoyConButtonPress) => void) => void;
    onJoyConButtonMinusPressed: (callback: (data: JoyConButtonPress) => void) => void;
    onJoyConButtonSrPressed: (callback: (data: JoyConButtonPress) => void) => void;
    onAvailableDisplays: (callback: (displays: DisplayInfo[]) => void) => void;
    setTargetDisplay: (displayId: number) => void;
    launchCursorWindow: (displayId: number | string) => void;
    onLaunchError: (callback: (message: string) => void) => void;
    closeCursorWindow: () => void;
    onCursorWindowOpened: (callback: () => void) => void;
    onCursorWindowClosed: (callback: () => void) => void;
    onAvailablePresentations: (callback: (presentations: PresentationInfo[]) => void) => void;
    setTargetPresentation: (identifier: string) => void;
    startCalibration: () => void;
    onCalibrationStatusUpdate: (callback: (statusInfo: CalibrationStatus) => void) => void;
    onJoyConBatteryStatusUpdate: (callback: (status: BatteryStatus) => void) => void;
    requestJoyConStatus: () => void;
    recenterImu: (id: CursorId) => void;
    onUpdatePointer: (callback: (pos: UpdatePointerData) => void) => void;
    sendCursorMapConfig: (config: CursorMapConfig) => void;
    sendCursorVisibilityUpdate: (id: CursorId, isVisible: boolean) => void;
    sendCountdownInitialValue: (value: number) => void;
    onUpdateCountdownInitialValue: (callback: (value: number) => void) => void;
    onChangeFontSize: (callback: (delta: number) => void) => void;
    toggleTimerWindow: () => void;
    startCountdownTimer: (duration: number) => void;
    onStartCountdown: (callback: (duration: number) => void) => void;
    onTimerMenuNavigate: (callback: (direction: number) => void) => void;
    onTimerMenuSelect: (callback: () => void) => void;
    updateTimerPresets: (presets: number[]) => void;
    onUpdateTimerPresets: (callback: (presets: number[]) => void) => void;
    sendTimerStatus: (isCounting: boolean) => void;
    onSetTimerMode: (callback: (mode: TimerMode) => void) => void;
    hideTimerWindow: () => void;
    sendTimerCountdownUpdate: (remainingTime: number) => void;
    sendTimerPauseStatus: (isPaused: boolean) => void;
    toggleTimerPause: () => void;
    addMinuteTimer: () => void;
    onToggleTimerPause: (callback: () => void) => void;
    onAddMinuteTimer: (callback: () => void) => void;
    updateTimerNotifications: (configs: TimerNotificationConfig[]) => void;
    onUpdateTimerNotifications: (callback: (configs: TimerNotificationConfig[]) => void) => void;
    onUpdateSoundPlayDelay: (callback: (delayMs: number) => void) => void;
    toggleMessageWindow: () => void;
    sendMessageText: (text: string) => void;
    onUpdateMessageText: (callback: (text: string) => void) => void;
    onMainTimerUpdate: (callback: (remainingTime: number) => void) => void;
    sendTimerNotificationTrigger: (seconds: number, shouldRumble: boolean) => void;
}
