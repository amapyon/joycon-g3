import { BrowserWindow, screen } from 'electron';
import { setScreenSize } from './screen-state';
import { decideToggleTimerWindow, getTimerWindowMode, TimerState } from './timer-state';

type WindowManagerBootstrapApi = {
    createTimerWindow: (targetDisplay: Electron.Display) => BrowserWindow | null;
    getTimerWindow: () => BrowserWindow | null;
    getMainWindow: () => BrowserWindow | null;
};

type MainBootstrapOptions = {
    windowManager: WindowManagerBootstrapApi;
    getTimerState: () => TimerState;
    getSoundPlayDelayMs: () => number;
};

type MainBootstrapResult = {
    ensureTimerWindow: () => BrowserWindow | null;
    toggleTimerWindowVisibility: () => void;
};

/**
 * カーソルウィンドウと同じ論理座標系の画面サイズを取得する。
 * @returns 画面サイズ
 */
function getLogicalScreenSize(): { width: number; height: number } {
    const primaryDisplay = screen.getPrimaryDisplay();
    if (primaryDisplay && primaryDisplay.size) {
        return {
            width: primaryDisplay.size.width,
            height: primaryDisplay.size.height,
        };
    }
    return { width: 1200, height: 600 };
}

/**
 * メイン起動時の画面サイズを初期化する。
 */
export function initializeScreenSize(): void {
    const { width, height } = getLogicalScreenSize();
    setScreenSize(width, height);
}

/**
 * タイマーウィンドウ関連の補助関数を構築する。
 * @param options 依存と状態取得関数
 * @returns 補助関数群
 */
export function createTimerWindowBootstrap(options: MainBootstrapOptions): MainBootstrapResult {
    const { windowManager, getTimerState, getSoundPlayDelayMs } = options;

    /**
     * タイマーウィンドウを必要に応じて生成する。
     * @returns タイマーウィンドウ
     */
    const ensureTimerWindow = (): BrowserWindow | null => {
        const existingWindow = windowManager.getTimerWindow();
        if (existingWindow && !existingWindow.isDestroyed()) {
            return existingWindow;
        }

        const mainWin = windowManager.getMainWindow();
        const mainWinBounds = mainWin ? mainWin.getBounds() : screen.getPrimaryDisplay().bounds;
        const mainDisplay = screen.getDisplayNearestPoint({ x: mainWinBounds.x, y: mainWinBounds.y });
        const createdWindow = windowManager.createTimerWindow(mainDisplay);
        if (createdWindow) {
            createdWindow.webContents.once('did-finish-load', () => {
                if (createdWindow && !createdWindow.isDestroyed()) {
                    createdWindow.webContents.send('set-timer-mode', getTimerWindowMode(getTimerState()));
                    createdWindow.webContents.send('update-sound-play-delay', getSoundPlayDelayMs());
                }
            });
        }
        return createdWindow;
    };

    /**
     * タイマーウィンドウの表示/非表示を切り替える。
     */
    const toggleTimerWindowVisibility = (): void => {
        // console.log('[Main] toggleTimerWindowVisibility called.');
        const existingWindow = windowManager.getTimerWindow();
        const hasWindow = !!existingWindow && !existingWindow.isDestroyed();
        const status = {
            hasWindow,
            isVisible: hasWindow ? existingWindow.isVisible() : false,
        };
        const decision = decideToggleTimerWindow(getTimerState(), status);

        if (decision.action === 'create') {
            const createdWindow = ensureTimerWindow();
            if (!createdWindow) {
                // console.error('[Main] Failed to create timer window.');
                return;
            }
            createdWindow.show();
            createdWindow.webContents.send('set-timer-mode', decision.mode);
            return;
        }

        if (!existingWindow || existingWindow.isDestroyed()) {
            return;
        }

        if (decision.action === 'hide') {
            existingWindow.hide();
            return;
        }

        existingWindow.show();
        existingWindow.webContents.send('set-timer-mode', decision.mode);
    };

    return {
        ensureTimerWindow,
        toggleTimerWindowVisibility,
    };
}
