import { resolveInitialWindowBounds } from '../main/window-bounds-logic';

describe('ウィンドウ境界ロジック', (): void => {
    it('保存済み境界がある場合はその値を優先する', (): void => {
        const resolved = resolveInitialWindowBounds(
            { x: 10, y: 20, width: 300, height: 200 },
            { x: 100, y: 100, width: 1920, height: 1080 },
            600,
            150
        );

        expect(resolved).toEqual({
            x: 10,
            y: 20,
            width: 300,
            height: 200,
        });
    });

    it('保存済み境界がない場合はディスプレイ中央に配置する', (): void => {
        const resolved = resolveInitialWindowBounds(
            null,
            { x: 100, y: 50, width: 1920, height: 1080 },
            600,
            150
        );

        expect(resolved).toEqual({
            x: 760,
            y: 515,
            width: 600,
            height: 150,
        });
    });
});
