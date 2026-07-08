import { buildMenuItems } from '../renderer/timer/menu-items';

describe('タイマーメニュー項目の生成', (): void => {
    it('プリセットに +1分と Clock を追加する', (): void => {
        const items = buildMenuItems([10, 60]);

        expect(items.length).toBe(4);
        expect(items[0]).toEqual({ type: 'preset', time: 10, label: '10s' });
        expect(items[1]).toEqual({ type: 'preset', time: 60, label: '1m' });
        expect(items[2]).toEqual({ type: 'add-minute', label: '+1分' });
        expect(items[3]).toEqual({ type: 'clock', label: 'Clock' });
    });
});
