import type { ElectronAPI as MainRendererElectronAPI } from '../shared/main-renderer-types';
import type {
    BatteryStatus,
    CalibrationStatus,
    JoyConAttitudeData,
    JoyConButtonStateData,
    JoyConCursorIdData,
    JoyConStatus,
    UpdatePointerData,
} from '../shared/joycon-event-types';

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
export type { DisplayInfo, MessageWindowBounds, PresentationInfo } from '../shared/main-renderer-types';

/**
 * Joy-Con の接続状態。
 */
export type { JoyConStatus };

/**
 * Joy-Con の姿勢情報。
 */
export type JoyConAttitude = JoyConAttitudeData;

/**
 * Joy-Con ボタンの押下状態。
 */
export type JoyConButtonState = JoyConButtonStateData;

/**
 * Joy-Con ボタン押下イベントの発生元。
 */
export type JoyConButtonPress = JoyConCursorIdData;

/**
 * Joy-Con バッテリー状態。
 */
export type { BatteryStatus };

/**
 * カーソル更新イベント。
 */
export type { UpdatePointerData };

/**
 * タイマー通知設定。
 */
export type TimerNotificationConfig = import('../shared/timer-notification-config').TimerNotificationConfig;

/**
 * キャリブレーション状態。
 */
export type { CalibrationStatus };

/**
 * プリロード経由でレンダラーへ公開する Electron API 契約。
 * 各メソッドの引数・戻り値は IPC ペイロード仕様として扱う。
 */
export interface ElectronAPI extends MainRendererElectronAPI {
    onJoyConAttitude: (callback: (data: JoyConAttitude) => void) => void;
    onJoyConButtonX: (callback: (data: JoyConButtonState) => void) => void;
    onJoyConButtonDown: (callback: (data: JoyConButtonState) => void) => void;
    onJoyConButtonXPressed: (callback: (data: JoyConButtonPress) => void) => void;
    onJoyConButtonDownPressed: (callback: (data: JoyConButtonPress) => void) => void;
    onJoyConButtonPlus: (callback: (data: JoyConButtonState) => void) => void;
    onJoyConButtonPlusPressed: (callback: (data: JoyConButtonPress) => void) => void;
    onJoyConButtonMinusPressed: (callback: (data: JoyConButtonPress) => void) => void;
    onJoyConButtonSrPressed: (callback: (data: JoyConButtonPress) => void) => void;
    recenterImu: (id: CursorId) => void;
    onUpdatePointer: (callback: (pos: UpdatePointerData) => void) => void;
    sendCursorMapConfig: (config: CursorMapConfig) => void;
    sendCursorVisibilityUpdate: (id: CursorId, isVisible: boolean) => void;
    onChangeFontSize: (callback: (delta: number) => void) => void;
    onStartCountdown: (callback: (duration: number) => void) => void;
    onTimerMenuNavigate: (callback: (direction: number) => void) => void;
    onTimerMenuSelect: (callback: () => void) => void;
    sendTimerStatus: (isCounting: boolean) => void;
    sendTimerDisplayMode: (mode: TimerMode) => void;
    onSetTimerMode: (callback: (mode: TimerMode) => void) => void;
    hideTimerWindow: () => void;
    sendTimerCountdownUpdate: (remainingTime: number) => void;
    sendTimerPauseStatus: (isPaused: boolean) => void;
    onToggleTimerPause: (callback: () => void) => void;
    onAddMinuteTimer: (callback: () => void) => void;
    onUpdateMessageText: (callback: (text: string) => void) => void;
    sendTimerNotificationTrigger: (seconds: number, shouldRumble: boolean) => void;
}
