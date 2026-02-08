import { findDisplayById, resolveDisplayId, toPhysicalScreenSize } from '../main/ipc-handler-logic';

describe('IPCハンドラの純粋ロジック', (): void => {
    it('表示先 ID を数値へ正規化する', (): void => {
        expect(resolveDisplayId('10')).toBe(10);
        expect(resolveDisplayId(3)).toBe(3);
        expect(resolveDisplayId('abc')).toBeNull();
    });

    it('ID からディスプレイを検索する', (): void => {
        const displays = [
            { id: 1, size: { width: 1280, height: 720 }, scaleFactor: 1 },
            { id: 2, size: { width: 1920, height: 1080 }, scaleFactor: 1.5 },
        ];

        const found = findDisplayById(displays, 2);
        const missing = findDisplayById(displays, 99);

        expect(found).toEqual({ id: 2, size: { width: 1920, height: 1080 }, scaleFactor: 1.5 });
        expect(missing).toBeUndefined();
    });

    it('論理解像度とスケールから物理解像度を計算する', (): void => {
        const size = toPhysicalScreenSize({
            id: 2,
            size: { width: 1920, height: 1080 },
            scaleFactor: 1.5,
        });

        expect(size).toEqual({ width: 2880, height: 1620 });
    });
});
