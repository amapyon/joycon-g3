import { BrowserWindow } from 'electron';
import { RStickAction } from './r-stick-handler';
import { isUsableWindow } from './browser-window-utils';

/**
 * ウィンドウが有効な場合に IPC を送る。
 * @param win 対象ウィンドウ
 * @param channel チャネル名
 * @param payload ペイロード
 */
export function sendToWindow(win: BrowserWindow | null, channel: string, payload?: unknown): void {
    if (!isUsableWindow(win)) {
        return;
    }
    if (payload === undefined) {
        win.webContents.send(channel);
        return;
    }
    win.webContents.send(channel, payload);
}

/**
 * タイマーウィンドウのロード完了を待ってメッセージを送る。
 * @param timerWindow タイマーウィンドウ
 * @param channel チャネル名
 * @param payload ペイロード
 */
export function sendToTimerWhenReady(timerWindow: BrowserWindow | null, channel: string, payload: unknown): void {
    if (!isUsableWindow(timerWindow)) {
        return;
    }
    timerWindow.show();
    if (timerWindow.webContents.isLoading()) {
        timerWindow.webContents.once('did-finish-load', () => {
            if (isUsableWindow(timerWindow)) {
                timerWindow.webContents.send(channel, payload);
            }
        });
        return;
    }
    timerWindow.webContents.send(channel, payload);
}

/**
 * R スティックのアクションを実行する。
 * @param actions アクション一覧
 * @param timerWindow タイマーウィンドウ
 * @param cursorWindow カーソルウィンドウ
 */
export function dispatchRStickActions(
    actions: RStickAction[],
    timerWindow: BrowserWindow | null,
    cursorWindow: BrowserWindow | null,
): void {
    actions.forEach((action: RStickAction): void => {
        const targetWindow = action.target === 'timer' ? timerWindow : cursorWindow;
        sendToWindow(targetWindow, action.channel, action.payload);
    });
}
