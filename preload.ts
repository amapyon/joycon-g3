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
    onAvailableDisplays: (callback: (...args: any[]) => void) => ipcRenderer.on('available-displays', (event, ...args) => callback(...args)),
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
});

console.log('Preload script loaded.');
