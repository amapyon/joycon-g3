// preload.js
const { contextBridge, ipcRenderer } = require('electron');

// 安全に公開するAPIを定義
contextBridge.exposeInMainWorld('electronAPI', {
    // --- カーソルウィンドウが使用するAPI ---
    // JoyConの状態やデータ受信
    onJoyConStatusUpdate: (callback) => ipcRenderer.on('joycon-status-update', (event, ...args) => callback(...args)),
    onJoyConGyro: (callback) => ipcRenderer.on('joycon-gyro', (event, ...args) => callback(...args)),
    // ボタン状態（表示/非表示トグル用）
    onJoyConButtonX: (callback) => ipcRenderer.on('button-x', (event, ...args) => callback(...args)),
    onJoyConButtonDown: (callback) => ipcRenderer.on('button-down', (event, ...args) => callback(...args)),
    // ボタン押下瞬間（リセット用）
    onJoyConButtonSL: (callback) => ipcRenderer.on('joycon-button-sl', (event, ...args) => callback(...args)),
    onJoyConButtonXPressed: (callback) => ipcRenderer.on('button-x-pressed', (event, ...args) => callback(...args)),
    onJoyConButtonDownPressed: (callback) => ipcRenderer.on('button-down-pressed', (event, ...args) => callback(...args)),

    // --- メインウィンドウが使用するAPI ---
    // ディスプレイリスト受信
    onAvailableDisplays: (callback) => ipcRenderer.on('available-displays', (event, ...args) => callback(...args)),
    // カーソルウィンドウ起動指示（メイン -> メインプロセス）
    launchCursorWindow: (displayId) => ipcRenderer.send('launch-cursor-window', displayId),
    // 起動エラー受信
    onLaunchError: (callback) => ipcRenderer.on('launch-error', (event, ...args) => callback(...args)),
    // カーソルウィンドウ閉じる指示（メイン -> メインプロセス）
    closeCursorWindow: () => ipcRenderer.send('close-cursor-window'),
    // カーソルウィンドウが閉じた通知 受信
    onCursorWindowClosed: (callback) => ipcRenderer.on('cursor-window-closed', (event, ...args) => callback(...args))
});

console.log('Preload script loaded.');
