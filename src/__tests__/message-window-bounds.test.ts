import {
    migrateLegacyMessageWindowBounds,
    type MessageWindowBounds,
} from '../main/message-window-bounds';

describe('message-window-bounds', () => {
    test('古いRenderer座標の保存サイズを表示倍率に合わせてMain座標へ移行する', () => {
        const migrated = migrateLegacyMessageWindowBounds(
            { x: 100, y: 80, width: 300, height: 120 },
            { x: 0, y: 0, width: 1920, height: 1080 },
            1.5
        );

        expect(migrated).toEqual({
            x: 25,
            y: 50,
            width: 450,
            height: 180,
            source: 'main-bounds',
            version: 2,
        });
    });

    test('移行済みのMain座標保存値は変更しない', () => {
        const bounds: MessageWindowBounds = {
            x: 10,
            y: 20,
            width: 500,
            height: 200,
            source: 'main-bounds',
            version: 2,
        };

        expect(migrateLegacyMessageWindowBounds(
            bounds,
            { x: 0, y: 0, width: 1920, height: 1080 },
            2
        )).toBe(bounds);
    });

    test('古い保存サイズが小さすぎる場合は移行時の最小サイズまで広げる', () => {
        const migrated = migrateLegacyMessageWindowBounds(
            { x: 0, y: 0, width: 100, height: 40 },
            { x: 0, y: 0, width: 320, height: 120 },
            1
        );

        expect(migrated).toEqual({
            x: -110,
            y: -40,
            width: 320,
            height: 120,
            source: 'main-bounds',
            version: 2,
        });
    });
});
