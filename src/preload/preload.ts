// preload.ts
import { contextBridge, ipcRenderer } from 'electron';

/**
 * Renderer から利用する IPC API。
 */
const electronAPI = {
    // --- Main Window Control ---
    /**
     * 開いている PowerPoint プレゼンテーション一覧を取得する。
     * @returns プレゼンテーション一覧
     */
    getOpenPowerPointPresentations: () => ipcRenderer.invoke('get-open-powerpoint-presentations'),
    /**
     * Joy-Con を接続する。
     * @param isLeft 左 Joy-Con かどうか
     */
    connectJoyCon: (isLeft: boolean) => ipcRenderer.send('connect-joycon', isLeft),
    /**
     * Joy-Con を切断する。
     * @param isLeft 左 Joy-Con かどうか
     */
    shutdownJoyCon: (isLeft: boolean) => ipcRenderer.send('shutdown-joycon', isLeft),
    /**
     * メディアファイル一覧を取得する。
     * @returns メディアファイル一覧
     */
    getMediaFiles: () => ipcRenderer.invoke('get-media-files'),
    /**
     * メディアディレクトリのベースパスを取得する。
     * @returns ベースパス
     */
    getMediaBasePath: () => ipcRenderer.invoke('get-media-base-path'),

    // --- Cursor Window Control ---
    /**
     * Joy-Con の接続状態更新を購読する。
     * @param callback コールバック
     */
    onJoyConStatusUpdate: (callback: (...args: any[]) => void) => ipcRenderer.on('joycon-status-update', (event, ...args) => callback(...args)),
    /**
     * Joy-Con の姿勢更新を購読する。
     * @param callback コールバック
     */
    onJoyConAttitude: (callback: (...args: any[]) => void) => ipcRenderer.on('joycon-attitude', (event, ...args) => callback(...args)),
    /**
     * Joy-Con の X ボタン状態を購読する。
     * @param callback コールバック
     */
    onJoyConButtonX: (callback: (...args: any[]) => void) => ipcRenderer.on('joycon-button-x', (event, ...args) => callback(...args)),
    /**
     * Joy-Con の Down ボタン状態を購読する。
     * @param callback コールバック
     */
    onJoyConButtonDown: (callback: (...args: any[]) => void) => ipcRenderer.on('joycon-button-down', (event, ...args) => callback(...args)),
    /**
     * Joy-Con の X ボタン押下を購読する。
     * @param callback コールバック
     */
    onJoyConButtonXPressed: (callback: (...args: any[]) => void) => ipcRenderer.on('button-x-pressed', (event, ...args) => callback(...args)),
    /**
     * Joy-Con の Down ボタン押下を購読する。
     * @param callback コールバック
     */
    onJoyConButtonDownPressed: (callback: (...args: any[]) => void) => ipcRenderer.on('button-down-pressed', (event, ...args) => callback(...args)),
    /**
     * Joy-Con の Plus ボタン状態を購読する。
     * @param callback コールバック
     */
    onJoyConButtonPlus: (callback: (...args: any[]) => void) => ipcRenderer.on('joycon-button-plus', (event, ...args) => callback(...args)),
    /**
     * Joy-Con の Plus ボタン押下を購読する。
     * @param callback コールバック
     */
    onJoyConButtonPlusPressed: (callback: (...args: any[]) => void) => ipcRenderer.on('button-plus-pressed', (event, ...args) => callback(...args)),
    /**
     * Joy-Con の Minus ボタン押下を購読する。
     * @param callback コールバック
     */
    onJoyConButtonMinusPressed: (callback: (...args: any[]) => void) => ipcRenderer.on('button-minus-pressed', (event, ...args) => callback(...args)),
    /**
     * Joy-Con の SR ボタン押下を購読する。
     * @param callback コールバック
     */
    onJoyConButtonSrPressed: (callback: (...args: any[]) => void) => ipcRenderer.on('button-sr-pressed', (event, ...args) => callback(...args)),

    /**
     * 利用可能なディスプレイ一覧を購読する。
     * @param callback コールバック
     */
    onAvailableDisplays: (callback: (...args: any[]) => void) => ipcRenderer.on('available-displays', (event, ...args) => callback(...args)),
    /**
     * 表示対象ディスプレイを設定する。
     * @param displayId ディスプレイ ID
     */
    setTargetDisplay: (displayId: number) => ipcRenderer.send('set-target-display', displayId),
    /**
     * カーソルウィンドウを起動する。
     * @param displayId ディスプレイ ID
     */
    launchCursorWindow: (displayId: any) => ipcRenderer.send('launch-cursor-window', displayId),
    /**
     * 起動エラーを購読する。
     * @param callback コールバック
     */
    onLaunchError: (callback: (...args: any[]) => void) => ipcRenderer.on('launch-error', (event, ...args) => callback(...args)),
    /**
     * カーソルウィンドウを閉じる。
     */
    closeCursorWindow: () => ipcRenderer.send('close-cursor-window'),
    /**
     * カーソルウィンドウの起動完了を購読する。
     * @param callback コールバック
     */
    onCursorWindowOpened: (callback: (...args: any[]) => void) => ipcRenderer.on('cursor-window-opened', (event, ...args) => callback(...args)),
    /**
     * カーソルウィンドウの終了を購読する。
     * @param callback コールバック
     */
    onCursorWindowClosed: (callback: (...args: any[]) => void) => ipcRenderer.on('cursor-window-closed', (event, ...args) => callback(...args)),
    /**
     * プレゼンテーション一覧更新を購読する。
     * @param callback コールバック
     */
    onAvailablePresentations: (callback: (...args: any[]) => void) => ipcRenderer.on('available-presentations', (event, ...args) => callback(...args)),
    /**
     * 対象プレゼンテーションを設定する。
     * @param identifier 識別子
     */
    setTargetPresentation: (identifier: any) => ipcRenderer.send('set-target-presentation', identifier),
    /**
     * キャリブレーションを開始する。
     */
    startCalibration: () => ipcRenderer.send('start-calibration'),
    /**
     * キャリブレーション状態更新を購読する。
     * @param callback コールバック
     */
    onCalibrationStatusUpdate: (callback: (...args: any[]) => void) => ipcRenderer.on('calibration-status-update', (event, ...args) => callback(...args)),
    /**
     * バッテリー状態更新を購読する。
     * @param callback コールバック
     */
    onJoyConBatteryStatusUpdate: (callback: (...args: any[]) => void) => ipcRenderer.on('joycon-battery-status-update', (event, ...args) => callback(...args)),
    /**
     * Joy-Con の接続状態を要求する。
     */
    requestJoyConStatus: () => ipcRenderer.send('request-joycon-status'),
    /**
     * IMU の基準位置をリセンターする。
     * @param id 対象カーソル ID
     */
    recenterImu: (id: 'cursorLeft' | 'cursorRight') => ipcRenderer.send('recenter-imu', id),
    /**
     * ポインター更新を購読する。
     * @param callback コールバック
     */
    onUpdatePointer: (callback: (...args: any[]) => void) => ipcRenderer.on('update-pointer', (event, ...args) => callback(...args)),

    /**
     * カーソルマップ設定を送信する。
     * @param config 設定データ
     */
    sendCursorMapConfig: (config: any) => ipcRenderer.send('cursor-map-config', config),
    /**
     * カーソル表示状態を通知する。
     * @param id 対象カーソル ID
     * @param isVisible 表示状態
     */
    sendCursorVisibilityUpdate: (id: 'cursorLeft' | 'cursorRight', isVisible: boolean) => ipcRenderer.send('cursor-visibility-update', { id, isVisible }),
    /**
     * カウントダウン初期値を送信する。
     * @param value 初期値
     */
    sendCountdownInitialValue: (value: number) => ipcRenderer.send('countdown-initial-value', value),
    /**
     * カウントダウン初期値の更新を購読する。
     * @param callback コールバック
     */
    onUpdateCountdownInitialValue: (callback: (...args: any[]) => void) => ipcRenderer.on('update-countdown-initial-value', (event, ...args) => callback(...args)),
    /**
     * フォントサイズ変更を購読する。
     * @param callback コールバック
     */
    onChangeFontSize: (callback: (...args: any[]) => void) => ipcRenderer.on('change-font-size', (event, ...args) => callback(...args)),
    
    // --- Timer Window Control ---
    /**
     * タイマーウィンドウの表示を切り替える。
     */
    toggleTimerWindow: () => ipcRenderer.send('toggle-timer-window'),
    /**
     * カウントダウンを開始する。
     * @param duration 秒数
     */
    startCountdownTimer: (duration: number) => ipcRenderer.send('start-countdown-timer', duration),
    /**
     * カウントダウン開始を購読する。
     * @param callback コールバック
     */
    onStartCountdown: (callback: (...args: any[]) => void) => ipcRenderer.on('start-countdown', (event, ...args) => callback(...args)),
    /**
     * タイマーメニューの移動を購読する。
     * @param callback コールバック
     */
    onTimerMenuNavigate: (callback: (...args: any[]) => void) => ipcRenderer.on('timer-menu-navigate', (event, ...args) => callback(...args)),
    /**
     * タイマーメニューの決定を購読する。
     * @param callback コールバック
     */
    onTimerMenuSelect: (callback: (...args: any[]) => void) => ipcRenderer.on('timer-menu-select', (event, ...args) => callback(...args)),
    /**
     * タイマープリセットを更新する。
     * @param presets プリセット秒数配列
     */
    updateTimerPresets: (presets: number[]) => ipcRenderer.send('update-timer-presets', presets),
    /**
     * タイマープリセット更新を購読する。
     * @param callback コールバック
     */
    onUpdateTimerPresets: (callback: (...args: any[]) => void) => ipcRenderer.on('update-timer-presets', (event, ...args) => callback(...args)),
    /**
     * タイマー状態を送信する。
     * @param isCounting 計測中かどうか
     */
    sendTimerStatus: (isCounting: boolean) => ipcRenderer.send('timer-status-update', isCounting),
    /**
     * タイマーモード設定を購読する。
     * @param callback コールバック
     */
    onSetTimerMode: (callback: (mode: 'timer' | 'setup') => void) => ipcRenderer.on('set-timer-mode', (event, mode) => callback(mode)),
    /**
     * タイマーウィンドウを非表示にする。
     */
    hideTimerWindow: () => ipcRenderer.send('hide-timer-window'),
    /**
     * タイマーの残り時間を通知する。
     * @param remainingTime 残り時間
     */
    sendTimerCountdownUpdate: (remainingTime: number) => ipcRenderer.send('timer-countdown-update', remainingTime),
    /**
     * タイマー通知設定を更新する。
     * @param configs 通知設定
     */
    updateTimerNotifications: (configs: any[]) => ipcRenderer.send('update-timer-notifications', configs),
    /**
     * タイマー通知設定の更新を購読する。
     * @param callback コールバック
     */
    onUpdateTimerNotifications: (callback: (configs: any[]) => void) => ipcRenderer.on('update-timer-notifications', (event, configs) => callback(configs)),

    // --- Message Window Control ---
    /**
     * メッセージウィンドウの表示を切り替える。
     */
    toggleMessageWindow: () => ipcRenderer.send('toggle-message-window'),
    /**
     * メッセージ本文を送信する。
     * @param text メッセージ本文
     */
    sendMessageText: (text: string) => ipcRenderer.send('send-message-text', text),
    /**
     * メッセージ本文の更新を購読する。
     * @param callback コールバック
     */
    onUpdateMessageText: (callback: (text: string) => void) => ipcRenderer.on('update-message-text', (event, text) => callback(text)),
    /**
     * メインタイマー更新を購読する。
     * @param callback コールバック
     */
    onMainTimerUpdate: (callback: (remainingTime: number) => void) => ipcRenderer.on('main-timer-update', (event, remainingTime) => callback(remainingTime)),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

console.log('Preload script loaded.');
