// ipc-handler.ts
import { ipcMain, screen, IpcMainEvent, IpcMainInvokeEvent, BrowserWindow } from 'electron';
import WindowManager from './window-manager';
import powerpointControl from './powerpoint-control';
import imuProcessor from './imu-processor';
import JoyConManager from './joycon';
import { setScreenSize } from './screen-state';
import { MediaDirectoryStore } from './media-directory-store';
import { findDisplayById, resolveDisplayId, toPhysicalScreenSize } from './ipc-handler-logic';
import { isUsableWindow } from './browser-window-utils';
import { IPC_HANDLER_INBOUND_CHANNELS, IPC_HANDLER_OUTBOUND_CHANNELS } from '../shared/ipc-handler-channels';

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
        timerWin.webContents.send(IPC_HANDLER_OUTBOUND_CHANNELS.SET_TIMER_MODE, 'timer');
        timerWin.webContents.send(IPC_HANDLER_OUTBOUND_CHANNELS.START_COUNTDOWN, duration);
    };

    if (timerWin.webContents.isLoading()) {
        timerWin.webContents.once('did-finish-load', () => {
            if (isUsableWindow(timerWin)) {
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

    ipcMain.on(IPC_HANDLER_INBOUND_CHANNELS.LAUNCH_CURSOR_WINDOW, (_event: IpcMainEvent, displayId: string) => {
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

    ipcMain.on(IPC_HANDLER_INBOUND_CHANNELS.CLOSE_CURSOR_WINDOW, () => {
        // console.log("IPC Handler: Received 'close-cursor-window' request.");
        const windowToClose = windowManagerInstance.getCursorWindow();
        if (isUsableWindow(windowToClose)) {
            windowToClose.close();
            return;
        }

        // console.log('IPC Handler: Cursor window already closed or not found.');
        const mainWin = windowManagerInstance.getMainWindow();
        if (isUsableWindow(mainWin)) {
            mainWin.webContents.send(IPC_HANDLER_OUTBOUND_CHANNELS.CURSOR_WINDOW_CLOSED);
        }
    });
}

/**
 * プレゼン制御関連 IPC を登録する。
 * @param context ハンドラ依存
 */
function registerPresentationHandlers(context: IpcHandlerContext): void {
    const { windowManagerInstance } = context;

    ipcMain.on(IPC_HANDLER_INBOUND_CHANNELS.SET_TARGET_PRESENTATION, (_event: IpcMainEvent, identifier: string) => {
        // console.log(`[IPC Handler] Received 'set-target-presentation': ${identifier}`);
        powerpointControl.setTarget(identifier);
    });

    ipcMain.handle(IPC_HANDLER_INBOUND_CHANNELS.GET_OPEN_POWERPOINT_PRESENTATIONS, async () => {
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

    ipcMain.on(IPC_HANDLER_INBOUND_CHANNELS.START_CALIBRATION, () => {
        // console.log("[IPC Handler] Received 'start-calibration' request.");
        imuProcessor.startGyroCalibration('cursorLeft');
        imuProcessor.startGyroCalibration('cursorRight');
    });

    ipcMain.on(IPC_HANDLER_INBOUND_CHANNELS.REQUEST_JOYCON_STATUS, () => {
        // console.log("IPC Handler: Received 'request-joycon-status'.");
        const status = joyconManager.getConnectionStatus();
        const mainWin = windowManagerInstance.getMainWindow();
        if (isUsableWindow(mainWin)) {
            mainWin.webContents.send(IPC_HANDLER_OUTBOUND_CHANNELS.JOYCON_STATUS_UPDATE, status);
        }
    });

    ipcMain.on(IPC_HANDLER_INBOUND_CHANNELS.RECENTER_IMU, (_event: IpcMainEvent, id: 'cursorLeft' | 'cursorRight') => {
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

    ipcMain.on(IPC_HANDLER_INBOUND_CHANNELS.START_COUNTDOWN_TIMER, (_event: IpcMainEvent, duration: number) => {
        // console.log(`[IPC Handler] Received 'start-countdown-timer': ${duration}s`);
        const timerWin = windowManagerInstance.getTimerWindow();
        if (isUsableWindow(timerWin)) {
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

    ipcMain.on(IPC_HANDLER_INBOUND_CHANNELS.TOGGLE_TIMER_PAUSE, () => {
        const timerWin = windowManagerInstance.getTimerWindow();
        if (isUsableWindow(timerWin)) {
            timerWin.webContents.send(IPC_HANDLER_OUTBOUND_CHANNELS.TIMER_TOGGLE_PAUSE);
        }
    });

    ipcMain.on(IPC_HANDLER_INBOUND_CHANNELS.ADD_MINUTE_TIMER, () => {
        const timerWin = windowManagerInstance.getTimerWindow();
        if (isUsableWindow(timerWin)) {
            timerWin.webContents.send(IPC_HANDLER_OUTBOUND_CHANNELS.TIMER_ADD_MINUTE);
        }
    });
}

/**
 * 表示先と Joy-Con 接続制御 IPC を登録する。
 * @param context ハンドラ依存
 */
function registerDisplayAndConnectionHandlers(context: IpcHandlerContext): void {
    const { windowManagerInstance, joyconManager } = context;

    ipcMain.on(IPC_HANDLER_INBOUND_CHANNELS.SET_TARGET_DISPLAY, (_event: IpcMainEvent, displayId: number | string) => {
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

    ipcMain.on(IPC_HANDLER_INBOUND_CHANNELS.CONNECT_JOYCON, (event: IpcMainEvent, isLeft: boolean) => {
        // console.log(`[IPC Handler] Received 'connect-joycon' request for ${isLeft ? 'L' : 'R'}.`);
        if (isLeft) {
            joyconManager.autoConnectL = true;
        } else {
            joyconManager.autoConnectR = true;
        }
        joyconManager.connectAll();
        event.reply(IPC_HANDLER_OUTBOUND_CHANNELS.JOYCON_STATUS_UPDATE, joyconManager.getConnectionStatus());
    });

    ipcMain.on(IPC_HANDLER_INBOUND_CHANNELS.SHUTDOWN_JOYCON, (event: IpcMainEvent, isLeft: boolean) => {
        // console.log(`[IPC Handler] Received 'shutdown-joycon' request for ${isLeft ? 'L' : 'R'}.`);
        joyconManager.shutdownJoyCon(isLeft);
        event.reply(IPC_HANDLER_OUTBOUND_CHANNELS.JOYCON_STATUS_UPDATE, joyconManager.getConnectionStatus());
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

    ipcMain.handle(IPC_HANDLER_INBOUND_CHANNELS.SELECT_MEDIA_FOLDER, async () => selectMediaFolder());
    ipcMain.handle(IPC_HANDLER_INBOUND_CHANNELS.GET_MEDIA_FILES, async () => mediaDirectoryStore.getMediaFiles());
    ipcMain.handle(IPC_HANDLER_INBOUND_CHANNELS.GET_MEDIA_BASE_PATH, () => mediaDirectoryStore.getMediaBasePath());
    ipcMain.handle(IPC_HANDLER_INBOUND_CHANNELS.SET_MEDIA_BASE_PATH, (_event: IpcMainInvokeEvent, dir: string) => {
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

    ipcMain.on(IPC_HANDLER_INBOUND_CHANNELS.SEND_MESSAGE_TEXT, (_event: IpcMainEvent, text: string) => {
        lastMessageText = text;
        const msgWin = windowManagerInstance.getMessageWindow();
        if (isUsableWindow(msgWin)) {
            msgWin.webContents.send(IPC_HANDLER_OUTBOUND_CHANNELS.UPDATE_MESSAGE_TEXT, text);
        }
    });

    ipcMain.on(IPC_HANDLER_INBOUND_CHANNELS.TOGGLE_MESSAGE_WINDOW, () => {
        let msgWin = windowManagerInstance.getMessageWindow();
        if (isUsableWindow(msgWin)) {
            if (msgWin.isVisible()) {
                msgWin.hide();
            } else {
                msgWin.show();
                msgWin.webContents.send(IPC_HANDLER_OUTBOUND_CHANNELS.UPDATE_MESSAGE_TEXT, lastMessageText);
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
            if (isUsableWindow(msgWin)) {
                msgWin.webContents.send(IPC_HANDLER_OUTBOUND_CHANNELS.UPDATE_MESSAGE_TEXT, lastMessageText);
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
