import { decideCountdownMenuVisibility } from '../renderer/timer/menu-visibility';

describe('カウントダウンメニューの表示切替', (): void => {
    it('メニュー表示時はカウントダウンを停止しない', (): void => {
        const result = decideCountdownMenuVisibility(true);

        expect(result.menuVisible).toBe(true);
        expect(result.timerVisible).toBe(false);
        expect(result.updateMenuDisplay).toBe(true);
        expect(result.renderPresets).toBe(true);
        expect(result.stopCountdown).toBe(false);
        expect(result.resetTimerText).toBe(false);
    });

    it('メニュー非表示時はタイマーを表示し直す', (): void => {
        const result = decideCountdownMenuVisibility(false);

        expect(result.menuVisible).toBe(false);
        expect(result.timerVisible).toBe(true);
        expect(result.updateMenuDisplay).toBe(false);
        expect(result.renderPresets).toBe(false);
        expect(result.stopCountdown).toBe(false);
        expect(result.resetTimerText).toBe(false);
    });
});
