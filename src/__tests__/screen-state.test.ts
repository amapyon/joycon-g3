import { getScreenSize, setScreenSize } from '../main/screen-state';

describe('画面サイズ状態', (): void => {
    it('初期値は既定の画面サイズを返す', (): void => {
        setScreenSize(1200, 600);

        expect(getScreenSize()).toEqual({ width: 1200, height: 600 });
    });

    it('設定した画面サイズを保持する', (): void => {
        setScreenSize(1920, 1080);

        expect(getScreenSize()).toEqual({ width: 1920, height: 1080 });
    });

    it('連続更新時は最後の値が反映される', (): void => {
        setScreenSize(1280, 720);
        setScreenSize(2560, 1440);

        expect(getScreenSize()).toEqual({ width: 2560, height: 1440 });
    });
});
