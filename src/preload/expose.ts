import { ipcRenderer, IpcRendererEvent } from 'electron';
import type {
    BatteryStatus,
    CalibrationStatus,
    CursorId,
    CursorMapConfig,
    DisplayInfo,
    ElectronAPI,
    JoyConAttitude,
    JoyConButtonPress,
    JoyConButtonState,
    JoyConStatus,
    PresentationInfo,
    TimerMode,
    TimerNotificationConfig,
    UpdatePointerData,
} from './types';
import type { PointerMotionSettings } from '../shared/pointer-motion-settings';

/**
 * Renderer から利用する IPC API。
 */
export const electronAPI: ElectronAPI = {
    // --- Main Window Control ---
    /**
     * 開いている PowerPoint プレゼンテーション一覧を取得する。
     * @returns プレゼンテーション一覧
     */
    getOpenPowerPointPresentations: (): Promise<PresentationInfo[]> => ipcRenderer.invoke('get-open-powerpoint-presentations'),
    /**
     * Joy-Con を接続する。
     * @param isLeft 左 Joy-Con かどうか
     */
    connectJoyCon: (isLeft: boolean): void => ipcRenderer.send('connect-joycon', isLeft),
    /**
     * Joy-Con を切断する。
     * @param isLeft 左 Joy-Con かどうか
     */
    shutdownJoyCon: (isLeft: boolean): void => ipcRenderer.send('shutdown-joycon', isLeft),
    /**
     * メディアファイル一覧を取得する。
     * @returns メディアファイル一覧
     */
    getMediaFiles: (): Promise<string[]> => ipcRenderer.invoke('get-media-files'),
    /**
     * メディアディレクトリのベースパスを取得する。
     * @returns ベースパス
     */
    getMediaBasePath: (): Promise<string> => ipcRenderer.invoke('get-media-base-path'),
    /**
     * メディアフォルダーを選択する。
     * @returns フォルダーパス
     */
    selectMediaFolder: (): Promise<string> => ipcRenderer.invoke('select-media-folder'),
    /**
     * メディアディレクトリのベースパスを設定する。
     * @param dir 設定するディレクトリ
     * @returns 設定に成功したかどうか
     */
    setMediaBasePath: (dir: string): Promise<boolean> => ipcRenderer.invoke('set-media-base-path', dir),
    /**
     * サウンド再生遅延を更新する。
     * @param delayMs 遅延時間（ミリ秒）
     */
    updateSoundPlayDelay: (delayMs: number): void => ipcRenderer.send('update-sound-play-delay', delayMs),
    /**
     * ポインター移動設定を更新する。
     * @param settings 設定値
     */
    updatePointerMotionSettings: (settings: PointerMotionSettings): void => ipcRenderer.send('update-pointer-motion-settings', settings),

    // --- Cursor Window Control ---
    /**
     * Joy-Con の接続状態更新を購読する。
     * @param callback コールバック
     */
    onJoyConStatusUpdate: (callback: (status: JoyConStatus) => void): void => {
        ipcRenderer.on('joycon-status-update', (event: IpcRendererEvent, status: JoyConStatus) => callback(status));
    },
    /**
     * Joy-Con の姿勢更新を購読する。
     * @param callback コールバック
     */
    onJoyConAttitude: (callback: (data: JoyConAttitude) => void): void => {
        ipcRenderer.on('joycon-attitude', (event: IpcRendererEvent, data: JoyConAttitude) => callback(data));
    },
    /**
     * Joy-Con の X ボタン状態を購読する。
     * @param callback コールバック
     */
    onJoyConButtonX: (callback: (data: JoyConButtonState) => void): void => {
        ipcRenderer.on('joycon-button-x', (event: IpcRendererEvent, data: JoyConButtonState) => callback(data));
    },
    /**
     * Joy-Con の Down ボタン状態を購読する。
     * @param callback コールバック
     */
    onJoyConButtonDown: (callback: (data: JoyConButtonState) => void): void => {
        ipcRenderer.on('joycon-button-down', (event: IpcRendererEvent, data: JoyConButtonState) => callback(data));
    },
    /**
     * Joy-Con の X ボタン押下を購読する。
     * @param callback コールバック
     */
    onJoyConButtonXPressed: (callback: (data: JoyConButtonPress) => void): void => {
        ipcRenderer.on('button-x-pressed', (event: IpcRendererEvent, data: JoyConButtonPress) => callback(data));
    },
    /**
     * Joy-Con の Down ボタン押下を購読する。
     * @param callback コールバック
     */
    onJoyConButtonDownPressed: (callback: (data: JoyConButtonPress) => void): void => {
        ipcRenderer.on('button-down-pressed', (event: IpcRendererEvent, data: JoyConButtonPress) => callback(data));
    },
    /**
     * Joy-Con の Plus ボタン状態を購読する。
     * @param callback コールバック
     */
    onJoyConButtonPlus: (callback: (data: JoyConButtonState) => void): void => {
        ipcRenderer.on('joycon-button-plus', (event: IpcRendererEvent, data: JoyConButtonState) => callback(data));
    },
    /**
     * Joy-Con の Plus ボタン押下を購読する。
     * @param callback コールバック
     */
    onJoyConButtonPlusPressed: (callback: (data: JoyConButtonPress) => void): void => {
        ipcRenderer.on('button-plus-pressed', (event: IpcRendererEvent, data: JoyConButtonPress) => callback(data));
    },
    /**
     * Joy-Con の Minus ボタン押下を購読する。
     * @param callback コールバック
     */
    onJoyConButtonMinusPressed: (callback: (data: JoyConButtonPress) => void): void => {
        ipcRenderer.on('button-minus-pressed', (event: IpcRendererEvent, data: JoyConButtonPress) => callback(data));
    },
    /**
     * Joy-Con の SR ボタン押下を購読する。
     * @param callback コールバック
     */
    onJoyConButtonSrPressed: (callback: (data: JoyConButtonPress) => void): void => {
        ipcRenderer.on('button-sr-pressed', (event: IpcRendererEvent, data: JoyConButtonPress) => callback(data));
    },

    /**
     * 利用可能なディスプレイ一覧を購読する。
     * @param callback コールバック
     */
    onAvailableDisplays: (callback: (displays: DisplayInfo[]) => void): void => {
        ipcRenderer.on('available-displays', (event: IpcRendererEvent, displays: DisplayInfo[]) => callback(displays));
    },
    /**
     * 表示対象ディスプレイを設定する。
     * @param displayId ディスプレイ ID
     */
    setTargetDisplay: (displayId: number): void => ipcRenderer.send('set-target-display', displayId),
    /**
     * カーソルウィンドウを起動する。
     * @param displayId ディスプレイ ID
     */
    launchCursorWindow: (displayId: number | string): void => ipcRenderer.send('launch-cursor-window', displayId),
    /**
     * 起動エラーを購読する。
     * @param callback コールバック
     */
    onLaunchError: (callback: (message: string) => void): void => {
        ipcRenderer.on('launch-error', (event: IpcRendererEvent, message: string) => callback(message));
    },
    /**
     * カーソルウィンドウを閉じる。
     */
    closeCursorWindow: (): void => ipcRenderer.send('close-cursor-window'),
    /**
     * カーソルウィンドウの起動完了を購読する。
     * @param callback コールバック
     */
    onCursorWindowOpened: (callback: () => void): void => {
        ipcRenderer.on('cursor-window-opened', (event: IpcRendererEvent) => {
            void event;
            callback();
        });
    },
    /**
     * カーソルウィンドウの終了を購読する。
     * @param callback コールバック
     */
    onCursorWindowClosed: (callback: () => void): void => {
        ipcRenderer.on('cursor-window-closed', (event: IpcRendererEvent) => {
            void event;
            callback();
        });
    },
    /**
     * プレゼンテーション一覧更新を購読する。
     * @param callback コールバック
     */
    onAvailablePresentations: (callback: (presentations: PresentationInfo[]) => void): void => {
        ipcRenderer.on('available-presentations', (event: IpcRendererEvent, presentations: PresentationInfo[]) => callback(presentations));
    },
    /**
     * 対象プレゼンテーションを設定する。
     * @param identifier 識別子
     */
    setTargetPresentation: (identifier: string): void => ipcRenderer.send('set-target-presentation', identifier),
    /**
     * キャリブレーションを開始する。
     */
    startCalibration: (): void => ipcRenderer.send('start-calibration'),
    /**
     * キャリブレーション状態更新を購読する。
     * @param callback コールバック
     */
    onCalibrationStatusUpdate: (callback: (statusInfo: CalibrationStatus) => void): void => {
        ipcRenderer.on('calibration-status-update', (event: IpcRendererEvent, statusInfo: CalibrationStatus) => callback(statusInfo));
    },
    /**
     * バッテリー状態更新を購読する。
     * @param callback コールバック
     */
    onJoyConBatteryStatusUpdate: (callback: (status: BatteryStatus) => void): void => {
        ipcRenderer.on('joycon-battery-status-update', (event: IpcRendererEvent, status: BatteryStatus) => callback(status));
    },
    /**
     * Joy-Con の接続状態を要求する。
     */
    requestJoyConStatus: (): void => ipcRenderer.send('request-joycon-status'),
    /**
     * IMU の基準位置をリセンターする。
     * @param id 対象カーソル ID
     */
    recenterImu: (id: CursorId): void => ipcRenderer.send('recenter-imu', id),
    /**
     * ポインター更新を購読する。
     * @param callback コールバック
     */
    onUpdatePointer: (callback: (pos: UpdatePointerData) => void): void => {
        ipcRenderer.on('update-pointer', (event: IpcRendererEvent, pos: UpdatePointerData) => callback(pos));
    },

    /**
     * カーソルマップ設定を送信する。
     * @param config 設定データ
     */
    sendCursorMapConfig: (config: CursorMapConfig): void => ipcRenderer.send('cursor-map-config', config),
    /**
     * カーソル表示状態を通知する。
     * @param id 対象カーソル ID
     * @param isVisible 表示状態
     */
    sendCursorVisibilityUpdate: (id: CursorId, isVisible: boolean): void => ipcRenderer.send('cursor-visibility-update', { id, isVisible }),
    /**
     * カウントダウン初期値を送信する。
     * @param value 初期値
     */
    sendCountdownInitialValue: (value: number): void => ipcRenderer.send('countdown-initial-value', value),
    /**
     * カウントダウン初期値の更新を購読する。
     * @param callback コールバック
     */
    onUpdateCountdownInitialValue: (callback: (value: number) => void): void => {
        ipcRenderer.on('update-countdown-initial-value', (event: IpcRendererEvent, value: number) => callback(value));
    },
    /**
     * フォントサイズ変更を購読する。
     * @param callback コールバック
     */
    onChangeFontSize: (callback: (delta: number) => void): void => {
        ipcRenderer.on('change-font-size', (event: IpcRendererEvent, delta: number) => callback(delta));
    },

    // --- Timer Window Control ---
    /**
     * タイマーウィンドウの表示を切り替える。
     */
    toggleTimerWindow: (): void => ipcRenderer.send('toggle-timer-window'),
    /**
     * カウントダウンを開始する。
     * @param duration 秒数
     */
    startCountdownTimer: (duration: number): void => ipcRenderer.send('start-countdown-timer', duration),
    /**
     * カウントダウン開始を購読する。
     * @param callback コールバック
     */
    onStartCountdown: (callback: (duration: number) => void): void => {
        ipcRenderer.on('start-countdown', (event: IpcRendererEvent, duration: number) => callback(duration));
    },
    /**
     * タイマーメニューの移動を購読する。
     * @param callback コールバック
     */
    onTimerMenuNavigate: (callback: (direction: number) => void): void => {
        ipcRenderer.on('timer-menu-navigate', (event: IpcRendererEvent, direction: number) => callback(direction));
    },
    /**
     * タイマーメニューの決定を購読する。
     * @param callback コールバック
     */
    onTimerMenuSelect: (callback: () => void): void => {
        ipcRenderer.on('timer-menu-select', (event: IpcRendererEvent) => {
            void event;
            callback();
        });
    },
    /**
     * タイマープリセットを更新する。
     * @param presets プリセット秒数配列
     */
    updateTimerPresets: (presets: number[]): void => ipcRenderer.send('update-timer-presets', presets),
    /**
     * タイマープリセット更新を購読する。
     * @param callback コールバック
     */
    onUpdateTimerPresets: (callback: (presets: number[]) => void): void => {
        ipcRenderer.on('update-timer-presets', (event: IpcRendererEvent, presets: number[]) => callback(presets));
    },
    /**
     * タイマー状態を送信する。
     * @param isCounting 計測中かどうか
     */
    sendTimerStatus: (isCounting: boolean): void => ipcRenderer.send('timer-status-update', isCounting),
    /**
     * タイマーモード設定を購読する。
     * @param callback コールバック
     */
    onSetTimerMode: (callback: (mode: TimerMode) => void): void => {
        ipcRenderer.on('set-timer-mode', (event: IpcRendererEvent, mode: TimerMode) => callback(mode));
    },
    /**
     * タイマーウィンドウを非表示にする。
     */
    hideTimerWindow: (): void => ipcRenderer.send('hide-timer-window'),
    /**
     * タイマーの残り時間を通知する。
     * @param remainingTime 残り時間
     */
    sendTimerCountdownUpdate: (remainingTime: number): void => ipcRenderer.send('timer-countdown-update', remainingTime),
    /**
     * タイマーの一時停止状態を通知する。
     * @param isPaused 一時停止中かどうか
     */
    sendTimerPauseStatus: (isPaused: boolean): void => ipcRenderer.send('timer-pause-update', isPaused),
    /**
     * タイマーの一時停止/再開を切り替える。
     */
    toggleTimerPause: (): void => ipcRenderer.send('toggle-timer-pause'),
    /**
     * タイマーに +1 分を追加する。
     */
    addMinuteTimer: (): void => ipcRenderer.send('add-minute-timer'),
    /**
     * タイマーの一時停止/再開を購読する。
     * @param callback コールバック
     */
    onToggleTimerPause: (callback: () => void): void => {
        ipcRenderer.on('timer-toggle-pause', (event: IpcRendererEvent) => {
            void event;
            callback();
        });
    },
    /**
     * タイマーの +1 分追加を購読する。
     * @param callback コールバック
     */
    onAddMinuteTimer: (callback: () => void): void => {
        ipcRenderer.on('timer-add-minute', (event: IpcRendererEvent) => {
            void event;
            callback();
        });
    },
    /**
     * タイマー通知設定を更新する。
     * @param configs 通知設定
     */
    updateTimerNotifications: (configs: TimerNotificationConfig[]): void => ipcRenderer.send('update-timer-notifications', configs),
    /**
     * タイマー通知設定の更新を購読する。
     * @param callback コールバック
     */
    onUpdateTimerNotifications: (callback: (configs: TimerNotificationConfig[]) => void): void => {
        ipcRenderer.on('update-timer-notifications', (event: IpcRendererEvent, configs: TimerNotificationConfig[]) => callback(configs));
    },
    /**
     * サウンド再生遅延の更新を購読する。
     * @param callback コールバック
     */
    onUpdateSoundPlayDelay: (callback: (delayMs: number) => void): void => {
        ipcRenderer.on('update-sound-play-delay', (event: IpcRendererEvent, delayMs: number) => callback(delayMs));
    },
    /**
     * 通知タイミングを通知する。
     * @param seconds 残り秒数
     */
    sendTimerNotificationTrigger: (seconds: number, shouldRumble: boolean): void =>
        ipcRenderer.send('timer-notification-trigger', seconds, shouldRumble),

    // --- Message Window Control ---
    /**
     * メッセージウィンドウの表示を切り替える。
     */
    toggleMessageWindow: (): void => ipcRenderer.send('toggle-message-window'),
    /**
     * メッセージ本文を送信する。
     * @param text メッセージ本文
     */
    sendMessageText: (text: string): void => ipcRenderer.send('send-message-text', text),
    /**
     * メッセージ本文の更新を購読する。
     * @param callback コールバック
     */
    onUpdateMessageText: (callback: (text: string) => void): void => {
        ipcRenderer.on('update-message-text', (event: IpcRendererEvent, text: string) => callback(text));
    },
    /**
     * メインタイマー更新を購読する。
     * @param callback コールバック
     */
    onMainTimerUpdate: (callback: (remainingTime: number) => void): void => {
        ipcRenderer.on('main-timer-update', (event: IpcRendererEvent, remainingTime: number) => callback(remainingTime));
    },
};
