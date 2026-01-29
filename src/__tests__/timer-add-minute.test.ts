import { applyAddMinute } from '../renderer/timer/add-minute';

describe('+1分ボタンの反映', (): void => {
    it('カウント中は残り時間を増やす', (): void => {
        const result = applyAddMinute(true, 120, 300);

        expect(result.nextRemaining).toBe(180);
        expect(result.nextInitial).toBe(300);
    });

    it('停止中は初期値を増やす', (): void => {
        const result = applyAddMinute(false, 0, 120);

        expect(result.nextRemaining).toBe(0);
        expect(result.nextInitial).toBe(180);
    });

    it('上限に到達した場合は 3600 に丸める', (): void => {
        const resultCounting = applyAddMinute(true, 3580, 300);
        const resultIdle = applyAddMinute(false, 0, 3580);

        expect(resultCounting.nextRemaining).toBe(3600);
        expect(resultIdle.nextInitial).toBe(3600);
    });
});
