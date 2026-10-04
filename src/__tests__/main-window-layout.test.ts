import { readFileSync } from 'fs';
import { join } from 'path';

describe('メイン画面の設定配置', (): void => {
    it('ポインター設定と検証欄を通常操作および接続状態の下にまとめる', (): void => {
        const html = readFileSync(join(__dirname, '../renderer/main-window.html'), 'utf8');
        const pointerSection = html.indexOf('id="pointer-settings-section"');
        expect(pointerSection).toBeGreaterThan(html.indexOf('id="main-joycon-status"'));
        expect(pointerSection).toBeGreaterThan(html.indexOf('id="message-input"'));
        expect(pointerSection).toBeGreaterThan(html.indexOf('id="countdown-initial-value"'));
        for (const id of ['pointer-move-speed', 'pointer-gyro-deadzone', 'pointer-settings-reset-btn', 'pointer-compensation-strength', 'pointer-fixed-angle', 'pointer-diagnostics-enabled', 'pointer-diagnostics-panel', 'pointer-validation-start']) {
            expect(html.split(`id="${id}"`)).toHaveLength(2);
            expect(html.indexOf(`id="${id}"`)).toBeGreaterThan(pointerSection);
        }
    });
});
