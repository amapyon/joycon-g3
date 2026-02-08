import { BrowserWindow } from 'electron';
import { isUsableWindow } from '../main/browser-window-utils';

describe('BrowserWindowユーティリティ', (): void => {
    it('nullは利用不可と判定する', (): void => {
        expect(isUsableWindow(null)).toBe(false);
    });

    it('destroy済みウィンドウは利用不可と判定する', (): void => {
        const win = { isDestroyed: (): boolean => true } as unknown as BrowserWindow;
        expect(isUsableWindow(win)).toBe(false);
    });

    it('有効なウィンドウは利用可と判定する', (): void => {
        const win = { isDestroyed: (): boolean => false } as unknown as BrowserWindow;
        expect(isUsableWindow(win)).toBe(true);
    });
});
