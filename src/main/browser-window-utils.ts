import { BrowserWindow } from 'electron';

/**
 * BrowserWindow が利用可能かを判定する。
 * @param win 判定対象ウィンドウ
 * @returns 利用可能な場合は true
 */
export function isUsableWindow(win: BrowserWindow | null | undefined): win is BrowserWindow {
    return !!win && !win.isDestroyed();
}
