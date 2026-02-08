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
    console.log('Setting up IPC Handlers...');
    const mediaDirectoryStore = dependencies.mediaDirectoryStore ?? MediaDirectoryStore.createDefault();

    /**
     * タイマーウィンドウへ安全にメッセージを送る。
     * @param timerWin タイマーウィンドウ
     * @param duration カウントダウン秒数
     */
    const sendStartCountdownToTimerWindow = (timerWin: BrowserWindow, duration: number): void => {
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
    };

    ipcMain.on('launch-cursor-window', (event: IpcMainEvent, displayId: string) => {
        console.log(`IPC Handler: Received 'launch-cursor-window' for display ID: ${displayId}`);
        try {
            const targetId = resolveDisplayId(displayId);
            if (targetId === null) {
                throw new Error(`Invalid display ID received: ${displayId}`);
            }
            const displays = screen.getAllDisplays();
            if (!displays) {
                throw new Error('Screen API unavailable or returned invalid display list.');
            }
            const selectedDisplay = findDisplayById(displays, targetId);
            if (selectedDisplay) {
                windowManagerInstance.createCursorWindow(selectedDisplay);
            } else {
                windowManagerInstance.sendLaunchErrorToMain(`Display ${targetId} not found.`);
            }
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            console.error('IPC launch-cursor-window error:', e);
            windowManagerInstance.sendLaunchErrorToMain(`Launch Error: ${message}`);
        }
    });

    ipcMain.on('close-cursor-window', () => {
        console.log("IPC Handler: Received 'close-cursor-window' request.");
        const windowToClose = windowManagerInstance.getCursorWindow();
        if (windowToClose && !windowToClose.isDestroyed()) {
            windowToClose.close();
        } else {
            console.log('IPC Handler: Cursor window already closed or not found.');
            const mainWin = windowManagerInstance.getMainWindow();
            if (mainWin && !mainWin.isDestroyed()) {
                mainWin.webContents.send('cursor-window-closed');
            }
        }
    });

    ipcMain.on('set-target-presentation', (event: IpcMainEvent, identifier: string) => {
        console.log(`[IPC Handler] Received 'set-target-presentation': ${identifier}`);
        powerpointControl.setTarget(identifier);
    });

    ipcMain.on('start-calibration', () => {
        console.log("[IPC Handler] Received 'start-calibration' request.");
        imuProcessor.startGyroCalibration('cursorLeft');
        imuProcessor.startGyroCalibration('cursorRight');
    });

    ipcMain.on('request-joycon-status', () => {
        console.log("IPC Handler: Received 'request-joycon-status'.");
        const status = joyconManager.getConnectionStatus();
        const mainWin = windowManagerInstance.getMainWindow();
        if (mainWin && !mainWin.isDestroyed()) {
            mainWin.webContents.send('joycon-status-update', status);
        }
    });

    ipcMain.on('recenter-imu', (event: IpcMainEvent, id: 'cursorLeft' | 'cursorRight') => {
        console.log(`[IPC Handler] Received 'recenter-imu' request for ${id}.`);
        imuProcessor.recenter(id);
    });

    ipcMain.handle('get-open-powerpoint-presentations', async () => {
        console.log("[IPC Handler] Received 'get-open-powerpoint-presentations' request.");
        try {
            const presentations = powerpointControl.getOpenPresentations();
            return presentations;
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            console.error('[IPC Handler] Error getting open PowerPoint presentations:', message);
            return [];
        }
    });

    ipcMain.on('start-countdown-timer', (event: IpcMainEvent, duration: number) => {
        console.log(`[IPC Handler] Received 'start-countdown-timer': ${duration}s`);
        // Route to Timer Window
        const timerWin = windowManagerInstance.getTimerWindow();
        if (timerWin && !timerWin.isDestroyed()) {
            // Timer Window should be visible when starting via button
            timerWin.show();
            sendStartCountdownToTimerWindow(timerWin, duration);
        } else {
            // Try to create it if missing (should exist from startup, but for safety)
            const newTimerWin = windowManagerInstance.createTimerWindow();
            if (newTimerWin) {
                newTimerWin.show();
                sendStartCountdownToTimerWindow(newTimerWin, duration);
            } else {
                console.warn('[IPC Handler] Failed to find or create Timer window.');
            }
        }
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


    ipcMain.on('set-target-display', (event: IpcMainEvent, displayId: number | string) => {
        console.log(`[IPC Handler] Received 'set-target-display': ${displayId}`);
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
        console.log(`[IPC Handler] Received 'connect-joycon' request for ${isLeft ? 'L' : 'R'}.`);
        if (isLeft) joyconManager.autoConnectL = true;
        else joyconManager.autoConnectR = true;
        joyconManager.connectAll(); // Trigger immediate check
        event.reply('joycon-status-update', joyconManager.getConnectionStatus());
    });

    ipcMain.on('shutdown-joycon', (event: IpcMainEvent, isLeft: boolean) => {
        console.log(`[IPC Handler] Received 'shutdown-joycon' request for ${isLeft ? 'L' : 'R'}.`);
        joyconManager.shutdownJoyCon(isLeft);
        event.reply('joycon-status-update', joyconManager.getConnectionStatus());
    });

    /**
     * サウンドフォルダーを選択する。
     * @returns 選択したフォルダーパス（キャンセル時は空文字）
     */
    const selectMediaFolder = async (): Promise<string> => {
        const mainWin = windowManagerInstance.getMainWindow();
        return mediaDirectoryStore.selectMediaFolder(mainWin ?? undefined);
    };

    /**
     * メディアファイル一覧を取得する。
     * @returns メディアファイル名一覧
     */
    const getMediaFiles = async (): Promise<string[]> => {
        return mediaDirectoryStore.getMediaFiles();
    };

    /**
     * メディアのベースパスを取得する。
     * @returns ベースパス
     */
    const getMediaBasePath = (): string => {
        return mediaDirectoryStore.getMediaBasePath();
    };

    ipcMain.handle('select-media-folder', async () => selectMediaFolder());
    ipcMain.handle('get-media-files', async () => getMediaFiles());
    ipcMain.handle('get-media-base-path', () => getMediaBasePath());
    ipcMain.handle('set-media-base-path', (_event: IpcMainInvokeEvent, dir: string) => {
        return mediaDirectoryStore.setMediaBasePath(dir);
    });

    // --- Message Window Handlers ---
    let lastMessageText = '';
    ipcMain.on('send-message-text', (event: IpcMainEvent, text: string) => {
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
        } else {
            const mainWin = windowManagerInstance.getMainWindow();
            const mainWinBounds = mainWin ? mainWin.getBounds() : screen.getPrimaryDisplay().bounds;
            const mainDisplay = screen.getDisplayNearestPoint({ x: mainWinBounds.x, y: mainWinBounds.y });

            msgWin = windowManagerInstance.createMessageWindow(mainDisplay); // Pass mainDisplay here
            if (msgWin) {
                msgWin.webContents.once('did-finish-load', () => {
                    if (msgWin && !msgWin.isDestroyed()) {
                        msgWin.webContents.send('update-message-text', lastMessageText);
                    }
                });
            }
        }
    });

    console.log('IPC Handlers setup complete.');
}
