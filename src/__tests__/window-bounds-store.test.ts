import fs from 'fs';
import os from 'os';
import path from 'path';
import {
    loadWindowBounds,
    resolveBoundsWithinDisplay,
    saveWindowBounds,
    type WindowBoundsRect,
} from '../main/window-bounds-store';

describe('window-bounds-store', () => {
    test('ディスプレイ作業領域内に位置とサイズを補正する', () => {
        const bounds = resolveBoundsWithinDisplay(
            { x: 1900, y: 1050, width: 500, height: 300 },
            { x: 0, y: 0, width: 1920, height: 1080 },
            100,
            50
        );

        expect(bounds).toEqual({
            x: 1420,
            y: 780,
            width: 500,
            height: 300,
        });
    });

    test('保存した位置とサイズを読み込む', () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'joycon-bounds-'));
        const filePath = path.join(tempDir, 'bounds.json');
        const bounds: WindowBoundsRect = { x: 10, y: 20, width: 300, height: 200 };

        saveWindowBounds(filePath, bounds);

        expect(loadWindowBounds<WindowBoundsRect>(filePath, 100, 50)).toEqual(bounds);
    });

    test('最小サイズを満たさない保存値は読み込まない', () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'joycon-bounds-'));
        const filePath = path.join(tempDir, 'bounds.json');

        fs.writeFileSync(filePath, JSON.stringify({ x: 0, y: 0, width: 10, height: 10 }), 'utf8');

        expect(loadWindowBounds<WindowBoundsRect>(filePath, 100, 50)).toBeNull();
    });
});
