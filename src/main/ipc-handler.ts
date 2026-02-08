// ipc-handler.ts
import { ipcMain, screen, IpcMainEvent, IpcMainInvokeEvent, BrowserWindow } from 'electron';
import WindowManager from './window-manager';
import powerpointControl from './powerpoint-control';
import imuProcessor from './imu-processor';
import JoyConManager from './joycon';
import { setScreenSize } from './screen-state';
import { MediaDirectoryStore } from './media-directory-store';
import { findDisplayById, resolveDisplayId, toPhysicalScreenSize } from './ipc-handler-logic';

type IpcHandlerDependencies = {
    mediaDirectoryStore?: MediaDirectoryStore;
};

type IpcHandlerContext = {
    windowManagerInstance: typeof WindowManager;
    joyconManager: JoyConManager;
    mediaDirectoryStore: MediaDirectoryStore;
};

/**
 * タイマーウィンドウへ安全にメッセージを送る。
 * @param timerWin タイマーウィンドウ
 * @param duration カウントダウン秒数
 */
function sendStartCountdownToTimerWindow(timerWin: BrowserWindow, duration: number): void {
    const sendPayload = (): void => {
        timerWin.webContents.send('set-timer-mode', 'timer');
        timerWin.webContents.send('start-countdown', duration);
    };

    if (timerWin.webContents.isLoading()) {
        timerWin.webContents.once('did-finish-load', () => {
            if (timerWin && !timerWin.isDestroyed()) {
                sendPayload();
            }
        });
        return;
    }

    sendPayload();
}

/**
 * カーソルウィンドウ関連 IPC を登録する。
 * @param context ハンドラ依存
 */
function registerCursorWindowHandlers(context: IpcHandlerContext): void {
    const { windowManagerInstance } = context;

    ipcMain.on('launch-cursor-window', (_event: IpcMainEvent, displayId: string) => {
        // console.log(`IPC Handler: Received 'launch-cursor-window' for display ID: ${displayId}`);
        try {
            const targetId = resolveDisplayId(displayId);
            if (targetId === null) {
                throw new Error(`Invalid display ID received: ${displayId}`);
            }
            const selectedDisplay = findDisplayById(screen.getAllDisplays(), targetId);
            if (selectedDisplay) {
                windowManagerInstance.createCursorWindow(selectedDisplay);
            } else {
                windowManagerInstance.sendLaunchErrorToMain(`Display ${targetId} not found.`);
            }
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            // console.error('IPC launch-cursor-window error:', e);
            windowManagerInstance.sendLaunchErrorToMain(`Launch Error: ${message}`);
        }
    });

    ipcMain.on('close-cursor-window', () => {
        // console.log("IPC Handler: Received 'close-cursor-window' request.");
        const windowToClose = windowManagerInstance.getCursorWindow();
        if (windowToClose && !windowToClose.isDestroyed()) {
            windowToClose.close();
            return;
        }

        // console.log('IPC Handler: Cursor window already closed or not found.');
        const mainWin = windowManagerInstance.getMainWindow();
        if (mainWin && !mainWin.isDestroyed()) {
            mainWin.webContents.send('cursor-window-closed');
        }
    });
}

/**
 * プレゼン制御関連 IPC を登録する。
 * @param context ハンドラ依存
 */
function registerPresentationHandlers(context: IpcHandlerContext): void {
    const { windowManagerInstance } = context;

    ipcMain.on('set-target-presentation', (_event: IpcMainEvent, identifier: string) => {
        // console.log(`[IPC Handler] Received 'set-target-presentation': ${identifier}`);
        powerpointControl.setTarget(identifier);
    });

    ipcMain.handle('get-open-powerpoint-presentations', async () => {
        // console.log("[IPC Handler] Received 'get-open-powerpoint-presentations' request.");
        try {
            return powerpointControl.getOpenPresentations();
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            // console.error('[IPC Handler] Error getting open PowerPoint presentations:', message);
            windowManagerInstance.sendLaunchErrorToMain(`Presentation Error: ${message}`);
            return [];
        }
    });
}

/**
 * キャリブレーションと Joy-Con ステータス取得 IPC を登録する。
 * @param context ハンドラ依存
 */
function registerCalibrationAndStatusHandlers(context: IpcHandlerContext): void {
    const { windowManagerInstance, joyconManager } = context;

    ipcMain.on('start-calibration', () => {
        // console.log("[IPC Handler] Received 'start-calibration' request.");
        imuProcessor.startGyroCalibration('cursorLeft');
        imuProcessor.startGyroCalibration('cursorRight');
    });

    ipcMain.on('request-joycon-status', () => {
        // console.log("IPC Handler: Received 'request-joycon-status'.");
        const status = joyconManager.getConnectionStatus();
        const mainWin = windowManagerInstance.getMainWindow();
        if (mainWin && !mainWin.isDestroyed()) {
            mainWin.webContents.send('joycon-status-update', status);
        }
    });

    ipcMain.on('recenter-imu', (_event: IpcMainEvent, id: 'cursorLeft' | 'cursorRight') => {
        // console.log(`[IPC Handler] Received 'recenter-imu' request for ${id}.`);
        imuProcessor.recenter(id);
    });
}

/**
 * タイマー制御関連 IPC を登録する。
 * @param context ハンドラ依存
 */
function registerTimerHandlers(context: IpcHandlerContext): void {
    const { windowManagerInstance } = context;

    ipcMain.on('start-countdown-timer', (_event: IpcMainEvent, duration: number) => {
        // console.log(`[IPC Handler] Received 'start-countdown-timer': ${duration}s`);
        const timerWin = windowManagerInstance.getTimerWindow();
        if (timerWin && !timerWin.isDestroyed()) {
            timerWin.show();
            sendStartCountdownToTimerWindow(timerWin, duration);
            return;
        }

        const newTimerWin = windowManagerInstance.createTimerWindow();
        if (!newTimerWin) {
            // console.warn('[IPC Handler] Failed to find or create Timer window.');
            return;
        }
        newTimerWin.show();
        sendStartCountdownToTimerWindow(newTimerWin, duration);
    });

    ipcMain.on('toggle-timer-pause', () => {
        const timerWin = windowManagerInstance.getTimerWindow();
        if (timerWin && !timerWin.isDestroyed()) {
            timerWin.webContents.send('timer-toggle-pause');
        }
    });

    ipcMain.on('add-minute-timer', () => {
        const timerWin = windowManagerInstance.getTimerWindow();
        if (timerWin && !timerWin.isDestroyed()) {
            timerWin.webContents.send('timer-add-minute');
        }
    });
}

/**
 * 表示先と Joy-Con 接続制御 IPC を登録する。
 * @param context ハンドラ依存
 */
function registerDisplayAndConnectionHandlers(context: IpcHandlerContext): void {
    const { windowManagerInstance, joyconManager } = context;

    ipcMain.on('set-target-display', (_event: IpcMainEvent, displayId: number | string) => {
        // console.log(`[IPC Handler] Received 'set-target-display': ${displayId}`);
        const id = resolveDisplayId(displayId);
        if (id === null) {
            return;
        }

        windowManagerInstance.setTargetDisplay(id);
        const target = findDisplayById(screen.getAllDisplays(), id);
        if (target) {
            const physicalSize = toPhysicalScreenSize(target);
            setScreenSize(physicalSize.width, physicalSize.height);
        }
    });

    ipcMain.on('connect-joycon', (event: IpcMainEvent, isLeft: boolean) => {
        // console.log(`[IPC Handler] Received 'connect-joycon' request for ${isLeft ? 'L' : 'R'}.`);
        if (isLeft) {
            joyconManager.autoConnectL = true;
        } else {
            joyconManager.autoConnectR = true;
        }
        joyconManager.connectAll();
        event.reply('joycon-status-update', joyconManager.getConnectionStatus());
    });

    ipcMain.on('shutdown-joycon', (event: IpcMainEvent, isLeft: boolean) => {
        // console.log(`[IPC Handler] Received 'shutdown-joycon' request for ${isLeft ? 'L' : 'R'}.`);
        joyconManager.shutdownJoyCon(isLeft);
        event.reply('joycon-status-update', joyconManager.getConnectionStatus());
    });
}

/**
 * メディアフォルダー関連 IPC を登録する。
 * @param context ハンドラ依存
 */
function registerMediaHandlers(context: IpcHandlerContext): void {
    const { windowManagerInstance, mediaDirectoryStore } = context;

    const selectMediaFolder = async (): Promise<string> => {
        const mainWin = windowManagerInstance.getMainWindow();
        return mediaDirectoryStore.selectMediaFolder(mainWin ?? undefined);
    };

    ipcMain.handle('select-media-folder', async () => selectMediaFolder());
    ipcMain.handle('get-media-files', async () => mediaDirectoryStore.getMediaFiles());
    ipcMain.handle('get-media-base-path', () => mediaDirectoryStore.getMediaBasePath());
    ipcMain.handle('set-media-base-path', (_event: IpcMainInvokeEvent, dir: string) => {
        return mediaDirectoryStore.setMediaBasePath(dir);
    });
}

/**
 * メッセージウィンドウ関連 IPC を登録する。
 * @param context ハンドラ依存
 */
function registerMessageHandlers(context: IpcHandlerContext): void {
    const { windowManagerInstance } = context;
    let lastMessageText = '';

    ipcMain.on('send-message-text', (_event: IpcMainEvent, text: string) => {
        lastMessageText = text;
        const msgWin = windowManagerInstance.getMessageWindow();
        if (msgWin && !msgWin.isDestroyed()) {
            msgWin.webContents.send('update-message-text', text);
        }
    });

    ipcMain.on('toggle-message-window', () => {
        let msgWin = windowManagerInstance.getMessageWindow();
        if (msgWin && !msgWin.isDestroyed()) {
            if (msgWin.isVisible()) {
                msgWin.hide();
            } else {
                msgWin.show();
                msgWin.webContents.send('update-message-text', lastMessageText);
            }
            return;
        }

        const mainWin = windowManagerInstance.getMainWindow();
        const mainWinBounds = mainWin ? mainWin.getBounds() : screen.getPrimaryDisplay().bounds;
        const mainDisplay = screen.getDisplayNearestPoint({ x: mainWinBounds.x, y: mainWinBounds.y });
        msgWin = windowManagerInstance.createMessageWindow(mainDisplay);
        if (!msgWin) {
            return;
        }
        msgWin.webContents.once('did-finish-load', () => {
            if (msgWin && !msgWin.isDestroyed()) {
                msgWin.webContents.send('update-message-text', lastMessageText);
            }
        });
    });
}

/**
 * IPC ハンドラを登録する。
 * @param windowManagerInstance ウィンドウ管理インスタンス
 * @param joyconManager Joy-Con 管理インスタンス
 * @param dependencies 外部依存の差し替え定義
 */
export function setupIpcHandlers(
    windowManagerInstance: typeof WindowManager = WindowManager,
    joyconManager: JoyConManager,
    dependencies: IpcHandlerDependencies = {},
): void {
    // console.log('Setting up IPC Handlers...');
    const context: IpcHandlerContext = {
        windowManagerInstance,
        joyconManager,
        mediaDirectoryStore: dependencies.mediaDirectoryStore ?? MediaDirectoryStore.createDefault(),
    };

    registerCursorWindowHandlers(context);
    registerPresentationHandlers(context);
    registerCalibrationAndStatusHandlers(context);
    registerTimerHandlers(context);
    registerDisplayAndConnectionHandlers(context);
    registerMediaHandlers(context);
    registerMessageHandlers(context);
    // console.log('IPC Handlers setup complete.');
}
