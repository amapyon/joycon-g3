// preload.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    // --- カーソルウィンドウが使用するAPI ---
    onJoyConStatusUpdate: (callback: (...args: any[]) => void) => ipcRenderer.on('joycon-status-update', (event, ...args) => callback(...args)),
    onJoyConAttitude: (callback: (...args: any[]) => void) => ipcRenderer.on('joycon-attitude', (event, ...args) => callback(...args)),
    onJoyConButtonX: (callback: (...args: any[]) => void) => ipcRenderer.on('joycon-button-x', (event, ...args) => callback(...args)),
    onJoyConButtonDown: (callback: (...args: any[]) => void) => ipcRenderer.on('joycon-button-down', (event, ...args) => callback(...args)),
    onJoyConButtonXPressed: (callback: (...args: any[]) => void) => ipcRenderer.on('button-x-pressed', (event, ...args) => callback(...args)),
    onJoyConButtonDownPressed: (callback: (...args: any[]) => void) => ipcRenderer.on('button-down-pressed', (event, ...args) => callback(...args)),
    onJoyConButtonPlus: (callback: (...args: any[]) => void) => ipcRenderer.on('joycon-button-plus', (event, ...args) => callback(...args)),
    onJoyConButtonPlusPressed: (callback: (...args: any[]) => void) => ipcRenderer.on('button-plus-pressed', (event, ...args) => callback(...args)),
    onJoyConButtonMinusPressed: (callback: (...args: any[]) => void) => ipcRenderer.on('button-minus-pressed', (event, ...args) => callback(...args)),
    onJoyConButtonSrPressed: (callback: (...args: any[]) => void) => ipcRenderer.on('button-sr-pressed', (event, ...args) => callback(...args)),
    onAvailableDisplays: (callback: (...args: any[]) => void) => ipcRenderer.on('available-displays', (event, ...args) => callback(...args)),
    setTargetDisplay: (displayId: number) => ipcRenderer.send('set-target-display', displayId),
    launchCursorWindow: (displayId: any) => ipcRenderer.send('launch-cursor-window', displayId),
    onLaunchError: (callback: (...args: any[]) => void) => ipcRenderer.on('launch-error', (event, ...args) => callback(...args)),
    closeCursorWindow: () => ipcRenderer.send('close-cursor-window'),
    onCursorWindowClosed: (callback: (...args: any[]) => void) => ipcRenderer.on('cursor-window-closed', (event, ...args) => callback(...args)),
    onAvailablePresentations: (callback: (...args: any[]) => void) => ipcRenderer.on('available-presentations', (event, ...args) => callback(...args)),
    setTargetPresentation: (identifier: any) => ipcRenderer.send('set-target-presentation', identifier),
    startCalibration: () => ipcRenderer.send('start-calibration'),
    onCalibrationStatusUpdate: (callback: (...args: any[]) => void) => ipcRenderer.on('calibration-status-update', (event, ...args) => callback(...args)),
    onJoyConBatteryStatusUpdate: (callback: (...args: any[]) => void) => ipcRenderer.on('joycon-battery-status-update', (event, ...args) => callback(...args)),
    requestJoyConStatus: () => ipcRenderer.send('request-joycon-status'),
    recenterImu: (id: 'cursorLeft' | 'cursorRight') => ipcRenderer.send('recenter-imu', id),
    getOpenPowerPointPresentations: () => ipcRenderer.invoke('get-open-powerpoint-presentations'),
    onUpdatePointer: (callback: (...args: any[]) => void) => ipcRenderer.on('update-pointer', (event, ...args) => callback(...args)),

    // --- カーソルマップ設定をmainプロセスへ送信 ---
    sendCursorMapConfig: (config: any) => ipcRenderer.send('cursor-map-config', config),
    // --- カーソル表示状態をmainプロセスへ送信 ---
    sendCursorVisibilityUpdate: (id: 'cursorLeft' | 'cursorRight', isVisible: boolean) => ipcRenderer.send('cursor-visibility-update', { id, isVisible }),
    sendCountdownInitialValue: (value: number) => ipcRenderer.send('countdown-initial-value', value), // New
    onUpdateCountdownInitialValue: (callback: (...args: any[]) => void) => ipcRenderer.on('update-countdown-initial-value', (event, ...args) => callback(...args)), // New
    onChangeFontSize: (callback: (...args: any[]) => void) => ipcRenderer.on('change-font-size', (event, ...args) => callback(...args)), // New
    
    // --- Countdown Timer Control ---
    startCountdownTimer: (duration: number) => ipcRenderer.send('start-countdown-timer', duration),
    onStartCountdown: (callback: (...args: any[]) => void) => ipcRenderer.on('start-countdown', (event, ...args) => callback(...args)),
    onTimerMenuNavigate: (callback: (...args: any[]) => void) => ipcRenderer.on('timer-menu-navigate', (event, ...args) => callback(...args)),
    onTimerMenuSelect: (callback: (...args: any[]) => void) => ipcRenderer.on('timer-menu-select', (event, ...args) => callback(...args)),
    updateTimerPresets: (presets: number[]) => ipcRenderer.send('update-timer-presets', presets),
    onUpdateTimerPresets: (callback: (...args: any[]) => void) => ipcRenderer.on('update-timer-presets', (event, ...args) => callback(...args)),
    sendTimerStatus: (isCounting: boolean) => ipcRenderer.send('timer-status-update', isCounting),
    onSetTimerMode: (callback: (mode: 'timer' | 'setup') => void) => ipcRenderer.on('set-timer-mode', (event, mode) => callback(mode)),
    hideTimerWindow: () => ipcRenderer.send('hide-timer-window'),
    moveTimerWindow: (x: number, y: number) => ipcRenderer.send('move-timer-window', { x, y }),
    stopTimerDrag: () => ipcRenderer.send('stop-timer-drag'),
    connectJoyCon: (isLeft: boolean) => ipcRenderer.send('connect-joycon', isLeft),
    shutdownJoyCon: (isLeft: boolean) => ipcRenderer.send('shutdown-joycon', isLeft),
});

console.log('Preload script loaded.');
